import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';
import { normalizePredictionScorePair, validatePredictionResult, validateUuid } from '../utils/validation';
import { calculatePredictionPoints } from '../utils/predictions';

export const PREDICTIONS_UPDATED_EVENT =
  'world-cup-predictor:predictions-updated';

const notifyPredictionsUpdated = (prediction) => {
  if (
    typeof window === 'undefined' ||
    typeof window.dispatchEvent !== 'function'
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(PREDICTIONS_UPDATED_EVENT, {
      detail: { prediction },
    }),
  );
};

const scorePredictionsForMatch = (match, predictions) =>
  predictions.map((prediction) => {
    if (prediction.match_id !== match.id || match.status !== 'finished' || !match.result) {
      return prediction;
    }

    const points = calculatePredictionPoints(match, prediction);

    return {
      ...prediction,
      ...points,
      points_awarded: points.total_points,
      updated_at: new Date().toISOString(),
    };
  });

const getCurrentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id) {
    throw new Error('You must be logged in to make predictions.');
  }
  return data.user.id;
};

export const predictionService = {
  async getPredictionsForUser(userId) {
    if (!userId) return [];
    if (isDemoMode) {
      const store = localStore.getStore();
      return store.predictions.filter((prediction) => prediction.user_id === userId);
    }

    const currentUserId = await getCurrentUserId();
    const { data, error } = await supabase.from('predictions').select('*').eq('user_id', currentUserId);
    if (error) throw error;
    return data;
  },

  async getPredictionsForMatchIds(matchIds = []) {
    const normalizedMatchIds = [...new Set((matchIds ?? []).filter(Boolean))];

    if (!normalizedMatchIds.length) {
      return [];
    }

    if (isDemoMode) {
      const store = localStore.getStore();
      const idSet = new Set(normalizedMatchIds);

      return store.predictions.filter((prediction) =>
        idSet.has(prediction.match_id),
      );
    }

    const currentUserId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("user_id", currentUserId)
      .in("match_id", normalizedMatchIds);

    if (error) throw error;
    return data ?? [];
  },
  async upsertPrediction({ userId, matchId, predictedResult, predictedHomeScore = null, predictedAwayScore = null }) {
    const normalizedMatchId = validateUuid(matchId, 'Match ID');
    const normalizedResult = validatePredictionResult(predictedResult);
    const scorePair = normalizePredictionScorePair(predictedHomeScore, predictedAwayScore);

    if (isDemoMode) {
      const normalizedUserId = validateUuid(userId, 'User ID');
      const prediction = {
        id: crypto.randomUUID(),
        user_id: normalizedUserId,
        match_id: normalizedMatchId,
        predicted_result: normalizedResult,
        predicted_home_score: scorePair.predictedHomeScore,
        predicted_away_score: scorePair.predictedAwayScore,
        is_correct: null,
        winner_points: 0,
        exact_score_points: 0,
        total_points: 0,
        points_awarded: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const savedPrediction = localStore.upsertPrediction(prediction);
      notifyPredictionsUpdated(savedPrediction);
      return savedPrediction;
    }

    const currentUserId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: currentUserId,
          match_id: normalizedMatchId,
          predicted_result: normalizedResult,
          predicted_home_score: scorePair.predictedHomeScore,
          predicted_away_score: scorePair.predictedAwayScore,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_id' },
      )
      .select('*')
      .single();

    if (error) throw error;

    notifyPredictionsUpdated(data);
    return data;
  },
  async recalculateMatch(matchId) {
    const normalizedMatchId = validateUuid(matchId, 'Match ID');
    if (isDemoMode) {
      const store = localStore.getStore();
      const match = store.matches.find((item) => item.id === normalizedMatchId);
      const predictions = scorePredictionsForMatch(match, store.predictions);
      localStore.setStore({ ...store, predictions });
      return;
    }

    const { error } = await supabase.rpc('recalculate_match_points', { target_match_id: normalizedMatchId });
    if (error) throw error;
  },
};
