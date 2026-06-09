import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';

const scorePredictionsForMatch = (match, predictions) =>
  predictions.map((prediction) => {
    if (prediction.match_id !== match.id || match.status !== 'finished' || !match.result) {
      return prediction;
    }

    const isCorrect = prediction.predicted_result === match.result;
    return {
      ...prediction,
      is_correct: isCorrect,
      points_awarded: isCorrect ? 1 : 0,
      updated_at: new Date().toISOString(),
    };
  });

export const predictionService = {
  async getPredictionsForUser(userId) {
    if (!userId) return [];
    if (isDemoMode) {
      const store = localStore.getStore();
      return store.predictions.filter((prediction) => prediction.user_id === userId);
    }

    const { data, error } = await supabase.from('predictions').select('*').eq('user_id', userId);
    if (error) throw error;
    return data;
  },
  async upsertPrediction({ userId, matchId, predictedResult }) {
    if (isDemoMode) {
      const prediction = {
        id: crypto.randomUUID(),
        user_id: userId,
        match_id: matchId,
        predicted_result: predictedResult,
        is_correct: null,
        points_awarded: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return localStore.upsertPrediction(prediction);
    }

    const { data, error } = await supabase
      .from('predictions')
      .upsert(
        {
          user_id: userId,
          match_id: matchId,
          predicted_result: predictedResult,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,match_id' },
      )
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },
  async recalculateMatch(matchId) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const match = store.matches.find((item) => item.id === matchId);
      const predictions = scorePredictionsForMatch(match, store.predictions);
      localStore.setStore({ ...store, predictions });
      return;
    }

    const { error } = await supabase.rpc('recalculate_match_points', { target_match_id: matchId });
    if (error) throw error;
  },
};
