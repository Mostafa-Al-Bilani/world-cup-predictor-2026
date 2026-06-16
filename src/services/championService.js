import { worldCupMatches } from '../data/matches';
import {
  clearPendingChampionPick,
  readPendingChampionPick,
} from '../utils/championPick';
import { isChampionPredictionAlreadyLockedError } from '../utils/championGate';
import { normalizeChampionTeam, validateUuid } from '../utils/validation';
import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';

const PLACEHOLDER_TEAMS = new Set([
  '',
  'TBD',
  'TO BE DETERMINED',
  'N/A',
  'NA',
]);

const PLACEHOLDER_TEAM_PATTERN = /^(?:[123][A-L](?:\/[A-L])*|[A-L][123]?|W\d+|L\d+)$/i;

const normalizeTeamName = (value) => String(value ?? '').trim();

const isSelectableTeam = (value) => {
  const team = normalizeTeamName(value);
  const upperTeam = team.toUpperCase();

  if (!team) return false;
  if (PLACEHOLDER_TEAMS.has(upperTeam)) return false;
  if (PLACEHOLDER_TEAM_PATTERN.test(upperTeam)) return false;
  if (/\d/.test(upperTeam)) return false;
  if (upperTeam.includes('/')) return false;

  return true;
};

const isGroupStageMatch = (match) => {
  const stage = String(match.stage ?? '').toLowerCase();

  return stage.includes('group');
};

const getTeamsFromMatches = (matches) =>
  Array.from(
    new Set(
      matches
        .filter(isGroupStageMatch)
        .flatMap((match) => [match.team_a, match.team_b])
        .map(normalizeTeamName)
        .filter(isSelectableTeam),
    ),
  ).sort((a, b) => a.localeCompare(b));

const isTournamentChampionDecided = (matches) =>
  (matches ?? []).some((match) => {
    if (match.status !== 'finished') return false;
    if (match.match_number === 104) return true;
    return /final/i.test(String(match.stage ?? ''));
  });

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
      const matches = store.matches?.length ? store.matches : worldCupMatches;

      return getTeamsFromMatches(matches);
    }

    const { data, error } = await supabase
      .from('matches')
      .select('team_a,team_b,stage')
      .ilike('stage', 'Group%')
      .order('match_number');

    if (error) throw error;

    const teams = getTeamsFromMatches(data ?? []);

    return teams.length ? teams : getTeamsFromMatches(worldCupMatches);
  },

  async getMyPrediction(userId) {
    if (!userId) return null;

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, 'User ID');
      const store = localStore.getStore();

      return (
        store.championPredictions.find(
          (prediction) => prediction.user_id === normalizedUserId,
        ) ?? null
      );
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

  async areChampionPredictionsOpen() {
    if (isDemoMode) {
      const store = localStore.getStore();
      const matches = store.matches?.length ? store.matches : worldCupMatches;
      return !isTournamentChampionDecided(matches);
    }

    const { data, error } = await supabase
      .from('matches')
      .select('status, stage, match_number')
      .eq('status', 'finished')
      .or('stage.ilike.%final%,match_number.eq.104')
      .limit(5);

    if (error) throw error;

    return !isTournamentChampionDecided(data ?? []);
  },

  async persistMissingChampionPrediction({ userId, email, registrationChampion }) {
    if (!userId) return null;

    const existing = await this.getMyPrediction(userId);
    if (existing) return existing;

    const open = await this.areChampionPredictionsOpen();
    if (!open) return null;

    let team = String(registrationChampion ?? '').trim();
    if (!team) {
      const teams = await this.getAvailableTeams();
      team = readPendingChampionPick(email, teams);
    }

    if (!team) return null;

    try {
      const saved = await this.setPrediction({ userId, predictedTeam: team });
      clearPendingChampionPick();
      return saved;
    } catch (error) {
      if (isChampionPredictionAlreadyLockedError(error)) {
        const locked = await this.getMyPrediction(userId);
        if (locked) {
          clearPendingChampionPick();
        }
        return locked;
      }
      throw error;
    }
  },

  async setPrediction({ userId, predictedTeam }) {
    const team = normalizeChampionTeam(predictedTeam);

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, 'User ID');
      const existing = localStore
        .getStore()
        .championPredictions.find(
          (prediction) =>
            prediction.user_id === normalizedUserId && prediction.locked_at,
        );

      if (existing) {
        throw new Error('World Cup winner prediction is already locked.');
      }

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

    const { data, error } = await supabase.rpc(
      'set_world_cup_winner_prediction',
      { team_name: team },
    );

    if (error) throw error;

    return data;
  },
};