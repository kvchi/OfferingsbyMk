import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../store/auth';
import cartReducer from '../store/cart';
import Header from './Header';
import CartTab from './CartTab';

const token = 'header.payload.signature';
const user = { id: 'user-1', email: 'user@example.com', status: 'ACTIVE' };

function renderHeader({ authenticated = false, quantity = 3 } = {}) {
  const store = configureStore({
    reducer: { auth: authReducer, cart: cartReducer },
    preloadedState: {
      auth: authenticated
        ? { user, token, isAuthenticated: true, isInitializing: false }
        : { user: null, token: null, isAuthenticated: false, isInitializing: false },
      cart: {
        items: quantity ? [{ productId: 'featured-rosemary', quantity }] : [],
        statusTab: false,
      },
    },
  });

  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/shop']}>
        <Header />
        <CartTab />
        <Routes>
          <Route path='/' element={<div>Home route</div>} />
          <Route path='/shop' element={<div>Shop route</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

  return store;
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  vi.restoreAllMocks();
});

describe('accessible persistent header', () => {
  it('uses fixed viewport positioning, an elevated layer, and a matching spacer', () => {
    renderHeader();
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('fixed', 'top-0', 'left-0', 'right-0', 'z-[80]', 'h-16', 'md:h-20');
    expect(header.nextElementSibling).toHaveAttribute('data-header-spacer');
    expect(header.nextElementSibling).toHaveClass('h-16', 'md:h-20');
  });

  it('uses one normally-positioned theme control before cart in the shared right-side group', () => {
    renderHeader();
    const controls = document.querySelector('[data-header-controls]');
    const region = controls.querySelector('[data-theme-control-region]');
    const themeButton = screen.getByRole('button', { name: 'Switch to dark mode' });
    const cartButton = screen.getByRole('button', { name: 'Open shopping cart, 3 items' });

    expect(screen.getAllByRole('button', { name: /switch to (dark|light) mode/i })).toHaveLength(1);
    expect(region).toHaveClass('flex', 'items-center');
    expect(region).not.toHaveClass('relative', 'mr-14', '-top-5');
    expect(themeButton).not.toHaveClass('absolute', 'right-0');
    expect(themeButton.compareDocumentPosition(cartButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('exposes semantic, named cart, menu, category, and theme buttons', () => {
    renderHeader({ quantity: 3 });

    expect(screen.getAllByRole('button', { name: 'Open shopping cart, 3 items' })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Toggle navigation menu' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Category', hidden: true })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('orders mobile menu and desktop authentication controls after cart', () => {
    renderHeader();
    const cart = screen.getByRole('button', { name: 'Open shopping cart, 3 items' });
    const menu = screen.getByRole('button', { name: 'Toggle navigation menu' });
    const login = screen.getByRole('link', { name: 'Login' });
    const shop = screen.getAllByRole('link', { name: 'Shop' })[0];

    expect(cart.compareDocumentPosition(menu) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cart.compareDocumentPosition(login) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(cart.compareDocumentPosition(shop) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('keeps the closed mobile menu out of the accessibility tree', () => {
    renderHeader();
    const menu = document.getElementById('mobile-navigation-menu');

    expect(menu).toHaveAttribute('aria-hidden', 'true');
    expect(menu).toHaveClass('absolute', 'top-full', 'z-[70]');
    expect(menu).toHaveClass('invisible', 'pointer-events-none');
    expect(within(menu).queryByRole('link')).not.toBeInTheDocument();
    expect(within(menu).getAllByRole('link', { hidden: true }).length).toBeGreaterThan(0);
  });

  it('updates menu state and restores trigger focus when Escape closes it', () => {
    renderHeader();
    const trigger = screen.getByRole('button', { name: 'Toggle navigation menu' });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById('mobile-navigation-menu')).toHaveAttribute('aria-hidden', 'false');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('updates category state, closes on Escape, and preserves Shop anchor destinations', () => {
    renderHeader();
    const categoryTrigger = screen.getByRole('button', { name: 'Category' });

    fireEvent.click(categoryTrigger);
    expect(categoryTrigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Candles' })).toHaveAttribute('href', '/shop#candles');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(categoryTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(categoryTrigger).toHaveFocus();
  });

  it('announces the singular cart quantity and toggles the theme action', () => {
    renderHeader({ quantity: 1 });
    expect(screen.getAllByRole('button', { name: 'Open shopping cart, 1 item' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveAttribute('aria-pressed', 'true');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('preserves logout cleanup and navigation', () => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    const success = vi.spyOn(toast, 'success').mockImplementation(() => 'toast-id');
    const store = renderHeader({ authenticated: true });

    fireEvent.click(screen.getAllByRole('button', { name: 'Logout' })[0]);

    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(screen.getByText('Home route')).toBeInTheDocument();
    expect(success).toHaveBeenCalledWith('Logged out successfully');
  });

  it('lets drawer Escape close only the cart without closing an open header menu', () => {
    const store = renderHeader();
    const menu = screen.getByRole('button', { name: 'Toggle navigation menu' });
    const cart = screen.getByRole('button', { name: /open shopping cart/i });

    fireEvent.click(menu);
    fireEvent.click(cart);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Shopping Cart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CLOSE' })).toHaveFocus();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(store.getState().cart.statusTab).toBe(false);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    expect(cart).toHaveFocus();
  });
});
