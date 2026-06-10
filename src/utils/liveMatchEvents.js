const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const normalizeMatchStatus = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const getMatchPhase = (match) => {
  const text = [
    match.status,
    match.period,
    match.game_state,
    match.status_detail,
    match.status_description,
    match.display_status,
  ]
    .map(normalizeMatchStatus)
    .filter(Boolean)
    .join(" ");

  if (
    text.includes("penalties") ||
    text.includes("penalty") ||
    text.includes("shootout") ||
    text.includes("pso")
  ) {
    return "penalties";
  }

  if (
    text.includes("extra time") ||
    text.includes("extratime") ||
    text === "et" ||
    text.includes(" et ")
  ) {
    return "extra_time";
  }

  if (text.includes("half")) return "halftime";
  if (text.includes("live") || text.includes("in progress")) return "live";
  if (text.includes("finished") || text.includes("final")) return "finished";

  return normalizeMatchStatus(match.status);
};

export const detectLiveMatchEvents = ({ previousMatch, nextMatch }) => {
  if (!previousMatch || !nextMatch) return [];

  const events = [];

  const previousHomeScore = toNumber(previousMatch.team_a_score);
  const previousAwayScore = toNumber(previousMatch.team_b_score);
  const nextHomeScore = toNumber(nextMatch.team_a_score);
  const nextAwayScore = toNumber(nextMatch.team_b_score);

  if (nextHomeScore > previousHomeScore) {
    events.push({
      type: "goal",
      team: nextMatch.team_a,
      match: nextMatch,
    });
  }

  if (nextAwayScore > previousAwayScore) {
    events.push({
      type: "goal",
      team: nextMatch.team_b,
      match: nextMatch,
    });
  }

  const previousPhase = getMatchPhase(previousMatch);
  const nextPhase = getMatchPhase(nextMatch);

  if (previousPhase !== nextPhase && nextPhase === "extra_time") {
    events.push({
      type: "extra_time",
      match: nextMatch,
    });
  }

  if (previousPhase !== nextPhase && nextPhase === "penalties") {
    events.push({
      type: "penalties",
      match: nextMatch,
    });
  }

  return events;
};