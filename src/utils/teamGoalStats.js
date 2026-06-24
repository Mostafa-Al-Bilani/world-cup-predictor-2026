import { isMatchInLivePhase, normalizeMatchDisplayStatus } from "./matchDisplay.js";
import {
  GOAL_EVENT_TYPES,
  normalizeMatchGoalEvent,
} from "./matchGoalEvents.js";
import { getTeamSideInMatch, matchInvolvesTeam } from "./teamIdentity.js";

const isFinishedMatch = (match) =>
  normalizeMatchDisplayStatus(match?.status) === "finished";

const isGoalStatsMatch = (match) =>
  isFinishedMatch(match) || isMatchInLivePhase(match);

const isExcludedGoalEvent = (event) =>
  !event ||
  typeof event !== "object" ||
  event.shootout === true ||
  event.scoring_play === false;

const getTeamGoalStatEvents = (match, options = { requirePlayer: false }) => {
  if (!Array.isArray(match?.goal_events)) return [];

  return match.goal_events
    .filter((event) => !isExcludedGoalEvent(event))
    .map((event) => normalizeMatchGoalEvent(event, options))
    .filter(Boolean)
    .sort((first, second) => first.sortClock - second.sortClock);
};

const addScorer = (scorerCounts, playerName) => {
  if (!playerName) return;

  scorerCounts.set(
    playerName,
    (scorerCounts.get(playerName) ?? 0) + 1,
  );
};

const processMatchGoals = ({
  match,
  side,
  totals,
  scorerCounts,
}) => {
  const teamScore = Number(match[`${side}_score`]);
  const opponentScore = Number(
    match[side === "team_a" ? "team_b_score" : "team_a_score"],
  );

  if (!Number.isFinite(teamScore) || !Number.isFinite(opponentScore)) return;

  totals.goalsScored += teamScore;
  totals.goalsConceded += opponentScore;

  getTeamGoalStatEvents(match, { requirePlayer: false }).forEach((event) => {
    if (event.event_type === GOAL_EVENT_TYPES.OWN_GOAL) {
      if (event.side === side) {
        totals.ownGoalsCommitted += 1;
      } else {
        totals.ownGoalBenefits += 1;
      }
      return;
    }

    if (event.side !== side) return;

    if (event.event_type === GOAL_EVENT_TYPES.PENALTY) {
      totals.penaltyGoals += 1;
      addScorer(scorerCounts, event.player_name);
      return;
    }

    totals.openPlayGoals += 1;
    addScorer(scorerCounts, event.player_name);
  });
};

export const calculateTeamGoalStats = (matches = [], team) => {
  const goalStatsMatches = matches.filter(
    (match) => matchInvolvesTeam(match, team) && isGoalStatsMatch(match),
  );

  const totals = {
    goalsScored: 0,
    goalsConceded: 0,
    openPlayGoals: 0,
    penaltyGoals: 0,
    ownGoalBenefits: 0,
    ownGoalsCommitted: 0,
  };
  const scorerCounts = new Map();
  let includesLiveMatch = false;

  goalStatsMatches.forEach((match) => {
    if (isMatchInLivePhase(match)) {
      includesLiveMatch = true;
    }

    const side = getTeamSideInMatch(match, team);
    if (!side) return;

    processMatchGoals({
      match,
      side,
      totals,
      scorerCounts,
    });
  });

  const topScorers = [...scorerCounts.entries()]
    .sort(
      (first, second) =>
        second[1] - first[1] || first[0].localeCompare(second[0]),
    )
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const detailedGoalsAvailable =
    totals.openPlayGoals + totals.penaltyGoals + totals.ownGoalBenefits;
  const hasIncompleteEventData =
    totals.goalsScored > 0 && detailedGoalsAvailable < totals.goalsScored;

  return {
    ...totals,
    topScorers,
    detailedGoalsAvailable,
    hasIncompleteEventData,
    includesLiveMatch,
  };
};
