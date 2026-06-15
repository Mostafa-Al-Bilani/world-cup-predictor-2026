import { hasRealTeams } from "./matches.js";
import {
  isMatchInLivePhase,
  normalizeMatchDisplayStatus,
} from "./matchDisplay.js";

export const DASHBOARD_MATCH_WINDOW_MS = 24 * 60 * 60 * 1000;

const toTimestamp = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const getKickoffTime = (match) => toTimestamp(match?.match_date);

const sortByKickoffAsc = (first, second) =>
  first.kickoffTime - second.kickoffTime;

const sortByKickoffDesc = (first, second) =>
  second.kickoffTime - first.kickoffTime;

export function getDashboardMatchWindows(matches = [], now = Date.now()) {
  const nowTime = toTimestamp(now);

  if (!Number.isFinite(nowTime)) {
    return {
      liveMatches: [],
      recentMatches: [],
      nextMatches: [],
    };
  }

  const eligibleMatches = matches
    .map((match) => ({
      match,
      kickoffTime: getKickoffTime(match),
      normalizedStatus: normalizeMatchDisplayStatus(match?.status),
    }))
    .filter(
      ({ match, kickoffTime }) =>
        hasRealTeams(match) && Number.isFinite(kickoffTime),
    );

  const liveMatches = eligibleMatches
    .filter(({ match }) => isMatchInLivePhase(match))
    .sort(sortByKickoffAsc)
    .map(({ match }) => match);

  const liveMatchIds = new Set(
    liveMatches.map((match) => match?.id).filter(Boolean),
  );

  const recentMatches = eligibleMatches
    .filter(
      ({ match, kickoffTime, normalizedStatus }) =>
        normalizedStatus === "finished" &&
        !liveMatchIds.has(match?.id) &&
        kickoffTime >= nowTime - DASHBOARD_MATCH_WINDOW_MS &&
        kickoffTime <= nowTime,
    )
    .sort(sortByKickoffDesc)
    .map(({ match }) => match);

  const nextMatches = eligibleMatches
    .filter(
      ({ kickoffTime, normalizedStatus }) =>
        normalizedStatus === "upcoming" &&
        kickoffTime > nowTime &&
        kickoffTime <= nowTime + DASHBOARD_MATCH_WINDOW_MS,
    )
    .sort(sortByKickoffAsc)
    .map(({ match }) => match);

  return {
    liveMatches,
    recentMatches,
    nextMatches,
  };
}
