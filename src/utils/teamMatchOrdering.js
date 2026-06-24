import { isMatchInLivePhase, normalizeMatchDisplayStatus } from "./matchDisplay.js";
import {
  getTeamSideInMatch,
  isRealTeam,
  matchInvolvesTeam,
} from "./teamIdentity.js";
import { compareMatchesByKickoff } from "./matchScheduleOrdering.js";

const getKickoffTime = (match) => {
  const time = new Date(match?.match_date).getTime();
  return Number.isFinite(time) ? time : null;
};

export const TEAM_MATCH_FILTERS = {
  ALL: "all",
  LIVE: "live",
  UPCOMING: "upcoming",
  FINISHED: "finished",
};

const isLiveMatch = (match, now) => isMatchInLivePhase(match, now);

const isUpcomingMatch = (match, now) =>
  normalizeMatchDisplayStatus(match?.status) === "upcoming" &&
  !isMatchInLivePhase(match, now) &&
  (getKickoffTime(match) ?? Number.POSITIVE_INFINITY) > now;

const isFinishedMatch = (match) =>
  normalizeMatchDisplayStatus(match?.status) === "finished";

export const filterTeamMatches = ({
  matches = [],
  team,
  filter = TEAM_MATCH_FILTERS.ALL,
  now = Date.now(),
}) => {
  const nowTime = getKickoffTime(new Date(now)) ?? now;

  const eligible = matches.filter(
    (match) =>
      matchInvolvesTeam(match, team) &&
      isRealTeam(match?.team_a) &&
      isRealTeam(match?.team_b),
  );

  if (filter === TEAM_MATCH_FILTERS.LIVE) {
    return eligible.filter((match) => isLiveMatch(match, nowTime));
  }

  if (filter === TEAM_MATCH_FILTERS.UPCOMING) {
    return [...eligible.filter((match) => isUpcomingMatch(match, nowTime))].sort(
      (first, second) => compareMatchesByKickoff(first, second, "asc"),
    );
  }

  if (filter === TEAM_MATCH_FILTERS.FINISHED) {
    return [...eligible.filter(isFinishedMatch)].sort((first, second) =>
      compareMatchesByKickoff(first, second, "desc"),
    );
  }

  const live = eligible.filter((match) => isLiveMatch(match, nowTime));
  const upcoming = eligible
    .filter((match) => isUpcomingMatch(match, nowTime))
    .sort((first, second) => compareMatchesByKickoff(first, second, "asc"));
  const finished = eligible
    .filter(isFinishedMatch)
    .sort((first, second) => compareMatchesByKickoff(first, second, "desc"));

  return [...live, ...upcoming, ...finished];
};

export const getTeamTournamentStatus = ({
  matches = [],
  team,
  now = Date.now(),
}) => {
  const nowTime = getKickoffTime(new Date(now)) ?? now;
  const teamMatches = matches.filter(
    (match) =>
      matchInvolvesTeam(match, team) &&
      isRealTeam(match?.team_a) &&
      isRealTeam(match?.team_b),
  );

  if (!teamMatches.length) return null;

  if (teamMatches.some((match) => isLiveMatch(match, nowTime))) {
    return "Active";
  }

  const upcomingMatches = teamMatches.filter((match) =>
    isUpcomingMatch(match, nowTime),
  );

  if (upcomingMatches.length) {
    const hasKnockoutUpcoming = upcomingMatches.some(
      (match) => !String(match.stage ?? "").toLowerCase().includes("group"),
    );

    return hasKnockoutUpcoming ? "Qualified" : "Active";
  }

  const latestFinished = [...teamMatches]
    .filter(isFinishedMatch)
    .sort((first, second) => compareMatchesByKickoff(first, second, "desc"))[0];

  if (!latestFinished) return "Active";

  const side = getTeamSideInMatch(latestFinished, team);
  if (!side) return "Active";

  const teamScore = Number(latestFinished[`${side}_score`]);
  const opponentScore = Number(
    latestFinished[side === "team_a" ? "team_b_score" : "team_a_score"],
  );
  const isKnockout = !String(latestFinished.stage ?? "")
    .toLowerCase()
    .includes("group");

  if (
    isKnockout &&
    Number.isFinite(teamScore) &&
    Number.isFinite(opponentScore) &&
    teamScore < opponentScore
  ) {
    return "Eliminated";
  }

  return null;
};
