/**
 * NatureGuard — Footprint Score Engine
 * Converts weekly CO₂ (kg) into a 0–100 score with letter grades.
 * Pure functions — no side effects.
 */

import { getBenchmark } from './calculator.js';

/**
 * Calculate footprint score (0–100).
 * 100 = zero emissions, 0 = 3× the global average or worse.
 *
 * Score formula:
 *   score = 100 × max(0, 1 - (userKg / (3 × globalAvg)))
 *
 * @param {number} weeklyKg
 * @param {string} country - for benchmark comparison
 * @returns {number} 0–100 (rounded to nearest integer)
 */
export function calculateScore(weeklyKg, country = 'global') {
  const benchmark = getBenchmark(country);
  const ceiling = benchmark * 3;  // 3× average = score 0
  const raw = Math.max(0, 1 - weeklyKg / ceiling);
  return Math.round(raw * 100);
}

/**
 * Get letter grade from score.
 * @param {number} score - 0–100
 * @returns {string} A+, A, B, C, D, or F
 */
export function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

/**
 * Get a descriptive label for the score.
 * @param {number} score
 * @returns {string}
 */
export function getScoreLabel(score) {
  if (score >= 90) return 'Climate Champion 🌟';
  if (score >= 80) return 'Eco Warrior 🌿';
  if (score >= 70) return 'On the Right Track 📈';
  if (score >= 55) return 'Room to Improve 💡';
  if (score >= 40) return 'Needs Attention ⚠️';
  return 'High Impact — Start Here 🔴';
}

/**
 * Get the accent color for a score.
 * @param {number} score
 * @returns {string} CSS color value
 */
export function getScoreColor(score) {
  if (score >= 80) return 'var(--accent-lime)';
  if (score >= 60) return 'var(--accent-teal)';
  if (score >= 40) return 'var(--accent-amber)';
  return 'var(--accent-red)';
}

/**
 * Calculate the SVG stroke-dashoffset for the score ring.
 * Ring circumference = 2π × r = 2π × 45 ≈ 283
 * @param {number} score - 0–100
 * @returns {number} dashoffset (283 = empty, 0 = full)
 */
export function ringOffset(score) {
  const circumference = 283;
  return circumference - (score / 100) * circumference;
}
