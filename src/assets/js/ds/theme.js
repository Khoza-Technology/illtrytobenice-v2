/**
 * DS / theme.js — light/dark/system theme.
 *
 * Preference lives in store `theme` ('system' | 'light' | 'dark').
 * 'system' = no data-theme attribute; CSS follows prefers-color-scheme.
 *
 * @module ds/theme
 */
import { store } from './store.js';
import { $$, setIcon } from './dom.js';

/**
 * Inline <head> snippet (minified) that applies the saved theme before first paint.
 * Never throws, even when storage is blocked or the JSON is corrupt.
 * Build inlines it as: <script>${THEME_BOOT}</script>
 * @type {string}
 */
export const THEME_BOOT =
  "(function(){var d=document.documentElement;try{var t=JSON.parse(localStorage.getItem('itbn:state')||'{}').theme;if(t==='light'||t==='dark')d.dataset.theme=t;else d.removeAttribute('data-theme')}catch(e){d.removeAttribute('data-theme')}})();";

const ORDER = ['system', 'light', 'dark'];
const ICONS = { system: 'auto', light: 'sun', dark: 'moon' };
const LABELS = { system: 'System', light: 'Light', dark: 'Dark' };
const META_COLORS = { light: '#FBF6EE', dark: '#1C1612' };

let initialized = false;
let media = null;

function systemDark() {
  try {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  } catch {
    return false;
  }
}

/**
 * Current preference.
 * @returns {'system'|'light'|'dark'}
 */
export function getTheme() {
  const t = store.get('theme');
  return ORDER.includes(t) ? t : 'system';
}

/**
 * The theme actually showing right now (system resolved).
 * @returns {'light'|'dark'}
 */
export function resolvedTheme() {
  const t = getTheme();
  return t === 'system' ? (systemDark() ? 'dark' : 'light') : t;
}

function apply(theme, { animate = false } = {}) {
  const root = document.documentElement;
  if (animate) {
    let reduced = false;
    try { reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { /* noop */ }
    if (!reduced) {
      root.classList.add('theme-transition');
      clearTimeout(apply._t);
      apply._t = setTimeout(() => root.classList.remove('theme-transition'), 450);
    }
  }
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme;
  else root.removeAttribute('data-theme');
  updateMeta();
  updateToggles(theme);
}

function updateMeta() {
  const color = META_COLORS[resolvedTheme()];
  let metas = $$('meta[name="theme-color"]');
  if (!metas.length && document.head) {
    const m = document.createElement('meta');
    m.name = 'theme-color';
    document.head.appendChild(m);
    metas = [m];
  }
  metas.forEach((m) => {
    m.removeAttribute('media');
    m.setAttribute('content', color);
  });
}

function updateToggles(theme) {
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  $$('[data-theme-toggle]').forEach((btn) => {
    setIcon(btn, ICONS[theme]);
    btn.setAttribute('aria-label', `Theme: ${LABELS[theme]}. Switch to ${LABELS[next].toLowerCase()}`);
    btn.setAttribute('title', `Theme: ${LABELS[theme]}`);
    btn.dataset.themeState = theme;
    const label = btn.querySelector('[data-theme-label]');
    if (label) label.textContent = LABELS[theme];
  });
}

/**
 * Set the preference explicitly.
 * @param {'system'|'light'|'dark'} theme
 */
export function setTheme(theme) {
  const t = ORDER.includes(theme) ? theme : 'system';
  store.set('theme', t);
  apply(t, { animate: true });
}

/**
 * Advance system → light → dark → system and persist.
 * @returns {'system'|'light'|'dark'} the new preference
 */
export function cycleTheme() {
  const next = ORDER[(ORDER.indexOf(getTheme()) + 1) % ORDER.length];
  setTheme(next);
  return next;
}

/**
 * Apply the saved theme, bind every [data-theme-toggle] button (click → cycleTheme),
 * keep <meta name="theme-color"> in sync, follow OS changes and other tabs. Idempotent.
 */
export function initTheme() {
  apply(getTheme());
  if (initialized) return;
  initialized = true;

  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element && e.target.closest('[data-theme-toggle]');
    if (btn) {
      e.preventDefault();
      cycleTheme();
    }
  });

  try {
    media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => updateMeta();
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);
  } catch { /* matchMedia unsupported */ }

  store.subscribe('theme', (t) => apply(ORDER.includes(t) ? t : 'system', { animate: true }));
}
