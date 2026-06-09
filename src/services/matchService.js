import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';
import { worldCupMatches } from '../data/matches';
import { normalizeMatchPayload, validateUuid } from '../utils/validation';

const sortMatches = (matches) =>
  [...matches].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

export const matchService = {
  async getMatches() {
    if (isDemoMode) {
      const store = localStore.getStore();
      return sortMatches(store.matches?.length ? store.matches : worldCupMatches);
    }

    const { data, error } = await supabase.from('matches').select('*').order('match_date');
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
        match_number: normalizedMatch.match_number || store.matches.length + 1,
        created_at: normalizedMatch.created_at || new Date().toISOString(),
      };
      const matches = store.matches.some((item) => item.id === normalized.id)
        ? store.matches.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...store.matches];
      localStore.saveMatches(sortMatches(matches));
      return normalized;
    }

    const { data, error } = await supabase.from('matches').upsert(normalizedMatch).select('*').single();
    if (error) throw error;
    return data;
  },
  async deleteMatch(matchId) {
    const normalizedMatchId = validateUuid(matchId, 'Match ID');

    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.saveMatches(store.matches.filter((match) => match.id !== normalizedMatchId));
      return;
    }

    const { error } = await supabase.from('matches').delete().eq('id', normalizedMatchId);
    if (error) throw error;
  },
};
