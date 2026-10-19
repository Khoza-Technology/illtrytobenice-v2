// Instant search + filter + sort over the pre-rendered recipe table (markup.js). Used by home, search,
// category and contributor pages. State lives in the URL: ?q=&cat=&by=&sort=
import { loadIndex, norm, plural } from './common.js';
import { SORT_DIRECTION } from './markup.js';

const SORTS = Object.keys(SORT_DIRECTION);
/** The segmented option that stands for "no explicit sort while searching" (relevance order). */
const BEST = 'best';

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

const stem = (t) => (t.length > 3 && t.endsWith('s') && !t.endsWith('ss') ? t.slice(0, -1) : t);

function tokenScore(tok, d) {
  const st = stem(tok);
  let s = 0;
  if (d.titleWords.includes(tok) || d.titleWords.includes(st)) s += 12;
  else if (d.titleWords.some((w) => w.startsWith(st))) s += 9;
  else if (d.title.includes(st)) s += 6;
  else if (st.length >= 4 && d.titleWords.some((w) => lev(w, st) <= (st.length >= 7 ? 2 : 1))) s += 4;
  if (d.metaWords.some((w) => w.startsWith(st))) s += 5;
  if (d.ingredients && d.ingredients.includes(st)) s += 2;
  return s;
}

/**
 * Selected state for a chip / tab: links use aria-current="page" only (aria-pressed is not allowed on
 * links); buttons use aria-pressed.
 */
function setSelected(el, on) {
  if (el.tagName === 'A') {
    el.removeAttribute('aria-pressed');
    if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
  } else {
    el.setAttribute('aria-pressed', String(on));
  }
}

/**
 * @param {object} o
 * @param {HTMLElement} [o.root]  element containing [data-browse]
 * @param {boolean} [o.categoryTabs]  the page's .divider-tabs filter in place (home, search)
 * @param {(state)=>void} [o.onChange]
 */
export function initBrowse({ root = document, categoryTabs = false, onChange } = {}) {
  const section = root.querySelector('[data-browse]');
  if (!section) return null;
  const table = section.querySelector('[data-recipe-table]');
  const grid = table?.querySelector('[data-recipe-rows]');
  if (!grid) return null;
  const input = root.querySelector('[data-search-input]');
  const clear = root.querySelector('[data-search-clear]');
  const form = root.querySelector('[data-search-form]');
  const countEl = section.querySelector('[data-result-count]');
  const emptyEl = section.querySelector('[data-browse-empty]');
  const headingEl = section.querySelector('[data-browse-heading]');
  const sortNoteEl = section.querySelector('[data-sort-note]');
  const emptyTextEl = section.querySelector('[data-browse-empty-text]');
  const resetBtn = section.querySelector('[data-browse-reset]');
  const defaultHeading = headingEl?.textContent || '';
  const sortBtns = [...section.querySelectorAll('.segmented [data-sort]')];
  const bestBtn = sortBtns.find((b) => b.dataset.sort === BEST);
  const sortHeads = [...table.querySelectorAll('th [data-sort]')];
  const catCtrls = categoryTabs ? [...root.querySelectorAll('.divider-tabs [data-cat]')] : [];
  const byCtrls = [...section.querySelectorAll('[data-by]')];
  const catNames = Object.fromEntries(catCtrls.filter((c) => c.dataset.cat).map((c) => [c.dataset.cat, c.textContent.trim()]));
  const byNames = Object.fromEntries(byCtrls.map((c) => [c.dataset.by, c.textContent.trim()]));

  const docs = [...grid.querySelectorAll('tr[data-slug]')].map((el, i) => {
    const rawTitle = el.querySelector('.recipe-table__link')?.textContent.trim() || '';
    const title = norm(rawTitle);
    const meta = norm([el.querySelector('.recipe-table__meta')?.textContent, el.dataset.cuisine, el.dataset.categories, el.dataset.contributor].join(' '));
    return {
      el, i, slug: el.dataset.slug,
      title, titleWords: title.split(' '), rawTitle,
      metaWords: meta.split(' '),
      cats: (el.dataset.categories || '').split(' ').filter(Boolean),
      by: el.dataset.contributor,
      published: el.dataset.published || '',
      minutes: Number(el.dataset.minutes) || Infinity,
      ingredients: '',
    };
  });

  // sort: '' = default — A–Z when browsing, best match first while searching. An explicit sort
  // (a click, or ?sort= in the URL) always wins, even over relevance. The active ordering is always
  // shown: the "Best match" segment (phones) / "Sorted by best match" note (desktop) while ranking.
  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    cat: catNames[params.get('cat')] ? params.get('cat') : '',
    by: byNames[params.get('by')] ? params.get('by') : '',
    sort: SORTS.includes(params.get('sort')) ? params.get('sort') : '',
  };
  if (input) input.value = state.q;
  const effectiveSort = () => state.sort || (norm(state.q) ? '' : 'az');

  let indexLoaded = false;
  function ensureIndex() {
    if (indexLoaded) return;
    indexLoaded = true;
    loadIndex().then((idx) => {
      const bySlug = new Map(idx.recipes.map((r) => [r.slug, r]));
      for (const d of docs) d.ingredients = norm(bySlug.get(d.slug)?.ingredients || '');
      if (state.q) apply();
    }).catch(() => { indexLoaded = false; });
  }

  function syncUrl() {
    const p = new URLSearchParams(location.search);
    for (const [k, def] of [['q', ''], ['cat', ''], ['by', ''], ['sort', '']]) {
      if (state[k] && state[k] !== def) p.set(k, state[k]); else p.delete(k);
    }
    const qs = p.toString();
    history.replaceState(history.state, '', `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`);
  }

  function paintControls() {
    const sort = effectiveSort();
    const ranking = !sort; // a query is active and no sort was picked
    if (bestBtn) bestBtn.hidden = !norm(state.q);
    if (sortNoteEl) sortNoteEl.hidden = !ranking;
    sortBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === (ranking ? BEST : sort))));
    sortHeads.forEach((b) => {
      const th = b.closest('th');
      if (b.dataset.sort === sort) th.setAttribute('aria-sort', SORT_DIRECTION[sort]); else th.removeAttribute('aria-sort');
    });
    catCtrls.forEach((c) => setSelected(c, c.tagName === 'A' ? c.dataset.cat === state.cat : (c.dataset.cat === state.cat && !!state.cat)));
    byCtrls.forEach((c) => setSelected(c, !!state.by && c.dataset.by === state.by));
    if (clear) clear.hidden = !state.q;
  }

  function apply({ url = true } = {}) {
    const tokens = norm(state.q).split(' ').filter(Boolean);
    const qNorm = norm(state.q);
    const results = [];
    for (const d of docs) {
      if (state.cat && !d.cats.includes(state.cat)) continue;
      if (state.by && d.by !== state.by) continue;
      let score = 0;
      if (tokens.length) {
        let ok = true;
        for (const t of tokens) {
          const s = tokenScore(t, d);
          if (!s) { ok = false; break; }
          score += s;
        }
        if (!ok) continue;
        if (d.title.startsWith(qNorm)) score += 10;
        else if (d.title.includes(qNorm)) score += 5;
      }
      results.push({ d, score });
    }
    const bySort = {
      az: (a, b) => a.d.rawTitle.localeCompare(b.d.rawTitle),
      new: (a, b) => b.d.published.localeCompare(a.d.published) || a.d.i - b.d.i,
      quick: (a, b) => a.d.minutes - b.d.minutes || a.d.rawTitle.localeCompare(b.d.rawTitle),
    };
    const sort = effectiveSort();
    results.sort(sort ? bySort[sort] : (a, b) => b.score - a.score || bySort.az(a, b));

    const visible = new Set(results.map((r) => r.d));
    for (const d of docs) d.el.hidden = !visible.has(d);
    // reorder only when needed to avoid needless layout
    const want = [...results.map((r) => r.d.el), ...docs.filter((d) => !visible.has(d)).map((d) => d.el)];
    const current = [...grid.children];
    if (want.some((el, i) => current[i] !== el)) grid.append(...want);

    const n = results.length;
    const filtered = n !== docs.length;
    if (countEl) countEl.textContent = filtered ? `${n} of ${plural(docs.length, 'recipe')}` : plural(n, 'recipe');
    if (emptyEl) emptyEl.hidden = n > 0;
    table.hidden = n === 0;
    if (headingEl) {
      // Sentence case in every state: "Results for “x” · Dessert · from Genevieve", "Dessert from
      // Genevieve", "Recipes from Genevieve", "Dessert".
      const from = state.by ? `from ${byNames[state.by]}` : '';
      if (state.q) headingEl.textContent = `Results for ${[`“${state.q.trim()}”`, catNames[state.cat], from].filter(Boolean).join(' · ')}`;
      else if (state.cat || state.by) headingEl.textContent = [state.cat ? catNames[state.cat] : 'Recipes', from].filter(Boolean).join(' ');
      else headingEl.textContent = defaultHeading;
    }
    if (n === 0) {
      // recovery copy names only what is actually narrowing the results
      const filters = !!(state.cat || state.by);
      const q = !!norm(state.q);
      if (emptyTextEl) {
        emptyTextEl.textContent = q && filters ? 'Try fewer words, a different spelling, or clear the filters.'
          : q ? 'Try fewer words or a different spelling.'
            : 'No recipes match these filters together.';
      }
      if (resetBtn) resetBtn.textContent = q && filters ? 'Clear search & filters' : q ? 'Clear search' : 'Clear filters';
    }
    paintControls();
    if (url) syncUrl();
    onChange?.(state, results);
  }

  // ---- events
  let t;
  input?.addEventListener('input', () => {
    state.q = input.value;
    ensureIndex();
    clearTimeout(t);
    t = setTimeout(apply, 60);
  });
  input?.addEventListener('focus', ensureIndex, { once: true });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && input.value) { e.preventDefault(); input.value = ''; state.q = ''; apply(); }
  });
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    input?.blur();
    section.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  clear?.addEventListener('click', () => { input.value = ''; state.q = ''; apply(); input.focus(); });
  [...sortBtns, ...sortHeads].forEach((b) => b.addEventListener('click', () => {
    state.sort = SORTS.includes(b.dataset.sort) ? b.dataset.sort : ''; // "Best match" = no explicit sort
    apply();
  }));
  byCtrls.forEach((c) => c.addEventListener('click', () => { state.by = state.by === c.dataset.by ? '' : c.dataset.by; apply(); }));
  catCtrls.forEach((c) => c.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    const next = c.dataset.cat;
    state.cat = c.tagName === 'A' ? next : (state.cat === next ? '' : next);
    apply();
  }));
  section.querySelector('[data-browse-reset]')?.addEventListener('click', () => {
    Object.assign(state, { q: '', cat: '', by: '' });
    if (input) input.value = '';
    apply();
    input?.focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
    if (!input) return;
    e.preventDefault();
    input.focus();
    input.select();
  });

  if (state.q) ensureIndex();
  apply({ url: false });
  return {
    state,
    apply,
    visibleSlugs: () => docs.filter((d) => !d.el.hidden).map((d) => d.slug),
  };
}
