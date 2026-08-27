import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, describe, expect, it, vi } from 'vitest';
import cartReducer from '../store/cart';
import CartTab from './CartTab';

const rosemaryLine = { productId: 'featured-rosemary', quantity: 2 };

function renderCart(items) {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items, statusTab: true } },
  });

  const dispatch = vi.spyOn(store, 'dispatch');

  render(
    <Provider store={store}>
      <MemoryRouter>
        <CartTab />
        <Toaster />
      </MemoryRouter>
    </Provider>
  );

  return { store, dispatch };
}

afterEach(() => {
  toast.remove();
  vi.restoreAllMocks();
});

describe('Clear Cart UI', () => {
  it('uses an interactive toast and preserves cart and storage when cancelled', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    localStorage.setItem('carts', JSON.stringify([rosemaryLine]));
    const { store, dispatch } = renderCart([rosemaryLine]);

    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));
    const dialog = await screen.findByRole('alertdialog');

    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(dialog).toHaveTextContent('Clear all items from your cart?');
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(store.getState().cart.items).toEqual([rosemaryLine]);
    expect(localStorage.getItem('carts')).toBe(JSON.stringify([rosemaryLine]));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('clears exactly once, persists, dismisses confirmation, and shows feedback', async () => {
    const nativeConfirm = vi.spyOn(window, 'confirm');
    localStorage.setItem('carts', JSON.stringify([rosemaryLine]));
    const dismiss = vi.spyOn(toast, 'dismiss');
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 'toast-id');
    const { store, dispatch } = renderCart([rosemaryLine]);

    fireEvent.click(screen.getByRole('button', { name: /clear cart/i }));
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear cart' })[1]);

    expect(nativeConfirm).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledOnce();
    expect(dispatch.mock.calls[0][0].type).toBe('cart/clearCart');
    expect(store.getState().cart).toEqual({ items: [], statusTab: true });
    expect(localStorage.getItem('carts')).toBe('[]');
    expect(dismiss).toHaveBeenCalledWith('clear-cart-confirmation');
    expect(success).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });

  it('does not create duplicate confirmation toasts after repeated clicks', async () => {
    renderCart([rosemaryLine]);
    const clearControl = screen.getByRole('button', { name: /clear cart/i });

    fireEvent.click(clearControl);
    fireEvent.click(clearControl);
    fireEvent.click(clearControl);

    expect(await screen.findAllByRole('alertdialog')).toHaveLength(1);
  });

  it('shows an empty state and disables unavailable checkout', () => {
    renderCart([]);

    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /continue shopping/i })).toHaveAttribute('href', '/shop');
    expect(screen.queryByRole('button', { name: /clear cart/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /checkout unavailable/i })).toBeDisabled();
  });

  it('keeps checkout disabled when the cart contains items', () => {
    renderCart([rosemaryLine]);

    expect(screen.getByRole('button', { name: /checkout unavailable/i })).toBeDisabled();
  });
});
