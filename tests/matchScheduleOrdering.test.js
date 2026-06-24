import test from "node:test";
import assert from "node:assert/strict";

import {
  compareMatchesByKickoff,
  getMatchSortDirection,
  groupMatchesByDate,
  sortMatchesForStatus,
} from "../src/utils/matchScheduleOrdering.js";

const makeMatch = (id, matchDate, overrides = {}) => ({
  id,
  team_a: "Argentina",
  team_b: "Brazil",
  status: "finished",
  match_date: matchDate,
  ...overrides,
});

const getIds = (matches) => matches.map((match) => match.id);

const getKickoff = (match) => new Date(match.match_date).getTime();

const filterFinishedMatches = (matches, filters = {}) => {
  const query = (filters.search ?? "").trim().toLowerCase();

  return matches.filter((match) => {
    const searchableText =
      `${match.team_a} ${match.team_b} ${match.venue ?? ""} ${match.city ?? ""}`.toLowerCase();
    const matchesSearch = !query || searchableText.includes(query);
    const matchesStage =
      !filters.stage || filters.stage === "all" || match.stage === filters.stage;

    return matchesSearch && matchesStage && match.status === "finished";
  });
};

test("finished matches are sorted newest first", () => {
  const matches = [
    makeMatch("jun-11", "2026-06-11T16:00:00.000Z"),
    makeMatch("jun-24", "2026-06-24T22:00:00.000Z"),
    makeMatch("jun-23", "2026-06-23T19:00:00.000Z"),
  ];

  const sorted = sortMatchesForStatus(matches, "finished");

  assert.deepEqual(getIds(sorted), ["jun-24", "jun-23", "jun-11"]);
});

test("finished date groups are descending", () => {
  const matches = sortMatchesForStatus(
    [
      makeMatch("jun-11", "2026-06-11T18:00:00.000Z"),
      makeMatch("jun-24-late", "2026-06-24T21:00:00.000Z"),
      makeMatch("jun-24-early", "2026-06-24T15:00:00.000Z"),
      makeMatch("jun-23", "2026-06-23T18:00:00.000Z"),
    ],
    "finished",
  );

  const grouped = groupMatchesByDate(matches);
  const firstKickoffs = grouped.map((group) => getKickoff(group.matches[0]));

  for (let index = 0; index < firstKickoffs.length - 1; index += 1) {
    assert.ok(firstKickoffs[index] >= firstKickoffs[index + 1]);
  }
});

test("finished matches within the same date are descending by kickoff", () => {
  const matches = sortMatchesForStatus(
    [
      makeMatch("early", "2026-06-24T10:00:00.000Z"),
      makeMatch("late", "2026-06-24T14:00:00.000Z"),
      makeMatch("mid", "2026-06-24T12:00:00.000Z"),
    ],
    "finished",
  );

  assert.deepEqual(getIds(matches), ["late", "mid", "early"]);

  const grouped = groupMatchesByDate(matches);

  grouped
    .filter((group) => group.matches.length > 1)
    .forEach((group) => {
      const kickoffs = group.matches.map((match) => getKickoff(match));

      for (let index = 0; index < kickoffs.length - 1; index += 1) {
        assert.ok(kickoffs[index] >= kickoffs[index + 1]);
      }
    });
});

test("upcoming matches remain ascending", () => {
  const matches = [
    makeMatch("later", "2026-06-24T22:00:00.000Z", { status: "upcoming" }),
    makeMatch("soonest", "2026-06-11T16:00:00.000Z", { status: "upcoming" }),
    makeMatch("middle", "2026-06-23T19:00:00.000Z", { status: "upcoming" }),
  ];

  const sorted = sortMatchesForStatus(matches, "upcoming");

  assert.deepEqual(getIds(sorted), ["soonest", "middle", "later"]);
});

test("changing from upcoming to finished changes the sort direction", () => {
  const matches = [
    makeMatch("jun-11", "2026-06-11T16:00:00.000Z", { status: "upcoming" }),
    makeMatch("jun-24", "2026-06-24T22:00:00.000Z", { status: "upcoming" }),
  ];

  assert.deepEqual(
    getIds(sortMatchesForStatus(matches, "upcoming")),
    ["jun-11", "jun-24"],
  );
  assert.deepEqual(
    getIds(sortMatchesForStatus(
      matches.map((match) => ({ ...match, status: "finished" })),
      "finished",
    )),
    ["jun-24", "jun-11"],
  );
});

test("returning from finished to upcoming restores ascending order", () => {
  const matches = [
    makeMatch("jun-24", "2026-06-24T22:00:00.000Z", { status: "upcoming" }),
    makeMatch("jun-11", "2026-06-11T16:00:00.000Z", { status: "upcoming" }),
  ];

  const finishedSorted = sortMatchesForStatus(
    matches.map((match) => ({ ...match, status: "finished" })),
    "finished",
  );
  const upcomingSorted = sortMatchesForStatus(matches, "upcoming");

  assert.deepEqual(getIds(finishedSorted), ["jun-24", "jun-11"]);
  assert.deepEqual(getIds(upcomingSorted), ["jun-11", "jun-24"]);
});

test("search filters do not break finished ordering", () => {
  const matches = [
    makeMatch("jun-24-arg", "2026-06-24T22:00:00.000Z", { team_a: "Argentina" }),
    makeMatch("jun-23-fr", "2026-06-23T19:00:00.000Z", { team_a: "France" }),
    makeMatch("jun-11-arg", "2026-06-11T16:00:00.000Z", { team_a: "Argentina" }),
  ];

  const filtered = filterFinishedMatches(matches, { search: "argentina" });
  const sorted = sortMatchesForStatus(filtered, "finished");

  assert.deepEqual(getIds(sorted), ["jun-24-arg", "jun-11-arg"]);
});

test("stage filters do not break finished ordering", () => {
  const matches = [
    makeMatch("jun-24", "2026-06-24T22:00:00.000Z", { stage: "Group A" }),
    makeMatch("jun-23", "2026-06-23T19:00:00.000Z", { stage: "Group B" }),
    makeMatch("jun-11", "2026-06-11T16:00:00.000Z", { stage: "Group A" }),
  ];

  const filtered = filterFinishedMatches(matches, { stage: "Group A" });
  const sorted = sortMatchesForStatus(filtered, "finished");

  assert.deepEqual(getIds(sorted), ["jun-24", "jun-11"]);
});

test("prediction-status filtering does not break finished ordering", () => {
  const matches = [
    makeMatch("jun-24", "2026-06-24T22:00:00.000Z"),
    makeMatch("jun-23", "2026-06-23T19:00:00.000Z"),
    makeMatch("jun-11", "2026-06-11T16:00:00.000Z"),
  ];
  const predictedMatchIds = new Set(["jun-23"]);

  const filtered = matches.filter((match) => predictedMatchIds.has(match.id));
  const sorted = sortMatchesForStatus(filtered, "finished");

  assert.deepEqual(getIds(sorted), ["jun-23"]);
});

test("one finished match renders normally through grouping", () => {
  const matches = sortMatchesForStatus(
    [makeMatch("only", "2026-06-24T22:00:00.000Z")],
    "finished",
  );
  const grouped = groupMatchesByDate(matches);

  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].matches.length, 1);
  assert.equal(grouped[0].matches[0].id, "only");
});

test("no finished matches returns an empty sorted list", () => {
  const sorted = sortMatchesForStatus([], "finished");
  const grouped = groupMatchesByDate(sorted);

  assert.deepEqual(sorted, []);
  assert.deepEqual(grouped, []);
});

test("invalid kickoff values do not crash sorting", () => {
  const matches = [
    makeMatch("valid-late", "2026-06-24T22:00:00.000Z"),
    makeMatch("invalid", "not-a-date"),
    makeMatch("valid-early", "2026-06-11T16:00:00.000Z"),
  ];

  assert.doesNotThrow(() => sortMatchesForStatus(matches, "finished"));

  const sorted = sortMatchesForStatus(matches, "finished");

  assert.deepEqual(getIds(sorted), ["valid-late", "valid-early", "invalid"]);
});

test("sorting does not mutate the original matches array", () => {
  const matches = [
    makeMatch("jun-11", "2026-06-11T16:00:00.000Z"),
    makeMatch("jun-24", "2026-06-24T22:00:00.000Z"),
  ];
  const snapshot = structuredClone(matches);

  sortMatchesForStatus(matches, "finished");

  assert.deepEqual(matches, snapshot);
});

test("live matches keep ascending kickoff order", () => {
  const matches = [
    makeMatch("later", "2026-06-24T22:00:00.000Z", { status: "live" }),
    makeMatch("sooner", "2026-06-11T16:00:00.000Z", { status: "live" }),
  ];

  assert.equal(getMatchSortDirection("live"), "asc");
  assert.deepEqual(getIds(sortMatchesForStatus(matches, "live")), [
    "sooner",
    "later",
  ]);
});

test("compareMatchesByKickoff uses UTC timestamps", () => {
  assert.ok(
    compareMatchesByKickoff(
      makeMatch("a", "2026-06-24T22:00:00.000Z"),
      makeMatch("b", "2026-06-11T16:00:00.000Z"),
      "desc",
    ) < 0,
  );
});
