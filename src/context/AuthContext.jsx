import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { authService } from '../services/authService';
import { championService } from '../services/championService';
import { profileService } from '../services/profileService';
import { isDemoMode, isSupabaseConfigured, supabase } from '../services/supabaseClient';
import {
  AUTH_CALLBACK_EVENTS,
  beginCallbackProcessing,
  buildOnboardingStatusForRedirect,
  clearSupabaseAuthCallbackParams,
  endCallbackProcessing,
  getAuthCallbackErrorFromUrl,
  isSupabaseAuthCallback,
  resolvePostAuthRoute,
} from '../utils/authCallback';
import { clearOAuthReturnTo, readOAuthReturnTo } from '../utils/authRedirect';
import { isUsernameComplete } from '../utils/onboarding';

const AuthContext = createContext(null);

const CALLBACK_TIMEOUT_MS = 12000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileQueryStatus, setProfileQueryStatus] = useState('idle');
  const [profileQueryError, setProfileQueryError] = useState(null);
  const [championPrediction, setChampionPrediction] = useState(null);
  const [championQueryStatus, setChampionQueryStatus] = useState('idle');
  const [championQueryError, setChampionQueryError] = useState(null);
  const [championPredictionsOpen, setChampionPredictionsOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authCallbackProcessing, setAuthCallbackProcessing] = useState(
    () => isSupabaseConfigured && isSupabaseAuthCallback(),
  );
  const championSyncVersionRef = useRef(0);
  const authSyncVersionRef = useRef(0);
  const callbackFinishedRef = useRef(false);
  const postAuthRedirectRef = useRef(null);
  const authFlashRef = useRef(null);

  const syncProfile = useCallback(async (activeUser) => {
    if (!activeUser?.id) {
      setProfile(null);
      setProfileQueryStatus('ready');
      setProfileQueryError(null);
      return null;
    }

    setProfileQueryStatus('loading');
    setProfileQueryError(null);

    try {
      let nextProfile = await profileService.getProfile(activeUser.id);
      if (!nextProfile) {
        nextProfile = await profileService.ensureProfile(activeUser.id);
      }

      setProfile(nextProfile);
      setProfileQueryStatus('ready');
      return nextProfile;
    } catch (error) {
      setProfile(null);
      setProfileQueryError(error);
      setProfileQueryStatus('error');
      throw error;
    }
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

      if (
        !prediction &&
        open &&
        isUsernameComplete(activeProfile)
      ) {
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

  const syncAuthenticatedState = useCallback(async (
    activeUser,
    { email, registrationChampion } = {},
  ) => {
    const syncVersion = authSyncVersionRef.current + 1;
    authSyncVersionRef.current = syncVersion;

    setUser(activeUser);

    if (!activeUser?.id) {
      setProfile(null);
      setProfileQueryStatus('ready');
      setProfileQueryError(null);
      setChampionPrediction(null);
      setChampionQueryStatus('ready');
      setChampionQueryError(null);
      setChampionPredictionsOpen(true);
      return { profile: null, championPrediction: null };
    }

    const nextProfile = await syncProfile(activeUser);
    if (syncVersion !== authSyncVersionRef.current) {
      return { profile: nextProfile, championPrediction: null };
    }

    const prediction = await syncChampionPrediction(activeUser, nextProfile, {
      email: email ?? activeUser.email,
      registrationChampion,
    });

    return { profile: nextProfile, championPrediction: prediction };
  }, [syncChampionPrediction, syncProfile]);

  const finishAuthCallback = useCallback(async ({
    session = null,
    event = null,
    passwordRecoveryActive = false,
  } = {}) => {
    if (callbackFinishedRef.current) return;
    if (!beginCallbackProcessing()) return;

    callbackFinishedRef.current = true;

    try {
      const urlError = getAuthCallbackErrorFromUrl();
      if (urlError) {
        authFlashRef.current = { type: 'error', message: urlError };
        postAuthRedirectRef.current = { path: '/login', state: {} };
        clearSupabaseAuthCallbackParams();
        return;
      }

      const isRecovery = passwordRecoveryActive || event === 'PASSWORD_RECOVERY';

      if (session?.user) {
        if (isRecovery) {
          setPasswordRecovery(true);
          await syncAuthenticatedState(session.user, { email: session.user.email });
          postAuthRedirectRef.current = { path: '/reset-password', state: {} };
        } else {
          setPasswordRecovery(false);
          const { profile: nextProfile, championPrediction: nextPrediction } =
            await syncAuthenticatedState(session.user, { email: session.user.email });

          const predictionsOpen = await championService.areChampionPredictionsOpen();

          const onboardingStatus = buildOnboardingStatusForRedirect({
            profile: nextProfile,
            profileQueryStatus: 'ready',
            championQueryStatus: 'ready',
            championPrediction: nextPrediction,
            championPredictionsOpen: predictionsOpen,
            isAdmin: Boolean(nextProfile?.is_admin),
          });

          postAuthRedirectRef.current = resolvePostAuthRoute({
            onboardingStatus,
            returnTo: readOAuthReturnTo(),
          });
          clearOAuthReturnTo();
        }

        clearSupabaseAuthCallbackParams();
        return;
      }

      clearSupabaseAuthCallbackParams();
      authFlashRef.current = {
        type: 'success',
        message: 'Email confirmed. Log in to continue.',
      };
      postAuthRedirectRef.current = { path: '/login', state: {} };
    } catch {
      authFlashRef.current = {
        type: 'error',
        message: 'Could not load your account. Try again.',
      };
      postAuthRedirectRef.current = { path: '/login', state: {} };
      clearSupabaseAuthCallbackParams();
    } finally {
      endCallbackProcessing();
      setAuthCallbackProcessing(false);
      setLoading(false);
    }
  }, [syncAuthenticatedState]);

  const failAuthCallback = useCallback((message) => {
    if (callbackFinishedRef.current) return;
    if (!beginCallbackProcessing()) return;

    callbackFinishedRef.current = true;
    authFlashRef.current = { type: 'error', message };
    postAuthRedirectRef.current = { path: '/login', state: {} };
    clearSupabaseAuthCallbackParams();
    endCallbackProcessing();
    setAuthCallbackProcessing(false);
    setLoading(false);
  }, []);

  const refreshUser = useCallback(async () => {
    setLoading(true);
    try {
      const activeUser = await authService.getSession();
      await syncAuthenticatedState(activeUser, {
        email: activeUser?.email,
      });
    } finally {
      setLoading(false);
    }
  }, [syncAuthenticatedState]);

  useEffect(() => {
    if (isDemoMode) {
      refreshUser();
      return undefined;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      setAuthCallbackProcessing(false);
      return undefined;
    }

    const hadCallback = isSupabaseAuthCallback();
    callbackFinishedRef.current = !hadCallback;

    if (hadCallback) {
      setAuthCallbackProcessing(true);
      setLoading(true);
    }

    let timeoutId = null;

    if (hadCallback) {
      timeoutId = window.setTimeout(async () => {
        if (callbackFinishedRef.current) return;

        const { data, error } = await supabase.auth.getSession();
        if (error) {
          failAuthCallback('Could not complete sign-in. Try again.');
          return;
        }

        if (data.session) {
          await finishAuthCallback({ session: data.session, event: 'TIMEOUT' });
          return;
        }

        const urlError = getAuthCallbackErrorFromUrl();
        failAuthCallback(urlError ?? 'Could not complete sign-in. Try again.');
      }, CALLBACK_TIMEOUT_MS);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        syncAuthenticatedState(null).catch(() => undefined);
        setLoading(false);
        return;
      }

      if (hadCallback && !callbackFinishedRef.current) {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
          finishAuthCallback({
            session,
            event,
            passwordRecoveryActive: true,
          }).catch(() => {
            failAuthCallback('Could not complete sign-in. Try again.');
          });
          return;
        }

        if (AUTH_CALLBACK_EVENTS.has(event) && session?.user) {
          finishAuthCallback({ session, event }).catch(() => {
            failAuthCallback('Could not complete sign-in. Try again.');
          });
          return;
        }

        if (event === 'INITIAL_SESSION' && !session?.user) {
          return;
        }

        return;
      }

      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      }

      if (event === 'INITIAL_SESSION') {
        syncAuthenticatedState(session?.user ?? null, {
          email: session?.user?.email,
        })
          .catch(() => undefined)
          .finally(() => {
            setLoading(false);
          });
        return;
      }

      syncAuthenticatedState(session?.user ?? null, {
        email: session?.user?.email,
      }).catch(() => undefined);
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [failAuthCallback, finishAuthCallback, isDemoMode, refreshUser, syncAuthenticatedState]);

  const signUp = useCallback(async (payload) => {
    const result = await authService.signUp(payload);
    setPasswordRecovery(false);
    if (result?.needsEmailConfirmation) {
      setUser(null);
      setProfile(null);
      setProfileQueryStatus('idle');
      setProfileQueryError(null);
      setChampionPrediction(null);
      setChampionQueryStatus('idle');
      setChampionQueryError(null);
      return result;
    }

    const nextUser = result?.user;
    await syncAuthenticatedState(nextUser, {
      email: payload.email ?? nextUser?.email,
      registrationChampion: payload.champion,
    });
    return result;
  }, [syncAuthenticatedState]);

  const signIn = useCallback(async (payload) => {
    const nextUser = await authService.signIn(payload);
    setPasswordRecovery(false);
    await syncAuthenticatedState(nextUser, {
      email: payload.email ?? nextUser?.email,
    });
  }, [syncAuthenticatedState]);

  const signInWithGoogle = useCallback(async () => {
    setPasswordRecovery(false);
    return authService.signInWithGoogle();
  }, []);

  const completeUsername = useCallback(async (username) => {
    if (!user?.id) {
      throw new Error('You must be logged in to choose a username.');
    }

    const savedProfile = await profileService.setUsername(user.id, username);
    setProfile(savedProfile);
    setProfileQueryStatus('ready');
    setProfileQueryError(null);
    await syncChampionPrediction(user, savedProfile, {
      email: user.email,
    });
    return savedProfile;
  }, [syncChampionPrediction, user]);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setPasswordRecovery(false);
    setUser(null);
    setProfile(null);
    setProfileQueryStatus('idle');
    setProfileQueryError(null);
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

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return null;
    const nextProfile = await syncProfile(user);
    await syncChampionPrediction(user, nextProfile, {
      email: user.email,
    });
    return nextProfile;
  }, [syncChampionPrediction, syncProfile, user]);

  const consumePostAuthRedirect = useCallback(() => {
    const redirect = postAuthRedirectRef.current;
    postAuthRedirectRef.current = null;
    return redirect;
  }, []);

  const consumeAuthFlash = useCallback(() => {
    const flash = authFlashRef.current;
    authFlashRef.current = null;
    return flash;
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      profileQueryStatus,
      profileQueryError,
      championPrediction,
      championQueryStatus,
      championQueryError,
      championPredictionsOpen,
      loading,
      authCallbackProcessing,
      isAuthenticated: Boolean(user),
      isAdmin: Boolean(profile?.is_admin),
      isSupabaseConfigured,
      isDemoMode,
      passwordRecovery,
      signUp,
      signIn,
      signInWithGoogle,
      completeUsername,
      signOut,
      refreshUser,
      refreshProfile,
      refreshChampionPrediction,
      clearPasswordRecovery,
      consumePostAuthRedirect,
      consumeAuthFlash,
    }),
    [
      authCallbackProcessing,
      championPrediction,
      championPredictionsOpen,
      championQueryError,
      championQueryStatus,
      clearPasswordRecovery,
      completeUsername,
      consumeAuthFlash,
      consumePostAuthRedirect,
      loading,
      passwordRecovery,
      profile,
      profileQueryError,
      profileQueryStatus,
      refreshChampionPrediction,
      refreshProfile,
      refreshUser,
      signIn,
      signInWithGoogle,
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
