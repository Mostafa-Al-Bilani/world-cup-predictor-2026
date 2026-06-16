export const CHAMPION_GATE_ALLOWED_PATHS = new Set([
  '/champion-pick',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]);

export function shouldPromptForChampionPrediction({
  authLoading,
  isAuthenticated,
  isAdmin,
  queryStatus,
  championPrediction,
  predictionsOpen,
  pathname,
  allowedPaths = CHAMPION_GATE_ALLOWED_PATHS,
}) {
  if (authLoading) return false;
  if (!isAuthenticated) return false;
  if (isAdmin) return false;
  if (allowedPaths.has(pathname)) return false;
  if (queryStatus === 'loading' || queryStatus === 'idle') return false;
  if (queryStatus === 'error') return false;
  if (!predictionsOpen) return false;
  if (championPrediction) return false;
  return true;
}

export function isChampionPredictionLocked(prediction) {
  return Boolean(prediction?.locked_at);
}

export function isChampionPredictionAlreadyLockedError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return message.includes('already locked');
}
