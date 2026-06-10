/**
 * NatureGuard — Actions AI Module
 * Recommends and personalizes eco-actions based on the user's footprint.
 */

import { geminiService } from './geminiService.js';
import { ACTIONS_PROMPT } from './prompts.js';
import { ACTION_LIBRARY } from '../data/actionLibrary.js';
import { getProfile, getMonthActivities } from '../modules/db.js';

/**
 * Get personalized, AI-ranked actions.
 * Falls back to basic rule-based ranking if AI is unavailable.
 */
export async function getPersonalizedActions() {
  const { data: profile } = await getProfile();
  const { data: activities } = await getMonthActivities();
  
  if (!geminiService.isReady()) {
    return getFallbackActions(profile, activities);
  }

  // Calculate highest emitting category
  const byCategory = (activities || []).reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.co2_kg;
    return acc;
  }, {});
  
  const topCategory = Object.keys(byCategory).length > 0 
    ? Object.entries(byCategory).sort((a,b) => b[1] - a[1])[0][0]
    : 'general';

  // Build prompt context
  const context = `
User Profile:
- Diet: ${profile?.diet_type || 'Unknown'}
- Commute: ${profile?.vehicle_type || 'Unknown'}

Recent Footprint (Last 30 Days):
- Top Emission Source: ${topCategory}
- Total Logged: ${activities?.length || 0} activities

Action Library Available to Choose From (JSON):
${JSON.stringify(ACTION_LIBRARY.map(a => ({ key: a.key, title: a.title, category: a.category, base_co2: a.co2SavedEstimate })))}
  `;

  try {
    const rawAiResults = await geminiService.generateJSON(context, ACTIONS_PROMPT);
    
    // Merge AI personalization with base library data (tips, effort, etc)
    const merged = rawAiResults.map(aiAction => {
      const baseAction = ACTION_LIBRARY.find(a => a.key === aiAction.key);
      if (!baseAction) return null;
      
      return {
        ...baseAction,
        title: aiAction.title || baseAction.title, // Use AI's tailored title if provided
        description: aiAction.description || baseAction.description, // Fully personalized description
        co2SavedEstimate: aiAction.co2SavedEstimate || baseAction.co2SavedEstimate,
        difficulty: aiAction.difficulty || baseAction.difficulty
      };
    }).filter(Boolean);

    // If AI failed to return enough valid items, pad with fallback
    if (merged.length < 3) {
      return getFallbackActions(profile, activities);
    }
    
    return merged.slice(0, 5);

  } catch (err) {
    console.warn('[ActionsAI] Failed to generate AI actions, using fallback.', err);
    return getFallbackActions(profile, activities);
  }
}

/** Rule-based fallback if no API key is set or AI fails */
function getFallbackActions(profile, activities) {
  // Simple heuristic: just sort by highest CO2 saved and matching category
  const byCategory = (activities || []).reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.co2_kg;
    return acc;
  }, {});
  
  const topCategory = Object.keys(byCategory).length > 0 
    ? Object.entries(byCategory).sort((a,b) => b[1] - a[1])[0][0]
    : null;

  let candidates = [...ACTION_LIBRARY];
  
  if (topCategory) {
    // Boost items in top category
    candidates.sort((a, b) => {
      if (a.category === topCategory && b.category !== topCategory) return -1;
      if (b.category === topCategory && a.category !== topCategory) return 1;
      return b.co2SavedEstimate - a.co2SavedEstimate;
    });
  } else {
    // Just highest impact
    candidates.sort((a, b) => b.co2SavedEstimate - a.co2SavedEstimate);
  }

  // Prepend a generic non-personalized tag to descriptions
  return candidates.slice(0, 5).map(a => ({
    ...a,
    description: a.description
  }));
}
