const STAGE_CONFIGS = [
  {
    key: 'round_of_32',
    label: 'Round of 32',
    requiredCount: 32,
    pointsPerTeam: 1,
    description: 'Pick the 32 teams you think will reach the first knockout round.',
  },
  {
    key: 'round_of_16',
    label: 'Round of 16',
    requiredCount: 16,
    pointsPerTeam: 2,
    description: 'Pick the 16 teams you think will survive the Round of 32.',
  },
  {
    key: 'quarter_finals',
    label: 'Quarter-finals',
    requiredCount: 8,
    pointsPerTeam: 3,
    description: 'Pick the 8 teams you think will reach the quarter-finals.',
  },
  {
    key: 'semi_finals',
    label: 'Semi-finals',
    requiredCount: 4,
    pointsPerTeam: 4,
    description: 'Pick the 4 teams you think will reach the semi-finals.',
  },
  {
    key: 'finalists',
    label: 'Finalists',
    requiredCount: 2,
    pointsPerTeam: 5,
    description: 'Pick the 2 teams you think will reach the World Cup final.',
  },
];

export const STAGE_PREDICTION_CONFIGS = STAGE_CONFIGS;

const STAGE_BY_KEY = new Map(STAGE_CONFIGS.map((stage) => [stage.key, stage]));

const PLACEHOLDER_TEAM_PATTERN =
  /^(?:tbd|to be determined|[123][a-l](?:\/[a-l])*|[a-l][123]?|w\d+|l\d+|group\s+[a-l]\s+(?:1st|2nd|3rd)\s+place|round\s+of\s+\d+\s+\d+\s+winner|round\s+of\s+\d+\s+\d+\s+loser|quarterfinal\s+\d+\s+winner|quarterfinal\s+\d+\s+loser|semifinal\s+\d+\s+winner|semifinal\s+\d+\s+loser)$/i;

export const isPlaceholderTeamName = (teamName) => {
  const team = String(teamName ?? '').trim();
  if (!team) return true;
  return PLACEHOLDER_TEAM_PATTERN.test(team);
};

const normalizeComparableText = (value) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bthe\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const getTeamKey = (teamName) => normalizeComparableText(teamName);

export const normalizeStagePredictionStage = (stage) => {
  const raw = String(stage ?? '').trim().toLowerCase();
  if (STAGE_BY_KEY.has(raw)) return raw;

  const normalized = normalizeComparableText(raw);
  if (/round\s+of\s+32/.test(normalized)) return 'round_of_32';
  if (/round\s+of\s+16/.test(normalized)) return 'round_of_16';
  if (/quarter/.test(normalized)) return 'quarter_finals';
  if (/semi/.test(normalized)) return 'semi_finals';
  if (normalized === 'final' || normalized === 'finalists' || normalized === 'finals') return 'finalists';
  return '';
};

export const getStagePredictionConfig = (stage) => STAGE_BY_KEY.get(normalizeStagePredictionStage(stage)) ?? null;

export const normalizeMatchStageToPredictionStage = (stage) => {
  const normalized = normalizeComparableText(stage);
  if (/third/.test(normalized)) return '';
  if (/round\s+of\s+32/.test(normalized)) return 'round_of_32';
  if (/round\s+of\s+16/.test(normalized)) return 'round_of_16';
  if (/quarter/.test(normalized)) return 'quarter_finals';
  if (/semi/.test(normalized)) return 'semi_finals';
  if (normalized === 'final' || normalized === 'finals') return 'finalists';
  return '';
};

export const getStageLockAt = (matches, stage) => {
  const stageKey = normalizeStagePredictionStage(stage);
  const kickoffTimes = (matches ?? [])
    .filter((match) => normalizeMatchStageToPredictionStage(match.stage) === stageKey)
    .map((match) => new Date(match.match_date).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  return kickoffTimes.length ? new Date(kickoffTimes[0]).toISOString() : null;
};

export const isStageLocked = (lockAt, now = Date.now()) => {
  if (!lockAt) return false;
  const timestamp = new Date(lockAt).getTime();
  return Number.isFinite(timestamp) && timestamp <= now;
};

export const getActualTeamsForStage = (matches, stage) => {
  const stageKey = normalizeStagePredictionStage(stage);
  const teams = new Map();

  (matches ?? [])
    .filter((match) => normalizeMatchStageToPredictionStage(match.stage) === stageKey)
    .flatMap((match) => [match.team_a, match.team_b])
    .filter((team) => !isPlaceholderTeamName(team))
    .forEach((team) => {
      const key = getTeamKey(team);
      if (key) teams.set(key, String(team).trim());
    });

  return [...teams.values()].sort((a, b) => a.localeCompare(b));
};

export const validateStageSelection = ({ selectedTeams, stage, availableTeams = [] }) => {
  const config = getStagePredictionConfig(stage);
  if (!config) throw new Error('Choose a valid bracket stage.');

  const selected = (selectedTeams ?? []).map((team) => String(team ?? '').trim()).filter(Boolean);
  if (selected.length !== config.requiredCount) {
    throw new Error(`Select exactly ${config.requiredCount} teams for ${config.label}.`);
  }

  const selectedKeys = selected.map(getTeamKey);
  if (new Set(selectedKeys).size !== selectedKeys.length) {
    throw new Error('Do not select the same team twice.');
  }

  const availableKeys = new Set((availableTeams ?? []).map(getTeamKey));
  if (selected.some((team) => isPlaceholderTeamName(team) || !availableKeys.has(getTeamKey(team)))) {
    throw new Error('Choose teams from the tournament team list.');
  }

  return selected;
};

export const calculateStagePredictionPoints = ({ actualTeams, selectedTeams, stage }) => {
  const config = getStagePredictionConfig(stage);
  if (!config) return { correctCount: 0, correctTeams: [], pointsAwarded: 0, scored: false };

  const actualKeys = new Set((actualTeams ?? []).map(getTeamKey));
  if (actualKeys.size < config.requiredCount) {
    return { correctCount: 0, correctTeams: [], pointsAwarded: 0, scored: false };
  }

  const correctTeams = (selectedTeams ?? []).filter((team) => actualKeys.has(getTeamKey(team)));
  return {
    correctCount: correctTeams.length,
    correctTeams,
    pointsAwarded: correctTeams.length * config.pointsPerTeam,
    scored: true,
  };
};
