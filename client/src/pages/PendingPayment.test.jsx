import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import cartReducer from '../store/cart';
import PendingPayment from './PendingPayment';

const checkoutApi = vi.hoisted(() => ({ getOrder: vi.fn() }));
const paymentsApi = vi.hoisted(() => ({ initializeOrderPayment: vi.fn() }));
const redirect = vi.hoisted(() => ({ redirectToPaystack: vi.fn() }));
vi.mock('../api/checkout', () => checkoutApi);
vi.mock('../api/payments', () => paymentsApi);
vi.mock('../utils/paystackRedirect', () => redirect);

const cartItems = [{ productId: 'featured-rosemary', quantity: 2 }];
const ownedOrder = {
  id: 'order-owned-1',
  orderNumber: 'SS-20260828-ABCDEF1234',
  status: 'PENDING',
  paymentStatus: 'UNPAID',
  lines: [{
    productId: 'featured-rosemary',
    title: 'Immutable Rosemary Snapshot',
    quantity: 2,
    unitPriceKobo: 1_500_000,
    lineTotalKobo: 3_000_000,
  }],
  delivery: {
    recipientName: 'Ada Okafor',
    phone: '+2348012345678',
    addressLine1: '12 Market Road',
    cityOrLga: 'Ikeja',
    state: 'Lagos',
    country: 'Nigeria',
  },
  subtotalKobo: 3_000_000,
  shippingKobo: 0,
  totalKobo: 3_000_000,
  currency: 'NGN',
  createdAt: '2026-08-28T12:00:00.000Z',
};

function renderPending(orderId = ownedOrder.id) {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items: cartItems, statusTab: false } },
  });
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/orders/${orderId}/payment`]}>
        <Routes>
          <Route path='/orders/:orderId/payment' element={<PendingPayment />} />
          <Route path='/shop' element={<div>Shop destination</div>} />
          <Route path='/checkout' element={<div>Checkout destination</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return { store, ...view };
}

beforeEach(() => vi.resetAllMocks());

describe('pending-payment page', () => {
  it('supports direct loading and displays authoritative pending order data without clearing cart', async () => {
    let resolveOrder;
    checkoutApi.getOrder.mockImplementationOnce(() => new Promise((resolve) => { resolveOrder = resolve; }));
    const { store } = renderPending();
    expect(screen.getByRole('status')).toHaveTextContent(/loading your order/i);
    expect(checkoutApi.getOrder).toHaveBeenCalledWith(ownedOrder.id, expect.objectContaining({ signal: expect.any(AbortSignal) }));

    resolveOrder(ownedOrder);
    expect(await screen.findByText(ownedOrder.orderNumber)).toBeInTheDocument();
    expect(screen.getByText('Immutable Rosemary Snapshot')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('unpaid')).toBeInTheDocument();
    expect(screen.getByText(/payment has not been completed/i)).toBeInTheDocument();
    expect(screen.getByText(/no charge has been made/i)).toBeInTheDocument();
    expect(screen.getByText(/NGN/)).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pay securely with paystack.*test mode/i })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Return to Shop' })).toHaveAttribute('href', '/shop');
    expect(screen.getByRole('link', { name: 'Start a new checkout' })).toHaveAttribute('href', '/checkout');
    expect(store.getState().cart.items).toEqual(cartItems);
  });

  it('initializes once, disables duplicate clicks and redirects only through the validated redirect helper', async () => {
    checkoutApi.getOrder.mockResolvedValueOnce(ownedOrder);
    let resolveInitialization;
    paymentsApi.initializeOrderPayment.mockImplementationOnce(() => new Promise((resolve) => { resolveInitialization = resolve; }));
    renderPending();
    const button = await screen.findByRole('button', { name: /pay securely with paystack/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(paymentsApi.initializeOrderPayment).toHaveBeenCalledTimes(1);
    resolveInitialization({ authorizationUrl: 'https://checkout.paystack.com/safe-code', reference: 'SSPAY-12345678', testMode: true });
    await waitFor(() => expect(redirect.redirectToPaystack).toHaveBeenCalledWith('https://checkout.paystack.com/safe-code'));
  });

  it('retains the cart and supports retry after initialization failure', async () => {
    checkoutApi.getOrder.mockResolvedValueOnce(ownedOrder);
    paymentsApi.initializeOrderPayment
      .mockRejectedValueOnce(new Error('Paystack is temporarily unavailable. Please try again.'))
      .mockResolvedValueOnce({ authorizationUrl: 'https://checkout.paystack.com/retry-code', reference: 'SSPAY-12345678', testMode: true });
    const { store } = renderPending();
    fireEvent.click(await screen.findByRole('button', { name: /pay securely with paystack/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
    expect(store.getState().cart.items).toEqual(cartItems);
    fireEvent.click(screen.getByRole('button', { name: /retry payment/i }));
    await waitFor(() => expect(redirect.redirectToPaystack).toHaveBeenCalledTimes(1));
    expect(paymentsApi.initializeOrderPayment).toHaveBeenCalledTimes(2);
  });

  it('shows a confirmed paid state without offering another payment action', async () => {
    checkoutApi.getOrder.mockResolvedValueOnce({ ...ownedOrder, status: 'PAID', paymentStatus: 'PAID' });
    renderPending();
    expect(await screen.findByText(/securely confirmed by the server/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /pay securely/i })).not.toBeInTheDocument();
  });

  it('recovers from a network failure with an explicit retry', async () => {
    checkoutApi.getOrder
      .mockRejectedValueOnce(Object.assign(new Error('We could not reach ShopSphare. Check your connection and try again.'), { code: 'NETWORK_ERROR' }))
      .mockResolvedValueOnce(ownedOrder);
    renderPending();
    const error = await screen.findByRole('alert');
    await waitFor(() => expect(error).toHaveFocus());
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByText(ownedOrder.orderNumber)).toBeInTheDocument();
    expect(checkoutApi.getOrder).toHaveBeenCalledTimes(2);
  });

  it('shows safe not-found and authentication recovery states', async () => {
    checkoutApi.getOrder.mockRejectedValueOnce(Object.assign(new Error('We could not find that order in your account.'), { code: 'ORDER_NOT_FOUND' }));
    const notFound = renderPending('missing-order');
    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    notFound.unmount();

    checkoutApi.getOrder.mockRejectedValueOnce(Object.assign(new Error('Your session has expired. Please log in again.'), { code: 'AUTHENTICATION_REQUIRED' }));
    renderPending();
    expect(await screen.findByText(/session has expired/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('never trusts navigation state and always requests the route order ID', async () => {
    checkoutApi.getOrder.mockResolvedValueOnce(ownedOrder);
    renderPending('route-order-456');
    await waitFor(() => expect(checkoutApi.getOrder).toHaveBeenCalled());
    expect(checkoutApi.getOrder.mock.calls[0][0]).toBe('route-order-456');
  });
});
