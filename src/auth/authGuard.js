/**
 * NatureGuard — Auth Guard
 * Protects private routes. Redirects to #auth if no session.
 */

import { getCurrentSession } from './authService.js';

/**
 * Call before rendering a private view.
 * @returns {boolean} true if session exists, false if redirected
 */
export async function authGuard() {
  const session = await getCurrentSession();
  if (!session) {
    location.hash = '#auth';
    return false;
  }
  return true;
}
