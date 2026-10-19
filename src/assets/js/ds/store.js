/**
 * DS / store.js — the app's single persisted state (localStorage key "itbn:state").
 *
 * - Plain JSON only (this shape is the future sync/API payload).
 * - Versioned with a migration hook (`store.addMigration`).
 * - Cross-tab sync via the `storage` event.
 * - Every storage access is wrapped in try/catch; when storage is unavailable
 *   (private mode, blocked cookies, quota) the store keeps working in memory.
 *
 * @module ds/store
 */

export const STORAGE_KEY = 'itbn:state';
export const SCHEMA_VERSION = 1;

/** @returns {object} a fresh default state */
export function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    theme: 'system',
    favorites: [],
    list: { view: 'grouped', items: [] },
    checks: {},
    servings: {},
  };
}

/** @type {Map<number, (state: object) => object>} fromVersion → migrate fn */
const migrations = new Map();

/** @type {Set<{path: string, cb: Function, last: string}>} */
const subscribers = new Set();

let state = defaultState();
let persistent = false;

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const split = (path) => (path === undefined || path === null || path === '' ? [] : String(path).split('.').filter(Boolean));

function storage() {
  try {
    const ls = window.localStorage;
    return ls || null;
  } catch {
    return null;
  }
}

function readPath(obj, path) {
  let cur = obj;
  for (const key of split(path)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = cur[key];
  }
  return cur;
}

/** Fill missing top-level / nested keys from defaults without touching user data. */
function withDefaults(input) {
  const d = defaultState();
  const s = isObj(input) ? input : {};
  const out = { ...d, ...s };
  out.schemaVersion = SCHEMA_VERSION;
  if (!['system', 'light', 'dark'].includes(out.theme)) out.theme = 'system';
  if (!Array.isArray(out.favorites)) out.favorites = [];
  out.list = isObj(out.list) ? { ...d.list, ...out.list } : d.list;
  if (!Array.isArray(out.list.items)) out.list.items = [];
  if (!['grouped', 'combined'].includes(out.list.view)) out.list.view = 'grouped';
  if (!isObj(out.checks)) out.checks = {};
  if (!isObj(out.servings)) out.servings = {};
  return out;
}

function migrate(input) {
  if (!isObj(input)) return defaultState();
  let s = input;
  let v = Number(s.schemaVersion) || 0;
  let guard = 0;
  while (v < SCHEMA_VERSION && guard++ < 100) {
    const fn = migrations.get(v);
    try {
      if (fn) s = fn(clone(s)) || s;
    } catch (err) {
      console.warn('[store] migration from v%d failed', v, err);
    }
    v += 1;
  }
  return withDefaults(s);
}

function load() {
  const ls = storage();
  if (!ls) return defaultState();
  try {
    const raw = ls.getItem(STORAGE_KEY);
    persistent = true;
    return raw ? migrate(JSON.parse(raw)) : defaultState();
  } catch {
    return defaultState();
  }
}

function save() {
  const ls = storage();
  if (!ls) { persistent = false; return; }
  try {
    ls.setItem(STORAGE_KEY, JSON.stringify(state));
    persistent = true;
  } catch {
    persistent = false;
  }
}

function notify() {
  for (const sub of subscribers) {
    const value = readPath(state, sub.path);
    const json = JSON.stringify(value === undefined ? null : value);
    if (json === sub.last) continue;
    sub.last = json;
    try {
      sub.cb(clone(value), clone(state));
    } catch (err) {
      console.error('[store] subscriber error', err);
    }
  }
}

state = load();

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY && e.key !== null) return;
    try {
      state = e.newValue ? migrate(JSON.parse(e.newValue)) : defaultState();
    } catch {
      return;
    }
    notify();
  });
}

/**
 * The store singleton.
 * @namespace store
 */
export const store = {
  /**
   * Read a value by dot path ('' or omitted = whole state). Returns a deep copy.
   * @example store.get('list.items') // → []
   * @param {string} [path]
   * @returns {any}
   */
  get(path) {
    return clone(readPath(state, path));
  },

  /**
   * Write a value by dot path, persist, and notify subscribers. Intermediate
   * objects are created as needed. Setting '' replaces the whole state.
   * @example store.set('theme', 'dark')
   * @param {string} path
   * @param {any} value must be JSON-serialisable
   */
  set(path, value) {
    const keys = split(path);
    const next = clone(state);
    const v = clone(value);
    if (!keys.length) {
      state = withDefaults(v);
    } else {
      let cur = next;
      keys.slice(0, -1).forEach((k) => {
        if (!isObj(cur[k]) && !Array.isArray(cur[k])) cur[k] = {};
        cur = cur[k];
      });
      if (v === undefined) delete cur[keys[keys.length - 1]];
      else cur[keys[keys.length - 1]] = v;
      state = next;
    }
    save();
    notify();
  },

  /**
   * Read-modify-write. `fn` receives a copy of the current value and returns the new one.
   * @example store.update('favorites', (f = []) => [...f, 'banana-bread'])
   * @param {string} path
   * @param {(current: any) => any} fn
   */
  update(path, fn) {
    store.set(path, fn(store.get(path)));
  },

  /**
   * Subscribe to changes at (or below) a path. Fires only when the value at
   * `path` actually changes — including changes made in other tabs.
   * @example const off = store.subscribe('list.items', items => render(items))
   * @param {string} path '' for any change
   * @param {(value: any, state: object) => void} cb
   * @param {{ immediate?: boolean }} [opts] immediate: also call once now
   * @returns {() => void} unsubscribe
   */
  subscribe(path, cb, opts = {}) {
    const value = readPath(state, path);
    const sub = { path: path || '', cb, last: JSON.stringify(value === undefined ? null : value) };
    subscribers.add(sub);
    if (opts.immediate) {
      try { cb(clone(value), clone(state)); } catch (err) { console.error('[store] subscriber error', err); }
    }
    return () => subscribers.delete(sub);
  },

  /**
   * Serialise the whole state (pretty JSON string) for backup/sync.
   * @returns {string}
   */
  export() {
    return JSON.stringify(state, null, 2);
  },

  /**
   * Replace the state from a JSON string (or plain object). Runs migrations.
   * @param {string|object} json
   * @returns {boolean} true on success; false if the input could not be parsed
   */
  import(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      if (!isObj(data)) return false;
      state = migrate(data);
      save();
      notify();
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Register a migration that upgrades a state object from `fromVersion` to `fromVersion + 1`.
   * Bump SCHEMA_VERSION in this file when adding one.
   * @param {number} fromVersion
   * @param {(state: object) => object} fn
   */
  addMigration(fromVersion, fn) {
    if (typeof fn === 'function') migrations.set(Number(fromVersion), fn);
  },

  /** Reset to defaults (persists). */
  reset() {
    state = defaultState();
    save();
    notify();
  },

  /** @returns {boolean} whether state is actually being saved to localStorage */
  get persistent() {
    return persistent;
  },
};

export default store;
