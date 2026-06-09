import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { isDemoMode, isSupabaseConfigured, supabase } from '../services/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
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

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const activeUser = await authService.getSession();
      setUser(activeUser);
      await loadProfile(activeUser);
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

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
      loadProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile, refreshUser]);

  const signUp = useCallback(async (payload) => {
    const nextUser = await authService.signUp(payload);
    setPasswordRecovery(false);
    setUser(nextUser);
    await loadProfile(nextUser);
  }, [loadProfile]);

  const signIn = useCallback(async (payload) => {
    const nextUser = await authService.signIn(payload);
    setPasswordRecovery(false);
    setUser(nextUser);
    await loadProfile(nextUser);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setPasswordRecovery(false);
    setUser(null);
    setProfile(null);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
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
      clearPasswordRecovery,
    }),
    [clearPasswordRecovery, loading, passwordRecovery, profile, refreshUser, signIn, signOut, signUp, user],
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
