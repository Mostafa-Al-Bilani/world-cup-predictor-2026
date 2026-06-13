export const normalizeMatchDisplayStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const scoreVisibleStatuses = new Set([
  "finished",
  "live",
  "halftime",
  "extra_time",
  "penalties",
  "penalty_shootout",
]);

export const shouldShowScoreBox = (match) => {
  return scoreVisibleStatuses.has(normalizeMatchDisplayStatus(match?.status));
};

export const livePhaseStatuses = new Set([
  "live",
  "halftime",
  "extra_time",
  "penalties",
  "penalty_shootout",
]);

export const isMatchInLivePhase = (match) =>
  livePhaseStatuses.has(normalizeMatchDisplayStatus(match?.status));

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

  if (status === "live") {
    if (statusDetail) return statusDetail;

    if (match?.elapsed !== null && match?.elapsed !== undefined) {
      return `${match.elapsed} min`;
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