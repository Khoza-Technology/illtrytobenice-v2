/**
 * DS / wakelock.js — keep the screen on (cook mode).
 * @module ds/wakelock
 */

/**
 * Whether the Screen Wake Lock API is available.
 * @returns {boolean}
 */
export function wakeLockSupported() {
  return typeof navigator !== 'undefined' && !!navigator.wakeLock && typeof navigator.wakeLock.request === 'function';
}

/**
 * Ask the browser to keep the screen awake. The lock is re-acquired automatically
 * when the page becomes visible again (browsers drop it when the tab is hidden).
 * Silently does nothing where unsupported or denied.
 * @example const release = keepAwake(); ... release();
 * @returns {() => void} release — call to let the screen sleep again (idempotent)
 */
export function keepAwake() {
  if (!wakeLockSupported()) return () => {};
  let sentinel = null;
  let active = true;

  const acquire = async () => {
    if (!active || document.visibilityState !== 'visible') return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      if (!active && sentinel) {
        sentinel.release().catch(() => {});
        sentinel = null;
      }
    } catch {
      sentinel = null; // denied, low battery, etc.
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) acquire();
  };

  document.addEventListener('visibilitychange', onVisibility);
  acquire();

  return function release() {
    if (!active) return;
    active = false;
    document.removeEventListener('visibilitychange', onVisibility);
    if (sentinel) {
      try { sentinel.release().catch(() => {}); } catch { /* noop */ }
      sentinel = null;
    }
  };
}
