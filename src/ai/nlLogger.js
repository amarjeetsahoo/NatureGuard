/**
 * NatureGuard — AI Natural Language Logger (Gemini)
 * Parses free-text activity descriptions into structured CO₂ activity objects.
 * Stub — full implementation in Feature 7.
 */

import { calculateTransport, calculateFood, calculateEnergy, calculateShopping, calculateFlight } from '../modules/calculator.js';

const SYSTEM_PROMPT = `You are a carbon footprint assistant. Parse the user's message and extract all activities that have a carbon footprint.
Return ONLY valid JSON as an array (no markdown, no explanation). Use this exact format:
[{"category":"transport|food|energy|shopping|travel","activity":"short label","quantity":number,"unit":"km|serving|kWh|item|km","confidence":"high|medium|low"}]

Rules:
- category must be one of: transport, food, energy, shopping, travel
- quantity must be a positive number
- unit must match the category (km for transport/travel, serving for food, kWh for energy, item for shopping)
- Only include activities with real carbon impact (ignore walking, drinking water, etc.)
- confidence: high = explicit numbers given, medium = estimated, low = guessed
- Return [] if no carbon-relevant activities found`;

/**
 * Parse a natural language description into structured activities with CO₂ values.
 * @param {string} text - User's description of their day/activities
 * @param {string} apiKey - User's Gemini API key
 * @returns {Promise<Array>} Parsed activities with co2_kg calculated
 */
export async function parseActivities(text, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text }] }],
        generationConfig: {
          temperature: 0.1,       // Low temp for deterministic structured output
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
  }

  const result = await response.json();
  const raw = result?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('AI returned invalid JSON. Please try again.');
  }

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
      confidence: a.confidence || 'medium',
    }));
}

/**
 * Map parsed activity to CO₂ using the calculator engine.
 */
function calculateCO2ForParsed({ category, activity, quantity, unit }) {
  const actLower = (activity || '').toLowerCase();

  switch (category) {
    case 'transport': {
      // Infer vehicle type from activity label
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
