import { normalizeMatchDisplayStatus } from "./matchDisplay.js";
import {
  getOpponentInMatch,
  getTeamSideInMatch,
  matchInvolvesTeam,
} from "./teamIdentity.js";

const isFinishedMatch = (match) =>
  normalizeMatchDisplayStatus(match?.status) === "finished";

export const calculateTeamTournamentStats = (matches = [], team) => {
  const finishedMatches = matches.filter(
    (match) => matchInvolvesTeam(match, team) && isFinishedMatch(match),
  );

  let played = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  const form = [];

  finishedMatches
    .slice()
    .sort(
      (first, second) =>
        new Date(first.match_date).getTime() -
        new Date(second.match_date).getTime(),
    )
    .forEach((match) => {
      const side = getTeamSideInMatch(match, team);
      if (!side) return;

      const teamScore = Number(match[`${side}_score`]);
      const opponentScore = Number(
        match[side === "team_a" ? "team_b_score" : "team_a_score"],
      );

      if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) {
        return;
      }

      played += 1;
      goalsFor += teamScore;
      goalsAgainst += opponentScore;

      if (teamScore > opponentScore) {
        wins += 1;
        form.push("W");
      } else if (teamScore < opponentScore) {
        losses += 1;
        form.push("L");
      } else {
        draws += 1;
        form.push("D");
      }

      if (opponentScore === 0) {
        cleanSheets += 1;
      }
    });

  const goalDifference = goalsFor - goalsAgainst;
  const averageGoalsPerMatch =
    played > 0 ? Number((goalsFor / played).toFixed(2)) : 0;

  let biggestWin = null;

  finishedMatches.forEach((match) => {
    const side = getTeamSideInMatch(match, team);
    if (!side) return;

    const teamScore = Number(match[`${side}_score`]);
    const opponentScore = Number(
      match[side === "team_a" ? "team_b_score" : "team_a_score"],
    );

    if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) return;
    if (teamScore <= opponentScore) return;

    const margin = teamScore - opponentScore;
    const opponent = getOpponentInMatch(match, team);

    if (
      !biggestWin ||
      margin > biggestWin.margin ||
      (margin === biggestWin.margin && teamScore > biggestWin.teamScore)
    ) {
      biggestWin = {
        margin,
        teamScore,
        opponentScore,
        opponent,
        match,
      };
    }
  });

  return {
    played,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference,
    cleanSheets,
    averageGoalsPerMatch,
    currentForm: form.slice(-5),
    biggestWin,
  };
};
