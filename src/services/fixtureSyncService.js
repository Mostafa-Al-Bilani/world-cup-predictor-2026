import {
  OPENFOOTBALL_2026_FIXTURES_URL,
  buildFixtureLookupMaps,
  buildMatchPayload,
  findExistingMatchForFixture,
  getChangedFields,
  hasMatchChanged,
  normalizeOpenFootballFixtures,
  shouldRecalculateMatch,
} from './fixtureNormalizer';
import { isDemoMode, supabase } from './supabaseClient';

const insertSyncLog = async (summary) => {
  const { error } = await supabase.from('sync_logs').insert({
    provider: summary.provider_used,
    fallback_used: summary.fallback_used,
    status: summary.status,
    started_at: summary.started_at,
    finished_at: summary.finished_at,
    inserted_count: summary.inserted_count,
    updated_count: summary.updated_count,
    unchanged_count: summary.unchanged_count,
    recalculated_count: summary.recalculated_count,
    failed_count: summary.failed_count,
    error_message: summary.error_message,
  });

  if (error) throw error;
};

const recalculateMatches = async (matchIds) => {
  let recalculated = 0;
  let failed = 0;

  for (const matchId of matchIds) {
    const { error } = await supabase.rpc('recalculate_match_points', { target_match_id: matchId });
    if (error) {
      failed += 1;
    } else {
      recalculated += 1;
    }
  }

  return { recalculated, failed };
};

export const fixtureSyncService = {
  async syncOpenFootballFixtures() {
    if (isDemoMode || !supabase) {
      throw new Error('Fixture sync requires Supabase. Add local Supabase environment variables before syncing.');
    }

    const startedAt = new Date().toISOString();

    try {
      const response = await fetch(OPENFOOTBALL_2026_FIXTURES_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Could not fetch openfootball fixtures. Try again in a few minutes.');
      }

      const payload = await response.json();
      if (!Array.isArray(payload.matches)) {
        throw new Error('The openfootball fixture file did not contain a matches array.');
      }

      const fixtures = normalizeOpenFootballFixtures(payload.matches);
      const { data: existingMatches, error: loadError } = await supabase.from('matches').select('*');
      if (loadError) throw loadError;

      const maps = buildFixtureLookupMaps(existingMatches ?? []);
      const inserts = [];
      const updates = [];
      const recalculateIds = new Set();
      const syncedAt = new Date().toISOString();

      fixtures.forEach((fixture) => {
        const existing = findExistingMatchForFixture(fixture, maps);
        const payloadRow = buildMatchPayload(fixture, existing, syncedAt);

        if (!existing) {
          inserts.push(payloadRow);
          return;
        }

        const updateRow = { ...payloadRow, id: existing.id };
        if (hasMatchChanged(existing, updateRow)) {
          updates.push(updateRow);
          if (shouldRecalculateMatch(existing, updateRow)) {
            recalculateIds.add(existing.id);
          }
        }
      });

      if (updates.length) {
        const { error } = await supabase.from('matches').upsert(updates, { onConflict: 'id' });
        if (error) throw error;
      }

      if (inserts.length) {
        const { error } = await supabase.from('matches').insert(inserts);
        if (error) throw error;
      }

      const recalculateSummary = await recalculateMatches([...recalculateIds]);
      const finishedAt = new Date().toISOString();
      const summary = {
        provider_used: 'openfootball',
        fallback_used: false,
        status: recalculateSummary.failed ? 'error' : 'success',
        started_at: startedAt,
        finished_at: finishedAt,
        inserted_count: inserts.length,
        updated_count: updates.length,
        unchanged_count: fixtures.length - inserts.length - updates.length,
        recalculated_count: recalculateSummary.recalculated,
        failed_count: recalculateSummary.failed,
        error_message: recalculateSummary.failed ? 'Some match point recalculations failed.' : null,
        total: fixtures.length,
        inserted: inserts.length,
        updated: updates.length,
        unchanged: fixtures.length - inserts.length - updates.length,
        changed_fields: updates.map((update) => ({
          id: update.id,
          fields: getChangedFields(existingMatches.find((match) => match.id === update.id), update),
        })),
      };

      await insertSyncLog(summary);
      return summary;
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const summary = {
        provider_used: 'openfootball',
        fallback_used: false,
        status: 'error',
        started_at: startedAt,
        finished_at: finishedAt,
        inserted_count: 0,
        updated_count: 0,
        unchanged_count: 0,
        recalculated_count: 0,
        failed_count: 1,
        error_message: error.message ?? 'Fixture sync failed.',
      };

      try {
        await insertSyncLog(summary);
      } catch {
        // The user-facing error below is more useful than a secondary logging failure.
      }

      throw error;
    }
  },
};
