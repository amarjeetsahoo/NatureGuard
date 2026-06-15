/**
 * NatureGuard — Navigation Module
 * Renders sidebar (desktop) and bottom nav (mobile).
 */

import { router } from '../router.js';
import { getInitials } from '../utils/dom.js';
import { eventBus, EVENTS } from './eventBus.js';
import { getProfile } from './db.js';

const NAV_ITEMS = [
  { route: '#dashboard', icon: '⊞',  label: 'Dashboard',  emoji: '🏠' },
  { route: '#log',       icon: '＋',  label: 'Log',         emoji: '➕' },
  { route: '#coach',     icon: 'AI',  label: 'AI Coach',    emoji: '🤖' },
  { route: '#actions',   icon: '⚡',  label: 'Actions',     emoji: '💡' },
  { route: '#insights',  icon: '📊',  label: 'Insights',    emoji: '📊' },
  { route: '#whatif',    icon: '?',   label: 'What-If',     emoji: '🔮' }
];

export function renderNavigation(user) {
  renderBottomNav();
  renderSidebar(user);
  renderTopBar(user);
}

function renderTopBar(user) {
  const actions = document.getElementById('top-bar-actions');
  if (!actions) return;
  
  const initials = getInitials(user?.user_metadata?.display_name || user?.email || '?');
  actions.innerHTML = `
    <div id="streak-pill" style="display:none;align-items:center;gap:4px;padding:4px 10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:9999px;font-size:12px;font-weight:600;color:var(--accent-amber);"></div>
    <button class="avatar-btn" data-route="#settings" aria-label="Settings" style="border:none; background:none; cursor:pointer; padding:0;">
      <div class="avatar avatar-sm">${initials}</div>
    </button>
  `;
  
  actions.querySelector('.avatar-btn').addEventListener('click', () => {
    router.navigate('#settings');
  });

  // Load streak from profile and show pill
  getProfile().then(({ data: profile }) => {
    updateStreakPill(profile?.current_streak || 0);
  });

  // Subscribe to STREAK_UPDATED to refresh pill live
  eventBus.on(EVENTS.STREAK_UPDATED, ({ streak }) => updateStreakPill(streak));
}

function updateStreakPill(streak) {
  const pill = document.getElementById('streak-pill');
  if (!pill) return;
  if (streak > 0) {
    pill.style.display = 'flex';
    pill.textContent = `🔥 ${streak}`;
  } else {
    pill.style.display = 'none';
  }
}

function renderBottomNav() {
  const nav = document.getElementById('bottom-nav');
  nav.innerHTML = NAV_ITEMS.map(item => `
    <button
      class="nav-item ${location.hash === item.route ? 'active' : ''}"
      data-route="${item.route}"
      aria-label="${item.label}"
      id="nav-${item.route.slice(1)}"
    >
      <span style="font-size:20px;" aria-hidden="true">${item.emoji}</span>
      <span class="nav-label">${item.label}</span>
    </button>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.route));
  });
}

function renderSidebar(user) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const initials = getInitials(user?.user_metadata?.display_name || user?.email || '?');
  const name = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';

  sidebar.innerHTML = `
    <div class="logo" style="margin-bottom:32px;">
      <span class="logo-leaf" aria-hidden="true">🌿</span>
      <span class="logo-text">Nature<span>Guard</span></span>
    </div>

    <div id="sidebar-nav-items" style="display:flex;flex-direction:column;gap:4px;flex:1;">
      ${NAV_ITEMS.map(item => `
        <button
          class="nav-item ${location.hash === item.route ? 'active' : ''}"
          data-route="${item.route}"
          aria-label="${item.label}"
          style="flex-direction:row;justify-content:flex-start;gap:12px;border-radius:12px;"
        >
          <span style="font-size:18px;" aria-hidden="true">${item.emoji}</span>
          <span style="font-size:14px;font-weight:500;">${item.label}</span>
        </button>
      `).join('')}
    </div>

    <button
      class="nav-item"
      data-route="#settings"
      aria-label="Settings"
      style="flex-direction:row;justify-content:flex-start;gap:12px;border-radius:12px;border-top:1px solid var(--border-subtle);padding-top:16px;margin-top:8px;"
    >
      <div class="avatar avatar-sm">${initials}</div>
      <div style="text-align:left;">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${name}</div>
        <div style="font-size:11px;color:var(--text-muted);">Settings</div>
      </div>
    </button>
  `;

  sidebar.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => router.navigate(btn.dataset.route));
  });

  // Show sidebar on desktop
  sidebar.hidden = false;
}
