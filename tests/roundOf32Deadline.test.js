import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { isMatchOpenForPrediction } from "../src/utils/matches.js";
import {
  ROUND_OF_32_LOCK_AT,
  getRoundOf32DeadlineBeirutMessage,
  getStageLockAt,
  getStageWindowMessage,
  isStageLocked,
} from "../src/utils/stagePredictions.js";

const DEADLINE_MS = Date.parse(ROUND_OF_32_LOCK_AT);

test("Round of 32 submission is allowed one second before the deadline", () => {
  assert.equal(
    isStageLocked(ROUND_OF_32_LOCK_AT, DEADLINE_MS - 1_000),
    false,
  );
});

test("Round of 32 submission is rejected exactly at the deadline", () => {
  assert.equal(isStageLocked(ROUND_OF_32_LOCK_AT, DEADLINE_MS), true);
});

test("Round of 32 submission is rejected after the deadline", () => {
  assert.equal(
    isStageLocked(ROUND_OF_32_LOCK_AT, DEADLINE_MS + 60_000),
    true,
  );
});

test("existing Round of 32 selections can be edited before the deadline", () => {
  const locked = isStageLocked(ROUND_OF_32_LOCK_AT, DEADLINE_MS - 1_000);
  const scoredAt = null;

  assert.equal(!locked && !scoredAt, true);
});

test("existing Round of 32 selections cannot be edited after the deadline", () => {
  const locked = isStageLocked(ROUND_OF_32_LOCK_AT, DEADLINE_MS);
  const scoredAt = null;

  assert.equal(!locked && !scoredAt, false);
});

test("displays the Beirut deadline correctly", () => {
  const message = getRoundOf32DeadlineBeirutMessage();

  assert.match(message, /Round of 32 selections close/i);
  assert.match(message, /June 25/i);
  assert.match(message, /11:59 PM/i);
  assert.match(message, /Beirut time/i);
  assert.doesNotMatch(message, /2026-06-25T21:00:00Z/);
});

test("stores and compares the Round of 32 deadline in UTC", () => {
  assert.equal(ROUND_OF_32_LOCK_AT, "2026-06-25T21:00:00.000Z");
  assert.equal(
    getStageLockAt([], "round_of_32", []),
    ROUND_OF_32_LOCK_AT,
  );
});

test("other bracket rounds keep kickoff-based lock behaviour", () => {
  const lockAt = getStageLockAt(
    [
      { stage: "Round of 16", match_date: "2026-07-04T19:00:00.000Z" },
      { stage: "Round of 16", match_date: "2026-07-04T23:00:00.000Z" },
    ],
    "round_of_16",
  );

  assert.equal(lockAt, "2026-07-04T19:00:00.000Z");
  assert.notEqual(lockAt, ROUND_OF_32_LOCK_AT);
});

test("normal match-prediction locks are unaffected", () => {
  const now = DEADLINE_MS - 1_000;

  assert.equal(
    isMatchOpenForPrediction(
      {
        team_a: "Argentina",
        team_b: "France",
        status: "upcoming",
        match_date: "2026-07-10T18:00:00.000Z",
      },
      now,
    ),
    true,
  );
});

test("save_stage_prediction enforces the database window rather than client input", () => {
  const schema = readSchemaSnippet();

  assert.match(schema, /save_stage_prediction/);
  assert.match(schema, /stage_lock_at <= now\(\)/);
  assert.match(schema, /stage_prediction_windows/);
  assert.doesNotMatch(schema, /target_stage.*now\(\)/);
});

test("Round of 32 window message uses the Beirut deadline copy", () => {
  const message = getStageWindowMessage({
    stage: "round_of_32",
    lockAt: ROUND_OF_32_LOCK_AT,
    openedAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(message, getRoundOf32DeadlineBeirutMessage());
});

function readSchemaSnippet() {
  return readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../supabase/schema.sql"),
    "utf8",
  );
}
