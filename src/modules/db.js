/**
 * NatureGuard — Database Layer
 * All Supabase data access. Single abstraction over raw Supabase calls.
 * Returns { data, error } consistently.
 */

import { supabase } from '../auth/supabaseClient.js';
import { getCurrentUser } from '../auth/authService.js';
import { awardPoints, updateStreakOnLog, checkBadges } from './rewards.js';

// ─────────────────────────────────────────────
// PROFILES
// ─────────────────────────────────────────────

/** Get the current user's profile. */
export async function getProfile() {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  return supabase.from('profiles').select('*').eq('id', user.id).single();
}

/** Update the current user's profile. */
export async function updateProfile(changes) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  return supabase.from('profiles').update(changes).eq('id', user.id).select().single();
}

/** Increment the user's default AI usage count. */
export async function incrementAiUsage() {
  const user = await getCurrentUser();
  if (!user) return;
  
  const { data: profile } = await getProfile();
  if (!profile) return;
  
  return supabase.from('profiles').update({ 
    ai_usage_count: (profile.ai_usage_count || 0) + 1 
  }).eq('id', user.id);
}

// ─────────────────────────────────────────────
// ACTIVITIES
// ─────────────────────────────────────────────

/**
 * Save a single activity.
 * @param {{ category, activity, quantity, unit, co2_kg, source?, notes?, logged_at? }} activity
 */
export async function saveActivity(activity) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  const res = await supabase.from('activities').insert({
    user_id: user.id,
    ...activity,
    logged_at: activity.logged_at || new Date().toISOString(),
  }).select().single();

  if (!res.error) {
    await updateStreakOnLog();
    await awardPoints(10, 'Activity logged');
    await checkBadges('activity', { category: activity.category });
  }

  return res;
}

/**
 * Save multiple activities at once (AI batch logging).
 * @param {Array} activities
 */
export async function saveActivities(activities) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  const rows = activities.map(a => ({
    user_id: user.id,
    logged_at: new Date().toISOString(),
    ...a,
  }));

  const res = await supabase.from('activities').insert(rows).select();

  if (!res.error && activities.length > 0) {
    await updateStreakOnLog();
    await awardPoints(10 * activities.length, `${activities.length} activities logged`);
    for (const a of activities) {
      await checkBadges('activity', { category: a.category });
    }
  }

  return res;
}

/**
 * Fetch activities for the current user.
 * @param {{ from?: string, to?: string, category?: string, limit?: number }} opts
 */
export async function getActivities({ from, to, category, limit = 100, page = 0 } = {}) {
  const user = await getCurrentUser();
  if (!user) return { data: [], error: null, count: 0 };

  let query = supabase
    .from('activities')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('logged_at', { ascending: false });

  if (from) query = query.gte('logged_at', from);
  if (to)   query = query.lte('logged_at', to);
  if (category) query = query.eq('category', category);

  if (limit) {
    const fromRange = page * limit;
    const toRange = fromRange + limit - 1;
    query = query.range(fromRange, toRange);
  }

  return query;
}

/** Get activities for the current week (Mon–Sun). */
export async function getWeekActivities() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  return getActivities({ from: monday.toISOString(), limit: 500 });
}

/** Get activities for the current month. */
export async function getMonthActivities() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  return getActivities({ from: firstOfMonth.toISOString(), limit: 500 });
}

/** Get today's activities. */
export async function getTodayActivities() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return getActivities({ from: today.toISOString(), limit: 200 });
}

/**
 * Get activities for the PRIOR equivalent period (for delta comparison).
 * - 'week'  → previous Mon–Sun
 * - 'month' → previous calendar month
 * - 'today' → yesterday
 * @param {'week'|'month'|'today'} period
 */
export async function getPriorPeriodActivities(period) {
  const now = new Date();

  if (period === 'today') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);
    return getActivities({ from: yesterday.toISOString(), to: endOfYesterday.toISOString(), limit: 200 });
  }

  if (period === 'month') {
    const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastOfLastMonth  = new Date(firstOfThisMonth.getTime() - 1);
    return getActivities({ from: firstOfLastMonth.toISOString(), to: lastOfLastMonth.toISOString(), limit: 500 });
  }

  // Default: 'week' → previous Mon–Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const prevMonday = new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevSunday = new Date(monday.getTime() - 1);
  return getActivities({ from: prevMonday.toISOString(), to: prevSunday.toISOString(), limit: 500 });
}

/** Delete an activity by ID. */
export async function deleteActivity(id) {
  const user = await getCurrentUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase.from('activities').delete().eq('id', id).eq('user_id', user.id);
}

/** Update an activity by ID. */
export async function updateActivity(id, changes) {
  const user = await getCurrentUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  return supabase.from('activities').update(changes).eq('id', id).eq('user_id', user.id).select().single();
}

// ─────────────────────────────────────────────
// USER ACTIONS
// ─────────────────────────────────────────────

export async function getUserActions({ status = null, limit = 100, page = 0 } = {}) {
  const user = await getCurrentUser();
  if (!user) return { data: [], error: null, count: 0 };

  let query = supabase
    .from('user_actions')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (status) query = query.eq('status', status);

  if (limit) {
    const fromRange = page * limit;
    const toRange = fromRange + limit - 1;
    query = query.range(fromRange, toRange);
  }

  return query;
}

/** Save a new suggested action. */
export async function saveAction(action) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  return supabase.from('user_actions').insert({ user_id: user.id, ...action }).select().single();
}

/** Update an action's status (adopt / dismiss). */
export async function updateActionStatus(id, status) {
  const user = await getCurrentUser();
  if (!user) return { error: { message: 'Not authenticated' } };

  const changes = { status };
  if (status === 'adopted') changes.adopted_at = new Date().toISOString();

  const res = await supabase.from('user_actions').update(changes).eq('id', id).eq('user_id', user.id).select().single();

  if (!res.error && status === 'adopted') {
    awardPoints(50, 'Action adopted');
    checkBadges('action_adopted');
  }

  return res;
}

// ─────────────────────────────────────────────
// WEEKLY DIGESTS
// ─────────────────────────────────────────────

/** Get the weekly digest for a given week start (YYYY-MM-DD). */
export async function getWeeklyDigest(weekStart) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: null };

  return supabase
    .from('weekly_digests')
    .select('*')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .maybeSingle();
}

/** Save a weekly digest. */
export async function saveWeeklyDigest(weekStart, content, statsSnapshot) {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: { message: 'Not authenticated' } };

  return supabase.from('weekly_digests').upsert({
    user_id: user.id,
    week_start: weekStart,
    content,
    stats_snapshot: statsSnapshot,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,week_start' }).select().single();
}
