const normalizeStatus = (status) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const COMPACT_PLACEHOLDER_PATTERN =
  /^(?:[123][a-l](?:\/[a-l])*|[a-l][123]?|w\d+|l\d+)$/i;

export function isPlaceholderTeamName(teamName) {
  const text = String(teamName ?? "").trim();
  const normalized = text.toLowerCase();

  if (!normalized) return true;

  if (
    normalized === "tbd" ||
    normalized === "to be determined" ||
    COMPACT_PLACEHOLDER_PATTERN.test(text)
  ) {
    return true;
  }

  return (
    normalized.includes("group ") ||
    normalized.includes("winner") ||
    normalized.includes("loser") ||
    normalized.includes("runner-up") ||
    normalized.includes("runner up") ||
    normalized.includes("1st place") ||
    normalized.includes("2nd place") ||
    normalized.includes("3rd place") ||
    normalized.includes("first place") ||
    normalized.includes("second place") ||
    normalized.includes("third place")
  );
}

export function hasRealTeams(match) {
  return (
    !isPlaceholderTeamName(match?.team_a) &&
    !isPlaceholderTeamName(match?.team_b)
  );
}

export function isMatchOpenForPrediction(match, now = Date.now()) {
  if (!hasRealTeams(match)) return false;
  if (normalizeStatus(match?.status) !== "upcoming") return false;

  const kickoffTime = new Date(match?.match_date).getTime();

  return Number.isFinite(kickoffTime) && kickoffTime > now;
}

export function getMissingPredictionCount({
  matches = [],
  predictions = [],
  now = Date.now(),
}) {
  const predictedMatchIds = new Set(
    predictions
      .map((prediction) => prediction?.match_id)
      .filter(Boolean),
  );

  return matches.filter(
    (match) =>
      isMatchOpenForPrediction(match, now) &&
      !predictedMatchIds.has(match.id),
  ).length;
}
