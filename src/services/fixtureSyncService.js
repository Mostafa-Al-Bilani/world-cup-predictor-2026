import { getMatchResultFromScores } from '../utils/predictions';
import { isDemoMode, supabase } from './supabaseClient';

export const OPENFOOTBALL_2026_FIXTURES_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

const TEAM_NAME_OVERRIDES = {
  USA: 'United States',
  Turkey: 'Türkiye',
  'Czech Republic': 'Czechia',
};

const HOST_COUNTRY_MARKERS = [
  { marker: 'Mexico City', country: 'Mexico' },
  { marker: 'Guadalajara', country: 'Mexico' },
  { marker: 'Monterrey', country: 'Mexico' },
  { marker: 'Toronto', country: 'Canada' },
  { marker: 'Vancouver', country: 'Canada' },
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeName = (value) => TEAM_NAME_OVERRIDES[value] ?? value ?? 'TBD';

const normalizeStage = (value) => {
  if (value === 'Match for third place') return 'Third Place';
  return value ?? 'Group stage';
};

const getCity = (ground = '') => {
  const match = ground.match(/\(([^)]+)\)/);
  if (match?.[1]) return match[1];
  if (ground.includes('/')) return ground.split('/').at(-1).trim();
  return ground.trim();
};

const getHostCountry = (ground = '') =>
  HOST_COUNTRY_MARKERS.find((item) => ground.includes(item.marker))?.country ?? 'USA';

const readNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const readScore = (fixture) => {
  const score = fixture.score ?? {};
  const teamAScore = readNumber(fixture.score1 ?? fixture.team1_score ?? fixture.goals1 ?? score.ft?.[0]);
  const teamBScore = readNumber(fixture.score2 ?? fixture.team2_score ?? fixture.goals2 ?? score.ft?.[1]);

  if (teamAScore === null || teamBScore === null) {
    return { hasScore: false, team_a_score: null, team_b_score: null, result: null };
  }

  return {
    hasScore: true,
    team_a_score: teamAScore,
    team_b_score: teamBScore,
    result: getMatchResultFromScores(teamAScore, teamBScore),
  };
};

const normalizeStatus = (fixture, hasScore) => {
  const status = String(fixture.status ?? '').toLowerCase();
  if (hasScore || ['finished', 'played', 'complete', 'completed'].includes(status)) return 'finished';
  if (['live', 'in_progress', 'in progress'].includes(status)) return 'live';
  return 'upcoming';
};

const parseKickoff = ({ date, time }) => {
  const [year, month, day] = date.split('-').map(Number);
  const match = String(time ?? '00:00 UTC').match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]?\d{1,2})?)?$/);

  if (!match) {
    return new Date(`${date}T00:00:00Z`).toISOString();
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const offsetHours = match[3] ? Number(match[3]) : 0;
  return new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes)).toISOString();
};

const fingerprint = (match) =>
  [match.match_date.slice(0, 10), match.team_a, match.team_b]
    .map((value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .join('|');

const comparableDate = (value) => (value ? new Date(value).toISOString() : null);

const hasChanged = (existing, next) => {
  const fields = [
    'match_number',
    'team_a',
    'team_b',
    'stage',
    'status',
    'team_a_score',
    'team_b_score',
    'result',
    'venue',
    'city',
    'host_country',
    'external_ref',
    'api_slug',
  ];

  if (comparableDate(existing.match_date) !== comparableDate(next.match_date)) return true;
  return fields.some((field) => (existing[field] ?? null) !== (next[field] ?? null));
};

const normalizeFixtures = (rawMatches) =>
  rawMatches
    .map((fixture, originalIndex) => {
      const score = readScore(fixture);
      const teamA = normalizeName(fixture.team1);
      const teamB = normalizeName(fixture.team2);
      const stage = normalizeStage(fixture.group ?? fixture.round);
      const matchDate = parseKickoff(fixture);
      const ground = fixture.ground ?? fixture.venue ?? '';
      const sourceNumber = readNumber(fixture.num ?? fixture.match_number);

      return {
        originalIndex,
        sourceNumber,
        team_a: teamA,
        team_b: teamB,
        match_date: matchDate,
        stage,
        status: normalizeStatus(fixture, score.hasScore),
        team_a_score: score.team_a_score,
        team_b_score: score.team_b_score,
        result: score.result,
        venue: fixture.venue ?? fixture.stadium ?? ground,
        city: fixture.city ?? getCity(ground),
        host_country: fixture.host_country ?? getHostCountry(ground),
        hasScore: score.hasScore,
      };
    })
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime() || a.originalIndex - b.originalIndex)
    .map((fixture, index) => {
      const matchNumber = fixture.sourceNumber ?? index + 1;
      return {
        ...fixture,
        match_number: matchNumber,
        external_ref: `openfootball-2026-${matchNumber}`,
        api_slug: slugify(`${fixture.stage}-${matchNumber}-${fixture.team_a}-${fixture.team_b}`),
      };
    });

const buildLookupMaps = (matches) => ({
  byExternalRef: new Map(matches.filter((match) => match.external_ref).map((match) => [match.external_ref, match])),
  byMatchNumber: new Map(matches.filter((match) => match.match_number).map((match) => [match.match_number, match])),
  byFingerprint: new Map(matches.map((match) => [fingerprint(match), match])),
});

const buildPayload = (fixture, existing) => {
  const base = {
    match_number: fixture.match_number,
    team_a: fixture.team_a,
    team_b: fixture.team_b,
    match_date: fixture.match_date,
    stage: fixture.stage,
    venue: fixture.venue,
    city: fixture.city,
    host_country: fixture.host_country,
    external_ref: fixture.external_ref,
    api_slug: fixture.api_slug,
  };

  if (fixture.hasScore || !existing) {
    return {
      ...base,
      status: fixture.status,
      team_a_score: fixture.team_a_score,
      team_b_score: fixture.team_b_score,
      result: fixture.result,
    };
  }

  return {
    ...base,
    status: existing.status,
    team_a_score: existing.team_a_score,
    team_b_score: existing.team_b_score,
    result: existing.result,
  };
};

export const fixtureSyncService = {
  async syncOpenFootballFixtures() {
    if (isDemoMode || !supabase) {
      throw new Error('Fixture sync requires Supabase. Add local Supabase environment variables before syncing.');
    }

    const response = await fetch(OPENFOOTBALL_2026_FIXTURES_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Could not fetch openfootball fixtures. Try again in a few minutes.');
    }

    const payload = await response.json();
    if (!Array.isArray(payload.matches)) {
      throw new Error('The openfootball fixture file did not contain a matches array.');
    }

    const fixtures = normalizeFixtures(payload.matches);
    const { data: existingMatches, error: loadError } = await supabase.from('matches').select('*');
    if (loadError) throw loadError;

    const maps = buildLookupMaps(existingMatches ?? []);
    const inserts = [];
    const updates = [];

    fixtures.forEach((fixture) => {
      const existing =
        maps.byExternalRef.get(fixture.external_ref) ??
        maps.byMatchNumber.get(fixture.match_number) ??
        maps.byFingerprint.get(fingerprint(fixture));
      const payloadRow = buildPayload(fixture, existing);

      if (!existing) {
        inserts.push(payloadRow);
        return;
      }

      const updateRow = { ...payloadRow, id: existing.id };
      if (hasChanged(existing, updateRow)) {
        updates.push(updateRow);
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

    return {
      inserted: inserts.length,
      updated: updates.length,
      unchanged: fixtures.length - inserts.length - updates.length,
      total: fixtures.length,
    };
  },
};
