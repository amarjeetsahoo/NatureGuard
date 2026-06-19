/**
 * NatureGuard — Auth Service
 * All authentication operations. Returns { data, error } from Supabase.
 */

import { supabase } from './supabaseClient.js';

/** Sign up with email + password. Creates auth user + profile row. */
export async function signUpWithEmail(email, password, displayName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  return { data, error };
}

/** Sign in with email + password. */
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

/** Sign in with Google OAuth (opens popup/redirect). */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirect to the app root — main.js onAuthChange will route to dashboard/onboarding
      redirectTo: `${location.origin}/`,
      queryParams: {
        access_type: 'offline',  // Request a refresh token
        prompt: 'consent',       // Always show consent screen to ensure we get refresh token
      },
    },
  });
  return { data, error };
}

/** Send a magic link (passwordless) to the given email. */
export async function signInWithMagicLink(email) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${location.origin}/#dashboard` },
  });
  return { data, error };
}

/** Send a password reset email */
export async function resetPasswordForEmail(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin,
  });
  return { data, error };
}

/** Update an authenticated user's password */
export async function updateUserPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword
  });
  return { data, error };
}

/** Sign out the current user. */
export async function signOut() {
  // Use 'local' scope to clear only the local session token.
  // This avoids a 403 from Supabase's global logout endpoint while
  // still correctly signing out the user on this device.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  return { error };
}

/** Get the current session synchronously (may be null). */
export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Get the current user. */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Subscribe to auth state changes.
 * @param {function} callback - Called with (session | null)
 * @returns Unsubscribe function
 */
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => callback(session)
  );
  return () => subscription.unsubscribe();
}
