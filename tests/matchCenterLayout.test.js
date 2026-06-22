import test from "node:test";
import assert from "node:assert/strict";

import {
  MATCH_CENTER_LAST_24H_PANEL_CLASS,
  MATCH_CENTER_NEXT_24H_PANEL_CLASS,
  MATCH_CENTER_PANELS_GRID_CLASS,
  UPCOMING_SIDEBAR_ACTION_CLASS,
  UPCOMING_SIDEBAR_CARD_CLASS,
  UPCOMING_SIDEBAR_METADATA_CLASS,
  UPCOMING_SIDEBAR_TEAM_ROW_CLASS,
} from "../src/utils/matchCenterLayout.js";

test("uses a wider primary column and narrower sidebar on large desktop", () => {
  assert.match(
    MATCH_CENTER_PANELS_GRID_CLASS,
    /lg:grid-cols-\[minmax\(0,2fr\)_minmax\(280px,1fr\)\]/,
  );
  assert.match(MATCH_CENTER_PANELS_GRID_CLASS, /md:grid-cols-1/);
});

test("stacks match-center panels on mobile with last 24 hours first", () => {
  assert.match(MATCH_CENTER_LAST_24H_PANEL_CLASS, /order-1/);
  assert.match(MATCH_CENTER_NEXT_24H_PANEL_CLASS, /order-2/);
  assert.match(MATCH_CENTER_LAST_24H_PANEL_CLASS, /min-w-0/);
  assert.match(MATCH_CENTER_NEXT_24H_PANEL_CLASS, /min-w-0/);
});

test("upcoming sidebar cards use a shared three-column team row", () => {
  assert.match(
    UPCOMING_SIDEBAR_TEAM_ROW_CLASS,
    /grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/,
  );
  assert.match(UPCOMING_SIDEBAR_TEAM_ROW_CLASS, /items-center/);
  assert.match(UPCOMING_SIDEBAR_TEAM_ROW_CLASS, /min-w-0/);
});

test("upcoming sidebar cards keep compact metadata and touch-friendly actions", () => {
  assert.match(UPCOMING_SIDEBAR_CARD_CLASS, /min-w-0/);
  assert.match(UPCOMING_SIDEBAR_METADATA_CLASS, /space-y-0\.5/);
  assert.match(UPCOMING_SIDEBAR_ACTION_CLASS, /min-h-11/);
  assert.match(UPCOMING_SIDEBAR_ACTION_CLASS, /w-full/);
});

