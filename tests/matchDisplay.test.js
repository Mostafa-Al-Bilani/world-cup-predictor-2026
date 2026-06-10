import test from "node:test";
import assert from "node:assert/strict";

import {
  getLivePhaseClassName,
  getLivePhaseLabel,
  normalizeMatchDisplayStatus,
  shouldShowScoreBox,
} from "../src/utils/matchDisplay.js";

test("normalizes match display status", () => {
  assert.equal(normalizeMatchDisplayStatus("Extra Time"), "extra_time");
  assert.equal(normalizeMatchDisplayStatus("penalty-shootout"), "penalty_shootout");
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

test("returns ET label for extra time", () => {
  assert.equal(getLivePhaseLabel({ status: "extra_time" }), "ET");
});

test("returns PEN label for penalties", () => {
  assert.equal(getLivePhaseLabel({ status: "penalties" }), "PEN");
  assert.equal(getLivePhaseLabel({ status: "penalty_shootout" }), "PEN");
});

test("returns correct phase class names", () => {
  assert.equal(
    getLivePhaseClassName({ status: "extra_time" }),
    "text-amber-200",
  );

  assert.equal(
    getLivePhaseClassName({ status: "penalties" }),
    "text-rose-200",
  );

  assert.equal(
    getLivePhaseClassName({ status: "live" }),
    "text-emerald-200",
  );
});