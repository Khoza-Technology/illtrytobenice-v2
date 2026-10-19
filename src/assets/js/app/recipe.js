// Recipe page: scaler, ingredient checks, add-to-list sheet, cook mode, share, print.
import { openSheet, shareText, keepAwake, prefersReducedMotion } from '../ds/index.js';
import { store, toast, url, listItems } from './common.js';
import { scaleIngredient, formatQty } from './ingredients.js';
import { esc, icon } from './markup.js';

const dataEl = document.getElementById('recipe-data');
const recipe = dataEl ? JSON.parse(dataEl.textContent) : null;
const base = url('');

if (recipe) init();

function init() {
  const { slug } = recipe;
  const labels = [...document.querySelectorAll('[data-ingredients] .check-item__label[data-text]')];
  const boxes = [...document.querySelectorAll('[data-ingredients] .check-item__input')];
  const scaleBtns = [...document.querySelectorAll('[data-scale]')];
  const servOut = document.querySelector('[data-servings-value]');
  const servMeta = document.querySelector('[data-servings-meta]');
  const baseServings = Number(servOut?.dataset.baseServings) || Number(servMeta?.dataset.baseServings) || null;
  const resetBtn = document.querySelector('[data-reset-checks]');

  // ------------------------------------------------------------ scaler
  let mult = Number(store.get(`servings.${slug}`)) || 1;

  function paintScale() {
    labels.forEach((el) => { el.textContent = scaleIngredient(el.dataset.text, mult); });
    scaleBtns.forEach((b) => b.setAttribute('aria-pressed', String(Math.abs(Number(b.dataset.scale) - mult) < 1e-9)));
    if (baseServings) {
      const s = baseServings * mult;
      const n = Math.abs(s - Math.round(s)) < 0.01 ? String(Math.round(s)) : formatQty(s);
      if (servOut) servOut.textContent = `${n} ${s === 1 ? 'serving' : 'servings'}`;
      // hero "Serves" fact says the same number as the stepper
      if (servMeta?.dataset.baseServings) servMeta.textContent = n;
    }
    // non-numeric yield ("6 to 8", "3 medium-sized pizzas"): keep the words as written. The scale
    // control already shows the multiplier, and adding "(2×)" here re-wrapped the facts strip on phones.
    document.documentElement.style.setProperty('--recipe-scale', String(mult));
    paintReset();
  }
  function setScale(next) {
    mult = Math.max(0.05, Math.round(next * 1000) / 1000);
    store.update('servings', (o) => {
      const n = { ...(o && typeof o === 'object' ? o : {}) };
      if (mult === 1) delete n[slug]; else n[slug] = mult;
      return n;
    });
    paintScale();
  }
  scaleBtns.forEach((b) => b.addEventListener('click', () => setScale(Number(b.dataset.scale))));
  document.querySelectorAll('[data-servings-step]').forEach((b) => b.addEventListener('click', () => {
    if (!baseServings) return;
    const current = Math.max(1, Math.round(baseServings * mult));
    const next = Math.max(1, current + Number(b.dataset.servingsStep));
    setScale(next / baseServings);
  }));
  paintScale();

  // ------------------------------------------------------------ ingredient checks
  // a declaration (hoisted): paintScale() → paintReset() reads it before this line runs
  function getChecks() {
    const c = store.get(`checks.${slug}`);
    return Array.isArray(c) ? c : [];
  }
  function paintChecks() {
    const checks = new Set(getChecks());
    boxes.forEach((box) => {
      const on = checks.has(Number(box.dataset.index));
      box.checked = on;
      box.closest('.check-item')?.classList.toggle('check-item--done', on);
    });
    paintReset();
  }
  // "Reset scale & checks" is always in the layout (no jump when it becomes useful); it is just
  // disabled while the recipe is at 1× with nothing checked.
  function paintReset() {
    if (resetBtn) resetBtn.disabled = mult === 1 && getChecks().length === 0;
  }
  boxes.forEach((box) => box.addEventListener('change', () => {
    const idx = Number(box.dataset.index);
    store.update('checks', (o) => {
      const all = { ...(o && typeof o === 'object' ? o : {}) };
      const set = new Set(Array.isArray(all[slug]) ? all[slug] : []);
      if (box.checked) set.add(idx); else set.delete(idx);
      if (set.size) all[slug] = [...set].sort((a, b) => a - b); else delete all[slug];
      return all;
    });
    paintChecks();
  }));
  resetBtn?.addEventListener('click', () => {
    store.update('checks', (o) => { const all = { ...(o || {}) }; delete all[slug]; return all; });
    setScale(1);
    paintChecks();
    // the button just disabled itself; keep focus in the ingredients
    (boxes[0] || scaleBtns.find((b) => b.dataset.scale === '1'))?.focus();
    toast('Back to 1× with nothing checked', { icon: 'check' });
  });
  store.subscribe('checks', paintChecks);
  paintChecks();

  // ------------------------------------------------------------ add to list
  document.querySelectorAll('[data-add-to-list]').forEach((b) => b.addEventListener('click', () => openAddSheet(mult)));

  // ------------------------------------------------------------ cook mode
  document.querySelectorAll('[data-cook]').forEach((b) => b.addEventListener('click', () => openCookMode(mult)));

  // ------------------------------------------------------------ share / print
  document.querySelectorAll('[data-share]').forEach((b) => b.addEventListener('click', async () => {
    const link = document.querySelector('link[rel="canonical"]')?.href || location.href;
    const result = await shareText({ title: recipe.title, text: `${recipe.title}\n${link}` });
    if (result === 'copied') toast('Link copied to clipboard', { icon: 'check' });
  }));
  document.querySelectorAll('[data-print]').forEach((b) => b.addEventListener('click', () => window.print()));
}

// ---------------------------------------------------------------- helpers
function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function scaleLabel(m) {
  return m === 1 ? '' : ` (${formatQty(m)}×)`;
}

function openAddSheet(mult) {
  const form = document.createElement('form');
  form.className = 'add-sheet stack';
  form.style.setProperty('--gap', 'var(--space-2xs)');
  const items = recipe.ingredients.map((it, idx) => ({ ...it, idx }));
  form.innerHTML = `
    <div class="cluster cluster--between">
      <p class="text-muted" data-add-count></p>
      <button type="button" class="btn btn--ghost btn--sm" data-toggle-all>Select none</button>
    </div>
    <ul class="checklist checklist--select">${items.map((it) => {
      if (it.type === 'heading') return `<li class="check-item check-item--heading"><h3>${esc(it.text)}</h3></li>`;
      const text = scaleIngredient(it.text, mult);
      return `<li><label class="check-item"><input type="checkbox" class="check-item__input" name="ing" value="${it.idx}" checked><span class="check-item__box" aria-hidden="true"></span><span class="check-item__label">${esc(text)}</span></label></li>`;
    }).join('')}</ul>`;
  const boxes = [...form.querySelectorAll('input[name="ing"]')];
  const countEl = form.querySelector('[data-add-count]');
  const toggle = form.querySelector('[data-toggle-all]');
  let submit = null;

  function addChosen() {
    const chosen = boxes.filter((b) => b.checked).map((b) => recipe.ingredients[Number(b.value)]);
    if (!chosen.length) return false;
    const existing = new Set(listItems().filter((i) => i.recipe === recipe.slug && !i.checked).map((i) => i.text));
    const now = new Date().toISOString();
    const add = chosen
      .map((it) => scaleIngredient(it.text, mult))
      .filter((text) => !existing.has(text))
      .map((text) => ({ id: uid(), text, recipe: recipe.slug, recipeTitle: recipe.title, scale: mult, checked: false, addedAt: now }));
    if (add.length) {
      store.update('list', (l) => {
        const list = l && typeof l === 'object' ? { ...l } : {};
        list.view = list.view === 'combined' ? 'combined' : 'grouped';
        list.items = [...(Array.isArray(list.items) ? list.items : []), ...add];
        return list;
      });
    }
    const skipped = chosen.length - add.length;
    toast(add.length
      ? `Added ${add.length} ${add.length === 1 ? 'item' : 'items'} to your list${skipped ? ` (${skipped} already there)` : ''}`
      : 'Those items are already on your list', {
      icon: 'check',
      action: { label: 'View list', onClick: () => { location.href = url('list/'); } },
    });
    return true;
  }

  const paint = () => {
    const n = boxes.filter((b) => b.checked).length;
    countEl.textContent = `${n} of ${boxes.length} selected${scaleLabel(mult)}`;
    toggle.textContent = n === boxes.length ? 'Select none' : 'Select all';
    if (submit) {
      submit.disabled = n === 0;
      if (submit.lastChild) submit.lastChild.textContent = n ? `Add ${n} ${n === 1 ? 'item' : 'items'}` : 'Add to list';
    }
  };
  form.addEventListener('change', paint);
  toggle.addEventListener('click', () => {
    const all = boxes.every((b) => b.checked);
    boxes.forEach((b) => { b.checked = !all; });
    paint();
  });

  const sheet = openSheet({
    title: 'Add to shopping list',
    content: form,
    actions: [
      { label: 'Cancel', variant: 'secondary' },
      { label: 'Add to list', variant: 'primary', icon: 'cart', onClick: () => addChosen() },
    ],
  });
  submit = sheet.el.querySelector('.sheet__actions .btn--primary');
  form.addEventListener('submit', (e) => { e.preventDefault(); if (addChosen()) sheet.close(); });
  paint();
}

// ---------------------------------------------------------------- cook mode
function openCookMode(mult) {
  if (document.querySelector('.cook-mode')) return;
  const steps = [];
  let section = null;
  for (const s of recipe.instructions) {
    if (s.type === 'heading') section = s.text;
    else steps.push({ text: s.text, section });
  }
  if (!steps.length) return;
  const pageSteps = [...document.querySelectorAll('[data-steps] .step')];
  const done = new Set(pageSteps.map((el, i) => (el.classList.contains('step--done') ? i : -1)).filter((i) => i >= 0));
  let current = Math.max(0, steps.findIndex((_, i) => !done.has(i)));
  const opener = document.activeElement;

  const el = document.createElement('div');
  el.className = 'cook-mode';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', `Cook mode: ${recipe.title}`);
  el.innerHTML = `
    <div class="cook-mode__bar">
      <button type="button" class="btn btn--icon btn--ghost" data-cm-close aria-label="Exit cook mode">${icon('x', base)}</button>
      <p class="cook-mode__title">${esc(recipe.title)}</p>
      <p class="cook-mode__count" id="cm-count" data-cm-count aria-live="polite"></p>
      <button type="button" class="btn btn--ghost btn--sm" data-cm-ingredients>${icon('list', base)}<span>Ingredients</span></button>
    </div>
    <div class="cook-mode__progress" role="progressbar" aria-label="Progress" aria-valuemin="1" aria-valuemax="${steps.length}"></div>
    <div class="cook-mode__stage" data-cm-stage tabindex="-1" role="group" aria-labelledby="cm-count">
      <p class="cook-mode__heading" data-cm-section></p>
      <button type="button" class="cook-mode__step" data-cm-step aria-pressed="false"></button>
      <p class="cook-mode__hint" data-cm-hint></p>
    </div>
    <div class="cook-mode__nav">
      <button type="button" class="btn btn--secondary btn--lg" data-cm-prev>${icon('arrow-left', base)}<span>Back</span></button>
      <button type="button" class="btn btn--primary btn--lg" data-cm-next><span>Next</span>${icon('arrow-right', base)}</button>
    </div>`;

  const $ = (s) => el.querySelector(s);
  const stepBtn = $('[data-cm-step]');
  const progress = $('.cook-mode__progress');
  const nextBtn = $('[data-cm-next]');
  const prevBtn = $('[data-cm-prev]');
  const hint = $('[data-cm-hint]');
  const stage = $('[data-cm-stage]');
  const reduced = prefersReducedMotion();
  // the hint names the inputs this device actually has
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const hintText = touch
    ? 'Tap the step to mark it done · swipe to change steps'
    : 'Click the step to mark it done · ← → to change steps';

  function paint(animate = false) {
    const s = steps[current];
    $('[data-cm-count]').textContent = `Step ${current + 1} of ${steps.length}`;
    $('[data-cm-section]').textContent = s.section || '';
    $('[data-cm-section]').hidden = !s.section;
    stepBtn.textContent = s.text;
    const isDone = done.has(current);
    stepBtn.setAttribute('aria-pressed', String(isDone));
    // visual done state hook for CSS (check glyph etc.), on the step and its stage
    stepBtn.toggleAttribute('data-done', isDone);
    stage.toggleAttribute('data-done', isDone);
    hint.innerHTML = isDone
      ? `${icon('check', base)}<span>Done — tap again to undo</span>`
      : `<span>${hintText}</span>`;
    progress.style.setProperty('--progress', `${((current + 1) / steps.length) * 100}%`);
    progress.setAttribute('aria-valuenow', String(current + 1));
    prevBtn.disabled = current === 0;
    nextBtn.querySelector('span').textContent = current === steps.length - 1 ? 'Finish' : 'Next';
    pageSteps.forEach((p, i) => { p.classList.toggle('step--done', done.has(i)); p.toggleAttribute('data-done', done.has(i)); });
    if (animate) {
      // a new step always starts at its top, wherever the previous one was scrolled to
      stage.scrollTop = 0;
      el.scrollTop = 0;
    }
    if (animate && !reduced) {
      stepBtn.classList.remove('is-entering');
      void stepBtn.offsetWidth;
      stepBtn.classList.add('is-entering');
    }
  }
  function go(delta) {
    const n = current + delta;
    if (n >= steps.length) { done.add(current); paint(); close(); toast('All done — enjoy!'); return; }
    if (n < 0) return;
    if (delta > 0) done.add(current);
    current = n;
    paint(true);
  }

  // tap to toggle done (ignored if the pointer was a swipe)
  let sx = 0; let sy = 0; let swiped = false; let tracking = false;
  stepBtn.addEventListener('click', () => {
    if (swiped) { swiped = false; return; }
    if (done.has(current)) done.delete(current); else done.add(current);
    paint();
  });
  nextBtn.addEventListener('click', () => go(1));
  prevBtn.addEventListener('click', () => go(-1));
  $('[data-cm-ingredients]').addEventListener('click', () => {
    const list = document.createElement('ul');
    list.className = 'checklist';
    list.innerHTML = recipe.ingredients.map((it) => (it.type === 'heading'
      ? `<li class="check-item check-item--heading"><h3>${esc(it.text)}</h3></li>`
      : `<li class="check-item"><span class="check-item__box" aria-hidden="true"></span><span class="check-item__label">${esc(scaleIngredient(it.text, mult))}</span></li>`)).join('');
    openSheet({ title: `Ingredients${scaleLabel(mult)}`, content: list });
  });

  stage.addEventListener('pointerdown', (e) => { tracking = true; swiped = false; sx = e.clientX; sy = e.clientY; });
  stage.addEventListener('pointerup', (e) => {
    if (!tracking) return;
    tracking = false;
    const dx = e.clientX - sx;
    const dy = e.clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; go(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 350); }
  });
  stage.addEventListener('pointercancel', () => { tracking = false; });

  function onKey(e) {
    if (document.querySelector('dialog.sheet[open]')) return; // let an open sheet handle keys
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'Tab') {
      // keep focus inside the overlay
      const focusables = [...el.querySelectorAll('button:not(:disabled)')];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  // make the page behind inert while cooking
  const background = [...document.body.children].filter((c) => c.tagName !== 'SCRIPT' && !c.classList.contains('toast-region'));
  background.forEach((c) => { c.inert = true; });
  document.documentElement.classList.add('is-cooking');
  document.body.append(el);
  document.addEventListener('keydown', onKey);
  const release = keepAwake();

  function close() {
    release();
    document.removeEventListener('keydown', onKey);
    background.forEach((c) => { c.inert = false; });
    document.documentElement.classList.remove('is-cooking');
    el.remove();
    opener?.focus?.();
  }
  $('[data-cm-close]').addEventListener('click', close);

  paint();
  // Focus the undecorated stage (tabindex=-1), not the step button: a programmatic focus ring on the
  // big tap target reads as a selection and clips at the stage edges.
  stage.focus({ preventScroll: true, focusVisible: false });
}
