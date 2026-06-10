import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateChampionPoints,
  calculatePredictionPoints,
  getAccuracy,
  getMatchResultFromScores,
  getPredictedScoreLabel,
  getPredictionLabel,
  getPredictionModeLabel,
  getPredictionStatus,
  getPredictionTotalPoints,
  matchAllowsDraw,
} from "../src/utils/predictions.js";

const groupMatch = {
  id: "match-1",
  team_a: "Argentina",
  team_b: "France",
  status: "finished",
  result: "team_a",
  team_a_score: 2,
  team_b_score: 1,
  stage: "Group A",
  match_date: "2020-01-01T20:00:00Z",
};

const knockoutMatch = {
  ...groupMatch,
  stage: "Round of 16",
};

test("group matches allow draw predictions", () => {
  assert.equal(matchAllowsDraw(groupMatch), true);
  assert.equal(getPredictionModeLabel(groupMatch), "Predict result and score");
});

test("knockout matches do not allow draw predictions", () => {
  assert.equal(matchAllowsDraw(knockoutMatch), false);
  assert.equal(
    getPredictionModeLabel(knockoutMatch),
    "Predict final winner and score",
  );
});

test("returns prediction labels for team_a, team_b, draw, and empty result", () => {
  assert.equal(getPredictionLabel(groupMatch, "team_a"), "Argentina wins");
  assert.equal(getPredictionLabel(groupMatch, "team_b"), "France wins");
  assert.equal(getPredictionLabel(groupMatch, "draw"), "Draw");
  assert.equal(getPredictionLabel(groupMatch, ""), "Not predicted");
});

test("returns no score pick when either predicted score is missing", () => {
  assert.equal(getPredictedScoreLabel(null), "No score pick");

  assert.equal(
    getPredictedScoreLabel({
      predicted_home_score: null,
      predicted_away_score: 1,
    }),
    "No score pick",
  );

  assert.equal(
    getPredictedScoreLabel({
      predicted_home_score: 1,
      predicted_away_score: undefined,
    }),
    "No score pick",
  );
});

test("returns predicted score label when both scores exist", () => {
  assert.equal(
    getPredictedScoreLabel({
      predicted_home_score: 2,
      predicted_away_score: 1,
    }),
    "2 - 1",
  );
});

test("awards winner and exact score points", () => {
  const result = calculatePredictionPoints(groupMatch, {
    predicted_result: "team_a",
    predicted_home_score: 2,
    predicted_away_score: 1,
  });

  assert.equal(result.is_correct, true);
  assert.equal(result.winner_points, 1);
  assert.equal(result.exact_score_points, 1);
  assert.equal(result.total_points, 2);
});

test("awards winner point without exact bonus when score is wrong", () => {
  const result = calculatePredictionPoints(groupMatch, {
    predicted_result: "team_a",
    predicted_home_score: 3,
    predicted_away_score: 1,
  });

  assert.equal(result.is_correct, true);
  assert.equal(result.winner_points, 1);
  assert.equal(result.exact_score_points, 0);
  assert.equal(result.total_points, 1);
});

test("awards no points for wrong winner even if one score number matches", () => {
  const result = calculatePredictionPoints(groupMatch, {
    predicted_result: "team_b",
    predicted_home_score: 2,
    predicted_away_score: 1,
  });

  assert.equal(result.is_correct, false);
  assert.equal(result.winner_points, 0);
  assert.equal(result.exact_score_points, 0);
  assert.equal(result.total_points, 0);
});

test("does not score unfinished matches", () => {
  const result = calculatePredictionPoints(
    {
      ...groupMatch,
      status: "live",
    },
    {
      predicted_result: "team_a",
      predicted_home_score: 2,
      predicted_away_score: 1,
    },
  );

  assert.equal(result.is_correct, null);
  assert.equal(result.total_points, 0);
});

test("calculates champion points case-insensitively", () => {
  assert.equal(calculateChampionPoints(" Argentina ", "argentina"), 3);
  assert.equal(calculateChampionPoints("Argentina", "France"), 0);
  assert.equal(calculateChampionPoints("", "France"), 0);
  assert.equal(calculateChampionPoints("Argentina", ""), 0);
});

test("gets match result from scores", () => {
  assert.equal(getMatchResultFromScores(2, 1), "team_a");
  assert.equal(getMatchResultFromScores(1, 2), "team_b");
  assert.equal(getMatchResultFromScores(1, 1), "draw");
  assert.equal(getMatchResultFromScores(null, 1), null);
  assert.equal(getMatchResultFromScores(1, undefined), null);
});

test("returns total points from total_points first, then points_awarded", () => {
  assert.equal(getPredictionTotalPoints({ total_points: 2, points_awarded: 5 }), 2);
  assert.equal(getPredictionTotalPoints({ points_awarded: 5 }), 5);
  assert.equal(getPredictionTotalPoints(null), 0);
});

test("returns prediction status labels", () => {
  assert.equal(
    getPredictionStatus(groupMatch, {
      total_points: 2,
    }),
    "Points won",
  );

  assert.equal(
    getPredictionStatus(groupMatch, {
      total_points: 0,
    }),
    "No points",
  );

  assert.equal(
    getPredictionStatus(
      {
        ...groupMatch,
        status: "upcoming",
        match_date: "2999-01-01T20:00:00Z",
      },
      {
        predicted_result: "team_a",
      },
    ),
    "Predicted",
  );

  assert.equal(
    getPredictionStatus(
      {
        ...groupMatch,
        status: "upcoming",
        match_date: "2000-01-01T20:00:00Z",
      },
      null,
    ),
    "Locked",
  );
});

test("calculates profile accuracy safely", () => {
  assert.equal(
    getAccuracy({
      correct_predictions: 7,
      total_predictions: 10,
    }),
    70,
  );

  assert.equal(
    getAccuracy({
      correct_predictions: 0,
      total_predictions: 0,
    }),
    0,
  );

  assert.equal(getAccuracy(null), 0);
});