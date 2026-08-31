import React, { useState } from 'react';
import { flushSync } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { RiLockPasswordLine } from 'react-icons/ri';
import { light1 } from '../assets/images';
import { resetPassword } from '../api/auth';
import { logout } from '../store/auth';
import ResponsiveImage from '../components/ResponsiveImage';

const RESET_TOKEN_PATTERN = /^[a-f0-9]{64}$/;
const INVALID_RESET_MESSAGE = 'This password reset link is invalid or has expired.';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = searchParams.get('token') || '';
  const tokenIsValid = RESET_TOKEN_PATTERN.test(token);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [tokenRejected, setTokenRejected] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (tokenRejected || completed || isSubmitting) return;
    if (newPassword.length < 8 || newPassword.length > 72) {
      toast.error('Password must contain between 8 and 72 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Password confirmation does not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await resetPassword({ token, newPassword, confirmPassword });
      dispatch(logout());
      setCompleted(true);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/reset-password', { replace: true, state: { resetComplete: true } });
      toast.success(result?.message || 'Password reset successful.');
    } catch (error) {
      if (error.response?.data?.code === 'INVALID_RESET_TOKEN') {
        flushSync(() => {
          setNewPassword('');
          setConfirmPassword('');
        });
        setTokenRejected(true);
        toast.error(INVALID_RESET_MESSAGE);
        return;
      }
      toast.error(error.response?.data?.message || 'Unable to reset password. Please request a new link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  let content;
  if (completed) {
    content = (
      <div role="status" aria-live="polite">
        <p className="mb-6 text-dark/80 dark:text-secondary">Your password has been reset. You can now log in with your new password.</p>
        <Link to="/login" className="inline-block py-2 px-6 bg-primary text-white rounded-md hover:bg-yellow-600">Go to login</Link>
      </div>
    );
  } else if (tokenRejected) {
    content = (
      <div role="alert" aria-live="assertive">
        <p className="mb-6 text-dark/80 dark:text-secondary">{INVALID_RESET_MESSAGE}</p>
        <div className="flex flex-col items-start gap-3">
          <Link to="/forgot-password" className="text-primary underline">Request a new reset link</Link>
          <Link to="/login" className="text-primary underline">Back to login</Link>
        </div>
      </div>
    );
  } else if (!tokenIsValid) {
    content = (
      <div role="alert">
        <p className="mb-6 text-dark/80 dark:text-secondary">This password reset link is invalid or incomplete.</p>
        <Link to="/forgot-password" className="text-primary underline">Request a new reset link</Link>
      </div>
    );
  } else {
    content = (
      <form data-testid="reset-password-form" onSubmit={handleSubmit}>
        <label htmlFor="new-password" className="block font-medium text-dark/80 dark:text-secondary">New password</label>
        <div className="mb-4 flex items-center gap-1 border-b p-2 dark:text-primary dark:border-primary">
          <RiLockPasswordLine aria-hidden="true" />
          <input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="flex-1 p-1 dark:text-primary bg-transparent outline-none"
          />
        </div>
        <label htmlFor="confirm-password" className="block font-medium text-dark/80 dark:text-secondary">Confirm new password</label>
        <div className="mb-6 flex items-center gap-1 border-b p-2 dark:text-primary dark:border-primary">
          <RiLockPasswordLine aria-hidden="true" />
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="flex-1 p-1 dark:text-primary bg-transparent outline-none"
          />
        </div>
        <button type="submit" disabled={isSubmitting} className="py-2 px-6 md:px-8 bg-primary text-white rounded-md hover:bg-yellow-600 disabled:opacity-60">
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>
      </form>
    );
  }

  return (
    <main className="container mx-auto relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden z-0 flex items-center justify-center">
        <ResponsiveImage image={light1} alt="" sizes="(max-width: 767px) 100vw, 50vw" loading="eager" fetchPriority="high" className="top-0 left-0 h-full w-full md:w-1/2 object-cover object-center filter blur-sm opacity-90" />
      </div>
      <section className="relative z-10 p-8 bg-secondary dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-auto" aria-labelledby="reset-password-title">
        <h1 id="reset-password-title" className="text-2xl font-bold text-center mb-6 text-primary">Choose a new password</h1>
        {content}
      </section>
    </main>
  );
}
