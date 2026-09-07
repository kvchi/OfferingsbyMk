import React, { StrictMode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../api/auth';
import api from '../api/client';
import authReducer from '../store/auth';
import Login from './Login';
import ResetPassword from './ResetPassword';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const validToken = 'a'.repeat(64);
const newPassword = 'UpdatedPass!2486';
const authenticatedState = {
  user: { id: 'user-1', email: 'person@example.com', status: 'ACTIVE' },
  token: ['header', 'payload', 'signature'].join('.'),
  isAuthenticated: true,
  isInitializing: false,
};
const loggedOutState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitializing: false,
};

const createTestStore = ({ auth = loggedOutState, actionTypes = [] } = {}) => configureStore({
  reducer: { auth: authReducer },
  preloadedState: { auth },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(
    () => (next) => (action) => {
      actionTypes.push(action.type);
      return next(action);
    },
  ),
});

const createAuthenticatedStore = (actionTypes) => {
  localStorage.setItem('token', authenticatedState.token);
  localStorage.setItem('user', JSON.stringify(authenticatedState.user));
  return createTestStore({ auth: authenticatedState, actionTypes });
};

const renderReset = ({
  initialEntry = `/reset-password?token=${validToken}`,
  store = createTestStore(),
  strictMode = false,
} = {}) => {
  const application = (
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/login" element={<Login />} />
        <Route path="/shop" element={<div>Shop destination</div>} />
      </Routes>
    </MemoryRouter>
  );
  return {
    store,
    ...render(
      <Provider store={store}>
        {strictMode ? <StrictMode>{application}</StrictMode> : application}
      </Provider>,
    ),
  };
};

const renderValidReset = (options) => renderReset(options);

const fillAndSubmit = () => {
  const passwordInput = screen.getByLabelText('New password');
  const confirmationInput = screen.getByLabelText('Confirm new password');
  fireEvent.change(passwordInput, { target: { value: newPassword } });
  fireEvent.change(confirmationInput, { target: { value: newPassword } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  return { passwordInput, confirmationInput };
};

describe('ResetPassword', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('rejects a missing or malformed token before showing password fields', () => {
    const store = createAuthenticatedStore();
    renderReset({ initialEntry: '/reset-password', store });

    expect(screen.getByRole('alert')).toHaveTextContent('invalid or has expired');
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login');
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    expect(store.getState().auth).toEqual(authenticatedState);
    expect(localStorage.getItem('token')).toBe(authenticatedState.token);
  });

  it('does not submit mismatched passwords', () => {
    const reset = vi.spyOn(authApi, 'resetPassword');
    renderValidReset();

    const newPasswordInput = screen.getByLabelText('New password');
    const confirmationInput = screen.getByLabelText('Confirm new password');
    expect(newPasswordInput).toHaveAttribute('name', 'newPassword');
    expect(newPasswordInput).toHaveAttribute('autocomplete', 'new-password');
    expect(newPasswordInput).toBeRequired();
    expect(confirmationInput).toHaveAttribute('name', 'confirmPassword');

    fireEvent.change(newPasswordInput, { target: { value: newPassword } });
    fireEvent.change(confirmationInput, { target: { value: 'DifferentPass!2486' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(reset).not.toHaveBeenCalled();
    expect(confirmationInput).toHaveAttribute('aria-invalid', 'true');
    expect(confirmationInput).toHaveAttribute('aria-describedby', 'confirm-password-error');
    expect(screen.getByRole('alert')).toHaveTextContent('does not match');
  });

  it.each([
    ['consumed token', 'This password reset link is invalid or has expired.'],
    ['expired or invalid token', 'This password reset link is invalid or has expired.'],
  ])('replaces the form after a %s rejection', async (_case, message) => {
    const reset = vi.spyOn(authApi, 'resetPassword').mockRejectedValue({
      response: {
        status: 400,
        data: { error: true, code: 'INVALID_RESET_TOKEN', message },
      },
    });
    const store = createAuthenticatedStore();
    renderValidReset({ store });
    const { passwordInput, confirmationInput } = fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(passwordInput).toHaveValue('');
    expect(confirmationInput).toHaveValue('');
    expect(screen.queryByTestId('reset-password-form')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new reset link' })).toHaveAttribute('href', '/forgot-password');
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login');
    expect(reset).toHaveBeenCalledTimes(1);
    expect(store.getState().auth).toEqual(authenticatedState);
    expect(localStorage.getItem('token')).toBe(authenticatedState.token);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(authenticatedState.user);
  });

  it('keeps an ordinary network failure retryable', async () => {
    const reset = vi.spyOn(authApi, 'resetPassword')
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ error: false, message: 'Password reset successful.' });
    const store = createAuthenticatedStore();
    renderValidReset({ store });
    const { passwordInput, confirmationInput } = fillAndSubmit();

    await waitFor(() => expect(reset).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Reset password' })).toBeEnabled();
    expect(passwordInput).toHaveValue(newPassword);
    expect(confirmationInput).toHaveValue(newPassword);
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to reset password');
    expect(store.getState().auth).toEqual(authenticatedState);
    expect(localStorage.getItem('token')).toBe(authenticatedState.token);

    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
    expect(await screen.findByText('Your password has been reset. You can now log in with your new password.')).toBeInTheDocument();
    expect(reset).toHaveBeenCalledTimes(2);
    expect(store.getState().auth).toEqual(loggedOutState);
  });

  it('clears stored, Redux, and API authentication only after a successful reset', async () => {
    vi.spyOn(authApi, 'resetPassword').mockResolvedValue({
      error: false,
      message: 'Password reset successful.',
    });
    const store = createAuthenticatedStore();
    renderValidReset({ store });
    fillAndSubmit();

    expect(await screen.findByText('Your password has been reset. You can now log in with your new password.')).toBeInTheDocument();
    expect(authApi.resetPassword).toHaveBeenCalledWith({
      token: validToken,
      newPassword,
      confirmPassword: newPassword,
    });
    expect(store.getState().auth).toEqual(loggedOutState);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();

    let apiRequest;
    await api.get('/api/auth/me', {
      adapter: async (config) => {
        apiRequest = config;
        return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
      },
    });
    expect(apiRequest.headers.Authorization).toBeUndefined();
    expect(screen.getByRole('link', { name: 'Go to login' })).toHaveAttribute('href', '/login');
  });

  it('opens the actual logged-out Login page after reset', async () => {
    vi.spyOn(authApi, 'resetPassword').mockResolvedValue({
      error: false,
      message: 'Password reset successful.',
    });
    const store = createAuthenticatedStore();
    renderValidReset({ store });
    fillAndSubmit();

    fireEvent.click(await screen.findByRole('link', { name: 'Go to login' }));

    expect(await screen.findByRole('heading', { name: 'Get Exclusive Access' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.queryByText('Shop destination')).not.toBeInTheDocument();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it('performs successful-reset cleanup exactly once in Strict Mode', async () => {
    const reset = vi.spyOn(authApi, 'resetPassword').mockResolvedValue({
      error: false,
      message: 'Password reset successful.',
    });
    const actionTypes = [];
    const store = createAuthenticatedStore(actionTypes);
    renderValidReset({ store, strictMode: true });
    fillAndSubmit();

    expect(await screen.findByText('Your password has been reset. You can now log in with your new password.')).toBeInTheDocument();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(actionTypes.filter((type) => type === 'auth/logout')).toHaveLength(1);
    expect(store.getState().auth).toEqual(loggedOutState);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});
