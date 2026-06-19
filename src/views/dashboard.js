/**
 * NatureGuard — Dashboard View
 * The home screen. Shows CO₂ totals, charts, score ring, and streaks.
 */

import { getWeekActivities, getMonthActivities, getTodayActivities, getProfile, getPriorPeriodActivities } from '../modules/db.js';
import {
  totalCO2, breakdownByCategory, getDailyTotals, getBenchmark, vsAverage,
} from '../modules/calculator.js';
import { calculateScore, getGrade, getScoreColor, ringOffset, getScoreLabel } from '../modules/score.js';
import { formatCO2, humanize, treesEquivalent } from '../modules/humanizer.js';
import { router } from '../router.js';
import { BADGES } from '../modules/rewards.js';
import { eventBus, EVENTS } from '../modules/eventBus.js';
import { showLoader, hideLoader } from '../utils/loader.js';

const CATEGORY_META = {
  transport: { icon: '🚗', label: 'Transport', color: '#F59E0B' },
  food:      { icon: '🍔', label: 'Food',      color: '#A3E635' },
  energy:    { icon: '⚡', label: 'Energy',    color: '#2DD4BF' },
  shopping:  { icon: '🛍️', label: 'Shopping',  color: '#A78BFA' },
  travel:    { icon: '✈️', label: 'Travel',    color: '#F87171' },
  other:     { icon: '✨', label: 'Other',     color: '#9CA3AF' },
};

export async function render(container) {
  container.innerHTML = `
    <div class="view" id="dashboard-view">
      <div class="dashboard-header">
        <div>
          <p class="view-greeting" id="dash-greeting">Loading...</p>
          <h1 class="view-title" style="margin:0;">Your Footprint</h1>
        </div>
        <div class="dashboard-controls">
          <div class="period-toggle" role="group" aria-label="Time period">
            <button class="period-btn active" data-period="week"  aria-pressed="true">Week</button>
            <button class="period-btn"        data-period="month" aria-pressed="false">Month</button>
            <button class="period-btn"        data-period="today" aria-pressed="false">Today</button>
          </div>
          <button id="btn-share" class="btn btn-secondary" style="padding:6px 12px;font-size:13px;border-radius:20px;" aria-label="Share Dashboard">Share 📸</button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid stagger-children" id="stats-grid">
        ${skeletonStatCard()} ${skeletonStatCard()} ${skeletonStatCard()} ${skeletonStatCard()}
      </div>

      <!-- Score Ring + Main Chart -->
      <div class="dashboard-charts" id="main-charts">
        <!-- Score Ring -->
        <div class="card score-ring-container" style="min-width:180px; justify-content:center;">
          <p style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;">Eco Score</p>
          <div class="score-ring-wrap" id="score-ring-wrap">
            <svg width="100%" height="100%" viewBox="0 0 140 140" aria-hidden="true">
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
        <div class="card chart-card" style="padding:20px; display:flex; flex-direction:column;">
          <div class="chart-card-header">
            <h2 class="chart-card-title">By Category</h2>
          </div>
          <div style="position:relative; width:100%; height:230px; margin:auto 0;">
            <div id="donut-chart" style="width:100%; height:100%;"></div>
          </div>
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

      <!-- Streak & Badges -->
      <div class="card" id="streak-card" style="margin-bottom:16px;">
        <div class="skeleton skeleton-text" style="height:60px;border-radius:8px;"></div>
      </div>

    </div>
    <button
      id="quick-log-fab"
      class="btn btn-primary"
      aria-label="Log new activity"
    >➕</button>
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

  // Share Dashboard (Certificate Generation)
  container.querySelector('#btn-share').addEventListener('click', async () => {
    const btn = container.querySelector('#btn-share');
    btn.disabled = true;
    const oldText = btn.textContent;
    btn.textContent = 'Generating...';
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const stats = container._currentStats;
      if (!stats) throw new Error('Data not loaded');

      // Create a beautiful, solid-color certificate node
      const certNode = document.createElement('div');
      certNode.style.position = 'absolute';
      certNode.style.left = '-9999px';
      certNode.style.top = '-9999px';
      certNode.style.width = '800px';
      certNode.style.background = '#09100C'; // Solid dark mode background
      certNode.style.color = '#F4F9F5';
      certNode.style.fontFamily = 'Inter, sans-serif';
      certNode.style.padding = '60px';
      certNode.style.boxSizing = 'border-box';
      
      const userName = stats.profile?.display_name || 'Climate Champion';
      const scoreColor = stats.score >= 80 ? '#A3E635' : stats.score >= 60 ? '#FBBF24' : '#F87171';
      
      // Get recent badges
      const badgesUnlocked = Array.isArray(stats.profile?.badges) ? stats.profile.badges : [];
      const recentBadges = badgesUnlocked.slice(-3).reverse().map(b => {
        const badgeId = typeof b === 'string' ? b : (b.key || b.id);
        return BADGES[badgeId];
      }).filter(Boolean);

      const badgesHtml = recentBadges.length > 0 ? `
        <div style="margin-top: 30px; text-align: center;">
          <p style="font-size:13px; color:#9ca3af; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 16px 0;">Recent Achievements</p>
          <div style="display:flex; justify-content:center; gap:24px;">
            ${recentBadges.map(b => `
              <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:20px; padding:16px; width:110px; text-align:center; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">
                <div style="font-size:36px; margin-bottom:12px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">${b.icon}</div>
                <div style="font-size:12px; color:#d1d5db; font-weight:600; line-height:1.3;">${b.title}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      certNode.innerHTML = `
        <div style="position: relative; overflow: hidden; border: 1px solid rgba(163, 230, 53, 0.25); border-radius: 32px; padding: 50px; background: rgba(255,255,255,0.02); backdrop-filter: blur(12px); box-shadow: inset 0 0 60px rgba(163, 230, 53, 0.05), 0 20px 40px rgba(0,0,0,0.4);">
          <!-- Decorative Background Elements -->
          <div style="position:absolute; top:-80px; right:-80px; width:250px; height:250px; background:radial-gradient(circle, rgba(163, 230, 53, 0.15) 0%, transparent 70%); border-radius:50%; z-index:0;"></div>
          <div style="position:absolute; bottom:-100px; left:-80px; width:350px; height:350px; background:radial-gradient(circle, rgba(45, 212, 191, 0.1) 0%, transparent 70%); border-radius:50%; z-index:0;"></div>
          
          <div style="position: relative; z-index: 1;">
            <!-- Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:40px;">
              <div style="display:flex; align-items:center; gap:12px; font-size:28px; font-weight:800; letter-spacing:-0.5px;">
                <span style="color: #A3E635;">🌿 NatureGuard</span>
              </div>
              <div style="font-size:12px; color:#9ca3af; font-family:'JetBrains Mono', monospace; border:1px solid rgba(255,255,255,0.1); padding:6px 14px; border-radius:999px; background:rgba(0,0,0,0.3); letter-spacing: 0.5px;">
                VERIFIED ECO-REPORT
              </div>
            </div>

            <!-- Title -->
            <div style="text-align:center; margin-bottom: 50px;">
              <h1 style="font-size:54px; font-family:'DM Serif Display', serif; margin:0 0 12px 0; color: #F4F9F5;">Sustainability Certificate</h1>
              <p style="font-size:20px; color:#9ca3af; margin:0; font-weight:400;">Proudly awarded to <strong style="color:#A3E635; font-weight:600;">${userName}</strong></p>
            </div>

            <!-- Metrics Grid -->
            <div style="display:flex; justify-content:space-between; margin-bottom:40px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 24px; padding: 32px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2);">
              <div style="flex:1; text-align:center;">
                <p style="font-size:13px; color:#9ca3af; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 12px 0;">Eco Score</p>
                <div style="display:flex; align-items:baseline; justify-content:center; gap:4px;">
                  <span style="font-size:56px; font-family:'DM Serif Display', serif; color:${scoreColor}; line-height:1;">${stats.score}</span>
                  <span style="font-size:20px; color:#6b7280;">/100</span>
                </div>
                <div style="display:inline-block; margin-top:24px; padding:4px 16px; background:rgba(255,255,255,0.05); border-radius:999px; font-size:14px; color:#d1d5db; font-weight:600;">Grade: ${stats.grade}</div>
              </div>
              
              <div style="width:1px; background:linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent);"></div>
              
              <div style="flex:1; text-align:center;">
                <p style="font-size:13px; color:#9ca3af; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 12px 0;">Footprint</p>
                <div style="display:flex; align-items:baseline; justify-content:center; gap:4px;">
                  <span style="font-size:56px; font-family:'DM Serif Display', serif; color:#F4F9F5; line-height:1;">${stats.total.toFixed(1)}</span>
                  <span style="font-size:20px; color:#6b7280;">kg</span>
                </div>
                <div style="display:inline-block; margin-top:24px; font-size:14px; color:#d1d5db;">This ${stats.period}</div>
              </div>
              
              <div style="width:1px; background:linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent);"></div>
              
              <div style="flex:1; text-align:center;">
                <p style="font-size:13px; color:#9ca3af; text-transform:uppercase; letter-spacing:1.5px; margin:0 0 12px 0;">Streak</p>
                <div style="display:flex; align-items:baseline; justify-content:center; gap:4px;">
                  <span style="font-size:56px; font-family:'DM Serif Display', serif; color:#F59E0B; line-height:1;">${stats.profile?.current_streak || 0}</span>
                </div>
                <div style="display:inline-block; margin-top:24px; font-size:14px; color:#d1d5db; font-weight:600;">Days 🔥</div>
              </div>
            </div>

            ${badgesHtml}

            <!-- Footer Message -->
            <div style="text-align:center; padding-top:30px; margin-top:40px; border-top: 1px solid rgba(255,255,255,0.05);">
              <p style="font-size:22px; font-family:'DM Serif Display', serif; font-style:italic; color:#A3E635; margin:0 0 16px 0; letter-spacing: 0.5px;">
                "Taking action for a greener tomorrow."
              </p>
              <div style="display:flex; align-items:center; justify-content:center; gap:12px;">
                <span style="width:6px; height:6px; background:#A3E635; border-radius:50%; opacity:0.5;"></span>
                <span style="font-size:12px; color:#6b7280; font-family:'JetBrains Mono', monospace; letter-spacing:1px;">GENERATED ${new Date().toLocaleDateString()}</span>
                <span style="width:6px; height:6px; background:#A3E635; border-radius:50%; opacity:0.5;"></span>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(certNode);
      
      const canvas = await html2canvas(certNode, {
        backgroundColor: '#09100C',
        scale: 2,
        logging: false
      });
      
      // Cleanup node immediately
      document.body.removeChild(certNode);
      
      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Canvas conversion failed');
        
        try {
          // Try to copy to clipboard (works on modern desktop browsers)
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          
          import('../utils/toast.js').then(({ toastSuccess }) => {
            toastSuccess('Certificate copied to clipboard! 📸');
          });
        } catch (clipErr) {
          console.warn('Clipboard write failed, falling back to download', clipErr);
          // Fallback to download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `natureguard-certificate-${new Date().toISOString().split('T')[0]}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          import('../utils/toast.js').then(({ toastSuccess }) => {
            toastSuccess('Certificate saved as image! 📸');
          });
        }
      }, 'image/png');
      
    } catch (err) {
      console.error('Error generating certificate', err);
      import('../utils/toast.js').then(({ toastError }) => {
        toastError('Failed to capture certificate.');
      });
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  });


  // Load initial data
  await loadData(container, 'week');

  // Live streak updates (unsubscribe handle stored so router cleanup works)
  container._unsubStreak = setupStreakListener(container);
}

async function loadData(container, period) {
  // Set greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Good morning' : hour < 17 ? '🌤️ Good afternoon' : '🌙 Good evening';
  const greetingEl = container.querySelector('#dash-greeting');
  if (greetingEl) greetingEl.textContent = greeting;

  // Fetch current + prior period activities in parallel
  showLoader();
  let activitiesResult, priorResult;
  try {
    if (period === 'today') {
      [activitiesResult, priorResult] = await Promise.all([getTodayActivities(), getPriorPeriodActivities('today')]);
    } else if (period === 'month') {
      [activitiesResult, priorResult] = await Promise.all([getMonthActivities(), getPriorPeriodActivities('month')]);
    } else {
      [activitiesResult, priorResult] = await Promise.all([getWeekActivities(), getPriorPeriodActivities('week')]);
    }
  } finally {
    hideLoader();
  }

  const activities  = activitiesResult.data || [];
  const priorActivities = priorResult?.data || [];

  // Fetch profile for country/settings
  const { data: profile } = await getProfile();
  const country = profile?.country || 'global';

  // Calculate totals
  const total      = totalCO2(activities);
  const priorTotal = totalCO2(priorActivities);
  const breakdown  = breakdownByCategory(activities);
  const score      = calculateScore(period === 'month' ? total / 4 : total, country);
  const grade      = getGrade(score);
  const scoreColor = getScoreColor(score);
  const benchmark  = getBenchmark(country);
  const vsAvg      = vsAverage(period === 'month' ? total / 4 : total, country);
  const comps      = humanize(total);

  // Compute period-over-period delta
  // positive delta = more CO2 than prior (bad), negative = less (good)
  let periodDelta = null;
  if (priorTotal > 0) {
    periodDelta = ((total - priorTotal) / priorTotal) * 100;
  }

  // Save stats for certificate generation
  container._currentStats = { total, score, grade, vsAvg, benchmark, period, comps, activities, periodDelta, profile };

  // Render stats
  renderStats(container, { total, score, vsAvg, benchmark, period, comps, activities, periodDelta });

  // Render score ring
  renderScoreRing(container, score, grade, scoreColor);

  // Render charts (pass priorActivities for the trend delta badge)
  await renderCharts(container, breakdown, activities, period, periodDelta);

  // Render breakdown list
  renderBreakdown(container, breakdown, total);

  // Render streak card
  renderStreakCard(container, profile);
}

function renderStats(container, { total, score, vsAvg, benchmark, period, comps, activities, periodDelta }) {
  const periodLabel = period === 'today' ? "Today's" : period === 'week' ? "This Week's" : "This Month's";
  const priorLabel  = period === 'today' ? 'vs yesterday' : period === 'week' ? 'vs last week' : 'vs last month';

  // Period-over-period delta (preferred — actual data comparison)
  let deltaIcon, deltaClass, deltaText;
  if (periodDelta !== null) {
    deltaIcon  = periodDelta <= 0 ? '↓' : '↑';
    deltaClass = periodDelta <= 0 ? 'down' : 'up';
    deltaText  = `${Math.abs(periodDelta).toFixed(0)}% ${priorLabel}`;
  } else {
    // Fallback: vs global average (first period, no prior data)
    const deltaVsAvg = vsAvg - 100;
    deltaIcon  = deltaVsAvg <= 0 ? '↓' : '↑';
    deltaClass = deltaVsAvg <= 0 ? 'down' : 'up';
    deltaText  = `${Math.abs(deltaVsAvg).toFixed(0)}% vs avg`;
  }

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

async function renderCharts(container, breakdown, activities, period, periodDelta = null) {
  // Lazy-load Chart.js
  const { Chart } = await import('chart.js/auto');

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
  };

  const categories = Object.keys(breakdown);
  const hcData = categories.map(c => ({
    name: CATEGORY_META[c]?.label,
    y: breakdown[c],
    color: CATEGORY_META[c]?.color
  }));

  // 3D Donut chart (Highcharts)
  const donutContainer = container.querySelector('#donut-chart');
  if (donutContainer && window.Highcharts) {
    window.Highcharts.chart(donutContainer, {
      chart: {
        type: 'pie',
        backgroundColor: 'transparent',
        options3d: {
          enabled: true,
          alpha: 45,
          beta: 0
        }
      },
      title: { text: null },
      tooltip: {
        pointFormat: '{series.name}: <b>{point.y:.1f}kg</b> ({point.percentage:.1f}%)',
        backgroundColor: 'rgba(9,16,12,0.9)',
        style: { color: '#F4F9F5' },
        borderColor: 'var(--border-subtle)'
      },
      plotOptions: {
        pie: {
          allowPointSelect: true,
          cursor: 'pointer',
          depth: 35,
          innerSize: '50%',
          dataLabels: { enabled: false },
          showInLegend: true,
          states: {
            inactive: {
              opacity: 0.05 // Drops opacity of non-hovered slices to 5%
            },
            hover: {
              brightness: 0.1 // Slight highlight on hovered slice
            }
          }
        }
      },
      legend: {
        itemStyle: { color: 'var(--text-secondary)', fontWeight: '500' },
        itemHoverStyle: { color: 'var(--text-primary)' },
        align: 'right',
        verticalAlign: 'middle',
        layout: 'vertical'
      },
      credits: { enabled: false },
      series: [{
        name: 'CO₂',
        data: hcData
      }]
    });
  }

  // Trend line chart — use full period days
  const days = period === 'today' ? 1 : period === 'month' ? 30 : 7;
  const dailyData = getDailyTotals(activities, days);

  // Render trend-delta badge
  const trendDeltaEl = container.querySelector('#trend-delta');
  if (trendDeltaEl) {
    if (periodDelta !== null) {
      const isGood = periodDelta <= 0;
      trendDeltaEl.textContent = `${isGood ? '↓' : '↑'} ${Math.abs(periodDelta).toFixed(0)}%`;
      trendDeltaEl.className   = `badge ${isGood ? 'badge-lime' : 'badge-red'}`;
      trendDeltaEl.title       = `${isGood ? 'Less' : 'More'} CO₂ than prior ${period === 'today' ? 'day' : period}`;
    } else {
      trendDeltaEl.textContent = 'No prior data';
      trendDeltaEl.className   = 'badge badge-muted';
    }
  }

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

// ── Streak & Badges Card ──────────────────────────────────────────────────────

function renderStreakCard(container, profile) {
  const card = container.querySelector('#streak-card');
  if (!card) return;

  const streak  = profile?.current_streak  || 0;
  const longest = profile?.longest_streak  || 0;
  const badges  = profile?.badges          || [];

  // Build badge icons from defs (show which are earned vs locked)
  console.log("DASHBOARD RENDER - profile.badges:", profile?.badges);
  const badgeHTML = Object.values(BADGES).map(def => {
    const earned = badges.find(b => typeof b === 'string' ? b === def.id : (b && (b.key === def.id || b.id === def.id)));
    console.log("Badge def.id:", def.id, "earned:", !!earned);
    return `
      <div
        title="${def.title}: ${def.desc}"
        style="
          display:flex;flex-direction:column;align-items:center;gap:4px;
          opacity:${earned ? '1' : '0.25'};
          transition:opacity 0.3s;
          cursor:default;
        "
      >
        <span style="font-size:22px;">${def.icon}</span>
        <span style="font-size:9px;color:var(--text-muted);text-align:center;max-width:44px;line-height:1.2;">${def.title}</span>
      </div>
    `;
  }).join('');

  card.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <h2 style="font-size:15px;font-weight:600;">Streak & Badges</h2>
      ${streak > 0 ? `<span class="badge badge-amber">🔥 ${streak} day${streak !== 1 ? 's' : ''}</span>` : ''}
    </div>

    <!-- Streak stats -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div style="text-align:center;padding:12px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:12px;">
        <div style="font-family:var(--font-display);font-size:28px;color:var(--accent-amber);line-height:1;">${streak}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:.05em;">Current 🔥</div>
      </div>
      <div style="text-align:center;padding:12px;background:rgba(167,139,250,0.08);border:1px solid rgba(167,139,250,0.2);border-radius:12px;">
        <div style="font-family:var(--font-display);font-size:28px;color:var(--accent-purple);line-height:1;">${longest}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:.05em;">Best 🏆</div>
      </div>
    </div>

    <!-- Badges row -->
    <div style="display:flex;gap:16px;justify-content:space-around;flex-wrap:wrap;">
      ${badgeHTML}
    </div>

    ${badges.length === 0 ? `
      <p style="font-size:12px;color:var(--text-muted);text-align:center;margin-top:12px;">
        Log activities daily to unlock badges! 🌱
      </p>
    ` : ''}
  `;
}

// Live-update streak card when an activity is logged on this page
export function setupStreakListener(container) {
  return eventBus.on(EVENTS.STREAK_UPDATED, async () => {
    const { data: profile } = await (await import('../modules/db.js')).getProfile();
    renderStreakCard(container, profile);
  });
}
