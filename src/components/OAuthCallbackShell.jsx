import { LoadingSpinner } from './LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { shouldBlockRouterForOAuthCallback } from '../utils/authRedirect';

export function OAuthCallbackShell({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const blockRouter = shouldBlockRouterForOAuthCallback({
    loading,
    isAuthenticated,
  });

  if (blockRouter) {
    return <LoadingSpinner label="Signing in" />;
  }

  return children;
}
