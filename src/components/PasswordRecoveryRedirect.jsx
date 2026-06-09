import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const isSupabaseAuthCallback = (location) => {
  const rawHash = window.location.hash;
  const rawSearch = window.location.search;
  const routeText = `${location.pathname}${location.search}`;

  return (
    /(?:^|[?#/&])(access_token|refresh_token|token_hash|type|code)=/i.test(rawHash) ||
    /(?:^|[?&])(access_token|refresh_token|token_hash|type|code)=/i.test(rawSearch) ||
    /^\/?(access_token|refresh_token|token_hash|type|code)=/i.test(routeText)
  );
};

export function PasswordRecoveryRedirect() {
  const { championPrediction, isAdmin, isAuthenticated, loading, passwordRecovery } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (passwordRecovery && location.pathname !== '/reset-password') {
      navigate('/reset-password', { replace: true });
    }

    if (loading || passwordRecovery || !isSupabaseAuthCallback(location)) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (!isAdmin && !championPrediction) {
      navigate('/champion-pick', { replace: true });
      return;
    }

    navigate('/matches', { replace: true });
  }, [championPrediction, isAdmin, isAuthenticated, loading, location, navigate, passwordRecovery]);

  return null;
}
