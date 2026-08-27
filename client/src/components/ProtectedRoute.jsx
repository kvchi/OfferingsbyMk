import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ children }) {
  const isAuthenticated = useSelector((store) => store.auth.isAuthenticated);
  const isInitializing = useSelector((store) => store.auth.isInitializing);
  const location = useLocation();

  if (isInitializing) {
    return (
      <div role="status" aria-live="polite" className="min-h-[40vh] flex items-center justify-center text-primary">
        Verifying your session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
