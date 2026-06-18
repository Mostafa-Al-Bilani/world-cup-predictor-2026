import test from "node:test";
import assert from "node:assert/strict";

import {
  getLiveGoalEvents,
  getLivePhaseClassName,
  getLivePhaseLabel,
  isMatchInLivePhase,
  normalizeMatchDisplayStatus,
  shouldShowScoreBox,
  STARTED_MATCH_FALLBACK_MS,
} from "../src/utils/matchDisplay.js";

test("normalizes provider live status aliases", () => {
  assert.equal(normalizeMatchDisplayStatus("in_progress"), "live");
  assert.equal(normalizeMatchDisplayStatus("STATUS_FIRST_HALF"), "live");
  assert.equal(normalizeMatchDisplayStatus("first_half"), "live");
  assert.equal(normalizeMatchDisplayStatus("second_half"), "live");
});

test("treats a stale upcoming match after kickoff as live within fallback window", () => {
  const now = Date.parse("2026-06-18T22:30:00.000Z");
  const match = {
    status: "upcoming",
    match_date: "2026-06-18T22:00:00.000Z",
    team_a: "Team A",
    team_b: "Team B",
  };

  assert.equal(isMatchInLivePhase(match, now), true);
});

test("does not treat stale upcoming matches outside fallback window as live", () => {
  const kickoff = Date.parse("2026-06-18T22:00:00.000Z");
  const now = kickoff + STARTED_MATCH_FALLBACK_MS + 60_000;
  const match = {
    status: "upcoming",
    match_date: new Date(kickoff).toISOString(),
  };

  assert.equal(isMatchInLivePhase(match, now), false);
});

test("shows score box for stale upcoming live fallback matches", () => {
  const match = {
    status: "upcoming",
    match_date: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    team_a_score: 1,
    team_b_score: 0,
  };

  assert.equal(shouldShowScoreBox(match), true);
});

test("normalizes match display status", () => {
  assert.equal(normalizeMatchDisplayStatus("Extra Time"), "extra_time");
  assert.equal(
    normalizeMatchDisplayStatus("penalty-shootout"),
    "penalty_shootout",
  );
  assert.equal(normalizeMatchDisplayStatus(" LIVE "), "live");
});

test("shows score box for live match", () => {
  assert.equal(shouldShowScoreBox({ status: "live" }), true);
});

test("shows score box for extra time", () => {
  assert.equal(shouldShowScoreBox({ status: "extra_time" }), true);
  assert.equal(shouldShowScoreBox({ status: "Extra Time" }), true);
});

test("shows score box for penalties", () => {
  assert.equal(shouldShowScoreBox({ status: "penalties" }), true);
  assert.equal(shouldShowScoreBox({ status: "penalty_shootout" }), true);
});

test("does not show score box for upcoming match", () => {
  assert.equal(shouldShowScoreBox({ status: "upcoming" }), false);
});

test("returns elapsed minute label for live match", () => {
  assert.equal(getLivePhaseLabel({ status: "live", elapsed: 55 }), "55 min");
});

test("returns empty label for live match without elapsed", () => {
  assert.equal(getLivePhaseLabel({ status: "live", elapsed: null }), "");
});

test("returns Half time label for halftime", () => {
  assert.equal(getLivePhaseLabel({ status: "halftime" }), "Half time");

  assert.equal(
    getLivePhaseLabel({
      status: "live",
      status_detail: "HT",
    }),
    "Half time",
  );
});

test("returns ET label for extra time", () => {
  assert.equal(getLivePhaseLabel({ status: "extra_time" }), "ET");
});

test("returns PEN label for penalties", () => {
  assert.equal(getLivePhaseLabel({ status: "penalties" }), "PEN");
  assert.equal(getLivePhaseLabel({ status: "penalty_shootout" }), "PEN");
});

test("detects live phases", () => {
  assert.equal(isMatchInLivePhase({ status: "live" }), true);
  assert.equal(isMatchInLivePhase({ status: "Half Time" }), false);
  assert.equal(isMatchInLivePhase({ status: "halftime" }), true);
  assert.equal(isMatchInLivePhase({ status: "extra_time" }), true);
  assert.equal(isMatchInLivePhase({ status: "penalty-shootout" }), true);
  assert.equal(isMatchInLivePhase({ status: "upcoming" }), false);
  assert.equal(isMatchInLivePhase({ status: "finished" }), false);
});

test("returns normalized goal events for live matches", () => {
  const events = getLiveGoalEvents({
    status: "live",
    goal_events: [
      {
        side: "team_a",
        minute: "21'",
        clock: 1228,
        player: "Jovo Lukic",
        own_goal: false,
        penalty: false,
      },
      {
        side: "team_b",
        minute: "45'+2'",
        clock: 2820,
        player: "Alphonso Davies",
        own_goal: false,
        penalty: true,
      },
    ],
  });

  assert.deepEqual(events, [
    {
      side: "team_a",
      minute: "21'",
      player: "Jovo Lukic",
      ownGoal: false,
      penalty: false,
    },
    {
      side: "team_b",
      minute: "45'+2'",
      player: "Alphonso Davies",
      ownGoal: false,
      penalty: true,
    },
  ]);
});

test("returns no goal events for non-live matches", () => {
  const goalEvents = [
    { side: "team_a", minute: "10'", player: "Someone" },
  ];

  assert.deepEqual(
    getLiveGoalEvents({ status: "finished", goal_events: goalEvents }),
    [],
  );
  assert.deepEqual(
    getLiveGoalEvents({ status: "upcoming", goal_events: goalEvents }),
    [],
  );
});

test("ignores malformed goal events", () => {
  const events = getLiveGoalEvents({
    status: "live",
    goal_events: [
      null,
      "bad",
      { side: "unknown", minute: "10'", player: "Lost Side" },
      { side: "team_a", minute: "", player: "  " },
      { side: "team_b", minute: "78'", player: null },
    ],
  });

  assert.deepEqual(events, [
    {
      side: "team_b",
      minute: "78'",
      player: null,
      ownGoal: false,
      penalty: false,
    },
  ]);
});

test("returns no goal events when column is missing", () => {
  assert.deepEqual(getLiveGoalEvents({ status: "live" }), []);
  assert.deepEqual(
    getLiveGoalEvents({ status: "live", goal_events: null }),
    [],
  );
});

test("returns correct phase class names", () => {
  assert.equal(
    getLivePhaseClassName({ status: "extra_time" }),
    "text-amber-200",
  );

  assert.equal(getLivePhaseClassName({ status: "penalties" }), "text-rose-200");

  assert.equal(getLivePhaseClassName({ status: "live" }), "text-emerald-200");
});
