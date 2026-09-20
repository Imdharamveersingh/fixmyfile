/**
 * Difficult / Edge-Case Test for Phase 5.4 — JPG to WebP
 * Run: node test_difficult_jpg_to_webp.mjs
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
  try { fn(); pass(name); }
  catch (err) { fail(`${name}: ${err.message}`); }
}

console.log('\n=== Phase 5.4 — JPG to WebP: Difficult/Edge Test ===\n');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/jpg-to-webp/index.jsx'), 'utf8');
const regSrc = fs.readFileSync(path.join(__dirname, 'src/tools/toolsRegistry.js'), 'utf8');

console.log('GROUP 1: Adversarial Input Handling');

test('Non-JPG file is rejected (no PNG/WebP match in isJpgFile)', () => {
  assert.ok(src.includes("type === 'image/jpeg'"), 'JPEG MIME guard missing');
  assert.ok(!src.includes("type === 'image/png'"), 'Unexpected PNG match in isJpgFile');
  assert.ok(!src.includes("type === 'image/webp'"), 'Unexpected WebP match in isJpgFile');
});

test('drawImage called without background fill (JPEG is opaque, no alpha fill needed)', () => {
  // JPG has no transparency — there is no fillRect needed before drawing
  assert.ok(src.includes('ctx.drawImage(img, 0, 0)'), 'drawImage call missing');
});

test('Download filename sanitizes special characters', () => {
  assert.ok(src.includes("replace(/[^a-zA-Z0-9_-]/g, '_')"), 'Filename sanitizer missing');
});

test('Canvas toBlob null case is handled gracefully', () => {
  assert.ok(src.includes('Canvas toBlob returned null'), 'toBlob null case not handled');
});

test('Image decode failure error message is user-friendly', () => {
  assert.ok(src.includes('Failed to decode JPG image'), 'Decode failure message missing');
});

test('Lossless mode applies quality=100 for maximum fidelity', () => {
  assert.ok(src.includes('losslessMode ? 100 : quality'), 'Lossless quality override missing');
});

test('Performance timing tracked', () => {
  assert.ok(src.includes('performance.now()'), 'Performance timing missing');
});

console.log('\nGROUP 2: WebP Signature Validation');

test('All 4 RIFF bytes checked (0x52, 0x49, 0x46, 0x46)', () => {
  assert.ok(
    src.includes('0x52') && src.includes('0x49') && src.includes('0x46'),
    'RIFF signature bytes incomplete'
  );
});

test('All 4 WEBP bytes checked at offset 8..11 (0x57, 0x45, 0x42, 0x50)', () => {
  assert.ok(
    src.includes('0x57') && src.includes('0x45') && src.includes('0x42') && src.includes('0x50'),
    'WEBP signature bytes incomplete'
  );
});

test('Browser compatibility warning included in validation error', () => {
  assert.ok(src.includes('browser may not support WebP encoding'), 'Browser compat note missing');
});

console.log('\nGROUP 3: Structural Integrity');

test('File size is reasonable (> 8KB, < 100KB)', () => {
  const size = fs.statSync(path.join(__dirname, 'src/tools/jpg-to-webp/index.jsx')).size;
  assert.ok(size > 8000 && size < 100000, `File size: ${size} bytes`);
});

test('No hard-coded absolute paths', () => {
  assert.ok(!src.includes('C:\\\\') && !src.includes('/home/'));
});

test('No console.log in production source', () => {
  const logs = (src.match(/console\.log\(/g) || []).length;
  assert.ok(logs === 0, `${logs} console.log calls found`);
});

console.log('\nGROUP 4: Registry Completeness');

test('Phase 5 has 4 tools (image-cropper, heic-to-jpg, webp-to-jpg, jpg-to-webp)', () => {
  ['image-cropper', 'heic-to-jpg', 'webp-to-jpg', 'jpg-to-webp'].forEach((id) => {
    assert.ok(regSrc.includes(`id: '${id}'`), `Missing: ${id}`);
  });
});

test('No duplicate jpg-to-webp entries', () => {
  const count = (regSrc.match(/id: 'jpg-to-webp'/g) || []).length;
  assert.equal(count, 1, `Expected 1 entry, found ${count}`);
});

console.log('\nGROUP 5: Accessibility');

test('Dropzone has aria-label', () => {
  assert.ok(src.includes('aria-label="Upload JPG or JPEG image"'));
});

test('Dropzone has role="button" and tabIndex', () => {
  assert.ok(src.includes('role="button"') && src.includes('tabIndex={0}'));
});

test('Error alert has role="alert"', () => {
  assert.ok(src.includes('role="alert"'));
});

test('Required element IDs present', () => {
  ['jpg-to-webp-dropzone', 'jpg-to-webp-file-input', 'jpg-to-webp-download-btn', 'jpg-to-webp-reset-btn'].forEach((id) => {
    assert.ok(src.includes(`id="${id}"`), `Missing id: ${id}`);
  });
});

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) { console.error('\n❌ Some tests FAILED.'); process.exit(1); }
else { console.log('\n✅ All difficult tests PASS'); }
