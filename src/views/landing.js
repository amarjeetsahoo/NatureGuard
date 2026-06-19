/**
 * NatureGuard — Landing View (Public)
 * Hero page shown to unauthenticated visitors.
 */

import { router } from '../router.js';

export async function render(container) {
  container.innerHTML = `
    <div id="landing-view" role="main">

      <!-- Hero Section -->
      <section class="landing-hero" aria-labelledby="hero-title">
        <div class="mesh-bg" aria-hidden="true"></div>

        <span class="hero-eyebrow animate-fadeInDown" style="animation-delay:0ms;">
          🌍 AI-Powered Climate Action
        </span>

        <h1 class="hero-title animate-fadeInUp" id="hero-title" style="animation-delay:100ms;">
          Guard Your
          <span class="highlight">Nature.</span>
        </h1>

        <p class="hero-subtitle animate-fadeInUp" style="animation-delay:200ms;">
          Understand, track, and reduce your carbon footprint with personalized AI coaching.
          Small daily actions, massive collective impact.
        </p>

        <div class="hero-cta-group animate-fadeInUp" style="animation-delay:300ms;">
          <button
            id="hero-signup-btn"
            class="btn btn-primary btn-lg"
            aria-label="Get started for free"
          >
            🌱 Start for Free
          </button>
          <button
            id="hero-signin-btn"
            class="btn btn-secondary btn-lg"
            aria-label="Sign in to your account"
          >
            Sign In
          </button>
        </div>

        <!-- Social proof -->
        <p style="margin-top:32px; font-size:13px; color:var(--text-muted); animation-delay:500ms;" class="animate-fadeIn">
          Free forever · No credit card · Your data stays private
        </p>
      </section>

      <!-- Features Section -->
      <section aria-labelledby="features-title" style="padding: 20px var(--content-pad) 0; text-align:center;">
        <h2 id="features-title" style="font-size:var(--text-xl);font-weight:700;margin-bottom:8px;">
          Everything you need to go greener
        </h2>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:32px;">
          Powered by Gemini AI · Built for real people · 100% free
        </p>
      </section>

      <div class="landing-features stagger-children">
        ${FEATURES.map(f => `
          <article class="feature-card card animate-fadeInUp">
            <div class="feature-card-icon" aria-hidden="true">${f.icon}</div>
            <h3 class="feature-card-title">${f.title}</h3>
            <p class="feature-card-desc">${f.desc}</p>
          </article>
        `).join('')}
      </div>

      <!-- Footer -->
      <footer style="padding:var(--space-8) var(--content-pad);text-align:center;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:var(--text-sm);">
        <p>NatureGuard &copy; 2025 · Built with 💚 for the planet</p>
      </footer>

    </div>
  `;

  // Event listeners
  container.querySelector('#hero-signup-btn').addEventListener('click', () => {
    // Pre-select sign-up tab
    sessionStorage.setItem('auth_tab', 'signup');
    location.hash = '#auth';
  });

  container.querySelector('#hero-signin-btn').addEventListener('click', () => {
    sessionStorage.setItem('auth_tab', 'signin');
    location.hash = '#auth';
  });
}

const FEATURES = [
  {
    icon: '🗣️',
    title: 'Natural Language Logging',
    desc: 'Just describe your day — "I drove 20km and had a steak for dinner" — and AI logs it all automatically.',
  },
  {
    icon: '🤖',
    title: 'AI Carbon Coach',
    desc: 'Chat with an AI that actually knows your footprint. Get personalized answers to "what should I change first?"',
  },
  {
    icon: '📊',
    title: 'Real-Time Dashboard',
    desc: 'Beautiful charts show your CO₂ by category, trends over time, and how you compare to the global average.',
  },
  {
    icon: '🔮',
    title: 'What-If Simulator',
    desc: '"What if I went vegetarian for a month?" See the exact CO₂ impact before committing to any change.',
  },
  {
    icon: '🏆',
    title: 'Personalized Actions',
    desc: 'AI ranks eco-actions by your specific impact — no generic tips, only what matters most for your lifestyle.',
  },
  {
    icon: '🌱',
    title: 'Weekly AI Digest',
    desc: 'Every Sunday, get a personal narrative summary of your week — wins, trends, and your next best move.',
  },
];
