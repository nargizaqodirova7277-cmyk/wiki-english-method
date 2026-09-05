/*
 * Pure-logic tests for WIKI ENGLISH. No browser, no dependencies.
 * Run:  node --test website/assets/state.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { COURSE, NODES, KINDS, BADGES, findNode } from './course-data.js';
import {
  emptyProgress, migrate, completeNode, markVisited, recordActivity,
  computeStates, xpTotal, summarise, moduleProgress, streakStatus,
  weeklyCount, predecessorId, previousDay, dateKey,
} from './state.js';

const ISO = '2026-09-05T10:00:00.000Z';
const firstId = COURSE[0].nodes[0].id;         // m1-objectives

/* helper: drive a node to done, satisfying the visit gate for 'visit' kinds */
function finish(progress, nodeId, dayKey = '2026-09-05') {
  markVisited(progress, nodeId, ISO);
  return completeNode(progress, nodeId, dayKey, ISO);
}

test('course shape: 153 ordered nodes, unique ids, non-empty hrefs', () => {
  assert.equal(NODES.length, 12 + 11 + 10 * 13);
  const ids = NODES.map((e) => e.node.id);
  assert.equal(new Set(ids).size, ids.length, 'node ids must be unique');
  for (const { node } of NODES) {
    assert.ok(typeof node.href === 'string' && node.href.length > 0, node.id + ' href');
    assert.ok(KINDS[node.kind], node.id + ' kind ' + node.kind + ' is known');
  }
});

test('every module ends with a checkpoint and has one wiki/peer/revise/speaking node', () => {
  for (const mod of COURSE) {
    assert.equal(mod.nodes[mod.nodes.length - 1].kind, 'checkpoint', 'module ' + mod.n);
    for (const k of ['wikiCreate', 'peerFeedback', 'revise', 'history', 'speaking']) {
      assert.equal(mod.nodes.filter((n) => n.kind === k).length, 1, 'module ' + mod.n + ' has one ' + k);
    }
  }
});

test('predecessor of a module-first node is the previous module checkpoint', () => {
  const m3first = findNode('m3-objectives');
  assert.equal(predecessorId(m3first), 'm2-checkpoint');
  const m1first = findNode(firstId);
  assert.equal(predecessorId(m1first), null);
});

test('fresh progress: only the very first node is current, the rest locked', () => {
  const p = emptyProgress();
  const { states, current } = computeStates(p);
  assert.equal(current, firstId);
  assert.equal(states.get(firstId), 'current');
  let currents = 0;
  for (const s of states.values()) if (s === 'current' || s === 'revision-needed') currents += 1;
  assert.equal(currents, 1, 'exactly one actionable node');
  assert.equal(states.get('m1-vocab'), 'locked');
  assert.equal(states.get('m3-objectives'), 'locked');
});

test('unlock sequence: completing in order always yields exactly one current, next module stays locked', () => {
  const p = emptyProgress();
  const m1 = COURSE[0].nodes;
  for (let i = 0; i < m1.length; i += 1) {
    const { states, current } = computeStates(p);
    assert.equal(current, m1[i].id, 'step ' + i);
    assert.equal(states.get('m2-objectives'), 'locked', 'M2 locked until M1 checkpoint');
    const res = finish(p, m1[i].id);
    assert.equal(res.error, null, m1[i].id + ' completes');
  }
  const after = computeStates(p);
  assert.equal(after.current, 'm2-objectives', 'M2 unlocks after M1 checkpoint');
  assert.equal(after.states.get('m1-checkpoint'), 'completed');
});

test('XP is awarded exactly once per node', () => {
  const p = emptyProgress();
  const a = finish(p, firstId);
  assert.equal(a.gained, KINDS.objectives.xp);
  assert.equal(xpTotal(p), KINDS.objectives.xp);
  const b = finish(p, firstId);              // press again
  assert.equal(b.gained, 0);
  assert.equal(b.error, null);
  assert.equal(xpTotal(p), KINDS.objectives.xp, 'total unchanged on repeat');
});

test('visit gate: a "visit" node cannot be completed before it was opened', () => {
  const p = emptyProgress();
  const blocked = completeNode(p, firstId, '2026-09-05', ISO);
  assert.equal(blocked.error, 'open-lesson-first');
  assert.equal(xpTotal(p), 0);
  markVisited(p, firstId, ISO);
  const ok = completeNode(p, firstId, '2026-09-05', ISO);
  assert.equal(ok.error, null);
  assert.equal(ok.gained, KINDS.objectives.xp);
});

test('external nodes (wiki create/peer/revise/history) have no visit gate', () => {
  const p = emptyProgress();
  // fast-forward through module 1 up to the wiki-create node
  for (const n of COURSE[0].nodes) {
    if (n.id === 'm1-wiki') break;
    finish(p, n.id);
  }
  const res = completeNode(p, 'm1-wiki', '2026-09-05', ISO);   // no markVisited
  assert.equal(res.error, null);
  assert.equal(res.gained, KINDS.wikiCreate.xp);
});

test('streak counts calendar days of real activity, not page opens', () => {
  const p = emptyProgress();
  finish(p, 'm1-objectives', '2026-09-05');
  markVisited(p, 'm1-vocab', ISO);
  completeNode(p, 'm1-vocab', '2026-09-05', ISO);              // 2nd finish same day
  assert.equal(p.streak.count, 1);
  assert.equal(p.activityDates.length, 1);

  markVisited(p, 'm1-audio', ISO);
  completeNode(p, 'm1-audio', '2026-09-06', ISO);              // next day
  assert.equal(p.streak.count, 2);

  markVisited(p, 'm1-tasks', ISO);
  completeNode(p, 'm1-tasks', '2026-09-08', ISO);              // skipped the 7th
  assert.equal(p.streak.count, 1);
  assert.equal(p.streak.best, 2);
});

test('recordActivity alone (no completion) is idempotent per day', () => {
  const p = emptyProgress();
  recordActivity(p, '2026-09-05');
  recordActivity(p, '2026-09-05');
  assert.equal(p.activityDates.length, 1);
  assert.equal(p.streak.count, 1);
});

test('streakStatus: active today/yesterday, paused when older, none when empty', () => {
  const p = emptyProgress();
  assert.equal(streakStatus(p, '2026-09-05'), 'none');
  p.streak = { count: 3, best: 3, lastDate: '2026-09-05' };
  assert.equal(streakStatus(p, '2026-09-05'), 'active');
  assert.equal(streakStatus(p, previousDay('2026-09-06')), 'active');
  assert.equal(streakStatus(p, '2026-09-09'), 'paused');
});

test('weeklyCount: activity within the last 7 days (0..6 days back)', () => {
  const p = emptyProgress();
  //            35d out     7d out       6d in         3d in         0d in
  p.activityDates = ['2026-08-01', '2026-08-29', '2026-08-30', '2026-09-02', '2026-09-05'];
  assert.equal(weeklyCount(p, '2026-09-05'), 3);
});

test('badges: First Wiki Page and Module Completer unlock on concrete criteria', () => {
  const p = emptyProgress();
  for (const n of COURSE[0].nodes) {
    if (n.id === 'm1-wiki') { finish(p, n.id); break; }
    finish(p, n.id);
  }
  assert.ok(p.badges['first-wiki'], 'first-wiki after a wikiCreate node');
  assert.ok(!p.badges['module'], 'module badge not yet');

  for (const n of COURSE[0].nodes) finish(p, n.id);   // finish module 1
  assert.ok(p.badges['module'], 'module badge after a full module');
  assert.equal(summarise(p).modulesCompleted, 1);
});

test('badges: Helpful Reviewer needs three peer-feedback completions', () => {
  const p = emptyProgress();
  let peers = 0;
  for (const mod of COURSE) {
    for (const n of mod.nodes) {
      finish(p, n.id);
      if (n.kind === 'peerFeedback') {
        peers += 1;
        if (peers < 3) assert.ok(!p.badges['helpful'], 'not before 3');
        else assert.ok(p.badges['helpful'], 'helpful at 3');
      }
    }
    if (peers >= 3) break;
  }
});

test('moduleProgress reports done/total/pct', () => {
  const p = emptyProgress();
  const mod = COURSE[0];
  assert.deepEqual(moduleProgress(p, mod), { done: 0, total: mod.nodes.length, pct: 0 });
  finish(p, mod.nodes[0].id);
  const mp = moduleProgress(p, mod);
  assert.equal(mp.done, 1);
  assert.equal(mp.pct, Math.round((1 / mod.nodes.length) * 100));
});

test('revision-needed state appears once peer feedback is done', () => {
  const p = emptyProgress();
  const mod = COURSE[2]; // module 3
  for (const n of mod.nodes) {
    if (n.kind === 'revise') break;
    finish(p, n.id);
  }
  const { states } = computeStates(p);
  assert.equal(states.get('m3-revise'), 'revision-needed');
});

test('migrate tolerates garbage and preserves valid fields', () => {
  assert.deepEqual(migrate(null), emptyProgress());
  assert.deepEqual(migrate('nope'), emptyProgress());
  const messy = {
    schema: 0,
    completed: { 'm1-objectives': { at: ISO, xp: 5 }, bad: 7 },
    visited: { 'm1-objectives': ISO, x: 5 },
    activityDates: ['2026-09-05', 'not-a-date', 42],
    streak: { count: '3', best: 3, lastDate: '2026-09-05' },
    badges: { 'first-wiki': ISO, y: 1 },
  };
  const m = migrate(messy);
  assert.equal(m.schema, 1);
  assert.deepEqual(m.completed, { 'm1-objectives': { at: ISO, xp: 5 } });
  assert.deepEqual(m.visited, { 'm1-objectives': ISO });
  assert.deepEqual(m.activityDates, ['2026-09-05']);
  assert.equal(m.streak.count, 3);
  assert.deepEqual(m.badges, { 'first-wiki': ISO });
});

test('dateKey formats a local date as YYYY-MM-DD', () => {
  assert.equal(dateKey(new Date(2026, 0, 7)), '2026-01-07');
  assert.equal(dateKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('all in-repo node hrefs point under lessons/ ; external ones are the project wiki', () => {
  for (const { node } of NODES) {
    if (node.external) {
      assert.ok(node.href.startsWith('https://github.com/nargizaqodirova7277-cmyk/wiki-english-method'), node.id);
    } else {
      assert.ok(node.href.startsWith('lessons/') && node.href.includes('.html'), node.id + ' -> ' + node.href);
    }
    if (node.instructionsHref) {
      assert.ok(node.instructionsHref.startsWith('lessons/'), node.id + ' instructions');
    }
  }
});
