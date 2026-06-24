import { normalizeMatchDisplayStatus } from "./matchDisplay.js";
import {
  GOAL_EVENT_TYPES,
  getMatchGoalEvents,
} from "./matchGoalEvents.js";
import { getTeamSideInMatch, matchInvolvesTeam } from "./teamIdentity.js";

const isFinishedMatch = (match) =>
  normalizeMatchDisplayStatus(match?.status) === "finished";

export const calculateTeamGoalStats = (matches = [], team) => {
  const finishedMatches = matches.filter(
    (match) => matchInvolvesTeam(match, team) && isFinishedMatch(match),
  );

  let goalsScored = 0;
  let goalsConceded = 0;
  let openPlayGoals = 0;
  let penaltyGoals = 0;
  let ownGoalBenefits = 0;
  let ownGoalsCommitted = 0;
  const scorerCounts = new Map();

  finishedMatches.forEach((match) => {
    const side = getTeamSideInMatch(match, team);
    if (!side) return;

    const teamScore = Number(match[`${side}_score`]);
    const opponentScore = Number(
      match[side === "team_a" ? "team_b_score" : "team_a_score"],
    );

    if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) return;

    goalsScored += teamScore;
    goalsConceded += opponentScore;

    getMatchGoalEvents(match, { requirePlayer: false }).forEach((event) => {
      if (event.event_type === GOAL_EVENT_TYPES.OWN_GOAL) {
        if (event.side === side) {
          ownGoalsCommitted += 1;
        } else {
          ownGoalBenefits += 1;
        }
        return;
      }

      if (event.side !== side) return;

      if (event.event_type === GOAL_EVENT_TYPES.PENALTY) {
        penaltyGoals += 1;
        return;
      }

      openPlayGoals += 1;

      if (event.player_name) {
        scorerCounts.set(
          event.player_name,
          (scorerCounts.get(event.player_name) ?? 0) + 1,
        );
      }
    });
  });

  const topScorers = [...scorerCounts.entries()]
    .sort(
      (first, second) =>
        second[1] - first[1] || first[0].localeCompare(second[0]),
    )
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const detailedGoalsAvailable = openPlayGoals + penaltyGoals + ownGoalBenefits;
  const hasIncompleteEventData =
    goalsScored > 0 && detailedGoalsAvailable < goalsScored;

  return {
    goalsScored,
    goalsConceded,
    openPlayGoals,
    penaltyGoals,
    ownGoalBenefits,
    ownGoalsCommitted,
    topScorers,
    detailedGoalsAvailable,
    hasIncompleteEventData,
  };
};
