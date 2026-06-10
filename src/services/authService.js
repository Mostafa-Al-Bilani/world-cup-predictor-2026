import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';
import { normalizeEmail, normalizeUsername, validatePassword } from '../utils/validation';

const makeProfile = ({ id, email, username, isAdmin = false }) => ({
  id,
  email,
  username,
  total_points: 0,
  match_winner_points: 0,
  exact_score_points: 0,
  champion_points: 0,
  bracket_points: 0,
  correct_predictions: 0,
  total_predictions: 0,
  is_admin: isAdmin,
  created_at: new Date().toISOString(),
});

const getAppBaseUrl = () => `${window.location.origin}${import.meta.env.BASE_URL}`;
const getHashRouteRedirectUrl = (path) => `${getAppBaseUrl()}#${path.startsWith('/') ? path : `/${path}`}`;
const getEmailConfirmationRedirectUrl = () => getHashRouteRedirectUrl('/login');
const getPasswordResetRedirectUrl = () => getAppBaseUrl();

export const authService = {
  async getSession() {
    if (isDemoMode) {
      const demoUser = window.localStorage.getItem('wc26-demo-user');
      return demoUser ? JSON.parse(demoUser) : null;
    }

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session?.user ?? null;
  },
  async signUp({ email, password, username }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);
    const normalizedPassword = validatePassword(password);

    if (isDemoMode) {
      const profile = makeProfile({
        id: crypto.randomUUID(),
        email: normalizedEmail,
        username: normalizedUsername,
        isAdmin: normalizedEmail.includes('admin'),
      });
      localStore.upsertProfile(profile);
      window.localStorage.setItem('wc26-demo-user', JSON.stringify(profile));
      return {
        user: profile,
        session: { user: profile },
        needsEmailConfirmation: false,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: normalizedPassword,
      options: {
        data: { username: normalizedUsername },
        emailRedirectTo: getEmailConfirmationRedirectUrl(),
      },
    });
    if (error) throw error;
    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session,
    };
  },
  async signIn({ email, password }) {
    const normalizedEmail = normalizeEmail(email);
    const normalizedPassword = validatePassword(password);

    if (isDemoMode) {
      const store = localStore.getStore();
      const profile = store.profiles.find((item) => item.email.toLowerCase() === normalizedEmail);
      if (!profile) {
        const created = makeProfile({
          id: crypto.randomUUID(),
          email: normalizedEmail,
          username: normalizedEmail.split('@')[0],
          isAdmin: normalizedEmail.includes('admin'),
        });
        localStore.upsertProfile(created);
        window.localStorage.setItem('wc26-demo-user', JSON.stringify(created));
        return created;
      }
      window.localStorage.setItem('wc26-demo-user', JSON.stringify(profile));
      return profile;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword });
    if (error) throw error;
    return data.user;
  },
  async signOut() {
    if (isDemoMode) {
      window.localStorage.removeItem('wc26-demo-user');
      return;
    }
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },
  async sendPasswordResetEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (isDemoMode) {
      throw new Error('Password reset emails require Supabase. Local demo accounts can be recreated with any email.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getPasswordResetRedirectUrl(),
    });
    if (error) throw error;
  },
  async resendConfirmationEmail(email) {
    const normalizedEmail = normalizeEmail(email);

    if (isDemoMode) {
      throw new Error('Email confirmation requires Supabase authentication.');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: getEmailConfirmationRedirectUrl(),
      },
    });
    if (error) throw error;
  },
  async updatePassword(password) {
    const normalizedPassword = validatePassword(password, 'New password');

    if (isDemoMode) {
      throw new Error('Password updates require Supabase authentication.');
    }

    const { data, error } = await supabase.auth.updateUser({ password: normalizedPassword });
    if (error) throw error;
    return data.user;
  },
};
