/**
 * NatureGuard — App Entry Point
 * Boots the app, checks for existing session, and starts the router.
 */

import { supabase } from './auth/supabaseClient.js';
import { onAuthChange, getCurrentSession } from './auth/authService.js';
import { router } from './router.js';
import { renderNavigation } from './modules/navigation.js';
import { initToasts } from './utils/toast.js';
import { getProfile } from './modules/db.js';
import { geminiService } from './ai/geminiService.js';

async function boot() {
  initToasts();

  // 1. Check for an existing session IMMEDIATELY on load
  const existingSession = await getCurrentSession();

  if (existingSession) {
    await handleLoginSuccess(existingSession.user);
    await router.navigate(location.hash && location.hash !== '#landing' && location.hash !== '#auth'
      ? location.hash
      : '#dashboard'
    );
  } else {
    hideAuthenticatedUI();
    await router.navigate('#landing');
  }

  // 2. Subscribe to auth state changes for login/logout events
  onAuthChange(async (session) => {
    if (session) {
      await handleLoginSuccess(session.user);
      const hash = location.hash;
      if (!hash || hash === '#landing' || hash === '#auth') {
        await router.navigate('#dashboard');
      }
    } else {
      geminiService.setApiKey(null);
      hideAuthenticatedUI();
      await router.navigate('#landing');
    }
  });

  // 3. Handle browser back/forward navigation
  window.addEventListener('hashchange', () => {
    router.navigate(location.hash);
  });
}

async function handleLoginSuccess(user) {
  document.getElementById('top-bar').hidden = false;
  document.getElementById('bottom-nav').hidden = false;
  document.getElementById('sidebar').hidden = false;
  renderNavigation(user);

  // Load API key from profile
  const { data: profile } = await getProfile();
  if (profile?.gemini_api_key) {
    geminiService.setApiKey(profile.gemini_api_key);
  }
}

function hideAuthenticatedUI() {
  document.getElementById('top-bar').hidden = true;
  document.getElementById('bottom-nav').hidden = true;
  document.getElementById('sidebar').hidden = true;
}

boot();
