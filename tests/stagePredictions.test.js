import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateStagePredictionPoints,
  getActualTeamsForStage,
  validateStageSelection,
} from "../src/utils/stagePredictions.js";

const makeTeams = (count) =>
  Array.from({ length: count }, (_, index) => `Team ${index + 1}`);

test("requires exactly 32 teams for Round of 32", () => {
  assert.throws(
    () =>
      validateStageSelection({
        stage: "round_of_32",
        selectedTeams: makeTeams(31),
        availableTeams: makeTeams(48),
      }),
    /Select exactly 32 teams/,
  );
});

test("rejects duplicate selected teams", () => {
  const selectedTeams = [...makeTeams(31), "Team 1"];

  assert.throws(
    () =>
      validateStageSelection({
        stage: "round_of_32",
        selectedTeams,
        availableTeams: makeTeams(48),
      }),
    /Do not select the same team twice/,
  );
});

test("rejects placeholder teams", () => {
  const selectedTeams = [...makeTeams(31), "TBD"];

  assert.throws(
    () =>
      validateStageSelection({
        stage: "round_of_32",
        selectedTeams,
        availableTeams: [...makeTeams(48), "TBD"],
      }),
    /Choose teams from the tournament team list/,
  );
});

test("extracts actual teams for a stage and excludes placeholders", () => {
  const matches = [
    {
      stage: "Round of 32",
      team_a: "Argentina",
      team_b: "France",
    },
    {
      stage: "Round of 32",
      team_a: "TBD",
      team_b: "Brazil",
    },
    {
      stage: "Quarter-finals",
      team_a: "Spain",
      team_b: "Germany",
    },
  ];

  assert.deepEqual(getActualTeamsForStage(matches, "round_of_32"), [
    "Argentina",
    "Brazil",
    "France",
  ]);
});

test("does not score bracket predictions until all actual teams are known", () => {
  const result = calculateStagePredictionPoints({
    stage: "round_of_16",
    selectedTeams: ["Argentina", "France"],
    actualTeams: ["Argentina", "France"],
  });

  assert.equal(result.scored, false);
  assert.equal(result.pointsAwarded, 0);
});

test("awards points for correct selected teams", () => {
  const selectedTeams = makeTeams(16);
  const actualTeams = [
    ...makeTeams(10),
    ...Array.from({ length: 6 }, (_, index) => `Wrong Team ${index + 1}`),
  ];

  const result = calculateStagePredictionPoints({
    stage: "round_of_16",
    selectedTeams,
    actualTeams,
  });

  assert.equal(result.scored, true);
  assert.equal(result.correctCount, 10);
  assert.equal(result.pointsAwarded, 20);
});