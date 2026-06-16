import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  clearOAuthReturnTo,
  clearSupabaseAuthCallbackParams,
  isSupabaseAuthCallback,
  readOAuthReturnTo,
} from '../utils/authRedirect';
import {
  getOnboardingRedirectPath,
  resolveOnboardingStatus,
} from '../utils/onboarding';

export function PasswordRecoveryRedirect() {
  const {
    championPrediction,
    championPredictionsOpen,
    championQueryStatus,
    isAdmin,
    isAuthenticated,
    loading,
    passwordRecovery,
    profile,
    profileQueryStatus,
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (passwordRecovery && location.pathname !== '/reset-password') {
      navigate('/reset-password', { replace: true });
      return;
    }

    if (loading || passwordRecovery || !isSupabaseAuthCallback()) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      clearSupabaseAuthCallbackParams();
      return;
    }

    const onboardingStatus = resolveOnboardingStatus({
      authLoading: false,
      isAuthenticated,
      isAdmin,
      profile,
      profileQueryStatus,
      championQueryStatus,
      championPrediction,
      championPredictionsOpen,
      pathname: location.pathname,
    });

    const onboardingPath = getOnboardingRedirectPath(onboardingStatus);
    if (onboardingPath) {
      navigate(onboardingPath, { replace: true, state: { from: readOAuthReturnTo() ?? '/matches' } });
      clearOAuthReturnTo();
      clearSupabaseAuthCallbackParams();
      return;
    }

    navigate(readOAuthReturnTo() ?? '/matches', { replace: true });
    clearOAuthReturnTo();
    clearSupabaseAuthCallbackParams();
  }, [
    championPrediction,
    championPredictionsOpen,
    championQueryStatus,
    isAdmin,
    isAuthenticated,
    loading,
    location.pathname,
    navigate,
    passwordRecovery,
    profile,
    profileQueryStatus,
  ]);

  return null;
}
