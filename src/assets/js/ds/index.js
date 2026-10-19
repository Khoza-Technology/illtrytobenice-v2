/**
 * DS / index.js — public entry point. Re-exports the whole design-system API and
 * provides initDS(), which every page calls once.
 *
 *   import { initDS, store, toast } from '{{BASE}}assets/js/ds/index.js';
 *   initDS();
 *
 * @module ds
 */
import { $$ } from './dom.js';
import { store } from './store.js';
import { initTheme } from './theme.js';
import { initSheets } from './sheet.js';
import { ensureToastRegion } from './toast.js';

export * from './dom.js';
export * from './store.js';
export * from './theme.js';
export * from './toast.js';
export * from './sheet.js';
export * from './share.js';
export * from './wakelock.js';
export * from './motion.js';

/** html[data-page] → tab/nav id ([data-nav]) */
export const NAV_FOR_PAGE = {
  home: 'home',
  recipe: 'home',
  category: 'home',
  contributor: 'home',
  search: 'search',
  favorites: 'favorites',
  list: 'list',
};

let started = false;

/**
 * Mark the nav items ([data-nav] inside .tabbar and .app-header__nav) that match
 * html[data-page] with aria-current="page".
 * @param {string} [page] defaults to document.documentElement.dataset.page
 */
export function markActiveNav(page = document.documentElement.dataset.page) {
  const active = NAV_FOR_PAGE[page] || null;
  $$('.tabbar [data-nav], .app-header__nav [data-nav]').forEach((el) => {
    if (active && el.getAttribute('data-nav') === active) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
}

/**
 * Default list counter: unchecked raw items (entries in list.items), whatever the list view — the app
 * registers the identical rule (app/ingredients.js listCounts) via setListCounter().
 */
let listCounter = (list) => (Array.isArray(list?.items) ? list.items.filter((i) => i && !i.checked).length : 0);
let renderListBadges = null;

/**
 * Replace how the list badge counts, so it uses exactly the function the list page's own counts use.
 * `fn(list)` receives the `list` state object and returns a number.
 * @param {(list: object) => number} fn
 */
export function setListCounter(fn) {
  if (typeof fn !== 'function') return;
  listCounter = fn;
  renderListBadges?.(false);
}

/**
 * Keep every [data-list-count] badge (e.g. .tabbar__badge) showing the number of
 * unchecked shopping-list items; hidden when 0.
 *
 * Accessible name: the badge itself is decorative (aria-hidden) and the host link gets a
 * .visually-hidden [data-list-count-sr] span right after its label, so the name reads
 * "List 10 unchecked items" — it starts with the visible text and contains the visible count
 * (WCAG 2.5.3 label-in-name). No aria-label is set on the link.
 */
function bindListBadges() {
  const srFor = (el) => {
    const host = el.closest('a, button');
    if (!host) return null;
    let sr = host.querySelector('[data-list-count-sr]');
    if (!sr) {
      sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.setAttribute('data-list-count-sr', '');
      const labelEl = host.querySelector('.tabbar__label, [data-label]');
      if (labelEl) labelEl.after(sr); else host.append(sr);
    }
    host.removeAttribute('aria-label');
    return sr;
  };
  const render = (bump) => {
    let n = 0;
    try { n = Number(listCounter(store.get('list'))) || 0; } catch (err) { console.error('[ds] list counter failed', err); }
    $$('[data-list-count]').forEach((el) => {
      const prev = Number(el.textContent) || 0;
      el.textContent = n > 99 ? '99+' : String(n);
      el.hidden = n === 0;
      el.setAttribute('aria-hidden', 'true');
      const sr = srFor(el);
      if (sr) sr.textContent = n ? ` ${n} unchecked item${n === 1 ? '' : 's'}` : '';
      if (bump && n > prev) {
        el.classList.remove('is-bump');
        void el.offsetWidth; // restart animation
        el.classList.add('is-bump');
      }
    });
  };
  renderListBadges = render;
  render(false);
  store.subscribe('list', () => render(true));
}

function bindHeaderScroll() {
  const header = document.querySelector('.app-header');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 4);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

/**
 * Initialise the design system on the current page (idempotent):
 * theme + toggles, sheets, active nav, list badge, toast region, header scroll state.
 */
export function initDS() {
  const root = document.documentElement;
  root.classList.add('js');
  const steps = [initTheme, initSheets, () => markActiveNav(), ensureToastRegion];
  if (!started) steps.push(bindListBadges, bindHeaderScroll);
  started = true;
  for (const step of steps) {
    try { step(); } catch (err) { console.error('[ds] init step failed', err); }
  }
}
