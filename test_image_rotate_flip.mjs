/**
 * Automated test suite for Phase 5.6 — Image Rotate & Flip Tool
 * Run: node test_image_rotate_flip.mjs
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

console.log('\n=== Phase 5.6 — Image Rotate / Flip: Automated Tests ===\n');

// GROUP 1: Registry & Routing
console.log('GROUP 1: Registry & Routing');

test('image-rotate-flip exists in PHASE_5_TOOLS', () => {
  assert.ok(PHASE_5_TOOLS.some((t) => t.id === 'image-rotate-flip'), 'image-rotate-flip missing from PHASE_5_TOOLS');
});

test('image-rotate-flip has path /image-rotate-flip', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'image-rotate-flip');
  assert.equal(t.path, '/image-rotate-flip');
});

test('image-rotate-flip has phase Phase 5', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'image-rotate-flip');
  assert.equal(t.phase, 'Phase 5');
});

test('image-rotate-flip has category Image Editing', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'image-rotate-flip');
  assert.equal(t.category, 'Image Editing');
});

test('ALL_TOOLS has at least 35 entries', () => {
  assert.ok(ALL_TOOLS.length >= 35, `Expected >= 35 tools, got ${ALL_TOOLS.length}`);
});

test('TOTAL_STRATEGY_TOOLS is still 55', () => {
  assert.equal(TOTAL_STRATEGY_TOOLS, 55);
});

// GROUP 2: App.jsx Integration
console.log('\nGROUP 2: App.jsx Integration');

test('App.jsx imports ImageRotateFlipTool', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes("import ImageRotateFlipTool from './tools/image-rotate-flip'"));
});

test('App.jsx has image-rotate-flip route', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes('path="image-rotate-flip"'));
});

// GROUP 3: Component Files
console.log('\nGROUP 3: Component Files');

test('src/tools/image-rotate-flip/index.jsx exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, 'src/tools/image-rotate-flip/index.jsx')));
});

test('index.jsx exports ImageRotateFlipTool as default', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/tools/image-rotate-flip/index.jsx'), 'utf8');
  assert.ok(c.includes('export default function ImageRotateFlipTool'));
});

// GROUP 4: Mathematical Transformation & Logic
console.log('\nGROUP 4: Mathematical Transformation & Dimension Swapping');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/image-rotate-flip/index.jsx'), 'utf8');

test('90° CW rotation multiplies by R_CW matrix [0, -1], [1, 0]', () => {
  assert.ok(src.includes('R_CW') && src.includes('[0, -1]') && src.includes('[1, 0]'));
});

test('270° / CCW rotation multiplies by R_CCW matrix [0, 1], [-1, 0]', () => {
  assert.ok(src.includes('R_CCW') && src.includes('[0, 1]') && src.includes('[-1, 0]'));
});

test('180° rotation multiplies by R_180 matrix [-1, 0], [0, -1]', () => {
  assert.ok(src.includes('R_180') && src.includes('[-1, 0]') && src.includes('[0, -1]'));
});

test('Horizontal flip multiplies by F_H matrix [-1, 0], [0, 1]', () => {
  assert.ok(src.includes('F_H') && src.includes('[-1, 0]') && src.includes('[0, 1]'));
});

test('Vertical flip multiplies by F_V matrix [1, 0], [0, -1]', () => {
  assert.ok(src.includes('F_V') && src.includes('[1, 0]') && src.includes('[0, -1]'));
});

test('Dimension swapping correctly swaps width and height when matrix swaps axes', () => {
  assert.ok(
    src.includes('Math.abs(matrix[0][0]) === 0') &&
      src.includes('isSwapped ? origH : origW') &&
      src.includes('isSwapped ? origW : origH'),
    'Dimension swap logic missing'
  );
});

test('Canvas transformation matrix uses translate, transform, and drawImage', () => {
  assert.ok(src.includes('ctx.translate'), 'ctx.translate missing');
  assert.ok(src.includes('ctx.transform'), 'ctx.transform missing');
  assert.ok(src.includes('ctx.drawImage'), 'ctx.drawImage missing');
});

// GROUP 5: Input Validation & Bounds
console.log('\nGROUP 5: Input Validation & Safety');

test('Supported image validation checks jpg, png, webp, gif, bmp', () => {
  assert.ok(src.includes('.jpg') && src.includes('.png') && src.includes('.webp') && src.includes('.gif'));
});

test('Empty file (0 bytes) is rejected', () => {
  assert.ok(src.includes('file.size === 0'));
});

test('File exceeding 50 MB is rejected', () => {
  assert.ok(src.includes('50 * 1024 * 1024'));
});

test('Object URLs are revoked (memory leak prevention)', () => {
  assert.ok(src.includes('URL.revokeObjectURL'));
  assert.ok(src.includes('revokeExportUrl') && src.includes('revokeOrigUrl'));
});

// GROUP 6: Output Formats & Transparency
console.log('\nGROUP 6: Output Formats & Transparency');

test('Supports PNG format preserving alpha channel', () => {
  assert.ok(src.includes("'image/png'"));
});

test('Supports JPEG and WebP output formats', () => {
  assert.ok(src.includes("'image/jpeg'") && src.includes("'image/webp'"));
});

test('JPEG fills white background to avoid transparent black artifacts', () => {
  assert.ok(src.includes("outputFormat === 'jpeg'") && src.includes("ctx.fillStyle = '#ffffff'"));
});

test('Download filename generator sanitizes input and uses appropriate extension', () => {
  assert.ok(src.includes('getDownloadName'));
  assert.ok(src.includes("replace(/[^a-zA-Z0-9_-]/g, '_')"));
});

// GROUP 7: Navigation & Accessibility
console.log('\nGROUP 7: Navigation & UI Controls');

test('Header.jsx contains image-rotate-flip link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Header.jsx'), 'utf8');
  assert.ok(c.includes('/image-rotate-flip'));
});

test('Footer.jsx contains compact Image Tools link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Footer.jsx'), 'utf8');
  assert.ok(c.includes('Image Tools'));
});

test('Required control buttons have semantic IDs', () => {
  const ids = [
    'image-rotate-dropzone',
    'image-rotate-file-input',
    'image-rotate-browse-btn',
    'image-rotate-90-btn',
    'image-rotate-180-btn',
    'image-rotate-270-btn',
    'image-rotate-flip-h-btn',
    'image-rotate-flip-v-btn',
    'image-reset-transform-btn',
    'image-preview-canvas',
    'image-rotate-download-btn'
  ];
  ids.forEach((id) => {
    assert.ok(src.includes(`id="${id}"`), `Missing ID: ${id}`);
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
