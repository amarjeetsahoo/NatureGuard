/**
 * NatureGuard — Dashboard View
 * The home screen. Shows CO₂ totals, charts, score ring, and streaks.
 */

import { getWeekActivities, getMonthActivities, getTodayActivities, getProfile } from '../modules/db.js';
import {
  totalCO2, breakdownByCategory, getDailyTotals, getBenchmark, vsAverage,
} from '../modules/calculator.js';
import { calculateScore, getGrade, getScoreColor, ringOffset, getScoreLabel } from '../modules/score.js';
import { formatCO2, humanize, treesEquivalent } from '../modules/humanizer.js';
import { router } from '../router.js';

const CATEGORY_META = {
  transport: { icon: '🚗', label: 'Transport', color: '#F59E0B' },
  food:      { icon: '🍔', label: 'Food',      color: '#A3E635' },
  energy:    { icon: '⚡', label: 'Energy',    color: '#2DD4BF' },
  shopping:  { icon: '🛍️', label: 'Shopping',  color: '#A78BFA' },
  travel:    { icon: '✈️', label: 'Travel',    color: '#F87171' },
};

export async function render(container) {
  container.innerHTML = `
    <div class="view" id="dashboard-view">
      <div class="view-header">
        <div>
          <p class="view-greeting" id="dash-greeting">Loading...</p>
          <h1 class="view-title">Your Footprint</h1>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div class="period-toggle" role="group" aria-label="Time period">
            <button class="period-btn active" data-period="week"  aria-pressed="true">Week</button>
            <button class="period-btn"        data-period="month" aria-pressed="false">Month</button>
            <button class="period-btn"        data-period="today" aria-pressed="false">Today</button>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid stagger-children" id="stats-grid">
        ${skeletonStatCard()} ${skeletonStatCard()} ${skeletonStatCard()} ${skeletonStatCard()}
      </div>

      <!-- Score Ring + Main Chart -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;margin-bottom:16px;" id="main-charts">
        <!-- Score Ring -->
        <div class="card score-ring-container" style="min-width:180px;">
          <p style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Eco Score</p>
          <div class="score-ring-wrap" id="score-ring-wrap">
            <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
              <circle cx="70" cy="70" r="45" fill="none" stroke="var(--bg-elevated)" stroke-width="10"/>
              <circle
                id="score-ring-fill"
                cx="70" cy="70" r="45"
                fill="none"
                stroke="var(--accent-lime)"
                stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="283"
                stroke-dashoffset="283"
                style="transition: stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.5s ease;"
              />
            </svg>
            <div class="score-ring-center">
              <span class="score-number" id="score-number" style="color:var(--accent-lime);">—</span>
              <span class="score-grade"  id="score-grade">—</span>
            </div>
          </div>
          <p id="score-label" style="font-size:12px;color:var(--text-muted);text-align:center;max-width:140px;">—</p>
        </div>

        <!-- Category Donut -->
        <div class="card chart-card" style="padding:20px;">
          <div class="chart-card-header">
            <h2 class="chart-card-title">By Category</h2>
          </div>
          <canvas id="donut-chart" height="160" aria-label="CO₂ breakdown by category"></canvas>
        </div>
      </div>

      <!-- Weekly Trend -->
      <div class="card chart-card" style="margin-bottom:16px;">
        <div class="chart-card-header">
          <h2 class="chart-card-title">Daily Trend</h2>
          <span id="trend-delta" class="badge badge-lime">—</span>
        </div>
        <canvas id="trend-chart" height="120" aria-label="Daily CO₂ trend chart"></canvas>
      </div>

      <!-- Breakdown list -->
      <div class="card" style="margin-bottom:16px;">
        <h2 style="font-size:15px;font-weight:600;margin-bottom:16px;">Category Breakdown</h2>
        <div id="breakdown-list" style="display:flex;flex-direction:column;gap:12px;">
          <div class="skeleton skeleton-text" style="height:40px;border-radius:8px;"></div>
          <div class="skeleton skeleton-text" style="height:40px;border-radius:8px;"></div>
          <div class="skeleton skeleton-text" style="height:40px;border-radius:8px;"></div>
        </div>
      </div>

      <!-- Quick Log FAB -->
      <button
        id="quick-log-fab"
        class="btn btn-primary"
        aria-label="Log new activity"
        style="position:fixed;bottom:calc(var(--nav-height)+20px);right:20px;width:56px;height:56px;border-radius:50%;padding:0;font-size:24px;box-shadow:var(--shadow-glow-lime);z-index:50;"
      >➕</button>
    </div>
  `;

  // Wire period toggle
  let currentPeriod = 'week';
  container.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.period-btn').forEach(b => {
        b.classList.remove('active');
        b.ariaPressed = 'false';
      });
      btn.classList.add('active');
      btn.ariaPressed = 'true';
      currentPeriod = btn.dataset.period;
      loadData(container, currentPeriod);
    });
  });

  // Quick log FAB
  container.querySelector('#quick-log-fab').addEventListener('click', () => {
    router.navigate('#log');
  });

  // Load initial data
  await loadData(container, 'week');
}

async function loadData(container, period) {
  // Set greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Good morning' : hour < 17 ? '🌤️ Good afternoon' : '🌙 Good evening';
  const greetingEl = container.querySelector('#dash-greeting');
  if (greetingEl) greetingEl.textContent = greeting;

  // Fetch activities based on period
  let activitiesResult;
  if (period === 'today') activitiesResult = await getTodayActivities();
  else if (period === 'month') activitiesResult = await getMonthActivities();
  else activitiesResult = await getWeekActivities();

  const activities = activitiesResult.data || [];

  // Fetch profile for country/settings
  const { data: profile } = await getProfile();
  const country = profile?.country || 'global';

  // Calculate totals
  const total = totalCO2(activities);
  const breakdown = breakdownByCategory(activities);
  const score = calculateScore(period === 'month' ? total / 4 : total, country);
  const grade = getGrade(score);
  const scoreColor = getScoreColor(score);
  const benchmark = getBenchmark(country);
  const vsAvg = vsAverage(period === 'month' ? total / 4 : total, country);
  const comps = humanize(total);

  // Render stats
  renderStats(container, { total, score, vsAvg, benchmark, period, comps, activities });

  // Render score ring
  renderScoreRing(container, score, grade, scoreColor);

  // Render charts
  await renderCharts(container, breakdown, activities, period);

  // Render breakdown list
  renderBreakdown(container, breakdown, total);
}

function renderStats(container, { total, score, vsAvg, benchmark, period, comps, activities }) {
  const periodLabel = period === 'today' ? "Today's" : period === 'week' ? "This Week's" : "This Month's";
  const avgWeekly = benchmark;

  const deltaVsAvg = vsAvg - 100;
  const deltaIcon = deltaVsAvg <= 0 ? '↓' : '↑';
  const deltaClass = deltaVsAvg <= 0 ? 'down' : 'up';
  const deltaText = `${Math.abs(deltaVsAvg).toFixed(0)}% vs avg`;

  container.querySelector('#stats-grid').innerHTML = `
    <div class="card stat-card animate-fadeInUp">
      <span class="stat-label">${periodLabel} CO₂</span>
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span class="stat-value">${formatCO2(total).split(' ')[0]}</span>
        <span class="stat-unit">${formatCO2(total).split(' ')[1] || 'kg'}</span>
      </div>
      <span class="stat-delta ${deltaClass}">
        ${deltaIcon} ${deltaText}
      </span>
    </div>

    <div class="card stat-card animate-fadeInUp" style="animation-delay:80ms;">
      <span class="stat-label">Eco Score</span>
      <div style="display:flex;align-items:baseline;gap:4px;">
        <span class="stat-value" style="color:${getScoreColor(score)};">${score}</span>
        <span class="stat-unit">/ 100</span>
      </div>
      <span style="font-size:11px;color:var(--text-muted);">${getGrade(score)} grade</span>
    </div>

    <div class="card stat-card animate-fadeInUp" style="animation-delay:160ms;">
      <span class="stat-label">Activities</span>
      <span class="stat-value">${activities.length}</span>
      <span style="font-size:11px;color:var(--text-muted);">logged ${period === 'today' ? 'today' : `this ${period}`}</span>
    </div>

    <div class="card stat-card animate-fadeInUp" style="animation-delay:240ms;">
      <span class="stat-label">Equivalent to</span>
      <span style="font-size:13px;font-weight:500;color:var(--text-primary);margin-top:4px;">
        ${comps[0]?.icon} ${comps[0]?.text || '—'}
      </span>
    </div>
  `;
}

function renderScoreRing(container, score, grade, color) {
  const ringFill = container.querySelector('#score-ring-fill');
  const numberEl = container.querySelector('#score-number');
  const gradeEl = container.querySelector('#score-grade');
  const labelEl = container.querySelector('#score-label');

  if (ringFill) {
    ringFill.style.stroke = color;
    // Animate after paint
    requestAnimationFrame(() => {
      ringFill.style.strokeDashoffset = ringOffset(score);
    });
  }
  if (numberEl) { numberEl.textContent = score; numberEl.style.color = color; }
  if (gradeEl)  gradeEl.textContent = grade;
  if (labelEl)  labelEl.textContent = getScoreLabel(score);
}

async function renderCharts(container, breakdown, activities, period) {
  // Lazy-load Chart.js
  const { Chart } = await import('chart.js/auto');

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
  };

  const categories = Object.keys(breakdown);
  const colors = categories.map(c => CATEGORY_META[c]?.color || '#888');
  const values = categories.map(c => breakdown[c]);

  // Donut chart
  const donutCanvas = container.querySelector('#donut-chart');
  if (donutCanvas) {
    if (donutCanvas._chart) donutCanvas._chart.destroy();
    donutCanvas._chart = new Chart(donutCanvas, {
      type: 'doughnut',
      data: {
        labels: categories.map(c => CATEGORY_META[c]?.label),
        datasets: [{ data: values, backgroundColor: colors, borderColor: 'var(--bg-base)', borderWidth: 3 }],
      },
      options: {
        ...chartDefaults,
        cutout: '70%',
        plugins: {
          legend: {
            display: true,
            position: 'right',
            labels: { color: 'rgba(240,253,244,0.7)', boxWidth: 12, padding: 8, font: { size: 11 } },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${formatCO2(ctx.raw)}  (${ctx.label})`,
            },
          },
        },
      },
    });
  }

  // Trend line chart
  const days = period === 'today' ? 1 : period === 'month' ? 30 : 7;
  const dailyData = getDailyTotals(activities, Math.min(days, 14));

  const trendCanvas = container.querySelector('#trend-chart');
  if (trendCanvas) {
    if (trendCanvas._chart) trendCanvas._chart.destroy();
    trendCanvas._chart = new Chart(trendCanvas, {
      type: 'line',
      data: {
        labels: dailyData.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
        }),
        datasets: [{
          data: dailyData.map(d => d.co2_kg),
          borderColor: '#A3E635',
          backgroundColor: 'rgba(163,230,53,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#A3E635',
          pointRadius: 4,
        }],
      },
      options: {
        ...chartDefaults,
        scales: {
          x: { ticks: { color: 'rgba(240,253,244,0.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { ticks: { color: 'rgba(240,253,244,0.4)', font: { size: 10 }, callback: v => `${v}kg` }, grid: { color: 'rgba(255,255,255,0.04)' } },
        },
        plugins: {
          ...chartDefaults.plugins,
          tooltip: { callbacks: { label: ctx => ` ${formatCO2(ctx.raw)}` } },
        },
      },
    });
  }
}

function renderBreakdown(container, breakdown, total) {
  const breakdownEl = container.querySelector('#breakdown-list');
  if (!breakdownEl) return;

  const sorted = Object.entries(breakdown)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    breakdownEl.innerHTML = `
      <div class="empty-state" style="padding:24px;">
        <div class="empty-state-icon">📋</div>
        <p class="empty-state-title">No activities yet</p>
        <p class="empty-state-desc">Tap ➕ to log your first activity</p>
      </div>
    `;
    return;
  }

  breakdownEl.innerHTML = sorted.map(([cat, val]) => {
    const meta = CATEGORY_META[cat];
    const pct = total > 0 ? (val / total) * 100 : 0;
    return `
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="category-icon cat-${cat}">${meta.icon}</div>
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;font-weight:500;">${meta.label}</span>
            <span style="font-size:13px;color:var(--text-secondary);">${formatCO2(val)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width:${pct}%;background:${meta.color};"></div>
          </div>
        </div>
        <span style="font-size:11px;color:var(--text-muted);min-width:36px;text-align:right;">${pct.toFixed(0)}%</span>
      </div>
    `;
  }).join('');
}

function skeletonStatCard() {
  return `
    <div class="card stat-card">
      <div class="skeleton skeleton-text-sm" style="width:60%;margin-bottom:8px;"></div>
      <div class="skeleton skeleton-title" style="width:80%;margin-bottom:8px;"></div>
      <div class="skeleton skeleton-text-sm" style="width:50%;"></div>
    </div>
  `;
}
