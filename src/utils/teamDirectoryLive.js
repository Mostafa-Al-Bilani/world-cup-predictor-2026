import { isMatchInLivePhase } from "./matchDisplay.js";
import {
  getOpponentInMatch,
  getTeamMatches,
  getTeamSideInMatch,
  isRealTeam,
} from "./teamIdentity.js";

export const getTeamLiveMatchSummary = (matches = [], team) => {
  const liveMatch = getTeamMatches(matches, team).find(
    (match) => isMatchInLivePhase(match) && isRealTeam(match?.team_a) && isRealTeam(match?.team_b),
  );

  if (!liveMatch) return null;

  const side = getTeamSideInMatch(liveMatch, team);
  if (!side) return null;

  const opponent = getOpponentInMatch(liveMatch, team);
  const teamScore = liveMatch[`${side}_score`] ?? "-";
  const opponentScore =
    liveMatch[side === "team_a" ? "team_b_score" : "team_a_score"] ?? "-";

  return {
    match: liveMatch,
    opponent,
    scoreLabel: `${teamScore}–${opponentScore}`,
  };
};

export const mergeTeamMatchesFromUpdate = (currentMatches = [], allMatches = [], team) => {
  const teamMatchIds = new Set(
    getTeamMatches(allMatches, team).map((match) => match.id),
  );
  const updatedById = new Map(allMatches.map((match) => [match.id, match]));

  return currentMatches.map((match) =>
    teamMatchIds.has(match.id) ? (updatedById.get(match.id) ?? match) : match,
  );
};

export const formatCompactRecord = ({ wins = 0, draws = 0, losses = 0 } = {}) =>
  `${wins}W · ${draws}D · ${losses}L`;

export const formatExpandedRecord = ({ wins = 0, draws = 0, losses = 0 } = {}) =>
  `${wins} wins · ${draws} draws · ${losses} losses`;
