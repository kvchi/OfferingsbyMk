import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { logout, restoreAuthentication } from '../store/auth';
import { AUTH_UNAUTHORIZED_EVENT } from '../api/client';

export default function AuthInitializer({ children }) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.auth.token);
  const isInitializing = useSelector((state) => state.auth.isInitializing);

  useEffect(() => {
    if (token && isInitializing) {
      restoreAuthentication(dispatch, token);
    }
  }, [dispatch, isInitializing, token]);

  useEffect(() => {
    const handleUnauthorized = () => dispatch(logout());
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, [dispatch]);

  if (isInitializing) {
    return (
      <main role="status" aria-live="polite" className="min-h-screen flex items-center justify-center text-primary">
        Verifying your session...
      </main>
    );
  }

  return children;
}
