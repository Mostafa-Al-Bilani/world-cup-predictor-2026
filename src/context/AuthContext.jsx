import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { championService } from '../services/championService';
import { profileService } from '../services/profileService';
import { isDemoMode, isSupabaseConfigured, supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [championPrediction, setChampionPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const loadProfile = useCallback(async (activeUser) => {
    if (!activeUser?.id) {
      setProfile(null);
      return null;
    }
    const nextProfile = await profileService.getProfile(activeUser.id);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const loadChampionPrediction = useCallback(async (activeUser, activeProfile) => {
    if (!activeUser?.id || activeProfile?.is_admin) {
      setChampionPrediction(null);
      return null;
    }

    const prediction = await championService.getMyPrediction(activeUser.id);
    setChampionPrediction(prediction);
    return prediction;
  }, []);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const activeUser = await authService.getSession();
      setUser(activeUser);
      const nextProfile = await loadProfile(activeUser);
      await loadChampionPrediction(activeUser, nextProfile);
    } finally {
      setLoading(false);
    }
  }, [loadChampionPrediction, loadProfile]);

  useEffect(() => {
    refreshUser();

    if (!isSupabaseConfigured) return undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null).then((nextProfile) => {
        loadChampionPrediction(session?.user ?? null, nextProfile);
      }).catch(() => setChampionPrediction(null));
    });

    return () => subscription.unsubscribe();
  }, [loadChampionPrediction, loadProfile, refreshUser]);

  const signUp = useCallback(async (payload) => {
    const result = await authService.signUp(payload);
    setPasswordRecovery(false);
    if (result?.needsEmailConfirmation) {
      setUser(null);
      setProfile(null);
      setChampionPrediction(null);
      return result;
    }

    const nextUser = result?.user;
    setUser(nextUser);
    const nextProfile = await loadProfile(nextUser);
    if (payload.champion && !nextProfile?.is_admin) {
      try {
        const prediction = await championService.setPrediction({ userId: nextUser.id, predictedTeam: payload.champion });
        setChampionPrediction(prediction);
      } catch {
        await loadChampionPrediction(nextUser, nextProfile);
      }
    } else {
      await loadChampionPrediction(nextUser, nextProfile);
    }
    return result;
  }, [loadChampionPrediction, loadProfile]);

  const signIn = useCallback(async (payload) => {
    const nextUser = await authService.signIn(payload);
    setPasswordRecovery(false);
    setUser(nextUser);
    const nextProfile = await loadProfile(nextUser);
    await loadChampionPrediction(nextUser, nextProfile);
  }, [loadChampionPrediction, loadProfile]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setPasswordRecovery(false);
    setUser(null);
    setProfile(null);
    setChampionPrediction(null);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      championPrediction,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(profile?.is_admin),
      isSupabaseConfigured,
      isDemoMode,
      passwordRecovery,
      signUp,
      signIn,
      signOut,
      refreshUser,
      refreshChampionPrediction: () => loadChampionPrediction(user, profile),
      clearPasswordRecovery,
    }),
    [
      championPrediction,
      clearPasswordRecovery,
      loadChampionPrediction,
      loading,
      passwordRecovery,
      profile,
      refreshUser,
      signIn,
      signOut,
      signUp,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
