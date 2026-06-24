import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

const teamDetailSource = readSource("src/pages/TeamDetailPage.jsx");
const teamsPageSource = readSource("src/pages/TeamsPage.jsx");
const appSource = readSource("src/App.jsx");

test("team routes are registered", () => {
  assert.match(appSource, /path="teams"/);
  assert.match(appSource, /path="teams\/:teamSlug"/);
  assert.match(appSource, /TeamDetailPage/);
  assert.match(appSource, /TeamsPage/);
});

test("teams directory uses responsive card grid", () => {
  assert.match(
    teamsPageSource,
    /grid-cols-1[\s\S]*min-\[768px\]:grid-cols-2[\s\S]*min-\[1024px\]:grid-cols-3[\s\S]*min-\[1440px\]:grid-cols-4/,
  );
  assert.match(teamsPageSource, /min-w-0/);
});

test("team detail page batches predictions through team service", () => {
  const serviceSource = readSource("src/services/teamService.js");
  assert.match(serviceSource, /getPredictionsForMatchIds/);
  assert.match(serviceSource, /groupPredictionsByMatchId/);
});

test("mobile layout avoids structural overflow classes on team detail page", () => {
  assert.doesNotMatch(teamDetailSource, /overflow-x-auto/);
  assert.match(teamDetailSource, /min-w-0/);
});
