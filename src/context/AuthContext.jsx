import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '../services/authService';
import { championService } from '../services/championService';
import { profileService } from '../services/profileService';
import { isDemoMode, isSupabaseConfigured, supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [championPrediction, setChampionPrediction] = useState(null);
  const [championQueryStatus, setChampionQueryStatus] = useState('idle');
  const [championQueryError, setChampionQueryError] = useState(null);
  const [championPredictionsOpen, setChampionPredictionsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const championSyncVersionRef = useRef(0);

  const loadProfile = useCallback(async (activeUser) => {
    if (!activeUser?.id) {
      setProfile(null);
      return null;
    }
    const nextProfile = await profileService.getProfile(activeUser.id);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const syncChampionPrediction = useCallback(async (
    activeUser,
    activeProfile,
    { email, registrationChampion } = {},
  ) => {
    const syncVersion = championSyncVersionRef.current + 1;
    championSyncVersionRef.current = syncVersion;

    if (!activeUser?.id || activeProfile?.is_admin) {
      if (syncVersion === championSyncVersionRef.current) {
        setChampionPrediction(null);
        setChampionQueryStatus('ready');
        setChampionQueryError(null);
        setChampionPredictionsOpen(true);
      }
      return null;
    }

    if (syncVersion === championSyncVersionRef.current) {
      setChampionQueryStatus('loading');
      setChampionQueryError(null);
    }

    try {
      const open = await championService.areChampionPredictionsOpen();
      let prediction = await championService.getMyPrediction(activeUser.id);

      if (!prediction && open) {
        prediction = await championService.persistMissingChampionPrediction({
          userId: activeUser.id,
          email: email ?? activeUser.email,
          registrationChampion,
        });
      }

      if (syncVersion !== championSyncVersionRef.current) {
        return prediction;
      }

      setChampionPredictionsOpen(open);
      setChampionPrediction(prediction);
      setChampionQueryStatus('ready');
      setChampionQueryError(null);
      return prediction;
    } catch (error) {
      if (syncVersion !== championSyncVersionRef.current) {
        throw error;
      }

      setChampionQueryError(error);
      setChampionQueryStatus('error');
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const activeUser = await authService.getSession();
      setUser(activeUser);
      const nextProfile = await loadProfile(activeUser);
      await syncChampionPrediction(activeUser, nextProfile, {
        email: activeUser?.email,
      });
    } finally {
      setLoading(false);
    }
  }, [loadProfile, syncChampionPrediction]);

  useEffect(() => {
    refreshUser();

    if (!isSupabaseConfigured) return undefined;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }

      const nextUser = session?.user ?? null;
      setUser(nextUser);

      loadProfile(nextUser)
        .then((nextProfile) =>
          syncChampionPrediction(nextUser, nextProfile, {
            email: nextUser?.email,
          }),
        )
        .catch((error) => {
          setChampionQueryError(error);
          setChampionQueryStatus('error');
        });
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, refreshUser, syncChampionPrediction]);

  const signUp = useCallback(async (payload) => {
    const result = await authService.signUp(payload);
    setPasswordRecovery(false);
    if (result?.needsEmailConfirmation) {
      setUser(null);
      setProfile(null);
      setChampionPrediction(null);
      setChampionQueryStatus('idle');
      setChampionQueryError(null);
      return result;
    }

    const nextUser = result?.user;
    setUser(nextUser);
    const nextProfile = await loadProfile(nextUser);
    await syncChampionPrediction(nextUser, nextProfile, {
      email: payload.email ?? nextUser?.email,
      registrationChampion: payload.champion,
    });
    return result;
  }, [loadProfile, syncChampionPrediction]);

  const signIn = useCallback(async (payload) => {
    const nextUser = await authService.signIn(payload);
    setPasswordRecovery(false);
    setUser(nextUser);
    const nextProfile = await loadProfile(nextUser);
    await syncChampionPrediction(nextUser, nextProfile, {
      email: payload.email ?? nextUser?.email,
    });
  }, [loadProfile, syncChampionPrediction]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setPasswordRecovery(false);
    setUser(null);
    setProfile(null);
    setChampionPrediction(null);
    setChampionQueryStatus('idle');
    setChampionQueryError(null);
    setChampionPredictionsOpen(true);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const refreshChampionPrediction = useCallback(async () => {
    return syncChampionPrediction(user, profile, {
      email: user?.email,
    });
  }, [profile, syncChampionPrediction, user]);

  const value = useMemo(
    () => ({
      user,
      profile,
      championPrediction,
      championQueryStatus,
      championQueryError,
      championPredictionsOpen,
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
      refreshChampionPrediction,
      clearPasswordRecovery,
    }),
    [
      championPrediction,
      championPredictionsOpen,
      championQueryError,
      championQueryStatus,
      clearPasswordRecovery,
      loading,
      passwordRecovery,
      profile,
      refreshChampionPrediction,
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
