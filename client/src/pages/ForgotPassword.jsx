import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TbMailForward } from 'react-icons/tb';
import { light1 } from '../assets/images';
import { requestPasswordReset } from '../api/auth';
import ResponsiveImage from '../components/ResponsiveImage';

const GENERIC_SUCCESS = 'If an eligible account exists for that email, password reset instructions have been sent.';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      setSubmitted(true);
      toast.success(result?.message || GENERIC_SUCCESS);
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to request a password reset. Please try again.';
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden z-0 flex items-center justify-center">
        <ResponsiveImage image={light1} alt="" sizes="(max-width: 767px) 100vw, 50vw" loading="eager" fetchPriority="high" className="top-0 left-0 h-full w-full md:w-1/2 object-cover object-center filter blur-sm opacity-90" />
      </div>
      <section className="relative z-10 p-8 bg-secondary dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-auto" aria-labelledby="forgot-password-title">
        <h1 id="forgot-password-title" className="text-2xl font-bold text-center mb-3 text-primary">Forgot your password?</h1>
        <p className="mb-6 text-center text-dark/70 dark:text-secondary">
          Enter your account email and we&apos;ll send instructions if the account is eligible.
        </p>

        {submitted ? (
          <div role="status" aria-live="polite">
            <p className="mb-6 text-dark/80 dark:text-secondary">{GENERIC_SUCCESS}</p>
            <button type="button" className="min-h-11 rounded-sm py-2 text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setSubmitted(false)}>
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
            <label htmlFor="forgot-email" className="block font-medium text-dark/80 dark:text-secondary">Email address</label>
            <div className="mb-6 flex items-center gap-1 border-b p-2 dark:text-primary dark:border-primary">
              <TbMailForward aria-hidden="true" />
              <input
                id="forgot-email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setErrorMessage(''); }}
                required
                autoComplete="email"
                aria-invalid={errorMessage ? 'true' : undefined}
                aria-describedby={errorMessage ? 'forgot-email-error' : undefined}
                className="flex-1 rounded-sm bg-transparent p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-primary"
              />
            </div>
            {errorMessage && <p id="forgot-email-error" role="alert" className="mb-4 text-sm font-medium text-red-700 dark:text-red-300">{errorMessage}</p>}
            {isSubmitting && <div role="status" aria-live="polite" className="text-sm text-slate-700 dark:text-secondary">Sending reset instructions…</div>}
            <button type="submit" disabled={isSubmitting} className="min-h-11 py-2 px-6 md:px-8 bg-primary text-white rounded-md hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? 'Sending...' : 'Send reset instructions'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-dark/60 dark:text-secondary">
          <Link to="/login" className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
