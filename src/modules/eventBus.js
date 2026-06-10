/**
 * NatureGuard — Event Bus
 * Simple pub/sub for decoupled communication between modules.
 */

const listeners = new Map();

export const eventBus = {
  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {function} callback
   * @returns Unsubscribe function
   */
  on(event, callback) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(callback);
    return () => listeners.get(event)?.delete(callback);
  },

  /**
   * Emit an event with optional data.
   * @param {string} event
   * @param {*} data
   */
  emit(event, data) {
    listeners.get(event)?.forEach(cb => cb(data));
  },

  /** Remove all listeners for an event. */
  off(event) {
    listeners.delete(event);
  },
};

// App-wide event names (constants to avoid typos)
export const EVENTS = {
  ACTIVITY_LOGGED:    'activity:logged',
  ACTIVITY_DELETED:   'activity:deleted',
  PROFILE_UPDATED:    'profile:updated',
  SCORE_UPDATED:      'score:updated',
  ACTION_ADOPTED:     'action:adopted',
  STREAK_UPDATED:     'streak:updated',
  BADGE_EARNED:       'badge:earned',
  AI_KEY_CHANGED:     'ai:key_changed',
};
