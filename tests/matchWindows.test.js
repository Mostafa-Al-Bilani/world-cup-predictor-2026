import test from "node:test";
import assert from "node:assert/strict";

import {
  DASHBOARD_MATCH_WINDOW_MS,
  getDashboardMatchWindows,
} from "../src/utils/matchWindows.js";

const NOW = Date.parse("2026-06-15T12:00:00.000Z");

const kickoff = (offsetMs) => new Date(NOW + offsetMs).toISOString();

let fallbackId = 0;

const makeMatch = (overrides = {}) => ({
  id: overrides.id ?? `match-${(fallbackId += 1)}`,
  team_a: "Argentina",
  team_b: "Brazil",
  match_date: kickoff(60 * 60 * 1000),
  status: "upcoming",
  stage: "Group A",
  ...overrides,
});

const getIds = (matches) => matches.map((match) => match.id);

test("classifies live statuses as live matches", () => {
  const statuses = [
    "live",
    "halftime",
    "extra_time",
    "penalties",
    "penalty-shootout",
  ];

  const matches = statuses.map((status, index) =>
    makeMatch({
      id: `live-${index}`,
      status,
      match_date: kickoff((index + 1) * 60 * 1000),
    }),
  );

  const { liveMatches, recentMatches, nextMatches } =
    getDashboardMatchWindows(matches, NOW);

  assert.deepEqual(getIds(liveMatches), [
    "live-0",
    "live-1",
    "live-2",
    "live-3",
    "live-4",
  ]);
  assert.deepEqual(recentMatches, []);
  assert.deepEqual(nextMatches, []);
});

test("does not duplicate a live match in recent matches", () => {
  const match = makeMatch({
    id: "live-now",
    status: "live",
    match_date: kickoff(-30 * 60 * 1000),
  });

  const { liveMatches, recentMatches } = getDashboardMatchWindows(
    [match],
    NOW,
  );

  assert.deepEqual(getIds(liveMatches), ["live-now"]);
  assert.deepEqual(recentMatches, []);
});

test("includes a finished match inside the previous 24 hours", () => {
  const match = makeMatch({
    id: "recent",
    status: "finished",
    match_date: kickoff(-2 * 60 * 60 * 1000),
  });

  const { recentMatches } = getDashboardMatchWindows([match], NOW);

  assert.deepEqual(getIds(recentMatches), ["recent"]);
});

test("excludes a finished match older than 24 hours", () => {
  const match = makeMatch({
    id: "old-result",
    status: "finished",
    match_date: kickoff(-DASHBOARD_MATCH_WINDOW_MS - 1),
  });

  const { recentMatches } = getDashboardMatchWindows([match], NOW);

  assert.deepEqual(recentMatches, []);
});

test("includes an upcoming match inside the next 24 hours", () => {
  const match = makeMatch({
    id: "soon",
    status: "upcoming",
    match_date: kickoff(2 * 60 * 60 * 1000),
  });

  const { nextMatches } = getDashboardMatchWindows([match], NOW);

  assert.deepEqual(getIds(nextMatches), ["soon"]);
});

test("excludes an upcoming match later than 24 hours", () => {
  const match = makeMatch({
    id: "later",
    status: "upcoming",
    match_date: kickoff(DASHBOARD_MATCH_WINDOW_MS + 1),
  });

  const { nextMatches } = getDashboardMatchWindows([match], NOW);

  assert.deepEqual(nextMatches, []);
});

test("excludes placeholder teams", () => {
  const matches = [
    makeMatch({
      id: "placeholder-home",
      team_a: "Winner Match 1",
      status: "live",
    }),
    makeMatch({
      id: "placeholder-away",
      team_b: "TBD",
      status: "finished",
      match_date: kickoff(-60 * 60 * 1000),
    }),
    makeMatch({
      id: "real",
      status: "upcoming",
      match_date: kickoff(60 * 60 * 1000),
    }),
  ];

  const { liveMatches, recentMatches, nextMatches } =
    getDashboardMatchWindows(matches, NOW);

  assert.deepEqual(liveMatches, []);
  assert.deepEqual(recentMatches, []);
  assert.deepEqual(getIds(nextMatches), ["real"]);
});

test("excludes invalid kickoff dates", () => {
  const matches = [
    makeMatch({ id: "invalid-live", status: "live", match_date: "bad date" }),
    makeMatch({
      id: "invalid-recent",
      status: "finished",
      match_date: "not a date",
    }),
    makeMatch({
      id: "invalid-next",
      status: "upcoming",
      match_date: "",
    }),
  ];

  const windows = getDashboardMatchWindows(matches, NOW);

  assert.deepEqual(windows, {
    liveMatches: [],
    recentMatches: [],
    nextMatches: [],
  });
});

test("sorts recent matches newest first", () => {
  const matches = [
    makeMatch({
      id: "older",
      status: "finished",
      match_date: kickoff(-3 * 60 * 60 * 1000),
    }),
    makeMatch({
      id: "newer",
      status: "finished",
      match_date: kickoff(-30 * 60 * 1000),
    }),
  ];

  const { recentMatches } = getDashboardMatchWindows(matches, NOW);

  assert.deepEqual(getIds(recentMatches), ["newer", "older"]);
});

test("sorts upcoming and live matches by kickoff ascending", () => {
  const matches = [
    makeMatch({
      id: "next-later",
      status: "upcoming",
      match_date: kickoff(3 * 60 * 60 * 1000),
    }),
    makeMatch({
      id: "live-later",
      status: "live",
      match_date: kickoff(-10 * 60 * 1000),
    }),
    makeMatch({
      id: "next-sooner",
      status: "upcoming",
      match_date: kickoff(60 * 60 * 1000),
    }),
    makeMatch({
      id: "live-sooner",
      status: "halftime",
      match_date: kickoff(-90 * 60 * 1000),
    }),
  ];

  const { liveMatches, nextMatches } = getDashboardMatchWindows(matches, NOW);

  assert.deepEqual(getIds(liveMatches), ["live-sooner", "live-later"]);
  assert.deepEqual(getIds(nextMatches), ["next-sooner", "next-later"]);
});

test("includes the exact now minus 24 hours boundary", () => {
  const match = makeMatch({
    id: "boundary-recent",
    status: "finished",
    match_date: kickoff(-DASHBOARD_MATCH_WINDOW_MS),
  });

  const { recentMatches } = getDashboardMatchWindows([match], NOW);

  assert.deepEqual(getIds(recentMatches), ["boundary-recent"]);
});

test("includes the exact now plus 24 hours boundary", () => {
  const match = makeMatch({
    id: "boundary-next",
    status: "upcoming",
    match_date: kickoff(DASHBOARD_MATCH_WINDOW_MS),
  });

  const { nextMatches } = getDashboardMatchWindows([match], NOW);

  assert.deepEqual(getIds(nextMatches), ["boundary-next"]);
});
