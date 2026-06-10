/**
 * NatureGuard — AI Carbon Coach Module
 * Prepares user context and handles chat sessions.
 */

import { geminiService } from './geminiService.js';
import { COACH_SYSTEM_PROMPT } from './prompts.js';
import { getProfile, getMonthActivities } from '../modules/db.js';
import { formatCO2 } from '../modules/humanizer.js';

/**
 * Build a text block summarizing the user's recent footprint data.
 * This is injected into the system prompt to give the AI context.
 */
export async function buildContext() {
  const { data: profile } = await getProfile();
  const { data: activities } = await getMonthActivities();
  
  if (!profile) return '';

  let context = `User Profile:\n`;
  context += `- Name: ${profile.display_name || 'Eco Warrior'}\n`;
  context += `- Country: ${profile.country}\n`;
  context += `- Diet: ${profile.diet_type}\n`;
  context += `- Commute: ${profile.vehicle_type} (${profile.commute_km}km)\n\n`;

  if (!activities || activities.length === 0) {
    context += `The user hasn't logged any activities this month yet.\n`;
    return context;
  }

  const totalCO2 = activities.reduce((sum, a) => sum + a.co2_kg, 0);
  const byCategory = activities.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.co2_kg;
    return acc;
  }, {});

  // Format categories nicely
  const catSummary = Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([cat, val]) => `${cat}: ${formatCO2(val)}`)
    .join(', ');

  context += `This Month's Data:\n`;
  context += `- Total Logged CO2: ${formatCO2(totalCO2)}\n`;
  context += `- Breakdown: ${catSummary}\n`;
  context += `- Total Activities Logged: ${activities.length}\n`;

  return context;
}

/**
 * Send a message to the AI coach and stream the response.
 * @param {string} message - User's message
 * @param {Array} history - Previous chat history [{ role: 'user'|'model', parts: [{ text: '...' }] }]
 * @param {function} onChunk - Callback for streaming text chunks
 */
export async function sendChatMessage(message, history, onChunk) {
  if (!geminiService.isReady()) {
    throw new Error('Please configure your Gemini API Key in Settings first.');
  }

  const context = await buildContext();
  const systemInstruction = `${COACH_SYSTEM_PROMPT}\n\n=== USER CONTEXT ===\n${context}`;
  
  await geminiService.generateStream(message, systemInstruction, history, onChunk);
}
