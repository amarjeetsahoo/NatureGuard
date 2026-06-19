/**
 * NatureGuard — App Entry Point
 * Boots the app, checks for existing session, and starts the router.
 */

import '../css/reset.css';
import '../css/design-tokens.css';
import '../css/animations.css';
import '../css/components.css';
import '../css/views.css';

import { injectSpeedInsights } from '@vercel/speed-insights';
import { supabase } from './auth/supabaseClient.js';
import { onAuthChange, getCurrentSession } from './auth/authService.js';
import { router } from './router.js';
import { renderNavigation } from './modules/navigation.js';
import { initToasts, toastSuccess } from './utils/toast.js';
import { getProfile } from './modules/db.js';
import { geminiService } from './ai/geminiService.js';
import { eventBus, EVENTS } from './modules/eventBus.js';
import { confettiBurst } from './utils/confetti.js';

async function boot() {
  injectSpeedInsights(); // Vercel Speed Insights — no-op in dev, active on Vercel
  initToasts();

  // Register Service Worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

  // Initialize Theme
  const savedTheme = localStorage.getItem('natureguard-theme');
  if (savedTheme === 'light' || (!savedTheme && window.matchMedia('(prefers-color-scheme: light)').matches)) {
    document.documentElement.classList.add('theme-light');
  }

  // Capture the hash synchronously before Supabase auto-strips it during getSession()
  const initialHash = location.hash;

  // Helper to determine route after auth
  const getPostAuthRoute = () => {
    // Check initialHash as well as current hash, since Supabase might clear it
    const hash = location.hash || initialHash;
    const fullUrl = location.href;
    
    if (fullUrl.includes('type=recovery') || hash.includes('type=recovery')) {
      import('./utils/toast.js').then(m => m.toastSuccess('Please update your password below.'));
      return '#settings';
    }
    if (!hash || hash === '' || hash === '#auth' || hash.includes('access_token=')) {
      return '#dashboard';
    }
    return hash;
  };

  // 1. Check for an existing session IMMEDIATELY on load
  const existingSession = await getCurrentSession();

  if (existingSession) {
    const handledRouting = await handleLoginSuccess(existingSession.user);
    if (!handledRouting) {
      await router.navigate(getPostAuthRoute());
    }
  } else {
    hideAuthenticatedUI();
    // Do not route to landing if trying to auth with a token
    if (!location.hash.includes('access_token=')) {
      await router.navigate('');
    }
  }

  // 2. Subscribe to auth state changes for login/logout events
  onAuthChange(async (session) => {
    if (session) {
      const handledRouting = await handleLoginSuccess(session.user);
      if (!handledRouting) {
        const targetRoute = getPostAuthRoute();
        if (targetRoute !== router.currentRoute) {
          await router.navigate(targetRoute);
        }
      }
    } else {
      geminiService.setApiKey(null);
      hideAuthenticatedUI();
      await router.navigate('');
    }
  });

  // 3. Handle browser back/forward navigation
  window.addEventListener('hashchange', () => {
    router.navigate(location.hash);
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

  // If this is a brand-new Google OAuth user who has never completed onboarding,
  // route them there so they get a personalized setup experience.
  // We only do this for Google users (provider = 'google') to avoid breaking
  // existing email/password users who may have a null 'onboarded' value.
  const isGoogleUser = user?.app_metadata?.provider === 'google';
  if (isGoogleUser && !profile?.onboarded) {
    // Pre-seed their display name from Google OAuth metadata
    const googleName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (googleName && !profile?.display_name) {
      await supabase.from('profiles').upsert({
        id: user.id,
        display_name: googleName,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    }
    // Only navigate to onboarding if we aren't already there
    if (router.currentRoute !== '#onboarding') {
      await router.navigate('#onboarding');
    }
    return true; // Signal: we already handled routing
  }

  return false; // Signal: caller should handle routing
}

function hideAuthenticatedUI() {
  document.getElementById('top-bar').hidden = true;
  document.getElementById('bottom-nav').hidden = true;
  document.getElementById('sidebar').hidden = true;
}

boot();
