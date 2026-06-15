/**
 * NatureGuard — App Entry Point
 * Boots the app, checks for existing session, and starts the router.
 */

import { supabase } from './auth/supabaseClient.js';
import { onAuthChange, getCurrentSession } from './auth/authService.js';
import { router } from './router.js';
import { renderNavigation } from './modules/navigation.js';
import { initToasts, toastSuccess } from './utils/toast.js';
import { getProfile } from './modules/db.js';
import { geminiService } from './ai/geminiService.js';
import { eventBus, EVENTS } from './modules/eventBus.js';
import { onActivityLogged } from './modules/streak.js';
import { confettiBurst } from './utils/confetti.js';

async function boot() {
  initToasts();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

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

  // 4. Streak engine — fires whenever any view logs an activity
  eventBus.on(EVENTS.ACTIVITY_LOGGED, async () => {
    const { newStreak, newBadges } = await onActivityLogged();
    // Refresh streak display in nav
    eventBus.emit(EVENTS.STREAK_UPDATED, { streak: newStreak });
  });

  // 5. Badge earned — show a special toast + confetti
  eventBus.on(EVENTS.BADGE_EARNED, (badge) => {
    confettiBurst();
    // Show a styled badge toast
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast toast-badge';
    el.innerHTML = `
      <span class="toast-icon" style="font-size:24px;">${badge.icon}</span>
      <div>
        <div style="font-weight:700;font-size:14px;">Badge Unlocked!</div>
        <div style="font-size:12px;color:var(--text-secondary);">${badge.title} — ${badge.desc}</div>
      </div>
    `;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      el.addEventListener('animationend', () => el.remove());
    }, 4000);
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
