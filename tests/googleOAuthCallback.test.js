import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  buildAppBaseUrl,
  clearSupabaseAuthCallbackParams,
  isSupabaseAuthCallback,
  markOAuthCallbackHandled,
  resetOAuthCallbackHandled,
  shouldBlockRouterForOAuthCallback,
} from '../src/utils/authRedirect.js';
import {
  getOnboardingRedirectPath,
  resolveOnboardingStatus,
} from '../src/utils/onboarding.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

test.beforeEach(() => {
  resetOAuthCallbackHandled();
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

test('Google OAuth redirect uses GitHub Pages base URL without a hash route', () => {
  const authServiceSource = readSource('src/services/authService.js');

  assert.equal(
    buildAppBaseUrl(
      'https://mostafa-al-bilani.github.io',
      '/world-cup-predictor-2026/',
    ),
    'https://mostafa-al-bilani.github.io/world-cup-predictor-2026/',
  );
  assert.match(authServiceSource, /redirectTo:\s*getAppBaseUrl\(\)/);
  assert.doesNotMatch(authServiceSource, /signInWithGoogle[\s\S]*getHashRouteRedirectUrl/);
});

test('OAuth callback blocks router rendering instead of NotFound', () => {
  window.location.hash = '#access_token=abc&refresh_token=def';

  assert.equal(
    shouldBlockRouterForOAuthCallback({ loading: true, isAuthenticated: false }),
    true,
  );

  const appSource = readSource('src/App.jsx');
  assert.match(appSource, /OAuthCallbackShell/);
  assert.match(readSource('src/components/OAuthCallbackShell.jsx'), /shouldBlockRouterForOAuthCallback/);
});

test('callback parameters are not cleared before OAuth handling completes', () => {
  const authContextSource = readSource('src/context/AuthContext.jsx');

  assert.doesNotMatch(authContextSource, /clearSupabaseAuthCallbackParams/);
  assert.match(readSource('src/components/PasswordRecoveryRedirect.jsx'), /clearSupabaseAuthCallbackParams/);
});

test('new Google user reaches username onboarding after OAuth return', () => {
  const status = resolveOnboardingStatus({
    authLoading: false,
    isAuthenticated: true,
    isAdmin: false,
    profile: { id: 'user-1', username: null },
    profileQueryStatus: 'ready',
    championQueryStatus: 'ready',
    championPrediction: null,
    championPredictionsOpen: true,
    pathname: '/world-cup-predictor-2026/',
  });

  assert.equal(status.status, 'username_required');
  assert.equal(getOnboardingRedirectPath(status), '/setup-username');
});

test('existing Google user with username reaches matches destination', () => {
  const status = resolveOnboardingStatus({
    authLoading: false,
    isAuthenticated: true,
    isAdmin: false,
    profile: { id: 'user-1', username: 'player1' },
    profileQueryStatus: 'ready',
    championQueryStatus: 'ready',
    championPrediction: {
      id: 'pick-1',
      predicted_team: 'Argentina',
      locked_at: '2026-06-01T00:00:00.000Z',
    },
    championPredictionsOpen: true,
    pathname: '/world-cup-predictor-2026/',
  });

  assert.equal(status.status, 'complete');
  assert.equal(getOnboardingRedirectPath(status), null);
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
    pathname: '/world-cup-predictor-2026/',
  });

  assert.equal(status.status, 'champion_required');
  assert.equal(getOnboardingRedirectPath(status), '/champion-pick');
});

test('React StrictMode does not process OAuth callback twice', () => {
  const redirectSource = readSource('src/components/PasswordRecoveryRedirect.jsx');

  assert.match(redirectSource, /oauthHandledRef/);
  assert.match(redirectSource, /if \(oauthHandledRef\.current\)/);
});

test('GitHub Pages production base path is preserved for OAuth return', () => {
  assert.equal(
    buildAppBaseUrl('http://localhost:5173', '/'),
    'http://localhost:5173/',
  );
  assert.equal(
    buildAppBaseUrl(
      'https://mostafa-al-bilani.github.io',
      '/world-cup-predictor-2026/',
    ),
    'https://mostafa-al-bilani.github.io/world-cup-predictor-2026/',
  );
});

test('clears OAuth callback params only after explicit handling', () => {
  window.location.hash = '#access_token=abc&refresh_token=def';
  assert.equal(isSupabaseAuthCallback(), true);

  clearSupabaseAuthCallbackParams();

  assert.equal(window.location.hash, '');
  assert.equal(isSupabaseAuthCallback(), false);
});

test('router unblocks after OAuth callback is marked handled', () => {
  window.location.hash = '#access_token=abc&refresh_token=def';
  markOAuthCallbackHandled();

  assert.equal(
    shouldBlockRouterForOAuthCallback({ loading: false, isAuthenticated: true }),
    false,
  );
});
