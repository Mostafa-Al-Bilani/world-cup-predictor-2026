/** Max time after kickoff to treat a stale `upcoming` row as live (sync lag fallback). */
export const STARTED_MATCH_FALLBACK_MS = 3 * 60 * 60 * 1000;

const PROVIDER_LIVE_ALIASES = new Set([
  "in_progress",
  "first_half",
  "second_half",
  "status_first_half",
  "status_second_half",
  "status_in_progress",
  "status_live",
]);

const toTimestamp = (value) => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.getTime() : null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

export const normalizeMatchDisplayStatus = (status) => {
  const normalized = String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (PROVIDER_LIVE_ALIASES.has(normalized)) {
    return "live";
  }

  if (normalized === "scheduled" || normalized === "pre") {
    return "upcoming";
  }

  return normalized;
};

export const scoreVisibleStatuses = new Set([
  "finished",
  "live",
  "halftime",
  "extra_time",
  "penalties",
  "penalty_shootout",
]);

export const shouldShowScoreBox = (match) => {
  return (
    scoreVisibleStatuses.has(normalizeMatchDisplayStatus(match?.status)) ||
    isMatchInLivePhase(match)
  );
};

export const livePhaseStatuses = new Set([
  "live",
  "halftime",
  "extra_time",
  "penalties",
  "penalty_shootout",
]);

const hasKickoffStarted = (match, nowTime) => {
  const kickoffTime = toTimestamp(match?.match_date);
  return Number.isFinite(kickoffTime) && kickoffTime <= nowTime;
};

const isWithinStartedFallbackWindow = (match, nowTime) => {
  const kickoffTime = toTimestamp(match?.match_date);
  if (!Number.isFinite(kickoffTime)) return false;

  return (
    kickoffTime <= nowTime &&
    nowTime - kickoffTime <= STARTED_MATCH_FALLBACK_MS
  );
};

/**
 * True when a match should appear in the live dashboard bucket.
 * Live statuses are recognized regardless of kickoff time. When sync lags and a
 * match is still marked `upcoming` or `delayed` after kickoff, treat it as live
 * for a bounded post-kickoff window.
 */
export const isMatchInLivePhase = (match, now = Date.now()) => {
  const nowTime = toTimestamp(now);
  if (!Number.isFinite(nowTime)) return false;

  const status = normalizeMatchDisplayStatus(match?.status);

  if (livePhaseStatuses.has(status)) {
    return true;
  }

  if (
    (status === "upcoming" || status === "delayed") &&
    isWithinStartedFallbackWindow(match, nowTime)
  ) {
    return true;
  }

  return false;
};

const readText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

// Returns the synced goal events (scorer + minute) for a match, but only
// while it is in a live phase. Returns [] otherwise or when no data exists.
export const getLiveGoalEvents = (match) => {
  if (!isMatchInLivePhase(match)) return [];
  if (!Array.isArray(match?.goal_events)) return [];

  return match.goal_events
    .filter((event) => event && typeof event === "object")
    .map((event) => ({
      side:
        event.side === "team_a" || event.side === "team_b" ? event.side : null,
      minute: readText(event.minute) || null,
      player: readText(event.player) || null,
      ownGoal: event.own_goal === true,
      penalty: event.penalty === true,
    }))
    .filter((event) => event.side && (event.player || event.minute));
};

const formatStatusDetail = (statusDetail) => {
  const text = String(statusDetail ?? "").trim();

  if (!text) return "";

  if (text.toUpperCase() === "HT") {
    return "Half time";
  }

  if (/\d/.test(text) && text.includes("'")) {
    return `${text} min`;
  }

  return text;
};

export const getLivePhaseLabel = (match) => {
  const status = normalizeMatchDisplayStatus(match?.status);
  const statusDetail = formatStatusDetail(match?.status_detail);

  if (status === "extra_time") {
    return statusDetail || "ET";
  }

  if (status === "penalties" || status === "penalty_shootout") {
    return statusDetail || "PEN";
  }

  if (status === "halftime") {
    return "Half time";
  }

  if (status === "live" || isMatchInLivePhase(match)) {
    if (statusDetail) return statusDetail;

    if (match?.elapsed !== null && match?.elapsed !== undefined) {
      return `${match.elapsed} min`;
    }

    if (hasKickoffStarted(match, Date.now())) {
      return "Live";
    }
  }

  return "";
};

export const getLivePhaseClassName = (match) => {
  const status = normalizeMatchDisplayStatus(match?.status);

  if (status === "extra_time") {
    return "text-amber-200";
  }

  if (status === "penalties" || status === "penalty_shootout") {
    return "text-rose-200";
  }

  return "text-emerald-200";
};
