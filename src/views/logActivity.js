/**
 * NatureGuard — Log Activity View
 * Manual logging + AI Natural Language logging (when API key set).
 */

import {
  calculateTransport, calculateFood, calculateEnergy,
  calculateShopping, calculateFlight,
} from '../modules/calculator.js';
import { formatCO2, humanize } from '../modules/humanizer.js';
import { saveActivity, saveActivities, getActivities, deleteActivity, getProfile } from '../modules/db.js';
import { toastSuccess, toastError, toastInfo } from '../utils/toast.js';
import { eventBus, EVENTS } from '../modules/eventBus.js';
import { router } from '../router.js';
import { setupVoiceInput } from '../utils/voice.js';

const CATEGORIES = [
  { key: 'transport', icon: '🚗', label: 'Transport' },
  { key: 'food',      icon: '🍔', label: 'Food'      },
  { key: 'energy',    icon: '⚡', label: 'Energy'    },
  { key: 'shopping',  icon: '🛍️', label: 'Shopping'  },
  { key: 'travel',    icon: '✈️', label: 'Travel'    },
  { key: 'other',     icon: '✨', label: 'Other'     },
];

let selectedCategory = null;
let currentCO2 = 0;
let profile = null;
let currentRecentPage = 0;
const RECENT_LIMIT = 10;

export async function render(container) {
  const { data: prof } = await getProfile();
  profile = prof;

  container.innerHTML = `
    <div class="view" id="log-view">
      <h1 class="view-title" style="margin-bottom:20px;">Log Activity</h1>

      <!-- AI Natural Language Input -->
      <div class="nl-input-section animate-fadeInUp" id="nl-section" style="animation-delay:0ms;">
        <div class="nl-input-label">
          <span>🤖</span>
          <span>Describe your day to AI</span>
          <span class="badge badge-teal" style="margin-left:auto;font-size:10px;">AI</span>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <textarea
            id="nl-input"
            class="input textarea"
            placeholder='e.g. "I drove 15km to work, had a chicken sandwich for lunch, and ordered a new book online"'
            rows="3"
            style="flex:1;"
            aria-label="Describe your activities in plain English"
          ></textarea>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span id="voice-status" style="font-size:11px;color:var(--text-muted);">Powered by Gemini AI · Requires API key in Settings</span>
          <div style="display:flex;gap:8px;align-items:center;">
            <button
              id="voice-btn"
              type="button"
              aria-label="Start voice input"
              title="Speak your activity"
              style="
                flex-shrink:0;
                width:36px;height:36px;
                border-radius:50%;
                background:var(--glass-bg);
                border:1.5px solid var(--border-default);
                cursor:pointer;
                display:flex;align-items:center;justify-content:center;
                font-size:16px;
                transition:all 0.2s ease;
                color:var(--text-primary);
              "
            >🎙️</button>
            <button id="nl-parse-btn" class="btn btn-teal btn-sm">Parse ✨</button>
          </div>
        </div>
      </div>

      <!-- Parsed AI results (hidden until parsed) -->
      <div id="nl-results" hidden style="margin-bottom:20px;"></div>

      <!-- Manual Category Selector -->
      <div style="margin-bottom:20px;">
        <p style="font-size:13px;font-weight:600;color:var(--text-muted);margin-bottom:12px;text-transform:uppercase;letter-spacing:.05em;">
          Or log manually
        </p>
        <div class="category-tiles" role="group" aria-label="Select activity category">
          ${CATEGORIES.map(cat => `
            <button
              class="category-tile"
              data-category="${cat.key}"
              aria-label="${cat.label}"
              id="cat-${cat.key}"
            >
              <span class="category-tile-icon" aria-hidden="true">${cat.icon}</span>
              <span class="category-tile-label">${cat.label}</span>
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Input Form (shown after category selection) -->
      <div id="activity-form" hidden class="card animate-fadeInUp" style="margin-bottom:20px;"></div>

      <!-- CO₂ Preview -->
      <div id="co2-preview" hidden class="co2-preview animate-fadeInScale" aria-live="polite">
        <div>
          <div class="co2-preview-value" id="preview-value">0</div>
          <div class="co2-preview-unit">kg CO₂e</div>
        </div>
        <div id="preview-humanize" class="co2-preview-eq">—</div>
        <button id="log-btn" class="btn btn-primary btn-sm">Log It ✓</button>
      </div>

      <!-- Recent Activities -->
      <div style="margin-top:32px;">
        <h2 style="font-size:15px;font-weight:600;margin-bottom:16px;">Recent</h2>
        <div id="recent-list">
          <div class="skeleton skeleton-text" style="height:48px;border-radius:12px;margin-bottom:8px;"></div>
          <div class="skeleton skeleton-text" style="height:48px;border-radius:12px;margin-bottom:8px;"></div>
          <div class="skeleton skeleton-text" style="height:48px;border-radius:12px;"></div>
        </div>
        <button id="recent-load-more" class="btn btn-secondary btn-sm" style="width:100%; display:none; margin-top:8px;">Load More</button>
      </div>
    </div>
  `;

  setupCategoryTiles(container);
  setupNLParser(container);
  const mainBtn = container.querySelector('#voice-btn');
  const mainTextarea = container.querySelector('#nl-input');
  const mainStatusEl = container.querySelector('#voice-status');
  if (mainBtn && mainTextarea && mainStatusEl) {
    setupVoiceInput(mainBtn, mainTextarea, mainStatusEl, 'Powered by Gemini AI · Requires API key in Settings');
  }

  const loadMoreBtn = container.querySelector('#recent-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentRecentPage++;
      loadRecentActivities(container, true);
    });
  }

  loadRecentActivities(container);
}

// ── Category tile selection ───────────────────────────────

function setupCategoryTiles(container) {
  container.querySelectorAll('.category-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      container.querySelectorAll('.category-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      selectedCategory = tile.dataset.category;
      currentCO2 = 0;
      renderActivityForm(container, selectedCategory);
    });
  });
}

function renderActivityForm(container, category) {
  const form = container.querySelector('#activity-form');
  const preview = container.querySelector('#co2-preview');
  form.hidden = false;
  preview.hidden = true;

  const forms = {
    transport: transportForm,
    food:      foodForm,
    energy:    energyForm,
    shopping:  shoppingForm,
    travel:    travelForm,
    other:     otherForm,
  };

  form.innerHTML = (forms[category] || (() => ''))();
  setupFormListeners(container, category);
}

// ── Form templates ────────────────────────────────────────

function transportForm() {
  return `
    <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;">🚗 Transport</h3>
    <div class="input-group" style="margin-bottom:16px;">
      <label class="input-label" for="transport-vehicle">Vehicle Type</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;" id="vehicle-chips" role="group">
        ${[
          ['petrol_avg','🚗 Petrol'],['electric','⚡ Electric'],['hybrid','🔋 Hybrid'],
          ['diesel_avg','🛢️ Diesel'],['bus','🚌 Bus'],['train','🚂 Train'],
          ['motorcycle','🏍️ Motorbike'],['cycling','🚴 Cycling'],
        ].map(([val, label]) => `
          <button class="chip ${val === 'petrol_avg' ? 'active' : ''}" data-value="${val}" type="button">${label}</button>
        `).join('')}
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="transport-km">Distance (km)</label>
      <div style="display:flex;align-items:center;gap:12px;">
        <input type="range" id="transport-km" min="0" max="200" value="10" step="1" style="flex:1;accent-color:var(--accent-lime);" aria-valuemin="0" aria-valuemax="200"/>
        <span id="km-display" style="min-width:60px;font-weight:600;font-family:var(--font-mono);color:var(--accent-lime);">10 km</span>
      </div>
    </div>
  `;
}

function foodForm() {
  return `
    <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;">🍔 Food</h3>
    <div class="input-group" style="margin-bottom:16px;">
      <label class="input-label">Meal Type</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${[
          ['meal_heavy_meat','🥩 Heavy Meat','~3.8 kg'],
          ['meal_medium_meat','🍖 Medium Meat','~2.5 kg'],
          ['meal_chicken_fish','🍗 Chicken/Fish','~1.6 kg'],
          ['meal_vegetarian','🥗 Vegetarian','~0.9 kg'],
          ['meal_vegan','🌱 Vegan','~0.5 kg'],
          ['beef','🐄 Beef (100g)','~6.6 kg'],
        ].map(([val, label, co2hint]) => `
          <button class="chip" data-value="${val}" type="button" style="flex-direction:column;height:auto;padding:10px;">
            <span>${label}</span>
            <span style="font-size:10px;color:var(--text-muted);">${co2hint} CO₂</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="food-servings">Servings</label>
      <div style="display:flex;align-items:center;gap:12px;">
        <input type="range" id="food-servings" min="1" max="5" value="1" step="1" style="flex:1;accent-color:var(--accent-lime);"/>
        <span id="servings-display" style="min-width:60px;font-weight:600;font-family:var(--font-mono);color:var(--accent-lime);">1 serving</span>
      </div>
    </div>
  `;
}

function energyForm() {
  return `
    <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;">⚡ Energy</h3>
    <div class="input-group" style="margin-bottom:16px;">
      <label class="input-label" for="energy-kwh">Electricity Used (kWh)</label>
      <div style="display:flex;align-items:center;gap:12px;">
        <input type="range" id="energy-kwh" min="0" max="100" value="5" step="0.5" style="flex:1;accent-color:var(--accent-lime);"/>
        <span id="kwh-display" style="min-width:70px;font-weight:600;font-family:var(--font-mono);color:var(--accent-lime);">5 kWh</span>
      </div>
      <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">
        💡 Average home uses ~10 kWh/day · 1 kWh ≈ leaving 10 bulbs on for 1 hour
      </p>
    </div>
  `;
}

function shoppingForm() {
  return `
    <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;">🛍️ Shopping</h3>
    <div class="input-group" style="margin-bottom:16px;">
      <label class="input-label">Item Type</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        ${[
          ['clothing_tshirt','👕 T-Shirt','7 kg'],
          ['clothing_jeans','👖 Jeans','32 kg'],
          ['clothing_jacket','🧥 Jacket','50 kg'],
          ['electronics_phone','📱 Phone','70 kg'],
          ['electronics_laptop','💻 Laptop','300 kg'],
          ['book','📚 Book','1 kg'],
        ].map(([val, label, co2hint]) => `
          <button class="chip" data-value="${val}" type="button" style="flex-direction:column;height:auto;padding:10px;">
            <span>${label}</span>
            <span style="font-size:10px;color:var(--text-muted);">${co2hint} CO₂</span>
          </button>
        `).join('')}
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="shopping-qty">Quantity</label>
      <div style="display:flex;align-items:center;gap:12px;">
        <input type="range" id="shopping-qty" min="1" max="10" value="1" step="1" style="flex:1;accent-color:var(--accent-lime);"/>
        <span id="qty-display" style="min-width:60px;font-weight:600;font-family:var(--font-mono);color:var(--accent-lime);">1 item</span>
      </div>
    </div>
  `;
}

function travelForm() {
  return `
    <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;">✈️ Travel</h3>
    <div class="input-group" style="margin-bottom:16px;">
      <label class="input-label">Flight Class</label>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">
        ${[
          ['economy_shorthaul','💺 Economy Short'],
          ['economy_longhaul','💺 Economy Long'],
          ['business_shorthaul','🛋️ Business Short'],
          ['business_longhaul','🛋️ Business Long'],
        ].map(([val, label]) => `
          <button class="chip ${val === 'economy_shorthaul' ? 'active' : ''}" data-value="${val}" type="button">${label}</button>
        `).join('')}
      </div>
    </div>
    <div class="input-group">
      <label class="input-label" for="flight-km">Flight Distance (km)</label>
      <div style="display:flex;align-items:center;gap:12px;">
        <input type="range" id="flight-km" min="100" max="15000" value="1000" step="100" style="flex:1;accent-color:var(--accent-lime);"/>
        <span id="flight-km-display" style="min-width:80px;font-weight:600;font-family:var(--font-mono);color:var(--accent-lime);">1,000 km</span>
      </div>
      <p style="font-size:11px;color:var(--text-muted);margin-top:4px;">
        London→Paris ≈ 340km · London→NYC ≈ 5,500km
      </p>
    </div>
  `;
}

function otherForm() {
  return `
    <h3 style="font-size:15px;font-weight:600;margin-bottom:16px;">✨ Other Activity</h3>
    <div class="input-group" style="margin-bottom:16px;">
      <label class="input-label" for="other-desc">Describe what you did</label>
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <textarea id="other-desc" class="input textarea" placeholder="e.g. Spent 2 hours playing video games" rows="2" style="flex:1;"></textarea>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <span id="other-voice-status" style="font-size:11px;color:var(--text-muted);">AI will estimate the carbon footprint.</span>
      <div style="display:flex;gap:8px;align-items:center;">
        <button
          id="other-voice-btn"
          type="button"
          aria-label="Start voice input"
          title="Speak your activity"
          style="
            flex-shrink:0;
            width:36px;height:36px;
            border-radius:50%;
            background:var(--glass-bg);
            border:1.5px solid var(--border-default);
            cursor:pointer;
            display:flex;align-items:center;justify-content:center;
            font-size:16px;
            transition:all 0.2s ease;
            color:var(--text-primary);
          "
        >🎙️</button>
        <button id="other-log-btn" class="btn btn-teal btn-sm" type="button">Log via AI ✨</button>
      </div>
    </div>
  `;
}

// ── Form listeners & live CO₂ preview ──────────────────────

function setupFormListeners(container, category) {
  if (category === 'other') {
    const voiceBtn = container.querySelector('#other-voice-btn');
    const textarea = container.querySelector('#other-desc');
    const statusEl = container.querySelector('#other-voice-status');
    if (voiceBtn && textarea && statusEl) {
      setupVoiceInput(voiceBtn, textarea, statusEl, 'AI will estimate the carbon footprint.');
    }

    const btn = container.querySelector('#other-log-btn');
    if (btn) {
      btn.addEventListener('click', async () => {
        const desc = container.querySelector('#other-desc').value.trim();
        if (!desc) { toastInfo('Please describe your activity'); return; }
        
        btn.classList.add('loading');
        try {
          const { parseActivities } = await import('../ai/nlLogger.js');
          const parsed = await parseActivities(desc);
          
          if (!parsed || parsed.length === 0) {
            toastInfo('Could not parse activity. Try being more specific.');
            btn.classList.remove('loading');
            return;
          }
          
          const { error } = await saveActivities(parsed);
          if (error) { toastError('Failed to save. Please try again.'); btn.classList.remove('loading'); return; }
          
          toastSuccess('✅ Logged via AI!');
          eventBus.emit(EVENTS.ACTIVITY_LOGGED, parsed);
          
          container.querySelectorAll('.category-tile').forEach(t => t.classList.remove('active'));
          container.querySelector('#activity-form').hidden = true;
          selectedCategory = null;
          loadRecentActivities(container);
        } catch (err) {
          console.error(err);
          toastError(err.message || 'AI parsing failed.');
        }
        btn.classList.remove('loading');
      });
    }
    return;
  }

  let selectedSubtype = getDefaultSubtype(category);

  // Chip selection
  container.querySelectorAll('#activity-form .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('#activity-form .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedSubtype = chip.dataset.value;
      updatePreview(container, category, selectedSubtype);
    });
  });

  // Slider listeners
  const sliders = {
    'transport-km':  (v, el) => { el.textContent = `${v} km`; },
    'food-servings': (v, el) => { el.textContent = `${v} serving${v > 1 ? 's' : ''}`; },
    'energy-kwh':    (v, el) => { el.textContent = `${v} kWh`; },
    'shopping-qty':  (v, el) => { el.textContent = `${v} item${v > 1 ? 's' : ''}`; },
    'flight-km':     (v, el) => { el.textContent = `${Number(v).toLocaleString()} km`; },
  };

  Object.entries(sliders).forEach(([id, updater]) => {
    const slider = container.querySelector(`#${id}`);
    const display = container.querySelector(`#${id.split('-').join('-')}-display`) ||
                    container.querySelector(`#${id.replace(/-(km|servings|kwh|qty)$/, '-$1-display')}`);
    if (!slider) return;

    const dispEl = container.querySelector(
      `#${id.replace('transport-km', 'km-display')
            .replace('food-servings', 'servings-display')
            .replace('energy-kwh', 'kwh-display')
            .replace('shopping-qty', 'qty-display')
            .replace('flight-km', 'flight-km-display')}`
    );

    slider.addEventListener('input', () => {
      if (dispEl) updater(slider.value, dispEl);
      updatePreview(container, category, selectedSubtype);
    });
  });

  updatePreview(container, category, selectedSubtype);

  // Log button
  container.querySelector('#log-btn')?.addEventListener('click', async () => {
    await logCurrentActivity(container, category, selectedSubtype);
  });
}

function getDefaultSubtype(category) {
  const defaults = { transport: 'petrol_avg', food: 'meal_medium_meat', energy: 'global', shopping: 'clothing_tshirt', travel: 'economy_shorthaul' };
  return defaults[category] || '';
}

function getSliderValue(container, id, defaultVal = 0) {
  return Number(container.querySelector(`#${id}`)?.value || defaultVal);
}

function updatePreview(container, category, subtype) {
  let co2 = 0;
  const country = profile?.country || 'global';

  if (category === 'transport') co2 = calculateTransport(getSliderValue(container, 'transport-km', 10), subtype);
  if (category === 'food')      co2 = calculateFood(subtype, getSliderValue(container, 'food-servings', 1));
  if (category === 'energy')    co2 = calculateEnergy(getSliderValue(container, 'energy-kwh', 5), country);
  if (category === 'shopping')  co2 = calculateShopping(subtype, getSliderValue(container, 'shopping-qty', 1));
  if (category === 'travel')    co2 = calculateFlight(getSliderValue(container, 'flight-km', 1000), subtype);

  currentCO2 = co2;

  const preview = container.querySelector('#co2-preview');
  const valEl = container.querySelector('#preview-value');
  const humEl = container.querySelector('#preview-humanize');

  preview.hidden = false;
  if (valEl) valEl.textContent = formatCO2(co2).split(' ')[0];
  const comps = humanize(co2);
  if (humEl) humEl.textContent = comps.map(c => `${c.icon} ${c.text}`).join('  ·  ');
}

async function logCurrentActivity(container, category, subtype) {
  if (currentCO2 <= 0 && category !== 'transport') {
    toastInfo('Please select an activity first');
    return;
  }

  const btn = container.querySelector('#log-btn');
  btn.classList.add('loading');

  // Build activity object
  const activity = {
    category,
    activity: buildActivityName(category, subtype, container),
    quantity: getQuantity(category, subtype, container),
    unit: getUnit(category, subtype),
    co2_kg: Number(currentCO2.toFixed(4)),
    source: 'manual',
  };

  const { error } = await saveActivity(activity);
  btn.classList.remove('loading');

  if (error) {
    toastError('Failed to save. Please try again.');
    return;
  }

  toastSuccess(`✅ Logged! ${formatCO2(currentCO2)} CO₂`);
  eventBus.emit(EVENTS.ACTIVITY_LOGGED, activity);

  // Reset form
  container.querySelectorAll('.category-tile').forEach(t => t.classList.remove('active'));
  container.querySelector('#activity-form').hidden = true;
  container.querySelector('#co2-preview').hidden = true;
  selectedCategory = null;
  currentCO2 = 0;

  // Reload recent
  loadRecentActivities(container);
}

function buildActivityName(category, subtype, container) {
  const names = {
    transport: () => {
      const km = getSliderValue(container, 'transport-km', 10);
      const labels = { petrol_avg:'Petrol car', electric:'Electric car', hybrid:'Hybrid car', bus:'Bus', train:'Train', motorcycle:'Motorbike', cycling:'Cycling', diesel_avg:'Diesel car' };
      return `${labels[subtype] || subtype} — ${km} km`;
    },
    food:      () => ({ meal_heavy_meat:'Heavy meat meal', meal_medium_meat:'Meat meal', meal_chicken_fish:'Chicken/Fish meal', meal_vegetarian:'Vegetarian meal', meal_vegan:'Vegan meal', beef:'Beef' }[subtype] || subtype),
    energy:    () => `Electricity — ${getSliderValue(container, 'energy-kwh', 5)} kWh`,
    shopping:  () => ({ clothing_tshirt:'T-Shirt', clothing_jeans:'Jeans', clothing_jacket:'Jacket', electronics_phone:'Smartphone', electronics_laptop:'Laptop', book:'Book' }[subtype] || subtype),
    travel:    () => `Flight (${getSliderValue(container, 'flight-km', 1000).toLocaleString()} km) — ${subtype.replace('_', ' ')}`,
  };
  return (names[category] || (() => subtype))();
}

function getQuantity(category, subtype, container) {
  const map = { transport: () => getSliderValue(container,'transport-km',10), food: () => getSliderValue(container,'food-servings',1), energy: () => getSliderValue(container,'energy-kwh',5), shopping: () => getSliderValue(container,'shopping-qty',1), travel: () => getSliderValue(container,'flight-km',1000) };
  return (map[category] || (() => 1))();
}

function getUnit(category) {
  return { transport:'km', food:'serving', energy:'kWh', shopping:'item', travel:'km' }[category] || 'unit';
}

// ── Recent Activities ─────────────────────────────────────

async function loadRecentActivities(container, append = false) {
  if (!append) currentRecentPage = 0;

  const { data: activities, count } = await getActivities({ limit: RECENT_LIMIT, page: currentRecentPage });
  const listEl = container.querySelector('#recent-list');
  const loadMoreBtn = container.querySelector('#recent-load-more');
  if (!listEl) return;

  if (!append && (!activities || activities.length === 0)) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:16px;">
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-title">No activities yet</p>
        <p class="empty-state-desc">Log your first activity above</p>
      </div>
    `;
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    return;
  }

  const catIcons = { transport:'🚗', food:'🍔', energy:'⚡', shopping:'🛍️', travel:'✈️', other: '✨' };

  const html = activities.map(a => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--glass-bg);border:1px solid var(--border-subtle);border-radius:12px;margin-bottom:8px;" data-id="${a.id}">
      <span style="font-size:20px;">${catIcons[a.category] || '✨'}</span>
      <div style="flex:1;min-width:0;">
        <p style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${a.activity}</p>
        <p style="font-size:11px;color:var(--text-muted);">${new Date(a.logged_at).toLocaleDateString('en', { weekday:'short', hour:'2-digit', minute:'2-digit' })}</p>
      </div>
      <div style="text-align:right;">
        <p style="font-size:13px;font-weight:600;color:var(--accent-lime);">${formatCO2(a.co2_kg)}</p>
        <button class="delete-btn" data-id="${a.id}" aria-label="Delete activity" style="font-size:11px;color:var(--text-muted);background:none;border:none;cursor:pointer;padding:2px;">✕</button>
      </div>
    </div>
  `).join('');

  if (append) {
    listEl.insertAdjacentHTML('beforeend', html);
  } else {
    listEl.innerHTML = html;
  }

  if (loadMoreBtn) {
    const totalLoaded = (currentRecentPage + 1) * RECENT_LIMIT;
    loadMoreBtn.style.display = count > totalLoaded ? 'block' : 'none';
  }

  // Use event delegation on the listEl so appended items inherit it seamlessly
  // But wait, attaching multiple listeners to listEl when re-rendering isn't great.
  // Instead, remove the old listener (by cloning or just relying on target checks, but we need to ensure we only attach once per render cycle)
  // Actually, since we want to avoid multiple event listeners, let's just query all .delete-btn that don't have listeners.
  // Wait, the simplest way is to attach listener to newly added buttons when appending, or all when not.
  const btns = append ? Array.from(listEl.querySelectorAll('.delete-btn')).slice(-activities.length) : listEl.querySelectorAll('.delete-btn');
  btns.forEach(btn => {
    btn.addEventListener('click', async () => {
      const { error } = await deleteActivity(btn.dataset.id);
      if (error) { toastError('Could not delete'); return; }
      toastInfo('Activity removed');
      btn.closest('[data-id]').remove();
      eventBus.emit(EVENTS.ACTIVITY_DELETED, btn.dataset.id);
    });
  });
}

// ── NL Parser (AI) ───────────────────────────────────────

function setupNLParser(container) {
  const btn = container.querySelector('#nl-parse-btn');
  btn.addEventListener('click', async () => {
    const input = container.querySelector('#nl-input').value.trim();
    if (!input) { toastInfo('Type a description first'); return; }

    // Check for API key
    const { data: prof } = await getProfile();
    if (!prof?.gemini_api_key) {
      toastError('Add your Gemini API key in Settings first');
      return;
    }

    btn.classList.add('loading');

    try {
      const { parseActivities } = await import('../ai/nlLogger.js');
      const parsed = await parseActivities(input, prof.gemini_api_key);

      if (!parsed || parsed.length === 0) {
        toastInfo('Could not parse activities. Try being more specific.');
        btn.classList.remove('loading');
        return;
      }

      renderNLResults(container, parsed);
    } catch (err) {
      toastError('AI parsing failed. Check your API key in Settings.');
      console.error('[NL Parser]', err);
    }

    btn.classList.remove('loading');
  });
}

function renderNLResults(container, parsed) {
  const resultsEl = container.querySelector('#nl-results');
  const catIcons = { transport:'🚗', food:'🍔', energy:'⚡', shopping:'🛍️', travel:'✈️', other: '✨' };

  resultsEl.hidden = false;
  resultsEl.innerHTML = `
    <div class="card animate-fadeInUp" style="background:rgba(45,212,191,0.05);border-color:rgba(45,212,191,0.2);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="font-size:14px;font-weight:600;">🤖 AI parsed ${parsed.length} activit${parsed.length === 1 ? 'y' : 'ies'}</h3>
        <div style="display:flex;gap:8px;">
          <button id="nl-save-all" class="btn btn-teal btn-sm">Save All ✓</button>
          <button id="nl-discard" class="btn btn-ghost btn-sm">Discard</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${parsed.map((a, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--glass-bg);border-radius:10px;" data-index="${i}">
            <span>${catIcons[a.category] || '✨'}</span>
            <div style="flex:1;">
              <p style="font-size:13px;font-weight:500;">${a.activity}</p>
              <p style="font-size:11px;color:var(--text-muted);">${a.quantity} ${a.unit}</p>
            </div>
            <span style="font-size:13px;font-weight:600;color:var(--accent-teal);">${formatCO2(a.co2_kg)}</span>
            <button class="nl-remove-btn" data-index="${i}" aria-label="Remove" style="color:var(--text-muted);font-size:12px;">✕</button>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Remove individual items
  resultsEl.querySelectorAll('.nl-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('[data-index]').remove();
    });
  });

  // Discard all
  resultsEl.querySelector('#nl-discard').addEventListener('click', () => {
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';
  });

  // Save all
  resultsEl.querySelector('#nl-save-all').addEventListener('click', async () => {
    const remaining = [...resultsEl.querySelectorAll('[data-index]')].map(el => {
      return parsed[Number(el.dataset.index)];
    });

    if (remaining.length === 0) return;

    const saveBtn = resultsEl.querySelector('#nl-save-all');
    saveBtn.classList.add('loading');

    const { error } = await saveActivities(remaining);
    saveBtn.classList.remove('loading');

    if (error) { toastError('Save failed'); return; }

    toastSuccess(`✅ Saved ${remaining.length} activit${remaining.length === 1 ? 'y' : 'ies'}!`);
    resultsEl.hidden = true;
    container.querySelector('#nl-input').value = '';
    eventBus.emit(EVENTS.ACTIVITY_LOGGED, remaining);
    loadRecentActivities(container);
  });
}

