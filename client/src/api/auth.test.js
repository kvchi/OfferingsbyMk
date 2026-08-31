import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from './client';
import { requestPasswordReset, resetPassword } from './auth';

describe('password reset API', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('requests reset instructions using only the email address', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { error: false, message: 'Instructions sent.' } });

    await expect(requestPasswordReset('person@example.com')).resolves.toEqual({
      error: false,
      message: 'Instructions sent.',
    });
    expect(api.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
      email: 'person@example.com',
    });
  });

  it('submits the token and matching password fields', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { error: false, message: 'Password reset.' } });
    const payload = {
      token: 'a'.repeat(64),
      newPassword: 'UpdatedPass!2486',
      confirmPassword: 'UpdatedPass!2486',
    };

    await resetPassword(payload);

    expect(api.post).toHaveBeenCalledWith('/api/auth/reset-password', payload);
  });
});
