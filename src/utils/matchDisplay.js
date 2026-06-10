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

export const getLivePhaseLabel = (match) => {
  const status = normalizeMatchDisplayStatus(match?.status);

  if (status === "extra_time") return "ET";

  if (status === "penalties" || status === "penalty_shootout") {
    return "PEN";
  }

  if (status === "live" && match?.elapsed) {
    return `${match.elapsed} min`;
  }

  return "";
};

export const getLivePhaseClassName = (match) => {
  const status = normalizeMatchDisplayStatus(match?.status);

  if (status === "extra_time") return "text-amber-200";

  if (status === "penalties" || status === "penalty_shootout") {
    return "text-rose-200";
  }

  return "text-emerald-200";
};