import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import authReducer from '../store/auth';
import ProtectedRoute from './ProtectedRoute';

const renderRoute = (auth) => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/private" element={<ProtectedRoute><div>Private page</div></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
};

describe('ProtectedRoute', () => {
  it('shows an accessible status while authentication initializes', () => {
    renderRoute({ user: null, token: 'header.payload.signature', isAuthenticated: false, isInitializing: true });
    expect(screen.getByRole('status')).toHaveTextContent('Verifying your session');
    expect(screen.queryByText('Login page')).not.toBeInTheDocument();
  });

  it('redirects an unauthenticated visitor', () => {
    renderRoute({ user: null, token: null, isAuthenticated: false, isInitializing: false });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders protected content only for a confirmed session', () => {
    renderRoute({ user: { id: '1' }, token: 'header.payload.signature', isAuthenticated: true, isInitializing: false });
    expect(screen.getByText('Private page')).toBeInTheDocument();
  });
});
