/**
 * NatureGuard — Humanizer Unit Tests
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import { humanize, formatCO2, emissionLevel, treesEquivalent } from '../src/modules/humanizer.js';

describe('formatCO2', () => {
  it('formats exactly 0', () => {
    expect(formatCO2(0)).toBe('0 kg');
  });
  
  it('formats tiny amounts in grams', () => {
    expect(formatCO2(0.005)).toBe('5 g');
  });
  
  it('formats small amounts in precise kg', () => {
    expect(formatCO2(0.5)).toBe('0.50 kg');
  });
  
  it('formats normal amounts in kg', () => {
    expect(formatCO2(45.23)).toBe('45.2 kg');
  });
  
  it('formats large amounts in tonnes', () => {
    expect(formatCO2(1500)).toBe('1.50 tonnes');
  });
});

describe('humanize', () => {
  it('returns zero emissions message for 0', () => {
    const result = humanize(0);
    expect(result[0].text).toContain('zero emissions');
  });
  
  it('returns appropriate comparisons for a medium amount', () => {
    // 21.4 kg should be exactly 100km driving
    const result = humanize(21.4);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('icon');
    expect(result[0]).toHaveProperty('text');
  });
});

describe('emissionLevel', () => {
  it('returns Excellent for low emissions', () => {
    expect(emissionLevel(15).label).toBe('Excellent');
  });
  it('returns Very High for excessive emissions', () => {
    expect(emissionLevel(300).label).toBe('Very High');
  });
});

describe('treesEquivalent', () => {
  it('calculates correct number of trees', () => {
    // 17.5 kg / 1.75 = 10 trees
    expect(treesEquivalent(17.5)).toContain('10 trees');
  });
  
  it('handles less than 1 tree', () => {
    expect(treesEquivalent(0.5)).toBe('Less than 1 tree-month');
  });
});
