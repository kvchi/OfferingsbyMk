import { StrictMode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import cartReducer from '../store/cart';
import OrderDetail from './OrderDetail';
import { baseOrder, orderState } from '../test/orderFixtures';

const ordersApi = vi.hoisted(() => ({ getOrderDetail: vi.fn() }));
const paymentsApi = vi.hoisted(() => ({ initializeOrderPayment: vi.fn(), verifyOrderPayment: vi.fn() }));
const redirect = vi.hoisted(() => ({ redirectToPaystack: vi.fn() }));
vi.mock('../api/orders', () => ordersApi);
vi.mock('../api/payments', () => paymentsApi);
vi.mock('../utils/paystackRedirect', () => redirect);

const cartItems = [{ productId: 'featured-rosemary', quantity: 2 }];

function renderPage({ strict = false } = {}) {
  const actions = [];
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items: cartItems, statusTab: false } },
    middleware: (getDefault) => getDefault().concat(() => (next) => (action) => { actions.push(action); return next(action); }),
  });
  const content = (
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/orders/${baseOrder.id}`]}>
        <Routes>
          <Route path='/orders/:orderId' element={<OrderDetail />} />
          <Route path='/orders' element={<div>Orders destination</div>} />
          <Route path='/shop' element={<div>Shop destination</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  const view = render(strict ? <StrictMode>{content}</StrictMode> : content);
  return { ...view, store, actions };
}

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('Order Detail', () => {
  it('loads historical items and delivery data, then initializes once without clearing the cart', async () => {
    ordersApi.getOrderDetail.mockResolvedValue(baseOrder);
    let resolveInitialization;
    paymentsApi.initializeOrderPayment.mockImplementation(() => new Promise((resolve) => { resolveInitialization = resolve; }));
    const { store } = renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/loading your order/i);
    expect(await screen.findByText('Historical Rosemary Snapshot')).toBeInTheDocument();
    expect(screen.getByText('12 Market Road')).toBeInTheDocument();
    const button = screen.getByRole('button', { name: /pay securely with paystack/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toBeDisabled();
    expect(paymentsApi.initializeOrderPayment).toHaveBeenCalledTimes(1);
    expect(store.getState().cart.items).toEqual(cartItems);
    resolveInitialization({ authorizationUrl: 'https://checkout.paystack.com/safe-code', reference: 'SSPAY-12345678', testMode: true });
    await waitFor(() => expect(redirect.redirectToPaystack).toHaveBeenCalledTimes(1));
    expect(store.getState().cart.items).toEqual(cartItems);
  });

  it('checks initialized payment status only on request and clears the cart once after server confirmation in Strict Mode', async () => {
    const initialized = orderState('initialized');
    const paid = orderState('paid');
    let currentOrder = initialized;
    ordersApi.getOrderDetail.mockImplementation(() => Promise.resolve(currentOrder));
    paymentsApi.verifyOrderPayment.mockImplementation(() => {
      currentOrder = paid;
      return Promise.resolve({
        verified: true,
        order: { id: paid.id, orderNumber: paid.orderNumber, status: 'PAID', paymentStatus: 'PAID', totalKobo: paid.totalKobo, currency: 'NGN' },
        payment: { reference: 'SSPAY-12345678', status: 'PAID', paidAt: paid.payment.paidAt },
      });
    });
    const { store, actions } = renderPage({ strict: true });
    const button = await screen.findByRole('button', { name: /check payment status/i });
    expect(paymentsApi.verifyOrderPayment).not.toHaveBeenCalled();
    fireEvent.click(button);
    fireEvent.click(button);
    expect(paymentsApi.verifyOrderPayment).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/payment confirmed by the server/i)).toBeInTheDocument();
    expect(store.getState().cart.items).toEqual([]);
    expect(actions.filter(({ type }) => type === 'cart/clearCart')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /view receipt/i })).toBeInTheDocument();
  });

  it.each([
    ['failed', /payment failed/i, true],
    ['cancelled', /order cancelled/i, false],
    ['paid', /payment confirmed/i, false],
    ['unknown', /status needs review/i, false],
  ])('presents %s safely with no inappropriate second-payment action', async (kind, label, hasPayment) => {
    ordersApi.getOrderDetail.mockResolvedValueOnce(orderState(kind));
    renderPage();
    expect(await screen.findByLabelText(label)).toBeInTheDocument();
    expect(Boolean(screen.queryByRole('button', { name: /pay securely/i }))).toBe(hasPayment);
    if (kind === 'cancelled') expect(screen.queryByRole('link', { name: /view receipt/i })).not.toBeInTheDocument();
    if (kind === 'paid') expect(screen.getByRole('link', { name: /view receipt/i })).toBeInTheDocument();
    if (kind === 'unknown') expect(screen.getByRole('button', { name: /refresh server state/i })).toBeInTheDocument();
  });

  it('handles non-enumerating not-found, malformed/network errors, retry, and payment retry', async () => {
    ordersApi.getOrderDetail
      .mockRejectedValueOnce(Object.assign(new Error('We could not find that order in your account.'), { code: 'ORDER_NOT_FOUND' }));
    const missing = renderPage();
    expect(await screen.findByRole('heading', { name: /order not found/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    missing.unmount();

    ordersApi.getOrderDetail
      .mockRejectedValueOnce(Object.assign(new Error('Invalid order information'), { code: 'MALFORMED_RESPONSE' }))
      .mockResolvedValueOnce(baseOrder);
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    expect(await screen.findByText(baseOrder.orderNumber)).toBeInTheDocument();
    paymentsApi.initializeOrderPayment.mockRejectedValueOnce(new Error('Payment unavailable'));
    fireEvent.click(screen.getByRole('button', { name: /pay securely/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/cart has been kept/i);
    expect(screen.getByRole('button', { name: /retry payment/i })).toBeInTheDocument();
  });
});
