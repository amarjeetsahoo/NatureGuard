/**
 * NatureGuard — AI Profiler Module
 * Extracts structured profile data from the conversational onboarding transcript.
 */

import { geminiService } from './geminiService.js';
import { ONBOARDING_EXTRACTION_PROMPT } from './prompts.js';
import { updateProfile } from '../modules/db.js';

/**
 * Extracts JSON profile data from a chat transcript and saves it to the database.
 */
export async function finalizeOnboarding(chatTranscript) {
  if (!geminiService.isReady()) {
    // Fallback if API key is not configured yet
    await updateProfile({ onboarded: true });
    return;
  }

  try {
    const rawData = await geminiService.generateJSON(chatTranscript, ONBOARDING_EXTRACTION_PROMPT);
    
    // Map to db schema and clean up any potential AI hallucinations
    const profileUpdates = {
      diet_type: ['omnivore','vegetarian','vegan'].includes(rawData.diet_type) ? rawData.diet_type : 'omnivore',
      vehicle_type: ['petrol_avg','electric','hybrid','bus','train','cycling'].includes(rawData.vehicle_type) ? rawData.vehicle_type : 'petrol_avg',
      commute_km: typeof rawData.commute_km === 'number' ? rawData.commute_km : 10,
      onboarded: true
    };

    const { error } = await updateProfile(profileUpdates);
    if (error) throw error;
    
  } catch (err) {
    console.error('[Profiler] Failed to extract profile from chat:', err);
    // Mark as onboarded anyway so they aren't trapped
    await updateProfile({ onboarded: true });
  }
}
