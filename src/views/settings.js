/**
 * NatureGuard — Settings View
 * Manages user profile, AI API key, and preferences.
 */

import { $, $$ } from '../utils/dom.js';
import { getProfile, updateProfile } from '../modules/db.js';
import { getCurrentUser, signOut } from '../auth/authService.js';
import { geminiService } from '../ai/geminiService.js';
import { toastSuccess, toastError } from '../utils/toast.js';

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
  profileSection.innerHTML = `
    <h2>Profile</h2>
    <div class="profile-info">
      <div class="profile-avatar">${user?.email?.charAt(0).toUpperCase() || '?'}</div>
      <div class="profile-details">
        <div class="profile-name">${profile?.display_name || 'Eco Warrior'}</div>
        <div class="profile-email">${user?.email || ''}</div>
      </div>
    </div>
  `;

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
