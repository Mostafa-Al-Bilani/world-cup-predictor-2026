import { worldCupMatches } from "../data/matches";
import {
  STAGE_PREDICTION_CONFIGS,
  ROUND_OF_32_LOCK_AT,
  calculateStagePredictionPoints,
  getActualTeamsForStage,
  getStageLockAt,
  getStagePredictionConfig,
  isStageLocked,
  normalizeStagePredictionStage,
  validateStageSelection,
} from "../utils/stagePredictions";
import { validateUuid } from "../utils/validation";
import { championService } from "./championService";
import { isDemoMode, supabase } from "./supabaseClient";
import { localStore } from "./localStore";

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user?.id) {
    throw new Error("You must be logged in to make bracket predictions.");
  }

  return data.user.id;
};

const getLocalMatches = () => {
  const store = localStore.getStore();
  return store.matches?.length ? store.matches : worldCupMatches;
};

const getLocalStageWindows = () => [
  {
    stage: "round_of_32",
    opened_at: "2026-01-01T00:00:00.000Z",
    lock_at: ROUND_OF_32_LOCK_AT,
    updated_at: new Date().toISOString(),
  },
];

const scoreLocalStagePrediction = (prediction, matches, stageWindows = []) => {
  const lockAt = getStageLockAt(matches, prediction.stage, stageWindows);

  if (!isStageLocked(lockAt)) {
    return prediction;
  }

  const actualTeams = getActualTeamsForStage(matches, prediction.stage);

  const result = calculateStagePredictionPoints({
    actualTeams,
    selectedTeams: prediction.selected_teams,
    stage: prediction.stage,
  });

  if (!result.scored) {
    return prediction;
  }

  return {
    ...prediction,
    locked_at: prediction.locked_at ?? lockAt,
    correct_teams: result.correctTeams,
    correct_count: result.correctCount,
    points_awarded: result.pointsAwarded,
    scored_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

export const stagePredictionService = {
  async getMyPredictions(userId) {
    if (!userId) return [];

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const store = localStore.getStore();

      return store.stagePredictions.filter(
        (prediction) => prediction.user_id === normalizedUserId,
      );
    }

    const currentUserId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("stage_predictions")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data ?? [];
  },

  async getStageWindows() {
    if (isDemoMode) {
      return getLocalStageWindows();
    }

    const { data, error } = await supabase
      .from("stage_prediction_windows")
      .select("stage, opened_at, lock_at, updated_at");

    if (error) throw error;

    return data ?? [];
  },

  async savePrediction({ userId, stage, selectedTeams, availableTeams }) {
    const stageKey = normalizeStagePredictionStage(stage);
    const selected = validateStageSelection({
      selectedTeams,
      stage: stageKey,
      availableTeams,
    });

    const config = getStagePredictionConfig(stageKey);

    if (!config) {
      throw new Error("Choose a valid bracket stage.");
    }

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, "User ID");
      const matches = getLocalMatches();
      const stageWindows = getLocalStageWindows();
      const lockAt = getStageLockAt(matches, stageKey, stageWindows);

      if (isStageLocked(lockAt)) {
        throw new Error(`${config.label} predictions are locked.`);
      }

      const prediction = {
        id: crypto.randomUUID(),
        user_id: normalizedUserId,
        stage: stageKey,
        selected_teams: selected,
        correct_teams: [],
        locked_at: lockAt,
        points_awarded: 0,
        correct_count: 0,
        scored_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return localStore.upsertStagePrediction(prediction);
    }

    const { data, error } = await supabase.rpc("save_stage_prediction", {
      target_stage: stageKey,
      selected_teams: selected,
    });

    if (error) throw error;

    return data;
  },

  async recalculateStagePredictions() {
    if (isDemoMode) {
      const store = localStore.getStore();
      const matches = getLocalMatches();
      const stageWindows = getLocalStageWindows();

      const stagePredictions = store.stagePredictions.map((prediction) =>
        scoreLocalStagePrediction(prediction, matches, stageWindows),
      );

      localStore.setStore({ ...store, stagePredictions });

      return stagePredictions.length;
    }

    const { data, error } = await supabase.rpc(
      "recalculate_stage_prediction_points",
      {
        target_stage: null,
      },
    );

    if (error) throw error;

    return data ?? 0;
  },

  async getAdminSummary(matches = []) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const stageWindows = getLocalStageWindows();
      const matchRows = matches.length ? matches : getLocalMatches();

      return STAGE_PREDICTION_CONFIGS.map((config) => ({
        ...config,
        lockAt: getStageLockAt(matchRows, config.key, stageWindows),
        submittedCount: store.stagePredictions.filter(
          (prediction) => prediction.stage === config.key,
        ).length,
        scoredCount: store.stagePredictions.filter(
          (prediction) =>
            prediction.stage === config.key && prediction.scored_at,
        ).length,
      }));
    }

    const [{ data, error }, stageWindows] = await Promise.all([
      supabase.from("stage_predictions").select("stage,scored_at"),
      this.getStageWindows(),
    ]);

    if (error) throw error;

    return STAGE_PREDICTION_CONFIGS.map((config) => {
      const rows = (data ?? []).filter((row) => row.stage === config.key);

      return {
        ...config,
        lockAt: getStageLockAt(matches, config.key, stageWindows),
        submittedCount: rows.length,
        scoredCount: rows.filter((row) => row.scored_at).length,
      };
    });
  },

  getAvailableTeams: () => championService.getAvailableTeams(),
};