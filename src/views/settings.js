/**
 * NatureGuard — Settings View
 * Manages user profile, AI API key, and preferences.
 */

import { $, $$, getInitials } from '../utils/dom.js';
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

        <div id="ai-section" style="
          position:relative;
          padding: 2px;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(167,139,250,0.4), rgba(45,212,191,0.4), rgba(163,230,53,0.4));
          background-size: 200% 200%;
          animation: meshShift 8s ease infinite;
          margin-bottom: var(--space-6);
        ">
          <div style="
            background: var(--bg-surface);
            border-radius: 22px;
            padding: 32px;
            position: relative;
            overflow: hidden;
          ">
            <!-- Glow effect inside -->
            <div style="position:absolute; top:-50px; right:-50px; width:150px; height:150px; background:var(--accent-teal); filter:blur(80px); opacity:0.15; pointer-events:none;"></div>
            
            <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px;">
              <div style="width:48px;height:48px;border-radius:14px;background:rgba(45,212,191,0.15);display:flex;align-items:center;justify-content:center;font-size:24px;">✨</div>
              <div>
                <h2 style="margin:0; font-size:20px; font-weight:800; background:linear-gradient(90deg, var(--accent-teal), var(--accent-lime)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">NatureGuard AI Brain</h2>
                <div style="font-size:13px; color:var(--text-secondary); margin-top:4px;">Powered by Google Gemini Flash</div>
              </div>
            </div>

            <p style="font-size:14px; line-height:1.6; color:var(--text-muted); margin-bottom:24px;">
              Your AI coach processes natural language logs and generates eco-insights. Your API key is stored securely and never shared.
            </p>

            <div style="background:var(--bg-elevated); border:1px solid var(--border-subtle); border-radius:16px; padding:20px; position:relative; z-index:1;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <label for="api-key" style="font-size:12px; font-weight:700; color:var(--text-primary); text-transform:uppercase; letter-spacing:0.05em;">API Key Configuration</label>
                <div id="ai-status" style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:600; padding:4px 10px; border-radius:999px; background:rgba(248,113,113,0.15); color:var(--accent-red);">
                  <span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span> Offline
                </div>
              </div>
              
              <div style="display:grid; grid-template-columns: 1fr auto; gap:24px; align-items:stretch;">
                <div style="position:relative;">
                  <span style="position:absolute; left:16px; top:50%; transform:translateY(-50%); font-size:16px;">🔑</span>
                  <input type="text" id="api-key" class="input input-masked" placeholder="Enter your Gemini API key..." autocomplete="off" spellcheck="false" style="padding-left:44px; height:100%; min-height:44px; width:100%; background:var(--bg-surface); border:1px solid var(--border-default); border-radius:12px; transition:all 0.3s; color:var(--text-primary);">
                </div>
                <button id="btn-test-key" class="btn btn-teal" style="border-radius:12px; padding:0 32px; font-weight:700;">
                  Connect AI
                </button>
              </div>
              
              <div style="margin-top:16px; font-size:12px; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-muted);">Don't have a key?</span>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--accent-teal); font-weight:600; text-decoration:none; display:flex; align-items:center; gap:4px; transition:color 0.2s;">
                  Get one for free ↗
                </a>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card danger-zone">
          <h2>Account</h2>
          <button id="btn-signout" class="btn btn-danger">Sign Out</button>
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

  const displayName = profile?.display_name || user?.user_metadata?.display_name || 'Eco Warrior';
  const initials = getInitials(displayName !== 'Eco Warrior' ? displayName : user?.email || '?');

  profileSection.innerHTML = `
    <h2>Profile</h2>
    <div class="profile-info" style="margin-bottom:20px;">
      <div class="profile-avatar">${initials}</div>
      <div class="profile-details">
        <div class="profile-name">${displayName}</div>
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
  const aiStatus = $('#ai-status', container);

  function updateAiStatus(status, usage = 0) {
    if (status === 'personal') {
      aiStatus.style.background = 'rgba(163,230,53,0.15)';
      aiStatus.style.color = 'var(--accent-lime)';
      aiStatus.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 8px currentColor;"></span> Personal Key (Unlimited)';
    } else if (status === 'default') {
      aiStatus.style.background = 'rgba(245,158,11,0.15)';
      aiStatus.style.color = 'var(--accent-amber)';
      aiStatus.innerHTML = `<span style="width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 8px currentColor;"></span> Default Key (${usage}/10)`;
    } else {
      aiStatus.style.background = 'rgba(248,113,113,0.15)';
      aiStatus.style.color = 'var(--accent-red)';
      aiStatus.innerHTML = '<span style="width:6px; height:6px; border-radius:50%; background:currentColor;"></span> Offline';
    }
  }

  if (profile?.gemini_api_key) {
    apiKeyInput.value = profile.gemini_api_key;
    updateAiStatus('personal');
  } else if (import.meta.env.VITE_DEFAULT_GEMINI_KEY) {
    updateAiStatus('default', profile?.ai_usage_count || 0);
  } else {
    updateAiStatus('offline');
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
        updateAiStatus('personal');
        toastSuccess('API Key saved successfully!');
      } else {
        updateAiStatus('offline');
        toastError('Invalid API Key. Please check and try again.');
      }
    } catch (err) {
      updateAiStatus('offline');
      toastError('Error saving key.');
      console.error(err);
    } finally {
      testBtn.disabled = false;
      testBtn.textContent = 'Connect AI';
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
