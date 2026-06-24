import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTeamRegistry,
  getCanonicalTeam,
  getTeamBySlug,
  getTeamSlug,
  isRealTeam,
  isSameTeam,
  resolveCanonicalTeamName,
} from "../src/utils/teamIdentity.js";

test("aliases resolve to one canonical team", () => {
  assert.equal(resolveCanonicalTeamName("USA"), "United States");
  assert.equal(resolveCanonicalTeamName("United States of America"), "United States");
  assert.equal(getTeamSlug("USA"), getTeamSlug("United States"));
});

test("canonical slug is stable and readable", () => {
  assert.equal(getTeamSlug("Brazil"), "brazil");
  assert.equal(getTeamSlug("Korea Republic"), "korea-republic");
});

test("slug resolves back to the team from matches", () => {
  const matches = [
    {
      team_a: "Brazil",
      team_b: "Germany",
      stage: "Group C",
    },
  ];

  const team = getTeamBySlug("brazil", matches);
  assert.equal(team?.name, "Brazil");
  assert.equal(team?.group, "Group C");
});

test("placeholder teams are rejected", () => {
  assert.equal(isRealTeam("TBD"), false);
  assert.equal(isRealTeam("Winner Group A"), false);
  assert.equal(getCanonicalTeam("Winner Match 73"), null);
});

test("missing teams fail safely", () => {
  assert.equal(getTeamBySlug("", []), null);
  assert.equal(getTeamBySlug("unknown-team", []), null);
  assert.equal(getCanonicalTeam(null), null);
});

test("isSameTeam compares aliases consistently", () => {
  assert.equal(isSameTeam("USA", "United States"), true);
  assert.equal(isSameTeam("Brazil", "Germany"), false);
});

test("buildTeamRegistry deduplicates aliases", () => {
  const matches = [
    { team_a: "USA", team_b: "Mexico", stage: "Group A" },
    { team_a: "United States", team_b: "Canada", stage: "Group A" },
  ];

  const teams = buildTeamRegistry(matches);
  assert.equal(teams.length, 3);
  assert.equal(teams.find((team) => team.slug === "united-states")?.name, "United States");
});
