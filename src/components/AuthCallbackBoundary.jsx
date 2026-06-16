import { LoadingSpinner } from './LoadingSpinner';
import { AuthCallbackErrorPanel } from './AuthCallbackErrorPanel';
import { useAuth } from '../context/AuthContext';

export function AuthCallbackBoundary({ children }) {
  const {
    authCallbackProcessing,
    authCallbackError,
    dismissAuthCallbackError,
  } = useAuth();

  if (authCallbackError) {
    return (
      <AuthCallbackErrorPanel
        error={authCallbackError}
        onReturnToLogin={() => dismissAuthCallbackError('/login')}
        onReturnHome={() => dismissAuthCallbackError('/')}
      />
    );
  }

  if (authCallbackProcessing) {
    return <LoadingSpinner label="Completing sign-in…" />;
  }

  return children;
}
