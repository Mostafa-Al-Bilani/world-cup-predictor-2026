import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';
import { worldCupMatches } from '../data/matches';

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
    if (isDemoMode) {
      const store = localStore.getStore();
      const normalized = {
        ...match,
        id: match.id || crypto.randomUUID(),
        match_number: match.match_number || store.matches.length + 1,
        created_at: match.created_at || new Date().toISOString(),
      };
      const matches = store.matches.some((item) => item.id === normalized.id)
        ? store.matches.map((item) => (item.id === normalized.id ? normalized : item))
        : [normalized, ...store.matches];
      localStore.saveMatches(sortMatches(matches));
      return normalized;
    }

    const { data, error } = await supabase.from('matches').upsert(match).select('*').single();
    if (error) throw error;
    return data;
  },
  async deleteMatch(matchId) {
    if (isDemoMode) {
      const store = localStore.getStore();
      localStore.saveMatches(store.matches.filter((match) => match.id !== matchId));
      return;
    }

    const { error } = await supabase.from('matches').delete().eq('id', matchId);
    if (error) throw error;
  },
};
