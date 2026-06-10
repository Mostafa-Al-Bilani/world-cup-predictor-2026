export const OPENFOOTBALL_2026_FIXTURES_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

export const ESPN_WORLD_CUP_SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';
export const ESPN_WORLD_CUP_DATE_RANGE = '20260611-20260719';
export const ESPN_WORLD_CUP_EVENT_LIMIT = 200;

export const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
export const API_FOOTBALL_WORLD_CUP_LEAGUE_ID = 1;
export const API_FOOTBALL_WORLD_CUP_SEASON = 2026;

const TEAM_NAME_OVERRIDES = {
  USA: 'United States',
  Turkey: 'Türkiye',
  'Czech Republic': 'Czechia',
  'IR Iran': 'Iran',
  'Korea Republic': 'South Korea',
  'Bosnia & Herzegovina': 'Bosnia and Herzegovina',
  'Bosnia-Herzegovina': 'Bosnia and Herzegovina',
};

const HOST_COUNTRY_MARKERS = [
  { marker: 'Mexico City', country: 'Mexico' },
  { marker: 'Guadalajara', country: 'Mexico' },
  { marker: 'Monterrey', country: 'Mexico' },
  { marker: 'Toronto', country: 'Canada' },
  { marker: 'Vancouver', country: 'Canada' },
];

const FINISHED_STATUS_CODES = new Set(['FT', 'AET', 'PEN']);
const HALFTIME_STATUS_CODES = new Set(['HT']);
const LIVE_STATUS_CODES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP']);
const POSTPONED_STATUS_CODES = new Set(['PST']);
const CANCELLED_STATUS_CODES = new Set(['CANC', 'ABD', 'AWD', 'WO']);

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

export const normalizeFixtureTeamKey = (value) =>
  normalizeName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bthe\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const normalizeStage = (value) => {
  const stage = safeString(value);
  if (stage === 'Match for third place') return 'Third Place';
  return stage || 'Group stage';
};

const titleCaseSlug = (value) =>
  safeString(value)
    .split('-')
    .filter(Boolean)
    .map((part) => (part.match(/^\d/) ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(' ');

const getCity = (ground = '') => {
  const normalized = safeString(ground);
  const match = normalized.match(/\(([^)]+)\)/);
  if (match?.[1]) return match[1];
  if (normalized.includes('/')) return normalized.split('/').at(-1).trim();
  return normalized;
};

const getHostCountry = (ground = '') =>
  HOST_COUNTRY_MARKERS.find((item) => safeString(ground).includes(item.marker))?.country ?? 'USA';

const normalizeStageKey = (stage) => {
  const key = slugifyFixtureValue(stage);
  if (key === 'round-of-32') return 'round-of-32';
  if (key === 'round-of-16') return 'round-of-16';
  if (['quarterfinal', 'quarterfinals', 'quarter-final', 'quarter-finals'].includes(key)) return 'quarterfinal';
  if (['semifinal', 'semifinals', 'semi-final', 'semi-finals'].includes(key)) return 'semifinal';
  if (['third-place', '3rd-place-match', 'third-place-match'].includes(key)) return 'third-place';
  if (key === 'final') return 'final';
  return key;
};

const normalizeKickoffMinute = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  date.setUTCSeconds(0, 0);
  return date.toISOString();
};

const normalizeEquivalentStageKey = (stage) => {
  const stageKey = normalizeStageKey(stage);
  return stageKey.startsWith('group') ? 'group' : stageKey;
};

const PLACEHOLDER_TEAM_PATTERN =
  /^(?:tbd|[123][a-l](?:\/[a-l])*|[a-l][123]?|w\d+|l\d+|group\s+[a-l]\s+(?:1st|2nd|3rd)\s+place|round\s+of\s+\d+\s+\d+\s+winner|round\s+of\s+\d+\s+\d+\s+loser|quarterfinal\s+\d+\s+winner|quarterfinal\s+\d+\s+loser|semifinal\s+\d+\s+winner|semifinal\s+\d+\s+loser)$/i;

const isPlaceholderTeam = (value) => {
  const team = safeString(value);
  if (!team) return true;
  return PLACEHOLDER_TEAM_PATTERN.test(team);
};

const isKnockoutPlaceholderFixture = (match) =>
  !normalizeStageKey(match.stage).startsWith('group') && (isPlaceholderTeam(match.team_a) || isPlaceholderTeam(match.team_b));

const fixtureSlotKey = (match) => {
  if (!isKnockoutPlaceholderFixture(match)) return null;
  const kickoff = normalizeKickoffMinute(match.match_date);
  const stage = normalizeStageKey(match.stage);
  return kickoff && stage ? `${kickoff}|${stage}` : null;
};

export const fixtureEquivalentKey = (match) => {
  const kickoff = normalizeKickoffMinute(match.match_date);
  const stage = normalizeEquivalentStageKey(match.stage);
  const teamA = normalizeFixtureTeamKey(match.team_a);
  const teamB = normalizeFixtureTeamKey(match.team_b);
  return kickoff && stage && teamA && teamB ? `${kickoff}|${stage}|${teamA}|${teamB}` : null;
};

const addListMapValue = (map, key, value) => {
  if (!key) return;
  const values = map.get(key) ?? [];
  values.push(value);
  map.set(key, values);
};

const sortPlaceholderCandidates = (fixture, candidates = []) => {
  const providerKey = fixture.provider_name && fixture.provider_fixture_id ? `${fixture.provider_name}:${fixture.provider_fixture_id}` : null;
  return [...candidates].sort((a, b) => {
    const predictionDelta = (b.prediction_count ?? 0) - (a.prediction_count ?? 0);
    if (predictionDelta) return predictionDelta;

    const aProvider = providerKey && `${a.provider_name}:${a.provider_fixture_id}` === providerKey;
    const bProvider = providerKey && `${b.provider_name}:${b.provider_fixture_id}` === providerKey;
    if ((a.prediction_count ?? 0) > 0 || (b.prediction_count ?? 0) > 0) {
      if (aProvider !== bProvider) return Number(bProvider) - Number(aProvider);
    }

    const seededDelta = Number(Boolean(b.match_number)) - Number(Boolean(a.match_number));
    if (seededDelta) return seededDelta;

    return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
  });
};

const readNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const readInteger = (value) => {
  const number = readNumber(value);
  return number === null ? null : Math.trunc(number);
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
  const halftimeTeamAScore = readNumber(fixture.score_ht1 ?? score.ht?.[0]);
  const halftimeTeamBScore = readNumber(fixture.score_ht2 ?? score.ht?.[1]);

  if (teamAScore === null || teamBScore === null) {
    return {
      hasScore: false,
      team_a_score: null,
      team_b_score: null,
      result: null,
      halftime_team_a_score: halftimeTeamAScore,
      halftime_team_b_score: halftimeTeamBScore,
    };
  }

  return {
    hasScore: true,
    team_a_score: teamAScore,
    team_b_score: teamBScore,
    result: getMatchResultFromScores(teamAScore, teamBScore),
    halftime_team_a_score: halftimeTeamAScore,
    halftime_team_b_score: halftimeTeamBScore,
  };
};

const normalizeOpenFootballStatus = (fixture, hasScore) => {
  const status = safeString(fixture.status).toLowerCase();
  if (hasScore || ['finished', 'played', 'complete', 'completed'].includes(status)) return 'finished';
  if (['halftime', 'half-time'].includes(status)) return 'halftime';
  if (['live', 'in_progress', 'in progress'].includes(status)) return 'live';
  if (['postponed'].includes(status)) return 'postponed';
  if (['cancelled', 'canceled', 'abandoned'].includes(status)) return 'cancelled';
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
  [safeString(match.match_date).slice(0, 10), normalizeFixtureTeamKey(match.team_a), normalizeFixtureTeamKey(match.team_b)]
    .map((value) => safeString(value).replace(/[^a-z0-9]+/g, ''))
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

const mergeStage = (nextValue, existingValue) => {
  const nextStage = safeString(nextValue).toLowerCase();
  const existingStage = safeString(existingValue);
  if (nextStage === 'group stage' && /^group\s+[a-z]$/i.test(existingStage)) return existingValue;
  return mergeText(nextValue, existingValue, 'Group stage');
};

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
    'elapsed',
    'status_detail',
    'halftime_team_a_score',
    'halftime_team_b_score',
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
    'elapsed',
    'status_detail',
    'halftime_team_a_score',
    'halftime_team_b_score',
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
        elapsed: readNumber(fixture.elapsed),
        status_detail: fixture.status ?? null,
        halftime_team_a_score: score.halftime_team_a_score,
        halftime_team_b_score: score.halftime_team_b_score,
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
  if (HALFTIME_STATUS_CODES.has(code)) return 'halftime';
  if (LIVE_STATUS_CODES.has(code)) return 'live';
  if (POSTPONED_STATUS_CODES.has(code)) return 'postponed';
  if (CANCELLED_STATUS_CODES.has(code)) return 'cancelled';
  return 'upcoming';
};

const readApiFootballScore = (fixture, status) => {
  const scoreHome = readNumber(fixture.goals?.home ?? fixture.score?.fulltime?.home);
  const scoreAway = readNumber(fixture.goals?.away ?? fixture.score?.fulltime?.away);
  const halftimeHome = readNumber(fixture.score?.halftime?.home);
  const halftimeAway = readNumber(fixture.score?.halftime?.away);
  const hasScore = scoreHome !== null && scoreAway !== null;
  const isFinished = status === 'finished';
  const teamAWon = fixture.teams?.home?.winner === true;
  const teamBWon = fixture.teams?.away?.winner === true;
  let result = null;

  if (hasScore && isFinished) {
    if (teamAWon) result = 'team_a';
    else if (teamBWon) result = 'team_b';
    else result = getMatchResultFromScores(scoreHome, scoreAway);
  }

  return {
    hasScore,
    team_a_score: hasScore ? scoreHome : null,
    team_b_score: hasScore ? scoreAway : null,
    result,
    halftime_team_a_score: halftimeHome,
    halftime_team_b_score: halftimeAway,
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
        elapsed: readNumber(fixture.fixture?.status?.elapsed),
        status_detail: fixture.fixture?.status?.long ?? fixture.fixture?.status?.short ?? null,
        halftime_team_a_score: score.halftime_team_a_score,
        halftime_team_b_score: score.halftime_team_b_score,
        venue,
        city,
        host_country: getHostCountry(`${venue} ${city}`),
        hasScore: score.hasScore,
        external_ref: fixtureId ? `api-football-2026-${fixtureId}` : null,
        api_slug: slugifyFixtureValue(`${stage}-${fixtureId ?? originalIndex + 1}-${teamA}-${teamB}`),
      };
    })
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime() || a.originalIndex - b.originalIndex);

const normalizeEspnStatus = (status) => {
  const type = status?.type ?? {};
  const state = safeString(type.state).toLowerCase();
  const name = safeString(type.name).toUpperCase();
  const description = safeString(type.description).toLowerCase();
  const detail = `${safeString(type.detail)} ${safeString(type.shortDetail)}`.toLowerCase();

  if (type.completed === true || state === 'post' || name.includes('FINAL')) return 'finished';
  if (description.includes('postponed') || name.includes('POSTPONED')) return 'postponed';
  if (description.includes('cancel') || description.includes('abandon') || name.includes('CANCEL') || name.includes('ABANDON')) return 'cancelled';
  if (description.includes('halftime') || detail.includes('half') || name.includes('HALFTIME')) return 'halftime';
  if (state === 'in' || name.includes('IN_PROGRESS') || description.includes('live')) return 'live';
  return 'upcoming';
};

const readEspnElapsed = (status) => {
  const displayClock = safeString(status?.displayClock);
  const displayMatch = displayClock.match(/(\d+)/);
  if (displayMatch) return Number(displayMatch[1]);
  return readInteger(status?.clock);
};

const getEspnCompetitors = (event) => {
  const competitors = event?.competitions?.[0]?.competitors ?? [];
  const home = competitors.find((competitor) => competitor.homeAway === 'home') ?? competitors[0];
  const away = competitors.find((competitor) => competitor.homeAway === 'away') ?? competitors[1];
  return { home, away };
};

const readEspnScore = (home, away, status) => {
  const teamAScore = readInteger(home?.score);
  const teamBScore = readInteger(away?.score);
  const rawHasScore = teamAScore !== null && teamBScore !== null;
  const hasScore = rawHasScore && ['live', 'halftime', 'finished'].includes(status);
  const isFinished = status === 'finished';
  const teamAWon = home?.winner === true;
  const teamBWon = away?.winner === true;
  let result = null;

  if (hasScore && isFinished) {
    if (teamAWon) result = 'team_a';
    else if (teamBWon) result = 'team_b';
    else result = getMatchResultFromScores(teamAScore, teamBScore);
  }

  return {
    hasScore,
    team_a_score: hasScore ? teamAScore : null,
    team_b_score: hasScore ? teamBScore : null,
    result,
    halftime_team_a_score: null,
    halftime_team_b_score: null,
  };
};

export const normalizeEspnFixtures = (rawEvents) =>
  rawEvents
    .map((event, originalIndex) => {
      const competition = event?.competitions?.[0] ?? {};
      const eventStatus = competition.status ?? event.status;
      const status = normalizeEspnStatus(eventStatus);
      const { home, away } = getEspnCompetitors(event);
      const score = readEspnScore(home, away, status);
      const fixtureId = event.id ? String(event.id) : competition.id ? String(competition.id) : null;
      const matchDate = competition.date ?? competition.startDate ?? event.date;
      const stage = normalizeStage(titleCaseSlug(event.season?.slug));
      const venue = competition.venue?.fullName ?? event.venue?.displayName ?? '';
      const city = competition.venue?.address?.city ?? '';
      const hostCountry = competition.venue?.address?.country ?? getHostCountry(`${venue} ${city}`);
      const teamA = normalizeName(home?.team?.displayName ?? home?.team?.name ?? home?.team?.shortDisplayName);
      const teamB = normalizeName(away?.team?.displayName ?? away?.team?.name ?? away?.team?.shortDisplayName);

      return {
        originalIndex,
        sourceNumber: null,
        match_number: null,
        provider_name: 'espn',
        provider_fixture_id: fixtureId,
        team_a: teamA,
        team_b: teamB,
        match_date: matchDate ? new Date(matchDate).toISOString() : new Date().toISOString(),
        stage,
        status,
        team_a_score: score.team_a_score,
        team_b_score: score.team_b_score,
        result: score.result,
        elapsed: readEspnElapsed(eventStatus),
        status_detail:
          eventStatus?.type?.shortDetail ?? eventStatus?.type?.detail ?? eventStatus?.type?.description ?? eventStatus?.type?.name ?? null,
        halftime_team_a_score: score.halftime_team_a_score,
        halftime_team_b_score: score.halftime_team_b_score,
        venue,
        city,
        host_country: hostCountry,
        hasScore: score.hasScore,
        external_ref: fixtureId ? `espn-2026-${fixtureId}` : null,
        api_slug: slugifyFixtureValue(`${stage}-${fixtureId ?? originalIndex + 1}-${teamA}-${teamB}`),
      };
    })
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime() || a.originalIndex - b.originalIndex);

export const buildFixtureLookupMaps = (matches) => {
  const byPlaceholderSlot = new Map();
  const byEquivalentSlot = new Map();
  matches.forEach((match) => addListMapValue(byPlaceholderSlot, fixtureSlotKey(match), match));
  matches.forEach((match) => addListMapValue(byEquivalentSlot, fixtureEquivalentKey(match), match));

  return {
    byProvider: new Map(
      matches
        .filter((match) => match.provider_name && match.provider_fixture_id)
        .map((match) => [`${match.provider_name}:${match.provider_fixture_id}`, match]),
    ),
    byExternalRef: new Map(matches.filter((match) => match.external_ref).map((match) => [match.external_ref, match])),
    byMatchNumber: new Map(matches.filter((match) => match.match_number).map((match) => [match.match_number, match])),
    byFingerprint: new Map(matches.map((match) => [fixtureFingerprint(match), match])),
    byPlaceholderSlot,
    byEquivalentSlot,
  };
};

const findPlaceholderMatchForFixture = (fixture, maps) => {
  const key = fixtureSlotKey(fixture);
  if (!key) return null;
  return sortPlaceholderCandidates(fixture, maps.byPlaceholderSlot.get(key))[0] ?? null;
};

const findEquivalentMatchForFixture = (fixture, maps) => {
  const key = fixtureEquivalentKey(fixture);
  if (!key) return null;
  return sortPlaceholderCandidates(fixture, maps.byEquivalentSlot.get(key))[0] ?? null;
};

export const findExistingMatchForFixture = (fixture, maps) =>
  findPlaceholderMatchForFixture(fixture, maps) ??
  findEquivalentMatchForFixture(fixture, maps) ??
  (fixture.provider_name && fixture.provider_fixture_id
    ? maps.byProvider.get(`${fixture.provider_name}:${fixture.provider_fixture_id}`)
    : null) ??
  (fixture.external_ref ? maps.byExternalRef.get(fixture.external_ref) : null) ??
  (fixture.match_number ? maps.byMatchNumber.get(fixture.match_number) : null) ??
  maps.byFingerprint.get(fixtureFingerprint(fixture));

export const getDeletableDuplicateMatchIdsForFixture = (fixture, maps, canonicalId) => {
  if (!canonicalId) return [];

  const candidatesById = new Map();
  [maps.byPlaceholderSlot.get(fixtureSlotKey(fixture)), maps.byEquivalentSlot.get(fixtureEquivalentKey(fixture))]
    .filter(Boolean)
    .flat()
    .forEach((match) => candidatesById.set(match.id, match));

  return [...candidatesById.values()]
    .filter((match) => match.id !== canonicalId && (match.prediction_count ?? 0) === 0)
    .map((match) => match.id)
    .filter(Boolean);
};

export const buildMatchPayload = (fixture, existing, syncedAt = new Date().toISOString()) => {
  const existingFinished = existing?.status === 'finished';
  const providerHasFinalScore = fixture.status === 'finished' && fixture.hasScore && fixture.result;
  const shouldKeepExistingFinal = existingFinished && !providerHasFinalScore;

  return {
    match_number: mergeNumber(fixture.match_number, existing?.match_number),
    team_a: mergeText(fixture.team_a, existing?.team_a, 'TBD'),
    team_b: mergeText(fixture.team_b, existing?.team_b, 'TBD'),
    match_date: fixture.match_date ?? existing?.match_date,
    stage: mergeStage(fixture.stage, existing?.stage),
    status: shouldKeepExistingFinal ? existing.status : fixture.status,
    team_a_score: shouldKeepExistingFinal ? existing.team_a_score : fixture.hasScore ? fixture.team_a_score : existing?.team_a_score ?? null,
    team_b_score: shouldKeepExistingFinal ? existing.team_b_score : fixture.hasScore ? fixture.team_b_score : existing?.team_b_score ?? null,
    result: providerHasFinalScore ? fixture.result : existing?.result ?? null,
    elapsed: mergeNumber(fixture.elapsed, existing?.elapsed),
    status_detail: mergeText(fixture.status_detail, existing?.status_detail),
    halftime_team_a_score: mergeNumber(fixture.halftime_team_a_score, existing?.halftime_team_a_score),
    halftime_team_b_score: mergeNumber(fixture.halftime_team_b_score, existing?.halftime_team_b_score),
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
