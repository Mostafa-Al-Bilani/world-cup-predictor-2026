import test from "node:test";
import assert from "node:assert/strict";

import { formatKickoffCountdown } from "../src/utils/kickoffCountdown.js";

const now = new Date("2026-06-15T12:00:00.000Z").getTime();

test("formats hours and minutes without unnecessary units", () => {
  const result = formatKickoffCountdown("2026-06-15T14:14:03.000Z", now);

  assert.deepEqual(result, {
    text: "Starts in 2h 14m",
    ariaLabel: "Kickoff in 2 hours and 14 minutes",
    expired: false,
  });
});

test("formats minutes and seconds when less than one hour remains", () => {
  const result = formatKickoffCountdown("2026-06-15T12:48:12.000Z", now);

  assert.deepEqual(result, {
    text: "Starts in 48m 12s",
    ariaLabel: "Kickoff in 48 minutes and 12 seconds",
    expired: false,
  });
});

test("formats seconds only when less than one minute remains", () => {
  const result = formatKickoffCountdown("2026-06-15T12:00:24.000Z", now);

  assert.deepEqual(result, {
    text: "Starts in 24s",
    ariaLabel: "Kickoff in 24 seconds",
    expired: false,
  });
});

test("returns starting now when kickoff has passed", () => {
  const result = formatKickoffCountdown("2026-06-15T11:59:59.000Z", now);

  assert.deepEqual(result, {
    text: "Starting now",
    ariaLabel: "Starting now",
    expired: true,
  });
});

test("returns null for invalid kickoff input", () => {
  assert.equal(formatKickoffCountdown(null, now), null);
  assert.equal(formatKickoffCountdown("not-a-date", now), null);
});

test("never returns negative countdown values", () => {
  const result = formatKickoffCountdown("2026-06-15T12:00:00.000Z", now);

  assert.equal(result.expired, true);
  assert.equal(result.text, "Starting now");
  assert.doesNotMatch(result.text, /-/);
});
