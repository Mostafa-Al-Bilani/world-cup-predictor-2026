#!/usr/bin/env node
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';
import {
  API_FOOTBALL_BASE_URL,
  API_FOOTBALL_WORLD_CUP_LEAGUE_ID,
  API_FOOTBALL_WORLD_CUP_SEASON,
  OPENFOOTBALL_2026_FIXTURES_URL,
  buildFixtureLookupMaps,
  buildMatchPayload,
  findExistingMatchForFixture,
  hasMatchChanged,
  normalizeApiFootballFixtures,
  normalizeOpenFootballFixtures,
  shouldRecalculateMatch,
} from '../src/services/fixtureNormalizer.js';

const REQUIRED_PROVIDERS = new Set(['api-football', 'openfootball']);

const env = process.env;

const requireEnv = (name) => {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const readProvider = () => {
  const provider = (env.FIXTURE_PROVIDER || 'api-football').trim().toLowerCase();
  if (!REQUIRED_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported FIXTURE_PROVIDER "${provider}". Use "api-football" or "openfootball".`);
  }
  return provider;
};

const normalizeBaseUrl = (value) => {
  const raw = (value || API_FOOTBALL_BASE_URL).trim();
  return raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
};

const hasApiErrors = (errors) => {
  if (!errors) return false;
  if (Array.isArray(errors)) return errors.length > 0;
  if (typeof errors === 'object') return Object.keys(errors).length > 0;
  return Boolean(errors);
};

const summarizeApiErrors = (errors) => {
  if (!hasApiErrors(errors)) return null;
  if (typeof errors === 'string') return errors;
  if (Array.isArray(errors)) return errors.join('; ');
  return Object.entries(errors)
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
    .join('; ');
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Fetch failed for ${url.origin}${url.pathname}: HTTP ${response.status}`);
  }
  return response.json();
};

const fetchApiFootballFixtures = async () => {
  const apiKey = requireEnv('FOOTBALL_API_KEY');
  const baseUrl = normalizeBaseUrl(env.FOOTBALL_API_HOST);
  const url = new URL('fixtures', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('league', String(API_FOOTBALL_WORLD_CUP_LEAGUE_ID));
  url.searchParams.set('season', String(API_FOOTBALL_WORLD_CUP_SEASON));

  const payload = await fetchJson(url, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  if (hasApiErrors(payload.errors)) {
    throw new Error(`API-Football returned an error: ${summarizeApiErrors(payload.errors)}`);
  }

  if (!Array.isArray(payload.response) || payload.response.length === 0) {
    throw new Error('API-Football returned no World Cup 2026 fixtures.');
  }

  return normalizeApiFootballFixtures(payload.response);
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
      fixtures: await fetchApiFootballFixtures(),
      providerUsed: 'api-football',
      fallbackUsed: false,
      providerError: null,
    };
  } catch (error) {
    const fixtures = await fetchOpenFootballFixtures();
    return {
      fixtures,
      providerUsed: 'openfootball',
      fallbackUsed: true,
      providerError: error.message ?? 'API-Football provider failed.',
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

    const maps = buildFixtureLookupMaps(existingMatches ?? []);
    const inserts = [];
    const updates = [];
    const recalculateIds = new Set();
    const syncedAt = new Date().toISOString();

    for (const fixture of fixtures) {
      const existing = findExistingMatchForFixture(fixture, maps);
      const payload = buildMatchPayload(fixture, existing, syncedAt);

      if (!existing) {
        inserts.push(payload);
        continue;
      }

      const update = { ...payload, id: existing.id };
      if (hasMatchChanged(existing, update)) {
        updates.push(update);
        if (shouldRecalculateMatch(existing, update)) {
          recalculateIds.add(existing.id);
        }
      }
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
    const finishedAt = new Date().toISOString();
    const failedCount = recalculateSummary.failed;
    const errorMessage = [providerError && `Fallback used because primary provider failed: ${providerError}`, ...recalculateSummary.failures]
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
      recalculated_count: recalculateSummary.recalculated,
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

syncFixtures()
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
