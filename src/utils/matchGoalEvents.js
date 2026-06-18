import { normalizeMatchDisplayStatus } from "./matchDisplay.js";

const readText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

export const GOAL_EVENT_TYPES = {
  GOAL: "goal",
  PENALTY: "penalty",
  OWN_GOAL: "own_goal",
};

const resolveEventType = (event) => {
  if (event?.own_goal === true) return GOAL_EVENT_TYPES.OWN_GOAL;
  if (event?.penalty === true) return GOAL_EVENT_TYPES.PENALTY;
  return GOAL_EVENT_TYPES.GOAL;
};

/** Normalize provider minute strings (e.g. 45'+2' → 45+2'). */
export const formatGoalMinuteDisplay = (minute) => {
  const text = readText(minute);
  if (!text) return null;

  const normalized = text.replace(/(\d)'\+(\d+)'?/g, "$1+$2'");
  if (normalized.endsWith("'")) return normalized;
  if (/\d/.test(normalized)) return `${normalized}'`;
  return normalized;
};

const parseSortClock = (event) => {
  if (typeof event?.clock === "number" && Number.isFinite(event.clock)) {
    return event.clock;
  }

  const minute = readText(event?.minute);
  if (!minute) return Number.POSITIVE_INFINITY;

  const stoppageMatch = minute.match(/(\d+)'\+(\d+)/);
  if (stoppageMatch) {
    return Number(stoppageMatch[1]) * 60 + Number(stoppageMatch[2]);
  }

  const regularMatch = minute.match(/(\d+)/);
  if (regularMatch) return Number(regularMatch[1]) * 60;

  return Number.POSITIVE_INFINITY;
};

/**
 * Normalize a raw `matches.goal_events` entry into structured scorer data.
 * Shootout goals are excluded upstream; entries without player + minute are skipped.
 */
export const normalizeMatchGoalEvent = (event, { requirePlayer = true } = {}) => {
  if (!event || typeof event !== "object") return null;

  const side =
    event.side === "team_a" || event.side === "team_b" ? event.side : null;
  const player = readText(event.player) || null;
  const minute = formatGoalMinuteDisplay(event.minute);

  if (!side || !minute) return null;
  if (requirePlayer && !player) return null;

  const eventType = resolveEventType(event);

  return {
    team_id: side,
    player_name: player,
    minute,
    extra_time: minute.includes("+"),
    event_type: eventType,
    side,
    ownGoal: eventType === GOAL_EVENT_TYPES.OWN_GOAL,
    penalty: eventType === GOAL_EVENT_TYPES.PENALTY,
    sortClock: parseSortClock(event),
  };
};

export const getMatchGoalEvents = (match, options = {}) => {
  if (!Array.isArray(match?.goal_events)) return [];

  return match.goal_events
    .map((event) => normalizeMatchGoalEvent(event, options))
    .filter(Boolean)
    .sort((a, b) => a.sortClock - b.sortClock);
};

/** Scorer row state for completed match cards on the home dashboard. */
export const getCompletedMatchScorerState = (match) => {
  if (normalizeMatchDisplayStatus(match?.status) !== "finished") {
    return null;
  }

  const scoreA = Number(match?.team_a_score);
  const scoreB = Number(match?.team_b_score);

  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
    return null;
  }

  if (scoreA + scoreB === 0) {
    return { kind: "no_goals" };
  }

  const events = getMatchGoalEvents(match, { requirePlayer: true });

  if (!events.length) {
    return { kind: "hidden" };
  }

  return {
    kind: "scorers",
    teamA: events.filter((event) => event.side === "team_a"),
    teamB: events.filter((event) => event.side === "team_b"),
  };
};

export const buildCompactScorerAriaLabel = (event) => {
  const typeLabel =
    event.event_type === GOAL_EVENT_TYPES.OWN_GOAL
      ? "own goal"
      : event.event_type === GOAL_EVENT_TYPES.PENALTY
        ? "penalty goal"
        : "goal";

  return `${event.player_name}, ${event.minute}, ${typeLabel}`;
};
