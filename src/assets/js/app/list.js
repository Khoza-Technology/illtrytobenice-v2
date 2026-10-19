// Shopping list page.
import { openSheet, shareText, copyText, viewTransition } from '../ds/index.js';
import { store, toast, url, listItems, listView, plural } from './common.js';
import { mergeItems, formatQty, listCounts } from './ingredients.js';
import { esc, icon } from './markup.js';

const base = url('');
const root = document.querySelector('[data-list-root]');
const emptyEl = document.querySelector('[data-list-empty]');
const actionsEl = document.querySelector('[data-list-actions]');
const summaryEl = document.querySelector('[data-list-summary]');
const viewBtns = [...document.querySelectorAll('[data-view]')];
const toolbar = document.querySelector('.list-toolbar');
const addForm = document.querySelector('[data-list-add]');
const collapsed = new Set();

const getView = () => listView();

function setItems(fn) {
  store.update('list', (l) => {
    const list = l && typeof l === 'object' ? { ...l } : {};
    list.view = list.view === 'combined' ? 'combined' : 'grouped';
    list.items = fn(Array.isArray(list.items) ? list.items : []);
    return list;
  });
}

function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Group items by recipe, in the order recipes were first added; "My items" last. */
function groups(items) {
  const map = new Map();
  for (const it of items) {
    const key = it.recipe || '';
    if (!map.has(key)) map.set(key, { recipe: it.recipe || null, title: it.recipeTitle || 'My items', scale: it.scale || 1, items: [] });
    map.get(key).items.push(it);
  }
  const arr = [...map.values()];
  return [...arr.filter((g) => g.recipe), ...arr.filter((g) => !g.recipe)];
}

const byChecked = (a, b) => Number(a.checked) - Number(b.checked);

function itemHTML({ id, ids, text, checked, sources }) {
  const idAttr = ids ? `data-ids="${esc(ids.join(' '))}"` : `data-id="${esc(id)}"`;
  const key = ids ? ids[0] : id;
  const inputId = `li-${String(key).replace(/[^\w-]/g, '')}`;
  return `<li class="check-item list-item${checked ? ' check-item--done' : ''}" ${idAttr} data-key="${esc(key)}">
    <input type="checkbox" class="check-item__input" id="${inputId}"${checked ? ' checked' : ''}><span class="check-item__box" aria-hidden="true"></span>
    <label class="check-item__label" for="${inputId}">${esc(text)}${sources ? `<small class="list-item__sources text-muted">${esc(sources.join(' · '))}</small>` : ''}</label>
    <button type="button" class="btn btn--icon btn--ghost btn--sm check-item__aside list-item__delete" data-delete aria-label="Delete ${esc(text)}">${icon('trash', base)}</button>
  </li>`;
}

function render() {
  const items = listItems();
  const view = getView();
  viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  // counts are raw items in every view (listCounts) — same number as the nav badge and clear-all sheet
  const { open, done } = listCounts(items);
  summaryEl.textContent = items.length ? `${plural(open, 'item')} to get${done ? ` · ${done} checked` : ''}` : '';
  emptyEl.hidden = items.length > 0;
  actionsEl.hidden = items.length === 0;
  if (toolbar) toolbar.hidden = items.length === 0;
  const clearChecked = document.querySelector('[data-clear-checked]');
  if (clearChecked) clearChecked.disabled = !items.some((i) => i.checked);

  const focusKey = document.activeElement?.closest?.('[data-key]')?.dataset.key;
  const focusDelete = !!document.activeElement?.closest?.('[data-delete]');

  if (!items.length) {
    root.innerHTML = '';
  } else if (view === 'combined') {
    const merged = mergeItems(items).sort(byChecked);
    root.innerHTML = `<section class="section list-group"><ul class="checklist">${merged.map((m) => itemHTML({ ids: m.ids, text: m.display, checked: m.checked, sources: m.sources })).join('')}</ul></section>`;
  } else {
    root.innerHTML = groups(items).map((g) => {
      const key = g.recipe || '__mine';
      const left = g.items.filter((i) => !i.checked).length;
      const badge = g.scale && g.scale !== 1 ? ` <span class="badge">${esc(formatQty(g.scale))}×</span>` : '';
      // the <summary> is the toggle, so it holds no other control; the recipe link lives in the body
      const recipeLink = g.recipe
        ? `<a class="btn btn--ghost btn--sm list-group__recipe" href="${base}recipes/${esc(g.recipe)}/"><span>View recipe<span class="visually-hidden">: ${esc(g.title)}</span></span>${icon('chevron-right', base)}</a>`
        : '';
      return `<details class="section list-group" data-group="${esc(key)}"${collapsed.has(key) ? '' : ' open'}>
        <summary class="section__head list-group__head">
          ${icon('chevron-down', base, 'icon list-group__chevron')}
          <h2 class="section__title list-group__title">${esc(g.title)}${badge}</h2>
          <span class="text-muted list-group__count">${left ? `${left} left` : 'All done'}</span>
        </summary>
        <ul class="checklist">${[...g.items].sort(byChecked).map((i) => itemHTML(i)).join('')}</ul>
        ${recipeLink}
      </details>`;
    }).join('');
  }

  if (focusKey) {
    const row = root.querySelector(`[data-key="${CSS.escape(focusKey)}"]`);
    (focusDelete ? row?.querySelector('[data-delete]') : row?.querySelector('input'))?.focus();
  }
}

// ---------------------------------------------------------------- events
root.addEventListener('toggle', (e) => {
  const d = e.target.closest?.('details[data-group]');
  if (!d) return;
  if (d.open) collapsed.delete(d.dataset.group); else collapsed.add(d.dataset.group);
}, true);

function rowIds(row) {
  return row.dataset.ids ? row.dataset.ids.split(' ') : [row.dataset.id];
}

root.addEventListener('change', (e) => {
  const box = e.target.closest('input[type="checkbox"]');
  const row = box?.closest('.list-item');
  if (!row) return;
  const ids = new Set(rowIds(row));
  const checked = box.checked;
  row.classList.toggle('check-item--done', checked);
  viewTransition(() => setItems((items) => items.map((i) => (ids.has(i.id) ? { ...i, checked } : i))));
});

function removeIds(ids, message) {
  const before = listItems();
  const set = new Set(ids);
  setItems((items) => items.filter((i) => !set.has(i.id)));
  toast(message, { action: { label: 'Undo', onClick: () => setItems(() => before) } });
}

root.addEventListener('click', (e) => {
  const del = e.target.closest('[data-delete]');
  if (!del) return;
  const row = del.closest('.list-item');
  const ids = rowIds(row);
  removeIds(ids, ids.length > 1 ? `Removed ${ids.length} items` : 'Item removed');
});

// swipe-left-to-delete (touch / pen)
let swipe = null;
root.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const row = e.target.closest('.list-item');
  if (!row) return;
  swipe = { row, x: e.clientX, y: e.clientY, dx: 0, active: false };
});
root.addEventListener('pointermove', (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x;
  const dy = e.clientY - swipe.y;
  if (!swipe.active) {
    if (Math.abs(dy) > 12) { swipe = null; return; }
    if (dx < -12) { swipe.active = true; swipe.row.classList.add('is-swiping'); }
  }
  if (swipe?.active) {
    swipe.dx = Math.min(0, dx);
    swipe.row.style.transform = `translateX(${swipe.dx}px)`;
  }
});
function endSwipe() {
  if (!swipe) return;
  const { row, dx, active } = swipe;
  swipe = null;
  if (!active) return;
  row.classList.remove('is-swiping');
  if (dx < -Math.min(120, row.offsetWidth * 0.35)) {
    row.style.transform = 'translateX(-100%)';
    row.style.opacity = '0';
    const ids = rowIds(row);
    setTimeout(() => removeIds(ids, ids.length > 1 ? `Removed ${ids.length} items` : 'Item removed'), 120);
  } else {
    row.style.transform = '';
  }
  // swallow the click that follows a swipe
  const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
  row.addEventListener('click', stop, { capture: true, once: true });
  setTimeout(() => row.removeEventListener('click', stop, { capture: true }), 300);
}
root.addEventListener('pointerup', endSwipe);
root.addEventListener('pointercancel', () => {
  if (swipe?.row) { swipe.row.style.transform = ''; swipe.row.classList.remove('is-swiping'); }
  swipe = null;
});

viewBtns.forEach((b) => b.addEventListener('click', () => {
  const view = b.dataset.view;
  viewTransition(() => store.update('list', (l) => ({ ...(l && typeof l === 'object' ? l : { items: [] }), view })));
}));

addForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = addForm.querySelector('input');
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  setItems((items) => [...items, { id: uid(), text, recipe: null, recipeTitle: null, scale: 1, checked: false, addedAt: new Date().toISOString() }]);
  input.value = '';
  input.focus();
});

document.querySelector('[data-clear-checked]')?.addEventListener('click', () => {
  const ids = listItems().filter((i) => i.checked).map((i) => i.id);
  if (ids.length) removeIds(ids, `Cleared ${plural(ids.length, 'checked item')}`);
});

document.querySelector('[data-clear-all]')?.addEventListener('click', () => {
  openSheet({
    title: 'Clear the whole list?',
    content: `This removes all ${plural(listCounts(listItems()).total, 'item')} from your list.`,
    actions: [
      { label: 'Keep my list', variant: 'secondary' },
      { label: 'Clear all', variant: 'primary', icon: 'trash', onClick: () => removeIds(listItems().map((i) => i.id), 'List cleared') },
    ],
  });
});

// ---------------------------------------------------------------- export
function exportText() {
  const items = listItems().filter((i) => !i.checked);
  if (getView() === 'combined') return mergeItems(items).map((m) => m.display).join('\n');
  return groups(items).map((g) => [`${g.title}${g.scale && g.scale !== 1 ? ` (${formatQty(g.scale)}×)` : ''}:`, ...g.items.map((i) => i.text)].join('\n')).join('\n\n');
}

document.querySelector('[data-export-keep]')?.addEventListener('click', async () => {
  const text = exportText();
  if (!text.trim()) { toast('Nothing left to buy — everything is checked off'); return; }
  const result = await shareText({ title: 'Shopping list', text });
  if (result === 'copied') {
    window.open('https://keep.google.com/', '_blank', 'noopener');
    toast('List copied — paste it into a new Keep note');
  }
  // 'failed' also means the user dismissed the share sheet — stay quiet.
});

document.querySelector('[data-export-copy]')?.addEventListener('click', async () => {
  const text = exportText();
  if (!text.trim()) { toast('Nothing left to buy — everything is checked off'); return; }
  toast((await copyText(text)) ? 'List copied to clipboard' : 'Couldn’t copy the list');
});

store.subscribe('list', render);
render();
