import {
  getOnboardingRedirectPath,
  resolveOnboardingStatus,
} from './onboarding.js';

const AUTH_CALLBACK_PARAM =
  /(?:^|[?#/&])(access_token|refresh_token|token_hash|type|code)=/i;
const AUTH_CALLBACK_ERROR = /(?:^|[?#/&])error=/i;

let callbackProcessingClaimed = false;

export function beginCallbackProcessing() {
  if (callbackProcessingClaimed) return false;
  callbackProcessingClaimed = true;
  return true;
}

export function endCallbackProcessing() {
  callbackProcessingClaimed = false;
}

export function resetCallbackProcessingClaim() {
  callbackProcessingClaimed = false;
}

export function isSupabaseAuthCallback(location = globalThis.window?.location) {
  if (!location) return false;

  const rawHash = location.hash || '';
  const rawSearch = location.search || '';

  return (
    AUTH_CALLBACK_PARAM.test(rawHash) ||
    AUTH_CALLBACK_PARAM.test(rawSearch) ||
    AUTH_CALLBACK_ERROR.test(rawHash) ||
    AUTH_CALLBACK_ERROR.test(rawSearch)
  );
}

function parseAuthParams(source = '') {
  const normalized = source.startsWith('#')
    ? source.slice(1)
    : source.startsWith('?')
      ? source.slice(1)
      : source;

  return new URLSearchParams(normalized);
}

export function getAuthCallbackErrorFromUrl(location = globalThis.window?.location) {
  if (!location) return null;

  for (const source of [location.hash, location.search]) {
    if (!source) continue;

    const params = parseAuthParams(source);
    const error = params.get('error');
    if (!error) continue;

    const description = String(params.get('error_description') ?? '');
    const combined = `${error} ${description}`.toLowerCase();

    if (/access_denied|cancel/.test(combined)) {
      return 'Sign-in was cancelled.';
    }

    if (/expired|invalid|otp|used|already/.test(combined)) {
      return 'This sign-in link is invalid or has expired. Request a new one.';
    }

    return 'Could not complete sign-in. Try again.';
  }

  return null;
}

export function clearSupabaseAuthCallbackParams(location = globalThis.window?.location) {
  const history = globalThis.window?.history;
  if (!location || typeof history?.replaceState !== 'function') return false;

  const rawHash = location.hash || '';
  const rawSearch = location.search || '';
  const hadCallback = isSupabaseAuthCallback(location);

  if (!hadCallback) return false;

  const cleanedHash = rawHash
    .replace(/[#&?](access_token|refresh_token|token_hash|type|code|error|error_description)=[^&#]*/gi, '')
    .replace(/^#&/, '#')
    .replace(/^#$/, '');

  const cleanedSearch = rawSearch
    .replace(/[?&](access_token|refresh_token|token_hash|type|code|error|error_description)=[^&#]*/gi, '')
    .replace(/^\?$/, '');

  const nextHash = cleanedHash && /^#\/.+/.test(cleanedHash) ? cleanedHash : '';
  const nextUrl = `${location.pathname}${cleanedSearch}${nextHash}`;
  const pageTitle = typeof document !== 'undefined' ? document.title : '';

  history.replaceState({}, pageTitle, nextUrl);
  location.hash = nextHash;
  location.search = cleanedSearch;
  return true;
}

export function resolvePostAuthRoute({
  passwordRecovery = false,
  onboardingStatus,
  returnTo = null,
} = {}) {
  if (passwordRecovery) {
    return { path: '/reset-password', state: {} };
  }

  const onboardingPath = getOnboardingRedirectPath(onboardingStatus);
  if (onboardingPath) {
    return {
      path: onboardingPath,
      state: { from: returnTo ?? '/matches' },
    };
  }

  return {
    path: returnTo ?? '/matches',
    state: {},
  };
}

export function buildOnboardingStatusForRedirect({
  profile,
  profileQueryStatus,
  championQueryStatus,
  championPrediction,
  championPredictionsOpen,
  isAdmin,
}) {
  return resolveOnboardingStatus({
    authLoading: false,
    isAuthenticated: true,
    isAdmin,
    profile,
    profileQueryStatus,
    championQueryStatus,
    championPrediction,
    championPredictionsOpen,
    pathname: '/',
  });
}

export const AUTH_CALLBACK_EVENTS = new Set([
  'INITIAL_SESSION',
  'SIGNED_IN',
  'PASSWORD_RECOVERY',
]);
