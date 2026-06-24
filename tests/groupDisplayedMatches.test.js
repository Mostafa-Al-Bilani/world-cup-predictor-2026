import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  getGroupDisplayedMatches,
  getGroupDisplayedMatchesHeading,
  isSameKickoffMinute,
} from "../src/utils/groupDisplayedMatches.js";
import { getGroupMatchPredictionsGridClass } from "../src/utils/groupMatchPredictionsLayout.js";
import {
  buildGroupMemberPredictionsByMatchId,
  groupPredictionRowsByMatchId,
} from "../src/utils/groupPredictionRows.js";

const NOW = Date.parse("2026-06-15T12:00:00.000Z");
const kickoff = (offsetMs) => new Date(NOW + offsetMs).toISOString();

let fallbackId = 0;

const makeMatch = (overrides = {}) => ({
  id: overrides.id ?? `match-${(fallbackId += 1)}`,
  team_a: "Argentina",
  team_b: "Brazil",
  match_date: kickoff(60 * 60 * 1000),
  status: "upcoming",
  stage: "Group A",
  ...overrides,
});

const getIds = (matches) => matches.map((match) => match.id);

test("returns all live matches instead of a single match", () => {
  const matches = [
    makeMatch({ id: "live-a", status: "live", match_date: kickoff(-30 * 60 * 1000) }),
    makeMatch({ id: "live-b", status: "halftime", match_date: kickoff(-20 * 60 * 1000) }),
  ];

  const { displayedMatches, displayState } = getGroupDisplayedMatches(
    matches,
    NOW,
  );

  assert.deepEqual(getIds(displayedMatches), ["live-a", "live-b"]);
  assert.equal(displayState, "live");
});

test("returns all three live matches", () => {
  const matches = [
    makeMatch({ id: "live-1", status: "live", match_date: kickoff(-40 * 60 * 1000) }),
    makeMatch({ id: "live-2", status: "extra_time", match_date: kickoff(-35 * 60 * 1000) }),
    makeMatch({ id: "live-3", status: "penalties", match_date: kickoff(-30 * 60 * 1000) }),
  ];

  const { displayedMatches } = getGroupDisplayedMatches(matches, NOW);

  assert.equal(displayedMatches.length, 3);
  assert.deepEqual(getIds(displayedMatches), ["live-1", "live-2", "live-3"]);
});

test("does not reduce live matches with find, index zero, or slice", () => {
  const groupDetailSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../src/pages/GroupDetailPage.jsx"),
    "utf8",
  );

  assert.doesNotMatch(groupDetailSource, /getLiveGroupPredictions/);
  assert.match(groupDetailSource, /displayedMatches\.map\(/);
  assert.doesNotMatch(groupDetailSource, /liveMatches\[0\]/);
  assert.doesNotMatch(groupDetailSource, /slice\(0,\s*1\)/);
});

test("returns simultaneous earliest upcoming matches when nothing is live", () => {
  const sharedKickoff = kickoff(2 * 60 * 60 * 1000);
  const matches = [
    makeMatch({ id: "next-a", status: "upcoming", match_date: sharedKickoff }),
    makeMatch({ id: "next-b", status: "upcoming", match_date: sharedKickoff }),
    makeMatch({
      id: "next-later",
      status: "upcoming",
      match_date: kickoff(4 * 60 * 60 * 1000),
    }),
  ];

  const { displayedMatches, displayState } = getGroupDisplayedMatches(
    matches,
    NOW,
  );

  assert.deepEqual(getIds(displayedMatches), ["next-a", "next-b"]);
  assert.equal(displayState, "upcoming-multiple");
});

test("does not include a later kickoff with the earliest kickoff group", () => {
  const matches = [
    makeMatch({ id: "earliest", status: "upcoming", match_date: kickoff(60 * 60 * 1000) }),
    makeMatch({ id: "later", status: "upcoming", match_date: kickoff(3 * 60 * 60 * 1000) }),
  ];

  const { displayedMatches } = getGroupDisplayedMatches(matches, NOW);

  assert.deepEqual(getIds(displayedMatches), ["earliest"]);
});

test("isSameKickoffMinute compares kickoffs at minute precision", () => {
  assert.equal(
    isSameKickoffMinute(
      "2026-06-15T14:00:00.000Z",
      "2026-06-15T14:00:59.999Z",
    ),
    true,
  );
  assert.equal(
    isSameKickoffMinute(
      "2026-06-15T14:00:00.000Z",
      "2026-06-15T14:01:00.000Z",
    ),
    false,
  );
});

test("groups prediction rows by match_id", () => {
  const grouped = groupPredictionRowsByMatchId([
    { match_id: "match-a", user_id: "user-1" },
    { match_id: "match-b", user_id: "user-2" },
    { match_id: "match-a", user_id: "user-3" },
  ]);

  assert.equal(grouped["match-a"].length, 2);
  assert.equal(grouped["match-b"].length, 1);
});

test("buildGroupMemberPredictionsByMatchId keeps predictions on the correct match", () => {
  const members = [
    {
      user_id: "user-1",
      status: "accepted",
      profile: { username: "Alice" },
    },
    {
      user_id: "user-2",
      status: "accepted",
      profile: { username: "Bob" },
    },
  ];

  const grouped = buildGroupMemberPredictionsByMatchId({
    members,
    matchIds: ["match-a", "match-b"],
    predictionRows: [
      {
        match_id: "match-a",
        user_id: "user-1",
        predicted_result: "team_a",
        predicted_home_score: 2,
        predicted_away_score: 1,
      },
    ],
  });

  assert.equal(grouped["match-a"][0].predicted_result, "team_a");
  assert.equal(grouped["match-b"][0].predicted_result, null);
  assert.notEqual(grouped["match-a"][0].match_id, grouped["match-b"][0].match_id);
});

test("one match can have predictions while another remains empty", () => {
  const members = [
    {
      user_id: "user-1",
      status: "accepted",
      profile: { username: "Alice" },
    },
  ];

  const grouped = buildGroupMemberPredictionsByMatchId({
    members,
    matchIds: ["match-a", "match-b"],
    predictionRows: [
      {
        match_id: "match-a",
        user_id: "user-1",
        predicted_result: "draw",
        predicted_home_score: 1,
        predicted_away_score: 1,
      },
    ],
  });

  assert.equal(grouped["match-a"][0].predicted_result, "draw");
  assert.equal(grouped["match-b"][0].predicted_result, null);
});

test("uses a two-column desktop grid for multiple matches", () => {
  const gridClass = getGroupMatchPredictionsGridClass(2);

  assert.match(gridClass, /grid-cols-1/);
  assert.match(gridClass, /lg:grid-cols-\[repeat\(2,minmax\(0,1fr\)\)\]/);
});

test("stacks match cards vertically on mobile", () => {
  const gridClass = getGroupMatchPredictionsGridClass(2);

  assert.match(gridClass, /grid-cols-1/);
  assert.doesNotMatch(gridClass, /sm:grid-cols-2/);
});

test("uses a single-column layout when only one match is shown", () => {
  const gridClass = getGroupMatchPredictionsGridClass(1);

  assert.match(gridClass, /grid-cols-1/);
  assert.match(gridClass, /max-w-3xl/);
  assert.doesNotMatch(gridClass, /lg:grid-cols-/);
});

test("headings reflect live and upcoming states", () => {
  assert.equal(
    getGroupDisplayedMatchesHeading("live", 2),
    "Member picks for live matches",
  );
  assert.equal(
    getGroupDisplayedMatchesHeading("upcoming-multiple", 2),
    "Member picks for the next matches",
  );
  assert.equal(
    getGroupDisplayedMatchesHeading("upcoming-single", 1),
    "Member picks for the next match",
  );
});

test("home-page match center files remain unchanged", () => {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const homePageSource = readFileSync(
    join(projectRoot, "src/pages/HomePage.jsx"),
    "utf8",
  );
  const matchCenterSource = readFileSync(
    join(projectRoot, "src/components/DashboardMatchCenter.jsx"),
    "utf8",
  );

  assert.doesNotMatch(homePageSource, /getGroupDisplayedMatches/);
  assert.doesNotMatch(matchCenterSource, /getGroupDisplayedMatches/);
});

test("does not hardcode match ids, teams, or kickoff dates in group selection", () => {
  const source = readFileSync(
    fileURLToPath(new URL("../src/utils/groupDisplayedMatches.js", import.meta.url)),
    "utf8",
  );

  assert.doesNotMatch(source, /match-[a-f0-9-]{8,}/i);
  assert.doesNotMatch(source, /Argentina|Brazil|France|Germany/);
  assert.doesNotMatch(source, /2026-06-/);
});
