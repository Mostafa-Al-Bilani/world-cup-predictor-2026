import test from "node:test";
import assert from "node:assert/strict";

import {
  detectLiveMatchEvents,
  getMatchPhase,
} from "../src/utils/liveMatchEvents.js";

const baseMatch = {
  id: "match-1",
  team_a: "Argentina",
  team_b: "France",
  team_a_score: 0,
  team_b_score: 0,
  status: "live",
};

test("detects no events when scores and phase do not change", () => {
  const events = detectLiveMatchEvents({
    previousMatch: baseMatch,
    nextMatch: { ...baseMatch },
  });

  assert.deepEqual(events, []);
});

test("detects goal for home team when home score increases", () => {
  const events = detectLiveMatchEvents({
    previousMatch: baseMatch,
    nextMatch: {
      ...baseMatch,
      team_a_score: 1,
      team_b_score: 0,
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "goal");
  assert.equal(events[0].team, "Argentina");
});

test("detects goal for away team when away score increases", () => {
  const events = detectLiveMatchEvents({
    previousMatch: baseMatch,
    nextMatch: {
      ...baseMatch,
      team_a_score: 0,
      team_b_score: 1,
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "goal");
  assert.equal(events[0].team, "France");
});

test("detects two goal events when both scores increase", () => {
  const events = detectLiveMatchEvents({
    previousMatch: baseMatch,
    nextMatch: {
      ...baseMatch,
      team_a_score: 1,
      team_b_score: 1,
    },
  });

  assert.equal(events.length, 2);
  assert.equal(events[0].type, "goal");
  assert.equal(events[0].team, "Argentina");
  assert.equal(events[1].type, "goal");
  assert.equal(events[1].team, "France");
});

test("does not detect goal when score decreases", () => {
  const events = detectLiveMatchEvents({
    previousMatch: {
      ...baseMatch,
      team_a_score: 2,
      team_b_score: 1,
    },
    nextMatch: {
      ...baseMatch,
      team_a_score: 1,
      team_b_score: 1,
    },
  });

  assert.deepEqual(events, []);
});

test("detects extra time phase", () => {
  const events = detectLiveMatchEvents({
    previousMatch: {
      ...baseMatch,
      status: "finished",
    },
    nextMatch: {
      ...baseMatch,
      status: "extra_time",
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "extra_time");
});

test("detects penalties phase", () => {
  const events = detectLiveMatchEvents({
    previousMatch: {
      ...baseMatch,
      status: "extra_time",
    },
    nextMatch: {
      ...baseMatch,
      status: "penalties",
    },
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].type, "penalties");
});

test("normalizes provider penalty shootout text", () => {
  assert.equal(
    getMatchPhase({
      status_detail: "Penalty Shootout",
    }),
    "penalties",
  );
});

test("normalizes provider extra time text", () => {
  assert.equal(
    getMatchPhase({
      status_detail: "Extra Time",
    }),
    "extra_time",
  );
});