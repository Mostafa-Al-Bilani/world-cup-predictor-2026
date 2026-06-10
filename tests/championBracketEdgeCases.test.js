import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateStagePredictionPoints,
  getActualTeamsForStage,
  normalizeStagePredictionStage,
  validateStageSelection,
} from "../src/utils/stagePredictions.js";

const makeTeams = (count) =>
  Array.from({ length: count }, (_, index) => `Team ${index + 1}`);

test("normalizes bracket stage names", () => {
  assert.equal(normalizeStagePredictionStage("Round of 32"), "round_of_32");
  assert.equal(normalizeStagePredictionStage("round_of_16"), "round_of_16");
  assert.equal(normalizeStagePredictionStage("Quarter Finals"), "quarter_finals");
  assert.equal(normalizeStagePredictionStage("Semi-finals"), "semi_finals");
  assert.equal(normalizeStagePredictionStage("Finalists"), "finalists");
});

test("round_of_16 requires exactly 16 teams", () => {
  assert.throws(
    () =>
      validateStageSelection({
        stage: "round_of_16",
        selectedTeams: makeTeams(15),
        availableTeams: makeTeams(32),
      }),
    /Select exactly 16 teams/,
  );
});

test("quarter_finals requires exactly 8 teams", () => {
  assert.throws(
    () =>
      validateStageSelection({
        stage: "quarter_finals",
        selectedTeams: makeTeams(7),
        availableTeams: makeTeams(16),
      }),
    /Select exactly 8 teams/,
  );
});

test("semi_finals requires exactly 4 teams", () => {
  assert.throws(
    () =>
      validateStageSelection({
        stage: "semi_finals",
        selectedTeams: makeTeams(3),
        availableTeams: makeTeams(8),
      }),
    /Select exactly 4 teams/,
  );
});

test("finalists requires exactly 2 teams", () => {
  assert.throws(
    () =>
      validateStageSelection({
        stage: "finalists",
        selectedTeams: ["Team 1"],
        availableTeams: makeTeams(4),
      }),
    /Select exactly 2 teams/,
  );
});

test("accepts a valid finalists selection", () => {
  const selectedTeams = ["Team 1", "Team 2"];

  const result = validateStageSelection({
    stage: "finalists",
    selectedTeams,
    availableTeams: makeTeams(4),
  });

  assert.deepEqual(result, selectedTeams);
});

test("excludes common knockout placeholders from actual teams", () => {
  const matches = [
    {
      stage: "Round of 16",
      team_a: "Round of 32 1 Winner",
      team_b: "Argentina",
    },
    {
      stage: "Round of 16",
      team_a: "W12",
      team_b: "France",
    },
    {
      stage: "Round of 16",
      team_a: "Brazil",
      team_b: "TBD",
    },
  ];

  assert.deepEqual(getActualTeamsForStage(matches, "round_of_16"), [
    "Argentina",
    "Brazil",
    "France",
  ]);
});

test("scores only matching selected teams", () => {
  const selectedTeams = [
    "Argentina",
    "France",
    "Brazil",
    "Spain",
    "Germany",
    "Portugal",
    "England",
    "Netherlands",
  ];

  const actualTeams = [
    "Argentina",
    "France",
    "Brazil",
    "Spain",
    "Morocco",
    "Japan",
    "USA",
    "Mexico",
  ];

  const result = calculateStagePredictionPoints({
    stage: "quarter_finals",
    selectedTeams,
    actualTeams,
  });

  assert.equal(result.scored, true);
  assert.equal(result.correctCount, 4);
  assert.deepEqual(result.correctTeams, [
    "Argentina",
    "France",
    "Brazil",
    "Spain",
  ]);
  assert.equal(result.pointsAwarded, 12);
});

test("does not score quarter finals until all 8 actual teams are known", () => {
  const result = calculateStagePredictionPoints({
    stage: "quarter_finals",
    selectedTeams: makeTeams(8),
    actualTeams: makeTeams(7),
  });

  assert.equal(result.scored, false);
  assert.equal(result.correctCount, 0);
  assert.equal(result.pointsAwarded, 0);
});