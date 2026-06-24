import { normalizeMatchDisplayStatus } from "./matchDisplay.js";
import {
  calculatePredictionPoints,
  getCompletedPredictionOutcome,
  getPredictionTotalPoints,
} from "./predictions.js";
import { matchInvolvesTeam } from "./teamIdentity.js";

export const MAX_MATCH_PREDICTION_POINTS = 2;

const isFinishedMatch = (match) =>
  normalizeMatchDisplayStatus(match?.status) === "finished";

const isScoringComplete = (match) =>
  isFinishedMatch(match) && Boolean(match?.result);

const getEarnedPoints = (match, prediction) => {
  if (!prediction || !isScoringComplete(match)) {
    return null;
  }

  if (
    prediction.is_correct !== null &&
    prediction.is_correct !== undefined &&
    (prediction.total_points !== null ||
      prediction.points_awarded !== null ||
      prediction.winner_points !== null)
  ) {
    return getPredictionTotalPoints(prediction);
  }

  return calculatePredictionPoints(match, prediction).total_points;
};

export const calculateTeamPredictionImpact = ({
  matches = [],
  team,
  predictionsByMatchId = {},
}) => {
  const teamMatches = matches.filter((match) => matchInvolvesTeam(match, team));
  const finishedMatches = teamMatches.filter(isFinishedMatch);

  let pointsEarned = 0;
  let potentialPointsMissed = 0;
  let unclaimedPoints = 0;
  let correctResults = 0;
  let exactScores = 0;
  let incorrectPredictions = 0;
  let matchesNotPredicted = 0;
  let pendingScoringCount = 0;
  let scoredMatchCount = 0;

  finishedMatches.forEach((match) => {
    const prediction = predictionsByMatchId[match.id] ?? null;

    if (!prediction) {
      if (isScoringComplete(match)) {
        unclaimedPoints += MAX_MATCH_PREDICTION_POINTS;
        matchesNotPredicted += 1;
      }
      return;
    }

    if (!isScoringComplete(match)) {
      pendingScoringCount += 1;
      return;
    }

    scoredMatchCount += 1;
    const earned = getEarnedPoints(match, prediction) ?? 0;
    pointsEarned += earned;
    potentialPointsMissed += Math.max(
      0,
      MAX_MATCH_PREDICTION_POINTS - earned,
    );

    const outcome = getCompletedPredictionOutcome(match, prediction);

    if (outcome.kind === "pending") {
      pendingScoringCount += 1;
      return;
    }

    if (outcome.tone === "exact") {
      exactScores += 1;
      correctResults += 1;
    } else if (outcome.tone === "success") {
      correctResults += 1;
    } else if (outcome.tone === "incorrect") {
      incorrectPredictions += 1;
    }
  });

  const predictedFinishedCount = scoredMatchCount;
  const predictionAccuracy =
    predictedFinishedCount > 0
      ? Math.round((correctResults / predictedFinishedCount) * 100)
      : 0;

  return {
    pointsEarned,
    potentialPointsMissed,
    unclaimedPoints,
    correctResults,
    exactScores,
    incorrectPredictions,
    matchesNotPredicted,
    predictionAccuracy,
    pendingScoringCount,
    hasPendingScoring: pendingScoringCount > 0,
  };
};

export const groupPredictionsByMatchId = (predictions = []) =>
  predictions.reduce((result, prediction) => {
    if (!prediction?.match_id) return result;

    result[prediction.match_id] = prediction;
    return result;
  }, {});
