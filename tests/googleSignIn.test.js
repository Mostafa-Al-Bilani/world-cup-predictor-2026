import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

test('login and register forms include Continue with Google', () => {
  const authForm = readSource('src/components/AuthForm.jsx');
  const googleButton = readSource('src/components/GoogleSignInButton.jsx');

  assert.match(authForm, /GoogleSignInButton/);
  assert.match(authForm, /AuthDivider/);
  assert.match(googleButton, /Continue with Google/);
  assert.match(authForm, /redirectPath=\{isRegister \? '\/register' : '\/login'\}/);
});

test('Google sign-in button prevents repeated clicks while OAuth starts', () => {
  const googleButton = readSource('src/components/GoogleSignInButton.jsx');

  assert.match(googleButton, /if \(loading \|\| isDemoMode\) return/);
  assert.match(googleButton, /disabled=\{loading \|\| isDemoMode\}/);
  assert.match(googleButton, /Connecting to Google/);
  assert.match(googleButton, /getSafeErrorMessage/);
});

test('authService calls signInWithOAuth with google provider and hash redirect', () => {
  const authServiceSource = readSource('src/services/authService.js');

  assert.match(authServiceSource, /signInWithOAuth\(\{/);
  assert.match(authServiceSource, /provider:\s*'google'/);
  assert.match(authServiceSource, /redirectTo:\s*getHashRouteRedirectUrl\(redirectPath\)/);
});

test('profile creation uses idempotent ensure_user_profile RPC', () => {
  const profileServiceSource = readSource('src/services/profileService.js');
  const migrationSource = readSource(
    'supabase/migrations/20260616120000_google_oauth_onboarding.sql',
  );

  assert.match(profileServiceSource, /ensure_user_profile/);
  assert.match(migrationSource, /on conflict \(id\) do nothing/);
  assert.match(migrationSource, /set_profile_username/);
});

test('AuthContext guards duplicate sync work with version refs', () => {
  const authContextSource = readSource('src/context/AuthContext.jsx');

  assert.match(authContextSource, /championSyncVersionRef/);
  assert.match(authContextSource, /authSyncVersionRef/);
  assert.match(authContextSource, /subscription\.unsubscribe/);
});

test('existing username is preserved by set_profile_username guard', () => {
  const migrationSource = readSource(
    'supabase/migrations/20260616120000_google_oauth_onboarding.sql',
  );

  assert.match(migrationSource, /Username is already set/);
  assert.match(migrationSource, /username is null or trim\(username\) = ''/);
});
