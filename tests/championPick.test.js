import test from "node:test";
import assert from "node:assert/strict";

import {
  clearPendingChampionPick,
  readPendingChampionPick,
  rememberPendingChampionPick,
} from "../src/utils/championPick.js";

function createSessionStorageMock() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

test.beforeEach(() => {
  globalThis.window = {
    sessionStorage: createSessionStorageMock(),
  };
});

test.afterEach(() => {
  delete globalThis.window;
});

test("remembers and reads pending champion pick for matching email", () => {
  rememberPendingChampionPick({
    email: " USER@example.COM ",
    team: "Argentina",
  });

  const result = readPendingChampionPick("user@example.com", [
    "Argentina",
    "France",
  ]);

  assert.equal(result, "Argentina");
});

test("does not return pending champion pick for different email", () => {
  rememberPendingChampionPick({
    email: "user@example.com",
    team: "Argentina",
  });

  const result = readPendingChampionPick("other@example.com", [
    "Argentina",
    "France",
  ]);

  assert.equal(result, "");
});

test("does not return pending champion pick if team is not available", () => {
  rememberPendingChampionPick({
    email: "user@example.com",
    team: "Argentina",
  });

  const result = readPendingChampionPick("user@example.com", [
    "France",
    "Brazil",
  ]);

  assert.equal(result, "");
});

test("clears pending champion pick", () => {
  rememberPendingChampionPick({
    email: "user@example.com",
    team: "Argentina",
  });

  clearPendingChampionPick();

  const result = readPendingChampionPick("user@example.com", ["Argentina"]);

  assert.equal(result, "");
});

test("ignores missing email or team when remembering pick", () => {
  rememberPendingChampionPick({
    email: "",
    team: "Argentina",
  });

  assert.equal(readPendingChampionPick("", ["Argentina"]), "");

  rememberPendingChampionPick({
    email: "user@example.com",
    team: "",
  });

  assert.equal(readPendingChampionPick("user@example.com", ["Argentina"]), "");
});

test("handles invalid stored JSON safely", () => {
  window.sessionStorage.setItem("wc26-pending-champion-pick", "{bad-json");

  const result = readPendingChampionPick("user@example.com", ["Argentina"]);

  assert.equal(result, "");
});