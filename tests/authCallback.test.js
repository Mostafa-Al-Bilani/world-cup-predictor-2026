import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  beginCallbackProcessing,
  buildOnboardingStatusForRedirect,
  clearSupabaseAuthCallbackParams,
  endCallbackProcessing,
  getAuthCallbackErrorFromUrl,
  isSupabaseAuthCallback,
  resetCallbackProcessingClaim,
  resolvePostAuthRoute,
} from '../src/utils/authCallback.js';
import {
  buildAppBaseUrl,
  buildHashRouteRedirectUrl,
} from '../src/utils/authRedirect.js';
import {
  getOnboardingRedirectPath,
  resolveOnboardingStatus,
} from '../src/utils/onboarding.js';
import { getSafeErrorMessage } from '../src/utils/errors.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

test.beforeEach(() => {
  resetCallbackProcessingClaim();
  globalThis.window = {
    location: {
      origin: 'https://mostafa-al-bilani.github.io',
      pathname: '/world-cup-predictor-2026/',
      search: '',
      hash: '',
    },
    history: {
      replaceState(_state, _title, url) {
        const parsed = new URL(url, 'https://mostafa-al-bilani.github.io');
        window.location.pathname = parsed.pathname;
        window.location.search = parsed.search;
        window.location.hash = parsed.hash;
      },
    },
    sessionStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
  };
});

test.afterEach(() => {
  delete globalThis.window;
});

test('Google OAuth redirects to the application base URL', () => {
  const authServiceSource = readSource('src/services/authService.js');

  assert.match(authServiceSource, /redirectTo:\s*getAppBaseUrl\(\)/);
  assert.doesNotMatch(authServiceSource, /signInWithGoogle[\s\S]*getHashRouteRedirectUrl/);
});

test('email confirmation redirects to the application base URL', () => {
  const authServiceSource = readSource('src/services/authService.js');

  assert.match(
    authServiceSource,
    /getEmailConfirmationRedirectUrl\s*=\s*\(\)\s*=>\s*getAppBaseUrl\(\)/,
  );
  assert.doesNotMatch(
    authServiceSource,
    /emailRedirectTo:\s*getHashRouteRedirectUrl/,
  );
});

test('HashRouter is mounted outside the callback boundary processing state', () => {
  const appSource = readSource('src/App.jsx');

  assert.match(appSource, /AuthCallbackBoundary/);
  assert.match(appSource, /AuthCallbackBoundary[\s\S]*HashRouter/);
  assert.doesNotMatch(appSource, /OAuthCallbackShell/);
});

test('AuthCallbackBoundary blocks HashRouter while callback processing', () => {
  const boundarySource = readSource('src/components/AuthCallbackBoundary.jsx');

  assert.match(boundarySource, /authCallbackProcessing/);
  assert.match(boundarySource, /Completing sign-in/);
});

test('authentication callback does not rely on NotFound during processing', () => {
  const appSource = readSource('src/App.jsx');
  const boundarySource = readSource('src/components/AuthCallbackBoundary.jsx');

  assert.match(appSource, /AuthCallbackBoundary[\s\S]*HashRouter/);
  assert.match(boundarySource, /authCallbackProcessing/);
});

test('callback parameters remain until explicit cleanup', () => {
  window.location.hash = '#access_token=abc&refresh_token=def&type=signup';
  assert.equal(isSupabaseAuthCallback(), true);

  clearSupabaseAuthCallbackParams();

  assert.equal(window.location.hash, '');
  assert.equal(isSupabaseAuthCallback(), false);
});

test('AuthContext owns callback cleanup and navigation', () => {
  const authContextSource = readSource('src/context/AuthContext.jsx');
  const recoverySource = readSource('src/components/PasswordRecoveryRedirect.jsx');

  assert.match(authContextSource, /finishAuthCallback/);
  assert.match(authContextSource, /clearSupabaseAuthCallbackParams/);
  assert.match(authContextSource, /consumePostAuthRedirect/);
  assert.doesNotMatch(recoverySource, /clearSupabaseAuthCallbackParams/);
  assert.doesNotMatch(recoverySource, /isSupabaseAuthCallback/);
});

test('new Google user reaches username onboarding after callback', () => {
  const status = buildOnboardingStatusForRedirect({
    profile: { id: 'user-1', username: null },
    profileQueryStatus: 'ready',
    championQueryStatus: 'ready',
    championPrediction: null,
    championPredictionsOpen: true,
    isAdmin: false,
  });

  assert.equal(status.status, 'username_required');
  assert.equal(
    resolvePostAuthRoute({ onboardingStatus: status }).path,
    '/setup-username',
  );
});

test('existing Google user reaches matches after callback', () => {
  const status = buildOnboardingStatusForRedirect({
    profile: { id: 'user-1', username: 'player1' },
    profileQueryStatus: 'ready',
    championQueryStatus: 'ready',
    championPrediction: {
      id: 'pick-1',
      predicted_team: 'Argentina',
      locked_at: '2026-06-01T00:00:00.000Z',
    },
    championPredictionsOpen: true,
    isAdmin: false,
  });

  assert.equal(
    resolvePostAuthRoute({ onboardingStatus: status, returnTo: '/matches' }).path,
    '/matches',
  );
});

test('existing user without champion reaches champion onboarding when open', () => {
  const status = resolveOnboardingStatus({
    authLoading: false,
    isAuthenticated: true,
    isAdmin: false,
    profile: { id: 'user-1', username: 'player1' },
    profileQueryStatus: 'ready',
    championQueryStatus: 'ready',
    championPrediction: null,
    championPredictionsOpen: true,
    pathname: '/',
  });

  assert.equal(getOnboardingRedirectPath(status), '/champion-pick');
});

test('profile ensure path remains idempotent in services', () => {
  const profileServiceSource = readSource('src/services/profileService.js');

  assert.match(profileServiceSource, /ensure_user_profile/);
  assert.match(readSource('src/context/AuthContext.jsx'), /ensureProfile/);
});

test('confirmed email callback without session routes to login success flash', () => {
  const authContextSource = readSource('src/context/AuthContext.jsx');

  assert.match(authContextSource, /Email confirmed\. Log in to continue\./);
  assert.match(authContextSource, /consumeAuthFlash/);
});

test('unconfirmed email login still maps Supabase error safely', () => {
  assert.equal(
    getSafeErrorMessage(new Error('Email not confirmed'), 'fallback'),
    'Confirm your email before logging in.',
  );
});

test('password recovery routes to reset password after callback', () => {
  assert.equal(
    resolvePostAuthRoute({ passwordRecovery: true }).path,
    '/reset-password',
  );
});

test('callback errors are displayed safely', () => {
  window.location.hash = '#error=access_denied&error_description=User%20cancelled';
  assert.equal(getAuthCallbackErrorFromUrl(), 'Sign-in was cancelled.');

  window.location.hash = '#error=invalid_request&error_description=Email%20link%20expired';
  assert.match(getAuthCallbackErrorFromUrl(), /invalid or has expired/i);
});

test('React StrictMode callback claim prevents duplicate processing', () => {
  assert.equal(beginCallbackProcessing(), true);
  assert.equal(beginCallbackProcessing(), false);
  endCallbackProcessing();
  assert.equal(beginCallbackProcessing(), true);
});

test('GitHub Pages production base path is preserved', () => {
  assert.equal(
    buildAppBaseUrl(
      'https://mostafa-al-bilani.github.io',
      '/world-cup-predictor-2026/',
    ),
    'https://mostafa-al-bilani.github.io/world-cup-predictor-2026/',
  );
  assert.equal(
    buildHashRouteRedirectUrl(
      'https://mostafa-al-bilani.github.io',
      '/world-cup-predictor-2026/',
      '/login',
    ),
    'https://mostafa-al-bilani.github.io/world-cup-predictor-2026/#/login',
  );
});

test('implicit callback fragment is detected before hash routing', () => {
  window.location.hash = '#access_token=abc&refresh_token=def&type=signup';
  assert.equal(isSupabaseAuthCallback(), true);
});

test('PostAuthRedirect performs one-time internal navigation', () => {
  const postAuthSource = readSource('src/components/PostAuthRedirect.jsx');

  assert.match(postAuthSource, /consumePostAuthRedirect/);
  assert.match(postAuthSource, /handledRef/);
});

test('AuthContext handles INITIAL_SESSION SIGNED_IN PASSWORD_RECOVERY and SIGNED_OUT', () => {
  const authContextSource = readSource('src/context/AuthContext.jsx');
  const authCallbackSource = readSource('src/utils/authCallback.js');

  assert.match(authContextSource, /INITIAL_SESSION/);
  assert.match(authContextSource, /AUTH_CALLBACK_EVENTS\.has\(event\)/);
  assert.match(authCallbackSource, /'SIGNED_IN'/);
  assert.match(authContextSource, /PASSWORD_RECOVERY/);
  assert.match(authContextSource, /SIGNED_OUT/);
});
