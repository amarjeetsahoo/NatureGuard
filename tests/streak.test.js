/**
 * NatureGuard — Streak & Badge Unit Tests
 * Run with: npm test
 */

import { describe, it, expect, vi } from 'vitest';
import { BADGE_DEFS } from '../src/modules/streak.js';

// Mock the db module to prevent Supabase initialization during tests
vi.mock('../src/modules/db.js', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn()
}));

describe('BADGE_DEFS', () => {
  const getBadge = (key) => BADGE_DEFS.find(b => b.key === key);

  describe('First Step badge', () => {
    it('is earned when total_logged >= 1', () => {
      const badge = getBadge('first_log');
      expect(badge.check({ profile: { total_logged: 1 }, newStreak: 1 })).toBe(true);
    });
    it('defaults to earned if total_logged is missing but check is called', () => {
      const badge = getBadge('first_log');
      expect(badge.check({ profile: {}, newStreak: 1 })).toBe(true);
    });
  });

  describe('Streak 3 badge', () => {
    it('is earned on exactly 3 days', () => {
      const badge = getBadge('streak_3');
      expect(badge.check({ newStreak: 3 })).toBe(true);
    });
    it('is earned if past 3 days', () => {
      const badge = getBadge('streak_3');
      expect(badge.check({ newStreak: 5 })).toBe(true);
    });
    it('is NOT earned below 3 days', () => {
      const badge = getBadge('streak_3');
      expect(badge.check({ newStreak: 2 })).toBe(false);
    });
  });

  describe('Streak 7 badge', () => {
    it('is earned on 7 days', () => {
      const badge = getBadge('streak_7');
      expect(badge.check({ newStreak: 7 })).toBe(true);
    });
    it('is NOT earned below 7 days', () => {
      const badge = getBadge('streak_7');
      expect(badge.check({ newStreak: 6 })).toBe(false);
    });
  });

  describe('Streak 30 badge', () => {
    it('is earned on 30 days', () => {
      const badge = getBadge('streak_30');
      expect(badge.check({ newStreak: 30 })).toBe(true);
    });
    it('is NOT earned below 30 days', () => {
      const badge = getBadge('streak_30');
      expect(badge.check({ newStreak: 29 })).toBe(false);
    });
  });
});
