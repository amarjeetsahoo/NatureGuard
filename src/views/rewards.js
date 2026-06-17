/**
 * NatureGuard — Rewards View
 * Shows user XP, Levels, Streaks, and Badges.
 */

import { getProfile } from '../modules/db.js';
import { getLevel, BADGES } from '../modules/rewards.js';

export async function render(container) {
  container.innerHTML = `
    <div class="view" id="rewards-view">
      <div id="loading-state" class="card" style="display:flex; flex-direction:column; gap:16px;">
        <div class="skeleton skeleton-text" style="height:120px; border-radius:12px;"></div>
        <div class="skeleton skeleton-text" style="height:120px; border-radius:12px;"></div>
      </div>
      <div id="rewards-content" hidden></div>
    </div>
  `;

  await loadRewards(container);
}

async function loadRewards(container) {
  const { data: prof } = await getProfile();
  if (!prof) return;

  const points = prof.points || 0;
  const levelInfo = getLevel(points);
  const progressPercent = Math.min(100, Math.floor((points / levelInfo.nextThreshold) * 100));

  const badgesUnlocked = Array.isArray(prof.badges) ? prof.badges : [];

  const html = `
    <header class="view-header">
      <h1 class="view-title">Rewards & Progress</h1>
      <p style="font-size:13px; color:var(--text-muted);">Track your eco-impact journey</p>
    </header>

    <!-- Level & XP Card -->
    <div class="card animate-fadeInUp" style="margin-bottom:24px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:12px;">
        <div>
          <div style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.05em; font-weight:600;">Current Level</div>
          <div style="font-size:24px; font-weight:700; color:var(--text-primary);">Lv.${levelInfo.level} ${levelInfo.title}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:20px; font-weight:800; color:var(--accent-teal);">${points} XP</div>
        </div>
      </div>
      
      <!-- Progress Bar -->
      <div style="width:100%; height:8px; background:var(--border-subtle); border-radius:4px; overflow:hidden; margin-bottom:8px;">
        <div style="height:100%; width:${progressPercent}%; background:var(--accent-teal); border-radius:4px; transition:width 1s ease-out;"></div>
      </div>
      <div style="font-size:11px; color:var(--text-muted); text-align:right;">
        ${points} / ${levelInfo.nextThreshold} XP to next level
      </div>
    </div>

    <!-- Streaks Card -->
    <div class="card animate-fadeInUp" style="animation-delay:100ms; margin-bottom:24px; display:flex; gap:16px;">
      <div style="flex:1; text-align:center; padding:12px; background:rgba(251,146,60,0.1); border-radius:12px; border:1px solid rgba(251,146,60,0.2);">
        <div style="font-size:32px; margin-bottom:8px;">🔥</div>
        <div style="font-size:20px; font-weight:800; color:var(--text-primary);">${prof.current_streak || 0}</div>
        <div style="font-size:11px; color:var(--text-muted); font-weight:500;">Day Streak</div>
      </div>
      <div style="flex:1; text-align:center; padding:12px; background:var(--glass-bg); border-radius:12px; border:1px solid var(--border-subtle);">
        <div style="font-size:32px; margin-bottom:8px;">👑</div>
        <div style="font-size:20px; font-weight:800; color:var(--text-primary);">${prof.longest_streak || 0}</div>
        <div style="font-size:11px; color:var(--text-muted); font-weight:500;">Best Streak</div>
      </div>
    </div>

    <!-- Badges Grid -->
    <h2 style="font-size:15px; font-weight:600; margin-bottom:16px;">Badges</h2>
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:12px;" class="animate-fadeInUp" style="animation-delay:200ms;">
      ${Object.values(BADGES).map(badge => {
        const isUnlocked = badgesUnlocked.includes(badge.id);
        return `
          <div style="
            display:flex; flex-direction:column; align-items:center; text-align:center;
            padding:16px 8px; border-radius:16px;
            background:${isUnlocked ? 'var(--glass-bg)' : 'rgba(0,0,0,0.02)'};
            border:1px solid ${isUnlocked ? 'var(--border-default)' : 'var(--border-subtle)'};
            opacity:${isUnlocked ? '1' : '0.5'};
            filter:${isUnlocked ? 'none' : 'grayscale(100%)'};
            transition:transform 0.2s;
          ">
            <div style="font-size:36px; margin-bottom:8px;">${badge.icon}</div>
            <div style="font-size:12px; font-weight:600; color:var(--text-primary); line-height:1.2; margin-bottom:4px;">${badge.title}</div>
            <div style="font-size:9px; color:var(--text-muted); line-height:1.3;">${badge.desc}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  const loadingEl = container.querySelector('#loading-state');
  if (loadingEl) loadingEl.remove();

  const contentEl = container.querySelector('#rewards-content');
  contentEl.innerHTML = html;
  contentEl.hidden = false;
}
