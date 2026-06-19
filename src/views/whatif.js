/**
 * NatureGuard — What-If Simulator View
 * Allows users to test hypothetical scenarios and see the projected impact.
 */

import { $, $$ } from '../utils/dom.js';
import { simulateScenario } from '../ai/whatif.js';
import { getProfile } from '../modules/db.js';
import { calculateTransport, calculateFood } from '../modules/calculator.js';
import { formatCO2 } from '../modules/humanizer.js';
import { toastError } from '../utils/toast.js';
import { setupVoiceInput } from '../utils/voice.js';

export async function render(container) {
  const { data: profile } = await getProfile();

  container.innerHTML = `
    <div class="view" id="whatif-view">
      <header class="view-header">
        <h1 class="view-title">What-If Simulator</h1>
        <p style="font-size:13px; color:var(--text-muted);">Explore how small changes impact your footprint</p>
      </header>

      <div class="card" style="margin-bottom:24px; border:1px solid rgba(163,230,53,0.3);">
        <h3 style="font-size:15px; font-weight:600; margin-bottom:12px;">Hypothesis</h3>
        <form id="whatif-form" style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <textarea id="scenario-input" class="input textarea" placeholder="e.g. What if I switch to an electric car for my 20km commute?" rows="3"></textarea>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:-4px;">
            <span id="whatif-voice-status" style="font-size:11px;color:var(--text-muted);">AI will simulate the scenario.</span>
            <button
              id="whatif-voice-btn"
              type="button"
              aria-label="Start voice input"
              title="Speak your scenario"
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
          </div>
          <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:4px;" class="scroll-hide">
            <button type="button" class="chip suggestion" data-text="What if I ate a vegan diet for 7 days?">Vegan Diet</button>
            <button type="button" class="chip suggestion" data-text="What if I take the bus for 15km instead of driving?">Take the Bus</button>
            <button type="button" class="chip suggestion" data-text="What if I replace 10 lightbulbs with LEDs?">LED Bulbs</button>
          </div>
          <button type="submit" class="btn btn-primary" id="simulate-btn">Simulate Impact ✨</button>
        </form>
      </div>

      <div id="results-area" hidden>
        <!-- Rendered results go here -->
      </div>
    </div>
  `;

  const form = container.querySelector('#whatif-form');
  const input = container.querySelector('#scenario-input');
  const btn = container.querySelector('#simulate-btn');
  const resultsArea = container.querySelector('#results-area');
  const voiceBtn = container.querySelector('#whatif-voice-btn');
  const voiceStatus = container.querySelector('#whatif-voice-status');

  setupVoiceInput(voiceBtn, input, voiceStatus, 'AI will simulate the scenario.');

  container.querySelectorAll('.suggestion').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.dataset.text;
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    btn.classList.add('loading');
    resultsArea.hidden = true;

    try {
      const result = await simulateScenario(text);
      renderResults(resultsArea, result, profile);
    } catch (err) {
      toastError(err.message || "Failed to simulate scenario.");
      console.error(err);
    } finally {
      btn.classList.remove('loading');
    }
  });
}

function renderResults(container, result, profile) {
  // Try to calculate a baseline for comparison
  let baselineCO2 = null;
  let baselineLabel = "Your Baseline";

  if (result.category === 'transport' && profile?.vehicle_type && profile?.commute_km) {
    // If scenario is transport, compare against their normal vehicle for the SAME distance as the scenario
    baselineCO2 = calculateTransport(result.new_value, profile.vehicle_type);
    baselineLabel = `Your ${profile.vehicle_type.replace('_avg','')} car (${result.new_value} km)`;
  } else if (result.category === 'food' && profile?.diet_type) {
    baselineCO2 = calculateFood(profile.diet_type, result.new_value);
    baselineLabel = `Your ${profile.diet_type.replace('meal_','')} diet (${result.new_value} meals)`;
  }

  const isBetter = baselineCO2 !== null && result.projectedCO2 < baselineCO2;
  const difference = baselineCO2 !== null ? Math.abs(baselineCO2 - result.projectedCO2) : null;

  container.innerHTML = `
    <h3 style="font-size:15px; font-weight:600; margin-bottom:16px;">Simulation Results</h3>
    
    <div style="display:grid; grid-template-columns:1fr; gap:16px;">
      
      <div class="card animate-fadeInUp" style="background:var(--glass-bg); text-align:center;">
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:8px;">New Scenario</p>
        <p style="font-size:14px; font-weight:500; margin-bottom:16px; color:var(--text-primary);">${result.description}</p>
        <div style="font-size:32px; font-weight:700; color:var(--accent-teal); font-family:var(--font-mono);">
          ${formatCO2(result.projectedCO2)}
        </div>
      </div>

      ${baselineCO2 !== null ? `
        <div class="card animate-fadeInUp" style="animation-delay:100ms; background:var(--glass-bg);">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <p style="font-size:13px; color:var(--text-muted); margin-bottom:4px;">${baselineLabel}</p>
              <div style="font-size:20px; font-weight:600; color:var(--text-primary); font-family:var(--font-mono);">
                ${formatCO2(baselineCO2)}
              </div>
            </div>
            <div style="text-align:right;">
              <div class="badge ${isBetter ? 'badge-teal' : 'badge-red'}" style="font-size:14px; padding:6px 10px;">
                ${isBetter ? '▼' : '▲'} ${formatCO2(difference)}
              </div>
              <p style="font-size:10px; color:var(--text-muted); margin-top:4px;">vs. Baseline</p>
            </div>
          </div>
        </div>
      ` : ''}
      
    </div>
  `;

  container.hidden = false;
}
