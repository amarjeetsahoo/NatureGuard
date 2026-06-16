/**
 * Global Leaf Loader Utility
 * Used to show a thematic loading overlay during lazy route loading or heavy DB calls.
 */

export function showLoader(text = 'Loading...') {
  const overlay = document.getElementById('global-loader');
  if (!overlay) return;

  const textEl = overlay.querySelector('.loader-text');
  if (textEl) {
    textEl.textContent = text;
  }

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

export function hideLoader() {
  const overlay = document.getElementById('global-loader');
  if (!overlay) return;

  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}
