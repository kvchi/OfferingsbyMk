import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import PhoneNumberInput from 'react-phone-number-input';
import flags from 'react-phone-number-input/flags';
import 'react-phone-number-input/style.css';
import { IoEyeOffOutline, IoEyeOutline } from 'react-icons/io5';
import api from '../api/client';
import { light1 } from '../assets/images';
import ResponsiveImage from '../components/ResponsiveImage';
import { setAuth } from '../store/auth';
import { createSignupPayload } from '../utils/authPayload.mjs';

export const getLoginDestination = (from) => {
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '';
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return '/shop';
  const search = typeof from?.search === 'string' && from.search.startsWith('?') ? from.search : '';
  const hash = typeof from?.hash === 'string' && from.hash.startsWith('#') ? from.hash : '';
  return `${pathname}${search}${hash}`;
};

const inputClass = 'w-full rounded-md border border-slate-400 bg-white px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-500 dark:bg-gray-900 dark:text-white';
const buttonClass = 'min-h-11 rounded-md bg-primary px-6 py-2 font-semibold text-white hover:bg-yellow-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60';

function FieldError({ id, children }) {
  if (!children) return null;
  return <p id={id} role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">{children}</p>;
}

function PasswordField({ id, label, controlLabel, name, autoComplete, value, onChange, visible, onToggle, error }) {
  const errorId = `${id}-error`;
  return (
    <div>
      <label htmlFor={id} className="block font-medium text-slate-800 dark:text-secondary">{label}</label>
      <div className="mt-1 flex items-center gap-2">
        <input id={id} name={name} type={visible ? 'text' : 'password'} value={value} onChange={onChange} required minLength={8} maxLength={72} autoComplete={autoComplete} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? errorId : undefined} className={inputClass} />
        <button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${controlLabel}`} aria-pressed={visible} onClick={onToggle} className="min-h-11 min-w-11 rounded-md border border-slate-400 p-2 text-xl text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-primary">
          {visible ? <IoEyeOffOutline aria-hidden="true" /> : <IoEyeOutline aria-hidden="true" />}
        </button>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

export default function Login() {
  const [showLogin, setShowLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({ login: false, signup: false, confirm: false });
  const [loginErrors, setLoginErrors] = useState({});
  const [signupErrors, setSignupErrors] = useState({});
  const [formMessage, setFormMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputs, setInputs] = useState({ firstname: '', lastname: '', phone: '', email: '', password: '', confirm_password: '' });
  const modeHeadingRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((store) => store.auth.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) navigate(getLoginDestination(location.state?.from), { replace: true });
  }, [isAuthenticated, navigate, location.state]);

  const focusModeHeading = () => window.requestAnimationFrame(() => modeHeadingRef.current?.focus());
  const switchMode = (loginMode) => {
    if (isSubmitting) return;
    setShowLogin(loginMode);
    setLoginErrors({});
    setSignupErrors({});
    setFormMessage(null);
    focusModeHeading();
  };
  const togglePassword = (field) => setVisiblePasswords((current) => ({ ...current, [field]: !current[field] }));
  const handleSignupChange = (event) => {
    const { name, value } = event.target;
    setInputs((current) => ({ ...current, [name]: value }));
    setSignupErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const errors = {};
    if (!inputs.firstname.trim()) errors.firstname = 'Enter your first name.';
    if (!inputs.lastname.trim()) errors.lastname = 'Enter your last name.';
    if (!/^\S+@\S+\.\S+$/.test(inputs.email.trim())) errors.email = 'Enter a valid email address.';
    if (inputs.password.length < 8 || inputs.password.length > 72) errors.password = 'Password must contain between 8 and 72 characters.';
    if (inputs.password !== inputs.confirm_password) errors.confirm_password = 'Password confirmation does not match.';
    if (Object.keys(errors).length) {
      setSignupErrors(errors);
      setFormMessage({ type: 'error', text: 'Check the highlighted fields and try again.' });
      return;
    }
    setIsSubmitting(true);
    setFormMessage(null);
    toast.loading('Creating your account, please wait...', { id: 'auth-request' });
    try {
      const { data } = await api.post('/api/auth/signup', createSignupPayload(inputs));
      const successMessage = `${data.message} Please log in.`;
      setEmail(inputs.email);
      setInputs({ firstname: '', lastname: '', phone: '', email: '', password: '', confirm_password: '' });
      setVisiblePasswords({ login: false, signup: false, confirm: false });
      setShowLogin(true);
      setFormMessage({ type: 'success', text: successMessage });
      toast.success(successMessage, { id: 'auth-request' });
      focusModeHeading();
    } catch (error) {
      const message = error.response?.data?.message || 'Unable to create your account. Please try again.';
      setFormMessage({ type: 'error', text: message });
      toast.error(message, { id: 'auth-request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    const errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (password.length < 8 || password.length > 72) errors.password = 'Password must contain between 8 and 72 characters.';
    if (Object.keys(errors).length) {
      setLoginErrors(errors);
      setFormMessage({ type: 'error', text: 'Check the highlighted fields and try again.' });
      return;
    }
    setIsSubmitting(true);
    setFormMessage(null);
    toast.loading('Logging in, please wait...', { id: 'auth-request' });
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
      dispatch(setAuth({ token: data.token, user: data.user }));
      toast.success(data.message, { id: 'auth-request' });
      navigate(getLoginDestination(location.state?.from), { replace: true });
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid email or password';
      setFormMessage({ type: 'error', text: message });
      toast.error(message, { id: 'auth-request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = formMessage ? (
    <div role={formMessage.type === 'error' ? 'alert' : 'status'} aria-live={formMessage.type === 'error' ? 'assertive' : 'polite'} className={`mb-4 rounded-md border p-3 text-sm ${formMessage.type === 'error' ? 'border-red-600 text-red-800 dark:text-red-200' : 'border-green-600 text-green-800 dark:text-green-200'}`}>{formMessage.text}</div>
  ) : null;

  return (
    <main className="container mx-auto relative min-h-screen flex items-center justify-center px-4 py-8">
      <div className="absolute inset-0 overflow-hidden z-0 flex items-center justify-center">
        <ResponsiveImage image={light1} alt="" sizes="(max-width: 767px) 100vw, 50vw" loading="eager" fetchPriority="high" className="top-0 left-0 h-full w-full md:w-1/2 object-cover object-center filter blur-sm opacity-90" />
      </div>
      <section className="relative z-10 w-full max-w-md rounded-lg bg-secondary p-6 shadow-lg dark:bg-gray-800 sm:p-8" aria-labelledby="authentication-title">
        {showLogin ? (
          <form id="login-form" onSubmit={handleLogin} noValidate aria-busy={isSubmitting}>
            <h1 ref={modeHeadingRef} tabIndex="-1" id="authentication-title" className="mb-6 text-center text-2xl font-bold text-primary focus-visible:outline-none">Get Exclusive Access</h1>
            {status}
            <fieldset disabled={isSubmitting} className="space-y-5">
              <legend className="sr-only">Login details</legend>
              <div>
                <label htmlFor="login-email" className="block font-medium text-slate-800 dark:text-secondary">Email address</label>
                <input id="login-email" name="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setLoginErrors((current) => ({ ...current, email: undefined })); }} required autoComplete="email" aria-invalid={loginErrors.email ? 'true' : undefined} aria-describedby={loginErrors.email ? 'login-email-error' : undefined} className={`${inputClass} mt-1`} />
                <FieldError id="login-email-error">{loginErrors.email}</FieldError>
              </div>
              <PasswordField id="login-password" label="Password" controlLabel="login password" name="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setLoginErrors((current) => ({ ...current, password: undefined })); }} visible={visiblePasswords.login} onToggle={() => togglePassword('login')} error={loginErrors.password} />
            </fieldset>
            {isSubmitting && <div role="status" aria-live="polite" className="mt-3 text-sm text-slate-700 dark:text-secondary">Logging in…</div>}
            <button type="submit" disabled={isSubmitting} className={buttonClass}>{isSubmitting ? 'Logging in…' : 'Login'}</button>
            <p className="mt-4 text-center text-slate-700 dark:text-secondary"><Link to="/forgot-password" className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Forgot your password?</Link></p>
            <button type="button" disabled={isSubmitting} onClick={() => switchMode(false)} className="mt-3 min-h-11 w-full rounded-sm p-2 text-center text-slate-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-secondary">Don&apos;t have an account? Sign up</button>
          </form>
        ) : (
          <form id="signup-form" onSubmit={handleSignup} noValidate aria-busy={isSubmitting}>
            <h1 ref={modeHeadingRef} tabIndex="-1" id="authentication-title" className="mb-6 text-center text-2xl font-bold text-primary focus-visible:outline-none">Create your OfferingsbyMK account</h1>
            {status}
            <fieldset disabled={isSubmitting} className="space-y-4">
              <legend className="sr-only">Signup details</legend>
              {[
                ['firstname', 'First name', 'given-name'],
                ['lastname', 'Last name', 'family-name'],
                ['email', 'Email address', 'email'],
              ].map(([name, label, autoComplete]) => (
                <div key={name}>
                  <label htmlFor={`signup-${name}`} className="block font-medium text-slate-800 dark:text-secondary">{label}</label>
                  <input id={`signup-${name}`} name={name} type={name === 'email' ? 'email' : 'text'} value={inputs[name]} onChange={handleSignupChange} required autoComplete={autoComplete} aria-invalid={signupErrors[name] ? 'true' : undefined} aria-describedby={signupErrors[name] ? `signup-${name}-error` : undefined} className={`${inputClass} mt-1`} />
                  <FieldError id={`signup-${name}-error`}>{signupErrors[name]}</FieldError>
                </div>
              ))}
              <div>
                <label htmlFor="signup-phone" className="block font-medium text-slate-800 dark:text-secondary">Phone number <span className="text-sm font-normal">(optional)</span></label>
                <PhoneNumberInput id="signup-phone" name="phone" defaultCountry="NG" international countryCallingCodeEditable={false} onChange={(value) => setInputs((current) => ({ ...current, phone: value || '' }))} value={inputs.phone} flags={flags} autoComplete="tel" className={`${inputClass} mt-1`} />
              </div>
              <PasswordField id="signup-password" label="Password" controlLabel="signup password" name="password" autoComplete="new-password" value={inputs.password} onChange={handleSignupChange} visible={visiblePasswords.signup} onToggle={() => togglePassword('signup')} error={signupErrors.password} />
              <PasswordField id="signup-confirm-password" label="Confirm password" controlLabel="password confirmation" name="confirm_password" autoComplete="new-password" value={inputs.confirm_password} onChange={handleSignupChange} visible={visiblePasswords.confirm} onToggle={() => togglePassword('confirm')} error={signupErrors.confirm_password} />
            </fieldset>
            {isSubmitting && <div role="status" aria-live="polite" className="mt-3 text-sm text-slate-700 dark:text-secondary">Creating your account…</div>}
            <button type="submit" disabled={isSubmitting} className={buttonClass}>{isSubmitting ? 'Creating account…' : 'Sign up'}</button>
            <button type="button" disabled={isSubmitting} onClick={() => switchMode(true)} className="mt-3 min-h-11 w-full rounded-sm p-2 text-center text-slate-700 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-secondary">Already a member? Log in</button>
          </form>
        )}
      </section>
    </main>
  );
}
