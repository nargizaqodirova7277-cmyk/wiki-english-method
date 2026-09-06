/*
 * Anchor integrity check for the WIKI ENGLISH learning path.
 *
 * The repo's existing CI (quality-check.yml) validates that internal LINKS
 * resolve to a file, but it strips "#fragment" before checking. This script
 * closes that gap: every href referenced from assets/course-data.js — including
 * the "#section" anchors the path relies on — must point at a file that exists
 * AND, when a fragment is given, at an id that is actually present in that file.
 *
 * No dependencies. Run:  node website/scripts/check-anchors.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { COURSE, NODES, NAV, GUIDE_LINKS } from '../assets/course-data.js';

const WEBSITE_ROOT = new URL('../', import.meta.url);
const failures = [];
const checkedFiles = new Set();
let refCount = 0;

function idsInFile(relPath) {
  const abs = fileURLToPath(new URL(relPath, WEBSITE_ROOT));
  if (!existsSync(abs)) return null;
  const html = readFileSync(abs, 'utf8');
  const ids = new Set();
  const re = /\sid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return ids;
}

function check(ref, source) {
  if (typeof ref !== 'string' || ref.length === 0) {
    failures.push(`[${source}] empty href`);
    return;
  }
  if (/^https?:/.test(ref)) return;            // external (project wiki) — out of scope
  if (ref.startsWith('#')) return;             // same-page anchor on app page — validated in the DOM tests
  refCount += 1;

  const [path, frag] = ref.split('#');
  const ids = idsInFile(path);
  if (ids === null) {
    failures.push(`[${source}] missing file: ${path}`);
    return;
  }
  checkedFiles.add(path);
  if (frag && !ids.has(frag)) {
    failures.push(`[${source}] ${path} has no id="${frag}"`);
  }
}

for (const mod of COURSE) {
  check(mod.overview, `module ${mod.n} overview`);
  for (const node of mod.nodes) {
    if (!node.external) check(node.href, `${node.id} href`);
    if (node.instructionsHref) check(node.instructionsHref, `${node.id} instructionsHref`);
    if (node.rubricHref) check(node.rubricHref, `${node.id} rubricHref`);
    if (node.netiquetteHref) check(node.netiquetteHref, `${node.id} netiquetteHref`);
    for (const lvl of node.levels || []) check(lvl.href, `${node.id} level "${lvl.label}"`);
  }
}
for (const item of NAV) check(item.href, `nav "${item.label}"`);
for (const item of GUIDE_LINKS) check(item.href, `guide "${item.label}"`);

// unique node ids (defence in depth; also covered by state.test.mjs)
const ids = NODES.map((e) => e.node.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) failures.push(`duplicate node ids: ${[...new Set(dupes)].join(', ')}`);

console.log(`checked ${refCount} in-repo references across ${checkedFiles.size} lesson files (${NODES.length} nodes)`);
if (failures.length) {
  console.error(`\nFAIL — ${failures.length} problem(s):`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('OK — every course-data href resolves to a real file and id');
