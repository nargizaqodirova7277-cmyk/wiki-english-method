/*
 * WIKI ENGLISH — progress persistence.
 *
 * There is NO backend in this project. Progress lives in this browser only
 * (localStorage). `createStore` and the adapter interface (load / save / clear /
 * subscribe, all Promise-returning) are the seam where a future server-backed
 * `RemoteAdapter` drops in without touching app.js.
 */

import { emptyProgress, migrate } from './state.js';

export const STORAGE_KEY = 'wikienglish.progress.v1';

function localStorageWorks() {
  try {
    const probe = '__wikienglish_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch (err) {
    return false;
  }
}

export class LocalStorageAdapter {
  constructor() {
    this.available = localStorageWorks();
    this._memory = null;            // in-memory fallback when storage is blocked
    this._listeners = new Set();
    if (this.available && typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', (event) => {
        if (event.key === STORAGE_KEY) this._listeners.forEach((fn) => fn());
      });
    }
  }

  async load() {
    if (!this.available) {
      return this._memory ? migrate(this._memory) : emptyProgress();
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? migrate(JSON.parse(raw)) : emptyProgress();
    } catch (err) {
      console.warn('WIKI ENGLISH: saved progress was unreadable, starting fresh.', err);
      return emptyProgress();
    }
  }

  async save(state) {
    const json = JSON.stringify(state);
    if (!this.available) { this._memory = JSON.parse(json); return; }
    try {
      window.localStorage.setItem(STORAGE_KEY, json);
    } catch (err) {
      console.warn('WIKI ENGLISH: progress could not be saved on this device.', err);
      this.available = false;
      this._memory = JSON.parse(json);
    }
  }

  async clear() {
    this._memory = null;
    if (!this.available) return;
    try { window.localStorage.removeItem(STORAGE_KEY); } catch (err) { /* nothing to do */ }
  }

  subscribe(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }
}

/*
 * RemoteAdapter seam (intentionally not implemented — no server exists yet):
 *
 *   export class RemoteAdapter {
 *     constructor(baseUrl, token) { this.baseUrl = baseUrl; this.token = token; this.available = true; }
 *     _headers() { return { 'content-type': 'application/json', authorization: 'Bearer ' + this.token }; }
 *     async load()      { const r = await fetch(this.baseUrl, { headers: this._headers() }); return migrate(await r.json()); }
 *     async save(state) { await fetch(this.baseUrl, { method: 'PUT', headers: this._headers(), body: JSON.stringify(state) }); }
 *     async clear()     { await fetch(this.baseUrl, { method: 'DELETE', headers: this._headers() }); }
 *     subscribe(fn)     { const es = new EventSource(this.baseUrl + '/stream'); es.onmessage = () => fn(); return () => es.close(); }
 *   }
 *
 * Swap one line in app.js: createStore(new LocalStorageAdapter())
 *                       -> createStore(new RemoteAdapter(url, token))
 */

export function createStore(adapter) {
  let state = null;
  const subscribers = new Set();
  let saveTimer = null;

  const emit = () => subscribers.forEach((fn) => fn(state));

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveTimer = null; adapter.save(state); }, 250);
  }

  return {
    async init() {
      state = await adapter.load();
      if (typeof adapter.subscribe === 'function') {
        adapter.subscribe(async () => { state = await adapter.load(); emit(); });
      }
      return state;
    },
    get() { return state; },
    /* mutator receives the live state object; mutate it in place */
    update(mutator) {
      mutator(state);
      scheduleSave();
      emit();
      return state;
    },
    /* like update(), but persist synchronously — use before the page may navigate
       away (e.g. following a lesson link) so the write is not lost to a dropped timer */
    updateNow(mutator) {
      mutator(state);
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      adapter.save(state);
      emit();
      return state;
    },
    async flush() {
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      await adapter.save(state);
    },
    async reset() {
      await adapter.clear();
      state = await adapter.load();
      emit();
      return state;
    },
    subscribe(fn) { subscribers.add(fn); return () => subscribers.delete(fn); },
    isPersistent() { return adapter.available !== false; },
  };
}
