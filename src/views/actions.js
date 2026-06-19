/**
 * NatureGuard — Action Cards View
 * Shows personalized eco-actions, and tracks adopted/dismissed actions.
 */

import { $, $$ } from '../utils/dom.js';
import { getPersonalizedActions } from '../ai/actionsAI.js';
import { getUserActions, saveAction, updateActionStatus } from '../modules/db.js';
import { ACTION_LIBRARY } from '../data/actionLibrary.js';
import { toastSuccess, toastError, toastInfo } from '../utils/toast.js';

let currentAdoptedPage = 0;
const ADOPTED_LIMIT = 10;

export async function render(container) {
  container.innerHTML = `
    <div class="view" id="actions-view">
      <header class="view-header">
        <h1 class="view-title">Action Plan</h1>
        <p style="font-size:13px; color:var(--text-muted);">Personalized steps to reduce your footprint</p>
      </header>

      <!-- Tabs -->
      <div style="display:flex;gap:4px;background:var(--bg-base);padding:4px;border-radius:var(--radius-full);margin-bottom:24px;" role="tablist">
        <button id="tab-suggested" class="period-btn active" style="flex:1;padding:8px;" role="tab" aria-selected="true">Suggested</button>
        <button id="tab-adopted" class="period-btn" style="flex:1;padding:8px;" role="tab" aria-selected="false">Adopted</button>
      </div>

      <!-- Suggested Tab Content -->
      <div id="panel-suggested" role="tabpanel">
        <div id="loading-state" class="card" style="display:flex; flex-direction:column; gap:16px;">
          <div class="skeleton skeleton-text" style="height:120px; border-radius:12px;"></div>
          <div class="skeleton skeleton-text" style="height:120px; border-radius:12px;"></div>
          <div class="skeleton skeleton-text" style="height:120px; border-radius:12px;"></div>
        </div>
        <div id="suggested-list" style="display:flex; flex-direction:column; gap:16px;" hidden></div>
      </div>

      <!-- Adopted Tab Content -->
      <div id="panel-adopted" role="tabpanel" hidden>
        <div id="adopted-list" style="display:flex; flex-direction:column; gap:12px;"></div>
        <button id="adopted-load-more" class="btn btn-secondary btn-sm" style="width:100%; display:none; margin-top:8px;">Load More</button>
      </div>
    </div>
  `;

  setupTabs(container);
  await loadActions(container);

  const loadMoreBtn = container.querySelector('#adopted-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentAdoptedPage++;
      loadAdoptedPage(container, true);
    });
  }
}

function setupTabs(container) {
  const tabS = container.querySelector('#tab-suggested');
  const tabA = container.querySelector('#tab-adopted');
  const panelS = container.querySelector('#panel-suggested');
  const panelA = container.querySelector('#panel-adopted');

  tabS.addEventListener('click', () => {
    tabS.classList.add('active'); tabA.classList.remove('active');
    panelS.hidden = false; panelA.hidden = true;
  });

  tabA.addEventListener('click', () => {
    tabA.classList.add('active'); tabS.classList.remove('active');
    panelA.hidden = false; panelS.hidden = true;
  });
}

async function loadActions(container) {
  // Fetch up to 1000 actions to filter out adopted/dismissed from new suggestions
  const { data: allActions } = await getUserActions({ limit: 1000 });
  const adoptedKeys = (allActions || []).filter(a => a.status === 'adopted').map(a => a.action_key);
  const dismissedKeys = (allActions || []).filter(a => a.status === 'dismissed').map(a => a.action_key);
  
  // Render Adopted
  currentAdoptedPage = 0;
  await loadAdoptedPage(container);

  // Fetch AI Suggestions
  const allSuggestions = await getPersonalizedActions();
  
  // Filter out already acted upon
  const toShow = allSuggestions.filter(a => !adoptedKeys.includes(a.key) && !dismissedKeys.includes(a.key));

  const loadingEl = container.querySelector('#loading-state');
  const listEl = container.querySelector('#suggested-list');
  
  if (loadingEl) loadingEl.remove();
  listEl.hidden = false;

  if (toShow.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎉</div>
        <h3 class="empty-state-title">You're doing great!</h3>
        <p class="empty-state-desc">You've tackled all your top action items. Check back later for more.</p>
      </div>
    `;
    return;
  }

  const icons = { transport:'🚗', food:'🍔', energy:'⚡', shopping:'🛍️', travel:'✈️', general:'💡' };

  listEl.innerHTML = toShow.map(a => `
    <div class="card animate-fadeInUp" data-key="${a.key}">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:24px;">${icons[a.category] || '💡'}</span>
          <div>
            <h3 style="font-size:15px; font-weight:600;">${a.title}</h3>
            <div style="font-size:11px; color:var(--text-muted); display:flex; gap:8px; margin-top:2px;">
              <span>${'★'.repeat(a.difficulty)}${'☆'.repeat(3 - a.difficulty)}</span>
              <span>·</span>
              <span style="text-transform:capitalize;">${a.effort}</span>
            </div>
          </div>
        </div>
        <div class="badge badge-teal" style="display:flex; flex-direction:column; align-items:center; padding:4px 8px;">
          <span style="font-size:14px; font-weight:700;">-${a.co2SavedEstimate}</span>
          <span style="font-size:9px; font-weight:500;">kg/mo</span>
        </div>
      </div>
      
      <p style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:16px;">
        ${a.description}
      </p>
      
      <div class="action-card-buttons">
        <button class="btn btn-primary btn-sm btn-adopt" data-key="${a.key}" data-title="${a.title}" data-co2="${a.co2SavedEstimate}">Adopt</button>
        <button class="btn btn-outline btn-sm btn-dismiss" data-key="${a.key}" data-title="${a.title}" data-co2="${a.co2SavedEstimate}">Dismiss</button>
      </div>
    </div>
  `).join('');

  // Event Listeners for Adopt / Dismiss
  listEl.querySelectorAll('.btn-adopt').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.classList.add('loading');
      const { error } = await saveAction({
        action_key: btn.dataset.key,
        title: btn.dataset.title,
        status: 'adopted',
        co2_saved_estimate: Number(btn.dataset.co2),
        ai_generated: true
      });
      btn.classList.remove('loading');

      if (error) { toastError('Failed to adopt action'); return; }
      
      toastSuccess('Action adopted! Keep it up 🌿');
      btn.closest('.card').remove();
      loadActions(container); // Refresh the adopted list
    });
  });

  listEl.querySelectorAll('.btn-dismiss').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await saveAction({
        action_key: btn.dataset.key,
        title: btn.dataset.title,
        status: 'dismissed',
        co2_saved_estimate: Number(btn.dataset.co2),
        ai_generated: true
      });
      if (error) { toastError('Failed to dismiss action'); return; }
      
      toastInfo('Action dismissed.');
      btn.closest('.card').remove();
    });
  });
}

async function loadAdoptedPage(container, append = false) {
  if (!append) currentAdoptedPage = 0;

  const { data: adopted, count } = await getUserActions({ status: 'adopted', limit: ADOPTED_LIMIT, page: currentAdoptedPage });
  const listEl = container.querySelector('#adopted-list');
  const loadMoreBtn = container.querySelector('#adopted-load-more');

  if (!append && (!adopted || adopted.length === 0)) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:24px 16px;">
        <div class="empty-state-icon">🌱</div>
        <p class="empty-state-desc">You haven't adopted any actions yet.</p>
      </div>
    `;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  const icons = { transport:'🚗', food:'🍔', energy:'⚡', shopping:'🛍️', travel:'✈️', general:'💡' };

  const html = adopted.map(a => {
    // Cross-reference with base library for icon/category
    const base = ACTION_LIBRARY.find(l => l.key === a.action_key) || { category: 'general' };
    const date = new Date(a.adopted_at || a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `
      <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:rgba(163,230,53,0.05); border:1px solid rgba(163,230,53,0.2); border-radius:12px;">
        <span style="font-size:24px;">${icons[base.category] || '💡'}</span>
        <div style="flex:1;">
          <h3 style="font-size:14px; font-weight:600; color:var(--text-primary);">${a.title}</h3>
          <p style="font-size:11px; color:var(--accent-teal);">Adopted on ${date}</p>
        </div>
        ${a.co2_saved_estimate ? `
          <div style="text-align:right;">
            <div style="font-size:13px; font-weight:700; color:var(--accent-lime);">-${a.co2_saved_estimate}</div>
            <div style="font-size:9px; color:var(--text-muted);">kg/mo</div>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  if (append) {
    listEl.insertAdjacentHTML('beforeend', html);
  } else {
    listEl.innerHTML = html;
  }

  if (loadMoreBtn) {
    const totalLoaded = (currentAdoptedPage + 1) * ADOPTED_LIMIT;
    loadMoreBtn.style.display = count > totalLoaded ? 'block' : 'none';
  }
}
