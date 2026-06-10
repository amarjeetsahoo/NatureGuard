/**
 * NatureGuard — Calculator Unit Tests
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  calculateTransport, calculateFood, calculateEnergy,
  calculateShopping, calculateFlight,
  totalCO2, breakdownByCategory, vsAverage, getBenchmark,
} from '../src/modules/calculator.js';

describe('calculateTransport', () => {
  it('returns 0 for cycling', () => {
    expect(calculateTransport(10, 'cycling')).toBe(0);
  });
  it('calculates petrol car correctly', () => {
    expect(calculateTransport(100, 'petrol_avg')).toBeCloseTo(21.4, 1);
  });
  it('EV emits less than petrol', () => {
    expect(calculateTransport(100, 'electric')).toBeLessThan(calculateTransport(100, 'petrol_avg'));
  });
  it('returns 0 for negative distance', () => {
    expect(calculateTransport(-10, 'petrol_avg')).toBe(0);
  });
  it('falls back to petrol_avg for unknown vehicle', () => {
    expect(calculateTransport(10, 'unknown_vehicle')).toBeCloseTo(calculateTransport(10, 'petrol_avg'));
  });
});

describe('calculateFood', () => {
  it('vegan meal emits less than beef', () => {
    expect(calculateFood('meal_vegan')).toBeLessThan(calculateFood('meal_heavy_meat'));
  });
  it('scales with servings', () => {
    expect(calculateFood('meal_vegetarian', 2)).toBeCloseTo(calculateFood('meal_vegetarian', 1) * 2);
  });
  it('returns 0 for 0 servings', () => {
    expect(calculateFood('beef', 0)).toBe(0);
  });
});

describe('calculateEnergy', () => {
  it('France emits less than India (nuclear vs coal)', () => {
    expect(calculateEnergy(100, 'france')).toBeLessThan(calculateEnergy(100, 'india'));
  });
  it('scales linearly with kWh', () => {
    expect(calculateEnergy(10, 'global')).toBeCloseTo(calculateEnergy(1, 'global') * 10);
  });
  it('handles 0 kWh', () => {
    expect(calculateEnergy(0, 'global')).toBe(0);
  });
});

describe('calculateFlight', () => {
  it('business class emits more than economy', () => {
    expect(calculateFlight(5000, 'business_longhaul')).toBeGreaterThan(calculateFlight(5000, 'economy_longhaul'));
  });
  it('radiative forcing multiplier increases emissions', () => {
    expect(calculateFlight(1000, 'economy_shorthaul', true)).toBeGreaterThan(
      calculateFlight(1000, 'economy_shorthaul', false)
    );
  });
  it('short flight under 1000km returns positive value', () => {
    expect(calculateFlight(500)).toBeGreaterThan(0);
  });
});

describe('totalCO2', () => {
  it('sums all activity co2_kg values', () => {
    const activities = [{ co2_kg: 1.5 }, { co2_kg: 2.3 }, { co2_kg: 0.8 }];
    expect(totalCO2(activities)).toBeCloseTo(4.6);
  });
  it('handles empty array', () => {
    expect(totalCO2([])).toBe(0);
  });
  it('ignores non-numeric co2_kg', () => {
    expect(totalCO2([{ co2_kg: 'bad' }, { co2_kg: 5 }])).toBeCloseTo(5);
  });
});

describe('breakdownByCategory', () => {
  it('correctly groups by category', () => {
    const activities = [
      { category: 'transport', co2_kg: 5 },
      { category: 'food',      co2_kg: 3 },
      { category: 'transport', co2_kg: 2 },
    ];
    const breakdown = breakdownByCategory(activities);
    expect(breakdown.transport).toBeCloseTo(7);
    expect(breakdown.food).toBeCloseTo(3);
    expect(breakdown.energy).toBe(0);
  });
});

describe('getBenchmark', () => {
  it('returns a positive number for all known countries', () => {
    ['global','us','uk','india','eu','france'].forEach(c => {
      expect(getBenchmark(c)).toBeGreaterThan(0);
    });
  });
  it('falls back to global for unknown country', () => {
    expect(getBenchmark('unknown')).toBe(getBenchmark('global'));
  });
});

describe('vsAverage', () => {
  it('returns 100 when user matches average', () => {
    const avg = getBenchmark('global');
    expect(vsAverage(avg, 'global')).toBeCloseTo(100);
  });
  it('returns 50 when user emits half the average', () => {
    const avg = getBenchmark('global');
    expect(vsAverage(avg / 2, 'global')).toBeCloseTo(50);
  });
});
