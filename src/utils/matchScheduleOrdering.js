import { formatDate } from "./date.js";

const getKickoffTime = (match) => {
  const time = new Date(match?.match_date).getTime();
  return Number.isFinite(time) ? time : null;
};

export function getMatchSortDirection(statusFilter) {
  return statusFilter === "finished" ? "desc" : "asc";
}

export function compareMatchesByKickoff(
  first,
  second,
  direction = "asc",
) {
  const firstTime = getKickoffTime(first);
  const secondTime = getKickoffTime(second);

  if (firstTime === null && secondTime === null) {
    return 0;
  }

  if (firstTime === null) {
    return 1;
  }

  if (secondTime === null) {
    return -1;
  }

  return direction === "desc" ? secondTime - firstTime : firstTime - secondTime;
}

export function sortMatchesForStatus(matches = [], statusFilter = "upcoming") {
  const direction = getMatchSortDirection(statusFilter);

  return [...matches].sort((first, second) =>
    compareMatchesByKickoff(first, second, direction),
  );
}

export function groupMatchesByDate(matches = []) {
  const grouped = new Map();

  matches.forEach((match) => {
    const key = formatDate(match.match_date);

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key).push(match);
  });

  return Array.from(grouped.entries()).map(([dateLabel, dateMatches]) => ({
    dateLabel,
    matches: dateMatches,
  }));
}
