import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import authReducer from '../store/auth';
import ProtectedRoute from './ProtectedRoute';

function LoginDestination() {
  const location = useLocation();
  return (
    <>
      <div>Login page</div>
      <div data-testid="preserved-destination">{`${location.state?.from?.pathname || ''}${location.state?.from?.search || ''}${location.state?.from?.hash || ''}`}</div>
    </>
  );
}

const renderRoute = (auth) => {
  const store = configureStore({ reducer: { auth: authReducer }, preloadedState: { auth } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/private?step=review#total']}>
        <Routes>
          <Route path="/login" element={<LoginDestination />} />
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
    expect(screen.getByTestId('preserved-destination')).toHaveTextContent('/private?step=review#total');
  });

  it('renders protected content only for a confirmed session', () => {
    renderRoute({ user: { id: '1' }, token: 'header.payload.signature', isAuthenticated: true, isInitializing: false });
    expect(screen.getByText('Private page')).toBeInTheDocument();
  });
});
