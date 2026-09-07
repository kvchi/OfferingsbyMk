import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '../api/auth';
import ForgotPassword from './ForgotPassword';

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

describe('ForgotPassword', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('submits an email and always presents the generic completion message', async () => {
    vi.spyOn(authApi, 'requestPasswordReset').mockResolvedValue({
      error: false,
      message: 'If an eligible account exists for that email, password reset instructions have been sent.',
    });
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'person@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(await screen.findByText(/If an eligible account exists/)).toBeInTheDocument();
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith('person@example.com');
  });

  it('offers a route back to login', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login');
  });

  it('associates validation with the labeled email field', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    const email = screen.getByLabelText('Email address');
    expect(email).toHaveAttribute('name', 'email');
    expect(email).toHaveAttribute('autocomplete', 'email');

    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reset instructions' }));

    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'forgot-email-error');
    expect(screen.getByRole('alert')).toHaveTextContent('valid email');
  });
});
