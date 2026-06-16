import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldPromptForChampionPrediction } from '../src/utils/championGate.js';
import {
  getOnboardingRedirectPath,
  isDuplicateUsernameError,
  isUsernameComplete,
  resolveOnboardingStatus,
  shouldBlockAppRoute,
} from '../src/utils/onboarding.js';

const baseArgs = {
  authLoading: false,
  isAuthenticated: true,
  isAdmin: false,
  profile: { id: 'user-1', username: 'player1' },
  profileQueryStatus: 'ready',
  championQueryStatus: 'ready',
  championPrediction: null,
  championPredictionsOpen: true,
  pathname: '/matches',
};

test('detects incomplete usernames', () => {
  assert.equal(isUsernameComplete({ username: 'player1' }), true);
  assert.equal(isUsernameComplete({ username: '' }), false);
  assert.equal(isUsernameComplete({ username: null }), false);
  assert.equal(isUsernameComplete(null), false);
});

test('new OAuth user without username enters username onboarding', () => {
  const status = resolveOnboardingStatus({
    ...baseArgs,
    profile: { id: 'user-1', username: null },
    pathname: '/matches',
  });

  assert.equal(status.status, 'username_required');
  assert.equal(getOnboardingRedirectPath(status), '/setup-username');
});

test('Google user is prompted for champion after username setup', () => {
  const status = resolveOnboardingStatus({
    ...baseArgs,
    championPrediction: null,
    pathname: '/matches',
  });

  assert.equal(status.status, 'champion_required');
});

test('existing champion prediction skips champion onboarding', () => {
  const status = resolveOnboardingStatus({
    ...baseArgs,
    championPrediction: {
      id: 'pick-1',
      predicted_team: 'Argentina',
      locked_at: '2026-06-01T00:00:00.000Z',
    },
    pathname: '/matches',
  });

  assert.equal(status.status, 'complete');
});

test('locked predictions do not open champion onboarding', () => {
  const status = resolveOnboardingStatus({
    ...baseArgs,
    championPredictionsOpen: false,
    championPrediction: null,
    pathname: '/matches',
  });

  assert.equal(status.status, 'complete');
});

test('champion query errors do not open champion onboarding', () => {
  const status = resolveOnboardingStatus({
    ...baseArgs,
    championQueryStatus: 'error',
    pathname: '/matches',
  });

  assert.equal(status.status, 'error');
  assert.equal(
    shouldPromptForChampionPrediction({
      authLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      queryStatus: 'error',
      championPrediction: null,
      predictionsOpen: true,
      pathname: '/matches',
      usernameComplete: true,
    }),
    false,
  );
});

test('username must be complete before champion prompt', () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      authLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      queryStatus: 'ready',
      championPrediction: null,
      predictionsOpen: true,
      pathname: '/matches',
      usernameComplete: false,
    }),
    false,
  );
});

test('duplicate username errors are detected', () => {
  assert.equal(
    isDuplicateUsernameError(new Error('Username is already taken')),
    true,
  );
  assert.equal(isDuplicateUsernameError(new Error('Network error')), false);
});

test('onboarding blocks app routes until complete', () => {
  const status = { status: 'username_required' };
  assert.equal(
    shouldBlockAppRoute({ onboardingStatus: status, pathname: '/matches' }),
    true,
  );
  assert.equal(
    shouldBlockAppRoute({ onboardingStatus: status, pathname: '/setup-username' }),
    false,
  );
});

test('email registration champion is not requested again when row exists', () => {
  const status = resolveOnboardingStatus({
    ...baseArgs,
    championPrediction: {
      id: 'pick-1',
      predicted_team: 'Brazil',
      locked_at: '2026-06-01T00:00:00.000Z',
    },
    pathname: '/matches',
  });

  assert.equal(status.status, 'complete');
});

test('legacy user without champion is prompted while predictions are open', () => {
  const status = resolveOnboardingStatus({
    ...baseArgs,
    championPrediction: null,
    championPredictionsOpen: true,
    pathname: '/matches',
  });

  assert.equal(status.status, 'champion_required');
});
