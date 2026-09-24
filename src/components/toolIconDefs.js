/**
 * Centralized SVG icon definitions for all 49 tools on FixMyFile.
 * Pure JavaScript data representation for zero-dependency rendering and testability.
 */

export const TOOL_ICON_DEFS = {
  // Fallback icon
  default: [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '8', y1: '13', x2: '16', y2: '13' } },
    { tag: 'line', attrs: { x1: '8', y1: '17', x2: '14', y2: '17' } }
  ],

  // --- Phase 1: PDF Tools ---
  'jpg-to-pdf': [
    { tag: 'rect', attrs: { x: '2', y: '3', width: '13', height: '13', rx: '2' } },
    { tag: 'circle', attrs: { cx: '6.5', cy: '7.5', r: '1' } },
    { tag: 'path', attrs: { d: 'm2 13 3-3 2 2 3-3 4 4' } },
    { tag: 'path', attrs: { d: 'M17 7h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-4' } },
    { tag: 'polyline', attrs: { points: '18 11 21 11' } },
    { tag: 'polyline', attrs: { points: '18 15 21 15' } }
  ],
  'pdf-to-word': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'path', attrs: { d: 'M9 13.5 10.5 18 12 14.5 13.5 18 15 13.5' } }
  ],
  'pdf-to-jpg': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'circle', attrs: { cx: '9.5', cy: '13', r: '1.5' } },
    { tag: 'path', attrs: { d: 'm7.5 18 3-3 2 2 3.5-3.5' } }
  ],
  'word-to-pdf': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '8', y1: '12', x2: '16', y2: '12' } },
    { tag: 'line', attrs: { x1: '8', y1: '15', x2: '16', y2: '15' } },
    { tag: 'line', attrs: { x1: '8', y1: '18', x2: '13', y2: '18' } }
  ],
  'merge-pdf': [
    { tag: 'path', attrs: { d: 'M16 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z' } },
    { tag: 'path', attrs: { d: 'M4 6H3a1 1 0 0 0-1 1v13a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1v-1' } },
    { tag: 'line', attrs: { x1: '12', y1: '7', x2: '12', y2: '13' } },
    { tag: 'line', attrs: { x1: '9', y1: '10', x2: '15', y2: '10' } }
  ],
  'compress-pdf': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'path', attrs: { d: 'M12 18v-5' } },
    { tag: 'polyline', attrs: { points: '9.5 15 12 12.5 14.5 15' } },
    { tag: 'line', attrs: { x1: '9', y1: '18', x2: '15', y2: '18' } }
  ],

  // --- Phase 2: Image Tools ---
  'background-remover': [
    { tag: 'path', attrs: { d: 'm15 4-2 2 4 4 2-2a1.4 1.4 0 0 0 0-2l-2-2a1.4 1.4 0 0 0-2 0z' } },
    { tag: 'path', attrs: { d: 'M13 6 4 15v5h5l9-9' } },
    { tag: 'path', attrs: { d: 'm19 14 1.5 1.5M16 19l1 2M21 21l.5.5' } },
    { tag: 'circle', attrs: { cx: '6', cy: '6', r: '1.5' } }
  ],
  'image-compressor': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '1.5' } },
    { tag: 'path', attrs: { d: 'm21 16-5-5L5 21' } },
    { tag: 'polyline', attrs: { points: '13 14 16 11 16 14' } },
    { tag: 'polyline', attrs: { points: '16 11 13 11' } }
  ],
  'image-resizer': [
    { tag: 'polyline', attrs: { points: '15 3 21 3 21 9' } },
    { tag: 'line', attrs: { x1: '21', y1: '3', x2: '14', y2: '10' } },
    { tag: 'polyline', attrs: { points: '9 21 3 21 3 15' } },
    { tag: 'line', attrs: { x1: '3', y1: '21', x2: '10', y2: '14' } },
    { tag: 'rect', attrs: { x: '7', y: '7', width: '10', height: '10', rx: '1.5' } }
  ],
  'image-converter': [
    { tag: 'rect', attrs: { x: '2', y: '2', width: '13', height: '13', rx: '2' } },
    { tag: 'circle', attrs: { cx: '6', cy: '6', r: '1' } },
    { tag: 'path', attrs: { d: 'm2 11 3-3 2 2 3-3 3 3' } },
    { tag: 'path', attrs: { d: 'M18 10a5 5 0 0 1 4 4v1' } },
    { tag: 'polyline', attrs: { points: '20 17 22 15 24 17' } },
    { tag: 'path', attrs: { d: 'M14 20a5 5 0 0 1-4-4v-1' } },
    { tag: 'polyline', attrs: { points: '8 13 10 15 12 13' } }
  ],
  'jpg-to-png': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '1.5' } },
    { tag: 'path', attrs: { d: 'm21 15-5-5L5 21' } },
    { tag: 'path', attrs: { d: 'M15 18h4' } },
    { tag: 'path', attrs: { d: 'M17 16v4' } }
  ],
  'png-to-jpg': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'circle', attrs: { cx: '8.5', cy: '8.5', r: '1.5' } },
    { tag: 'path', attrs: { d: 'm21 15-5-5L5 21' } },
    { tag: 'polyline', attrs: { points: '14 6 18 6 18 10' } }
  ],

  // --- Phase 3: Generators & Calculators ---
  'qr-code-generator': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '6', height: '6', rx: '1' } },
    { tag: 'rect', attrs: { x: '15', y: '3', width: '6', height: '6', rx: '1' } },
    { tag: 'rect', attrs: { x: '3', y: '15', width: '6', height: '6', rx: '1' } },
    { tag: 'path', attrs: { d: 'M15 15h2v2h-2z' } },
    { tag: 'path', attrs: { d: 'M19 15h2v6h-2z' } },
    { tag: 'path', attrs: { d: 'M15 19h2v2h-2z' } },
    { tag: 'path', attrs: { d: 'M10 5h1' } },
    { tag: 'path', attrs: { d: 'M10 9h4' } },
    { tag: 'path', attrs: { d: 'M10 15v4' } },
    { tag: 'path', attrs: { d: 'M10 12h1' } }
  ],
  'barcode-generator': [
    { tag: 'line', attrs: { x1: '3', y1: '5', x2: '3', y2: '19' } },
    { tag: 'line', attrs: { x1: '6', y1: '5', x2: '6', y2: '19', strokeWidth: '2.5' } },
    { tag: 'line', attrs: { x1: '10', y1: '5', x2: '10', y2: '19' } },
    { tag: 'line', attrs: { x1: '13', y1: '5', x2: '13', y2: '19', strokeWidth: '2.5' } },
    { tag: 'line', attrs: { x1: '16', y1: '5', x2: '16', y2: '19' } },
    { tag: 'line', attrs: { x1: '19', y1: '5', x2: '19', y2: '19', strokeWidth: '2.5' } },
    { tag: 'line', attrs: { x1: '22', y1: '5', x2: '22', y2: '19' } }
  ],
  'currency-converter': [
    { tag: 'circle', attrs: { cx: '8', cy: '12', r: '6' } },
    { tag: 'path', attrs: { d: 'M8 9v6' } },
    { tag: 'path', attrs: { d: 'M6.5 10.5h3' } },
    { tag: 'path', attrs: { d: 'M6.5 13.5h3' } },
    { tag: 'path', attrs: { d: 'M16 8h4a2 2 0 0 1 2 2v6' } },
    { tag: 'polyline', attrs: { points: '19 14 22 17 25 14' } },
    { tag: 'path', attrs: { d: 'M14 16h-1' } }
  ],
  'percentage-calculator': [
    { tag: 'line', attrs: { x1: '19', y1: '5', x2: '5', y2: '19' } },
    { tag: 'circle', attrs: { cx: '7', cy: '7', r: '2.5' } },
    { tag: 'circle', attrs: { cx: '17', cy: '17', r: '2.5' } }
  ],
  'password-generator': [
    { tag: 'rect', attrs: { x: '4', y: '11', width: '16', height: '11', rx: '2', ry: '2' } },
    { tag: 'path', attrs: { d: 'M7 11V7a5 5 0 0 1 10 0v4' } },
    { tag: 'circle', attrs: { cx: '12', cy: '16.5', r: '1.5' } }
  ],
  'word-counter': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '8', y1: '13', x2: '16', y2: '13' } },
    { tag: 'line', attrs: { x1: '8', y1: '17', x2: '13', y2: '17' } },
    { tag: 'line', attrs: { x1: '8', y1: '9', x2: '10', y2: '9' } }
  ],
  'emi-calculator': [
    { tag: 'rect', attrs: { x: '4', y: '2', width: '16', height: '20', rx: '2' } },
    { tag: 'line', attrs: { x1: '8', y1: '6', x2: '16', y2: '6' } },
    { tag: 'circle', attrs: { cx: '8', cy: '10.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '12', cy: '10.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '16', cy: '10.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '8', cy: '14.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '12', cy: '14.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '16', cy: '14.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '8', cy: '18.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '12', cy: '18.5', r: '0.75', fill: 'currentColor' } },
    { tag: 'circle', attrs: { cx: '16', cy: '18.5', r: '0.75', fill: 'currentColor' } }
  ],

  // --- Phase 4: Advanced PDF Tools ---
  'split-pdf': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '3', y1: '13', x2: '21', y2: '13', strokeDasharray: '2 2' } },
    { tag: 'polyline', attrs: { points: '8 10 11 13 8 16' } },
    { tag: 'polyline', attrs: { points: '16 10 13 13 16 16' } }
  ],
  'pdf-to-excel': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'rect', attrs: { x: '7', y: '11', width: '10', height: '8', rx: '1' } },
    { tag: 'line', attrs: { x1: '7', y1: '15', x2: '17', y2: '15' } },
    { tag: 'line', attrs: { x1: '12', y1: '11', x2: '12', y2: '19' } }
  ],
  'pdf-to-powerpoint': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'circle', attrs: { cx: '12', cy: '15', r: '3.5' } },
    { tag: 'path', attrs: { d: 'M12 11.5V15h3.5' } }
  ],
  'rotate-pdf': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'path', attrs: { d: 'M15 13a3.5 3.5 0 1 1-2.5-3.3' } },
    { tag: 'polyline', attrs: { points: '15 8 15 12 11 12' } }
  ],
  'protect-pdf': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'rect', attrs: { x: '9', y: '13', width: '6', height: '5', rx: '1' } },
    { tag: 'path', attrs: { d: 'M10 13v-1.5a2 2 0 1 1 4 0V13' } }
  ],
  'unlock-pdf': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'rect', attrs: { x: '9', y: '13', width: '6', height: '5', rx: '1' } },
    { tag: 'path', attrs: { d: 'M10 11a2 2 0 0 1 4 0v2' } }
  ],
  'pdf-to-text': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '8', y1: '12', x2: '16', y2: '12' } },
    { tag: 'line', attrs: { x1: '8', y1: '15', x2: '16', y2: '15' } },
    { tag: 'line', attrs: { x1: '8', y1: '18', x2: '13', y2: '18' } }
  ],
  'extract-pdf-pages': [
    { tag: 'rect', attrs: { x: '4', y: '4', width: '11', height: '15', rx: '1.5' } },
    { tag: 'path', attrs: { d: 'M9 4V2.5A1.5 1.5 0 0 1 10.5 1h7A1.5 1.5 0 0 1 19 2.5V14a1.5 1.5 0 0 1-1.5 1.5H15' } },
    { tag: 'polyline', attrs: { points: '15 8 19 4 19 7' } }
  ],
  'delete-pdf-pages': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '9.5', y1: '13', x2: '14.5', y2: '18' } },
    { tag: 'line', attrs: { x1: '14.5', y1: '13', x2: '9.5', y2: '18' } }
  ],
  'reorder-pdf-pages': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'polyline', attrs: { points: '9 13.5 12 11 15 13.5' } },
    { tag: 'polyline', attrs: { points: '9 16.5 12 19 15 16.5' } }
  ],

  // --- Phase 5: Advanced Image Tools ---
  'heic-to-jpg': [
    { tag: 'path', attrs: { d: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' } },
    { tag: 'circle', attrs: { cx: '12', cy: '13', r: '4' } }
  ],
  'webp-to-jpg': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '1.5' } },
    { tag: 'path', attrs: { d: 'm21 15-5-5L5 21' } },
    { tag: 'polyline', attrs: { points: '15 7 19 7 19 11' } }
  ],
  'jpg-to-webp': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '1.5' } },
    { tag: 'path', attrs: { d: 'm21 15-5-5L5 21' } },
    { tag: 'path', attrs: { d: 'M14 8a4 4 0 0 1 4 4' } },
    { tag: 'path', attrs: { d: 'M14 5a7 7 0 0 1 7 7' } }
  ],
  'webp-to-png': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '14', height: '14', rx: '2' } },
    { tag: 'circle', attrs: { cx: '7', cy: '7', r: '1' } },
    { tag: 'path', attrs: { d: 'm3 13 3-3 2 2 3-3 3 3' } },
    { tag: 'path', attrs: { d: 'M18 10h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-3' } }
  ],
  'image-rotate-flip': [
    { tag: 'path', attrs: { d: 'm3 12 4-4m-4 4 4 4m-4-4h11a5 5 0 0 1 5 5v1' } },
    { tag: 'path', attrs: { d: 'm21 12-4-4m4 4-4 4m4-4H10a5 5 0 0 1-5-5V6' } }
  ],
  'image-watermark': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'circle', attrs: { cx: '8', cy: '8', r: '1.5' } },
    { tag: 'path', attrs: { d: 'm21 15-5-5L5 21' } },
    { tag: 'circle', attrs: { cx: '13', cy: '13', r: '3', strokeDasharray: '2 2' } },
    { tag: 'line', attrs: { x1: '11', y1: '15', x2: '15', y2: '11' } }
  ],
  'image-to-pdf': [
    { tag: 'rect', attrs: { x: '2', y: '2', width: '13', height: '13', rx: '2' } },
    { tag: 'circle', attrs: { cx: '6', cy: '6', r: '1' } },
    { tag: 'path', attrs: { d: 'm2 11 3-3 2 2 3-3 3 3' } },
    { tag: 'path', attrs: { d: 'M17 7h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-4' } },
    { tag: 'line', attrs: { x1: '18', y1: '12', x2: '21', y2: '12' } }
  ],
  'image-upscaler': [
    { tag: 'path', attrs: { d: 'M12 2v4m0 12v4M2 12h4m12 0h4' } },
    { tag: 'circle', attrs: { cx: '12', cy: '12', r: '3.5' } },
    { tag: 'path', attrs: { d: 'm5 5 2.5 2.5m9 9 2.5 2.5M5 19l2.5-2.5m9-9L19 5' } }
  ],
  'image-to-base64': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'polyline', attrs: { points: '8 10 5.5 12 8 14' } },
    { tag: 'polyline', attrs: { points: '16 10 18.5 12 16 14' } },
    { tag: 'line', attrs: { x1: '13', y1: '9', x2: '11', y2: '15' } }
  ],

  // --- Phase 6: Media Tools ---
  'mp4-to-mp3': [
    { tag: 'rect', attrs: { x: '2', y: '4', width: '11', height: '16', rx: '2' } },
    { tag: 'path', attrs: { d: 'M5 4v16' } },
    { tag: 'line', attrs: { x1: '2', y1: '8', x2: '5', y2: '8' } },
    { tag: 'line', attrs: { x1: '2', y1: '12', x2: '5', y2: '12' } },
    { tag: 'line', attrs: { x1: '2', y1: '16', x2: '5', y2: '16' } },
    { tag: 'circle', attrs: { cx: '18', cy: '16', r: '3' } },
    { tag: 'path', attrs: { d: 'M21 16V6l-5 1v9' } }
  ],
  'video-compressor': [
    { tag: 'rect', attrs: { x: '3', y: '5', width: '18', height: '14', rx: '2' } },
    { tag: 'polygon', attrs: { points: '10 9 15 12 10 15' } },
    { tag: 'line', attrs: { x1: '3', y1: '12', x2: '1', y2: '12' } },
    { tag: 'line', attrs: { x1: '23', y1: '12', x2: '21', y2: '12' } },
    { tag: 'line', attrs: { x1: '12', y1: '5', x2: '12', y2: '2' } },
    { tag: 'line', attrs: { x1: '12', y1: '22', x2: '12', y2: '19' } }
  ],
  'video-to-gif': [
    { tag: 'rect', attrs: { x: '2', y: '5', width: '14', height: '14', rx: '2' } },
    { tag: 'polygon', attrs: { points: '7 9 11 12 7 15' } },
    { tag: 'path', attrs: { d: 'M18 9a4.5 4.5 0 0 1 3 4.2' } },
    { tag: 'path', attrs: { d: 'M21 16a4.5 4.5 0 0 1-4.5 3' } },
    { tag: 'polyline', attrs: { points: '20 7 21 9 19 10' } },
    { tag: 'polyline', attrs: { points: '18 20 16 19 17 17' } }
  ],
  'gif-maker': [
    { tag: 'rect', attrs: { x: '2', y: '2', width: '13', height: '13', rx: '2' } },
    { tag: 'rect', attrs: { x: '7', y: '7', width: '13', height: '13', rx: '2' } },
    { tag: 'path', attrs: { d: 'm4 11 3-3 2 2 3-3' } },
    { tag: 'polyline', attrs: { points: '15 17 17 17 17 15' } }
  ],

  // --- Phase 7: OCR & Text Tools ---
  'image-to-text': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'circle', attrs: { cx: '7', cy: '7', r: '1' } },
    { tag: 'path', attrs: { d: 'm3 14 3-3 2 2 3-3 3 3' } },
    { tag: 'line', attrs: { x1: '13', y1: '7', x2: '18', y2: '7' } },
    { tag: 'line', attrs: { x1: '13', y1: '10', x2: '17', y2: '10' } },
    { tag: 'line', attrs: { x1: '13', y1: '13', x2: '18', y2: '13' } }
  ],
  'pdf-ocr': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '2', y1: '14', x2: '22', y2: '14' } },
    { tag: 'circle', attrs: { cx: '12', cy: '14', r: '2.5' } },
    { tag: 'line', attrs: { x1: '14', y1: '16', x2: '17', y2: '19' } }
  ],
  'jpg-to-text': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'line', attrs: { x1: '7', y1: '8', x2: '17', y2: '8' } },
    { tag: 'line', attrs: { x1: '7', y1: '12', x2: '17', y2: '12' } },
    { tag: 'line', attrs: { x1: '7', y1: '16', x2: '13', y2: '16' } }
  ],
  'png-to-text': [
    { tag: 'rect', attrs: { x: '3', y: '3', width: '18', height: '18', rx: '2' } },
    { tag: 'line', attrs: { x1: '8', y1: '8', x2: '16', y2: '8' } },
    { tag: 'line', attrs: { x1: '12', y1: '8', x2: '12', y2: '16' } },
    { tag: 'line', attrs: { x1: '10', y1: '16', x2: '14', y2: '16' } }
  ],
  'screenshot-to-text': [
    { tag: 'path', attrs: { d: 'M4 9V4h5' } },
    { tag: 'path', attrs: { d: 'M20 9V4h-5' } },
    { tag: 'path', attrs: { d: 'M4 15v5h5' } },
    { tag: 'path', attrs: { d: 'M20 15v5h-5' } },
    { tag: 'line', attrs: { x1: '8', y1: '10', x2: '16', y2: '10' } },
    { tag: 'line', attrs: { x1: '8', y1: '14', x2: '13', y2: '14' } }
  ],
  'extract-text-from-pdf': [
    { tag: 'path', attrs: { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' } },
    { tag: 'polyline', attrs: { points: '14 2 14 8 20 8' } },
    { tag: 'line', attrs: { x1: '8', y1: '12', x2: '16', y2: '12' } },
    { tag: 'line', attrs: { x1: '8', y1: '15', x2: '12', y2: '15' } },
    { tag: 'polyline', attrs: { points: '15 16 18 19 21 16' } }
  ],
  'image-cropper': [
    { tag: 'path', attrs: { d: 'M6 2v14a2 2 0 0 0 2 2h14' } },
    { tag: 'path', attrs: { d: 'M18 22V8a2 2 0 0 0-2-2H2' } }
  ]
};
