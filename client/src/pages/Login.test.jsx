import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import authReducer from '../store/auth';
import api from '../api/client';
import Login from './Login';

const authenticatedState = {
  user: { id: '1' },
  token: 'header.payload.signature',
  isAuthenticated: true,
  isInitializing: false,
};
const loggedOutState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: false,
};

function CheckoutDestination() {
  const location = useLocation();
  return <div>Checkout destination{location.search}{location.hash}</div>;
}

const renderAuthenticatedLogin = (initialEntry) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authenticatedState },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/shop" element={<div>Shop destination</div>} />
          <Route path="/product/:id" element={<div>Preserved product destination</div>} />
          <Route path="/checkout" element={<CheckoutDestination />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

const renderLoggedOutLogin = () => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: loggedOutState } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/shop" element={<div>Shop destination</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

beforeEach(() => vi.restoreAllMocks());

describe('Login navigation', () => {
  it('returns an authenticated visitor to the protected destination', async () => {
    renderAuthenticatedLogin({
      pathname: '/login',
      state: { from: { pathname: '/product/featured-rosemary' } },
    });

    expect(await screen.findByText('Preserved product destination')).toBeInTheDocument();
  });

  it('uses the Shop page when no preserved destination exists', async () => {
    renderAuthenticatedLogin('/login');

    expect(await screen.findByText('Shop destination')).toBeInTheDocument();
  });

  it('returns to Checkout with the complete preserved destination', async () => {
    renderAuthenticatedLogin({
      pathname: '/login',
      state: { from: { pathname: '/checkout', search: '?step=delivery', hash: '#address' } },
    });

    expect(await screen.findByText('Checkout destination?step=delivery#address')).toBeInTheDocument();
  });
});

describe('Login and signup accessibility', () => {
  it('uses visible labels, autocomplete metadata, and a semantic visibility control', () => {
    renderLoggedOutLogin();
    const email = screen.getByLabelText('Email address');
    const password = screen.getByLabelText('Password');
    const visibility = screen.getByRole('button', { name: 'Show login password' });

    expect(email).toHaveAttribute('name', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
    expect(visibility.tagName).toBe('BUTTON');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(visibility);
    expect(password).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide login password' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('switches modes with buttons, preserves valid login input, and moves focus', async () => {
    renderLoggedOutLogin();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } });
    const switchToSignup = screen.getByRole('button', { name: /don.t have an account/i });
    expect(switchToSignup.tagName).toBe('BUTTON');
    fireEvent.click(switchToSignup);

    const signupHeading = screen.getByRole('heading', { name: /create your OfferingsbyMK account/i });
    await waitFor(() => expect(signupHeading).toHaveFocus());
    expect(screen.getByLabelText('First name')).toHaveAttribute('autocomplete', 'given-name');
    expect(screen.getByLabelText('Last name')).toHaveAttribute('autocomplete', 'family-name');
    expect(screen.getByLabelText(/Phone number/, { selector: 'input' })).toHaveAttribute('autocomplete', 'tel');
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password');

    fireEvent.click(screen.getByRole('button', { name: /already a member/i }));
    expect(screen.getByLabelText('Email address')).toHaveValue('person@example.com');
  });

  it('associates field errors and announces form validation', () => {
    renderLoggedOutLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    const email = screen.getByLabelText('Email address');
    const password = screen.getByLabelText('Password');

    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'login-email-error');
    expect(password).toHaveAttribute('aria-invalid', 'true');
    expect(password).toHaveAttribute('aria-describedby', 'login-password-error');
    expect(screen.getByText('Check the highlighted fields and try again.')).toHaveAttribute('role', 'alert');
  });

  it('announces loading, disables duplicate submission, and announces generic login failure', async () => {
    vi.spyOn(api, 'post').mockRejectedValue({ response: { data: { message: 'Invalid email or password.' } } });
    renderLoggedOutLogin();
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'person@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password!2486' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(document.getElementById('login-form')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(api.post).toHaveBeenCalledTimes(1);
  });
});
