// Shared page bootstrap: DS init, favorites buttons, list badge, index loader.
// Every page module imports this first.
import { initDS, setListCounter, store, toast, url } from '../ds/index.js';
import { recipeTableHTML } from './markup.js';
import { listCounts } from './ingredients.js';

export { store, toast, url };

initDS();

// ---------------------------------------------------------------- favorites
export const getFavorites = () => {
  const f = store.get('favorites');
  return Array.isArray(f) ? f : [];
};
export const isFavorite = (slug) => getFavorites().includes(slug);

function iconHref(name) {
  return url(`assets/img/icons.svg#i-${name}`);
}

/** Reflect favorite state on one [data-fav] button. */
export function paintFavButton(btn) {
  const slug = btn.dataset.fav;
  const on = isFavorite(slug);
  btn.setAttribute('aria-pressed', String(on));
  // DS shows .icon--on / .icon--off from aria-pressed; swap the sprite ref only for single-icon buttons
  if (!btn.querySelector('.icon--on')) btn.querySelector('use')?.setAttribute('href', iconHref(on ? 'heart-fill' : 'heart'));
}
export function paintFavButtons(root = document) {
  root.querySelectorAll('[data-fav]').forEach(paintFavButton);
}

export function setFavorite(slug, on) {
  store.update('favorites', (list) => {
    const arr = Array.isArray(list) ? list.filter((s) => s !== slug) : [];
    if (on) arr.unshift(slug);
    return arr;
  });
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-fav]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const slug = btn.dataset.fav;
  const was = isFavorite(slug);
  setFavorite(slug, !was);
  paintFavButtons();
  // Both directions can be undone from the toast.
  toast(was ? 'Removed from favorites' : 'Saved to favorites', {
    icon: was ? 'heart' : 'heart-fill',
    action: { label: 'Undo', onClick: () => { setFavorite(slug, was); paintFavButtons(); } },
  });
});
store.subscribe('favorites', () => paintFavButtons());
paintFavButtons();

// ---------------------------------------------------------------- list
export function listItems() {
  const items = store.get('list.items');
  return Array.isArray(items) ? items : [];
}
// [data-list-count] badges are kept current by initDS() (ds/index.js). They use listCounts() — unchecked
// raw items, in every view — the same function as the list summary and the clear-all sheet.
export const listView = (list = store.get('list')) => (list?.view === 'combined' ? 'combined' : 'grouped');
setListCounter((list) => listCounts(list?.items).open);

// ---------------------------------------------------------------- search index
let indexPromise = null;
/** Lazily fetch api/index.json once per page. */
export function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(url('api/index.json'))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .catch((err) => { indexPromise = null; throw err; });
  }
  return indexPromise;
}

/** Recipe table markup for a JS-rendered page, identical to the build's (same markup.js template). */
export function renderRecipeTable(entries, index, opts = {}) {
  const categories = Object.fromEntries((index.categories || []).map((c) => [c.id, c.name]));
  const contributors = Object.fromEntries((index.contributors || []).map((c) => [c.id, c.name]));
  return recipeTableHTML(entries, { base: url(''), categories, contributors, ...opts });
}

/** Text normalisation shared by search: lowercase, strip accents/punctuation. */
export function norm(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
