#!/usr/bin/env node
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import {
  ESPN_WORLD_CUP_DATE_RANGE,
  ESPN_WORLD_CUP_EVENT_LIMIT,
  ESPN_WORLD_CUP_SCOREBOARD_URL,
  OPENFOOTBALL_2026_FIXTURES_URL,
  buildFixtureLookupMaps,
  buildMatchPayload,
  findExistingMatchForFixture,
  getDeletableDuplicateMatchIdsForFixture,
  hasMatchChanged,
  normalizeEspnFixtures,
  normalizeOpenFootballFixtures,
  shouldRecalculateMatch,
} from '../src/services/fixtureNormalizer.js';

const REQUIRED_PROVIDERS = new Set(['espn', 'openfootball']);

const env = process.env;

const parseCliOptions = () => {
  const options = {
    dryRun: false,
    provider: null,
  };

  process.argv.slice(2).forEach((arg, index, args) => {
    if (arg === '--dry-run') {
      options.dryRun = true;
    }

    if (arg === '--provider') {
      options.provider = args[index + 1] ?? null;
    }

    if (arg.startsWith('--provider=')) {
      options.provider = arg.split('=').at(1) ?? null;
    }
  });

  return options;
};

const cliOptions = parseCliOptions();

const requireEnv = (name) => {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const readProvider = () => {
  const provider = (cliOptions.provider || env.FIXTURE_PROVIDER || 'espn').trim().toLowerCase();
  if (!REQUIRED_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported FIXTURE_PROVIDER "${provider}". Use "espn" or "openfootball".`);
  }
  return provider;
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url.origin}${url.pathname}: HTTP ${response.status}`);
  }
  return response.json();
};

const fetchEspnFixtures = async () => {
  const url = new URL(ESPN_WORLD_CUP_SCOREBOARD_URL);
  url.searchParams.set('limit', String(env.ESPN_SCOREBOARD_LIMIT || ESPN_WORLD_CUP_EVENT_LIMIT));
  url.searchParams.set('dates', env.ESPN_WORLD_CUP_DATES || ESPN_WORLD_CUP_DATE_RANGE);

  const payload = await fetchJson(url);
  if (!Array.isArray(payload.events) || payload.events.length === 0) {
    throw new Error('ESPN returned no World Cup 2026 events.');
  }

  return normalizeEspnFixtures(payload.events);
};

const fetchOpenFootballFixtures = async () => {
  const payload = await fetchJson(new URL(OPENFOOTBALL_2026_FIXTURES_URL));
  if (!Array.isArray(payload.matches)) {
    throw new Error('openfootball fixture file did not contain a matches array.');
  }
  return normalizeOpenFootballFixtures(payload.matches);
};

const fetchFixtures = async (provider) => {
  if (provider === 'openfootball') {
    return {
      fixtures: await fetchOpenFootballFixtures(),
      providerUsed: 'openfootball',
      fallbackUsed: false,
      providerError: null,
    };
  }

  try {
    return {
      fixtures: await fetchEspnFixtures(),
      providerUsed: 'espn',
      fallbackUsed: false,
      providerError: null,
    };
  } catch (error) {
    const fixtures = await fetchOpenFootballFixtures();

    return {
      fixtures,
      providerUsed: 'openfootball',
      fallbackUsed: true,
      providerError: error.message ?? 'ESPN provider failed.',
    };
  }
};

const insertSyncLog = async (supabase, summary) => {
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

const recalculateMatches = async (supabase, matchIds) => {
  let recalculated = 0;
  let failed = 0;
  const failures = [];

  for (const matchId of matchIds) {
    const { error } = await supabase.rpc('recalculate_match_points', { target_match_id: matchId });
    if (error) {
      failed += 1;
      failures.push(`${matchId}: ${error.message}`);
    } else {
      recalculated += 1;
    }
  }

  return { recalculated, failed, failures };
};

const recalculateStagePredictions = async (supabase) => {
  const { data, error } = await supabase.rpc('recalculate_stage_prediction_points', { target_stage: null });

  if (!error) {
    return { recalculated: Number(data ?? 0), failed: 0, failures: [] };
  }

  if (/recalculate_stage_prediction_points|schema cache|function .* does not exist/i.test(error.message ?? '')) {
    return { recalculated: 0, failed: 0, failures: [] };
  }

  return { recalculated: 0, failed: 1, failures: [`stage predictions: ${error.message}`] };
};

const getPredictionCountsByMatch = async (supabase) => {
  const { data, error } = await supabase.from('predictions').select('match_id');
  if (error) throw error;

  return (data ?? []).reduce((counts, prediction) => {
    counts.set(prediction.match_id, (counts.get(prediction.match_id) ?? 0) + 1);
    return counts;
  }, new Map());
};

const dryRunFixtures = async () => {
  const startedAt = new Date().toISOString();
  const provider = readProvider();
  const { fixtures, providerUsed, fallbackUsed, providerError } = await fetchFixtures(provider);
  const sortedFixtures = [...fixtures].sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime());

  return {
    provider_used: providerUsed,
    fallback_used: fallbackUsed,
    status: 'success',
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    total: fixtures.length,
    first_match: sortedFixtures[0]
      ? `${sortedFixtures[0].team_a} vs ${sortedFixtures[0].team_b} (${sortedFixtures[0].match_date})`
      : null,
    last_match: sortedFixtures.at(-1)
      ? `${sortedFixtures.at(-1).team_a} vs ${sortedFixtures.at(-1).team_b} (${sortedFixtures.at(-1).match_date})`
      : null,
    error_message: providerError ? `Fallback used because primary provider failed: ${providerError}` : null,
  };
};

const syncFixtures = async () => {
  const startedAt = new Date().toISOString();
  const supabaseUrl = requireEnv('SUPABASE_URL');
  const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const provider = readProvider();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const { fixtures, providerUsed, fallbackUsed, providerError } = await fetchFixtures(provider);
    const { data: existingMatches, error: loadError } = await supabase.from('matches').select('*');
    if (loadError) throw loadError;

    const predictionCounts = await getPredictionCountsByMatch(supabase);
    const matchesWithPredictionCounts = (existingMatches ?? []).map((match) => ({
      ...match,
      prediction_count: predictionCounts.get(match.id) ?? 0,
    }));
    const maps = buildFixtureLookupMaps(matchesWithPredictionCounts);
    const inserts = [];
    const updates = [];
    const duplicateDeleteIds = new Set();
    const recalculateIds = new Set();
    const syncedAt = new Date().toISOString();

    for (const fixture of fixtures) {
      const existing = findExistingMatchForFixture(fixture, maps);
      const payload = buildMatchPayload(fixture, existing, syncedAt);

      if (!existing) {
        inserts.push(payload);
        continue;
      }

      getDeletableDuplicateMatchIdsForFixture(fixture, maps, existing.id).forEach((id) => duplicateDeleteIds.add(id));

      const update = { ...payload, id: existing.id };
      if (hasMatchChanged(existing, update)) {
        updates.push(update);
        if (shouldRecalculateMatch(existing, update)) {
          recalculateIds.add(existing.id);
        }
      }
    }

    if (duplicateDeleteIds.size) {
      const { error } = await supabase.from('matches').delete().in('id', [...duplicateDeleteIds]);
      if (error) throw error;
    }

    if (updates.length) {
      const { error } = await supabase.from('matches').upsert(updates, { onConflict: 'id' });
      if (error) throw error;
    }

    if (inserts.length) {
      const { error } = await supabase.from('matches').insert(inserts);
      if (error) throw error;
    }

    const recalculateSummary = await recalculateMatches(supabase, [...recalculateIds]);
    const stageRecalculateSummary = await recalculateStagePredictions(supabase);
    const finishedAt = new Date().toISOString();
    const failedCount = recalculateSummary.failed + stageRecalculateSummary.failed;
    const errorMessage = [
      providerError && `Fallback used because primary provider failed: ${providerError}`,
      ...recalculateSummary.failures,
      ...stageRecalculateSummary.failures,
    ]
      .filter(Boolean)
      .join(' | ');

    const summary = {
      provider_used: providerUsed,
      fallback_used: fallbackUsed,
      status: failedCount > 0 ? 'error' : 'success',
      started_at: startedAt,
      finished_at: finishedAt,
      inserted_count: inserts.length,
      updated_count: updates.length,
      unchanged_count: fixtures.length - inserts.length - updates.length,
      deduplicated_count: duplicateDeleteIds.size,
      recalculated_count: recalculateSummary.recalculated + stageRecalculateSummary.recalculated,
      failed_count: failedCount,
      error_message: errorMessage || null,
    };

    await insertSyncLog(supabase, summary);
    return summary;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const summary = {
      provider_used: provider,
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
      await insertSyncLog(supabase, summary);
    } catch (logError) {
      console.error(`Could not write sync log: ${logError.message}`);
    }

    throw error;
  }
};

(cliOptions.dryRun ? dryRunFixtures() : syncFixtures())
  .then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status === 'error') {
      process.exitCode = 1;
    }
  })
  .catch((error) => {
    console.error(error.message ?? 'Fixture sync failed.');
    process.exitCode = 1;
  });
