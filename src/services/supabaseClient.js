import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

export const requiredSupabaseEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
export const isProductionBuild = import.meta.env.PROD;

const isPlaceholderValue = (value) => /your-|placeholder|example/i.test(value ?? '');

const isValidSupabaseUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseAnonKey) &&
  isValidSupabaseUrl(supabaseUrl) &&
  !isPlaceholderValue(supabaseUrl) &&
  !isPlaceholderValue(supabaseAnonKey);

export const isDemoMode = !isProductionBuild && !isSupabaseConfigured;
export const hasSupabaseConfigurationError = isProductionBuild && !isSupabaseConfigured;

export const getSupabaseConfigurationMessage = () =>
  'Supabase is required in production. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before deploying.';

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
