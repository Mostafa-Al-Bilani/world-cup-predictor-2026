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
  assert.deepEqual(stats.topScorers, [
    { name: "Neymar", count: 1 },
    { name: "Rodrygo", count: 1 },
    { name: "Vinicius Jr", count: 1 },
  ]);
});

test("combines open-play and penalty goals for the same player in top scorers", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 3,
        team_b_score: 0,
        goal_events: [
          { side: "team_a", player: "Neymar", minute: "12'" },
          { side: "team_a", player: "Neymar", minute: "34'" },
          { side: "team_a", player: "Neymar", minute: "78'", penalty: true },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.openPlayGoals, 2);
  assert.equal(stats.penaltyGoals, 1);
  assert.equal(stats.goalsScored, 3);
  assert.deepEqual(stats.topScorers, [{ name: "Neymar", count: 3 }]);
});

test("penalty scorer appears in top scorers", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 1,
        team_b_score: 0,
        goal_events: [
          { side: "team_a", player: "Casemiro", minute: "90+2'", penalty: true },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.penaltyGoals, 1);
  assert.deepEqual(stats.topScorers, [{ name: "Casemiro", count: 1 }]);
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

test("live match goals and events are included in goal breakdown", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Portugal",
        status: "live",
        team_a_score: 2,
        team_b_score: 0,
        goal_events: [
          { side: "team_a", player: "Rodrygo", minute: "18'" },
          { side: "team_a", player: "Neymar", minute: "44'", penalty: true },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.goalsScored, 2);
  assert.equal(stats.openPlayGoals, 1);
  assert.equal(stats.penaltyGoals, 1);
  assert.equal(stats.includesLiveMatch, true);
  assert.deepEqual(stats.topScorers, [
    { name: "Neymar", count: 1 },
    { name: "Rodrygo", count: 1 },
  ]);
});

test("live penalty goal updates top scorers", () => {
  const liveStats = calculateTeamGoalStats(
    [
      {
        id: "m1",
        team_a: "Brazil",
        team_b: "Portugal",
        status: "live",
        team_a_score: 1,
        team_b_score: 0,
        goal_events: [
          { side: "team_a", player: "Neymar", minute: "55'", penalty: true },
        ],
      },
    ],
    team,
  );

  const updatedLiveStats = calculateTeamGoalStats(
    [
      {
        id: "m1",
        team_a: "Brazil",
        team_b: "Portugal",
        status: "live",
        team_a_score: 2,
        team_b_score: 0,
        goal_events: [
          { side: "team_a", player: "Neymar", minute: "55'", penalty: true },
          { side: "team_a", player: "Rodrygo", minute: "72'" },
        ],
      },
    ],
    team,
  );

  assert.deepEqual(liveStats.topScorers, [{ name: "Neymar", count: 1 }]);
  assert.deepEqual(updatedLiveStats.topScorers, [
    { name: "Neymar", count: 1 },
    { name: "Rodrygo", count: 1 },
  ]);
});

test("live to finished transition does not duplicate scorer totals", () => {
  const liveStats = calculateTeamGoalStats(
    [
      {
        id: "m1",
        team_a: "Brazil",
        team_b: "Portugal",
        status: "live",
        team_a_score: 2,
        team_b_score: 1,
        goal_events: [
          { side: "team_a", player: "Neymar", minute: "55'", penalty: true },
          { side: "team_a", player: "Rodrygo", minute: "72'" },
        ],
      },
    ],
    team,
  );

  const finishedStats = calculateTeamGoalStats(
    [
      {
        id: "m1",
        team_a: "Brazil",
        team_b: "Portugal",
        status: "finished",
        team_a_score: 2,
        team_b_score: 1,
        goal_events: [
          { side: "team_a", player: "Neymar", minute: "55'", penalty: true },
          { side: "team_a", player: "Rodrygo", minute: "72'" },
        ],
      },
    ],
    team,
  );

  assert.deepEqual(liveStats.topScorers, finishedStats.topScorers);
  assert.equal(finishedStats.includesLiveMatch, false);
});

test("shootout penalties remain excluded from goal breakdown and top scorers", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Portugal",
        status: "penalty_shootout",
        team_a_score: 1,
        team_b_score: 1,
        goal_events: [
          {
            side: "team_a",
            player: "Neymar",
            minute: "1'",
            penalty: true,
            shootout: true,
          },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.penaltyGoals, 0);
  assert.equal(stats.goalsScored, 1);
  assert.deepEqual(stats.topScorers, []);
});

test("missing player names are ignored safely in top scorers", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 2,
        team_b_score: 0,
        goal_events: [
          { side: "team_a", minute: "34'", penalty: true },
          { side: "team_a", player: "Vinicius Jr", minute: "71'" },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.penaltyGoals, 1);
  assert.equal(stats.openPlayGoals, 1);
  assert.deepEqual(stats.topScorers, [{ name: "Vinicius Jr", count: 1 }]);
});

test("missing live goal events do not reduce official score totals", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Portugal",
        status: "live",
        team_a_score: 2,
        team_b_score: 1,
        goal_events: [],
      },
    ],
    team,
  );

  assert.equal(stats.goalsScored, 2);
  assert.equal(stats.goalsConceded, 1);
  assert.equal(stats.hasIncompleteEventData, true);
});
