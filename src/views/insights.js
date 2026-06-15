/**
 * NatureGuard — Insights & AI Digest View
 * Displays beautiful footprint charts and the weekly AI-generated narrative.
 */

import { $, $$ } from '../utils/dom.js';
import { getOrGenerateWeeklyDigest } from '../ai/insights.js';
import { getMonthActivities } from '../modules/db.js';
import Chart from 'chart.js/auto';
import { formatCO2 } from '../modules/humanizer.js';

let currentChart = null;

export async function render(container) {
  container.innerHTML = `
    <div class="view" id="insights-view">
      <header class="view-header">
        <h1 class="view-title">Insights</h1>
        <p style="font-size:13px; color:var(--text-muted);">Your personalized footprint analysis</p>
      </header>

      <!-- Loading State -->
      <div id="insights-loading" style="display:flex; flex-direction:column; gap:20px;">
        <div class="skeleton skeleton-text" style="height:150px; border-radius:16px;"></div>
        <div class="skeleton skeleton-text" style="height:250px; border-radius:16px;"></div>
      </div>

      <div id="insights-content" hidden style="display:flex; flex-direction:column; gap:24px;">
        
        <!-- AI Weekly Digest Card -->
        <div class="card ai-card animate-fadeInUp" style="position:relative; overflow:hidden; background:linear-gradient(145deg, rgba(45,212,191,0.1) 0%, rgba(163,230,53,0.05) 100%); border:1px solid rgba(45,212,191,0.2);">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <span style="font-size:24px;">✨</span>
            <h2 style="font-size:16px; font-weight:700; color:var(--text-primary);">Your Weekly Digest</h2>
          </div>
          <div id="digest-content" style="font-size:14px; color:var(--text-secondary); line-height:1.6;">
            <!-- AI narrative goes here -->
          </div>
        </div>

        <!-- Trend Chart -->
        <div class="card animate-fadeInUp" style="animation-delay:100ms;">
          <h3 style="font-size:15px; font-weight:600; margin-bottom:16px;">30-Day Trend</h3>
          <div style="position:relative; height:200px; width:100%;">
            <canvas id="trend-chart"></canvas>
          </div>
        </div>

        <!-- Category Breakdown -->
        <div class="card animate-fadeInUp" style="animation-delay:200ms;">
          <h3 style="font-size:15px; font-weight:600; margin-bottom:16px;">Top Sources (This Month)</h3>
          <div id="category-bars" style="display:flex; flex-direction:column; gap:12px;">
            <!-- Rendered below -->
          </div>
        </div>

      </div>
    </div>
  `;

  await loadInsights(container);
}

async function loadInsights(container) {
  const loading = container.querySelector('#insights-loading');
  const content = container.querySelector('#insights-content');
  
  // Fetch data concurrently
  const [digestData, { data: monthActs }] = await Promise.all([
    getOrGenerateWeeklyDigest(),
    getMonthActivities()
  ]);

  const activities = monthActs || [];

  // Hide loading
  if (loading) loading.remove();
  content.hidden = false;

  // 1. Render AI Digest
  renderDigest(container, digestData);

  // 2. Render Chart
  renderChart(container, activities);

  // 3. Render Breakdown
  renderBreakdown(container, activities);
}

function renderDigest(container, digestData) {
  const el = container.querySelector('#digest-content');
  const rawText = digestData?.content || "No data available for this week yet.";
  
  // Format simple markdown (bold)
  const formattedText = rawText.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text-primary);">$1</strong>');
  el.innerHTML = formattedText;
}

function renderChart(container, activities) {
  const ctx = container.querySelector('#trend-chart');
  if (!ctx) return;

  const DAYS = 30;
  const today = new Date();

  // Build ordered map of last 30 days keyed by ISO date string (no collision risk)
  const dataMap = new Map();
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
    dataMap.set(key, 0);
  }

  // Accumulate CO₂ into the correct bucket
  activities.forEach(a => {
    const key = new Date(a.logged_at).toISOString().split('T')[0];
    if (dataMap.has(key)) {
      dataMap.set(key, dataMap.get(key) + a.co2_kg);
    }
  });

  // Build labels: show every 5th day to avoid crowding ("Jun 1", "Jun 6", ...)
  const keys       = [...dataMap.keys()];
  const dataPoints = [...dataMap.values()];
  const labels = keys.map((k, i) => {
    // Show date label every 5 points, otherwise empty string
    if (i % 5 === 0 || i === keys.length - 1) {
      const d = new Date(k + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return '';
  });

  if (currentChart) {
    currentChart.destroy();
  }

  // Chart styling to match our dark theme
  Chart.defaults.color = '#8A9992';
  Chart.defaults.font.family = "'Inter', sans-serif";

  currentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'CO₂ (kg)',
        data: dataPoints,
        borderColor: '#2DD4BF',
        backgroundColor: 'rgba(45, 212, 191, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#09100C',
        pointBorderColor: '#2DD4BF',
        pointRadius: 3,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1E2522',
          titleColor: '#F3F4F6',
          bodyColor: '#A3E635',
          borderColor: '#2DD4BF',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              // Show the full ISO date in the tooltip title
              const idx = items[0].dataIndex;
              const d = new Date(keys[idx] + 'T00:00:00');
              return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            },
            label: (context) => `${context.parsed.y.toFixed(2)} kg CO₂`,
          }
        }
      },
      scales: {
        x: {
          grid: { display: false, drawBorder: false },
          ticks: { maxRotation: 0, autoSkip: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(138, 153, 146, 0.1)', drawBorder: false },
          ticks: {
            maxTicksLimit: 5,
            callback: v => `${v}kg`,
          },
        }
      }
    }
  });
}

function renderBreakdown(container, activities) {
  const el = container.querySelector('#category-bars');
  
  if (activities.length === 0) {
    el.innerHTML = `<p style="font-size:13px; color:var(--text-muted);">No activities logged this month.</p>`;
    return;
  }

  let total = 0;
  const byCat = activities.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.co2_kg;
    total += a.co2_kg;
    return acc;
  }, {});

  const sorted = Object.entries(byCat).sort((a,b) => b[1] - a[1]);
  const icons = { transport:'🚗', food:'🍔', energy:'⚡', shopping:'🛍️', travel:'✈️' };
  const colors = { transport:'#2DD4BF', food:'#A3E635', energy:'#FACC15', shopping:'#F472B6', travel:'#60A5FA' };

  el.innerHTML = sorted.map(([cat, val]) => {
    const pct = Math.round((val / total) * 100);
    return `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:13px; margin-bottom:6px;">
          <span style="font-weight:500; text-transform:capitalize;">${icons[cat] || '📌'} ${cat}</span>
          <span style="font-weight:600; color:var(--text-primary);">${formatCO2(val)} <span style="color:var(--text-muted); font-weight:400;">(${pct}%)</span></span>
        </div>
        <div style="width:100%; height:8px; background:var(--glass-bg); border-radius:4px; overflow:hidden;">
          <div style="width:${pct}%; height:100%; background:${colors[cat] || '#2DD4BF'}; border-radius:4px; transition:width 1s ease-out;"></div>
        </div>
      </div>
    `;
  }).join('');
}
