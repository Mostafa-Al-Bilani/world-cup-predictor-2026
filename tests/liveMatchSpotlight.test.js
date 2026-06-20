import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { getLiveGoalEvents } from "../src/utils/matchDisplay.js";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

const spotlightSource = readSource("src/components/LiveMatchSpotlight.jsx");

test("live match spotlight keeps home and away scorer lists in separate grid columns on mobile", () => {
  assert.doesNotMatch(
    spotlightSource,
    /grid-cols-1[\s\S]*GoalEventList/,
    "scorer section must not collapse to a single column on mobile",
  );
  assert.match(
    spotlightSource,
    /grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/,
  );
});

test("live match spotlight filters scorers by team side", () => {
  assert.match(spotlightSource, /event\.side === "team_a"/);
  assert.match(spotlightSource, /event\.side === "team_b"/);
  assert.match(spotlightSource, /GoalEventList[\s\S]*align="right"/);
});

test("away-team scorer list is right aligned at all breakpoints", () => {
  const goalEventListSource = spotlightSource.slice(
    spotlightSource.indexOf("function GoalEventList"),
    spotlightSource.indexOf("function GoalEventList") + 800,
  );

  assert.match(goalEventListSource, /isRightAligned \? "text-right" : "text-left"/);
  assert.doesNotMatch(
    goalEventListSource,
    /sm:text-right/,
    "GoalEventList should not rely on sm:text-right only",
  );
});

test("away-team scorer list has an accessible team label", () => {
  assert.match(spotlightSource, /aria-label=\{teamLabel \? `\$\{teamLabel\} scorers`/);
  assert.match(spotlightSource, /teamLabel=\{match\.team_b\}/);
});

test("empty scorer column preserves grid layout without merging lists", () => {
  assert.match(
    spotlightSource,
    /if \(!events\.length\) \{[\s\S]*aria-hidden="true"/,
  );
});

test("scorer rows allow wrapping and prevent overflow", () => {
  assert.match(spotlightSource, /className="min-w-0 break-words font-semibold leading-5"/);
  assert.match(spotlightSource, /grid min-w-0 grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\]/);
});

test("penalty and own-goal labels remain in live scorer rows", () => {
  assert.match(spotlightSource, /\(o\.g\.\)/);
  assert.match(spotlightSource, /\(pen\.\)/);
});

test("desktop team header layout remains a three-column grid", () => {
  assert.match(
    spotlightSource,
    /hidden min-w-0 sm:mt-4 sm:grid sm:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/,
  );
});

test("getLiveGoalEvents groups scorers under the correct team side", () => {
  const events = getLiveGoalEvents({
    status: "live",
    goal_events: [
      { side: "team_a", minute: "68'", player: "Deniz Undav" },
      { side: "team_a", minute: "90'+4'", player: "Deniz Undav" },
      { side: "team_b", minute: "30'", player: "Franck Kessié" },
    ],
  });

  const homeScorers = events.filter((event) => event.side === "team_a");
  const awayScorers = events.filter((event) => event.side === "team_b");

  assert.equal(homeScorers.length, 2);
  assert.equal(awayScorers.length, 1);
  assert.equal(homeScorers[0].player, "Deniz Undav");
  assert.equal(awayScorers[0].player, "Franck Kessié");
});

test("unequal scorer counts stay on independent team sides in grouped data", () => {
  const events = getLiveGoalEvents({
    status: "live",
    goal_events: [
      { side: "team_a", minute: "10'", player: "Home One" },
      { side: "team_a", minute: "20'", player: "Home Two" },
      { side: "team_a", minute: "30'", player: "Home Three" },
      { side: "team_b", minute: "55'", player: "Away One" },
    ],
  });

  assert.equal(events.filter((event) => event.side === "team_a").length, 3);
  assert.equal(events.filter((event) => event.side === "team_b").length, 1);
});
