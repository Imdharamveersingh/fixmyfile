/**
 * Automated test suite for Phase 5.7 — Image Watermark Tool
 * Run: node test_image_watermark.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let PHASE_5_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS;
try {
  const mod = await import('./src/tools/toolsRegistry.js');
  PHASE_5_TOOLS = mod.PHASE_5_TOOLS;
  ALL_TOOLS = mod.ALL_TOOLS;
  TOTAL_STRATEGY_TOOLS = mod.TOTAL_STRATEGY_TOOLS;
} catch (err) {
  console.error('Could not import registry:', err);
  process.exit(1);
}

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    testsFailed++;
  }
}

console.log('\n=== Phase 5.7 — Image Watermark: Automated Tests ===\n');

// GROUP 1: Registry & Routing
console.log('GROUP 1: Registry & Routing');

test('image-watermark exists in PHASE_5_TOOLS', () => {
  assert.ok(PHASE_5_TOOLS.some((t) => t.id === 'image-watermark'), 'image-watermark missing from PHASE_5_TOOLS');
});

test('image-watermark has path /image-watermark', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'image-watermark');
  assert.equal(t.path, '/image-watermark');
});

test('image-watermark has phase Phase 5', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'image-watermark');
  assert.equal(t.phase, 'Phase 5');
});

test('image-watermark has category Image Editing', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'image-watermark');
  assert.equal(t.category, 'Image Editing');
});

test('ALL_TOOLS has at least 36 entries', () => {
  assert.ok(ALL_TOOLS.length >= 36, `Expected at least 36 tools, got ${ALL_TOOLS.length}`);
});

test('TOTAL_STRATEGY_TOOLS is still 55', () => {
  assert.equal(TOTAL_STRATEGY_TOOLS, 55);
});

// GROUP 2: App.jsx Integration
console.log('\nGROUP 2: App.jsx Integration');

test('App.jsx imports ImageWatermarkTool', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes("import ImageWatermarkTool from './tools/image-watermark'"));
});

test('App.jsx has image-watermark route', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes('path="image-watermark"'));
});

// GROUP 3: Component Source
console.log('\nGROUP 3: Component Source Files');

test('src/tools/image-watermark/index.jsx exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, 'src/tools/image-watermark/index.jsx')));
});

test('index.jsx exports ImageWatermarkTool as default', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/tools/image-watermark/index.jsx'), 'utf8');
  assert.ok(c.includes('export default function ImageWatermarkTool'));
});

// GROUP 4: Watermark Controls & Logic
console.log('\nGROUP 4: Watermark Controls & Rendering Logic');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/image-watermark/index.jsx'), 'utf8');

test('Text watermark supports custom text input', () => {
  assert.ok(src.includes('watermarkText') && src.includes('setWatermarkText'));
});

test('Font size slider and dynamic font assignment', () => {
  assert.ok(src.includes('fontSize') && src.includes('setFontSize'));
  assert.ok(src.includes('ctx.font = `bold ${fontSize}px ${fontFamily}`'));
});

test('Opacity calculation applies globalAlpha = opacity / 100', () => {
  assert.ok(src.includes('ctx.globalAlpha = textOpacity / 100') || src.includes('textOpacity / 100'));
});

test('Position presets (center, top-left, top-right, bottom-left, bottom-right)', () => {
  ['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'].forEach((pos) => {
    assert.ok(src.includes(`'${pos}'`), `Position preset '${pos}' missing`);
  });
});

test('Tiled diagonal repeat watermark loop present', () => {
  assert.ok(src.includes('isTiled') && src.includes('stepX') && src.includes('stepY'));
});

test('Logo / image watermark upload and scaling supported', () => {
  assert.ok(src.includes('logoElement') && src.includes('logoScale'));
});

test('Canvas dimensions strictly match source image naturalWidth & naturalHeight', () => {
  assert.ok(src.includes('canvas.width = w') && src.includes('canvas.height = h'));
  assert.ok(src.includes('const w = img.naturalWidth') && src.includes('const h = img.naturalHeight'));
});

// GROUP 5: Input Validation & Safety
console.log('\nGROUP 5: Input Validation & Safety');

test('Checks valid image formats (jpg, png, webp, gif, bmp)', () => {
  assert.ok(src.includes('.jpg') && src.includes('.png') && src.includes('.webp'));
});

test('Empty file (0 bytes) is rejected', () => {
  assert.ok(src.includes('file.size === 0'));
});

test('File > 50 MB is rejected', () => {
  assert.ok(src.includes('50 * 1024 * 1024'));
});

test('Object URLs revoked on reset and unmount', () => {
  assert.ok(src.includes('revokeOrigUrl') && src.includes('revokeExportUrl'));
  assert.ok(src.includes('URL.revokeObjectURL'));
});

// GROUP 6: Output & Download
console.log('\nGROUP 6: Output & Download');

test('Output filename generation sanitizes and appends -watermarked', () => {
  assert.ok(src.includes('getWatermarkedDownloadName'));
  assert.ok(src.includes('-watermarked.'));
});

test('Download triggered via programmatic anchor click', () => {
  assert.ok(src.includes('handleDownload') && src.includes('a.click()'));
});

// GROUP 7: Navigation & UI Controls
console.log('\nGROUP 7: Navigation & Semantic IDs');

test('Header.jsx contains image-watermark link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Header.jsx'), 'utf8');
  assert.ok(c.includes('/image-watermark'));
});

test('Footer.jsx contains compact Image Tools link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Footer.jsx'), 'utf8');
  assert.ok(c.includes('Image Tools'));
});

test('Key interactive elements have semantic IDs', () => {
  const ids = [
    'image-watermark-tool',
    'image-watermark-dropzone',
    'image-watermark-file-input',
    'image-watermark-browse-btn',
    'watermark-text-input',
    'watermark-font-size-slider',
    'watermark-opacity-slider',
    'watermark-rotation-slider',
    'watermark-color-picker',
    'watermark-tiled-toggle',
    'watermark-preview-canvas',
    'watermark-apply-btn',
    'watermark-download-btn',
    'watermark-reset-btn',
    'watermark-clear-btn'
  ];
  ids.forEach((id) => {
    assert.ok(src.includes(`id="${id}"`), `Missing element ID: ${id}`);
  });
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
if (testsFailed > 0) {
  console.error('\n❌ Tests FAILED.');
  process.exit(1);
} else {
  console.log('\n✅ All tests PASS');
}
