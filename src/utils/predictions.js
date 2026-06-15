export const predictionLabels = {
  team_a: 'Team A wins',
  draw: 'Draw',
  team_b: 'Team B wins',
};

export const matchAllowsDraw = (match) => match?.stage?.trim().toLowerCase().startsWith('group');

export const getPredictionModeLabel = (match) =>
  matchAllowsDraw(match) ? 'Predict result and score' : 'Predict final winner and score';

export const getPredictionLabel = (match, result) => {
  if (!result) return 'Not predicted';
  if (result === 'team_a') return `${match.team_a} wins`;
  if (result === 'team_b') return `${match.team_b} wins`;
  return 'Draw';
};

export const getPredictedScoreLabel = (prediction) => {
  if (prediction?.predicted_home_score === null || prediction?.predicted_home_score === undefined) return 'No score pick';
  if (prediction?.predicted_away_score === null || prediction?.predicted_away_score === undefined) return 'No score pick';
  return `${prediction.predicted_home_score} - ${prediction.predicted_away_score}`;
};

export const getPredictionSummary = (match, prediction) => {
  if (!prediction) return 'No prediction yet';

  const resultLabel = getPredictionLabel(match, prediction.predicted_result);
  const scoreLabel = getPredictedScoreLabel(prediction);

  if (scoreLabel === 'No score pick') {
    return resultLabel;
  }

  return `${resultLabel}, ${scoreLabel}`;
};

export const getPredictionTotalPoints = (prediction) => prediction?.total_points ?? prediction?.points_awarded ?? 0;

export const calculatePredictionPoints = (match, prediction) => {
  if (match?.status !== 'finished' || !match.result) {
    return {
      is_correct: null,
      winner_points: 0,
      exact_score_points: 0,
      total_points: 0,
    };
  }

  const winnerPoints = prediction?.predicted_result === match.result ? 1 : 0;
  const exactScorePoints =
    winnerPoints === 1 &&
    prediction?.predicted_home_score !== null &&
    prediction?.predicted_home_score !== undefined &&
    prediction?.predicted_away_score !== null &&
    prediction?.predicted_away_score !== undefined &&
    Number(prediction.predicted_home_score) === Number(match.team_a_score) &&
    Number(prediction.predicted_away_score) === Number(match.team_b_score)
      ? 1
      : 0;

  return {
    is_correct: winnerPoints === 1,
    winner_points: winnerPoints,
    exact_score_points: exactScorePoints,
    total_points: winnerPoints + exactScorePoints,
  };
};

export const calculateChampionPoints = (predictedTeam, championTeam) => {
  if (!predictedTeam || !championTeam) return 0;
  return predictedTeam.trim().toLowerCase() === championTeam.trim().toLowerCase() ? 3 : 0;
};

export const getMatchResultFromScores = (teamAScore, teamBScore) => {
  if (teamAScore === null || teamAScore === undefined || teamBScore === null || teamBScore === undefined) {
    return null;
  }
  if (Number(teamAScore) > Number(teamBScore)) return 'team_a';
  if (Number(teamAScore) < Number(teamBScore)) return 'team_b';
  return 'draw';
};

export const getPredictionStatus = (match, prediction) => {
  if (match.status === 'finished' && getPredictionTotalPoints(prediction) > 0) return 'Points won';
  if (match.status === 'finished' && prediction) return 'No points';
  if (prediction && new Date(match.match_date).getTime() <= Date.now()) return 'Locked';
  if (prediction) return 'Predicted';
  if (new Date(match.match_date).getTime() <= Date.now()) return 'Locked';
  return 'Not predicted';
};

export const getAccuracy = (profile) => {
  if (!profile?.total_predictions) return 0;
  return Math.round((profile.correct_predictions / profile.total_predictions) * 100);
};
