import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { calculateTeamGoalStats } from "../src/utils/teamGoalStats.js";
import { calculateTeamPredictionImpact } from "../src/utils/teamPredictionImpact.js";
import { calculateTeamTournamentStats } from "../src/utils/teamTournamentStats.js";
import {
  formatCompactRecord,
  getTeamLiveMatchSummary,
  mergeTeamMatchesFromUpdate,
} from "../src/utils/teamDirectoryLive.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

const teamsPageSource = readSource("src/pages/TeamsPage.jsx");
const teamDetailSource = readSource("src/pages/TeamDetailPage.jsx");
const cardSource = readSource("src/components/team/TeamDirectoryCard.jsx");

const team = "Brazil";

test("teams page uses compact header and unified toolbar", () => {
  assert.match(teamsPageSource, /World Cup journey/);
  assert.match(teamsPageSource, /rounded-xl border border-white\/10 bg-slate-950\/60/);
  assert.doesNotMatch(teamsPageSource, /text-4xl/);
});

test("teams page shows result count and clear filters when active", () => {
  assert.match(teamsPageSource, /filteredTeams\.length/);
  assert.match(teamsPageSource, /Clear filters/);
  assert.match(teamsPageSource, /hasActiveFilters/);
});

test("team directory card renders compact record labels", () => {
  assert.equal(formatCompactRecord({ wins: 2, draws: 1, losses: 0 }), "2W · 1D · 0L");
  assert.match(cardSource, /formatCompactRecord/);
  assert.match(cardSource, /title=\{formatExpandedRecord/);
});

test("team directory card preserves canonical team links", () => {
  assert.match(cardSource, /to=\{`\/teams\/\$\{team\.slug\}`\}/);
});

test("directory statistics use finished matches only", () => {
  const matches = [
    {
      id: "finished",
      team_a: "Brazil",
      team_b: "Serbia",
      status: "finished",
      team_a_score: 2,
      team_b_score: 0,
      match_date: "2026-06-12T00:00:00.000Z",
    },
    {
      id: "live",
      team_a: "Brazil",
      team_b: "Portugal",
      status: "live",
      team_a_score: 1,
      team_b_score: 0,
      match_date: "2026-06-24T12:00:00.000Z",
    },
  ];

  const stats = calculateTeamTournamentStats(matches, team);
  assert.equal(stats.played, 1);
  assert.equal(stats.wins, 1);
  assert.equal(stats.goalsFor, 2);
});

test("live indicator can render without changing final record values", () => {
  const matches = [
    {
      id: "finished",
      team_a: "Brazil",
      team_b: "Serbia",
      status: "finished",
      team_a_score: 2,
      team_b_score: 0,
      match_date: "2026-06-12T00:00:00.000Z",
    },
    {
      id: "live",
      team_a: "Brazil",
      team_b: "Portugal",
      status: "live",
      team_a_score: 1,
      team_b_score: 0,
      match_date: "2026-06-24T12:00:00.000Z",
    },
  ];

  const liveSummary = getTeamLiveMatchSummary(matches, team);
  const stats = calculateTeamTournamentStats(matches, team);

  assert.ok(liveSummary);
  assert.equal(liveSummary.scoreLabel, "1–0");
  assert.equal(stats.played, 1);
});

test("teams directory listens to shared live match updates", () => {
  assert.match(teamsPageSource, /MATCHES_UPDATED_EVENT/);
});

test("teams directory grid remains responsive without cramped four-column default", () => {
  assert.match(
    teamsPageSource,
    /min-\[768px\]:grid-cols-2[\s\S]*min-\[1024px\]:grid-cols-3[\s\S]*min-\[1536px\]:grid-cols-4/,
  );
});

test("team detail listens to shared match updates for goal breakdown", () => {
  assert.match(teamDetailSource, /MATCHES_UPDATED_EVENT/);
  assert.match(teamDetailSource, /mergeTeamMatchesFromUpdate/);
  assert.match(teamDetailSource, /calculateTeamGoalStats/);
});

test("prediction impact helper states final-only updates", () => {
  assert.match(
    teamDetailSource,
    /Prediction impact updates after final results are confirmed/,
  );
});

test("goal breakdown shows live indicator when live match is included", () => {
  assert.match(teamDetailSource, /includesLiveMatch/);
  assert.match(teamDetailSource, /Live goal statistics update as match data arrives/);
});

test("live matches are excluded from prediction impact", () => {
  const matches = [
    {
      id: "live",
      team_a: "Brazil",
      team_b: "Portugal",
      status: "live",
      team_a_score: 3,
      team_b_score: 0,
      match_date: "2026-06-24T12:00:00.000Z",
    },
  ];

  const impact = calculateTeamPredictionImpact({
    matches,
    team,
    predictionsByMatchId: {
      live: {
        match_id: "live",
        predicted_result: "team_a",
        predicted_home_score: 3,
        predicted_away_score: 0,
        total_points: 2,
      },
    },
  });

  assert.equal(impact.pointsEarned, 0);
  assert.equal(impact.predictionAccuracy, 0);
});

test("live goals update goal breakdown totals from current score", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        team_a_score: 5,
        team_b_score: 2,
        goal_events: [],
      },
      {
        team_a: "Brazil",
        team_b: "Portugal",
        status: "live",
        team_a_score: 2,
        team_b_score: 1,
        goal_events: [
          { side: "team_a", player: "Vinicius Jr", minute: "12'" },
          { side: "team_b", player: "Ronaldo", minute: "34'" },
        ],
      },
    ],
    team,
  );

  assert.equal(stats.goalsScored, 7);
  assert.equal(stats.goalsConceded, 3);
  assert.equal(stats.includesLiveMatch, true);
});

test("upcoming matches are excluded from goal breakdown", () => {
  const stats = calculateTeamGoalStats(
    [
      {
        team_a: "Brazil",
        team_b: "Germany",
        status: "upcoming",
        team_a_score: 0,
        team_b_score: 0,
      },
    ],
    team,
  );

  assert.equal(stats.goalsScored, 0);
  assert.equal(stats.includesLiveMatch, false);
});

test("live to finished transition does not duplicate goal totals", () => {
  const liveMatches = [
    {
      id: "m1",
      team_a: "Brazil",
      team_b: "Portugal",
      status: "live",
      team_a_score: 2,
      team_b_score: 1,
      goal_events: [],
    },
  ];

  const finishedMatches = [
    {
      id: "m1",
      team_a: "Brazil",
      team_b: "Portugal",
      status: "finished",
      team_a_score: 2,
      team_b_score: 1,
      goal_events: [],
    },
  ];

  const liveStats = calculateTeamGoalStats(liveMatches, team);
  const finishedStats = calculateTeamGoalStats(finishedMatches, team);

  assert.equal(liveStats.goalsScored, 2);
  assert.equal(finishedStats.goalsScored, 2);
});

test("mergeTeamMatchesFromUpdate replaces live rows from shared match feed", () => {
  const current = [
    {
      id: "m1",
      team_a: "Brazil",
      team_b: "Portugal",
      status: "live",
      team_a_score: 1,
      team_b_score: 0,
    },
  ];

  const all = [
    {
      id: "m1",
      team_a: "Brazil",
      team_b: "Portugal",
      status: "live",
      team_a_score: 2,
      team_b_score: 1,
    },
  ];

  const merged = mergeTeamMatchesFromUpdate(current, all, team);
  assert.equal(merged[0].team_a_score, 2);
});

test("finished but unscored predictions stay pending in impact totals", () => {
  const impact = calculateTeamPredictionImpact({
    matches: [
      {
        id: "f1",
        team_a: "Brazil",
        team_b: "Serbia",
        status: "finished",
        result: null,
        team_a_score: 2,
        team_b_score: 0,
      },
    ],
    team,
    predictionsByMatchId: {
      f1: {
        match_id: "f1",
        predicted_result: "team_a",
        predicted_home_score: 2,
        predicted_away_score: 0,
      },
    },
  });

  assert.equal(impact.hasPendingScoring, true);
  assert.equal(impact.pointsEarned, 0);
});
