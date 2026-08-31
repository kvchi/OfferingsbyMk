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

    expect(await screen.findByRole('status')).toHaveTextContent('If an eligible account exists');
    expect(authApi.requestPasswordReset).toHaveBeenCalledWith('person@example.com');
  });

  it('offers a route back to login', () => {
    render(<MemoryRouter><ForgotPassword /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Back to login' })).toHaveAttribute('href', '/login');
  });
});
