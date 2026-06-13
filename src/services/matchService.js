import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';
import { worldCupMatches } from '../data/matches';
import { normalizeMatchPayload, validateUuid } from '../utils/validation';

const LIVE_POLL_LOOKBACK_MS = 4 * 60 * 60_000;
const LIVE_POLL_LOOKAHEAD_MS = 2 * 60 * 60_000;

const LIVE_POLL_FIELDS = [
  'id',
  'team_a',
  'team_b',
  'match_date',
  'stage',
  'status',
  'team_a_score',
  'team_b_score',
  'result',
  'elapsed',
  'status_detail',
  'goal_events',
  'halftime_team_a_score',
  'halftime_team_b_score',
  'last_synced_at',
].join(',');

const sortMatches = (matches) =>
  [...matches].sort(
    (a, b) =>
      new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
  );

const getLivePollingWindow = (now = Date.now()) => ({
  from: new Date(now - LIVE_POLL_LOOKBACK_MS).toISOString(),
  to: new Date(now + LIVE_POLL_LOOKAHEAD_MS).toISOString(),
});

export const matchService = {
  async getMatches() {
    if (isDemoMode) {
      const store = localStore.getStore();
      return sortMatches(
        store.matches?.length ? store.matches : worldCupMatches,
      );
    }

    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date');

    if (error) throw error;
    return data;
  },

  async getMatchesForLivePolling(now = Date.now()) {
    const { from, to } = getLivePollingWindow(now);

    if (isDemoMode) {
      const store = localStore.getStore();
      const matches = store.matches?.length ? store.matches : worldCupMatches;

      return sortMatches(
        matches.filter((match) => {
          const kickoffTime = new Date(match.match_date).getTime();

          return (
            Number.isFinite(kickoffTime) &&
            kickoffTime >= new Date(from).getTime() &&
            kickoffTime <= new Date(to).getTime()
          );
        }),
      );
    }

    const { data, error } = await supabase
      .from('matches')
      .select(LIVE_POLL_FIELDS)
      .gte('match_date', from)
      .lte('match_date', to)
      .order('match_date');

    if (error) throw error;
    return data;
  },

  async saveMatch(match) {
    const normalizedMatch = normalizeMatchPayload(match);

    if (isDemoMode) {
      const store = localStore.getStore();
      const normalized = {
        ...normalizedMatch,
        id: normalizedMatch.id || crypto.randomUUID(),
        match_number:
          normalizedMatch.match_number || store.matches.length + 1,
        created_at:
          normalizedMatch.created_at || new Date().toISOString(),
      };
      const matches = store.matches.some(
        (item) => item.id === normalized.id,
      )
        ? store.matches.map((item) =>
            item.id === normalized.id ? normalized : item,
          )
        : [normalized, ...store.matches];

      localStore.saveMatches(sortMatches(matches));
      return normalized;
    }

    const { data, error } = await supabase
      .from('matches')
      .upsert(normalizedMatch)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMatch(matchId) {
    const normalizedMatchId = validateUuid(matchId, 'Match ID');

    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.saveMatches(
        store.matches.filter((match) => match.id !== normalizedMatchId),
      );
      return;
    }

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', normalizedMatchId);

    if (error) throw error;
  },
};
