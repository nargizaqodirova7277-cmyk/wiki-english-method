/*
 * WIKI ENGLISH — pure progress logic.
 *
 * No DOM, no storage, no clocks of its own: every function takes the data it
 * needs (including "today" as a 'YYYY-MM-DD' string) and returns a value or
 * mutates the object it was given. This is what makes the rules unit-testable
 * with `node --test` and keeps a future RemoteAdapter a drop-in.
 */

import { COURSE, NODES, findNode, KINDS, BADGES } from './course-data.js';

export const SCHEMA = 1;
export const STATES = ['locked', 'available', 'current', 'completed', 'revision-needed'];

export function emptyProgress() {
  return {
    schema: SCHEMA,
    completed: {},       // nodeId -> { at: ISO string, xp: number }   (presence = done)
    visited: {},         // nodeId -> ISO string   (Start/Continue was activated)
    activityDates: [],    // 'YYYY-MM-DD', chronological, capped
    streak: { count: 0, best: 0, lastDate: null },
    badges: {},          // badgeId -> ISO string
    updatedAt: null,
  };
}

/* Tolerantly upgrade any stored blob to the current shape. Future schema bumps
 * add `if (raw.schema < N) { ... }` branches here so returning learners never
 * lose their only copy of their progress. */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyProgress();
  const p = emptyProgress();
  if (raw.completed && typeof raw.completed === 'object') {
    for (const [id, rec] of Object.entries(raw.completed)) {
      if (!rec || typeof rec !== 'object') continue;
      p.completed[id] = { at: typeof rec.at === 'string' ? rec.at : null, xp: Number(rec.xp) || 0 };
    }
  }
  if (raw.visited && typeof raw.visited === 'object') {
    for (const [id, at] of Object.entries(raw.visited)) {
      if (typeof at === 'string') p.visited[id] = at;
    }
  }
  if (Array.isArray(raw.activityDates)) {
    p.activityDates = raw.activityDates.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d));
  }
  if (raw.streak && typeof raw.streak === 'object') {
    p.streak = {
      count: Number(raw.streak.count) || 0,
      best: Number(raw.streak.best) || 0,
      lastDate: typeof raw.streak.lastDate === 'string' ? raw.streak.lastDate : null,
    };
  }
  if (raw.badges && typeof raw.badges === 'object') {
    for (const [id, at] of Object.entries(raw.badges)) {
      if (typeof at === 'string') p.badges[id] = at;
    }
  }
  p.updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : null;
  return p;
}

/* ---- date helpers (string in, string out; no ambient clock) ---- */

export function dateKey(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function fromKey(key) {
  const parts = key.split('-').map(Number);
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

export function previousDay(key) {
  const dt = fromKey(key);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export function daysBetween(fromKeyStr, toKeyStr) {
  return Math.round((fromKey(toKeyStr).getTime() - fromKey(fromKeyStr).getTime()) / 86400000);
}

/* ---- mutations ---- */

export function markVisited(progress, nodeId, nowIso) {
  if (!progress.visited[nodeId]) progress.visited[nodeId] = nowIso;
  return progress;
}

/* Record one calendar day of real activity and move the streak. Opening the app
 * never calls this; only a genuine node completion does. */
export function recordActivity(progress, todayKey) {
  if (progress.activityDates.includes(todayKey)) return progress;
  progress.activityDates.push(todayKey);
  if (progress.activityDates.length > 120) {
    progress.activityDates = progress.activityDates.slice(-120);
  }
  const s = progress.streak;
  if (s.lastDate && previousDay(todayKey) === s.lastDate) {
    s.count += 1;
  } else {
    s.count = 1;
  }
  s.lastDate = todayKey;
  if (s.count > s.best) s.best = s.count;
  return progress;
}

/*
 * Complete a node. Returns { gained, error }.
 *  - already complete            -> { gained: 0, error: null }   (idempotent; no XP, no streak)
 *  - a 'visit' node not opened   -> { gained: 0, error: 'open-lesson-first' }
 *  - otherwise                   -> { gained: node xp, error: null }
 * XP is stored on the completion record, so the total is bounded by the sum of
 * node xp no matter how often the button is pressed.
 */
export function completeNode(progress, nodeId, todayKey, nowIso) {
  const entry = findNode(nodeId);
  if (!entry) return { gained: 0, error: 'unknown-node' };
  if (progress.completed[nodeId]) return { gained: 0, error: null };

  const kind = KINDS[entry.node.kind];
  if (kind.completion === 'visit' && !progress.visited[nodeId]) {
    return { gained: 0, error: 'open-lesson-first' };
  }

  progress.completed[nodeId] = { at: nowIso, xp: kind.xp };
  recordActivity(progress, todayKey);
  applyBadges(progress, nowIso);
  progress.updatedAt = nowIso;
  return { gained: kind.xp, error: null };
}

export function uncompleteNode(progress, nodeId, nowIso) {
  if (!progress.completed[nodeId]) return progress;
  delete progress.completed[nodeId];
  progress.updatedAt = nowIso;
  return progress;
}

/* ---- derivations (read-only) ---- */

export function xpTotal(progress) {
  let sum = 0;
  for (const rec of Object.values(progress.completed)) sum += Number(rec.xp) || 0;
  return sum;
}

export function summarise(progress) {
  const completedByKind = {};
  for (const entry of NODES) {
    if (progress.completed[entry.node.id]) {
      const k = entry.node.kind;
      completedByKind[k] = (completedByKind[k] || 0) + 1;
    }
  }
  let modulesCompleted = 0;
  for (const mod of COURSE) {
    if (mod.nodes.every((n) => progress.completed[n.id])) modulesCompleted += 1;
  }
  return { completedByKind: completedByKind, modulesCompleted: modulesCompleted, xpTotal: xpTotal(progress) };
}

export function applyBadges(progress, nowIso) {
  const summary = summarise(progress);
  for (const badge of BADGES) {
    if (!progress.badges[badge.id] && badge.test(summary)) {
      progress.badges[badge.id] = nowIso;
    }
  }
  return progress;
}

export function predecessorId(entry) {
  if (entry.index > 0) return entry.module.nodes[entry.index - 1].id;
  const modIdx = COURSE.indexOf(entry.module);
  if (modIdx <= 0) return null;
  const prevMod = COURSE[modIdx - 1];
  return prevMod.nodes[prevMod.nodes.length - 1].id;
}

function moduleNeedsRevision(mod, progress) {
  const peer = mod.nodes.find((n) => n.kind === 'peerFeedback');
  const revise = mod.nodes.find((n) => n.kind === 'revise');
  return !!(peer && revise && progress.completed[peer.id] && !progress.completed[revise.id]);
}

/*
 * Map every node id to exactly one of STATES, and name the single global
 * "current" node (first unlocked, not-completed node in course order).
 */
export function computeStates(progress) {
  const states = new Map();
  let current = null;
  for (const entry of NODES) {
    const id = entry.node.id;
    const predId = predecessorId(entry);
    const unlocked = !predId || !!progress.completed[predId];
    const done = !!progress.completed[id];
    let state;
    if (!unlocked) {
      state = 'locked';
    } else if (done) {
      state = 'completed';
    } else {
      const isRevise = entry.node.kind === 'revise' && moduleNeedsRevision(entry.module, progress);
      if (!current) {
        current = id;
        state = isRevise ? 'revision-needed' : 'current';
      } else {
        state = isRevise ? 'revision-needed' : 'available';
      }
    }
    states.set(id, state);
  }
  return { states: states, current: current };
}

export function moduleProgress(progress, mod) {
  const total = mod.nodes.length;
  const done = mod.nodes.filter((n) => progress.completed[n.id]).length;
  return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function activeModule(progress) {
  const { current } = computeStates(progress);
  if (current) {
    const entry = findNode(current);
    if (entry) return entry.module;
  }
  // course finished, or nothing current: last module if all done, else first
  const allDone = NODES.every((e) => progress.completed[e.node.id]);
  return allDone ? COURSE[COURSE.length - 1] : COURSE[0];
}

export function weeklyCount(progress, todayKey) {
  let count = 0;
  for (const d of progress.activityDates) {
    const delta = daysBetween(d, todayKey);
    if (delta >= 0 && delta < 7) count += 1;
  }
  return count;
}

export function streakStatus(progress, todayKey) {
  const s = progress.streak;
  if (!s.lastDate || s.count === 0) return 'none';
  if (s.lastDate === todayKey || s.lastDate === previousDay(todayKey)) return 'active';
  return 'paused';
}
