/**
 * NatureGuard — Streak & Badge Engine
 * Called every time an activity is logged.
 * Updates current_streak, longest_streak, last_logged_date, and badges.
 */

import { getProfile, updateProfile } from './db.js';
import { eventBus, EVENTS } from './eventBus.js';

// ── Badge Definitions ─────────────────────────────────────────────────────────
// Each badge has a unique key, display info, and a predicate function.
// Predicate receives { profile, newStreak } and returns true if earned.

export const BADGE_DEFS = [
  {
    key: 'first_log',
    icon: '🌱',
    title: 'First Step',
    desc: 'Logged your very first activity',
    color: '#A3E635',
    check: ({ profile }) => (profile.total_logged ?? 1) >= 1,
  },
  {
    key: 'streak_3',
    icon: '🔥',
    title: 'On a Roll',
    desc: '3-day logging streak',
    color: '#F59E0B',
    check: ({ newStreak }) => newStreak >= 3,
  },
  {
    key: 'streak_7',
    icon: '⚡',
    title: 'Week Warrior',
    desc: '7-day logging streak',
    color: '#2DD4BF',
    check: ({ newStreak }) => newStreak >= 7,
  },
  {
    key: 'streak_14',
    icon: '🏆',
    title: 'Fortnight Champion',
    desc: '14-day logging streak',
    color: '#A78BFA',
    check: ({ newStreak }) => newStreak >= 14,
  },
  {
    key: 'streak_30',
    icon: '🌍',
    title: 'Climate Hero',
    desc: '30-day logging streak',
    color: '#F87171',
    check: ({ newStreak }) => newStreak >= 30,
  },
];

/**
 * Call this every time an activity is logged.
 * Computes streak, awards badges, persists to DB, and fires events.
 * @returns {{ newStreak: number, newBadges: Array }} newly awarded badges
 */
export async function onActivityLogged() {
  const { data: profile } = await getProfile();
  if (!profile) return { newStreak: 0, newBadges: [] };

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const lastDate = profile.last_logged_date;

  let newStreak = profile.current_streak || 0;

  if (!lastDate) {
    // Very first log ever
    newStreak = 1;
  } else if (lastDate === today) {
    // Already logged today — streak unchanged, avoid double-counting
    return { newStreak, newBadges: [] };
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastDate === yesterdayStr) {
      // Consecutive day
      newStreak += 1;
    } else {
      // Gap — reset streak
      newStreak = 1;
    }
  }

  const newLongest = Math.max(newStreak, profile.longest_streak || 0);

  // ── Badge Evaluation ────────────────────────────────────────────────────────
  const existingBadgeKeys = new Set((profile.badges || []).map(b => b.key));
  const newBadges = BADGE_DEFS.filter(
    def => !existingBadgeKeys.has(def.key) && def.check({ profile, newStreak })
  );

  const updatedBadges = [
    ...(profile.badges || []),
    ...newBadges.map(b => ({
      key:       b.key,
      icon:      b.icon,
      title:     b.title,
      earned_at: new Date().toISOString(),
    })),
  ];

  // ── Persist ─────────────────────────────────────────────────────────────────
  await updateProfile({
    current_streak:   newStreak,
    longest_streak:   newLongest,
    last_logged_date: today,
    badges:           updatedBadges,
  });

  // ── Fire Events ─────────────────────────────────────────────────────────────
  eventBus.emit(EVENTS.STREAK_UPDATED, { streak: newStreak, longest: newLongest });

  if (newBadges.length > 0) {
    newBadges.forEach(badge => eventBus.emit(EVENTS.BADGE_EARNED, badge));
  }

  return { newStreak, newBadges };
}
