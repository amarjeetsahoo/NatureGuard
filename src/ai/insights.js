/**
 * NatureGuard — Insights & AI Digest Module
 * Generates and caches the personalized weekly carbon footprint narrative.
 */

import { geminiService } from './geminiService.js';
import { WEEKLY_DIGEST_PROMPT } from './prompts.js';
import { getProfile, getWeekActivities, getWeeklyDigest, saveWeeklyDigest } from '../modules/db.js';

/**
 * Gets the start of the current week (Monday) as YYYY-MM-DD.
 */
function getWeekStart() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Fetches the weekly digest from DB if it exists, otherwise generates it.
 */
export async function getOrGenerateWeeklyDigest() {
  const weekStart = getWeekStart();
  const { data: profile } = await getProfile();

  // 1. Try Cache
  const { data: cached } = await getWeeklyDigest(weekStart);
  if (cached && !cached.content.includes("We couldn't reach the AI coach")) {
    return cached;
  }

  // 2. Fetch fresh data
  const { data: activities } = await getWeekActivities();
  const acts = activities || [];
  
  const totalCO2 = acts.reduce((sum, a) => sum + a.co2_kg, 0);
  const byCategory = acts.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.co2_kg;
    return acc;
  }, {});

  const topCategory = Object.keys(byCategory).length > 0 
    ? Object.entries(byCategory).sort((a,b) => b[1] - a[1])[0][0]
    : null;

  const statsSnapshot = { totalCO2, byCategory, topCategory, activityCount: acts.length };

  // 3. Check AI limits / availability
  if (!geminiService.isReady()) {
    return {
      content: "Please configure your Gemini API Key in Settings to receive your personalized Weekly Digest narrative! It provides unique insights into your habits.",
      stats_snapshot: statsSnapshot
    };
  }

  if (acts.length === 0) {
    return {
      content: "You haven't logged any activities this week yet! Start logging your meals and commutes to see your personalized insights.",
      stats_snapshot: statsSnapshot
    };
  }

  // 4. Generate with AI
  const context = `
User Profile:
- Name: ${profile?.display_name || 'Eco Warrior'}

This Week's Data:
- Total CO2: ${totalCO2.toFixed(1)} kg
- Most Emissions From: ${topCategory}
- Total Items Logged: ${acts.length}
- Breakdown: ${JSON.stringify(byCategory)}
  `;

  let content = "Your footprint is looking great this week. Keep up the good work!";
  
  try {
    // Generate text (not JSON)
    content = await geminiService.generate(context, WEEKLY_DIGEST_PROMPT);
    
    // 5. Save to cache ONLY if successful
    const { data: saved } = await saveWeeklyDigest(weekStart, content, statsSnapshot);
    return saved || { content, stats_snapshot: statsSnapshot };
  } catch (err) {
    console.warn('[Insights] Failed to generate AI digest', err);
    content = "API rate limit reached. We couldn't reach the AI coach to generate your digest right now. Please check back in a few minutes!";
    // Return fallback without caching it
    return { content, stats_snapshot: statsSnapshot };
  }
}
