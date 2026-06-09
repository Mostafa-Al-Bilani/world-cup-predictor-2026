export const OPENFOOTBALL_2026_FIXTURES_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

export const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
export const API_FOOTBALL_WORLD_CUP_LEAGUE_ID = 1;
export const API_FOOTBALL_WORLD_CUP_SEASON = 2026;

const TEAM_NAME_OVERRIDES = {
  USA: 'United States',
  Turkey: 'Türkiye',
  'Czech Republic': 'Czechia',
  'IR Iran': 'Iran',
  'Korea Republic': 'South Korea',
};

const HOST_COUNTRY_MARKERS = [
  { marker: 'Mexico City', country: 'Mexico' },
  { marker: 'Guadalajara', country: 'Mexico' },
  { marker: 'Monterrey', country: 'Mexico' },
  { marker: 'Toronto', country: 'Canada' },
  { marker: 'Vancouver', country: 'Canada' },
];

const FINISHED_STATUS_CODES = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUS_CODES = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT']);

const safeString = (value) => String(value ?? '').trim();

export const slugifyFixtureValue = (value) =>
  safeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeName = (value) => {
  const name = safeString(value);
  if (!name) return 'TBD';
  return TEAM_NAME_OVERRIDES[name] ?? name;
};

const normalizeStage = (value) => {
  const stage = safeString(value);
  if (stage === 'Match for third place') return 'Third Place';
  return stage || 'Group stage';
};

const getCity = (ground = '') => {
  const normalized = safeString(ground);
  const match = normalized.match(/\(([^)]+)\)/);
  if (match?.[1]) return match[1];
  if (normalized.includes('/')) return normalized.split('/').at(-1).trim();
  return normalized;
};

const getHostCountry = (ground = '') =>
  HOST_COUNTRY_MARKERS.find((item) => safeString(ground).includes(item.marker))?.country ?? 'USA';

const readNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getMatchResultFromScores = (teamAScore, teamBScore) => {
  if (teamAScore === null || teamAScore === undefined || teamBScore === null || teamBScore === undefined) {
    return null;
  }
  if (Number(teamAScore) > Number(teamBScore)) return 'team_a';
  if (Number(teamAScore) < Number(teamBScore)) return 'team_b';
  return 'draw';
};

const readOpenFootballScore = (fixture) => {
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

const normalizeOpenFootballStatus = (fixture, hasScore) => {
  const status = safeString(fixture.status).toLowerCase();
  if (hasScore || ['finished', 'played', 'complete', 'completed'].includes(status)) return 'finished';
  if (['live', 'in_progress', 'in progress'].includes(status)) return 'live';
  return 'upcoming';
};

const parseOpenFootballKickoff = ({ date, time }) => {
  const [year, month, day] = safeString(date).split('-').map(Number);
  const match = safeString(time || '00:00 UTC').match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]?\d{1,2})?)?$/);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return new Date().toISOString();
  }

  if (!match) {
    return new Date(`${date}T00:00:00Z`).toISOString();
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const offsetHours = match[3] ? Number(match[3]) : 0;
  return new Date(Date.UTC(year, month - 1, day, hours - offsetHours, minutes)).toISOString();
};

export const fixtureFingerprint = (match) =>
  [safeString(match.match_date).slice(0, 10), match.team_a, match.team_b]
    .map((value) => safeString(value).toLowerCase().replace(/[^a-z0-9]+/g, ''))
    .join('|');

const comparableDate = (value) => (value ? new Date(value).toISOString() : null);

const isMeaningfulText = (value) => {
  const text = safeString(value);
  return text !== '' && text.toLowerCase() !== 'null' && text.toLowerCase() !== 'undefined';
};

const mergeText = (nextValue, existingValue, fallback = null) => {
  if (isMeaningfulText(nextValue)) {
    const next = safeString(nextValue);
    const existing = safeString(existingValue);
    if (next === 'TBD' && existing && existing !== 'TBD') return existingValue;
    return nextValue;
  }
  return existingValue ?? fallback;
};

const mergeNumber = (nextValue, existingValue) => (nextValue === null || nextValue === undefined ? existingValue ?? null : nextValue);

export const hasMatchChanged = (existing, next) => {
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
    'provider_name',
    'provider_fixture_id',
  ];

  if (comparableDate(existing.match_date) !== comparableDate(next.match_date)) return true;
  return fields.some((field) => (existing[field] ?? null) !== (next[field] ?? null));
};

export const getChangedFields = (existing, next) => {
  const fields = [
    'match_number',
    'team_a',
    'team_b',
    'match_date',
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
    'provider_name',
    'provider_fixture_id',
  ];

  return fields.filter((field) => {
    if (field === 'match_date') return comparableDate(existing[field]) !== comparableDate(next[field]);
    return (existing[field] ?? null) !== (next[field] ?? null);
  });
};

export const normalizeOpenFootballFixtures = (rawMatches) =>
  rawMatches
    .map((fixture, originalIndex) => {
      const score = readOpenFootballScore(fixture);
      const teamA = normalizeName(fixture.team1);
      const teamB = normalizeName(fixture.team2);
      const stage = normalizeStage(fixture.group ?? fixture.round);
      const matchDate = parseOpenFootballKickoff(fixture);
      const ground = fixture.ground ?? fixture.venue ?? '';
      const sourceNumber = readNumber(fixture.num ?? fixture.match_number);

      return {
        originalIndex,
        sourceNumber,
        provider_name: 'openfootball',
        provider_fixture_id: sourceNumber ? String(sourceNumber) : null,
        team_a: teamA,
        team_b: teamB,
        match_date: matchDate,
        stage,
        status: normalizeOpenFootballStatus(fixture, score.hasScore),
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
        provider_fixture_id: fixture.provider_fixture_id ?? String(matchNumber),
        external_ref: `openfootball-2026-${matchNumber}`,
        api_slug: slugifyFixtureValue(`${fixture.stage}-${matchNumber}-${fixture.team_a}-${fixture.team_b}`),
      };
    });

const normalizeApiFootballStatus = (fixtureStatus) => {
  const code = safeString(fixtureStatus?.short).toUpperCase();
  if (FINISHED_STATUS_CODES.has(code)) return 'finished';
  if (LIVE_STATUS_CODES.has(code)) return 'live';
  return 'upcoming';
};

const readApiFootballScore = (fixture, status) => {
  const scoreHome = readNumber(fixture.goals?.home ?? fixture.score?.fulltime?.home);
  const scoreAway = readNumber(fixture.goals?.away ?? fixture.score?.fulltime?.away);
  const hasScore = scoreHome !== null && scoreAway !== null;
  const isFinished = status === 'finished';

  return {
    hasScore,
    team_a_score: hasScore ? scoreHome : null,
    team_b_score: hasScore ? scoreAway : null,
    result: hasScore && isFinished ? getMatchResultFromScores(scoreHome, scoreAway) : null,
  };
};

export const normalizeApiFootballFixtures = (rawFixtures) =>
  rawFixtures
    .map((fixture, originalIndex) => {
      const status = normalizeApiFootballStatus(fixture.fixture?.status);
      const score = readApiFootballScore(fixture, status);
      const fixtureId = fixture.fixture?.id ? String(fixture.fixture.id) : null;
      const matchDate = fixture.fixture?.date ? new Date(fixture.fixture.date).toISOString() : new Date().toISOString();
      const teamA = normalizeName(fixture.teams?.home?.name);
      const teamB = normalizeName(fixture.teams?.away?.name);
      const stage = normalizeStage(fixture.league?.round);
      const venue = fixture.fixture?.venue?.name ?? '';
      const city = fixture.fixture?.venue?.city ?? '';

      return {
        originalIndex,
        sourceNumber: null,
        match_number: null,
        provider_name: 'api-football',
        provider_fixture_id: fixtureId,
        team_a: teamA,
        team_b: teamB,
        match_date: matchDate,
        stage,
        status,
        team_a_score: score.team_a_score,
        team_b_score: score.team_b_score,
        result: score.result,
        venue,
        city,
        host_country: getHostCountry(`${venue} ${city}`),
        hasScore: score.hasScore,
        external_ref: fixtureId ? `api-football-2026-${fixtureId}` : null,
        api_slug: slugifyFixtureValue(`${stage}-${fixtureId ?? originalIndex + 1}-${teamA}-${teamB}`),
      };
    })
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime() || a.originalIndex - b.originalIndex);

export const buildFixtureLookupMaps = (matches) => ({
  byProvider: new Map(
    matches
      .filter((match) => match.provider_name && match.provider_fixture_id)
      .map((match) => [`${match.provider_name}:${match.provider_fixture_id}`, match]),
  ),
  byExternalRef: new Map(matches.filter((match) => match.external_ref).map((match) => [match.external_ref, match])),
  byMatchNumber: new Map(matches.filter((match) => match.match_number).map((match) => [match.match_number, match])),
  byFingerprint: new Map(matches.map((match) => [fixtureFingerprint(match), match])),
});

export const findExistingMatchForFixture = (fixture, maps) =>
  (fixture.provider_name && fixture.provider_fixture_id
    ? maps.byProvider.get(`${fixture.provider_name}:${fixture.provider_fixture_id}`)
    : null) ??
  (fixture.external_ref ? maps.byExternalRef.get(fixture.external_ref) : null) ??
  (fixture.match_number ? maps.byMatchNumber.get(fixture.match_number) : null) ??
  maps.byFingerprint.get(fixtureFingerprint(fixture));

export const buildMatchPayload = (fixture, existing, syncedAt = new Date().toISOString()) => {
  const existingFinished = existing?.status === 'finished';
  const providerHasFinalScore = fixture.status === 'finished' && fixture.hasScore && fixture.result;
  const shouldKeepExistingFinal = existingFinished && !providerHasFinalScore;

  return {
    match_number: mergeNumber(fixture.match_number, existing?.match_number),
    team_a: mergeText(fixture.team_a, existing?.team_a, 'TBD'),
    team_b: mergeText(fixture.team_b, existing?.team_b, 'TBD'),
    match_date: fixture.match_date ?? existing?.match_date,
    stage: mergeText(fixture.stage, existing?.stage, 'Group stage'),
    status: shouldKeepExistingFinal ? existing.status : fixture.status,
    team_a_score: fixture.hasScore ? fixture.team_a_score : existing?.team_a_score ?? null,
    team_b_score: fixture.hasScore ? fixture.team_b_score : existing?.team_b_score ?? null,
    result: providerHasFinalScore ? fixture.result : existing?.result ?? null,
    venue: mergeText(fixture.venue, existing?.venue),
    city: mergeText(fixture.city, existing?.city),
    host_country: mergeText(fixture.host_country, existing?.host_country),
    external_ref: mergeText(fixture.external_ref, existing?.external_ref),
    api_slug: mergeText(fixture.api_slug, existing?.api_slug),
    provider_name: mergeText(fixture.provider_name, existing?.provider_name),
    provider_fixture_id: mergeText(fixture.provider_fixture_id, existing?.provider_fixture_id),
    last_synced_at: syncedAt,
  };
};

export const shouldRecalculateMatch = (existing, next) => {
  if (next.status !== 'finished' || !next.result) return false;
  if (!existing) return true;

  return ['status', 'team_a_score', 'team_b_score', 'result'].some((field) => (existing[field] ?? null) !== (next[field] ?? null));
};
