/**
 * DS / toast.js — transient notifications in a polite live region.
 * @module ds/toast
 */
import { h, icon } from './dom.js';
import { prefersReducedMotion } from './motion.js';

const MAX_TOASTS = 3;

/**
 * Get (or create) the single .toast-region. Called by initDS().
 * @returns {HTMLElement}
 */
export function ensureToastRegion() {
  let region = document.querySelector('.toast-region');
  if (!region) {
    region = h('div', { class: 'toast-region', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'false' });
    document.body.appendChild(region);
  }
  return /** @type {HTMLElement} */ (region);
}

function removeToast(el) {
  if (!el || !el.isConnected || el.classList.contains('is-leaving')) return;
  if (prefersReducedMotion()) { el.remove(); return; }
  el.classList.add('is-leaving');
  const done = () => el.remove();
  el.addEventListener('animationend', done, { once: true });
  setTimeout(done, 400); // safety net
}

/**
 * Show a toast.
 * @example toast('Added 9 items to your list', { action: { label: 'View', onClick: () => location.assign(url('list/')) } })
 * @param {string} message plain text (never parsed as HTML)
 * @param {{ action?: { label: string, onClick: (e: MouseEvent) => void }, duration?: number, icon?: string }} [opts]
 *   duration in ms (default 4000, 6500 with an action; 0 = stays until dismissed); icon = sprite name e.g. 'check'
 * @returns {{ dismiss: () => void, el: HTMLElement }}
 */
export function toast(message, opts = {}) {
  const region = ensureToastRegion();
  const { action, icon: iconName } = opts;
  const duration = typeof opts.duration === 'number' ? opts.duration : action ? 6500 : 4000;

  const el = h('div', { class: 'toast' },
    iconName ? icon(iconName, { class: 'toast__icon' }) : null,
    h('span', { class: 'toast__message' }, String(message ?? '')),
  );

  let timer = null;
  const dismiss = () => { clearTimeout(timer); removeToast(el); };

  if (action && action.label) {
    el.appendChild(h('button', {
      type: 'button',
      class: 'toast__action',
      onClick: (e) => {
        try { if (typeof action.onClick === 'function') action.onClick(e); } finally { dismiss(); }
      },
    }, action.label));
  }

  region.appendChild(el);
  const all = region.querySelectorAll('.toast:not(.is-leaving)');
  if (all.length > MAX_TOASTS) removeToast(all[0]);

  const start = () => { if (duration > 0) timer = setTimeout(dismiss, duration); };
  const pause = () => clearTimeout(timer);
  el.addEventListener('pointerenter', pause);
  el.addEventListener('pointerleave', start);
  el.addEventListener('focusin', pause);
  el.addEventListener('focusout', start);
  start();

  return { dismiss, el };
}
