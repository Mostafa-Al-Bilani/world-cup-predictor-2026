import test from "node:test";
import assert from "node:assert/strict";

import {
  CHAMPION_GATE_ALLOWED_PATHS,
  isChampionPredictionAlreadyLockedError,
  shouldPromptForChampionPrediction,
} from "../src/utils/championGate.js";
import {
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

const basePromptArgs = {
  authLoading: false,
  isAuthenticated: true,
  isAdmin: false,
  queryStatus: "ready",
  championPrediction: null,
  predictionsOpen: true,
  pathname: "/matches",
};

test("does not prompt while authentication is loading", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      authLoading: true,
    }),
    false,
  );
});

test("does not prompt while champion query is loading", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      queryStatus: "loading",
    }),
    false,
  );
});

test("does not prompt when champion query failed", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      queryStatus: "error",
    }),
    false,
  );
});

test("does not prompt when username is incomplete", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      usernameComplete: false,
    }),
    false,
  );
});

test("legacy user without prediction is prompted while predictions are open", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      usernameComplete: true,
    }),
    true,
  );
});

test("user with existing prediction is never prompted", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      championPrediction: {
        id: "prediction-1",
        user_id: "user-1",
        predicted_team: "Argentina",
        locked_at: "2026-06-01T00:00:00.000Z",
      },
    }),
    false,
  );
});

test("registration user with saved prediction is not prompted after login", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      championPrediction: {
        id: "prediction-1",
        user_id: "user-1",
        predicted_team: "Brazil",
        locked_at: "2026-06-01T00:00:00.000Z",
      },
    }),
    false,
  );
});

test("does not prompt when champion predictions are locked", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      predictionsOpen: false,
    }),
    false,
  );
});

test("does not prompt on allowed auth and champion routes", () => {
  for (const pathname of CHAMPION_GATE_ALLOWED_PATHS) {
    assert.equal(
      shouldPromptForChampionPrediction({
        ...basePromptArgs,
        pathname,
      }),
      false,
    );
  }
});

test("does not prompt admins", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      isAdmin: true,
    }),
    false,
  );
});

test("does not prompt signed-out users", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      isAuthenticated: false,
    }),
    false,
  );
});

test("detects already locked champion prediction errors", () => {
  assert.equal(
    isChampionPredictionAlreadyLockedError(
      new Error("World Cup winner prediction is already locked"),
    ),
    true,
  );
  assert.equal(
    isChampionPredictionAlreadyLockedError(new Error("Network failure")),
    false,
  );
});

test("repeated ready checks with existing prediction stay stable", () => {
  const args = {
    ...basePromptArgs,
    championPrediction: {
      id: "prediction-1",
      user_id: "user-1",
      predicted_team: "France",
      locked_at: "2026-06-01T00:00:00.000Z",
    },
  };

  assert.equal(shouldPromptForChampionPrediction(args), false);
  assert.equal(shouldPromptForChampionPrediction(args), false);
  assert.equal(shouldPromptForChampionPrediction(args), false);
});

test("registration pick persisted to database suppresses first-login prompt", () => {
  globalThis.window = {
    sessionStorage: createSessionStorageMock(),
  };

  rememberPendingChampionPick({
    email: "player@example.com",
    team: "Argentina",
  });

  const persistedPrediction = {
    id: "prediction-1",
    user_id: "user-1",
    predicted_team: "Argentina",
    locked_at: "2026-06-01T00:00:00.000Z",
  };

  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      championPrediction: persistedPrediction,
    }),
    false,
  );

  delete globalThis.window;
});

test("query error state never opens the champion gate", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      queryStatus: "error",
      championPrediction: null,
    }),
    false,
  );
});

test("locked predictions with no saved row do not open the champion gate", () => {
  assert.equal(
    shouldPromptForChampionPrediction({
      ...basePromptArgs,
      predictionsOpen: false,
      championPrediction: null,
    }),
    false,
  );
});
