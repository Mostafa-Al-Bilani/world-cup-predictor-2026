import test from "node:test";
import assert from "node:assert/strict";

import {
  formatCompletedPredictionPoints,
  getCompletedPredictionOutcome,
} from "../src/utils/predictions.js";

const finishedMatch = {
  id: "match-1",
  team_a: "New Zealand",
  team_b: "Egypt",
  status: "finished",
  result: "team_b",
  team_a_score: 1,
  team_b_score: 3,
  stage: "Group G",
  match_date: "2026-06-22T01:00:00.000Z",
};

test("returns no-prediction state for completed matches without a pick", () => {
  const outcome = getCompletedPredictionOutcome(finishedMatch, null);

  assert.equal(outcome.kind, "none");
  assert.equal(outcome.outcomeLabel, "No prediction submitted");
  assert.equal(outcome.pickSummary, null);
  assert.equal(outcome.pointsLabel, null);
});

test("returns pending state when a finished match has no result yet", () => {
  const outcome = getCompletedPredictionOutcome(
    { ...finishedMatch, result: null },
    {
      predicted_result: "team_b",
      predicted_home_score: 1,
      predicted_away_score: 3,
    },
  );

  assert.equal(outcome.kind, "pending");
  assert.equal(outcome.pickSummary, "Egypt wins, 1 - 3");
  assert.equal(outcome.outcomeLabel, "Result calculation pending");
  assert.equal(outcome.pointsLabel, null);
});

test("returns exact-score outcome and points", () => {
  const outcome = getCompletedPredictionOutcome(finishedMatch, {
    predicted_result: "team_b",
    predicted_home_score: 1,
    predicted_away_score: 3,
    is_correct: true,
    winner_points: 1,
    exact_score_points: 1,
    total_points: 2,
  });

  assert.equal(outcome.kind, "scored");
  assert.equal(outcome.pickSummary, "Egypt wins, 1 - 3");
  assert.equal(outcome.outcomeLabel, "Exact score");
  assert.equal(outcome.pointsLabel, "+2 points");
  assert.equal(outcome.tone, "exact");
});

test("returns correct-winner outcome when the score is wrong", () => {
  const outcome = getCompletedPredictionOutcome(finishedMatch, {
    predicted_result: "team_b",
    predicted_home_score: 2,
    predicted_away_score: 1,
    is_correct: true,
    winner_points: 1,
    exact_score_points: 0,
    total_points: 1,
  });

  assert.equal(outcome.outcomeLabel, "Correct winner");
  assert.equal(outcome.pointsLabel, "+1 point");
  assert.equal(outcome.tone, "success");
});

test("returns correct-draw outcome for group-stage draws", () => {
  const outcome = getCompletedPredictionOutcome(
    {
      ...finishedMatch,
      team_a_score: 0,
      team_b_score: 0,
      result: "draw",
      stage: "Group A",
    },
    {
      predicted_result: "draw",
      predicted_home_score: 1,
      predicted_away_score: 1,
      is_correct: true,
      winner_points: 1,
      exact_score_points: 0,
      total_points: 1,
    },
  );

  assert.equal(outcome.outcomeLabel, "Correct draw");
  assert.equal(outcome.pointsLabel, "+1 point");
  assert.equal(outcome.tone, "success");
});

test("returns incorrect outcome with zero points", () => {
  const outcome = getCompletedPredictionOutcome(finishedMatch, {
    predicted_result: "team_a",
    predicted_home_score: 2,
    predicted_away_score: 1,
    is_correct: false,
    winner_points: 0,
    exact_score_points: 0,
    total_points: 0,
  });

  assert.equal(outcome.outcomeLabel, "Incorrect");
  assert.equal(outcome.pointsLabel, "0 points");
  assert.equal(outcome.tone, "incorrect");
});

test("calculates outcome from match data when stored scoring is still null", () => {
  const outcome = getCompletedPredictionOutcome(finishedMatch, {
    predicted_result: "team_b",
    predicted_home_score: 1,
    predicted_away_score: 3,
    is_correct: null,
  });

  assert.equal(outcome.kind, "scored");
  assert.equal(outcome.outcomeLabel, "Exact score");
  assert.equal(outcome.pointsLabel, "+2 points");
});

test("formats completed prediction points without negative values", () => {
  assert.equal(formatCompletedPredictionPoints(2), "+2 points");
  assert.equal(formatCompletedPredictionPoints(1), "+1 point");
  assert.equal(formatCompletedPredictionPoints(0), "0 points");
  assert.equal(formatCompletedPredictionPoints(-1), "0 points");
});
