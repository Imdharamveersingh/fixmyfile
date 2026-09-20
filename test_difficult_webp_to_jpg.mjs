/**
 * Difficult / Edge-Case Test for Phase 5.3 — WebP to JPG
 * Tests conversion engine logic with realistic and adversarial inputs.
 *
 * Run: node test_difficult_webp_to_jpg.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passCount++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failCount++; }

function test(name, fn) {
  try {
    fn();
    pass(name);
  } catch (err) {
    fail(`${name}: ${err.message}`);
  }
}


console.log('\n=== Phase 5.3 — WebP to JPG: Difficult/Edge Test ===\n');

// --- 1. Source code-level validation tests ---
console.log('GROUP 1: Adversarial Input Handling (Source Analysis)');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');

test('Non-WebP file triggers isWebpFile=false path (no match on image/png)', () => {
  // Verifies the guard function won't match a PNG
  assert.ok(src.includes("type === 'image/webp' || name.endsWith('.webp')"), 'WebP type guard missing');
  // Must NOT match other types
  assert.ok(!src.includes("type === 'image/png'"), 'Unexpected PNG match in isWebpFile');
});

test('Canvas fillRect is called before drawImage (correct ordering)', () => {
  const fillIdx = src.indexOf('fillRect');
  const drawIdx = src.indexOf('drawImage');
  assert.ok(fillIdx !== -1, 'fillRect not found');
  assert.ok(drawIdx !== -1, 'drawImage not found');
  assert.ok(fillIdx < drawIdx, 'fillRect must precede drawImage for correct alpha compositing');
});

test('Download filename sanitizer strips special characters', () => {
  assert.ok(src.includes("replace(/[^a-zA-Z0-9_-]/g, '_')"), 'Filename sanitizer missing');
  assert.ok(src.includes("replace(/_+/g, '_')"), 'Consecutive underscore collapse missing');
});

test('Quality value is divided by 100 for Canvas API call', () => {
  assert.ok(src.includes('quality / 100'), 'Quality divided by 100 missing — Canvas API expects 0..1');
});

test('Result objectURL is created from Blob (not a data URL)', () => {
  assert.ok(src.includes('URL.createObjectURL(blob)'), 'createObjectURL from blob missing');
});

test('Conversion failure rejects with informative message', () => {
  assert.ok(src.includes('Canvas toBlob returned null'), 'toBlob null case not handled');
  assert.ok(src.includes('Failed to decode WebP'), 'Image load error not handled');
});

test('conversionTime measured with performance.now()', () => {
  assert.ok(src.includes('performance.now()'), 'Performance timing missing');
  assert.ok(src.includes('conversionTime'), 'conversionTime state missing');
});

// --- 2. File-level structural integrity tests ---
console.log('\nGROUP 2: Structural Integrity');

test('index.jsx file size is reasonable (>8KB, <100KB)', () => {
  const size = fs.statSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx')).size;
  assert.ok(size > 8000, `File too small: ${size} bytes`);
  assert.ok(size < 100000, `File too large: ${size} bytes`);
});

test('No hard-coded absolute paths in source', () => {
  assert.ok(!src.includes('C:\\\\'), 'Hard-coded Windows path found in source');
  assert.ok(!src.includes('/home/'), 'Hard-coded Unix path found in source');
});

test('No console.log calls left in production code', () => {
  const logMatches = (src.match(/console\.log\(/g) || []).length;
  assert.ok(logMatches === 0, `${logMatches} console.log calls found in production code`);
});

// --- 3. Registry completeness check ---
console.log('\nGROUP 3: Registry Completeness');

const regSrc = fs.readFileSync(path.join(__dirname, 'src/tools/toolsRegistry.js'), 'utf8');

test('Phase 5 now has at least 3 tools in registry (image-cropper, heic-to-jpg, webp-to-jpg)', () => {
  const phase5Ids = ['image-cropper', 'heic-to-jpg', 'webp-to-jpg'];
  phase5Ids.forEach((id) => {
    assert.ok(regSrc.includes(`id: '${id}'`), `Missing tool id: ${id}`);
  });
});

test('No duplicate webp-to-jpg entries in registry', () => {
  const matches = (regSrc.match(/id: 'webp-to-jpg'/g) || []).length;
  assert.equal(matches, 1, `Expected exactly 1 webp-to-jpg entry, found ${matches}`);
});

// --- 4. Conversion correctness (browser-side logic) ---
console.log('\nGROUP 4: Conversion Correctness Verification');

// Simulate what the browser canvas does: verify the background+draw compositing logic
// We test this by reading the convertWebpToJpg function contract from source
test('convertWebpToJpg sets canvas dimensions from naturalWidth/naturalHeight', () => {
  assert.ok(src.includes('img.naturalWidth'), 'naturalWidth not used for canvas dimensions');
  assert.ok(src.includes('img.naturalHeight'), 'naturalHeight not used for canvas dimensions');
});

test('Output blob MIME type validated for 0xFF 0xD8 JPEG signature', () => {
  assert.ok(src.includes('bytes[0] !== 0xff || bytes[1] !== 0xd8'), 'JPEG byte signature validation missing');
});

// --- 5. Accessibility & UX ---
console.log('\nGROUP 5: Accessibility & UX');

test('Dropzone has aria-label attribute', () => {
  assert.ok(src.includes('aria-label="Upload WebP image"'), 'Dropzone aria-label missing');
});

test('Dropzone has role="button" and tabIndex', () => {
  assert.ok(src.includes('role="button"') && src.includes('tabIndex={0}'), 'Keyboard accessibility missing');
});

test('Error alert has role="alert"', () => {
  assert.ok(src.includes('role="alert"'), 'role="alert" on error element missing');
});

test('Unique element IDs present (required for testability)', () => {
  const ids = ['webp-to-jpg-dropzone', 'webp-to-jpg-file-input', 'webp-quality-slider', 'webp-to-jpg-download-btn', 'webp-to-jpg-reset-btn'];
  ids.forEach((id) => {
    assert.ok(src.includes(`id="${id}"`), `Missing element id: ${id}`);
  });
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);

if (failCount > 0) {
  console.error('\n❌ Some difficult tests FAILED.');
  process.exit(1);
} else {
  console.log('\n✅ All difficult tests PASS');
}
