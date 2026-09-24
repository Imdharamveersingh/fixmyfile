/**
 * Centralized SVG icon definitions for non-tool UI icons on FixMyFile.
 * Used for Contact and general UI controls (mail, copy, check, default fallback).
 * Tool-card icons are now loaded from the supplied SVG asset set via toolSvgMap.js.
 */

export const TOOL_ICON_DEFS = {
  // Fallback icon
  default: [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '8', y1: '13', x2: '16', y2: '13' } },
    { tag: 'line', attrs: { x1: '8', y1: '17', x2: '14', y2: '17' } }
  ],

  // Mail envelope icon for Contact
  mail: [
    { tag: 'rect', attrs: { x: '2', y: '4', width: '20', height: '16', rx: '2' } },
    { tag: 'path', attrs: { d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' } }
  ],

  // Copy and check icons for Copy button
  copy: [
    { tag: 'rect', attrs: { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' } },
    { tag: 'path', attrs: { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' } }
  ],
  check: [
    { tag: 'polyline', attrs: { points: '20 6 9 17 4 12' } }
  ]
};
