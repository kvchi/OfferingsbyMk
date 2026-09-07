import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import cartReducer, { changeQuantity } from '../store/cart';
import Checkout from './Checkout';
import {
  CHECKOUT_ATTEMPT_STORAGE_KEY,
  resetCheckoutAttemptForTests,
} from '../utils/checkout';

const checkoutApi = vi.hoisted(() => ({
  previewCheckout: vi.fn(),
  createOrder: vi.fn(),
}));
vi.mock('../api/checkout', () => checkoutApi);

const initialItems = [
  { productId: 'featured-rosemary', quantity: 2 },
  { productId: 'candle-soy-wax', quantity: 1 },
];
const authoritativeCheckout = {
  delivery: {
    recipientName: 'Ada Okafor',
    phone: '+2348012345678',
    addressLine1: '12 Market Road',
    cityOrLga: 'Ikeja',
    state: 'Lagos',
    postalCode: '100001',
    country: 'Nigeria',
  },
  lines: [
    { productId: 'candle-soy-wax', title: 'Server Soy Wax', quantity: 1, unitPriceKobo: 1_500_000, lineTotalKobo: 1_500_000 },
    { productId: 'featured-rosemary', title: 'Server Rosemary', quantity: 2, unitPriceKobo: 1_500_000, lineTotalKobo: 3_000_000 },
  ],
  subtotalKobo: 4_500_000,
  shippingKobo: 0,
  totalKobo: 4_500_000,
  currency: 'NGN',
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid='location'>{location.pathname}</div>;
}

function renderCheckout(items = initialItems, { strict = false } = {}) {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items, statusTab: false } },
  });
  const checkout = (
    <Provider store={store}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path='/checkout' element={<Checkout />} />
          <Route path='/orders/:orderId' element={<div>Order destination</div>} />
          <Route path='/shop' element={<div>Shop destination</div>} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </Provider>
  );
  const view = render(strict ? <StrictMode>{checkout}</StrictMode> : checkout);
  return { store, ...view };
}

const fillValidDelivery = () => {
  fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: '  Ada   Okafor ' } });
  fireEvent.change(screen.getByLabelText(/phone number/i), { target: { value: '0801 234 5678' } });
  fireEvent.change(screen.getByLabelText(/address line 1/i), { target: { value: '12 Market Road' } });
  fireEvent.change(screen.getByLabelText(/city or lga/i), { target: { value: 'Ikeja' } });
  fireEvent.change(screen.getByLabelText(/state or fct/i), { target: { value: 'Lagos' } });
  fireEvent.change(screen.getByLabelText(/postal code/i), { target: { value: '100001' } });
};

const reachReview = async () => {
  checkoutApi.previewCheckout.mockResolvedValueOnce(authoritativeCheckout);
  fillValidDelivery();
  fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
  const heading = await screen.findByRole('heading', { name: 'Review your pending order' });
  await waitFor(() => expect(heading).toHaveFocus());
};

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  resetCheckoutAttemptForTests();
});

describe('checkout delivery and preview', () => {
  it('leaves preview loading and renders a live-shaped response under React Strict Mode', async () => {
    checkoutApi.previewCheckout.mockResolvedValueOnce(authoritativeCheckout);
    renderCheckout(initialItems, { strict: true });
    fillValidDelivery();
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));

    expect(await screen.findByRole('heading', { name: 'Review your pending order' })).toBeInTheDocument();
    expect(screen.queryByText(/calculating your authoritative order total/i)).not.toBeInTheDocument();
  });

  it('shows an accessible empty state and makes no API request', () => {
    renderCheckout([]);
    expect(screen.getByRole('heading', { name: 'Checkout', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse Shop' })).toHaveAttribute('href', '/shop');
    expect(checkoutApi.previewCheckout).not.toHaveBeenCalled();
    expect(checkoutApi.createOrder).not.toHaveBeenCalled();
  });

  it('renders labelled fields, 36 states plus FCT, fixed country and no payment fields', () => {
    renderCheckout();
    for (const label of ['Recipient name', 'Phone number', 'Address line 1', 'Address line 2', 'City or LGA', 'State or FCT', 'Postal code', 'Country']) {
      expect(screen.getByLabelText(new RegExp(label, 'i'))).toBeInTheDocument();
    }
    expect(screen.getByLabelText(/address line 2/i).labels[0]).toHaveTextContent('optional');
    expect(screen.getByLabelText(/recipient name/i).labels[0]).toHaveTextContent('required');
    const state = screen.getByLabelText(/state or fct/i);
    expect(within(state).getAllByRole('option')).toHaveLength(38);
    expect(within(state).getByRole('option', { name: 'Federal Capital Territory' })).toBeInTheDocument();
    expect(screen.getByLabelText(/country/i)).toHaveValue('Nigeria');
    expect(screen.getByLabelText(/country/i)).toHaveAttribute('readonly');
    expect(screen.queryByLabelText(/card|cvv|pin|expiry/i)).not.toBeInTheDocument();
  });

  it('focuses a linked error summary and preserves entered values after failures', async () => {
    renderCheckout();
    fireEvent.change(screen.getByLabelText(/recipient name/i), { target: { value: 'Ada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    const summary = await screen.findByRole('alert');
    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary.querySelector('a[href="#checkout-phone"]')).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient name/i)).toHaveValue('Ada');

    fillValidDelivery();
    const networkError = Object.assign(new Error('We could not reach ShopSphare. Check your connection and try again.'), { code: 'NETWORK_ERROR' });
    checkoutApi.previewCheckout.mockRejectedValueOnce(networkError);
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    expect(await screen.findByText(/could not reach shopsphare/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient name/i)).toHaveValue('Ada Okafor');
  });

  it('sends only normalized IDs, quantities and delivery, then renders server values', async () => {
    renderCheckout();
    await reachReview();

    expect(checkoutApi.previewCheckout).toHaveBeenCalledTimes(1);
    const [payload] = checkoutApi.previewCheckout.mock.calls[0];
    expect(payload).toEqual({
      items: [
        { productId: 'candle-soy-wax', quantity: 1 },
        { productId: 'featured-rosemary', quantity: 2 },
      ],
      delivery: authoritativeCheckout.delivery,
    });
    expect(JSON.stringify(payload)).not.toMatch(/title|price|subtotal|shipping|total|currency|userId|role|status|reference/i);
    expect(screen.getByText('Server Soy Wax')).toBeInTheDocument();
    expect(screen.getByText('Server Rosemary')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText(/calculated by the store server/i)).toBeInTheDocument();
    expect(screen.getByText(/NGN/)).toBeInTheDocument();
    expect(checkoutApi.createOrder).not.toHaveBeenCalled();
  });

  it('prevents duplicate preview requests', async () => {
    let resolvePreview;
    checkoutApi.previewCheckout.mockImplementationOnce(() => new Promise((resolve) => { resolvePreview = resolve; }));
    renderCheckout();
    fillValidDelivery();
    const submit = screen.getByRole('button', { name: 'Review order' });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(checkoutApi.previewCheckout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent(/calculating/i);
    expect(screen.getByRole('button', { name: 'Cancel checkout' })).toBeEnabled();
    resolvePreview(authoritativeCheckout);
    await screen.findByRole('heading', { name: 'Review your pending order' });
  });

  it('leaves loading for authentication, validation and malformed-response failures', async () => {
    renderCheckout();
    fillValidDelivery();

    const failures = [
      ['Your session has expired. Please log in again.', 'AUTHENTICATION_REQUIRED', /session has expired/i],
      ['Please review the checkout information and try again.', 'VALIDATION_ERROR', /review the checkout information/i],
      ['ShopSphare returned an invalid checkout response. Please try again.', 'MALFORMED_RESPONSE', /invalid checkout response/i],
    ];

    for (const [message, code, expected] of failures) {
      checkoutApi.previewCheckout.mockRejectedValueOnce(Object.assign(new Error(message), { code }));
      fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
      expect(await screen.findByText(expected)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Review order' })).toBeEnabled();
      expect(screen.queryByText(/calculating your authoritative order total/i)).not.toBeInTheDocument();
    }
  });

  it('can retry the same preview successfully after a network failure', async () => {
    renderCheckout();
    fillValidDelivery();
    checkoutApi.previewCheckout
      .mockRejectedValueOnce(Object.assign(new Error('We could not reach ShopSphare. Check your connection and try again.'), { code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(authoritativeCheckout);

    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    expect(await screen.findByText(/could not reach shopsphare/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));

    expect(await screen.findByRole('heading', { name: 'Review your pending order' })).toBeInTheDocument();
    expect(checkoutApi.previewCheckout).toHaveBeenCalledTimes(2);
  });

  it('aborts a pending preview when Checkout unmounts without applying its result', async () => {
    let resolvePreview;
    checkoutApi.previewCheckout.mockImplementationOnce(() => new Promise((resolve) => { resolvePreview = resolve; }));
    const view = renderCheckout(initialItems, { strict: true });
    fillValidDelivery();
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    const signal = checkoutApi.previewCheckout.mock.calls[0][1].signal;

    view.unmount();
    expect(signal.aborted).toBe(true);
    resolvePreview(authoritativeCheckout);
    await Promise.resolve();
  });

  it('ignores a superseded preview when the cart changes during the request', async () => {
    let resolvePreview;
    checkoutApi.previewCheckout.mockImplementationOnce(() => new Promise((resolve) => { resolvePreview = resolve; }));
    const { store } = renderCheckout();
    fillValidDelivery();
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    store.dispatch(changeQuantity({ productId: 'featured-rosemary', quantity: 3 }));
    expect(await screen.findByText(/cart changed while the total was being calculated/i)).toBeInTheDocument();
    resolvePreview(authoritativeCheckout);
    await Promise.resolve();
    expect(screen.queryByRole('heading', { name: 'Review your pending order' })).not.toBeInTheDocument();
  });

  it('explains unavailable-product and timeout preview failures without creating an order', async () => {
    renderCheckout();
    fillValidDelivery();
    checkoutApi.previewCheckout.mockRejectedValueOnce(Object.assign(new Error('A product in your cart is currently unavailable. Return to Shop and update your cart.'), { code: 'UNAVAILABLE_PRODUCT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    expect(await screen.findByText(/currently unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to shop to update your cart/i })).toHaveAttribute('href', '/shop');

    checkoutApi.previewCheckout.mockRejectedValueOnce(Object.assign(new Error('The request took too long. Check your connection and try again.'), { code: 'TIMEOUT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    expect(await screen.findByText(/request took too long/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient name/i)).toHaveValue('Ada Okafor');
    expect(checkoutApi.createOrder).not.toHaveBeenCalled();
  });

  it('invalidates authoritative review after cart changes or delivery editing', async () => {
    const { store } = renderCheckout();
    await reachReview();
    store.dispatch(changeQuantity({ productId: 'featured-rosemary', quantity: 3 }));
    expect(await screen.findByText(/cart changed after review/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review order' })).toBeInTheDocument();

    await reachReview();
    fireEvent.click(screen.getByRole('button', { name: 'Edit delivery details' }));
    expect(screen.getByLabelText(/recipient name/i)).toHaveValue('Ada Okafor');
    fireEvent.change(screen.getByLabelText(/city or lga/i), { target: { value: 'Abuja' } });
    expect(screen.queryByRole('button', { name: 'Create pending order' })).not.toBeInTheDocument();
  });
});

describe('pending-order creation and idempotency', () => {
  it('reuses one key after a network failure, prevents rapid clicks and never clears the cart', async () => {
    const { store } = renderCheckout();
    await reachReview();
    const storedAttempt = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY));
    const networkError = Object.assign(new Error('The request took too long. Check your connection and try again.'), { code: 'TIMEOUT' });
    checkoutApi.createOrder.mockRejectedValueOnce(networkError);

    fireEvent.click(screen.getByRole('button', { name: 'Create pending order' }));
    fireEvent.click(screen.getByRole('button', { name: /creating pending order/i }));
    expect(checkoutApi.createOrder).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/request took too long/i)).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)).key).toBe(storedAttempt.key);

    checkoutApi.createOrder.mockResolvedValueOnce({ order: { id: 'order-123' }, replayed: false });
    fireEvent.click(screen.getByRole('button', { name: 'Create pending order' }));
    expect(await screen.findByText('Order destination')).toBeInTheDocument();
    expect(checkoutApi.createOrder.mock.calls[0][1]).toBe(storedAttempt.key);
    expect(checkoutApi.createOrder.mock.calls[1][1]).toBe(storedAttempt.key);
    expect(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)).toBeNull();
    expect(store.getState().cart.items).toEqual(initialItems);
    expect(screen.getByTestId('location')).toHaveTextContent('/orders/order-123');
  });

  it('handles replayed success and sends no preview totals to order creation', async () => {
    const { store } = renderCheckout();
    await reachReview();
    checkoutApi.createOrder.mockResolvedValueOnce({ order: { id: 'replayed-order' }, replayed: true });
    fireEvent.click(screen.getByRole('button', { name: 'Create pending order' }));
    expect(await screen.findByText('Order destination')).toBeInTheDocument();
    const [payload, key] = checkoutApi.createOrder.mock.calls[0];
    expect(payload).toEqual(checkoutApi.previewCheckout.mock.calls[0][0]);
    expect(typeof key).toBe('string');
    expect(JSON.stringify(payload)).not.toMatch(/price|subtotal|shipping|total|currency|userId|status|reference/i);
    expect(store.getState().cart.items).toEqual(initialItems);
  });

  it('creates a new attempt after material delivery change and clears it on cancellation', async () => {
    renderCheckout();
    await reachReview();
    const first = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY));
    fireEvent.click(screen.getByRole('button', { name: 'Edit delivery details' }));
    fireEvent.change(screen.getByLabelText(/city or lga/i), { target: { value: 'Abuja' } });
    checkoutApi.previewCheckout.mockResolvedValueOnce({
      ...authoritativeCheckout,
      delivery: { ...authoritativeCheckout.delivery, cityOrLga: 'Abuja' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Review order' }));
    await waitFor(() => expect(checkoutApi.previewCheckout).toHaveBeenCalledTimes(2));
    const second = JSON.parse(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY));
    expect(second.key).not.toBe(first.key);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel checkout' }));
    expect(await screen.findByText('Shop destination')).toBeInTheDocument();
    expect(sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY)).toBeNull();
  });

  it('keeps conflict recoverable and returns product availability failures to delivery', async () => {
    renderCheckout();
    await reachReview();
    checkoutApi.createOrder.mockRejectedValueOnce(Object.assign(new Error('This checkout attempt was already used for different order information.'), { code: 'IDEMPOTENCY_CONFLICT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create pending order' }));
    expect(await screen.findByText(/already used for different/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create pending order' })).toBeEnabled();

    checkoutApi.createOrder.mockRejectedValueOnce(Object.assign(new Error('A product in your cart is currently unavailable.'), { code: 'UNAVAILABLE_PRODUCT' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create pending order' }));
    expect(await screen.findByText(/currently unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Review order' })).toBeInTheDocument();
  });
});
