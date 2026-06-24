import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

const teamLinkSource = readSource("src/components/team/TeamLink.jsx");
const teamDetailSource = readSource("src/pages/TeamDetailPage.jsx");
const teamMatchCardSource = readSource("src/components/team/TeamMatchCard.jsx");

test("TeamLink renders canonical team URLs", () => {
  assert.match(teamLinkSource, /to=\{`\/teams\/\$\{canonical\.slug\}`\}/);
});

test("TeamLink exposes accessible labels", () => {
  assert.match(teamLinkSource, /aria-label=\{`View \$\{canonical\.name\} team page`\}/);
});

test("placeholder teams render as plain text", () => {
  assert.match(teamLinkSource, /if \(!canonical \|\| !isRealTeam\(team\)\)/);
  assert.match(teamLinkSource, /<span className=\{className\}>/);
});

test("TeamMatchCard keeps match action separate from team links", () => {
  assert.match(teamMatchCardSource, /TeamLink/);
  assert.match(
    teamMatchCardSource,
    /<div className="mt-4">\s*<Link[\s\S]*to=\{`\/matches\?match=\$\{match\.id\}`\}/,
  );
  assert.doesNotMatch(teamMatchCardSource, /<Link[\s\S]*<TeamLink/);
});

test("team detail page renders core sections", () => {
  assert.match(teamDetailSource, /Tournament statistics/);
  assert.match(teamDetailSource, /Your prediction impact/);
  assert.match(teamDetailSource, /Goal breakdown/);
  assert.match(teamDetailSource, /Team matches/);
});

test("signed-out users see sign-in prompt for prediction impact", () => {
  assert.match(
    teamDetailSource,
    /Sign in to view your predictions and points for this team\./,
  );
});

test("unknown team slug shows not-found state", () => {
  assert.match(teamDetailSource, /Team not found/);
  assert.match(teamDetailSource, /Browse teams/);
});

test("team detail analytics layout uses responsive two-column grid", () => {
  assert.match(
    teamDetailSource,
    /grid-cols-\[minmax\(0,1\.2fr\)_minmax\(0,0\.8fr\)\]/,
  );
});

test("pending scoring indicator is shown on team detail page", () => {
  assert.match(teamDetailSource, /Result calculation pending/);
  assert.match(teamDetailSource, /hasPendingScoring/);
});

test("incomplete goal-event notice is supported", () => {
  assert.match(teamDetailSource, /Detailed scorer data is available for/);
});
