import { calculateTeamGoalStats } from "../utils/teamGoalStats.js";
import {
  calculateTeamPredictionImpact,
  groupPredictionsByMatchId,
} from "../utils/teamPredictionImpact.js";
import {
  buildTeamRegistry,
  getTeamBySlug,
  getTeamMatches,
} from "../utils/teamIdentity.js";
import { calculateTeamTournamentStats } from "../utils/teamTournamentStats.js";
import { matchService } from "./matchService.js";
import { predictionService } from "./predictionService.js";

export const teamService = {
  async getMatches() {
    return matchService.getMatches();
  },

  async getTeamDirectory() {
    const matches = await this.getMatches();
    return buildTeamRegistry(matches);
  },

  async getTeamPageData({ teamSlug, userId }) {
    const matches = await this.getMatches();
    const team = getTeamBySlug(teamSlug, matches);

    if (!team) {
      return null;
    }

    const teamMatches = getTeamMatches(matches, team.name);
    const matchIds = teamMatches.map((match) => match.id);

    let predictions = [];

    if (userId) {
      predictions = await predictionService.getPredictionsForMatchIds(matchIds);
    }

    const predictionsByMatchId = groupPredictionsByMatchId(predictions);

    return {
      team,
      matches: teamMatches,
      predictionsByMatchId,
      tournamentStats: calculateTeamTournamentStats(teamMatches, team.name),
      predictionImpact: calculateTeamPredictionImpact({
        matches: teamMatches,
        team: team.name,
        predictionsByMatchId,
      }),
      goalStats: calculateTeamGoalStats(teamMatches, team.name),
    };
  },

  async getDirectorySummaries({ userId }) {
    const matches = await this.getMatches();
    const teams = buildTeamRegistry(matches);

    let predictions = [];

    if (userId) {
      predictions = await predictionService.getPredictionsForUser(userId);
    }

    const predictionsByMatchId = groupPredictionsByMatchId(predictions);

    return teams.map((team) => {
      const teamMatches = getTeamMatches(matches, team.name);
      const impact = calculateTeamPredictionImpact({
        matches: teamMatches,
        team: team.name,
        predictionsByMatchId,
      });
      const stats = calculateTeamTournamentStats(teamMatches, team.name);

      return {
        ...team,
        stats,
        pointsEarned: impact.pointsEarned,
      };
    });
  },
};
