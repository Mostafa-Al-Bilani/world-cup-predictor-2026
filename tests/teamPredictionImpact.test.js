import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateTeamPredictionImpact,
  MAX_MATCH_PREDICTION_POINTS,
} from "../src/utils/teamPredictionImpact.js";

const team = "Brazil";

const finishedMatch = {
  id: "finished-1",
  team_a: "Brazil",
  team_b: "Serbia",
  status: "finished",
  result: "team_a",
  team_a_score: 2,
  team_b_score: 0,
  match_date: "2026-06-12T00:00:00.000Z",
};

const pendingMatch = {
  id: "pending-1",
  team_a: "Brazil",
  team_b: "Portugal",
  status: "finished",
  result: null,
  team_a_score: 1,
  team_b_score: 0,
  match_date: "2026-06-20T00:00:00.000Z",
};

const missingPredictionMatch = {
  id: "missing-1",
  team_a: "Brazil",
  team_b: "Germany",
  status: "finished",
  result: "team_b",
  team_a_score: 0,
  team_b_score: 1,
  match_date: "2026-06-22T00:00:00.000Z",
};

test("counts only predictions supplied for the selected user batch", () => {
  const impact = calculateTeamPredictionImpact({
    matches: [finishedMatch, missingPredictionMatch],
    team,
    predictionsByMatchId: {
      "finished-1": {
        match_id: "finished-1",
        predicted_result: "team_a",
        predicted_home_score: 2,
        predicted_away_score: 0,
        total_points: 2,
        winner_points: 1,
        exact_score_points: 1,
        is_correct: true,
      },
    },
  });

  assert.equal(impact.pointsEarned, 2);
  assert.equal(impact.exactScores, 1);
  assert.equal(impact.matchesNotPredicted, 1);
  assert.equal(impact.unclaimedPoints, MAX_MATCH_PREDICTION_POINTS);
});

test("potential missed points exclude missing predictions", () => {
  const impact = calculateTeamPredictionImpact({
    matches: [finishedMatch],
    team,
    predictionsByMatchId: {
      "finished-1": {
        match_id: "finished-1",
        predicted_result: "team_a",
        predicted_home_score: 2,
        predicted_away_score: 1,
        total_points: 1,
        winner_points: 1,
        exact_score_points: 0,
        is_correct: true,
      },
    },
  });

  assert.equal(impact.potentialPointsMissed, 1);
});

test("pending scoring is not treated as confirmed zero", () => {
  const impact = calculateTeamPredictionImpact({
    matches: [pendingMatch],
    team,
    predictionsByMatchId: {
      "pending-1": {
        match_id: "pending-1",
        predicted_result: "team_a",
        predicted_home_score: 1,
        predicted_away_score: 0,
      },
    },
  });

  assert.equal(impact.pointsEarned, 0);
  assert.equal(impact.hasPendingScoring, true);
  assert.equal(impact.incorrectPredictions, 0);
});

test("draw predictions are handled correctly", () => {
  const drawMatch = {
    ...finishedMatch,
    id: "draw-1",
    result: "draw",
    team_a_score: 1,
    team_b_score: 1,
  };

  const impact = calculateTeamPredictionImpact({
    matches: [drawMatch],
    team,
    predictionsByMatchId: {
      "draw-1": {
        match_id: "draw-1",
        predicted_result: "draw",
        predicted_home_score: 1,
        predicted_away_score: 1,
        total_points: 2,
        winner_points: 1,
        exact_score_points: 1,
        is_correct: true,
      },
    },
  });

  assert.equal(impact.correctResults, 1);
  assert.equal(impact.exactScores, 1);
});

test("legacy predictions without score fields still score safely", () => {
  const impact = calculateTeamPredictionImpact({
    matches: [finishedMatch],
    team,
    predictionsByMatchId: {
      "finished-1": {
        match_id: "finished-1",
        predicted_result: "team_a",
      },
    },
  });

  assert.equal(impact.pointsEarned, 1);
});
