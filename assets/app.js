/*
 * WIKI ENGLISH — entry module. Wires the storage adapter, the pure state
 * functions and the DOM renderer together, and owns the interaction model
 * (node activation, the mobile detail sheet, keyboard roving, module switching,
 * unlock / completion micro-animations, the loading state).
 */

import { COURSE, NODES, findNode } from './course-data.js';
import { LocalStorageAdapter, createStore } from './storage.js';
import {
  computeStates, activeModule, completeNode, markVisited, dateKey,
} from './state.js';
import { createRenderer } from './render.js';

const $ = (id) => document.getElementById(id);
const nowIso = () => new Date().toISOString();
const todayKey = () => dateKey(new Date());
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function boot() {
  const refs = {
    app: $('we-app'),
    navList: $('we-nav-list'),
    moduleNum: $('we-module-num'),
    moduleName: $('we-module-name'),
    moduleGoal: $('we-module-goal'),
    moduleProgress: $('we-module-progress'),
    moduleMeta: $('we-module-meta'),
    moduleDots: $('we-module-dots'),
    prevModuleBtn: $('we-prev-module'),
    nextModuleBtn: $('we-next-module'),
    path: $('we-path'),
    detail: $('we-detail'),
    resultsBody: $('we-results-body'),
    stats: $('we-stats'),
    side: $('we-side'),
    scrim: $('we-scrim'),
    live: $('we-live'),
    livePanel: $('we-live-panel'),
    xpLayer: $('we-xp-pop-layer'),
  };

  const missing = Object.entries(refs).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error('WIKI ENGLISH: missing DOM nodes:', missing.join(', ')); return; }

  const adapter = new LocalStorageAdapter();
  const store = createStore(adapter);

  const view = { moduleIndex: 0, selected: null, keyboardActivation: false, booted: false };
  const sheetMq = window.matchMedia('(max-width: 960px)');
  let prevStates = new Map();

  // keep the "how it works" strip out of the way on small screens
  if (sheetMq.matches) { const how = document.querySelector('.we-how'); if (how) how.open = false; }

  const renderer = createRenderer(refs, {
    activate: (id) => activate(id),
    start: (id) => store.updateNow((p) => markVisited(p, id, nowIso())),
    markVisitedOnly: (id) => store.updateNow((p) => markVisited(p, id, nowIso())),
    markDone: (id) => doMarkDone(id),
    setModule: (i) => setModule(i),
    isPersistent: () => store.isPersistent(),
  });

  window.addEventListener('beforeunload', () => { try { store.flush(); } catch (e) { /* ignore */ } });
  window.addEventListener('pagehide', () => { try { store.flush(); } catch (e) { /* ignore */ } });

  const dataIds = new Set(NODES.map((e) => e.node.id));
  if (dataIds.size !== NODES.length) console.warn('WIKI ENGLISH: duplicate node ids in course-data.js');

  function renderAll(animate = false) {
    const p = store.get();
    const { current, states } = computeStates(p);
    renderer.renderNav(currentSection());
    renderer.renderModuleHead(p, view.moduleIndex);
    renderer.renderPath(p, view.moduleIndex, current);
    renderer.renderDetail(view.selected, p);
    renderer.renderResults(p, todayKey());
    renderer.renderStats(p, todayKey());
    syncRovingTabindex();
    markSelectedNode(view.selected);
    if (animate) applyTransitions(states);
    prevStates = states;
    if (!view.booted) {
      view.booted = true;
      refs.app.removeAttribute('data-loading');
    }
  }

  /* brief unlock / completion feedback on nodes whose state changed */
  function applyTransitions(states) {
    if (reduceMotion.matches) return;
    for (const li of refs.path.querySelectorAll('.we-node')) {
      const id = li.dataset.node;
      const before = prevStates.get(id);
      const after = states.get(id);
      if (!before || before === after) continue;
      let cls = null;
      if (after === 'completed') cls = 'we-just-completed';
      else if (before === 'locked' && after !== 'locked') cls = 'we-just-unlocked';
      if (!cls) continue;
      li.classList.add(cls);
      setTimeout(() => li.classList.remove(cls), 1000);
    }
  }

  function setModule(i) {
    view.moduleIndex = Math.max(0, Math.min(COURSE.length - 1, i));
    renderAll();
    const banner = $('learning-path');
    if (banner && banner.focus) banner.focus();
  }

  function activate(id) {
    view.selected = id;
    const p = store.get();
    const entry = findNode(id);
    if (entry && COURSE.indexOf(entry.module) !== view.moduleIndex) {
      view.moduleIndex = COURSE.indexOf(entry.module);
    }
    renderAll();
    if (sheetMq.matches) openSheet();
    else if (view.keyboardActivation) focusDetailTitle();
    view.keyboardActivation = false;
  }

  function doMarkDone(id) {
    let result = { gained: 0, error: null };
    store.update((p) => { result = completeNode(p, id, todayKey(), nowIso()); });
    const p = store.get();
    if (result.error === 'open-lesson-first') {
      renderer.announce('Avval “Darsni boshlash”ni bosing, keyin bu qadamni belgilash mumkin.', true);
      renderAll();
      return;
    }
    if (result.gained > 0) {
      renderer.flash('Qadam bajarildi. +' + result.gained + ' XP. Faol kunlar: ' + p.streak.count + '.');
      renderer.xpPop(result.gained);
    } else {
      renderer.announce('Bu qadam allaqachon bajarilgan.', true);
    }
    renderAll(true);
  }

  /* ---- selection highlight + roving tabindex ---- */
  function markSelectedNode(id) {
    for (const li of refs.path.querySelectorAll('.we-node')) {
      li.classList.toggle('is-selected', li.dataset.node === id);
    }
  }
  function nodeButtons() { return Array.from(refs.path.querySelectorAll('.we-node-btn')); }
  function syncRovingTabindex() {
    const btns = nodeButtons();
    if (!btns.length) return;
    const { current } = computeStates(store.get());
    let idx = btns.findIndex((b) => b.dataset.node === current);
    if (idx < 0) idx = btns.findIndex((b) => b.dataset.node === view.selected);
    if (idx < 0) idx = 0;
    btns.forEach((b, i) => b.setAttribute('tabindex', i === idx ? '0' : '-1'));
  }
  refs.path.addEventListener('keydown', (e) => {
    const btns = nodeButtons();
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = Math.min(btns.length - 1, i + 1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = Math.max(0, i - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = btns.length - 1;
    if (next == null) return;
    e.preventDefault();
    btns.forEach((b, k) => b.setAttribute('tabindex', k === next ? '0' : '-1'));
    btns[next].focus();
    view.keyboardActivation = true;
  });
  refs.path.addEventListener('pointerdown', () => { view.keyboardActivation = false; });

  /* ---- detail sheet (mobile) ---- */
  function openSheet() {
    refs.app.classList.add('is-sheet-open');
    refs.scrim.hidden = false;
    document.body.style.overflow = 'hidden';
    focusDetailTitle();
    document.addEventListener('keydown', sheetKeydown, true);
  }
  function closeSheet() {
    if (!refs.app.classList.contains('is-sheet-open')) return;
    refs.app.classList.remove('is-sheet-open');
    refs.scrim.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', sheetKeydown, true);
    const back = view.selected && refs.path.querySelector('.we-node-btn[data-node="' + cssEscape(view.selected) + '"]');
    if (back) back.focus();
  }
  function focusDetailTitle() {
    const t = document.getElementById('we-detail-title');
    if (t) t.focus();
  }
  function sheetKeydown(e) {
    if (!refs.app.classList.contains('is-sheet-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
    if (e.key !== 'Tab') return;
    const focusables = refs.side.querySelectorAll('a[href], button:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  refs.scrim.addEventListener('click', closeSheet);
  sheetMq.addEventListener('change', (e) => { if (!e.matches) closeSheet(); });

  function cssEscape(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/"/g, '\\"'); }

  /* ---- module nav buttons ---- */
  refs.prevModuleBtn.addEventListener('click', () => setModule(view.moduleIndex - 1));
  refs.nextModuleBtn.addEventListener('click', () => setModule(view.moduleIndex + 1));

  /* ---- global actions (export / reset / close-sheet) ---- */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'export') exportProgress();
    else if (action === 'reset') resetProgress();
    else if (action === 'close-sheet') closeSheet();
  });

  function exportProgress() {
    const json = JSON.stringify(store.get(), null, 2);
    const box = $('we-export-box');
    if (box) {
      box.value = json;
      box.hidden = false;
      box.focus();
      box.select();
      renderer.announce('Natija JSON matni quyida — nusxa oling.', true);
    }
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wiki-english-progress.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (err) { /* the textarea fallback above still works */ }
  }

  async function resetProgress() {
    if (!window.confirm('DIQQAT: barcha XP, faol kunlar, nishonlar va bajarilgan qadamlar shu qurilmadan o‘chiriladi va tiklab bo‘lmaydi. Davom etilsinmi?')) return;
    await store.reset();
    view.selected = null;
    view.moduleIndex = 0;
    prevStates = new Map();
    renderAll();
    renderer.announce('Natijalar tozalandi.', true);
  }

  /* ---- active section tracking for the left nav ---- */
  const sectionIds = ['learning-path', 'jamoa', 'natijalar'];
  let activeSection = 'path';
  function currentSection() { return activeSection; }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        activeSection = en.target.id === 'learning-path' ? 'path'
          : en.target.id === 'jamoa' ? 'team' : 'results';
        renderer.renderNav(activeSection);
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    sectionIds.forEach((id) => { const n = $(id); if (n) io.observe(n); });
  }

  /* ---- go ---- */
  store.subscribe(() => renderAll());
  store.init().then(() => {
    const mod = activeModule(store.get());
    view.moduleIndex = Math.max(0, COURSE.indexOf(mod));
    const cur = computeStates(store.get()).current;
    view.selected = cur || COURSE[view.moduleIndex].nodes[0].id;
    prevStates = computeStates(store.get()).states;
    renderAll();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
