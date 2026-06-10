/**
 * NatureGuard — Supabase Client Singleton
 * Single instance used across the entire app.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Real Supabase client when env vars are present */
function createRealClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         'natureguard-auth',
    },
  });
}

/** No-op stub when env vars are missing — prevents crash, shows helpful error in UI */
function createStubClient() {
  console.warn(
    '[NatureGuard] Supabase env vars missing.\n' +
    'Copy .env.example → .env and add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  );
  const notConfigured = { message: '⚠️ Supabase not configured. See .env.example' };
  return {
    auth: {
      getSession:         async () => ({ data: { session: null }, error: null }),
      getUser:            async () => ({ data: { user: null }, error: null }),
      signUp:             async () => ({ data: null, error: notConfigured }),
      signInWithPassword: async () => ({ data: null, error: notConfigured }),
      signInWithOAuth:    async () => ({ data: null, error: notConfigured }),
      signInWithOtp:      async () => ({ data: null, error: notConfigured }),
      signOut:            async () => ({ error: null }),
      onAuthStateChange:  (cb) => {
        cb('INITIAL_SESSION', null);
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: () => ({
      select:  () => ({ data: [], error: notConfigured }),
      insert:  async () => ({ data: null, error: notConfigured }),
      update:  async () => ({ data: null, error: notConfigured }),
      delete:  async () => ({ data: null, error: notConfigured }),
      upsert:  async () => ({ data: null, error: notConfigured }),
      eq:      function() { return this; },
      single:  async () => ({ data: null, error: notConfigured }),
    }),
  };
}

export const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createRealClient()
  : createStubClient();
