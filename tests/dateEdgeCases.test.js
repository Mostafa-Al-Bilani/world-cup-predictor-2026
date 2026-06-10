import test from "node:test";
import assert from "node:assert/strict";

import {
  fromDateTimeLocalInput,
  getTimeRemaining,
  isMatchLocked,
  toDateTimeLocalInput,
} from "../src/utils/date.js";

test("returns expired time remaining for past date", () => {
  const result = getTimeRemaining("2000-01-01T00:00:00Z");

  assert.equal(result.expired, true);
  assert.equal(result.days, 0);
  assert.equal(result.hours, 0);
  assert.equal(result.minutes, 0);
  assert.equal(result.seconds, 0);
});

test("returns non-expired time remaining for future date", () => {
  const result = getTimeRemaining("2999-01-01T00:00:00Z");

  assert.equal(result.expired, false);
  assert.equal(result.days > 0, true);
});

test("locks match when kickoff is in the past", () => {
  assert.equal(
    isMatchLocked({
      match_date: "2000-01-01T00:00:00Z",
    }),
    true,
  );
});

test("does not lock match when kickoff is in the future", () => {
  assert.equal(
    isMatchLocked({
      match_date: "2999-01-01T00:00:00Z",
    }),
    false,
  );
});

test("returns empty local input for missing or invalid date", () => {
  assert.equal(toDateTimeLocalInput(null), "");
  assert.equal(toDateTimeLocalInput("not-a-date"), "");
});

test("converts valid date to datetime-local input format", () => {
  const result = toDateTimeLocalInput("2026-06-11T20:30:00Z");

  assert.match(result, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
});

test("returns null from empty or invalid datetime-local input", () => {
  assert.equal(fromDateTimeLocalInput(""), null);
  assert.equal(fromDateTimeLocalInput("not-a-date"), null);
});

test("converts datetime-local input to ISO string", () => {
  const result = fromDateTimeLocalInput("2026-06-11T20:30");

  assert.match(result, /^\d{4}-\d{2}-\d{2}T\d{2}:30:00\.000Z$/);
});