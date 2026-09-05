/*
 * WIKI ENGLISH — entry module. Wires the storage adapter, the pure state
 * functions and the DOM renderer together, and owns the interaction model
 * (node activation, the detail sheet, keyboard roving, module switching).
 */

import { COURSE, NODES, findNode } from './course-data.js';
import { LocalStorageAdapter, createStore } from './storage.js';
import {
  emptyProgress, computeStates, activeModule, completeNode, markVisited, dateKey,
} from './state.js';
import { createRenderer } from './render.js';

const $ = (id) => document.getElementById(id);
const nowIso = () => new Date().toISOString();
const todayKey = () => dateKey(new Date());

function boot() {
  const refs = {
    app: $('we-app'),
    navList: $('we-nav-list'),
    moduleNum: $('we-module-num'),
    moduleCount: $('we-module-count'),
    moduleName: $('we-module-name'),
    moduleGoal: $('we-module-goal'),
    moduleProgress: $('we-module-progress'),
    moduleProgressLabel: $('we-module-progress-label'),
    moduleTime: $('we-module-time'),
    moduleDots: $('we-module-dots'),
    prevModuleBtn: $('we-prev-module'),
    nextModuleBtn: $('we-next-module'),
    path: $('we-path'),
    detail: $('we-detail'),
    resultsBody: $('we-results-body'),
    widgetStreak: $('we-widget-streak'),
    widgetWeek: $('we-widget-week'),
    widgetBadges: $('we-widget-badges'),
    widgetFeedback: $('we-widget-feedback'),
    side: $('we-side'),
    scrim: $('we-scrim'),
    live: $('we-live'),
    livePanel: $('we-live-panel'),
  };

  const missing = Object.entries(refs).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { console.error('WIKI ENGLISH: missing DOM nodes:', missing.join(', ')); return; }

  const adapter = new LocalStorageAdapter();
  const store = createStore(adapter);

  const view = {
    moduleIndex: 0,
    selected: null,
    keyboardActivation: false,
  };
  const sheetMq = window.matchMedia('(max-width: 900px)');

  const renderer = createRenderer(refs, {
    // "start" / a level link may navigate away immediately — persist synchronously
    activate: (id) => activate(id),
    start: (id) => store.updateNow((p) => markVisited(p, id, nowIso())),
    markVisitedOnly: (id) => store.updateNow((p) => markVisited(p, id, nowIso())),
    markDone: (id) => doMarkDone(id),
    setModule: (i) => setModule(i),
    isPersistent: () => store.isPersistent(),
  });

  window.addEventListener('beforeunload', () => { try { store.flush(); } catch (e) { /* ignore */ } });
  window.addEventListener('pagehide', () => { try { store.flush(); } catch (e) { /* ignore */ } });

  /* ---- runtime DOM<->data drift guard ---- */
  const dataIds = new Set(NODES.map((e) => e.node.id));
  if (dataIds.size !== NODES.length) console.warn('WIKI ENGLISH: duplicate node ids in course-data.js');

  function renderAll() {
    const p = store.get();
    const { current } = computeStates(p);
    renderer.renderNav(currentSection());
    renderer.renderModuleHead(p, view.moduleIndex);
    renderer.renderPath(p, view.moduleIndex, current);
    renderer.renderDetail(view.selected, p);
    renderer.renderResults(p, todayKey());
    renderer.renderWidgets(p, todayKey());
    syncRovingTabindex();
  }

  function setModule(i) {
    view.moduleIndex = Math.max(0, Math.min(COURSE.length - 1, i));
    renderAll();
    refs.moduleName.focus?.();
  }

  function activate(id) {
    view.selected = id;
    const p = store.get();
    renderer.renderDetail(id, p);
    const entry = findNode(id);
    if (entry && COURSE.indexOf(entry.module) !== view.moduleIndex) {
      view.moduleIndex = COURSE.indexOf(entry.module);
      renderer.renderModuleHead(p, view.moduleIndex);
      renderer.renderPath(p, view.moduleIndex, computeStates(p).current);
      syncRovingTabindex();
    }
    markSelectedNode(id);
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
    } else if (result.gained > 0) {
      const ss = p.streak;
      renderer.flash('Qadam bajarildi. +' + result.gained + ' XP. Faol kunlar: ' + ss.count + '.');
    } else {
      renderer.announce('Bu qadam allaqachon bajarilgan.', true);
    }
    renderAll();
    markSelectedNode(view.selected);
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
    const p = store.get();
    const { current } = computeStates(p);
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
    const focusables = refs.side.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
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

  /* ---- global actions (export / reset) ---- */
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
    if (!window.confirm('Barcha natijalar shu qurilmadan o‘chiriladi. Davom etilsinmi?')) return;
    await store.reset();
    view.selected = null;
    view.moduleIndex = 0;
    renderAll();
    renderer.announce('Natijalar tozalandi.', true);
  }

  /* ---- active section tracking for the left nav ---- */
  const sectionIds = ['learning-path', 'jamoa', 'natijalar'];
  let activeSection = 'learning-path';
  function currentSection() { return activeSection; }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          activeSection = en.target.id === 'learning-path' ? 'path'
            : en.target.id === 'jamoa' ? 'team'
            : 'results';
          renderer.renderNav(activeSection);
        }
      }
    }, { rootMargin: '-45% 0px -45% 0px' });
    sectionIds.forEach((id) => { const n = $(id); if (n) io.observe(n); });
  }

  /* ---- go ---- */
  store.subscribe(() => renderAll());
  store.init().then(() => {
    view.moduleIndex = COURSE.indexOf(activeModule(store.get()));
    if (view.moduleIndex < 0) view.moduleIndex = 0;
    const cur = computeStates(store.get()).current;
    view.selected = cur || COURSE[view.moduleIndex].nodes[0].id;
    renderAll();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
