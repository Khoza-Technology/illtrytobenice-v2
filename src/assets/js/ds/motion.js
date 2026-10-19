/**
 * DS / motion.js — motion preferences and View Transitions.
 * @module ds/motion
 */

/**
 * True when the user asked the OS to reduce motion.
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch {
    return false;
  }
}

/**
 * Run a DOM update inside document.startViewTransition when supported and motion
 * is allowed; otherwise just run it. Always resolves after the update has applied.
 * @example await viewTransition(() => renderGrid(sorted))
 * @param {() => (void|Promise<void>)} fn the DOM update
 * @returns {Promise<void>}
 */
export function viewTransition(fn) {
  const run = async () => { await fn(); };
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function' || prefersReducedMotion()) {
    try {
      return Promise.resolve(fn()).then(() => undefined);
    } catch (err) {
      return Promise.reject(err);
    }
  }
  try {
    const t = document.startViewTransition(run);
    return t.updateCallbackDone.catch(() => undefined);
  } catch {
    return run();
  }
}
