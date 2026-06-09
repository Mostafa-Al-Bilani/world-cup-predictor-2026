import { isDemoMode, supabase } from './supabaseClient';
import { localStore } from './localStore';

const makeProfile = ({ id, email, username, isAdmin = false }) => ({
  id,
  email,
  username,
  total_points: 0,
  correct_predictions: 0,
  total_predictions: 0,
  is_admin: isAdmin,
  created_at: new Date().toISOString(),
});

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
    if (isDemoMode) {
      const profile = makeProfile({
        id: crypto.randomUUID(),
        email,
        username,
        isAdmin: email.toLowerCase().includes('admin'),
      });
      localStore.upsertProfile(profile);
      window.localStorage.setItem('wc26-demo-user', JSON.stringify(profile));
      return profile;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });
    if (error) throw error;
    return data.user;
  },
  async signIn({ email, password }) {
    if (isDemoMode) {
      const store = localStore.getStore();
      const profile = store.profiles.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (!profile) {
        const created = makeProfile({
          id: crypto.randomUUID(),
          email,
          username: email.split('@')[0],
          isAdmin: email.toLowerCase().includes('admin'),
        });
        localStore.upsertProfile(created);
        window.localStorage.setItem('wc26-demo-user', JSON.stringify(created));
        return created;
      }
      window.localStorage.setItem('wc26-demo-user', JSON.stringify(profile));
      return profile;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
};
