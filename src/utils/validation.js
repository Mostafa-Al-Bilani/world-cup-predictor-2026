export const VALID_PREDICTION_RESULTS = new Set(['team_a', 'draw', 'team_b']);
export const VALID_MATCH_STATUSES = new Set(['upcoming', 'live', 'halftime', 'finished', 'postponed', 'cancelled']);
export const VALID_MATCH_RESULTS = new Set(['team_a', 'draw', 'team_b']);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INVITE_CODE_PATTERN = /^[A-F0-9]{8}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const limits = {
  email: 254,
  username: 40,
  passwordMin: 6,
  groupName: 80,
  groupDescription: 500,
  searchQuery: 80,
  teamName: 80,
  stage: 80,
  venue: 120,
  city: 80,
  hostCountry: 80,
  championTeam: 80,
};

export function normalizeText(value, { label = 'Value', required = false, maxLength = 120 } = {}) {
  const text = String(value ?? '').trim();

  if (required && !text) {
    throw new Error(`${label} is required.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return text;
}

export function validateUuid(value, label = 'ID') {
  const text = String(value ?? '').trim();
  if (!UUID_PATTERN.test(text)) {
    throw new Error(`${label} is invalid.`);
  }
  return text;
}

export function normalizeEmail(value) {
  const email = normalizeText(value, { label: 'Email', required: true, maxLength: limits.email }).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new Error('Enter a valid email address.');
  }
  return email;
}

export function normalizeUsername(value) {
  return normalizeText(value, { label: 'Username', required: true, maxLength: limits.username });
}

export function validatePassword(value, label = 'Password') {
  const password = String(value ?? '');
  if (password.length < limits.passwordMin) {
    throw new Error(`${label} must be at least ${limits.passwordMin} characters.`);
  }
  return password;
}

export function validatePredictionResult(value) {
  if (!VALID_PREDICTION_RESULTS.has(value)) {
    throw new Error('Choose a valid prediction result.');
  }
  return value;
}

export function normalizePredictionScore(value, label) {
  if (value === '' || value === null || value === undefined) return null;

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 99) {
    throw new Error(`${label} must be a non-negative whole number from 0 to 99.`);
  }

  return number;
}

export function normalizePredictionScorePair(homeScore, awayScore) {
  const predictedHomeScore = normalizePredictionScore(homeScore, 'Home team score');
  const predictedAwayScore = normalizePredictionScore(awayScore, 'Away team score');

  if (predictedHomeScore === null || predictedAwayScore === null) {
    throw new Error('Enter both scores before saving your prediction.');
  }

  return {
    predictedHomeScore,
    predictedAwayScore,
  };
}

export function normalizeInviteCode(value) {
  const code = normalizeText(value, { label: 'Invite code', required: true, maxLength: 32 }).toUpperCase();
  if (!INVITE_CODE_PATTERN.test(code)) {
    throw new Error('Invite code must be 8 letters or numbers.');
  }
  return code;
}

export function normalizeChampionTeam(value) {
  return normalizeText(value, { label: 'Champion pick', required: true, maxLength: limits.championTeam });
}

export function normalizeGroupInput({ name, description }) {
  return {
    name: normalizeText(name, { label: 'Group name', required: true, maxLength: limits.groupName }),
    description: normalizeText(description, { label: 'Group description', maxLength: limits.groupDescription }) || null,
  };
}

export function normalizeProfileSearchQuery(value) {
  const query = normalizeText(value, { label: 'Search', required: true, maxLength: limits.searchQuery });
  if (query.length < 2) {
    throw new Error('Search must be at least 2 characters.');
  }
  return query;
}

export function normalizeNonNegativeInteger(value, label) {
  if (value === '' || value === null || value === undefined) return null;

  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 99) {
    throw new Error(`${label} must be a whole number from 0 to 99.`);
  }

  return number;
}

export function normalizeMatchPayload(match) {
  const normalizedId = match.id ? validateUuid(match.id, 'Match ID') : undefined;
  const status = match.status || 'upcoming';
  if (!VALID_MATCH_STATUSES.has(status)) {
    throw new Error('Match status is invalid.');
  }

  const result = match.result || null;
  if (result && !VALID_MATCH_RESULTS.has(result)) {
    throw new Error('Match result is invalid.');
  }

  const matchDate = new Date(match.match_date);
  if (!match.match_date || Number.isNaN(matchDate.getTime())) {
    throw new Error('Match date is invalid.');
  }

  const payload = {
    ...match,
    team_a: normalizeText(match.team_a, { label: 'Home/listed team', required: true, maxLength: limits.teamName }),
    team_b: normalizeText(match.team_b, { label: 'Away/opponent team', required: true, maxLength: limits.teamName }),
    match_date: matchDate.toISOString(),
    stage: normalizeText(match.stage, { label: 'Stage', required: true, maxLength: limits.stage }),
    status,
    team_a_score: normalizeNonNegativeInteger(match.team_a_score, 'Home/listed score'),
    team_b_score: normalizeNonNegativeInteger(match.team_b_score, 'Away/opponent score'),
    result,
    venue: normalizeText(match.venue, { label: 'Venue', maxLength: limits.venue }) || null,
    city: normalizeText(match.city, { label: 'City', maxLength: limits.city }) || null,
    host_country: normalizeText(match.host_country, { label: 'Host country', maxLength: limits.hostCountry }) || null,
  };

  if (normalizedId) {
    payload.id = normalizedId;
  } else {
    delete payload.id;
  }

  return payload;
}
