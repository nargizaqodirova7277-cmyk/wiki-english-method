/*
 * WIKI ENGLISH — DOM rendering. Builds the learning path, unit banner,
 * detail panel and progress read-outs from course-data + a progress object.
 *
 * Safety: every string goes in through textContent / createElement / setAttribute.
 * No innerHTML anywhere. SVG icons are built with createElementNS (icons.js).
 */

import {
  COURSE, NODES, KINDS, NAV, GUIDE_LINKS, BADGES, VOCAB, findNode, formatDuration,
} from './course-data.js';
import {
  computeStates, moduleProgress, xpTotal, streakStatus, weeklyCount, summarise,
} from './state.js';
import { svgIcon, svgMark } from './icons.js';

const STATE_LABEL = {
  completed: 'Bajarilgan',
  current: 'Joriy qadam',
  available: 'Ochiq',
  locked: 'Qulflangan',
  'revision-needed': 'Qayta ishlash kerak',
};
const STATE_SHORT = {
  completed: 'Bajarildi',
  current: 'Joriy',
  available: 'Ochiq',
  locked: 'Qulflangan',
  'revision-needed': 'Qayta ishlash',
};

/* Uzbek sub-labels shown under each node title / in the detail panel. */
const KIND_UZ = {
  objectives: 'Maqsadlar', warmup: 'Warm-up', vocab: 'Texnik lug‘at', audio: 'Audio konsept-xarita',
  reading: 'O‘qish matni', comprehension: 'Tushunish savollari', language: 'Til qoidasi',
  tasks: 'Darajali topshiriq', conceptmap: 'Concept map', break: 'Qisqa tanaffus',
  homework: 'Uyga vazifa', wikiCreate: 'O‘z Wiki sahifangiz', peerFeedback: 'Sherik fikri',
  revise: 'Qayta tahrir', history: 'Wiki History', speaking: 'Og‘zaki taqdimot',
  checkpoint: 'Modul nazorati',
};

function el(tag, opts = {}, children = []) {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text != null) node.textContent = String(opts.text);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) {
    if (v === false || v == null) continue;
    node.setAttribute(k, v === true ? '' : String(v));
  }
  if (opts.on) for (const [evt, fn] of Object.entries(opts.on)) node.addEventListener(evt, fn);
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

function moduleMinutes(mod) {
  return mod.nodes.reduce((sum, n) => sum + (KINDS[n.kind].min || 8), 0);
}

/* ---- browser pronunciation (speechSynthesis), user-triggered only ---- */
let voiceCache = [];
const speechOK = typeof window !== 'undefined' && 'speechSynthesis' in window
  && typeof window.SpeechSynthesisUtterance === 'function';
if (speechOK) {
  const load = () => { try { voiceCache = window.speechSynthesis.getVoices() || []; } catch (e) { voiceCache = []; } };
  load();
  try { window.speechSynthesis.addEventListener('voiceschanged', load); } catch (e) { /* older engines */ }
}
function speak(text) {
  if (!speechOK) return;
  try {
    window.speechSynthesis.cancel();               // stop any previous utterance first
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.95;
    const en = voiceCache.find((v) => /^en([-_]|$)/i.test(v.lang || ''));
    if (en) u.voice = en;
    window.speechSynthesis.speak(u);
  } catch (e) { /* never throw from a click handler */ }
}

export function createRenderer(refs, handlers) {
  function announce(msg, panel = false) {
    const node = panel ? refs.livePanel : refs.live;
    if (!node) return;
    node.textContent = '';
    window.requestAnimationFrame(() => { node.textContent = msg; });
  }

  function renderNav(activeSectionId) {
    clear(refs.navList);
    for (const item of NAV) {
      const isActive = item.id === activeSectionId;
      const a = el('a', {
        class: 'we-nav-link',
        text: item.label,
        attrs: {
          href: item.href,
          'data-nav': item.id,
          'aria-current': isActive ? 'true' : false,
          rel: item.kind === 'external' ? 'noopener' : false,
          target: item.kind === 'external' ? '_blank' : false,
        },
      });
      if (item.kind === 'external') {
        a.appendChild(el('span', { class: 'we-ext', attrs: { 'aria-hidden': 'true' } }, svgMark('arrowUpRight', 'we-svg-xs')));
        a.appendChild(el('span', { class: 'we-sr', text: ' (yangi oynada)' }));
      }
      refs.navList.appendChild(el('li', {}, a));
    }
  }

  function renderModuleHead(progress, modIndex) {
    const mod = COURSE[modIndex];
    const mp = moduleProgress(progress, mod);
    refs.moduleNum.textContent = 'MODUL ' + String(mod.n).padStart(2, '0');
    refs.moduleName.textContent = mod.name;
    refs.moduleGoal.textContent = mod.goal;
    refs.moduleProgress.value = mp.pct;
    refs.moduleProgress.textContent = mp.pct + '%';
    refs.moduleMeta.textContent = mp.done + ' / ' + mp.total + ' qadam · taxminan ' + formatDuration(moduleMinutes(mod));

    clear(refs.moduleDots);
    COURSE.forEach((m, i) => {
      const full = moduleProgress(progress, m).pct === 100;
      refs.moduleDots.appendChild(el('button', {
        class: 'we-chip' + (i === modIndex ? ' is-current' : '') + (full ? ' is-done' : ''),
        text: String(m.n),
        attrs: {
          type: 'button',
          'aria-current': i === modIndex ? 'true' : false,
          'aria-label': 'Modul ' + m.n + ' — ' + m.name + (full ? ' (yakunlangan)' : '') + (i === modIndex ? ' (ochiq)' : ''),
        },
        on: { click: () => handlers.setModule(i) },
      }));
    });
    refs.prevModuleBtn.disabled = modIndex === 0;
    refs.nextModuleBtn.disabled = modIndex === COURSE.length - 1;
  }

  function renderPath(progress, modIndex, currentNodeId) {
    const mod = COURSE[modIndex];
    const { states } = computeStates(progress);
    clear(refs.path);
    refs.path.setAttribute('aria-label', 'Modul ' + mod.n + ' — ' + mod.name + ' o‘quv yo‘li');

    mod.nodes.forEach((node, i) => {
      const state = states.get(node.id);
      const kind = KINDS[node.kind];
      const isCurrent = node.id === currentNodeId;

      const medal = el('span', { class: 'we-node-medal', attrs: { 'aria-hidden': 'true' } }, svgIcon(node.kind, 'we-svg'));
      if (state === 'locked') medal.appendChild(el('span', { class: 'we-node-badge' }, svgMark('lock', 'we-svg-xs')));
      else if (state === 'completed') medal.appendChild(el('span', { class: 'we-node-badge' }, svgMark('check', 'we-svg-xs')));
      else if (state === 'revision-needed') medal.appendChild(el('span', { class: 'we-node-badge' }, svgMark('redo', 'we-svg-xs')));

      const label = el('span', { class: 'we-node-label' }, [
        el('span', { class: 'we-node-title', text: kind.label }),
        el('span', { class: 'we-node-sub', text: KIND_UZ[node.kind] || node.kind }),
        el('span', { class: 'we-node-pill', text: STATE_SHORT[state] }),
      ]);

      const hintId = 'we-hint-' + node.id;
      const btn = el('a', {
        class: 'we-node-btn',
        attrs: {
          href: node.href,
          'data-node': node.id,
          'aria-describedby': hintId,
          'aria-current': isCurrent ? 'step' : false,
          'aria-disabled': state === 'locked' ? 'true' : false,
          tabindex: isCurrent ? '0' : '-1',
          rel: node.external ? 'noopener' : false,
        },
        on: {
          click: (e) => { e.preventDefault(); handlers.activate(node.id); },
          keydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlers.activate(node.id); } },
        },
      }, [medal, label]);

      const hint = el('span', {
        class: 'we-sr', attrs: { id: hintId },
        text: 'Modul ' + mod.n + ', ' + (i + 1) + '-qadam (' + mod.nodes.length + ' dan). Faoliyat: '
          + kind.label + '. Holat: ' + STATE_LABEL[state] + '. '
          + (kind.xp > 0 ? kind.xp + ' XP.' : ''),
      });

      refs.path.appendChild(el('li', {
        class: 'we-node',
        attrs: { 'data-node': node.id, 'data-state': state, 'data-kind': node.kind, style: '--i:' + i },
      }, [btn, hint]));
    });
  }

  function ctaLabel(node, state, visited, done) {
    if (state === 'locked') return null;
    if (node.external) return 'GitHub Wiki’ni ochish';
    if (done) return 'Darsni qayta ko‘rish';
    if (visited) return 'Darsni davom ettirish';
    return 'Darsni boshlash';
  }

  function renderDetail(nodeId, progress) {
    const entry = nodeId ? findNode(nodeId) : null;
    clear(refs.detail);

    if (!entry) {
      refs.detail.appendChild(el('p', { class: 'we-detail-empty', text: 'Yo‘ldagi biror qadamni tanlang.' }));
      return;
    }

    const { node, module: mod, index } = entry;
    const kind = KINDS[node.kind];
    const state = computeStates(progress).states.get(node.id);
    const done = !!progress.completed[node.id];
    const visited = !!progress.visited[node.id];

    const head = el('div', { class: 'we-detail-head' }, [
      el('span', { class: 'we-detail-medal', attrs: { 'data-kind': node.kind, 'aria-hidden': 'true' } }, svgIcon(node.kind, 'we-svg')),
      el('div', {}, [
        el('p', { class: 'we-detail-eyebrow', text: 'MODUL ' + String(mod.n).padStart(2, '0') + ' · ' + (index + 1) + '/' + mod.nodes.length }),
        el('h2', { class: 'we-detail-title', text: kind.label, attrs: { id: 'we-detail-title', tabindex: '-1' } }),
        el('p', { class: 'we-detail-kind', text: (KIND_UZ[node.kind] || node.kind) + ' · ' + STATE_LABEL[state] }),
      ]),
    ]);
    refs.detail.appendChild(head);

    refs.detail.appendChild(el('div', { class: 'we-detail-meta' }, [
      el('span', { class: 'we-tag' }, [el('span', { class: 'we-tag-k', text: 'Vaqt' }), el('span', { text: '~' + kind.min + ' daqiqa' })]),
      el('span', { class: 'we-tag we-tag-xp' }, [el('span', { class: 'we-tag-k', text: 'XP' }), el('span', { text: kind.xp > 0 ? String(kind.xp) : 'yo‘q' })]),
    ]));
    refs.detail.appendChild(el('p', { class: 'we-detail-goal', text: node.goal }));

    if (node.levels && node.levels.length) {
      const wrap = el('div', { class: 'we-levels', attrs: { role: 'group', 'aria-label': 'Darajani tanlab, darsning shu qismini oching' } });
      for (const lvl of node.levels) {
        wrap.appendChild(el('a', {
          class: 'we-btn we-btn-ghost we-btn-sm',
          text: lvl.label,
          attrs: { href: lvl.href, rel: 'noopener' },
          on: { click: () => handlers.markVisitedOnly(node.id) },
        }));
      }
      refs.detail.appendChild(wrap);
    }

    const links = [];
    if (node.instructionsHref) links.push(['Yo‘riqnoma', node.instructionsHref]);
    if (node.rubricHref) links.push(['Baholash rubrikasi', node.rubricHref]);
    if (node.netiquetteHref) links.push(['Netiket qoidalari', node.netiquetteHref]);
    if (links.length) {
      const ul = el('ul', { class: 'we-detail-links' });
      for (const [label, href] of links) {
        ul.appendChild(el('li', {}, el('a', { text: label, attrs: { href, rel: 'noopener' } })));
      }
      refs.detail.appendChild(ul);
    }

    const actions = el('div', { class: 'we-detail-actions' });
    const cta = ctaLabel(node, state, visited, done);
    if (cta) {
      const startBtn = el('a', {
        class: 'we-btn we-btn-primary',
        attrs: { href: node.href, rel: 'noopener', target: node.external ? '_blank' : false },
        on: { click: () => handlers.start(node.id) },
      }, [document.createTextNode(cta)]);
      if (node.external) startBtn.appendChild(el('span', { class: 'we-btn-ic', attrs: { 'aria-hidden': 'true' } }, svgMark('arrowUpRight', 'we-svg-xs')));
      actions.appendChild(startBtn);
    } else {
      actions.appendChild(el('p', { class: 'we-detail-note', text: 'Bu qadam hali qulflangan — avvalgi qadamni tugating.' }));
    }

    const gateNeeded = kind.completion === 'visit' && !visited && !done && state !== 'locked';
    if (state !== 'locked') {
      const markBtn = el('button', {
        class: 'we-btn we-btn-secondary' + (done ? ' is-success' : ''),
        text: done ? 'Bajarildi ✓' : (node.kind === 'break' ? 'Tanaffusni belgilash' : 'Bajardim deb belgilash'),
        attrs: { type: 'button', disabled: done ? 'true' : false, 'aria-describedby': gateNeeded ? 'we-detail-gate' : false },
        on: { click: () => handlers.markDone(node.id) },
      });
      actions.appendChild(markBtn);
    }
    refs.detail.appendChild(actions);

    if (gateNeeded) {
      refs.detail.appendChild(el('p', {
        class: 'we-detail-gate', attrs: { id: 'we-detail-gate' },
        text: 'Avval “' + (cta || 'Darsni boshlash') + '”ni bosing — shundan so‘ng bu qadamni belgilash mumkin.',
      }));
    }
    if (node.external) {
      refs.detail.appendChild(el('p', {
        class: 'we-detail-note',
        text: 'Bu qadam GitHub Wiki’da bajariladi. Platforma uni tekshira olmaydi — ishni bajarganingizdan so‘ng belgilang.',
      }));
    }

    if (node.vocabKey && VOCAB[node.vocabKey]) {
      refs.detail.appendChild(buildFlashcards(VOCAB[node.vocabKey]));
    }
  }

  function buildFlashcards(terms) {
    const box = el('div', { class: 'we-flash', attrs: { 'aria-label': 'Lug‘at kartalari' } });
    box.appendChild(el('p', { class: 'we-flash-head', text: 'Tez mashq: terminni ko‘ring, ma’nosini eslang, keyin oching.' }));
    if (!speechOK) {
      box.appendChild(el('p', { class: 'we-flash-note', text: 'Brauzeringiz ovozli talaffuzni qo‘llab-quvvatlamaydi — terminni o‘zingiz ovoz chiqarib o‘qing.' }));
    }
    const list = el('ul', { class: 'we-flash-list' });
    terms.forEach((t) => {
      const answer = el('span', { class: 'we-flash-a', text: t.definition + ' — ' + t.example, attrs: { hidden: 'true' } });
      const toggle = el('button', {
        class: 'we-flash-btn',
        text: t.term,
        attrs: { type: 'button', 'aria-expanded': 'false' },
        on: {
          click: (e) => {
            const open = answer.hidden;
            answer.hidden = !open;
            e.currentTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
          },
        },
      });
      const row = el('div', { class: 'we-flash-row' }, [toggle]);
      if (speechOK) {
        row.appendChild(el('button', {
          class: 'we-flash-say',
          attrs: { type: 'button', 'aria-label': '“' + t.term + '” so‘zini inglizcha talaffuz qilish (brauzer ovozi)' },
          on: { click: () => speak(t.term) },
        }, svgMark('speak', 'we-svg-xs')));
      }
      list.appendChild(el('li', {}, [row, answer]));
    });
    box.appendChild(list);
    return box;
  }

  /* ---- the "Natijalar" section: full stat grid + badges ---- */
  function renderResults(progress, todayKey) {
    const s = summarise(progress);
    const total = xpTotal(progress);
    const ss = streakStatus(progress, todayKey);
    const week = weeklyCount(progress, todayKey);

    clear(refs.resultsBody);
    refs.resultsBody.appendChild(el('div', { class: 'we-stat-grid' }, [
      statCard('XP', String(total), 'xp'),
      statCard('Faol kunlar', String(progress.streak.count) + (ss === 'paused' ? ' · to‘xtatilgan' : ''), 'streak'),
      statCard('Shu hafta', week + ' / 7 kun', 'week'),
      statCard('Yakunlangan modul', s.modulesCompleted + ' / ' + COURSE.length, 'module'),
    ]));

    const badgeWrap = el('div', { class: 'we-badges', attrs: { 'aria-label': 'Nishonlar' } });
    for (const b of BADGES) {
      const earned = !!progress.badges[b.id];
      badgeWrap.appendChild(el('div', {
        class: 'we-badge' + (earned ? ' is-earned' : ''),
        attrs: { 'data-earned': earned ? 'true' : 'false' },
      }, [
        el('span', { class: 'we-badge-name', text: b.label }),
        el('span', { class: 'we-badge-desc', text: earned ? 'Olingan ✓' : b.desc }),
      ]));
    }
    refs.resultsBody.appendChild(badgeWrap);

    refs.resultsBody.appendChild(el('p', {
      class: 'we-detail-note',
      text: handlers.isPersistent()
        ? 'Nishonlar va XP faqat real faoliyatdan keyin beriladi. Peer-feedback qaydi bu qurilmada saqlanmaydi — Wiki sahifangizning Discussion bo‘limini tekshiring.'
        : 'Diqqat: bu brauzerda saqlash o‘chirilgan — natijalar sahifa yopilganda yo‘qoladi.',
    }));
  }

  function statCard(label, value, tone) {
    return el('div', { class: 'we-stat we-stat-' + tone }, [
      el('span', { class: 'we-stat-v', text: value }),
      el('span', { class: 'we-stat-k', text: label }),
    ]);
  }

  /* ---- compact stat chips for the right rail ---- */
  function renderStats(progress, todayKey) {
    const ss = streakStatus(progress, todayKey);
    const earned = BADGES.filter((b) => progress.badges[b.id]).length;
    clear(refs.stats);
    const chip = (v, k, tone) => el('div', { class: 'we-chipstat we-chipstat-' + tone }, [
      el('span', { class: 'we-chipstat-v', text: v }),
      el('span', { class: 'we-chipstat-k', text: k }),
    ]);
    refs.stats.appendChild(chip(String(xpTotal(progress)), 'XP', 'xp'));
    refs.stats.appendChild(chip(String(progress.streak.count) + (ss === 'paused' ? '·' : ''), 'faol kun', 'streak'));
    refs.stats.appendChild(chip(weeklyCount(progress, todayKey) + '/7', 'shu hafta', 'week'));
    refs.stats.appendChild(chip(earned + '/' + BADGES.length, 'nishon', 'badge'));
  }

  function flash(msg) { announce(msg); }

  function xpPop(gained) {
    if (!refs.xpLayer || !gained) return;
    const pop = el('span', { class: 'we-xp-pop', text: '+' + gained + ' XP' });
    refs.xpLayer.appendChild(pop);
    setTimeout(() => { pop.remove(); }, 1400);
  }

  return {
    renderNav, renderModuleHead, renderPath, renderDetail, renderResults, renderStats,
    announce, flash, xpPop,
  };
}

export { STATE_LABEL, GUIDE_LINKS };
