import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';
import { normalizeLeaderboardUser, sortLeaderboardUsers } from '../utils/leaderboard';

const recalculateProfile = (profile, store) => {
  const userPredictions = store.predictions.filter((prediction) => prediction.user_id === profile.id);
  const scored = userPredictions.filter((prediction) => prediction.is_correct !== null);
  const correct = scored.filter((prediction) => prediction.is_correct).length;
  const matchWinnerPoints = userPredictions.reduce((sum, prediction) => sum + (prediction.winner_points ?? 0), 0);
  const exactScorePoints = userPredictions.reduce((sum, prediction) => sum + (prediction.exact_score_points ?? 0), 0);
  const championPrediction = store.championPredictions?.find((prediction) => prediction.user_id === profile.id);
  const championPoints = championPrediction?.points_awarded ?? 0;

  return {
    ...profile,
    total_points: matchWinnerPoints + exactScorePoints + championPoints,
    match_winner_points: matchWinnerPoints,
    exact_score_points: exactScorePoints,
    champion_points: championPoints,
    correct_predictions: correct,
    total_predictions: userPredictions.length,
  };
};

export const profileService = {
  async getProfile(userId) {
    if (!userId) return null;
    if (isDemoMode) {
      const store = localStore.getStore();
      return store.profiles.find((profile) => profile.id === userId) ?? null;
    }

    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data;
  },
  async getLeaderboard() {
    if (isDemoMode) {
      const store = localStore.getStore();
      return sortLeaderboardUsers(store.profiles.map((profile) => recalculateProfile(profile, store)));
    }

    const { data, error } = await supabase
      .from('leaderboard_profiles')
      .select('id, username, total_points, match_winner_points, exact_score_points, champion_points, correct_predictions, total_predictions, created_at')
      .order('total_points', { ascending: false })
      .order('correct_predictions', { ascending: false });

    if (!error) return sortLeaderboardUsers(data ?? []);

    if (/match_winner_points|exact_score_points|champion_points|column .* does not exist/i.test(error.message ?? '')) {
      const { data: legacyData, error: legacyError } = await supabase
        .from('leaderboard_profiles')
        .select('id, username, total_points, correct_predictions, total_predictions, created_at')
        .order('total_points', { ascending: false })
        .order('correct_predictions', { ascending: false });

      if (legacyError) throw legacyError;
      return sortLeaderboardUsers((legacyData ?? []).map(normalizeLeaderboardUser));
    }

    throw error;
  },
  async getAdminStats() {
    if (isDemoMode) {
      const store = localStore.getStore();
      return {
        totalUsers: store.profiles.length,
        totalMatches: store.matches.length,
        totalPredictions: store.predictions.length,
        finishedMatches: store.matches.filter((match) => match.status === 'finished').length,
        upcomingMatches: store.matches.filter((match) => match.status === 'upcoming').length,
      };
    }

    const [profiles, matches, predictions] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('matches').select('id,status', { count: 'exact' }),
      supabase.from('predictions').select('id', { count: 'exact', head: true }),
    ]);

    if (profiles.error) throw profiles.error;
    if (matches.error) throw matches.error;
    if (predictions.error) throw predictions.error;

    const matchRows = matches.data ?? [];

    return {
      totalUsers: profiles.count ?? 0,
      totalMatches: matches.count ?? 0,
      totalPredictions: predictions.count ?? 0,
      finishedMatches: matchRows.filter((match) => match.status === 'finished').length,
      upcomingMatches: matchRows.filter((match) => match.status === 'upcoming').length,
    };
  },
};
