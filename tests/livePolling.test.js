import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FAST_POLL_INTERVAL_MS,
  IDLE_POLL_INTERVAL_MS,
  NEAR_KICKOFF_POLL_INTERVAL_MS,
  getNextLivePollDelay,
  mergeMatchUpdates,
} from '../src/utils/livePolling.js';

test('mergeMatchUpdates preserves unchanged fields and replaces updated fields', () => {
  const currentMatches = [
    {
      id: 'match-1',
      team_a: 'Brazil',
      team_b: 'Morocco',
      venue: 'MetLife Stadium',
      status: 'upcoming',
      match_date: '2026-06-13T22:00:00.000Z',
    },
  ];

  const updates = [
    {
      id: 'match-1',
      status: 'live',
      team_a_score: 1,
      team_b_score: 0,
    },
  ];

  assert.deepEqual(mergeMatchUpdates(currentMatches, updates), [
    {
      id: 'match-1',
      team_a: 'Brazil',
      team_b: 'Morocco',
      venue: 'MetLife Stadium',
      status: 'live',
      team_a_score: 1,
      team_b_score: 0,
      match_date: '2026-06-13T22:00:00.000Z',
    },
  ]);
});

test('uses the fast interval when a match is live', () => {
  const delay = getNextLivePollDelay([
    {
      id: 'match-1',
      status: 'extra_time',
      match_date: '2026-06-13T22:00:00.000Z',
    },
  ]);

  assert.equal(delay, FAST_POLL_INTERVAL_MS);
});

test('uses the near-kickoff interval shortly before kickoff', () => {
  const now = Date.parse('2026-06-13T20:00:00.000Z');

  const delay = getNextLivePollDelay(
    [
      {
        id: 'match-1',
        status: 'upcoming',
        match_date: '2026-06-13T20:20:00.000Z',
      },
    ],
    { now },
  );

  assert.equal(delay, NEAR_KICKOFF_POLL_INTERVAL_MS);
});

test('keeps checking shortly after kickoff while status is still upcoming', () => {
  const now = Date.parse('2026-06-13T20:15:00.000Z');

  const delay = getNextLivePollDelay(
    [
      {
        id: 'match-1',
        status: 'upcoming',
        match_date: '2026-06-13T20:00:00.000Z',
      },
    ],
    { now },
  );

  assert.equal(delay, NEAR_KICKOFF_POLL_INTERVAL_MS);
});

test('uses the idle interval when the next kickoff is far away', () => {
  const now = Date.parse('2026-06-13T10:00:00.000Z');

  const delay = getNextLivePollDelay(
    [
      {
        id: 'match-1',
        status: 'upcoming',
        match_date: '2026-06-13T18:00:00.000Z',
      },
    ],
    { now },
  );

  assert.equal(delay, IDLE_POLL_INTERVAL_MS);
});

test('uses the idle interval when no upcoming or live match exists', () => {
  const delay = getNextLivePollDelay([
    {
      id: 'match-1',
      status: 'finished',
      match_date: '2026-06-13T18:00:00.000Z',
    },
  ]);

  assert.equal(delay, IDLE_POLL_INTERVAL_MS);
});
