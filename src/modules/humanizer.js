/**
 * NatureGuard — Humanizer
 * Converts raw kg CO₂e into relatable, human-scale comparisons.
 * Pure functions — no side effects.
 */

/** Comparison reference points (kg CO₂ per unit) */
const COMPARISONS = [
  { unit: 'tree-months',   factor: 14.6,   icon: '🌳', template: (n) => `${n} month${n !== 1 ? 's' : ''} of a tree absorbing CO₂` },
  { unit: 'car-km',        factor: 0.214,  icon: '🚗', template: (n) => `driving ${n} km in an avg car` },
  { unit: 'flights',       factor: 90,     icon: '✈️', template: (n) => `${n}% of a London→NYC flight` },
  { unit: 'beef-burgers',  factor: 3.8,    icon: '🍔', template: (n) => `${n} beef burger${n !== 1 ? 's' : ''}` },
  { unit: 'plastic-bags',  factor: 0.008,  icon: '🛍️', template: (n) => `${n} plastic bag${n !== 1 ? 's' : ''}` },
  { unit: 'smartphone-charges', factor: 0.0085, icon: '📱', template: (n) => `${n} smartphone charge${n !== 1 ? 's' : ''}` },
  { unit: 'kettle-boils',  factor: 0.034,  icon: '☕', template: (n) => `${n} kettle boil${n !== 1 ? 's' : ''}` },
  { unit: 'streaming-hours', factor: 0.036, icon: '📺', template: (n) => `${n} hour${n !== 1 ? 's' : ''} of HD streaming` },
];

/**
 * Return the top 2 most relatable human comparisons for a given CO₂ amount.
 * Picks comparisons where the resulting number is between 0.5 and 500 (most readable range).
 *
 * @param {number} kgCO2 - Amount in kg CO₂e
 * @returns {Array<{icon: string, text: string}>}
 */
export function humanize(kgCO2) {
  if (!kgCO2 || kgCO2 <= 0) return [{ icon: '✨', text: 'zero emissions — great job!' }];

  const results = COMPARISONS
    .map(c => {
      const n = kgCO2 / c.factor;
      return { ...c, n: Math.round(n * 10) / 10, readability: Math.abs(Math.log10(n)) };
    })
    .filter(c => c.n >= 0.1 && c.n <= 1000)
    .sort((a, b) => a.readability - b.readability)
    .slice(0, 2)
    .map(c => ({
      icon: c.icon,
      text: c.template(c.n % 1 === 0 ? c.n : c.n.toFixed(1)),
    }));

  return results.length > 0
    ? results
    : [{ icon: '🌍', text: `${formatCO2(kgCO2)} of CO₂` }];
}

/**
 * Format a CO₂ value with smart unit switching.
 * @param {number} kg
 * @returns {string} e.g. "0.3 kg", "4.2 kg", "1.5 tonnes"
 */
export function formatCO2(kg) {
  if (kg === 0) return '0 kg';
  if (kg < 0.01) return `${(kg * 1000).toFixed(0)} g`;
  if (kg < 1)    return `${kg.toFixed(2)} kg`;
  if (kg < 1000) return `${kg.toFixed(1)} kg`;
  return `${(kg / 1000).toFixed(2)} tonnes`;
}

/**
 * Get a short label describing the emission level.
 * @param {number} weeklyKg
 * @returns {{ label: string, color: string }}
 */
export function emissionLevel(weeklyKg) {
  if (weeklyKg <= 20)  return { label: 'Excellent',  color: 'var(--accent-lime)' };
  if (weeklyKg <= 50)  return { label: 'Good',       color: 'var(--accent-teal)' };
  if (weeklyKg <= 100) return { label: 'Average',    color: 'var(--accent-amber)' };
  if (weeklyKg <= 200) return { label: 'High',       color: '#F97316' };
  return                      { label: 'Very High',  color: 'var(--accent-red)' };
}

/**
 * Get tree-planting equivalent.
 * A tree absorbs ~21 kg CO₂/year ≈ 1.75 kg/month.
 * @param {number} kg
 * @returns {string} e.g. "≈ 3 trees for a month"
 */
export function treesEquivalent(kg) {
  const trees = Math.round(kg / 1.75);
  if (trees <= 0) return 'Less than 1 tree-month';
  return `≈ ${trees} tree${trees !== 1 ? 's' : ''} for a month`;
}
