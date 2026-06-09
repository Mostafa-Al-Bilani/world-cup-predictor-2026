import assert from 'node:assert/strict';
import test from 'node:test';
import { getSafeErrorMessage } from '../src/utils/errors.js';
import { calculateChampionPoints, calculatePredictionPoints } from '../src/utils/predictions.js';
import {
  normalizeGroupInput,
  normalizeInviteCode,
  normalizeMatchPayload,
  normalizePredictionScorePair,
  normalizeProfileSearchQuery,
  validatePredictionResult,
  validateUuid,
} from '../src/utils/validation.js';

test('validates prediction results', () => {
  assert.equal(validatePredictionResult('team_a'), 'team_a');
  assert.throws(() => validatePredictionResult('home_win'), /valid prediction/);
});

test('validates UUID input', () => {
  assert.equal(validateUuid('11111111-1111-4111-8111-111111111111'), '11111111-1111-4111-8111-111111111111');
  assert.throws(() => validateUuid('not-a-uuid'), /invalid/);
});

test('normalizes group input and invite codes', () => {
  assert.deepEqual(normalizeGroupInput({ name: ' Office League ', description: ' Friends ' }), {
    name: 'Office League',
    description: 'Friends',
  });
  assert.equal(normalizeInviteCode('a1b2c3d4'), 'A1B2C3D4');
  assert.throws(() => normalizeInviteCode('short'), /Invite code/);
});

test('limits profile invite search text', () => {
  assert.equal(normalizeProfileSearchQuery(' mo '), 'mo');
  assert.throws(() => normalizeProfileSearchQuery('m'), /at least 2/);
});

test('normalizes admin match payload', () => {
  const payload = normalizeMatchPayload({
    team_a: ' Canada ',
    team_b: ' Mexico ',
    match_date: '2026-06-11T19:00:00.000Z',
    stage: 'Group A',
    status: 'upcoming',
    team_a_score: '',
    team_b_score: 0,
    result: '',
    venue: 'BC Place',
    city: 'Vancouver',
    host_country: 'Canada',
  });

  assert.equal(payload.team_a, 'Canada');
  assert.equal(payload.team_a_score, null);
  assert.equal(payload.team_b_score, 0);
  assert.equal(payload.result, null);
});

test('validates optional exact score predictions', () => {
  assert.deepEqual(normalizePredictionScorePair('', ''), {
    predictedHomeScore: null,
    predictedAwayScore: null,
  });
  assert.deepEqual(normalizePredictionScorePair('2', 1), {
    predictedHomeScore: 2,
    predictedAwayScore: 1,
  });
  assert.throws(() => normalizePredictionScorePair('2', ''), /both scores/);
  assert.throws(() => normalizePredictionScorePair('-1', '0'), /non-negative/);
});

test('scores correct winner and exact score predictions', () => {
  const match = {
    status: 'finished',
    result: 'team_a',
    team_a_score: 2,
    team_b_score: 1,
  };

  assert.deepEqual(calculatePredictionPoints(match, { predicted_result: 'team_a' }), {
    is_correct: true,
    winner_points: 1,
    exact_score_points: 0,
    total_points: 1,
  });
  assert.deepEqual(calculatePredictionPoints(match, { predicted_result: 'team_a', predicted_home_score: 2, predicted_away_score: 1 }), {
    is_correct: true,
    winner_points: 1,
    exact_score_points: 1,
    total_points: 2,
  });
  assert.deepEqual(calculatePredictionPoints(match, { predicted_result: 'team_b', predicted_home_score: 2, predicted_away_score: 1 }), {
    is_correct: false,
    winner_points: 0,
    exact_score_points: 0,
    total_points: 0,
  });
});

test('does not score live matches before final status', () => {
  assert.deepEqual(calculatePredictionPoints({ status: 'live', result: 'team_a', team_a_score: 1, team_b_score: 0 }, { predicted_result: 'team_a' }), {
    is_correct: null,
    winner_points: 0,
    exact_score_points: 0,
    total_points: 0,
  });
});

test('scores champion predictions idempotently', () => {
  assert.equal(calculateChampionPoints('Brazil', 'brazil'), 3);
  assert.equal(calculateChampionPoints('Brazil', 'Argentina'), 0);
});

test('sanitizes internal database errors', () => {
  assert.equal(
    getSafeErrorMessage({ message: "Could not find the table 'public.matches' in the schema cache" }, 'Could not load matches.'),
    'Could not load matches.',
  );
  assert.equal(getSafeErrorMessage({ message: 'Invalid login credentials' }), 'Email or password is incorrect.');
});
