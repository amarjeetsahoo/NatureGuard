/**
 * NatureGuard — Settings View
 * Manages user profile, AI API key, and preferences.
 */

import { $, $$ } from '../utils/dom.js';
import { getProfile, updateProfile } from '../modules/db.js';
import { getCurrentUser, signOut } from '../auth/authService.js';
import { geminiService } from '../ai/geminiService.js';
import { toastSuccess, toastError } from '../utils/toast.js';
import { BADGE_DEFS } from '../modules/streak.js';

export async function render(container) {
  container.innerHTML = `
    <div class="view settings-view">
      <header class="view-header">
        <h1 class="view-title">Settings</h1>
      </header>

      <div class="settings-content">
        <div id="profile-section" class="settings-card">
          <div class="card-skeleton"></div>
        </div>

        <div id="ai-section" class="settings-card">
          <h2>🤖 AI Configuration</h2>
          <p class="settings-help">NatureGuard uses Google's Gemini Flash to power natural language logging, coaching, and insights. Your key is stored securely and never shared.</p>
          
          <div class="input-group">
            <label for="api-key">Gemini API Key</label>
            <div class="api-key-row">
              <input type="password" id="api-key" placeholder="AIzaSy..." autocomplete="off">
              <button id="btn-test-key" class="btn btn-secondary">Test & Save</button>
            </div>
            <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-link">Get a free API key</a>
          </div>
        </div>

        <div class="settings-card danger-zone">
          <h2>Account</h2>
          <button id="btn-signout" class="btn btn-outline text-danger">Sign Out</button>
        </div>
      </div>
    </div>
  `;

  // Load data
  const user = await getCurrentUser();
  const { data: profile } = await getProfile();

  // Render Profile
  const profileSection = $('#profile-section', container);
  const streak  = profile?.current_streak  || 0;
  const longest = profile?.longest_streak  || 0;
  const earned  = profile?.badges          || [];
  const earnedKeys = new Set(earned.map(b => b.key));

  const badgesHTML = BADGE_DEFS.map(def => `
    <div
      title="${def.title}: ${def.desc}"
      style="
        display:flex;flex-direction:column;align-items:center;gap:6px;
        padding:10px;border-radius:12px;
        background:${earnedKeys.has(def.key) ? 'rgba(163,230,53,0.08)' : 'var(--glass-bg)'};
        border:1px solid ${earnedKeys.has(def.key) ? 'rgba(163,230,53,0.25)' : 'var(--border-subtle)'};
        opacity:${earnedKeys.has(def.key) ? '1' : '0.35'};
        transition:all 0.3s;
        flex:1;min-width:72px;max-width:90px;text-align:center;
      "
    >
      <span style="font-size:28px;">${def.icon}</span>
      <span style="font-size:10px;font-weight:600;color:var(--text-secondary);line-height:1.3;">${def.title}</span>
      ${earnedKeys.has(def.key) ? `<span style="font-size:9px;color:var(--accent-lime);">Earned ✓</span>` : `<span style="font-size:9px;color:var(--text-disabled);">Locked</span>`}
    </div>
  `).join('');

  profileSection.innerHTML = `
    <h2>Profile</h2>
    <div class="profile-info" style="margin-bottom:20px;">
      <div class="profile-avatar">${user?.email?.charAt(0).toUpperCase() || '?'}</div>
      <div class="profile-details">
        <div class="profile-name">${profile?.display_name || 'Eco Warrior'}</div>
        <div class="profile-email">${user?.email || ''}</div>
      </div>
    </div>

    <!-- Streak stats -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
      <div style="text-align:center;padding:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;">
        <div style="font-family:var(--font-display);font-size:28px;color:var(--accent-amber);">${streak}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Current Streak 🔥</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:12px;">
        <div style="font-family:var(--font-display);font-size:28px;color:var(--accent-purple);">${longest}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Best Streak 🏆</div>
      </div>
    </div>

    <!-- Badge collection -->
    <h3 style="font-size:13px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">
      Badges (${earnedKeys.size}/${BADGE_DEFS.length})
    </h3>
    <div style="display:flex;flex-wrap:wrap;gap:10px;">
      ${badgesHTML}
    </div>

    <!-- Edit Profile -->
    <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--border-subtle);">
      <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;">Preferences</h3>
      
      <div class="input-group" style="margin-bottom:12px;">
        <label class="input-label" for="profile-country">Region / Country</label>
        <select id="profile-country" class="input">
          <option value="global" ${profile?.country === 'global' ? 'selected' : ''}>Global Average</option>
          <option value="us" ${profile?.country === 'us' ? 'selected' : ''}>United States</option>
          <option value="uk" ${profile?.country === 'uk' ? 'selected' : ''}>United Kingdom</option>
          <option value="eu" ${profile?.country === 'eu' ? 'selected' : ''}>European Union</option>
          <option value="india" ${profile?.country === 'india' ? 'selected' : ''}>India</option>
          <option value="china" ${profile?.country === 'china' ? 'selected' : ''}>China</option>
          <option value="aus" ${profile?.country === 'aus' ? 'selected' : ''}>Australia</option>
          <option value="canada" ${profile?.country === 'canada' ? 'selected' : ''}>Canada</option>
          <option value="france" ${profile?.country === 'france' ? 'selected' : ''}>France</option>
          <option value="germany" ${profile?.country === 'germany' ? 'selected' : ''}>Germany</option>
          <option value="norway" ${profile?.country === 'norway' ? 'selected' : ''}>Norway</option>
        </select>
      </div>

      <div class="input-group" style="margin-bottom:12px;">
        <label class="input-label" for="profile-vehicle">Primary Transport</label>
        <select id="profile-vehicle" class="input">
          <option value="petrol_avg" ${profile?.vehicle_type === 'petrol_avg' ? 'selected' : ''}>Petrol Car</option>
          <option value="diesel_avg" ${profile?.vehicle_type === 'diesel_avg' ? 'selected' : ''}>Diesel Car</option>
          <option value="hybrid" ${profile?.vehicle_type === 'hybrid' ? 'selected' : ''}>Hybrid Car</option>
          <option value="electric" ${profile?.vehicle_type === 'electric' ? 'selected' : ''}>Electric Car</option>
          <option value="motorcycle" ${profile?.vehicle_type === 'motorcycle' ? 'selected' : ''}>Motorcycle</option>
          <option value="bus" ${profile?.vehicle_type === 'bus' ? 'selected' : ''}>Bus</option>
          <option value="train" ${profile?.vehicle_type === 'train' ? 'selected' : ''}>Train</option>
          <option value="tube" ${profile?.vehicle_type === 'tube' ? 'selected' : ''}>Metro / Subway</option>
          <option value="cycling" ${profile?.vehicle_type === 'cycling' ? 'selected' : ''}>Bicycle</option>
          <option value="walking" ${profile?.vehicle_type === 'walking' ? 'selected' : ''}>Walking</option>
        </select>
      </div>

      <div class="input-group" style="margin-bottom:12px;">
        <label class="input-label" for="profile-diet">Diet Type</label>
        <select id="profile-diet" class="input">
          <option value="meal_heavy_meat" ${profile?.diet_type === 'meal_heavy_meat' ? 'selected' : ''}>Heavy Meat</option>
          <option value="meal_medium_meat" ${profile?.diet_type === 'meal_medium_meat' ? 'selected' : ''}>Average Meat</option>
          <option value="meal_chicken_fish" ${profile?.diet_type === 'meal_chicken_fish' ? 'selected' : ''}>Chicken / Fish (Pescatarian)</option>
          <option value="meal_vegetarian" ${profile?.diet_type === 'meal_vegetarian' ? 'selected' : ''}>Vegetarian</option>
          <option value="meal_vegan" ${profile?.diet_type === 'meal_vegan' ? 'selected' : ''}>Vegan</option>
        </select>
      </div>

      <div class="input-group" style="margin-bottom:20px;">
        <label class="input-label" for="profile-commute">Daily Commute (km round trip)</label>
        <input type="number" id="profile-commute" class="input" value="${profile?.commute_km || 0}" min="0" step="1">
      </div>

      <button id="btn-save-profile" class="btn btn-primary" style="width:100%;">Save Profile</button>
    </div>
  `;

  // Setup Profile Save
  const btnSaveProfile = $('#btn-save-profile', container);
  btnSaveProfile.addEventListener('click', async () => {
    btnSaveProfile.classList.add('loading');
    const country = $('#profile-country', container).value;
    const vehicle_type = $('#profile-vehicle', container).value;
    const diet_type = $('#profile-diet', container).value;
    const commute_km = parseFloat($('#profile-commute', container).value) || 0;

    try {
      const { error } = await updateProfile({
        country,
        vehicle_type,
        diet_type,
        commute_km,
      });

      if (error) throw error;

      toastSuccess('Profile updated successfully! 🌱');
      // No need to manually update geminiService, it builds context fresh each time via coach.js
    } catch (err) {
      toastError('Failed to update profile.');
      console.error(err);
    } finally {
      btnSaveProfile.classList.remove('loading');
    }
  });

  // Setup API Key field

  const apiKeyInput = $('#api-key', container);
  const testBtn = $('#btn-test-key', container);

  if (profile?.gemini_api_key) {
    apiKeyInput.value = profile.gemini_api_key;
  }

  // Handle API Key Test & Save
  testBtn.addEventListener('click', async () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      toastError('Please enter an API key');
      return;
    }

    testBtn.disabled = true;
    testBtn.textContent = 'Testing...';

    try {
      const isValid = await geminiService.validateKey(key);
      
      if (isValid) {
        // Save to DB
        const { error } = await updateProfile({ gemini_api_key: key });
        if (error) throw error;
        
        // Update local service
        geminiService.setApiKey(key);
        toastSuccess('API Key saved successfully!');
      } else {
        toastError('Invalid API Key. Please check and try again.');
      }
    } catch (err) {
      toastError('Error saving key.');
      console.error(err);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Test & Save';
    }
  });

  // Handle Sign Out
  $('#btn-signout', container).addEventListener('click', async () => {
    try {
      await signOut();
      // Router handles redirect via auth state listener
    } catch (err) {
      toastError('Error signing out');
    }
  });
}
