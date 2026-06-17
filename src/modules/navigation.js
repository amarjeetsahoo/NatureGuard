/**
 * NatureGuard — Navigation Module
 * Renders sidebar (desktop) and bottom nav (mobile).
 */

import { router } from '../router.js';
import { getInitials } from '../utils/dom.js';
import { eventBus, EVENTS } from './eventBus.js';
import { getProfile } from './db.js';
import { signOut } from '../auth/authService.js';

const NAV_ITEMS = [
  { route: '#dashboard', icon: '⊞',  label: 'Dashboard',  emoji: '🏠' },
  { route: '#log',       icon: '＋',  label: 'Log',         emoji: '➕' },
  { route: '#coach',     icon: 'AI',  label: 'AI Coach',    emoji: '🤖' },
  { route: '#actions',   icon: '⚡',  label: 'Actions',     emoji: '💡' },
  { route: '#insights',  icon: '📊',  label: 'Insights',    emoji: '📊' },
  { route: '#whatif',    icon: '?',   label: 'What-If',     emoji: '🔮' },
  { route: '#rewards',   icon: '🏆',  label: 'Rewards',     emoji: '🏆' }
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
    <div id="points-pill" style="display:none;align-items:center;gap:4px;padding:4px 10px;background:rgba(20,184,166,0.12);border:1px solid rgba(20,184,166,0.25);border-radius:9999px;font-size:12px;font-weight:600;color:var(--accent-teal);margin-right:8px;cursor:pointer;" onclick="location.hash='#rewards'"></div>
    <div id="streak-pill" style="display:none;align-items:center;gap:4px;padding:4px 10px;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.25);border-radius:9999px;font-size:12px;font-weight:600;color:var(--accent-amber);margin-right:8px;cursor:pointer;" onclick="location.hash='#rewards'"></div>
    <div class="theme-switch theme-toggle-btn" aria-label="Toggle Theme" style="margin-right:8px;">
      <div class="theme-switch-thumb">
        <span class="theme-toggle-icon">☀️</span>
      </div>
    </div>
    <button class="avatar-btn" aria-label="Profile" style="border:none; background:none; cursor:pointer; padding:0;margin-left:8px;">
      <div class="avatar avatar-sm">${initials}</div>
    </button>
  `;
  
  actions.querySelector('.avatar-btn').addEventListener('click', () => {
    showProfileDialog(user);
  });

  // Load streak and points from profile and show pill
  getProfile().then(({ data: profile }) => {
    updateStreakPill(profile?.current_streak || 0);
    updatePointsPill(profile?.points || 0);
  });

  // Subscribe to updates to refresh pill live
  eventBus.on(EVENTS.STREAK_UPDATED, ({ streak }) => updateStreakPill(streak));
  eventBus.on('POINTS_UPDATED', ({ points }) => updatePointsPill(points));
}

function updatePointsPill(points) {
  const pill = document.getElementById('points-pill');
  if (!pill) return;
  if (points > 0) {
    pill.style.display = 'flex';
    pill.textContent = `⭐ ${points}`;
  } else {
    pill.style.display = 'none';
  }
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
      style="flex-direction:row;justify-content:space-between;gap:12px;border-radius:12px;margin-top:auto;"
    >
      <span class="theme-icon-static" style="font-size:18px;" aria-hidden="true">🌓</span>
      <span class="theme-text" style="font-size:14px;font-weight:500;flex:1;text-align:left;">Theme</span>
      <div class="theme-switch" style="pointer-events:none;">
        <div class="theme-switch-thumb">
          <span class="theme-toggle-icon">☀️</span>
        </div>
      </div>
    </button>

    <button
      class="nav-item sidebar-avatar-btn"
      aria-label="Profile"
      style="flex-direction:row;justify-content:flex-start;gap:12px;border-radius:12px;border-top:1px solid var(--border-subtle);padding-top:16px;margin-top:8px;"
    >
      <div class="avatar avatar-sm" style="flex-shrink:0;">${initials}</div>
      <div class="avatar-details" style="text-align:left;overflow:hidden;white-space:nowrap;">
        <div style="font-size:13px;font-weight:600;color:var(--text-primary);">${name}</div>
        <div style="font-size:11px;color:var(--text-muted);">View Profile</div>
      </div>
    </button>
  `;

  sidebar.querySelectorAll('.nav-item:not(.sidebar-avatar-btn)').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.route) router.navigate(btn.dataset.route);
    });
  });

  const sidebarAvatar = sidebar.querySelector('.sidebar-avatar-btn');
  if (sidebarAvatar) {
    sidebarAvatar.addEventListener('click', () => {
      showProfileDialog(user);
    });
  }

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

function showProfileDialog(user) {
  const existing = document.getElementById('profile-dialog');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'profile-dialog';
  overlay.className = 'modal-overlay';
  
  const initials = getInitials(user?.user_metadata?.display_name || user?.email || '?');
  const name = user?.user_metadata?.display_name || 'NatureGuard User';
  const email = user?.email || '';
  
  overlay.innerHTML = `
    <div class="modal" style="max-width: 320px; text-align: center; padding: 32px 24px; position: relative;">
      <button id="close-profile-btn" style="position:absolute; top:16px; right:16px; background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:24px; line-height:1;">&times;</button>
      
      <div class="avatar avatar-lg" style="margin: 0 auto 16px;">${initials}</div>
      <h3 style="font-size:18px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${name}</h3>
      <p style="font-size:13px; color:var(--text-secondary); margin-bottom:24px;">${email}</p>
      
      <div style="display:flex; flex-direction:column; gap:12px;">
        <button id="open-settings-btn" class="btn btn-secondary btn-full">
          <span>⚙️</span> Settings
        </button>
        <button id="sign-out-btn" class="btn btn-danger btn-full">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  
  overlay.querySelector('#close-profile-btn').addEventListener('click', () => {
    overlay.remove();
  });
  
  overlay.querySelector('#open-settings-btn').addEventListener('click', () => {
    overlay.remove();
    router.navigate('#settings');
  });
  
  overlay.querySelector('#sign-out-btn').addEventListener('click', async () => {
    overlay.remove();
    const { error } = await signOut();
    if (error) console.error('Sign out error', error);
  });
}
