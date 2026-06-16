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
  setupThemeToggle();
}

function setupThemeToggle() {
  const isLight = document.documentElement.classList.contains('theme-light');
  document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
    icon.innerHTML = isLight ? '🌙' : '☀️';
  });
  
  document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isCurrentlyLight = document.documentElement.classList.contains('theme-light');
      if (isCurrentlyLight) {
        document.documentElement.classList.remove('theme-light');
        localStorage.setItem('natureguard-theme', 'dark');
        document.querySelectorAll('.theme-toggle-icon').forEach(i => i.innerHTML = '☀️');
      } else {
        document.documentElement.classList.add('theme-light');
        localStorage.setItem('natureguard-theme', 'light');
        document.querySelectorAll('.theme-toggle-icon').forEach(i => i.innerHTML = '🌙');
      }
    });
  });
}

function renderTopBar(user) {
  const actions = document.getElementById('top-bar-actions');
  if (!actions) return;
  
  const initials = getInitials(user?.user_metadata?.display_name || user?.email || '?');
  actions.innerHTML = `
    <div id="streak-pill" style="display:none;align-items:center;gap:4px;padding:4px 10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:9999px;font-size:12px;font-weight:600;color:var(--accent-amber);"></div>
    <button class="theme-toggle-btn" aria-label="Toggle Theme" style="border:none;background:none;cursor:pointer;padding:0;font-size:20px;display:flex;align-items:center;justify-content:center;width:32px;height:32px;"><span class="theme-toggle-icon">☀️</span></button>
    <button class="avatar-btn" data-route="#settings" aria-label="Settings" style="border:none; background:none; cursor:pointer; padding:0;margin-left:8px;">
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

  const isCollapsed = localStorage.getItem('natureguard-sidebar') === 'collapsed';
  if (isCollapsed) sidebar.classList.add('collapsed');

  sidebar.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; overflow:hidden;">
      <div class="logo">
        <span class="logo-leaf" aria-hidden="true">🌿</span>
        <span class="logo-text">Nature<span>Guard</span></span>
      </div>
      <button id="sidebar-collapse-btn" aria-label="Toggle Sidebar" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;padding:4px;margin-right:-8px;" title="Collapse sidebar">
        <span class="collapse-icon">${isCollapsed ? '▶' : '◀'}</span>
      </button>
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
      class="nav-item theme-toggle-btn"
      aria-label="Toggle Theme"
      style="flex-direction:row;justify-content:flex-start;gap:12px;border-radius:12px;margin-top:auto;"
    >
      <span class="theme-toggle-icon" style="font-size:18px;" aria-hidden="true">☀️</span>
      <span style="font-size:14px;font-weight:500;">Toggle Theme</span>
    </button>

    <button
      class="nav-item"
      data-route="#settings"
      aria-label="Settings"
      style="flex-direction:row;justify-content:flex-start;gap:12px;border-radius:12px;border-top:1px solid var(--border-subtle);padding-top:16px;margin-top:8px;"
    >
      <div class="avatar avatar-sm" style="flex-shrink:0;">${initials}</div>
      <div class="avatar-details" style="text-align:left;overflow:hidden;white-space:nowrap;">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${name}</div>
        <div style="font-size:11px;color:var(--text-muted);">Settings</div>
      </div>
    </button>
  `;

  sidebar.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.route) router.navigate(btn.dataset.route);
    });
  });

  const collapseBtn = sidebar.querySelector('#sidebar-collapse-btn');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const collapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('natureguard-sidebar', collapsed ? 'collapsed' : 'expanded');
      sidebar.querySelector('.collapse-icon').textContent = collapsed ? '▶' : '◀';
      document.body.classList.toggle('sidebar-collapsed', collapsed);
    });
  }

  // Set initial body class
  if (isCollapsed) document.body.classList.add('sidebar-collapsed');

  // Show sidebar on desktop
  sidebar.hidden = false;
}
