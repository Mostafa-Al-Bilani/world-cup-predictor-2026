import test from "node:test";
import assert from "node:assert/strict";

import {
  filterTeamMatches,
  TEAM_MATCH_FILTERS,
} from "../src/utils/teamMatchOrdering.js";

const team = "Brazil";
const now = new Date("2026-06-24T12:00:00.000Z").getTime();

const matches = [
  {
    id: "live",
    team_a: "Brazil",
    team_b: "Portugal",
    status: "live",
    match_date: "2026-06-24T12:00:00.000Z",
  },
  {
    id: "upcoming-sooner",
    team_a: "Brazil",
    team_b: "Germany",
    status: "upcoming",
    match_date: "2026-06-25T12:00:00.000Z",
  },
  {
    id: "upcoming-later",
    team_a: "France",
    team_b: "Brazil",
    status: "upcoming",
    match_date: "2026-06-28T12:00:00.000Z",
  },
  {
    id: "finished-newer",
    team_a: "Brazil",
    team_b: "Serbia",
    status: "finished",
    match_date: "2026-06-20T12:00:00.000Z",
  },
  {
    id: "finished-older",
    team_a: "Brazil",
    team_b: "Cameroon",
    status: "finished",
    match_date: "2026-06-12T12:00:00.000Z",
  },
  {
    id: "placeholder",
    team_a: "Brazil",
    team_b: "Winner Group A",
    status: "upcoming",
    match_date: "2026-07-01T12:00:00.000Z",
  },
];

test("all filter orders live upcoming then finished", () => {
  const ordered = filterTeamMatches({
    matches,
    team,
    filter: TEAM_MATCH_FILTERS.ALL,
    now,
  });

  assert.deepEqual(
    ordered.map((match) => match.id),
    ["live", "upcoming-sooner", "upcoming-later", "finished-newer", "finished-older"],
  );
});

test("finished filter is newest first", () => {
  const ordered = filterTeamMatches({
    matches,
    team,
    filter: TEAM_MATCH_FILTERS.FINISHED,
    now,
  });

  assert.deepEqual(
    ordered.map((match) => match.id),
    ["finished-newer", "finished-older"],
  );
});

test("upcoming filter is soonest first", () => {
  const ordered = filterTeamMatches({
    matches,
    team,
    filter: TEAM_MATCH_FILTERS.UPCOMING,
    now,
  });

  assert.deepEqual(
    ordered.map((match) => match.id),
    ["upcoming-sooner", "upcoming-later"],
  );
});

test("placeholder knockout fixtures are excluded", () => {
  const ordered = filterTeamMatches({
    matches,
    team,
    filter: TEAM_MATCH_FILTERS.ALL,
    now,
  });

  assert.equal(ordered.some((match) => match.id === "placeholder"), false);
});

test("original arrays are not mutated", () => {
  const copy = matches.map((match) => ({ ...match }));
  filterTeamMatches({
    matches: copy,
    team,
    filter: TEAM_MATCH_FILTERS.ALL,
    now,
  });

  assert.deepEqual(copy, matches);
});
