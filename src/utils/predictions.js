export const predictionLabels = {
  team_a: 'Team A wins',
  draw: 'Draw',
  team_b: 'Team B wins',
};

export const getPredictionLabel = (match, result) => {
  if (!result) return 'Not predicted';
  if (result === 'team_a') return `${match.team_a} wins`;
  if (result === 'team_b') return `${match.team_b} wins`;
  return 'Draw';
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
  if (match.status === 'finished' && prediction?.is_correct === true) return 'Correct';
  if (match.status === 'finished' && prediction?.is_correct === false) return 'Wrong';
  if (prediction && new Date(match.match_date).getTime() <= Date.now()) return 'Locked';
  if (prediction) return 'Predicted';
  if (new Date(match.match_date).getTime() <= Date.now()) return 'Locked';
  return 'Not predicted';
};

export const getAccuracy = (profile) => {
  if (!profile?.total_predictions) return 0;
  return Math.round((profile.correct_predictions / profile.total_predictions) * 100);
};
