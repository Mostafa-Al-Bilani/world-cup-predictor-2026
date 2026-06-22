import test from "node:test";
import assert from "node:assert/strict";

import {
  MATCH_CENTER_LAST_24H_PANEL_CLASS,
  MATCH_CENTER_NEXT_24H_PANEL_CLASS,
  MATCH_CENTER_PANELS_GRID_CLASS,
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
