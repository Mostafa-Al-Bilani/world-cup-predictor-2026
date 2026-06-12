import test from "node:test";
import assert from "node:assert/strict";

import {
  getMissingPredictionCount,
  hasRealTeams,
  isMatchOpenForPrediction,
  isPlaceholderTeamName,
} from "../src/utils/matches.js";

test("recognizes real teams and common knockout placeholders", () => {
  assert.equal(isPlaceholderTeamName("Argentina"), false);
  assert.equal(isPlaceholderTeamName("Bosnia & Herzegovina"), false);

  assert.equal(isPlaceholderTeamName("TBD"), true);
  assert.equal(isPlaceholderTeamName("2A"), true);
  assert.equal(isPlaceholderTeamName("W12"), true);
  assert.equal(isPlaceholderTeamName("Group A 2nd Place"), true);
  assert.equal(isPlaceholderTeamName("Round of 32 1 Winner"), true);
  assert.equal(isPlaceholderTeamName("Semi-final 2 Winner"), true);
});

test("requires both match teams to be real", () => {
  assert.equal(
    hasRealTeams({
      team_a: "Argentina",
      team_b: "France",
    }),
    true,
  );

  assert.equal(
    hasRealTeams({
      team_a: "Argentina",
      team_b: "W12",
    }),
    false,
  );
});

test("opens predictions only for future upcoming matches with real teams", () => {
  const now = new Date("2026-06-13T00:00:00.000Z").getTime();

  assert.equal(
    isMatchOpenForPrediction(
      {
        team_a: "Argentina",
        team_b: "France",
        status: "upcoming",
        match_date: "2026-06-14T00:00:00.000Z",
      },
      now,
    ),
    true,
  );

  assert.equal(
    isMatchOpenForPrediction(
      {
        team_a: "Argentina",
        team_b: "W12",
        status: "upcoming",
        match_date: "2026-06-14T00:00:00.000Z",
      },
      now,
    ),
    false,
  );

  assert.equal(
    isMatchOpenForPrediction(
      {
        team_a: "Argentina",
        team_b: "France",
        status: "live",
        match_date: "2026-06-14T00:00:00.000Z",
      },
      now,
    ),
    false,
  );
});

test("counts only genuinely available matches without predictions", () => {
  const now = new Date("2026-06-13T00:00:00.000Z").getTime();

  const matches = [
    {
      id: "open-missing",
      team_a: "Argentina",
      team_b: "France",
      status: "upcoming",
      match_date: "2026-06-14T00:00:00.000Z",
    },
    {
      id: "open-predicted",
      team_a: "Brazil",
      team_b: "Spain",
      status: "upcoming",
      match_date: "2026-06-14T02:00:00.000Z",
    },
    {
      id: "placeholder",
      team_a: "2A",
      team_b: "2B",
      status: "upcoming",
      match_date: "2026-06-20T00:00:00.000Z",
    },
    {
      id: "past",
      team_a: "Germany",
      team_b: "Portugal",
      status: "upcoming",
      match_date: "2026-06-12T00:00:00.000Z",
    },
    {
      id: "live",
      team_a: "Mexico",
      team_b: "Canada",
      status: "live",
      match_date: "2026-06-14T04:00:00.000Z",
    },
  ];

  const predictions = [{ match_id: "open-predicted" }];

  assert.equal(
    getMissingPredictionCount({
      matches,
      predictions,
      now,
    }),
    1,
  );
});
