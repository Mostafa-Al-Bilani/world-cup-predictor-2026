import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  normalizeOnboardingPath,
  resolveOnboardingDestination,
  ONBOARDING_BLOCKED_DESTINATIONS,
} from '../src/utils/onboarding.js';
import { isChampionPredictionLocked } from '../src/utils/championGate.js';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8');
}

test('resolveOnboardingDestination never returns onboarding routes', () => {
  for (const blocked of ONBOARDING_BLOCKED_DESTINATIONS) {
    assert.equal(
      resolveOnboardingDestination({ locationState: { from: blocked } }),
      '/matches',
    );
  }

  assert.equal(
    resolveOnboardingDestination({ locationState: { from: '/champion-pick' } }),
    '/matches',
  );
});

test('resolveOnboardingDestination preserves a safe intended destination', () => {
  assert.equal(
    resolveOnboardingDestination({
      locationState: { from: '/scoreboard' },
    }),
    '/scoreboard',
  );

  assert.equal(
    resolveOnboardingDestination({
      locationState: { from: '/my-predictions' },
      oauthReturnTo: '/scoreboard',
    }),
    '/my-predictions',
  );
});

test('resolveOnboardingDestination rejects malformed and external destinations', () => {
  assert.equal(
    resolveOnboardingDestination({ locationState: { from: 'https://evil.example/phish' } }),
    '/matches',
  );
  assert.equal(
    resolveOnboardingDestination({ locationState: { from: '//evil.example' } }),
    '/matches',
  );
  assert.equal(
    resolveOnboardingDestination({ locationState: { from: '' } }),
    '/matches',
  );
  assert.equal(normalizeOnboardingPath('  /bracket?tab=1  '), '/bracket');
});

test('destination is preserved across username and champion onboarding', () => {
  const usernameSource = readSource('src/pages/UsernameSetupPage.jsx');
  const championSource = readSource('src/pages/ChampionPickPage.jsx');
  const gateSource = readSource('src/components/OnboardingGate.jsx');

  assert.match(usernameSource, /resolveOnboardingDestination/);
  assert.match(
    usernameSource,
    /nextPath === '\/champion-pick'[\s\S]*state:\s*\{\s*from:\s*safeDestination\s*\}/,
  );
  assert.match(championSource, /resolveOnboardingDestination/);
  assert.match(gateSource, /resolveOnboardingDestination/);
});

test('ChampionPickPage waits for champion state before navigating after save', () => {
  const championSource = readSource('src/pages/ChampionPickPage.jsx');
  const submitBlock = championSource.match(/const submit = async[\s\S]*?^\s*\};/m)?.[0] ?? '';

  assert.match(championSource, /lockChampionPrediction/);
  assert.match(championSource, /setPendingDestination/);
  assert.match(championSource, /isChampionPredictionLocked\(championPrediction\)/);
  assert.doesNotMatch(championSource, /refreshChampionPrediction/);
  assert.doesNotMatch(submitBlock, /navigate\(/);
});

test('successful champion save redirects to matches by default', () => {
  const destination = resolveOnboardingDestination({
    locationState: { from: '/champion-pick' },
  });

  assert.equal(destination, '/matches');
});

test('existing champion prediction auto-continues onboarding when destination exists', () => {
  const championSource = readSource('src/pages/ChampionPickPage.jsx');

  assert.match(championSource, /location\.state\?\.from/);
  assert.match(championSource, /isChampionPredictionLocked\(championPrediction\)/);
  assert.match(championSource, /Continue to matches/);
});

test('AuthContext lockChampionPrediction updates state from saved row', () => {
  const authContextSource = readSource('src/context/AuthContext.jsx');

  assert.match(authContextSource, /lockChampionPrediction/);
  assert.match(authContextSource, /setChampionPrediction\(saved\)/);
  assert.match(authContextSource, /championPrediction\?\.locked_at/);
  assert.match(authContextSource, /isChampionPredictionAlreadyLockedError/);
});

test('duplicate champion prediction is not inserted again', () => {
  const authContextSource = readSource('src/context/AuthContext.jsx');
  const championServiceSource = readSource('src/services/championService.js');

  assert.match(authContextSource, /if \(championPrediction\?\.locked_at\)/);
  assert.match(championServiceSource, /set_world_cup_winner_prediction/);
  assert.match(championServiceSource, /already locked/);
});

test('save errors keep the user on the champion picker', () => {
  const championSource = readSource('src/pages/ChampionPickPage.jsx');
  const submitBlock = championSource.match(/const submit = async[\s\S]*?^\s*\};/m)?.[0] ?? '';

  assert.match(submitBlock, /Could not save your champion pick/);
  assert.match(submitBlock, /setPendingDestination\(safeDestination\)/);
  assert.match(submitBlock, /catch \(error\)/);
  const catchIndex = submitBlock.indexOf('catch (error)');
  const pendingIndex = submitBlock.indexOf('setPendingDestination');
  assert.ok(catchIndex > pendingIndex, 'pending destination is set only before error handling');
});

test('React StrictMode duplicate navigation is prevented', () => {
  const championSource = readSource('src/pages/ChampionPickPage.jsx');

  assert.match(championSource, /exitOnceRef/);
  assert.match(championSource, /exitOnceRef\.current/);
});

test('mobile and desktop share the same champion onboarding navigation logic', () => {
  const championSource = readSource('src/pages/ChampionPickPage.jsx');

  assert.doesNotMatch(championSource, /matchMedia/);
  assert.doesNotMatch(championSource, /innerWidth/);
  assert.match(championSource, /pendingDestination/);
});

test('stale champion context cannot reopen onboarding after lock', () => {
  const lockedPrediction = {
    id: 'pick-1',
    predicted_team: 'Belgium',
    locked_at: '2026-06-01T00:00:00.000Z',
  };

  assert.equal(isChampionPredictionLocked(lockedPrediction), true);
  assert.equal(
    resolveOnboardingDestination({ locationState: { from: '/matches' } }),
    '/matches',
  );
});

test('new Google user onboarding path reaches matches after champion lock', () => {
  const destination = resolveOnboardingDestination({
    locationState: { from: '/scoreboard' },
    oauthReturnTo: '/scoreboard',
  });

  assert.equal(destination, '/scoreboard');
  assert.notEqual(destination, '/champion-pick');
  assert.notEqual(destination, '/setup-username');
});
