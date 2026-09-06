/*
 * WIKI ENGLISH — original activity icon set.
 *
 * Each icon is a list of plain SVG shape descriptors {t: tagName, a: attrs}.
 * svgIcon() builds a real <svg> with document.createElementNS — no innerHTML,
 * no external file, no CDN. 24x24 viewBox, stroke = currentColor.
 */

export const ICONS = {
  objectives: [
    { t: 'circle', a: { cx: 12, cy: 12, r: 8 } },
    { t: 'circle', a: { cx: 12, cy: 12, r: 3.4 } },
    { t: 'path', a: { d: 'M12 2v2M12 20v2M2 12h2M20 12h2' } },
  ],
  warmup: [
    { t: 'circle', a: { cx: 12, cy: 12, r: 3.2 } },
    { t: 'path', a: { d: 'M12 3v3M12 18v3M4.6 4.6l2 2M17.4 17.4l2 2M3 12h3M18 12h3M4.6 19.4l2-2M17.4 6.6l2-2' } },
  ],
  vocab: [
    { t: 'path', a: { d: 'M4 5.5A1.5 1.5 0 015.5 4H11v15.5H5.5A1.5 1.5 0 004 21z' } },
    { t: 'path', a: { d: 'M20 5.5A1.5 1.5 0 0018.5 4H13v15.5h5.5A1.5 1.5 0 0120 21z' } },
  ],
  audio: [
    { t: 'path', a: { d: 'M4 9.5v5h3.5L13 19V5L7.5 9.5z' } },
    { t: 'path', a: { d: 'M16.5 8.8a4.5 4.5 0 010 6.4M19 6a8 8 0 010 12' } },
  ],
  reading: [
    { t: 'path', a: { d: 'M6 3h8l5 5v13H6z' } },
    { t: 'path', a: { d: 'M14 3v5h5' } },
    { t: 'path', a: { d: 'M9 13h6M9 16.5h6M9 9.5h2' } },
  ],
  comprehension: [
    { t: 'circle', a: { cx: 12, cy: 12, r: 8.5 } },
    { t: 'path', a: { d: 'M8.5 12.4l2.6 2.6 4.6-5.2' } },
  ],
  language: [
    { t: 'path', a: { d: 'M4 5h16v10.5H9L4.5 20z' } },
    { t: 'path', a: { d: 'M8 9.5h2v2.2H8zM14 9.5h2v2.2h-2z' } },
  ],
  tasks: [
    { t: 'path', a: { d: 'M12 3l8.5 4.2-8.5 4.2L3.5 7.2z' } },
    { t: 'path', a: { d: 'M3.5 11.8L12 16l8.5-4.2M3.5 16.3L12 20.5l8.5-4.2' } },
  ],
  conceptmap: [
    { t: 'circle', a: { cx: 6, cy: 7, r: 2.4 } },
    { t: 'circle', a: { cx: 18, cy: 7, r: 2.4 } },
    { t: 'circle', a: { cx: 12, cy: 18, r: 2.4 } },
    { t: 'path', a: { d: 'M8 8.6l3 7.2M16 8.6l-3 7.2M8.4 7h7.2' } },
  ],
  break: [
    { t: 'circle', a: { cx: 12, cy: 12, r: 8.5 } },
    { t: 'path', a: { d: 'M10 8.5v7M14 8.5v7' } },
  ],
  homework: [
    { t: 'path', a: { d: 'M4 20l1.2-4.4L15.5 5.3l3.2 3.2L8.4 18.8z' } },
    { t: 'path', a: { d: 'M14 6.8l3.2 3.2' } },
  ],
  wikiCreate: [
    { t: 'path', a: { d: 'M4 20h16' } },
    { t: 'path', a: { d: 'M6.5 16l8.7-8.7 3 3L9.5 19H6.5z' } },
  ],
  peerFeedback: [
    { t: 'path', a: { d: 'M3 5.5h10.5v6.5H8L5 15v-3H3z' } },
    { t: 'path', a: { d: 'M9.5 11.5h8a2.5 2.5 0 012.5 2.5 2.5 2.5 0 01-2.5 2.5h-.8V19l-3-2.5' } },
  ],
  revise: [
    { t: 'path', a: { d: 'M19.5 12a7.5 7.5 0 11-2.2-5.3' } },
    { t: 'path', a: { d: 'M19.8 3.5V8h-4.5' } },
  ],
  history: [
    { t: 'circle', a: { cx: 12, cy: 12, r: 8.2 } },
    { t: 'path', a: { d: 'M12 7.5V12l3.4 2' } },
    { t: 'path', a: { d: 'M4.6 8.4l-1.4-.9 .5-1.6' } },
  ],
  speaking: [
    { t: 'rect', a: { x: 9, y: 3, width: 6, height: 11, rx: 3 } },
    { t: 'path', a: { d: 'M6 11.5a6 6 0 0012 0M12 17.5V21M9 21h6' } },
  ],
  checkpoint: [
    { t: 'path', a: { d: 'M6 21V4' } },
    { t: 'path', a: { d: 'M6 4.5h11l-2.6 4L17 12.5H6' } },
  ],
};

const NS = 'http://www.w3.org/2000/svg';

export function svgIcon(name, className = 'we-svg') {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.9');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const shape of ICONS[name] || ICONS.objectives) {
    const el = document.createElementNS(NS, shape.t);
    for (const [k, v] of Object.entries(shape.a)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}

/* small utility marks reused by node badges / buttons */
export function svgMark(name, className = 'we-svg') {
  const marks = {
    lock: [
      { t: 'rect', a: { x: 5, y: 11, width: 14, height: 9, rx: 2 } },
      { t: 'path', a: { d: 'M8 11V8a4 4 0 018 0v3' } },
    ],
    check: [{ t: 'path', a: { d: 'M5 12.5l4.5 4.5L19 7' } }],
    redo: [
      { t: 'path', a: { d: 'M19.5 12a7.5 7.5 0 11-2.2-5.3' } },
      { t: 'path', a: { d: 'M19.8 3.5V8h-4.5' } },
    ],
    speak: [
      { t: 'path', a: { d: 'M4 9.5v5h3.5L13 19V5L7.5 9.5z' } },
      { t: 'path', a: { d: 'M16.5 8.8a4.5 4.5 0 010 6.4' } },
    ],
    arrowUpRight: [{ t: 'path', a: { d: 'M7 17L17 7M8 7h9v9' } }],
  };
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', className);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.1');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const shape of marks[name] || marks.check) {
    const el = document.createElementNS(NS, shape.t);
    for (const [k, v] of Object.entries(shape.a)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}
