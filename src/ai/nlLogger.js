/**
 * NatureGuard — AI Natural Language Logger
 * Parses free-text activity descriptions into structured CO₂ activity objects.
 */

import { geminiService } from './geminiService.js';
import { NL_LOGGER_PROMPT } from './prompts.js';
import { calculateTransport, calculateFood, calculateEnergy, calculateShopping, calculateFlight } from '../modules/calculator.js';

/**
 * Parse a natural language description into structured activities with CO₂ values.
 * @param {string} text - User's description of their day/activities
 * @returns {Promise<Array>} Parsed activities with co2_kg calculated
 */
export async function parseActivities(text) {
  if (!geminiService.isReady()) {
    throw new Error('Please configure your Gemini API Key in Settings first.');
  }

  // Use the new geminiService JSON generator
  const parsed = await geminiService.generateJSON(text, NL_LOGGER_PROMPT);

  if (!Array.isArray(parsed)) return [];

  // Calculate CO₂ for each parsed activity
  return parsed
    .filter(a => a.category && a.quantity > 0)
    .map(a => ({
      category: a.category,
      activity: a.activity || `${a.category} activity`,
      quantity: a.quantity,
      unit: a.unit,
      co2_kg: Number(calculateCO2ForParsed(a).toFixed(4)),
      source: 'ai_parsed',
    }));
}

/**
 * Map parsed activity to CO₂ using the calculator engine.
 */
function calculateCO2ForParsed({ category, activity, quantity, unit }) {
  const actLower = (activity || '').toLowerCase();

  switch (category) {
    case 'transport': {
      const vehicle = actLower.includes('electric') ? 'electric'
        : actLower.includes('bus') ? 'bus'
        : actLower.includes('train') ? 'train'
        : actLower.includes('bike') || actLower.includes('cycl') ? 'cycling'
        : actLower.includes('motor') ? 'motorcycle'
        : 'petrol_avg';
      return calculateTransport(quantity, vehicle);
    }
    case 'food': {
      const mealType = actLower.includes('vegan') ? 'meal_vegan'
        : actLower.includes('vegetarian') ? 'meal_vegetarian'
        : actLower.includes('beef') || actLower.includes('steak') ? 'beef'
        : actLower.includes('chicken') || actLower.includes('fish') ? 'meal_chicken_fish'
        : actLower.includes('pork') || actLower.includes('burger') ? 'meal_medium_meat'
        : 'meal_medium_meat';
      return calculateFood(mealType, quantity);
    }
    case 'energy':
      return calculateEnergy(quantity, 'global');
    case 'shopping':
      return calculateShopping('online_delivery', quantity);
    case 'travel': {
      const cls = actLower.includes('business') ? 'business_longhaul' : 'economy_shorthaul';
      return calculateFlight(quantity, cls);
    }
    default:
      return 0;
  }
}
