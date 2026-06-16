import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSafeErrorMessage } from '../utils/errors';
import {
  getOnboardingRedirectPath,
  resolveOnboardingDestination,
  resolveOnboardingStatus,
  shouldBlockAppRoute,
} from '../utils/onboarding';

export function OnboardingGate() {
  const {
    championPrediction,
    championPredictionsOpen,
    championQueryError,
    championQueryStatus,
    isAdmin,
    isAuthenticated,
    loading,
    profile,
    profileQueryError,
    profileQueryStatus,
    refreshChampionPrediction,
    refreshProfile,
  } = useAuth();
  const location = useLocation();

  const onboardingStatus = resolveOnboardingStatus({
    authLoading: loading,
    isAuthenticated,
    isAdmin,
    profile,
    profileQueryStatus,
    profileQueryError,
    championQueryStatus,
    championPrediction,
    championPredictionsOpen,
    pathname: location.pathname,
  });

  const redirectPath = getOnboardingRedirectPath(onboardingStatus);

  if (
    redirectPath &&
    shouldBlockAppRoute({
      onboardingStatus,
      pathname: location.pathname,
    })
  ) {
    return (
      <Navigate
        to={redirectPath}
        replace
        state={{
          from: resolveOnboardingDestination({ locationState: location.state }),
        }}
      />
    );
  }

  if (
    !loading &&
    isAuthenticated &&
    !isAdmin &&
    onboardingStatus.status === 'error'
  ) {
    const isProfileError = onboardingStatus.step === 'profile';
    const error = isProfileError ? profileQueryError : championQueryError;

    return (
      <div
        className="fixed inset-x-4 top-4 z-50 mx-auto max-w-xl rounded-lg border border-rose-300/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur"
        role="alert"
      >
        <p className="text-sm font-bold text-rose-100">
          {isProfileError
            ? 'Could not load your profile.'
            : 'Could not verify your champion prediction.'}
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {getSafeErrorMessage(
            error,
            'Check your connection and try again.',
          )}
        </p>
        <button
          type="button"
          onClick={() => {
            if (isProfileError) {
              refreshProfile().catch(() => undefined);
              return;
            }
            refreshChampionPrediction().catch(() => undefined);
          }}
          className="mt-4 rounded-full bg-emerald-300 px-4 py-2 text-xs font-black text-emerald-950 transition hover:bg-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
