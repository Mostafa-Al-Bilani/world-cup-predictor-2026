import { worldCupMatches } from '../data/matches';
import { normalizeChampionTeam, validateUuid } from '../utils/validation';
import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';

const PLACEHOLDER_TEAMS = new Set(['', 'TBD', 'TO BE DETERMINED']);

const normalizeTeamName = (value) => String(value ?? '').trim();

const isSelectableTeam = (value) => {
  const team = normalizeTeamName(value);
  return team && !PLACEHOLDER_TEAMS.has(team.toUpperCase());
};

const getTeamsFromMatches = (matches) =>
  Array.from(
    new Set(
      matches
        .flatMap((match) => [match.team_a, match.team_b])
        .map(normalizeTeamName)
        .filter(isSelectableTeam),
    ),
  ).sort((a, b) => a.localeCompare(b));

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('You must be logged in to choose a World Cup winner.');
  }
  return data.user.id;
};

export const championService = {
  async getAvailableTeams() {
    if (isDemoMode) {
      const store = localStore.getStore();
      return getTeamsFromMatches(store.matches?.length ? store.matches : worldCupMatches);
    }

    const { data, error } = await supabase.from('matches').select('team_a,team_b').order('match_number');
    if (error) throw error;

    const teams = getTeamsFromMatches(data ?? []);
    return teams.length ? teams : getTeamsFromMatches(worldCupMatches);
  },

  async getMyPrediction(userId) {
    if (!userId) return null;

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, 'User ID');
      const store = localStore.getStore();
      return store.championPredictions.find((prediction) => prediction.user_id === normalizedUserId) ?? null;
    }

    const currentUserId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('world_cup_winner_predictions')
      .select('*')
      .eq('user_id', currentUserId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async setPrediction({ userId, predictedTeam }) {
    const team = normalizeChampionTeam(predictedTeam);

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, 'User ID');
      const existing = localStore
        .getStore()
        .championPredictions.find((prediction) => prediction.user_id === normalizedUserId && prediction.locked_at);

      if (existing) throw new Error('World Cup winner prediction is already locked.');

      return localStore.upsertChampionPrediction({
        id: crypto.randomUUID(),
        user_id: normalizedUserId,
        predicted_team: team,
        points_awarded: 0,
        locked_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const { data, error } = await supabase.rpc('set_world_cup_winner_prediction', { team_name: team });
    if (error) throw error;
    return data;
  },
};
