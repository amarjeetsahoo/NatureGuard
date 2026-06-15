/**
 * NatureGuard — Auth Guard
 * Protects private routes. Redirects to #auth if no session.
 */

import { getCurrentSession } from './authService.js';
import { getProfile } from '../modules/db.js';

/**
 * Call before rendering a private view.
 * @returns {boolean} true if session exists, false if redirected
 */
export async function authGuard(route) {
  const session = await getCurrentSession();
  if (!session) {
    location.hash = '#auth';
    return false;
  }

  if (route !== '#onboarding' && route !== '#settings') {
    const { data: profile } = await getProfile();
    if (profile && profile.onboarded === false) {
      location.hash = '#onboarding';
      return false;
    }
  }

  return true;
}
