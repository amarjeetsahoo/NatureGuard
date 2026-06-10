/**
 * NatureGuard — DOM Utilities
 * Lightweight helpers to keep view code clean.
 */

/** Select a single element. */
export const $ = (selector, root = document) => root.querySelector(selector);

/** Select multiple elements as an Array. */
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/**
 * Create a DOM element with properties and children.
 * @param {string} tag
 * @param {object} props - { className, id, textContent, innerHTML, dataset, ...attrs }
 * @param {...(HTMLElement|string)} children
 */
export function el(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  const { className, id, textContent, innerHTML, dataset, style, ...attrs } = props;

  if (className) element.className = className;
  if (id) element.id = id;
  if (textContent) element.textContent = textContent;
  if (innerHTML) element.innerHTML = innerHTML;
  if (dataset) Object.assign(element.dataset, dataset);
  if (style) Object.assign(element.style, style);

  // Set remaining attributes
  for (const [key, val] of Object.entries(attrs)) {
    if (val !== undefined && val !== null) {
      element.setAttribute(key.replace(/([A-Z])/g, '-$1').toLowerCase(), val);
    }
  }

  children.forEach(child => {
    if (child instanceof HTMLElement) element.appendChild(child);
    else if (typeof child === 'string') element.appendChild(document.createTextNode(child));
  });

  return element;
}

/**
 * Render HTML string into a container (clears previous content).
 * @param {HTMLElement} container
 * @param {string} html
 */
export function render(container, html) {
  container.innerHTML = html;
}

/**
 * Append HTML string to a container.
 */
export function append(container, html) {
  container.insertAdjacentHTML('beforeend', html);
}

/** Show an element (removes hidden attribute). */
export function show(el) { el.hidden = false; }

/** Hide an element (sets hidden attribute). */
export function hide(el) { el.hidden = true; }

/** Toggle visibility. */
export function toggle(el, condition) { el.hidden = !condition; }

/** Format a number with specified decimal places. */
export function formatNum(n, decimals = 1) {
  return Number(n).toFixed(decimals);
}

/** Get user's display initials (for avatar). */
export function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}
