import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TbMailForward } from 'react-icons/tb';
import { light1 } from '../assets/images';
import { requestPasswordReset } from '../api/auth';

const GENERIC_SUCCESS = 'If an eligible account exists for that email, password reset instructions have been sent.';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(email);
      setSubmitted(true);
      toast.success(result?.message || GENERIC_SUCCESS);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to request a password reset. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="container mx-auto relative min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden z-0 flex items-center justify-center">
        <img src={light1} alt="" className="top-0 left-0 h-full w-full md:w-1/2 object-cover object-center filter blur-sm opacity-90" />
      </div>
      <section className="relative z-10 p-8 bg-secondary dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-auto" aria-labelledby="forgot-password-title">
        <h1 id="forgot-password-title" className="text-2xl font-bold text-center mb-3 text-primary">Forgot your password?</h1>
        <p className="mb-6 text-center text-dark/70 dark:text-secondary">
          Enter your account email and we&apos;ll send instructions if the account is eligible.
        </p>

        {submitted ? (
          <div role="status" aria-live="polite">
            <p className="mb-6 text-dark/80 dark:text-secondary">{GENERIC_SUCCESS}</p>
            <button type="button" className="text-primary underline" onClick={() => setSubmitted(false)}>
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label htmlFor="forgot-email" className="block font-medium text-dark/80 dark:text-secondary">Email address</label>
            <div className="mb-6 flex items-center gap-1 border-b p-2 dark:text-primary dark:border-primary">
              <TbMailForward aria-hidden="true" />
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="Email@email.com"
                className="flex-1 p-1 dark:text-primary bg-transparent outline-none"
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="py-2 px-6 md:px-8 bg-primary text-white rounded-md hover:bg-yellow-600 disabled:opacity-60">
              {isSubmitting ? 'Sending...' : 'Send reset instructions'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-dark/60 dark:text-secondary">
          <Link to="/login" className="underline">Back to login</Link>
        </p>
      </section>
    </main>
  );
}
