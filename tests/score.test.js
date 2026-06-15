/**
 * NatureGuard — Score Unit Tests
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import { calculateScore, getGrade, getScoreColor, ringOffset, getScoreLabel } from '../src/modules/score.js';

describe('calculateScore', () => {
  it('returns 100 for 0 emissions', () => {
    expect(calculateScore(0, 'global')).toBe(100);
  });
  
  it('returns 0 for emissions 3x the global average', () => {
    // global average is 96.15. 3x is 288.45.
    expect(calculateScore(300, 'global')).toBe(0);
  });
  
  it('calculates proportional score for average emissions', () => {
    // If weeklyKg == benchmark, formula is 100 * (1 - 1/3) = 66.67 => 67
    expect(calculateScore(96.15, 'global')).toBe(67);
  });
});

describe('getGrade', () => {
  it('returns A+ for score >= 90', () => {
    expect(getGrade(95)).toBe('A+');
    expect(getGrade(90)).toBe('A+');
  });
  
  it('returns F for score < 40', () => {
    expect(getGrade(39)).toBe('F');
    expect(getGrade(0)).toBe('F');
  });
  
  it('returns appropriate intermediate grades', () => {
    expect(getGrade(85)).toBe('A');
    expect(getGrade(75)).toBe('B');
    expect(getGrade(60)).toBe('C');
    expect(getGrade(50)).toBe('D');
  });
});

describe('getScoreLabel', () => {
  it('returns top label for top score', () => {
    expect(getScoreLabel(100)).toContain('Climate Champion');
  });
  it('returns bottom label for low score', () => {
    expect(getScoreLabel(10)).toContain('High Impact');
  });
});

describe('getScoreColor', () => {
  it('returns lime for high score', () => {
    expect(getScoreColor(85)).toBe('var(--accent-lime)');
  });
  it('returns red for low score', () => {
    expect(getScoreColor(20)).toBe('var(--accent-red)');
  });
});

describe('ringOffset', () => {
  it('returns 0 offset for 100 score', () => {
    expect(ringOffset(100)).toBe(0);
  });
  it('returns full circumference for 0 score', () => {
    expect(ringOffset(0)).toBe(283);
  });
  it('returns half circumference for 50 score', () => {
    expect(ringOffset(50)).toBeCloseTo(141.5);
  });
});
