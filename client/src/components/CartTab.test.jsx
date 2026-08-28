import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { afterEach, describe, expect, it, vi } from 'vitest';
import cartReducer, { MAX_CART_QUANTITY, toggleStatusTab } from '../store/cart';
import CartTab from './CartTab';

const rosemaryLine = { productId: 'featured-rosemary', quantity: 2 };

function renderCart(items, statusTab = true) {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState: { cart: { items, statusTab } },
  });

  const dispatch = vi.spyOn(store, 'dispatch');

  const view = render(
    <Provider store={store}>
      <MemoryRouter>
        <button type='button' onClick={() => store.dispatch(toggleStatusTab())}>Open test cart</button>
        <CartTab />
        <Toaster />
      </MemoryRouter>
    </Provider>
  );

  return { store, dispatch, ...view };
}

afterEach(() => {
  toast.remove();
  document.body.style.overflow = '';
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

    expect(screen.getByRole('dialog', { name: /shopping cart/i })).toHaveClass('top-16', 'md:top-20', 'h-[calc(100vh-4rem)]', 'md:h-[calc(100vh-5rem)]', 'z-[70]');
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

describe('cart drawer accessibility and focus management', () => {
  it('uses modal dialog semantics with a title and description', () => {
    renderCart([]);
    const dialog = screen.getByRole('dialog', { name: 'Shopping Cart' });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'shopping-cart-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'shopping-cart-description');
    expect(screen.getByText('Review and update the products in your cart.')).toBeInTheDocument();
  });

  it('does not expose the closed drawer or its controls', () => {
    renderCart([], false);
    const drawer = document.getElementById('shopping-cart-drawer');

    expect(drawer).toHaveAttribute('aria-hidden', 'true');
    expect(drawer).toHaveAttribute('inert');
    expect(drawer).not.toHaveAttribute('role');
    expect(drawer).toHaveClass('translate-x-full', 'pointer-events-none');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'CLOSE' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /continue shopping/i })).not.toBeInTheDocument();
  });

  it('focuses Close on opening and restores the exact opener after Escape', () => {
    const { store } = renderCart([], false);
    const opener = screen.getByRole('button', { name: 'Open test cart' });
    opener.focus();
    fireEvent.click(opener);

    expect(screen.getByRole('button', { name: 'CLOSE' })).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(store.getState().cart.statusTab).toBe(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes from the backdrop but not from clicks inside the drawer', () => {
    const { store } = renderCart([], false);
    const opener = screen.getByRole('button', { name: 'Open test cart' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('dialog'));
    expect(store.getState().cart.statusTab).toBe(true);

    fireEvent.click(document.querySelector('[data-cart-backdrop]'));
    expect(store.getState().cart.statusTab).toBe(false);
    expect(opener).toHaveFocus();
  });

  it('closes through Continue shopping and restores focus to the opener', () => {
    const { store } = renderCart([], false);
    const opener = screen.getByRole('button', { name: 'Open test cart' });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole('link', { name: /continue shopping/i }));

    expect(store.getState().cart.statusTab).toBe(false);
    expect(opener).toHaveFocus();
  });

  it('traps forward and reverse focus for an empty cart', () => {
    renderCart([]);
    const continueShopping = screen.getByRole('link', { name: /continue shopping/i });
    const close = screen.getByRole('button', { name: 'CLOSE' });

    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(continueShopping).toHaveFocus();

    fireEvent.keyDown(continueShopping, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });

  it('recalculates and traps populated-cart controls', () => {
    renderCart([rosemaryLine]);
    const clear = screen.getByRole('button', { name: 'Clear cart' });
    const decrease = screen.getByRole('button', { name: /decrease rosemary quantity/i });
    const increase = screen.getByRole('button', { name: /increase rosemary quantity/i });
    const close = screen.getByRole('button', { name: 'CLOSE' });
    const controls = Array.from(document.getElementById('shopping-cart-drawer').querySelectorAll('button:not(:disabled), a[href]'));

    expect(controls).toEqual([clear, decrease, increase, close]);

    close.focus();
    fireEvent.keyDown(close, { key: 'Tab' });
    expect(clear).toHaveFocus();

    fireEvent.keyDown(clear, { key: 'Tab', shiftKey: true });
    expect(close).toHaveFocus();
  });

  it('locks body scrolling while open and restores the prior value on close', () => {
    document.body.style.overflow = 'auto';
    renderCart([]);
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));
    expect(document.body.style.overflow).toBe('auto');
  });

  it('focuses the confirmation, restores Clear cart after Cancel, and leaves the drawer open', async () => {
    const { store } = renderCart([rosemaryLine]);
    const clear = screen.getByRole('button', { name: 'Clear cart' });
    fireEvent.click(clear);

    expect(await screen.findByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(clear).toHaveFocus();
    expect(store.getState().cart.statusTab).toBe(true);
  });

  it('uses Escape to dismiss an active confirmation without closing the drawer', async () => {
    const { store } = renderCart([rosemaryLine]);
    const clear = screen.getByRole('button', { name: 'Clear cart' });
    fireEvent.click(clear);
    await screen.findByRole('alertdialog');

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(store.getState().cart.statusTab).toBe(true);
    expect(clear).toHaveFocus();
  });

  it('traps focus inside the active clear-cart confirmation', async () => {
    renderCart([rosemaryLine]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear cart' }));

    const confirmation = await screen.findByRole('alertdialog');
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const confirm = screen.getAllByRole('button', { name: 'Clear cart' })[1];
    expect(confirmation).toHaveAttribute('aria-modal', 'true');

    cancel.focus();
    fireEvent.keyDown(cancel, { key: 'Tab', shiftKey: true });
    expect(confirm).toHaveFocus();

    fireEvent.keyDown(confirm, { key: 'Tab' });
    expect(cancel).toHaveFocus();
  });

  it('removes an active confirmation when the drawer closes', async () => {
    renderCart([rosemaryLine]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear cart' }));
    await screen.findByRole('alertdialog');

    fireEvent.click(screen.getByRole('button', { name: 'CLOSE' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.queryByRole('dialog', { name: 'Shopping Cart' })).not.toBeInTheDocument();
  });

  it('keeps the drawer open and focuses Close after confirmed clearing', async () => {
    const { store } = renderCart([rosemaryLine]);
    fireEvent.click(screen.getByRole('button', { name: 'Clear cart' }));
    await screen.findByRole('alertdialog');
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear cart' })[1]);

    expect(store.getState().cart.items).toEqual([]);
    expect(store.getState().cart.statusTab).toBe(true);
    expect(screen.getByRole('button', { name: 'CLOSE' })).toHaveFocus();
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument();
  });

  it('disables quantity increases with an accessible maximum explanation', () => {
    renderCart([{ productId: 'featured-rosemary', quantity: MAX_CART_QUANTITY }]);
    const maximum = screen.getByRole('button', { name: `Rosemary is at the maximum quantity of ${MAX_CART_QUANTITY}` });
    expect(maximum).toBeDisabled();
    expect(maximum).toHaveAttribute('title', `Maximum quantity is ${MAX_CART_QUANTITY}`);
  });
});
