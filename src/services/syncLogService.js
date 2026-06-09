import { isDemoMode, supabase } from './supabaseClient';

export const syncLogService = {
  async getLatestAdminSyncLog() {
    if (isDemoMode || !supabase) return null;

    const { data, error } = await supabase
      .from('sync_logs')
      .select(
        'provider, fallback_used, status, started_at, finished_at, inserted_count, updated_count, unchanged_count, recalculated_count, failed_count, error_message, created_at',
      )
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getLatestSuccessfulSync() {
    if (isDemoMode || !supabase) return null;

    const { data, error } = await supabase
      .from('latest_successful_sync')
      .select(
        'provider, fallback_used, started_at, finished_at, inserted_count, updated_count, unchanged_count, recalculated_count, failed_count, created_at',
      )
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};
