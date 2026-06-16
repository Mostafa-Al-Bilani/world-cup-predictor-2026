import { shouldPromptForChampionPrediction } from './championGate.js';

export const ONBOARDING_ALLOWED_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/setup-username',
  '/champion-pick',
]);

export const ONBOARDING_BLOCKED_DESTINATIONS = new Set([
  '/login',
  '/register',
  '/setup-username',
  '/champion-pick',
  '/forgot-password',
  '/reset-password',
]);

export function normalizeOnboardingPath(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;

  const pathOnly = trimmed.split(/[?#]/)[0];
  if (!pathOnly) return null;

  return pathOnly;
}

export function resolveOnboardingDestination({
  locationState = null,
  oauthReturnTo = null,
} = {}) {
  for (const candidate of [locationState?.from, oauthReturnTo, '/matches']) {
    const path = normalizeOnboardingPath(candidate);
    if (path && !ONBOARDING_BLOCKED_DESTINATIONS.has(path)) {
      return path;
    }
  }

  return '/matches';
}

export function isOnboardingComplete(onboardingStatus) {
  return onboardingStatus?.status === 'complete';
}

export function isUsernameComplete(profile) {
  return Boolean(String(profile?.username ?? '').trim());
}

export function isDuplicateUsernameError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return message.includes('username is already taken') || message.includes('duplicate key');
}

export function resolveOnboardingStatus({
  authLoading,
  isAuthenticated,
  isAdmin,
  profile,
  profileQueryStatus,
  profileQueryError,
  championQueryStatus,
  championPrediction,
  championPredictionsOpen,
  pathname,
}) {
  if (authLoading) {
    return { status: 'loading' };
  }

  if (!isAuthenticated) {
    return { status: 'complete' };
  }

  if (isAdmin) {
    return { status: 'complete' };
  }

  if (profileQueryStatus === 'loading' || profileQueryStatus === 'idle') {
    return { status: 'loading' };
  }

  if (profileQueryStatus === 'error') {
    return {
      status: 'error',
      step: 'profile',
      error: profileQueryError,
    };
  }

  if (!profile) {
    return { status: 'profile_required' };
  }

  if (!isUsernameComplete(profile)) {
    return { status: 'username_required' };
  }

  if (
    championQueryStatus === 'loading' ||
    championQueryStatus === 'idle'
  ) {
    return { status: 'loading' };
  }

  if (championQueryStatus === 'error') {
    return {
      status: 'error',
      step: 'champion',
    };
  }

  if (
    shouldPromptForChampionPrediction({
      authLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      queryStatus: championQueryStatus,
      championPrediction,
      predictionsOpen: championPredictionsOpen,
      pathname,
      usernameComplete: true,
    })
  ) {
    return { status: 'champion_required' };
  }

  return { status: 'complete' };
}

export function getOnboardingRedirectPath(onboardingStatus) {
  switch (onboardingStatus.status) {
    case 'profile_required':
    case 'username_required':
      return '/setup-username';
    case 'champion_required':
      return '/champion-pick';
    default:
      return null;
  }
}

export function shouldBlockAppRoute({
  onboardingStatus,
  pathname,
  allowedPaths = ONBOARDING_ALLOWED_PATHS,
}) {
  if (allowedPaths.has(pathname)) return false;
  return onboardingStatus.status === 'username_required'
    || onboardingStatus.status === 'champion_required'
    || onboardingStatus.status === 'profile_required';
}
