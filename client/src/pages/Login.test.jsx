import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import authReducer from '../store/auth';
import Login from './Login';

const authenticatedState = {
  user: { id: '1' },
  token: 'header.payload.signature',
  isAuthenticated: true,
  isInitializing: false,
};

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
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

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
});
