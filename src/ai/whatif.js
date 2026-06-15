/**
 * NatureGuard — What-If Simulator Module
 * Simulates hypothetical scenarios by parsing natural language and running it
 * through the local CO₂ calculator engine.
 */

import { geminiService } from './geminiService.js';
import { WHAT_IF_PROMPT } from './prompts.js';
import { calculateTransport, calculateFood, calculateEnergy, calculateShopping, calculateFlight } from '../modules/calculator.js';

export async function simulateScenario(text) {
  if (!geminiService.isReady()) {
    throw new Error('Please configure your Gemini API Key in Settings to run simulations.');
  }

  // 1. AI Parsing
  const scenario = await geminiService.generateJSON(text, WHAT_IF_PROMPT);
  if (!scenario || !scenario.category) {
    throw new Error("Could not parse scenario. Try being more specific.");
  }

  // 2. Map subtype hint
  const subtype = mapSubtypeHint(scenario.category, (scenario.subtype_hint || '').toLowerCase());
  const qty = Number(scenario.new_value) || 1;

  // 3. Calculate Projected CO₂
  let projectedCO2 = 0;
  
  switch (scenario.category) {
    case 'transport':
      projectedCO2 = calculateTransport(qty, subtype);
      break;
    case 'food':
      projectedCO2 = calculateFood(subtype, qty);
      break;
    case 'energy':
      projectedCO2 = calculateEnergy(qty, 'global');
      break;
    case 'shopping':
      projectedCO2 = calculateShopping(subtype, qty);
      break;
    case 'travel':
      projectedCO2 = calculateFlight(qty, subtype);
      break;
    default:
      projectedCO2 = 0;
  }

  return {
    ...scenario,
    projectedCO2: Number(projectedCO2.toFixed(2)),
    mappedSubtype: subtype
  };
}

/**
 * Maps the AI's free-form subtype hint to strict calculator types.
 */
function mapSubtypeHint(category, hint) {
  if (category === 'transport') {
    if (hint.includes('electric') || hint.includes('ev')) return 'electric';
    if (hint.includes('hybrid')) return 'hybrid';
    if (hint.includes('bus')) return 'bus';
    if (hint.includes('train')) return 'train';
    if (hint.includes('bike') || hint.includes('cycl') || hint.includes('walk')) return 'cycling';
    if (hint.includes('motor')) return 'motorcycle';
    return 'petrol_avg';
  }
  if (category === 'food') {
    if (hint.includes('vegan')) return 'meal_vegan';
    if (hint.includes('veget')) return 'meal_vegetarian';
    if (hint.includes('chicken') || hint.includes('fish')) return 'meal_chicken_fish';
    if (hint.includes('beef') || hint.includes('steak')) return 'beef';
    return 'meal_medium_meat';
  }
  if (category === 'shopping') {
    if (hint.includes('phone')) return 'electronics_phone';
    if (hint.includes('laptop')) return 'electronics_laptop';
    if (hint.includes('jean')) return 'clothing_jeans';
    if (hint.includes('jacket')) return 'clothing_jacket';
    if (hint.includes('book')) return 'book';
    return 'clothing_tshirt';
  }
  if (category === 'travel') {
    if (hint.includes('business')) return 'business_longhaul';
    return 'economy_shorthaul';
  }
  return 'global';
}
