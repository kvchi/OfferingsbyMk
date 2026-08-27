import React, { StrictMode } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client';
import AuthInitializer from '../components/AuthInitializer';
import authReducer, {
  logout,
  readStoredAuth,
  resetAuthenticationRestorationForTests,
  restoreAuthentication,
} from './auth';

const token = 'header.payload.signature';
const activeUser = { id: 'user-1', email: 'user@example.com', status: 'ACTIVE' };

const makeStore = (auth) => configureStore({
  reducer: { auth: authReducer },
  preloadedState: auth ? { auth } : undefined,
});

describe('authentication restoration', () => {
  beforeEach(() => {
    localStorage.clear();
    resetAuthenticationRestorationForTests();
    vi.restoreAllMocks();
  });

  it('starts unauthenticated when no token exists and removes stale user data', () => {
    localStorage.setItem('user', JSON.stringify(activeUser));
    expect(readStoredAuth()).toEqual({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('rejects malformed stored tokens without contacting the API', () => {
    localStorage.setItem('token', 'not-a-jwt');
    const get = vi.spyOn(api, 'get');
    expect(readStoredAuth().isInitializing).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it('accepts authentication only after /me confirms the user', async () => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ ...activeUser, email: 'stale@example.com' }));
    const store = makeStore(readStoredAuth());
    vi.spyOn(api, 'get').mockResolvedValue({ data: { user: activeUser } });

    expect(store.getState().auth.isAuthenticated).toBe(false);
    await restoreAuthentication(store.dispatch, token);

    expect(api.get).toHaveBeenCalledWith('/api/auth/me', expect.any(Object));
    expect(store.getState().auth).toMatchObject({ user: activeUser, token, isAuthenticated: true, isInitializing: false });
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(activeUser);
  });

  it.each([
    ['expired or rejected token', () => Promise.reject({ response: { status: 401 } })],
    ['disabled account response', () => Promise.resolve({ data: { user: { ...activeUser, status: 'DISABLED' } } })],
    ['invalid response', () => Promise.resolve({ data: { user: { email: activeUser.email } } })],
  ])('clears an %s session', async (_label, makeResponse) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(activeUser));
    const store = makeStore({ user: null, token, isAuthenticated: false, isInitializing: true });
    vi.spyOn(api, 'get').mockReturnValue(makeResponse());

    await restoreAuthentication(store.dispatch, token);

    expect(store.getState().auth).toEqual({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('cleans up storage on logout', () => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(activeUser));
    const store = makeStore({ user: activeUser, token, isAuthenticated: true, isInitializing: false });
    store.dispatch(logout());
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('does not duplicate /me requests under React Strict Mode', async () => {
    localStorage.setItem('token', token);
    let resolveRequest;
    const get = vi.spyOn(api, 'get').mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    const store = makeStore({ user: null, token, isAuthenticated: false, isInitializing: true });

    render(
      <StrictMode>
        <Provider store={store}>
          <AuthInitializer><div>Application</div></AuthInitializer>
        </Provider>
      </StrictMode>,
    );

    expect(get).toHaveBeenCalledTimes(1);
    resolveRequest({ data: { user: activeUser } });
    await waitFor(() => expect(store.getState().auth.isAuthenticated).toBe(true));
    expect(get).toHaveBeenCalledTimes(1);
  });
});
