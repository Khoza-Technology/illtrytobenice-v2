/**
 * DS / sheet.js — bottom sheet (mobile) / centered dialog (≥640px) built on <dialog class="sheet">.
 *
 * Prebuilt markup:
 *   <button data-sheet-open="#servings-sheet">…</button>
 *   <dialog class="sheet" id="servings-sheet" aria-labelledby="servings-sheet-title">
 *     <header class="sheet__head">
 *       <h2 class="sheet__title" id="servings-sheet-title">Servings</h2>
 *       <button class="btn btn--icon btn--ghost sheet__close" type="button" data-sheet-close aria-label="Close">…</button>
 *     </header>
 *     <div class="sheet__body">…</div>
 *     <footer class="sheet__actions">…</footer>
 *   </dialog>
 *
 * @module ds/sheet
 */
import { h, icon } from './dom.js';
import { prefersReducedMotion } from './motion.js';

let bound = false;
let uid = 0;

function prepare(dialog) {
  if (dialog.dataset.sheetReady) return;
  dialog.dataset.sheetReady = '1';

  // Esc → animated close instead of instant
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    closeSheet(dialog);
  });

  // Click on the backdrop (outside the dialog box) closes
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside || (e.clientX === 0 && e.clientY === 0)) closeSheet(dialog);
  });
}

/**
 * Open a prebuilt <dialog class="sheet">.
 * @param {HTMLDialogElement|string} dialogOrSelector
 * @param {Element} [opener] element to refocus after closing
 * @returns {HTMLDialogElement|null}
 */
export function showSheet(dialogOrSelector, opener) {
  const dialog = typeof dialogOrSelector === 'string' ? document.querySelector(dialogOrSelector) : dialogOrSelector;
  if (!dialog) return null;
  prepare(dialog);
  dialog.classList.remove('is-closing');
  if (opener instanceof HTMLElement) dialog._opener = opener;
  else if (document.activeElement instanceof HTMLElement) dialog._opener = document.activeElement;
  try {
    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
  } catch {
    dialog.setAttribute('open', '');
  }
  dialog.dispatchEvent(new CustomEvent('sheet:open'));
  return dialog;
}

/**
 * Close a sheet with its exit animation. Fires 'close' on the dialog afterwards.
 * @param {HTMLDialogElement|string} dialogOrSelector
 * @param {string} [returnValue]
 */
export function closeSheet(dialogOrSelector, returnValue) {
  const dialog = typeof dialogOrSelector === 'string' ? document.querySelector(dialogOrSelector) : dialogOrSelector;
  if (!dialog || !dialog.open || dialog.classList.contains('is-closing')) return;
  const finish = () => {
    dialog.classList.remove('is-closing');
    try {
      if (typeof dialog.close === 'function') dialog.close(returnValue);
      else dialog.removeAttribute('open');
    } catch {
      dialog.removeAttribute('open');
    }
    const opener = dialog._opener;
    dialog._opener = null;
    if (opener && opener.isConnected && typeof opener.focus === 'function') {
      try { opener.focus({ preventScroll: true }); } catch { /* noop */ }
    }
  };
  if (prefersReducedMotion()) { finish(); return; }
  dialog.classList.add('is-closing');
  let done = false;
  const once = () => { if (!done) { done = true; finish(); } };
  dialog.addEventListener('animationend', once, { once: true });
  setTimeout(once, 320);
}

/**
 * Build and open a one-off sheet. It is removed from the DOM when closed.
 * @example
 *   const { close } = openSheet({
 *     title: 'Clear list?',
 *     content: 'This removes all 12 items.',
 *     actions: [
 *       { label: 'Cancel', variant: 'secondary' },
 *       { label: 'Clear list', variant: 'primary', onClick: () => store.set('list.items', []) },
 *     ],
 *   });
 * @param {{
 *   title: string,
 *   content?: Node|string,
 *   actions?: Array<{ label: string, variant?: 'primary'|'secondary'|'ghost', icon?: string,
 *                     onClick?: (e: MouseEvent, close: () => void) => (void|false), close?: boolean }>,
 *   onClose?: () => void,
 * }} opts  An action closes the sheet after onClick unless `close: false` or onClick returns false.
 * @returns {{ close: () => void, el: HTMLDialogElement }}
 */
export function openSheet({ title = '', content = '', actions = [], onClose } = {}) {
  const id = `sheet-${++uid}`;
  const titleId = `${id}-title`;
  let dialog;
  const close = () => closeSheet(dialog);

  const body = h('div', { class: 'sheet__body' });
  if (content instanceof Node) body.appendChild(content);
  else if (content !== null && content !== undefined && content !== '') body.appendChild(h('p', null, String(content)));

  const footer = actions && actions.length
    ? h('footer', { class: 'sheet__actions' }, actions.map((a) => h('button', {
        type: 'button',
        class: `btn btn--${a.variant || 'secondary'}`,
        onClick: (e) => {
          let result;
          try { if (typeof a.onClick === 'function') result = a.onClick(e, close); } catch (err) { console.error(err); }
          if (a.close !== false && result !== false) close();
        },
      }, a.icon ? icon(a.icon) : null, a.label)))
    : null;

  dialog = /** @type {HTMLDialogElement} */ (h('dialog', { class: 'sheet', id, 'aria-labelledby': titleId },
    h('header', { class: 'sheet__head' },
      h('h2', { class: 'sheet__title', id: titleId }, title),
      h('button', { type: 'button', class: 'btn btn--icon btn--ghost sheet__close', 'data-sheet-close': true, 'aria-label': 'Close' }, icon('x')),
    ),
    body,
    footer,
  ));

  dialog.addEventListener('close', () => {
    try { if (typeof onClose === 'function') onClose(); } finally { dialog.remove(); }
  }, { once: true });

  document.body.appendChild(dialog);
  showSheet(dialog);
  return { close, el: dialog };
}

/**
 * Bind [data-sheet-open="#id"] openers and [data-sheet-close] buttons (delegated, once).
 * Called by initDS().
 */
export function initSheets() {
  if (bound) return;
  bound = true;
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const opener = t.closest('[data-sheet-open]');
    if (opener) {
      e.preventDefault();
      showSheet(opener.getAttribute('data-sheet-open'), opener);
      return;
    }
    const closer = t.closest('[data-sheet-close]');
    if (closer) {
      const dialog = closer.closest('dialog');
      if (dialog) { e.preventDefault(); closeSheet(dialog, closer.getAttribute('value') || undefined); }
    }
  });
}
