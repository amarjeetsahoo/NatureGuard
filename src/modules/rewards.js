/**
 * NatureGuard — Rewards & Gamification Engine
 * Handles XP, Streaks, and Badges.
 */

import { supabase } from '../auth/supabaseClient.js';
import { getCurrentUser } from '../auth/authService.js';
import { toastSuccess } from '../utils/toast.js';
import { eventBus } from './eventBus.js';

// Local profile fetch helper to avoid circular dependency with db.js
async function getRewardsProfile() {
  const user = await getCurrentUser();
  if (!user) return { data: null };
  return supabase.from('profiles').select('*').eq('id', user.id).single();
}

async function updateRewardsProfile(changes) {
  const user = await getCurrentUser();
  if (!user) return { error: { message: 'Not authenticated' } };
  return supabase.from('profiles').update(changes).eq('id', user.id).select().single();
}

export const BADGES = {
  first_log: { id: 'first_log', title: 'Seed Planter', icon: '🌱', desc: 'Logged your first activity' },
  streak_3: { id: 'streak_3', title: 'Sprouting', icon: '🌿', desc: 'Reached a 3-day streak' },
  streak_5: { id: 'streak_5', title: 'Taking Root', icon: '🌳', desc: 'Reached a 5-day streak' },
  streak_10: { id: 'streak_10', title: 'Forest Guardian', icon: '🌲', desc: 'Reached a 10-day streak' },
  streak_15: { id: 'streak_15', title: 'Eco Warrior', icon: '⚔️', desc: 'Reached a 15-day streak' },
  streak_30: { id: 'streak_30', title: 'Earth Champion', icon: '🌍', desc: 'Reached a 30-day streak' },
  streak_90: { id: 'streak_90', title: 'Nature Legend', icon: '👑', desc: 'Reached a 90-day streak' },
  cat_travel: { id: 'cat_travel', title: 'Eco Traveler', icon: '✈️', desc: 'Logged a travel activity' },
  cat_shop: { id: 'cat_shop', title: 'Conscious Consumer', icon: '🛍️', desc: 'Logged a shopping activity' },
  cat_transport: { id: 'cat_transport', title: 'Green Commuter', icon: '🚲', desc: 'Logged a transport activity' },
  first_action: { id: 'first_action', title: 'Action Taker', icon: '🔥', desc: 'Adopted your first eco-action' }
};

export function getLevel(points) {
  if (points < 100) return { level: 1, title: 'Seed', nextThreshold: 100 };
  if (points < 300) return { level: 2, title: 'Sprout', nextThreshold: 300 };
  if (points < 600) return { level: 3, title: 'Sapling', nextThreshold: 600 };
  if (points < 1000) return { level: 4, title: 'Young Tree', nextThreshold: 1000 };
  if (points < 2000) return { level: 5, title: 'Mighty Oak', nextThreshold: 2000 };
  if (points < 5000) return { level: 6, title: 'Forest Guardian', nextThreshold: 5000 };
  return { level: 7, title: 'Nature Legend', nextThreshold: 999999 };
}

/** Award points to the current user */
export async function awardPoints(amount, reason) {
  const { data: prof } = await getRewardsProfile();
  if (!prof) return;

  const currentPoints = prof.points || 0;
  const newPoints = currentPoints + amount;

  const { error } = await updateRewardsProfile({ points: newPoints });
  if (!error) {
    eventBus.emit('POINTS_UPDATED', { points: newPoints });
    toastSuccess(`+${amount} XP: ${reason}`);
    
    // Check if they leveled up
    const oldLevel = getLevel(currentPoints);
    const newLevel = getLevel(newPoints);
    if (newLevel.level > oldLevel.level) {
      setTimeout(() => toastSuccess(`🎉 Level Up! You are now a ${newLevel.title}`), 1000);
    }
  }
}

/** Check and unlock badges */
export async function checkBadges(actionType, meta = {}) {
  const { data: prof } = await getRewardsProfile();
  if (!prof) return;

  let badges = (Array.isArray(prof.badges) ? prof.badges : []).map(b => typeof b === 'string' ? b : (b.key || b.id));
  let newBadges = [];

  const addBadge = (badgeId) => {
    if (!badges.includes(badgeId) && BADGES[badgeId]) {
      badges.push(badgeId);
      newBadges.push(badgeId);
    }
  };

  // Activity checks
  if (actionType === 'activity') {
    addBadge('first_log');
    
    if (meta.category === 'travel') addBadge('cat_travel');
    if (meta.category === 'shopping') addBadge('cat_shop');
    if (meta.category === 'transport') addBadge('cat_transport');
    
    // Streak badges
    const streak = prof.current_streak || 0;
    if (streak >= 3) addBadge('streak_3');
    if (streak >= 5) addBadge('streak_5');
    if (streak >= 10) addBadge('streak_10');
    if (streak >= 15) addBadge('streak_15');
    if (streak >= 30) addBadge('streak_30');
    if (streak >= 90) addBadge('streak_90');
  }

  // Action adopted checks
  if (actionType === 'action_adopted') {
    addBadge('first_action');
  }

  if (newBadges.length > 0) {
    await updateRewardsProfile({ badges });
    newBadges.forEach(b => {
      eventBus.emit('badge:earned', BADGES[b]);
      setTimeout(() => toastSuccess(`🏆 Badge Unlocked: ${BADGES[b].title}!`), 500);
    });
  }
}

/** Evaluate streaks on daily login/log activity */
export async function updateStreakOnLog() {
  const { data: prof } = await getRewardsProfile();
  if (!prof) return;

  const today = new Date().toISOString().split('T')[0];
  const lastLogged = prof.last_logged_date;

  if (lastLogged === today) return; // Already logged today

  let newStreak = prof.current_streak || 0;
  
  if (lastLogged) {
    const lastDate = new Date(lastLogged);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (lastLogged === yesterdayStr) {
      newStreak += 1;
    } else {
      newStreak = 1; // Streak broken, reset
    }
  } else {
    newStreak = 1; // First log ever
  }

  const newLongest = Math.max(newStreak, prof.longest_streak || 0);

  await updateRewardsProfile({
    current_streak: newStreak,
    longest_streak: newLongest,
    last_logged_date: today
  });

  eventBus.emit('streak:updated', { streak: newStreak, longest: newLongest });

  if (newStreak > (prof.current_streak || 0) && newStreak > 1) {
    setTimeout(() => toastSuccess(`🔥 ${newStreak} Day Streak! Keep it up!`), 1000);
  }
}
