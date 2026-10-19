/**
 * DS / dom.js — tiny DOM helpers. No dependencies.
 * @module ds/dom
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_TAGS = new Set(['svg', 'use', 'path', 'g', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'symbol', 'defs', 'title']);

/**
 * querySelector shorthand.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element|null}
 */
export function $(selector, root = document) {
  try {
    return root ? root.querySelector(selector) : null;
  } catch {
    return null;
  }
}

/**
 * querySelectorAll shorthand that returns a real Array.
 * @param {string} selector
 * @param {ParentNode} [root=document]
 * @returns {Element[]}
 */
export function $$(selector, root = document) {
  try {
    return root ? Array.from(root.querySelectorAll(selector)) : [];
  } catch {
    return [];
  }
}

/**
 * Add an event listener, optionally delegated.
 *
 *   on(btn, 'click', e => ...)                         // direct
 *   on(document, 'click', '[data-fav]', (e, el) => ...) // delegated; el = matched element
 *   on('#list', 'change', 'input', handler)            // el may be a selector
 *
 * @param {EventTarget|string|null} el target or selector
 * @param {string} evt event name (space-separated for several)
 * @param {string|Function} selectorOrHandler delegate selector, or the handler
 * @param {Function} [handler] handler when delegating: (event, matchedEl) => void
 * @param {AddEventListenerOptions} [options]
 * @returns {() => void} unsubscribe
 */
export function on(el, evt, selectorOrHandler, handler, options) {
  const target = typeof el === 'string' ? $(el) : el;
  if (!target || typeof target.addEventListener !== 'function') return () => {};
  let listener;
  if (typeof selectorOrHandler === 'function') {
    const fn = selectorOrHandler;
    options = handler && typeof handler === 'object' ? handler : options;
    listener = (e) => fn(e, target);
  } else {
    const selector = selectorOrHandler;
    listener = (e) => {
      const origin = e.target instanceof Element ? e.target : e.target && e.target.parentElement;
      const match = origin && origin.closest(selector);
      if (match && (target === document || target === window || target.contains(match))) {
        handler(e, match);
      }
    };
  }
  const events = String(evt).split(/\s+/).filter(Boolean);
  events.forEach((name) => target.addEventListener(name, listener, options));
  return () => events.forEach((name) => target.removeEventListener(name, listener, options));
}

/**
 * Create an element (hyperscript). SVG tags get the SVG namespace automatically.
 *
 *   h('button', { class: 'btn btn--primary', type: 'button', onClick: fn }, 'Save')
 *   h('div', { dataset: { slug: 'banana-bread' }, style: { '--cat': 'var(--cat-bread)' } })
 *
 * Attribute rules: `class`/`className` set the class; `style` accepts a string or an
 * object (custom properties allowed); `dataset` is an object; `on<Event>` functions
 * become listeners; `true` sets an empty attribute; `false`/`null`/`undefined` skip.
 * Children: strings/numbers become text nodes (never parsed as HTML); arrays flatten;
 * null/false are skipped.
 *
 * @param {string} tag
 * @param {Object<string, any>|null} [attrs]
 * @param {...any} children
 * @returns {Element}
 */
export function h(tag, attrs, ...children) {
  const isSvg = SVG_TAGS.has(tag);
  const el = isSvg ? document.createElementNS(SVG_NS, tag) : document.createElement(tag);
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === false || value === null || value === undefined) continue;
      if (key === 'class' || key === 'className') {
        el.setAttribute('class', Array.isArray(value) ? value.filter(Boolean).join(' ') : String(value));
      } else if (key === 'style') {
        if (typeof value === 'string') el.setAttribute('style', value);
        else for (const [prop, v] of Object.entries(value)) {
          if (v === null || v === undefined || v === false) continue;
          if (prop.startsWith('--') || prop.includes('-')) el.style.setProperty(prop, String(v));
          else el.style[prop] = v;
        }
      } else if (key === 'dataset') {
        for (const [k, v] of Object.entries(value)) if (v !== null && v !== undefined) el.dataset[k] = String(v);
      } else if (/^on[A-Z]/.test(key) && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  } else if (attrs !== undefined && attrs !== null) {
    children.unshift(attrs);
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === true) continue;
    if (Array.isArray(child)) append(el, child);
    else if (child instanceof Node) el.appendChild(child);
    else el.appendChild(document.createTextNode(String(child)));
  }
}

/**
 * Site base path from <html data-base>, always ending in "/".
 * @returns {string}
 */
export function base() {
  const b = (document.documentElement && document.documentElement.dataset.base) || '/';
  return b.endsWith('/') ? b : `${b}/`;
}

/**
 * Build a site URL: url('recipes/banana-bread/') → '/illtrytobenice-v2/recipes/banana-bread/'.
 * Absolute URLs (with a scheme) are returned unchanged.
 * @param {string} [path='']
 * @returns {string}
 */
export function url(path = '') {
  const p = String(path);
  if (/^[a-z][a-z0-9+.-]*:/i.test(p)) return p;
  return base() + p.replace(/^\/+/, '');
}

/**
 * Build a sprite icon: <svg class="icon" aria-hidden="true"><use href=".../icons.svg#i-NAME"/></svg>.
 * @param {string} name icon name without the "i-" prefix (e.g. 'heart')
 * @param {{ class?: string, label?: string }} [opts] extra classes; label makes it non-decorative
 * @returns {SVGSVGElement}
 */
export function icon(name, opts = {}) {
  const svg = h('svg', { class: ['icon', opts.class].filter(Boolean).join(' '), focusable: 'false' });
  if (opts.label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', opts.label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }
  svg.appendChild(h('use', { href: url(`assets/img/icons.svg#i-${name}`) }));
  return /** @type {SVGSVGElement} */ (svg);
}

/**
 * Swap the sprite icon inside an element (first <use>).
 * @param {Element|null} el element containing an .icon
 * @param {string} name icon name without "i-"
 */
export function setIcon(el, name) {
  const use = el && (el.tagName && el.tagName.toLowerCase() === 'use' ? el : el.querySelector('use'));
  if (!use) return;
  const current = use.getAttribute('href') || use.getAttribute('xlink:href') || url('assets/img/icons.svg#i-x');
  use.setAttribute('href', current.replace(/#.*$/, `#i-${name}`));
}
