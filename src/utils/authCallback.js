import {
  getOnboardingRedirectPath,
  resolveOnboardingStatus,
} from './onboarding.js';

const AUTH_CALLBACK_MARKERS = [
  'access_token',
  'refresh_token',
  'token_hash',
  'type',
  'code',
  'error',
  'error_code',
  'error_description',
];

const AUTH_CALLBACK_PARAM = new RegExp(
  `(?:^|[?#/&])(${AUTH_CALLBACK_MARKERS.join('|')})=`,
  'i',
);

const AUTH_CALLBACK_CLEANUP_PARAM = new RegExp(
  `[#&?](${AUTH_CALLBACK_MARKERS.join('|')})=[^&#]*`,
  'gi',
);

const SENSITIVE_AUTH_VALUE =
  /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g;

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

  return AUTH_CALLBACK_PARAM.test(rawHash) || AUTH_CALLBACK_PARAM.test(rawSearch);
}

function parseAuthParams(source = '') {
  const normalized = source.startsWith('#')
    ? source.slice(1)
    : source.startsWith('?')
      ? source.slice(1)
      : source;

  return new URLSearchParams(normalized);
}

function readAuthCallbackParams(location = globalThis.window?.location) {
  const merged = new URLSearchParams();

  if (!location) return merged;

  for (const source of [location.search, location.hash]) {
    if (!source) continue;

    const params = parseAuthParams(source);
    for (const [key, value] of params.entries()) {
      if (!merged.has(key)) {
        merged.set(key, value);
      }
    }
  }

  return merged;
}

export function sanitizeAuthDiagnosticText(value) {
  if (value == null) return '';

  return String(value)
    .replace(SENSITIVE_AUTH_VALUE, '[redacted]')
    .replace(
      /\b(access_token|refresh_token|token_hash|authorization_code|code)=([^\s&#]+)/gi,
      '$1=[redacted]',
    )
    .trim();
}

export function resolveAuthCallbackFailure({
  error = null,
  errorCode = null,
  errorDescription = null,
} = {}) {
  const safeError = sanitizeAuthDiagnosticText(error);
  const safeCode = sanitizeAuthDiagnosticText(errorCode);
  const safeDescription = sanitizeAuthDiagnosticText(errorDescription);
  const combined = `${safeError} ${safeCode} ${safeDescription}`.toLowerCase();
  const code = safeCode || safeError || 'auth_callback_failed';

  if (/access_denied|cancel/.test(combined)) {
    return {
      code,
      message: 'Sign-in was cancelled.',
      hint: null,
    };
  }

  if (/database error saving new user|database error|saving new user/.test(combined)) {
    return {
      code: safeCode || 'database_error_saving_new_user',
      message: 'Google sign-in failed while creating your account in Supabase.',
      hint:
        'Apply supabase/migrations/20260616120000_google_oauth_onboarding.sql in the production Supabase SQL editor. The profiles.username column must allow NULL and handle_new_user must leave Google usernames empty until onboarding.',
    };
  }

  if (
    /invalid.?grant|bad.?oauth|oauth|code exchange|invalid_client|unauthorized_client|redirect_uri_mismatch|client_id|client_secret/.test(
      combined,
    )
  ) {
    return {
      code: safeCode || 'oauth_exchange_failed',
      message: 'Google sign-in could not be completed during the OAuth code exchange.',
      hint:
        'Verify the Google Client ID, matching client secret, and the exact Supabase callback URI (https://<project-ref>.supabase.co/auth/v1/callback) in Google Cloud Console and Supabase Authentication → Providers → Google.',
    };
  }

  if (/expired|invalid|otp|used|already/.test(combined)) {
    return {
      code,
      message: 'This sign-in link is invalid or has expired. Request a new one.',
      hint: safeDescription || null,
    };
  }

  if (/identity|already registered|email address already|user already/.test(combined)) {
    return {
      code,
      message: 'This Google account could not be linked to an existing login.',
      hint:
        'Sign in with your original method first, then link Google from account settings if your Supabase project supports manual identity linking.',
    };
  }

  return {
    code,
    message: 'Could not complete sign-in.',
    hint: safeDescription || null,
  };
}

export function parseAuthCallbackFailure(location = globalThis.window?.location) {
  if (!location || !isSupabaseAuthCallback(location)) return null;

  const params = readAuthCallbackParams(location);
  const error = params.get('error');
  const errorCode = params.get('error_code');
  const errorDescription = params.get('error_description');

  if (!error && !errorCode && !errorDescription) {
    return null;
  }

  return resolveAuthCallbackFailure({
    error,
    errorCode,
    errorDescription,
  });
}

export function getAuthCallbackErrorFromUrl(location = globalThis.window?.location) {
  const failure = parseAuthCallbackFailure(location);
  return failure?.message ?? null;
}

export function clearSupabaseAuthCallbackParams(location = globalThis.window?.location) {
  const history = globalThis.window?.history;
  if (!location || typeof history?.replaceState !== 'function') return false;

  const rawHash = location.hash || '';
  const rawSearch = location.search || '';
  const hadCallback = isSupabaseAuthCallback(location);

  if (!hadCallback) return false;

  const cleanedHash = rawHash
    .replace(AUTH_CALLBACK_CLEANUP_PARAM, '')
    .replace(/^#&/, '#')
    .replace(/^#$/, '');

  const cleanedSearch = rawSearch
    .replace(
      new RegExp(`[?&](${AUTH_CALLBACK_MARKERS.join('|')})=[^&#]*`, 'gi'),
      '',
    )
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
