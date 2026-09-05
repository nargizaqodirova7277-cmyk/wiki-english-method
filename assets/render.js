/*
 * WIKI ENGLISH — DOM rendering. Builds the learning path, module header,
 * detail panel and results widgets from course-data + a progress object.
 *
 * Safety: all text goes in through textContent / createElement. No innerHTML
 * with dynamic or user-derived strings anywhere in this file.
 */

import { COURSE, NODES, KINDS, NAV, GUIDE_LINKS, BADGES, VOCAB, findNode } from './course-data.js';
import {
  computeStates, moduleProgress, xpTotal, streakStatus, weeklyCount, summarise,
} from './state.js';

const STATE_LABEL = {
  completed: 'Bajarilgan',
  current: 'Joriy qadam',
  available: 'Ochiq',
  locked: 'Qulflangan — avvalgi qadamni tugating',
  'revision-needed': 'Qayta ishlash kerak',
};
const STATE_ICON = {
  completed: '✔',
  current: '▶',
  available: '→',
  locked: '🔒',
  'revision-needed': '↻',
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

function estimateMinutes(mod) {
  // rough, honest: sum of a small per-kind estimate
  const per = { objectives: 4, warmup: 6, vocab: 12, audio: 8, reading: 10, comprehension: 8,
    language: 8, tasks: 25, conceptmap: 8, break: 5, homework: 30, wikiCreate: 40,
    peerFeedback: 20, revise: 25, history: 6, speaking: 15, checkpoint: 5 };
  return mod.nodes.reduce((sum, n) => sum + (per[n.kind] || 8), 0);
}
function kindMinutes(kind) {
  const per = { objectives: 4, warmup: 6, vocab: 12, audio: 8, reading: 10, comprehension: 8,
    language: 8, tasks: 25, conceptmap: 8, break: 5, homework: 30, wikiCreate: 40,
    peerFeedback: 20, revise: 25, history: 6, speaking: 15, checkpoint: 5 };
  return per[kind] || 8;
}

export function createRenderer(refs, handlers) {
  function announce(msg, panel = false) {
    const node = panel ? refs.livePanel : refs.live;
    if (!node) return;
    node.textContent = '';
    // force the AT to re-read even for the same string
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
        a.appendChild(el('span', { class: 'we-ext', text: ' ↗', attrs: { 'aria-hidden': 'true' } }));
        a.appendChild(el('span', { class: 'we-sr', text: ' (yangi oynada)' }));
      }
      refs.navList.appendChild(el('li', {}, a));
    }
  }

  function renderModuleHead(progress, modIndex) {
    const mod = COURSE[modIndex];
    const mp = moduleProgress(progress, mod);
    refs.moduleNum.textContent = 'Modul ' + mod.n + ' / ' + COURSE.length;
    refs.moduleCount.textContent = mp.done + ' / ' + mp.total + ' qadam';
    refs.moduleName.textContent = mod.name;
    refs.moduleGoal.textContent = mod.goal;
    refs.moduleProgress.value = mp.pct;
    refs.moduleProgress.textContent = mp.pct + '%';
    refs.moduleProgressLabel.textContent = mp.pct + '%';
    refs.moduleTime.textContent = '~' + estimateMinutes(mod) + ' daqiqa';

    clear(refs.moduleDots);
    COURSE.forEach((m, i) => {
      const full = moduleProgress(progress, m).pct === 100;
      const dot = el('button', {
        class: 'we-dot' + (i === modIndex ? ' is-active' : '') + (full ? ' is-full' : ''),
        attrs: {
          type: 'button',
          'aria-label': 'Modul ' + m.n + (full ? ' (yakunlangan)' : '') + (i === modIndex ? ' (ko‘rilmoqda)' : ''),
          'aria-current': i === modIndex ? 'true' : false,
        },
        on: { click: () => handlers.setModule(i) },
      });
      refs.moduleDots.appendChild(dot);
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

      const icon = el('span', { class: 'we-node-icon', text: kind.icon, attrs: { 'aria-hidden': 'true' } });
      const title = el('span', { class: 'we-node-title', text: kind.label });
      const stateText = el('span', { class: 'we-node-state', text: STATE_LABEL[state] });
      const sub = el('span', { class: 'we-node-kind', text: kindLabelUz(node.kind) });
      const main = el('span', { class: 'we-node-main' }, [title, sub, stateText]);
      const xp = kind.xp > 0
        ? el('span', { class: 'we-node-xp', text: kind.xp + ' XP', attrs: { 'aria-hidden': 'true' } })
        : el('span', { class: 'we-node-xp we-node-xp-none', text: '—', attrs: { 'aria-hidden': 'true' } });

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
          keydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlers.activate(node.id); }
          },
        },
      }, [icon, main, xp]);

      const hint = el('span', {
        class: 'we-sr', attrs: { id: hintId },
        text: 'Modul ' + mod.n + ', ' + (i + 1) + '-qadam (' + mod.nodes.length + ' dan). Holat: ' + STATE_LABEL[state] + '.',
      });

      const li = el('li', {
        class: 'we-node',
        attrs: { 'data-node': node.id, 'data-state': state, 'data-kind': node.kind, style: '--i:' + i },
      }, [btn, hint]);
      refs.path.appendChild(li);
    });
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
    const { states } = computeStates(progress);
    const state = states.get(node.id);
    const done = !!progress.completed[node.id];
    const visited = !!progress.visited[node.id];

    refs.detail.appendChild(el('p', { class: 'we-detail-eyebrow', text: 'Modul ' + mod.n + ' · ' + (index + 1) + '/' + mod.nodes.length }));
    refs.detail.appendChild(el('h2', { class: 'we-detail-title', text: kind.label, attrs: { id: 'we-detail-title', tabindex: '-1' } }));
    refs.detail.appendChild(el('p', { class: 'we-detail-kind', text: kindLabelUz(node.kind) }));

    const meta = el('ul', { class: 'we-detail-meta' }, [
      el('li', {}, [el('span', { class: 'we-meta-k', text: 'Holat' }), el('span', { class: 'we-meta-v', text: STATE_LABEL[state] })]),
      el('li', {}, [el('span', { class: 'we-meta-k', text: 'Taxminiy vaqt' }), el('span', { class: 'we-meta-v', text: '~' + kindMinutes(node.kind) + ' daqiqa' })]),
      el('li', {}, [el('span', { class: 'we-meta-k', text: 'XP' }), el('span', { class: 'we-meta-v', text: kind.xp > 0 ? String(kind.xp) : 'yo‘q' })]),
    ]);
    refs.detail.appendChild(meta);
    refs.detail.appendChild(el('p', { class: 'we-detail-goal', text: node.goal }));

    // level choices for the "levelled tasks" node
    if (node.levels && node.levels.length) {
      const wrap = el('div', { class: 'we-levels', attrs: { role: 'group', 'aria-label': 'Daraja tanlang' } });
      for (const lvl of node.levels) {
        wrap.appendChild(el('a', {
          class: 'we-btn we-btn-ghost we-level',
          text: lvl.label,
          attrs: { href: lvl.href, rel: 'noopener' },
          on: { click: () => handlers.markVisitedOnly(node.id) },
        }));
      }
      refs.detail.appendChild(wrap);
    }

    // instructions / rubric / netiquette links
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

    // primary action
    const actions = el('div', { class: 'we-detail-actions' });
    const startLabel = node.external
      ? 'GitHub Wiki’ni ochish ↗'
      : (visited ? 'Darsni qayta ochish' : (done ? 'Darsni ko‘rish' : 'Darsni boshlash'));
    const startBtn = el('a', {
      class: 'we-btn we-btn-primary',
      text: startLabel,
      attrs: {
        href: node.href,
        rel: 'noopener',
        target: node.external ? '_blank' : false,
      },
      on: { click: () => handlers.start(node.id) },
    });
    actions.appendChild(startBtn);

    if (node.kind === 'break') {
      actions.appendChild(el('button', {
        class: 'we-btn we-btn-secondary',
        text: done ? 'Bajarildi ✓' : 'Tanaffusni belgilash',
        attrs: { type: 'button', disabled: done ? 'true' : false },
        on: { click: () => handlers.markDone(node.id) },
      }));
    } else {
      const gateNeeded = kind.completion === 'visit' && !visited && !done;
      const markBtn = el('button', {
        class: 'we-btn we-btn-secondary',
        text: done ? 'Bajarildi ✓' : (node.external ? 'Bajardim deb belgilash' : 'Bajardim deb belgilash'),
        attrs: {
          type: 'button',
          disabled: done ? 'true' : false,
          'aria-describedby': gateNeeded ? 'we-detail-gate' : false,
        },
        on: { click: () => handlers.markDone(node.id) },
      });
      actions.appendChild(markBtn);
      if (gateNeeded) {
        actions.appendChild(el('p', {
          class: 'we-detail-gate', attrs: { id: 'we-detail-gate' },
          text: 'Avval “Darsni boshlash”ni bosing — shundan so‘ng bu qadamni belgilash mumkin.',
        }));
      }
      if (node.external) {
        actions.appendChild(el('p', {
          class: 'we-detail-note',
          text: 'Bu qadam GitHub Wiki’da bajariladi. Platforma uni tekshira olmaydi — ishni bajarganingizdan so‘ng belgilang.',
        }));
      }
    }
    refs.detail.appendChild(actions);

    // vocabulary flashcards (a real mini-exercise built from the wiki term table)
    if (node.vocabKey && VOCAB[node.vocabKey]) {
      refs.detail.appendChild(buildFlashcards(VOCAB[node.vocabKey]));
    }
  }

  function buildFlashcards(terms) {
    const box = el('div', { class: 'we-flash', attrs: { 'aria-label': 'Lug‘at kartalari' } });
    box.appendChild(el('p', { class: 'we-flash-head', text: 'Tez mashq: terminni ko‘ring, ma’nosini eslang, keyin oching.' }));
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
      list.appendChild(el('li', {}, [toggle, answer]));
    });
    box.appendChild(list);
    return box;
  }

  function renderResults(progress, todayKey) {
    const s = summarise(progress);
    const total = xpTotal(progress);
    const ss = streakStatus(progress, todayKey);
    const week = weeklyCount(progress, todayKey);
    const modulesDone = s.modulesCompleted;

    clear(refs.resultsBody);
    const grid = el('div', { class: 'we-stat-grid' }, [
      stat('XP', String(total), 'xp'),
      stat('Faol kunlar', String(progress.streak.count) + (ss === 'paused' ? ' (to‘xtatilgan)' : ''), 'streak'),
      stat('Shu hafta', String(week) + ' kun', 'week'),
      stat('Yakunlangan modul', modulesDone + ' / ' + COURSE.length, 'module'),
    ]);
    refs.resultsBody.appendChild(grid);

    const badgeWrap = el('div', { class: 'we-badges', attrs: { 'aria-label': 'Nishonlar' } });
    for (const b of BADGES) {
      const earned = !!progress.badges[b.id];
      badgeWrap.appendChild(el('div', {
        class: 'we-badge' + (earned ? ' is-earned' : ''),
        attrs: { 'data-earned': earned ? 'true' : 'false' },
      }, [
        el('span', { class: 'we-badge-icon', text: b.icon, attrs: { 'aria-hidden': 'true' } }),
        el('span', { class: 'we-badge-name', text: b.label }),
        el('span', { class: 'we-badge-desc', text: earned ? 'Olingan' : b.desc }),
      ]));
    }
    refs.resultsBody.appendChild(badgeWrap);

    refs.resultsBody.appendChild(el('p', {
      class: 'we-device-note',
      text: handlers.isPersistent()
        ? 'Natijalar shu brauzerda (localStorage) saqlanadi. Hech narsa serverga yuborilmaydi.'
        : 'Diqqat: bu brauzerda saqlash o‘chirilgan — natijalar sahifa yopilganda yo‘qoladi.',
    }));
  }

  function stat(label, value, tone) {
    return el('div', { class: 'we-stat we-stat-' + tone }, [
      el('span', { class: 'we-stat-v', text: value }),
      el('span', { class: 'we-stat-k', text: label }),
    ]);
  }

  function renderWidgets(progress, todayKey) {
    const ss = streakStatus(progress, todayKey);
    clear(refs.widgetStreak);
    refs.widgetStreak.appendChild(el('span', { class: 'we-widget-v', text: String(progress.streak.count) }));
    refs.widgetStreak.appendChild(el('span', { class: 'we-widget-k', text: ss === 'paused' ? 'faol kun (to‘xtatilgan)' : (ss === 'none' ? 'faol kun — hali yo‘q' : 'faol kun ketma-ket') }));

    clear(refs.widgetWeek);
    refs.widgetWeek.appendChild(el('span', { class: 'we-widget-v', text: String(weeklyCount(progress, todayKey)) + '/7' }));
    refs.widgetWeek.appendChild(el('span', { class: 'we-widget-k', text: 'shu hafta faol kun' }));

    const earned = BADGES.filter((b) => progress.badges[b.id]);
    clear(refs.widgetBadges);
    refs.widgetBadges.appendChild(el('span', { class: 'we-widget-v', text: earned.length + '/' + BADGES.length }));
    refs.widgetBadges.appendChild(el('span', { class: 'we-widget-k', text: earned.length ? earned.map((b) => b.label).join(', ') : 'nishon — hali yo‘q' }));

    clear(refs.widgetFeedback);
    refs.widgetFeedback.appendChild(el('span', { class: 'we-widget-k', text: 'Bu qurilmada peer-feedback qaydi yo‘q. Sherik fikri Wiki sahifangizning Discussion bo‘limida bo‘ladi.' }));
    refs.widgetFeedback.appendChild(el('a', { class: 'we-widget-link', text: 'Wiki’ni ochish ↗', attrs: { href: NAV[1].href, target: '_blank', rel: 'noopener' } }));
  }

  function flash(msg) {
    announce(msg);
  }

  return { renderNav, renderModuleHead, renderPath, renderDetail, renderResults, renderWidgets, announce, flash };
}

/* Uzbek sub-labels shown under each node title. */
function kindLabelUz(kind) {
  return {
    objectives: 'Maqsadlar', warmup: 'Warm-up', vocab: 'Texnik lug‘at', audio: 'Audio',
    reading: 'O‘qish', comprehension: 'Tushunish savollari', language: 'Til qoidasi',
    tasks: 'Darajali topshiriq', conceptmap: 'Concept map', break: 'Qisqa tanaffus',
    homework: 'Uyga vazifa', wikiCreate: 'O‘z Wiki sahifangiz', peerFeedback: 'Sherik fikri',
    revise: 'Qayta tahrir', history: 'Wiki History', speaking: 'Og‘zaki taqdimot',
    checkpoint: 'Modul nazorati',
  }[kind] || kind;
}

export { STATE_LABEL, STATE_ICON };
