import assert from 'node:assert/strict';
import test from 'node:test';
import { getSafeErrorMessage } from '../src/utils/errors.js';
import { getTeamFlag, getTeamFlagInfo } from '../src/utils/flags.js';
import { canViewGroup, mergeOwnedGroupsWithMembershipRows, ownerMembershipForGroup } from '../src/utils/groups.js';
import { getTopThreeUsers, hasScoredLeaderboardEntries, sortLeaderboardUsers } from '../src/utils/leaderboard.js';
import { calculateChampionPoints, calculatePredictionPoints } from '../src/utils/predictions.js';
import {
  calculateStagePredictionPoints,
  getStageLockAt,
  isStageLocked,
  validateStageSelection,
} from '../src/utils/stagePredictions.js';
import {
  buildFixtureLookupMaps,
  buildMatchPayload,
  findExistingMatchForFixture,
  fixtureEquivalentKey,
  getDeletableDuplicateMatchIdsForFixture,
  normalizeEspnFixtures,
  shouldRecalculateMatch,
} from '../src/services/fixtureNormalizer.js';
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

test('requires exact score predictions', () => {
  assert.deepEqual(normalizePredictionScorePair(2, 1), {
    predictedHomeScore: 2,
    predictedAwayScore: 1,
  });

  assert.deepEqual(normalizePredictionScorePair('0', '0'), {
    predictedHomeScore: 0,
    predictedAwayScore: 0,
  });

  assert.throws(
    () => normalizePredictionScorePair('', ''),
    /Enter both scores before saving your prediction/,
  );

  assert.throws(
    () => normalizePredictionScorePair(1, ''),
    /Enter both scores before saving your prediction/,
  );

  assert.throws(
    () => normalizePredictionScorePair('', 1),
    /Enter both scores before saving your prediction/,
  );

  assert.throws(
    () => normalizePredictionScorePair(-1, 1),
    /Home team score must be a non-negative whole number from 0 to 99/,
  );

  assert.throws(
    () => normalizePredictionScorePair(1, 100),
    /Away team score must be a non-negative whole number from 0 to 99/,
  );
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

test('allows group owners and accepted members while denying non-members', () => {
  const group = {
    id: '22222222-2222-4222-8222-222222222222',
    owner_id: '11111111-1111-4111-8111-111111111111',
    created_at: '2026-01-01T00:00:00.000Z',
  };
  const member = {
    group_id: group.id,
    user_id: '33333333-3333-4333-8333-333333333333',
    status: 'accepted',
  };

  assert.equal(canViewGroup({ group, members: [], userId: group.owner_id }), true);
  assert.equal(canViewGroup({ group, members: [member], userId: member.user_id }), true);
  assert.equal(canViewGroup({ group, members: [member], userId: '44444444-4444-4444-8444-444444444444' }), false);
  assert.equal(ownerMembershipForGroup(group).role, 'owner');
});

test('merges owned groups even when owner membership is missing', () => {
  const userId = '11111111-1111-4111-8111-111111111111';
  const ownedGroup = {
    id: '22222222-2222-4222-8222-222222222222',
    owner_id: userId,
    name: 'Office League',
    created_at: '2026-01-02T00:00:00.000Z',
  };

  assert.deepEqual(mergeOwnedGroupsWithMembershipRows([], [ownedGroup], userId), [
    {
      ...ownedGroup,
      membership_role: 'owner',
      membership_status: 'accepted',
      membership_created_at: ownedGroup.created_at,
      user_id: userId,
    },
  ]);
});

test('normalizes and sorts leaderboard rows safely', () => {
  const rows = sortLeaderboardUsers([
    { id: 'a', username: 'Zed', total_points: null, correct_predictions: null, total_predictions: null },
    { id: 'b', username: 'Ada', total_points: 5, match_winner_points: 1, exact_score_points: 1, champion_points: 0, bracket_points: 3, correct_predictions: 1, total_predictions: 1 },
    { id: 'c', username: 'Bea', total_points: 2, correct_predictions: 0, total_predictions: 0 },
  ]);

  assert.equal(rows[0].username, 'Ada');
  assert.equal(rows[0].bracket_points, 3);
  assert.equal(rows[1].username, 'Bea');
  assert.equal(rows[2].total_points, 0);
  assert.equal(hasScoredLeaderboardEntries([]), false);
  assert.equal(hasScoredLeaderboardEntries(rows), true);
});

test('top three helper handles small and tied leaderboards', () => {
  assert.deepEqual(getTopThreeUsers([]), []);
  assert.equal(getTopThreeUsers([{ id: 'a', username: 'Solo', total_points: 0 }]).length, 1);
  assert.equal(getTopThreeUsers([{ id: 'a', username: 'A' }, { id: 'b', username: 'B' }]).length, 2);
  assert.deepEqual(
    getTopThreeUsers([
      { id: 'c', username: 'C', total_points: 1 },
      { id: 'a', username: 'A', total_points: 3 },
      { id: 'b', username: 'B', total_points: 2 },
      { id: 'd', username: 'D', total_points: 0 },
    ]).map((user) => user.username),
    ['A', 'B', 'C'],
  );
});

test('returns flags only for real country team names', () => {
  assert.equal(getTeamFlagInfo('Mexico').code, 'MX');
  assert.equal(getTeamFlagInfo('Mexico').imageUrl, 'https://flagcdn.com/mx.svg');
  assert.equal(getTeamFlagInfo('United States').code, 'US');
  assert.equal(getTeamFlag('Mexico'), getTeamFlagInfo('Mexico').emoji);
  assert.equal(getTeamFlag('Group A 2nd Place'), null);
  assert.equal(getTeamFlag('2A'), null);
});

test('normalizes ESPN scheduled World Cup events without an API key', () => {
  const [match] = normalizeEspnFixtures([
    {
      id: '760415',
      date: '2026-06-11T19:00Z',
      season: { slug: 'group-stage' },
      competitions: [
        {
          date: '2026-06-11T19:00Z',
          status: {
            clock: 0,
            displayClock: "0'",
            type: { name: 'STATUS_SCHEDULED', state: 'pre', completed: false, shortDetail: 'Scheduled' },
          },
          venue: { fullName: 'Estadio Banorte', address: { city: 'Mexico City', country: 'Mexico' } },
          competitors: [
            { homeAway: 'home', winner: false, score: '0', team: { displayName: 'Mexico' } },
            { homeAway: 'away', winner: false, score: '0', team: { displayName: 'South Africa' } },
          ],
        },
      ],
    },
  ]);

  assert.equal(match.provider_name, 'espn');
  assert.equal(match.provider_fixture_id, '760415');
  assert.equal(match.team_a, 'Mexico');
  assert.equal(match.team_b, 'South Africa');
  assert.equal(match.stage, 'Group Stage');
  assert.equal(match.status, 'upcoming');
  assert.equal(match.result, null);
  assert.equal(match.hasScore, false);
  assert.equal(match.team_a_score, null);
  assert.equal(match.team_b_score, null);
  assert.equal(match.venue, 'Estadio Banorte');
});

test('preserves existing group letter when ESPN only reports generic group stage', () => {
  const payload = buildMatchPayload(
    { stage: 'Group Stage', status: 'upcoming', hasScore: false, team_a: 'Mexico', team_b: 'South Africa' },
    { stage: 'Group A', status: 'upcoming', team_a: 'Mexico', team_b: 'South Africa' },
  );

  assert.equal(payload.stage, 'Group A');
});

test('normalizes ESPN finished results using winner flags for knockout matches', () => {
  const [match] = normalizeEspnFixtures([
    {
      id: '760517',
      date: '2026-07-19T19:00Z',
      season: { slug: 'final' },
      competitions: [
        {
          status: {
            clock: 90,
            displayClock: "90'",
            type: { name: 'STATUS_FINAL_PEN', state: 'post', completed: true, shortDetail: 'Final' },
          },
          competitors: [
            { homeAway: 'home', winner: true, score: '1', team: { displayName: 'Brazil' } },
            { homeAway: 'away', winner: false, score: '1', team: { displayName: 'Argentina' } },
          ],
        },
      ],
    },
  ]);

  assert.equal(match.stage, 'Final');
  assert.equal(match.status, 'finished');
  assert.equal(match.team_a_score, 1);
  assert.equal(match.team_b_score, 1);
  assert.equal(match.result, 'team_a');
});

test('does not recalculate points for ESPN live score updates before final status', () => {
  assert.equal(
    shouldRecalculateMatch(
      { status: 'upcoming', team_a_score: null, team_b_score: null, result: null },
      { status: 'live', team_a_score: 1, team_b_score: 0, result: null },
    ),
    false,
  );
});

test('matches ESPN knockout placeholders to seeded rows and flags empty duplicates for deletion', () => {
  const seeded = {
    id: 'seeded-match',
    match_number: 73,
    provider_name: 'openfootball',
    provider_fixture_id: '73',
    external_ref: 'openfootball-2026-73',
    team_a: '2A',
    team_b: '2B',
    match_date: '2026-06-28T19:00:00.000Z',
    stage: 'Round of 32',
    venue: 'SoFi Stadium',
    prediction_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  };
  const duplicate = {
    id: 'espn-duplicate',
    provider_name: 'espn',
    provider_fixture_id: '760490',
    external_ref: 'espn-2026-760490',
    team_a: 'Group A 2nd Place',
    team_b: 'Group B 2nd Place',
    match_date: '2026-06-28T19:00:00.000Z',
    stage: 'Round Of 32',
    prediction_count: 0,
    created_at: '2026-06-09T00:00:00.000Z',
  };
  const fixture = {
    provider_name: 'espn',
    provider_fixture_id: '760490',
    external_ref: 'espn-2026-760490',
    team_a: 'Group A 2nd Place',
    team_b: 'Group B 2nd Place',
    match_date: '2026-06-28T19:00:00.000Z',
    stage: 'Round Of 32',
  };
  const maps = buildFixtureLookupMaps([duplicate, seeded]);
  const existing = findExistingMatchForFixture(fixture, maps);

  assert.equal(existing.id, seeded.id);
  assert.deepEqual(getDeletableDuplicateMatchIdsForFixture(fixture, maps, existing.id), [duplicate.id]);
});

test('matches provider team-name aliases to seeded group fixtures and flags duplicates', () => {
  const seeded = {
    id: 'seeded-canada-bosnia',
    match_number: 3,
    team_a: 'Canada',
    team_b: 'Bosnia & Herzegovina',
    match_date: '2026-06-12T19:00:00.000Z',
    stage: 'Group B',
    prediction_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
  };
  const duplicate = {
    id: 'espn-canada-bosnia',
    provider_name: 'espn',
    provider_fixture_id: '760417',
    external_ref: 'espn-2026-760417',
    team_a: 'Canada',
    team_b: 'Bosnia and Herzegovina',
    match_date: '2026-06-12T19:00:00.000Z',
    stage: 'Group Stage',
    prediction_count: 0,
    created_at: '2026-06-09T00:00:00.000Z',
  };
  const fixture = {
    ...duplicate,
    id: undefined,
  };
  const maps = buildFixtureLookupMaps([duplicate, seeded]);
  const existing = findExistingMatchForFixture(fixture, maps);

  assert.equal(fixtureEquivalentKey(seeded), fixtureEquivalentKey(duplicate));
  assert.equal(existing.id, seeded.id);
  assert.deepEqual(getDeletableDuplicateMatchIdsForFixture(fixture, maps, existing.id), [duplicate.id]);
});

test('validates bracket stage selections', () => {
  const teams = ['Brazil', 'Argentina'];

  assert.deepEqual(
    validateStageSelection({ stage: 'finalists', selectedTeams: ['Brazil', 'Argentina'], availableTeams: teams }),
    ['Brazil', 'Argentina'],
  );
  assert.throws(
    () => validateStageSelection({ stage: 'finalists', selectedTeams: ['Brazil'], availableTeams: teams }),
    /Select exactly 2/,
  );
  assert.throws(
    () => validateStageSelection({ stage: 'finalists', selectedTeams: ['Brazil', 'Brazil'], availableTeams: teams }),
    /same team/,
  );
  assert.throws(
    () => validateStageSelection({ stage: 'finalists', selectedTeams: ['Brazil', 'TBD'], availableTeams: [...teams, 'TBD'] }),
    /tournament team/,
  );
});

test('scores bracket stage predictions without incrementing points', () => {
  const scored = calculateStagePredictionPoints({
    stage: 'semi_finals',
    selectedTeams: ['Brazil', 'Argentina', 'France', 'Mexico'],
    actualTeams: ['Brazil', 'France', 'Spain', 'Germany'],
  });

  assert.deepEqual(scored, {
    correctCount: 2,
    correctTeams: ['Brazil', 'France'],
    pointsAwarded: 8,
    scored: true,
  });
  assert.deepEqual(calculateStagePredictionPoints({ stage: 'semi_finals', selectedTeams: ['Brazil'], actualTeams: ['Brazil'] }), {
    correctCount: 0,
    correctTeams: [],
    pointsAwarded: 0,
    scored: false,
  });
});

test('uses UTC kickoff timestamps for bracket stage locks', () => {
  const lockAt = getStageLockAt(
    [
      { stage: 'Round of 16', match_date: '2026-07-04T19:00:00.000Z' },
      { stage: 'Round of 16', match_date: '2026-07-04T23:00:00.000Z' },
    ],
    'round_of_16',
  );

  assert.equal(lockAt, '2026-07-04T19:00:00.000Z');
  assert.equal(isStageLocked(lockAt, new Date('2026-07-04T18:59:59.000Z').getTime()), false);
  assert.equal(isStageLocked(lockAt, new Date('2026-07-04T19:00:00.000Z').getTime()), true);
});
