import { hasRealTeams } from "./matches.js";
import {
  isMatchInLivePhase,
  normalizeMatchDisplayStatus,
} from "./matchDisplay.js";
import { getDashboardMatchWindows } from "./matchWindows.js";

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

export const isSameKickoffMinute = (firstKickoff, secondKickoff) => {
  const firstTime = toTimestamp(firstKickoff);
  const secondTime = toTimestamp(secondKickoff);

  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) {
    return false;
  }

  return Math.floor(firstTime / 60_000) === Math.floor(secondTime / 60_000);
};

const getUpcomingDisplayedMatches = (matches, nowTime) =>
  matches
    .filter((match) => {
      const kickoffTime = toTimestamp(match?.match_date);

      return (
        hasRealTeams(match) &&
        Number.isFinite(kickoffTime) &&
        kickoffTime > nowTime &&
        normalizeMatchDisplayStatus(match?.status) === "upcoming" &&
        !isMatchInLivePhase(match, nowTime)
      );
    })
    .sort(
      (first, second) =>
        toTimestamp(first.match_date) - toTimestamp(second.match_date),
    );

export function getGroupDisplayedMatches(matches = [], now = Date.now()) {
  const { liveMatches } = getDashboardMatchWindows(matches, now);

  if (liveMatches.length > 0) {
    return {
      displayedMatches: liveMatches,
      displayState: "live",
    };
  }

  const nowTime = toTimestamp(now);

  if (!Number.isFinite(nowTime)) {
    return {
      displayedMatches: [],
      displayState: "none",
    };
  }

  const upcomingMatches = getUpcomingDisplayedMatches(matches, nowTime);

  if (!upcomingMatches.length) {
    return {
      displayedMatches: [],
      displayState: "none",
    };
  }

  const earliestKickoff = upcomingMatches[0]?.match_date;
  const displayedMatches = upcomingMatches.filter((match) =>
    isSameKickoffMinute(match.match_date, earliestKickoff),
  );

  return {
    displayedMatches,
    displayState: displayedMatches.length > 1 ? "upcoming-multiple" : "upcoming-single",
  };
}

export function getGroupDisplayedMatchesHeading(displayState, matchCount) {
  if (displayState === "live") {
    return "Member picks for live matches";
  }

  if (matchCount > 1) {
    return "Member picks for the next matches";
  }

  return "Member picks for the next match";
}

const statusLabels = {
  upcoming: "Upcoming",
  live: "Live",
  halftime: "Half time",
  extra_time: "Extra time",
  penalties: "Penalties",
  penalty_shootout: "Penalty shootout",
  finished: "Full time",
};

export function getGroupMatchStatusLabel(match) {
  const normalizedStatus = normalizeMatchDisplayStatus(match?.status);

  if (normalizedStatus === "finished") {
    const detail = String(match?.status_detail ?? "").trim();
    if (detail.toUpperCase() === "FT") return "Full time";
    return detail || "Full time";
  }

  return statusLabels[normalizedStatus] ?? (String(match?.status ?? "").trim() || "Match");
}
