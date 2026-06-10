import { getAccuracy } from './predictions.js';

const numberOrZero = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const normalizeLeaderboardUser = (user) => {
  const matchWinnerPoints = numberOrZero(user?.match_winner_points);
  const exactScorePoints = numberOrZero(user?.exact_score_points);
  const championPoints = numberOrZero(user?.champion_points);
  const bracketPoints = numberOrZero(user?.bracket_points);
  const totalPoints = numberOrZero(user?.total_points ?? matchWinnerPoints + exactScorePoints + championPoints + bracketPoints);
  const correctPredictions = numberOrZero(user?.correct_predictions);
  const totalPredictions = numberOrZero(user?.total_predictions);

  return {
    ...user,
    id: user?.id,
    username: String(user?.username || 'Player'),
    total_points: totalPoints,
    match_winner_points: matchWinnerPoints,
    exact_score_points: exactScorePoints,
    champion_points: championPoints,
    bracket_points: bracketPoints,
    correct_predictions: correctPredictions,
    total_predictions: totalPredictions,
    accuracy: getAccuracy({
      correct_predictions: correctPredictions,
      total_predictions: totalPredictions,
    }),
  };
};

export const sortLeaderboardUsers = (users) =>
  (users ?? [])
    .map(normalizeLeaderboardUser)
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points;
      if (b.correct_predictions !== a.correct_predictions) return b.correct_predictions - a.correct_predictions;
      return a.username.localeCompare(b.username);
    });

export const getTopThreeUsers = (users) => sortLeaderboardUsers(users).slice(0, 3);

export const hasScoredLeaderboardEntries = (users) =>
  (users ?? []).some((user) => {
    const normalized = normalizeLeaderboardUser(user);
    return normalized.total_points > 0 || normalized.correct_predictions > 0;
  });
