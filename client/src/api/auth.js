import api from './client';

export const requestPasswordReset = async (email) => {
  const { data } = await api.post('/api/auth/forgot-password', { email });
  return data;
};

export const resetPassword = async ({ token, newPassword, confirmPassword }) => {
  const { data } = await api.post('/api/auth/reset-password', {
    token,
    newPassword,
    confirmPassword,
  });
  return data;
};
