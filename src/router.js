/**
 * NatureGuard — SPA Router
 * Hash-based router. Maps #routes to view modules.
 */

import { authGuard } from './auth/authGuard.js';
import { showLoader, hideLoader } from './utils/loader.js';

// Lazy-load view modules for efficiency
const routes = {
  '#landing':    () => import('./views/landing.js'),
  '#auth':       () => import('./views/auth.js'),
  '#dashboard':  () => import('./views/dashboard.js'),
  '#log':        () => import('./views/logActivity.js'),
  '#coach':      () => import('./views/coach.js'),
  '#actions':    () => import('./views/actions.js'),
  '#insights':   () => import('./views/insights.js'),
  '#whatif':     () => import('./views/whatif.js'),
  '#settings':   () => import('./views/settings.js'),
  '#onboarding': () => import('./views/onboarding.js'),
  '#rewards':    () => import('./views/rewards.js'),
  '#404':        () => import('./views/notFound.js'),
};

// Routes that require authentication
const privateRoutes = new Set(['#dashboard', '#log', '#coach', '#actions', '#insights', '#whatif', '#settings', '#onboarding', '#rewards']);

const main = document.getElementById('main-content');

export const router = {
  currentRoute: null,

  async navigate(hash) {
    let route = hash.split('?')[0] || '#landing';

    // Auth guard for private routes
    if (privateRoutes.has(route)) {
      const allowed = await authGuard(route);
      if (!allowed) return;
    }

    if (!routes[route] && route !== '') {
        route = '#404';
    }

    const loader = routes[route] || routes['#landing'];

    try {
      showLoader(); // Show leaf loader while downloading bundle and preparing view
      
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
    } finally {
      hideLoader(); // Hide loader when done
    }
  },
};
