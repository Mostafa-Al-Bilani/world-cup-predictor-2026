import { LoadingSpinner } from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';

export function AuthCallbackBoundary({ children }) {
  const { authCallbackProcessing } = useAuth();

  if (authCallbackProcessing) {
    return <LoadingSpinner label="Completing sign-in…" />;
  }

  return children;
}
