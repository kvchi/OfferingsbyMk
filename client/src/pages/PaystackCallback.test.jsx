import React, { StrictMode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import cartReducer from '../store/cart';
import PaystackCallback from './PaystackCallback';

const paymentsApi = vi.hoisted(() => ({ verifyOrderPayment: vi.fn() }));
vi.mock('../api/payments', () => paymentsApi);

const orderId = 'order-12345678';
const cartItems = [{ productId: 'featured-rosemary', quantity: 1 }];
const success = {
  verified: true,
  order: { id: orderId, orderNumber: 'SS-20260829-CALLBACK', status: 'PAID', paymentStatus: 'PAID', totalKobo: 1_500_000, currency: 'NGN' },
  payment: { reference: 'SSPAY-12345678', status: 'PAID', paidAt: '2026-08-29T10:00:00.000Z' },
};
const pending = {
  verified: false,
  order: { ...success.order, status: 'PENDING', paymentStatus: 'PENDING' },
  payment: { ...success.payment, status: 'PENDING', paidAt: null },
};

function renderCallback({ strict = false, store } = {}) {
  const actions = [];
  const selectedStore = store ?? configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items: cartItems, statusTab: false } },
    middleware: (getDefault) => getDefault().concat(() => (next) => (action) => { actions.push(action); return next(action); }),
  });
  const content = (
    <Provider store={selectedStore}>
      <MemoryRouter initialEntries={[`/payments/paystack/callback?orderId=${orderId}&reference=browser-value-is-not-trusted`]}>
        <Routes>
          <Route path='/payments/paystack/callback' element={<PaystackCallback />} />
          <Route path='/orders/:orderId' element={<div>Order destination</div>} />
          <Route path='/shop' element={<div>Shop destination</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  const view = render(strict ? <StrictMode>{content}</StrictMode> : content);
  return { ...view, store: selectedStore, actions };
}

beforeEach(() => vi.resetAllMocks());

describe('Paystack callback verification', () => {
  it('has accessible progress and clears the persisted cart exactly once after server-verified success in Strict Mode', async () => {
    let resolveVerification;
    paymentsApi.verifyOrderPayment.mockImplementation(() => new Promise((resolve) => { resolveVerification = resolve; }));
    const view = renderCallback({ strict: true });
    expect(screen.getByRole('status')).toHaveTextContent(/verifying/i);
    expect(view.store.getState().cart.items).toEqual(cartItems);
    resolveVerification(success);
    expect(await screen.findByRole('heading', { name: /payment confirmed/i })).toBeInTheDocument();
    expect(screen.getByText(success.order.orderNumber)).toBeInTheDocument();
    expect(screen.getByText(/confirmed total/i)).toBeInTheDocument();
    expect(view.store.getState().cart.items).toEqual([]);
    expect(localStorage.getItem('carts')).toBe('[]');
    expect(paymentsApi.verifyOrderPayment).toHaveBeenCalledTimes(1);
    expect(view.actions.filter(({ type }) => type === 'cart/clearCart')).toHaveLength(1);
  });

  it('keeps the cart for pending confirmation and supports safe retry', async () => {
    paymentsApi.verifyOrderPayment.mockResolvedValueOnce(pending).mockResolvedValueOnce(success);
    const { store } = renderCallback();
    expect(await screen.findByRole('heading', { name: /confirmation pending/i })).toBeInTheDocument();
    expect(store.getState().cart.items).toEqual(cartItems);
    fireEvent.click(screen.getByRole('button', { name: /retry verification/i }));
    expect(await screen.findByRole('heading', { name: /payment confirmed/i })).toBeInTheDocument();
    expect(store.getState().cart.items).toEqual([]);
  });

  it('keeps the cart for failed and malformed verification and offers recovery actions', async () => {
    paymentsApi.verifyOrderPayment.mockRejectedValueOnce(new Error('ShopSphare returned an invalid payment response.'));
    const { store } = renderCallback();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/invalid payment response/i);
    expect(alert).toHaveTextContent(/cart has been kept/i);
    expect(store.getState().cart.items).toEqual(cartItems);
    expect(screen.getByRole('button', { name: /retry verification/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /return to order/i })).toHaveAttribute('href', `/orders/${orderId}`);
  });

  it('handles refresh and duplicate callbacks without a second cart-clear operation', async () => {
    paymentsApi.verifyOrderPayment.mockResolvedValue(success);
    const first = renderCallback();
    await screen.findByRole('heading', { name: /payment confirmed/i });
    expect(first.actions.filter(({ type }) => type === 'cart/clearCart')).toHaveLength(1);
    first.unmount();
    const second = renderCallback({ store: first.store });
    await screen.findByRole('heading', { name: /payment confirmed/i });
    expect(second.actions.filter(({ type }) => type === 'cart/clearCart')).toHaveLength(0);
    expect(paymentsApi.verifyOrderPayment).toHaveBeenCalledTimes(2);
  });

  it('rejects a malformed callback order identifier without contacting verification', async () => {
    render(
      <Provider store={configureStore({ reducer: { cart: cartReducer } })}>
        <MemoryRouter initialEntries={['/payments/paystack/callback?orderId=bad!']}>
          <PaystackCallback />
        </MemoryRouter>
      </Provider>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/missing a valid order/i);
    expect(paymentsApi.verifyOrderPayment).not.toHaveBeenCalled();
  });
});
