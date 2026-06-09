import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';
import { getAccuracy } from '../utils/predictions';

const recalculateProfile = (profile, predictions) => {
  const userPredictions = predictions.filter((prediction) => prediction.user_id === profile.id);
  const scored = userPredictions.filter((prediction) => prediction.is_correct !== null);
  const correct = scored.filter((prediction) => prediction.is_correct).length;
  return {
    ...profile,
    total_points: userPredictions.reduce((sum, prediction) => sum + (prediction.points_awarded ?? 0), 0),
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
      return store.profiles
        .map((profile) => recalculateProfile(profile, store.predictions))
        .map((profile) => ({ ...profile, accuracy: getAccuracy(profile) }))
        .sort((a, b) => b.total_points - a.total_points);
    }

    const { data, error } = await supabase
      .from('leaderboard_profiles')
      .select('id, username, total_points, correct_predictions, total_predictions, created_at')
      .order('total_points', { ascending: false })
      .order('correct_predictions', { ascending: false });
    if (error) throw error;
    return data.map((profile) => ({ ...profile, accuracy: getAccuracy(profile) }));
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

    return {
      totalUsers: profiles.count ?? 0,
      totalMatches: matches.count ?? 0,
      totalPredictions: predictions.count ?? 0,
      finishedMatches: matches.data.filter((match) => match.status === 'finished').length,
      upcomingMatches: matches.data.filter((match) => match.status === 'upcoming').length,
    };
  },
};
