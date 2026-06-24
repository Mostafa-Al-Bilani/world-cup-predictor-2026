import test from "node:test";
import assert from "node:assert/strict";

import { calculateTeamGoalStats } from "../src/utils/teamGoalStats.js";

const team = "Brazil";

test("goals for and against come from final scores", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 2,
        team_b_score: 0,
        goal_events: [],
      },
    ],
    team,
  );

  assert.equal(stats.goalsScored, 2);
  assert.equal(stats.goalsConceded, 0);
});

test("classifies open-play penalty and own-goal events", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 3,
        team_b_score: 1,
        goal_events: [
          {
            side: "team_a",
            player: "Vinicius Jr",
            minute: "34'",
          },
          {
            side: "team_a",
            player: "Neymar",
            minute: "55'",
            penalty: true,
          },
          {
            side: "team_b",
            player: "Defender",
            minute: "70'",
            own_goal: true,
          },
          {
            side: "team_a",
            player: "Rodrygo",
            minute: "88'",
          },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.openPlayGoals, 2);
  assert.equal(stats.penaltyGoals, 1);
  assert.equal(stats.ownGoalBenefits, 1);
  assert.equal(stats.ownGoalsCommitted, 0);
});

test("incomplete event data does not reduce official totals", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 2,
        team_b_score: 0,
        goal_events: [
          {
            side: "team_a",
            player: "Vinicius Jr",
            minute: "34'",
          },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.goalsScored, 2);
  assert.equal(stats.hasIncompleteEventData, true);
  assert.equal(stats.detailedGoalsAvailable, 1);
});

test("top scorers exclude own-goal benefits", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 2,
        team_b_score: 0,
        goal_events: [
          {
            side: "team_b",
            player: "Defender",
            minute: "70'",
            own_goal: true,
          },
          {
            side: "team_a",
            player: "Vinicius Jr",
            minute: "34'",
          },
        ],
      },
    ],
    team,
  );

  assert.deepEqual(stats.topScorers, [{ name: "Vinicius Jr", count: 1 }]);
});
