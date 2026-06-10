/**
 * NatureGuard — Toast Notification System
 */

let container;

export function initToasts() {
  container = document.getElementById('toast-container');
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms before auto-dismiss
 */
export function toast(message, type = 'info', duration = 3500) {
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  const el = document.createElement('div');
  el.className = `toast toast-${type} animate-fadeIn`;
  el.setAttribute('role', 'alert');
  el.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icons[type]}</span>
    <span>${message}</span>
  `;

  container.appendChild(el);

  // Auto-dismiss
  setTimeout(() => {
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }, duration);
}

export const toastSuccess = (msg) => toast(msg, 'success');
export const toastError   = (msg) => toast(msg, 'error');
export const toastInfo    = (msg) => toast(msg, 'info');
