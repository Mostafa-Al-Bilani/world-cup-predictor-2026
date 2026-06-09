import assert from 'node:assert/strict';
import test from 'node:test';
import { getSafeErrorMessage } from '../src/utils/errors.js';
import {
  normalizeGroupInput,
  normalizeInviteCode,
  normalizeMatchPayload,
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

test('sanitizes internal database errors', () => {
  assert.equal(
    getSafeErrorMessage({ message: "Could not find the table 'public.matches' in the schema cache" }, 'Could not load matches.'),
    'Could not load matches.',
  );
  assert.equal(getSafeErrorMessage({ message: 'Invalid login credentials' }), 'Email or password is incorrect.');
});
