/**
 * NatureGuard — SPA Router
 * Hash-based router. Maps #routes to view modules.
 */

import { authGuard } from './auth/authGuard.js';

// Lazy-load view modules for efficiency
const routes = {
  '#landing':    () => import('./views/landing.js'),
  '#auth':       () => import('./views/auth.js'),
  '#dashboard':  () => import('./views/dashboard.js'),
  '#log':        () => import('./views/logActivity.js'),
  '#coach':      () => import('./views/coach.js'),
  '#actions':    () => import('./views/actions.js'),
  '#insights':   () => import('./views/insights.js'),
  '#settings':   () => import('./views/settings.js'),
  '#onboarding': () => import('./views/onboarding.js'),
};

// Routes that require authentication
const privateRoutes = new Set(['#dashboard', '#log', '#coach', '#actions', '#insights', '#settings', '#onboarding']);

const main = document.getElementById('main-content');

export const router = {
  currentRoute: null,

  async navigate(hash) {
    const route = hash.split('?')[0] || '#landing';

    // Auth guard for private routes
    if (privateRoutes.has(route)) {
      const allowed = await authGuard();
      if (!allowed) return;
    }

    const loader = routes[route] || routes['#landing'];

    try {
      const { render } = await loader();
      this.currentRoute = route;
      location.hash = route;

      // Clear and render new view
      main.innerHTML = '';
      await render(main);

      // Update active nav item
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.route === route);
      });

      // Scroll to top
      main.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      console.error('[Router] Failed to load view:', route, err);
    }
  },
};
