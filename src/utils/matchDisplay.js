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

const formatStatusDetail = (statusDetail) => {
  const text = String(statusDetail ?? "").trim();

  if (!text) return "";

  const upperText = text.toUpperCase();

  if (upperText === "HT") return "Half time";
  if (upperText === "FT") return "Full time";
  if (upperText === "ET") return "Extra time";
  if (upperText === "PEN") return "Penalties";

  if (/\d/.test(text) && text.includes("'")) {
    return `${text} min`;
  }

  return text;
};

export const getLivePhaseLabel = (match) => {
  const status = normalizeMatchDisplayStatus(match?.status);
  const statusDetail = formatStatusDetail(match?.status_detail);
  const normalizedDetail = String(match?.status_detail ?? "")
    .trim()
    .toUpperCase();

  if (status === "finished") {
    return statusDetail || "Full time";
  }

  if (status === "extra_time") {
    return statusDetail || "Extra time";
  }

  if (status === "penalties" || status === "penalty_shootout") {
    return statusDetail || "Penalties";
  }

  if (status === "halftime" || normalizedDetail === "HT") {
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

  if (status === "extra_time") return "text-amber-200";

  if (status === "penalties" || status === "penalty_shootout") {
    return "text-rose-200";
  }

  return "text-emerald-200";
};