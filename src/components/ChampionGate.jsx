import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { shouldPromptForChampionPrediction } from '../utils/championGate';
import { getSafeErrorMessage } from '../utils/errors';

export function ChampionGate() {
  const {
    championPrediction,
    championPredictionsOpen,
    championQueryError,
    championQueryStatus,
    isAdmin,
    isAuthenticated,
    loading,
    refreshChampionPrediction,
  } = useAuth();
  const location = useLocation();

  if (
    shouldPromptForChampionPrediction({
      authLoading: loading,
      isAuthenticated,
      isAdmin,
      queryStatus: championQueryStatus,
      championPrediction,
      predictionsOpen: championPredictionsOpen,
      pathname: location.pathname,
    })
  ) {
    return <Navigate to="/champion-pick" replace state={{ from: location.pathname }} />;
  }

  if (
    !loading &&
    isAuthenticated &&
    !isAdmin &&
    championQueryStatus === 'error' &&
    !championPrediction
  ) {
    return (
      <div
        className="fixed inset-x-4 top-4 z-50 mx-auto max-w-xl rounded-lg border border-rose-300/30 bg-slate-950/95 p-4 shadow-2xl backdrop-blur"
        role="alert"
      >
        <p className="text-sm font-bold text-rose-100">
          Could not verify your champion prediction.
        </p>
        <p className="mt-2 text-sm text-slate-300">
          {getSafeErrorMessage(
            championQueryError,
            'Check your connection and try again.',
          )}
        </p>
        <button
          type="button"
          onClick={() => {
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
