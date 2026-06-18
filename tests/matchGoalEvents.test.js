import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCompactScorerAriaLabel,
  formatGoalMinuteDisplay,
  getCompletedMatchScorerState,
  getMatchGoalEvents,
  GOAL_EVENT_TYPES,
} from "../src/utils/matchGoalEvents.js";

test("formats stoppage-time minutes for compact display", () => {
  assert.equal(formatGoalMinuteDisplay("45'+2'"), "45+2'");
  assert.equal(formatGoalMinuteDisplay("34'"), "34'");
});

test("sorts goal events chronologically", () => {
  const events = getMatchGoalEvents({
    goal_events: [
      { side: "team_b", minute: "82'", clock: 4920, player: "J. Rodríguez" },
      { side: "team_b", minute: "18'", clock: 1080, player: "L. Díaz" },
      { side: "team_a", minute: "52'", clock: 3120, player: "A. Shomurodov" },
    ],
  });

  assert.deepEqual(
    events.map((event) => event.player_name),
    ["L. Díaz", "A. Shomurodov", "J. Rodríguez"],
  );
});

test("maps penalty and own-goal event types", () => {
  const events = getMatchGoalEvents({
    goal_events: [
      { side: "team_a", minute: "67'", player: "Player A", penalty: true },
      { side: "team_b", minute: "81'", player: "Player B", own_goal: true },
    ],
  });

  assert.equal(events[0].event_type, GOAL_EVENT_TYPES.PENALTY);
  assert.equal(events[1].event_type, GOAL_EVENT_TYPES.OWN_GOAL);
});

test("returns no-goals state for finished 0-0 matches", () => {
  assert.deepEqual(
    getCompletedMatchScorerState({
      status: "finished",
      team_a_score: 0,
      team_b_score: 0,
    }),
    { kind: "no_goals" },
  );
});

test("hides scorer row when goal events are unavailable", () => {
  assert.deepEqual(
    getCompletedMatchScorerState({
      status: "finished",
      team_a_score: 1,
      team_b_score: 0,
      goal_events: null,
    }),
    { kind: "hidden" },
  );
});

test("returns grouped scorers for finished matches", () => {
  const state = getCompletedMatchScorerState({
    status: "finished",
    team_a_score: 1,
    team_b_score: 1,
    goal_events: [
      { side: "team_a", minute: "34'", player: "P. Schick" },
      { side: "team_b", minute: "71'", player: "L. Foster" },
    ],
  });

  assert.equal(state.kind, "scorers");
  assert.equal(state.teamA[0].player_name, "P. Schick");
  assert.equal(state.teamB[0].player_name, "L. Foster");
});

test("builds accessible scorer labels", () => {
  assert.equal(
    buildCompactScorerAriaLabel({
      player_name: "Player Name",
      minute: "45+2'",
      event_type: GOAL_EVENT_TYPES.PENALTY,
    }),
    "Player Name, 45+2', penalty goal",
  );
});

test("ignores events without player names for completed cards", () => {
  assert.deepEqual(
    getCompletedMatchScorerState({
      status: "finished",
      team_a_score: 1,
      team_b_score: 0,
      goal_events: [{ side: "team_a", minute: "10'", player: "  " }],
    }),
    { kind: "hidden" },
  );
});
