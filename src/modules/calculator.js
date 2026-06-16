/**
 * NatureGuard — CO₂ Calculator Engine
 * Pure functions — no side effects, fully unit-testable.
 * All outputs are in kg CO₂e.
 */

import {
  TRANSPORT,
  FOOD,
  GRID_INTENSITY,
  SHOPPING,
  AVIATION,
  BENCHMARKS,
} from '../data/emissionFactors.js';

// ─────────────────────────────────────────────
// TRANSPORT
// ─────────────────────────────────────────────

/**
 * Calculate transport emissions.
 * @param {number} km - Distance in km
 * @param {string} vehicleType - Key from TRANSPORT
 * @returns {number} kg CO₂e
 */
export function calculateTransport(km, vehicleType = 'petrol_avg') {
  const factor = TRANSPORT[vehicleType] ?? TRANSPORT.petrol_avg;
  return Math.max(0, km) * factor;
}

// ─────────────────────────────────────────────
// FOOD
// ─────────────────────────────────────────────

/**
 * Calculate food emissions.
 * @param {string} mealType - Key from FOOD
 * @param {number} servings - Number of servings
 * @returns {number} kg CO₂e
 */
export function calculateFood(mealType, servings = 1) {
  const factor = FOOD[mealType] ?? FOOD.meal_medium_meat;
  return Math.max(0, servings) * factor;
}

// ─────────────────────────────────────────────
// ENERGY
// ─────────────────────────────────────────────

/**
 * Calculate energy / electricity emissions.
 * @param {number} kWh - Kilowatt-hours consumed
 * @param {string} country - Key from GRID_INTENSITY
 * @returns {number} kg CO₂e
 */
export function calculateEnergy(kWh, country = 'global') {
  const intensity = GRID_INTENSITY[country] ?? GRID_INTENSITY.global;
  return Math.max(0, kWh) * intensity;
}

// ─────────────────────────────────────────────
// SHOPPING
// ─────────────────────────────────────────────

/**
 * Calculate shopping emissions.
 * @param {string} category - Key from SHOPPING
 * @param {number} quantity - Number of items
 * @returns {number} kg CO₂e
 */
export function calculateShopping(category, quantity = 1) {
  const factor = SHOPPING[category] ?? SHOPPING.online_delivery;
  return Math.max(0, quantity) * factor;
}

// ─────────────────────────────────────────────
// AVIATION / TRAVEL
// ─────────────────────────────────────────────

/**
 * Calculate flight emissions.
 * Applies IPCC radiative forcing multiplier (accounts for non-CO₂ effects at altitude).
 * @param {number} km - One-way flight distance in km
 * @param {string} classType - Key from AVIATION (economy_shorthaul, etc.)
 * @param {boolean} applyRF - Whether to apply radiative forcing multiplier
 * @returns {number} kg CO₂e
 */
export function calculateFlight(km, classType = 'economy_shorthaul', applyRF = true) {
  const factor = AVIATION[classType] ?? AVIATION.economy_shorthaul;
  const raw = Math.max(0, km) * factor;
  return applyRF ? raw * AVIATION.radiative_forcing_multiplier : raw;
}

// ─────────────────────────────────────────────
// AGGREGATION
// ─────────────────────────────────────────────

/**
 * Sum CO₂ from an array of activity objects.
 * @param {Array<{co2_kg: number}>} activities
 * @returns {number} Total kg CO₂e
 */
export function totalCO2(activities = []) {
  return activities.reduce((sum, a) => sum + (Number(a.co2_kg) || 0), 0);
}

/**
 * Aggregate activities by category.
 * @param {Array<{category: string, co2_kg: number}>} activities
 * @returns {Object} { transport: number, food: number, ... }
 */
export function breakdownByCategory(activities = []) {
  return activities.reduce((acc, a) => {
    const knownCategories = ['transport', 'food', 'energy', 'shopping', 'travel'];
    const cat = knownCategories.includes(a.category) ? a.category : 'other';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += Number(a.co2_kg) || 0;
    return acc;
  }, {});
}

/**
 * Group activities by day (YYYY-MM-DD).
 * @param {Array} activities
 * @returns {Object} { '2025-01-01': [activities] }
 */
export function groupByDay(activities = []) {
  return activities.reduce((acc, a) => {
    const day = new Date(a.logged_at).toISOString().split('T')[0];
    if (!acc[day]) acc[day] = [];
    acc[day].push(a);
    return acc;
  }, {});
}

/**
 * Get daily CO₂ totals for the last N days.
 * @param {Array} activities
 * @param {number} days
 * @returns {Array<{date: string, co2_kg: number}>}
 */
export function getDailyTotals(activities = [], days = 7) {
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayActivities = activities.filter(a =>
      new Date(a.logged_at).toISOString().split('T')[0] === dateStr
    );
    result.push({ date: dateStr, co2_kg: totalCO2(dayActivities) });
  }
  return result;
}

// ─────────────────────────────────────────────
// BENCHMARK
// ─────────────────────────────────────────────

/**
 * Get average weekly emission benchmark for a country.
 * @param {string} country
 * @returns {number} kg CO₂e per week
 */
export function getBenchmark(country = 'global') {
  const key = `${country}_weekly`;
  return BENCHMARKS[key] ?? BENCHMARKS.global_weekly;
}

/**
 * Calculate what percentage of the global average a user emits.
 * @param {number} userWeeklyKg
 * @param {string} country
 * @returns {number} percentage (100 = same as average)
 */
export function vsAverage(userWeeklyKg, country = 'global') {
  const avg = getBenchmark(country);
  return avg > 0 ? (userWeeklyKg / avg) * 100 : 0;
}
