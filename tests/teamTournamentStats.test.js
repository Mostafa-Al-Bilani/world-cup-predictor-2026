import test from "node:test";
import assert from "node:assert/strict";

import { calculateTeamTournamentStats } from "../src/utils/teamTournamentStats.js";

const team = "Brazil";

const matches = [
  {
    id: "1",
    team_a: "Brazil",
    team_b: "Serbia",
    status: "finished",
    team_a_score: 2,
    team_b_score: 0,
    match_date: "2026-06-12T00:00:00.000Z",
  },
  {
    id: "2",
    team_a: "Switzerland",
    team_b: "Brazil",
    status: "finished",
    team_a_score: 1,
    team_b_score: 1,
    match_date: "2026-06-18T00:00:00.000Z",
  },
  {
    id: "3",
    team_a: "Brazil",
    team_b: "Cameroon",
    status: "live",
    team_a_score: 1,
    team_b_score: 0,
    match_date: "2026-06-24T00:00:00.000Z",
  },
  {
    id: "4",
    team_a: "Brazil",
    team_b: "Portugal",
    status: "upcoming",
    match_date: "2026-06-28T00:00:00.000Z",
  },
];

test("wins draws and losses are calculated from finished matches only", () => {
  const stats = calculateTeamTournamentStats(matches, team);

  assert.equal(stats.played, 2);
  assert.equal(stats.wins, 1);
  assert.equal(stats.draws, 1);
  assert.equal(stats.losses, 0);
});

test("goals for and against use the correct side", () => {
  const stats = calculateTeamTournamentStats(matches, team);

  assert.equal(stats.goalsFor, 3);
  assert.equal(stats.goalsAgainst, 1);
  assert.equal(stats.goalDifference, 2);
});

test("clean sheets exclude live and upcoming matches", () => {
  const stats = calculateTeamTournamentStats(matches, team);
  assert.equal(stats.cleanSheets, 1);
});

test("source arrays are not mutated", () => {
  const copy = matches.map((match) => ({ ...match }));
  calculateTeamTournamentStats(copy, team);
  assert.deepEqual(copy, matches);
});

test("current form reflects chronological finished results", () => {
  const stats = calculateTeamTournamentStats(matches, team);
  assert.deepEqual(stats.currentForm, ["W", "D"]);
});
