import { worldCupMatches } from '../data/matches';

const STORE_KEY = 'wc26-predictor-demo-store';

const defaultStore = {
  matches: worldCupMatches,
  profiles: [],
  predictions: [],
};

const readStore = () => {
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) return defaultStore;

  try {
    const parsed = JSON.parse(raw);
    return {
      matches: parsed.matches?.length ? parsed.matches : worldCupMatches,
      profiles: parsed.profiles ?? [],
      predictions: parsed.predictions ?? [],
    };
  } catch {
    return defaultStore;
  }
};

const writeStore = (store) => {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  return store;
};

export const localStore = {
  getStore: readStore,
  setStore: writeStore,
  upsertProfile(profile) {
    const store = readStore();
    const existingIndex = store.profiles.findIndex((item) => item.id === profile.id);
    const profiles =
      existingIndex >= 0
        ? store.profiles.map((item) => (item.id === profile.id ? { ...item, ...profile } : item))
        : [...store.profiles, profile];
    return writeStore({ ...store, profiles });
  },
  upsertPrediction(prediction) {
    const store = readStore();
    const predictions = store.predictions.filter(
      (item) => !(item.user_id === prediction.user_id && item.match_id === prediction.match_id),
    );
    writeStore({ ...store, predictions: [...predictions, prediction] });
    return prediction;
  },
  saveMatches(matches) {
    const store = readStore();
    writeStore({ ...store, matches });
  },
};
