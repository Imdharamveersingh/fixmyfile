/**
 * Automated test suite for Phase 5.5 — WebP to PNG Tool
 * Run: node test_webp_to_png.mjs
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

console.log('\n=== Phase 5.5 — WebP to PNG: Automated Tests ===\n');

// GROUP 1: Registry & Route
console.log('GROUP 1: Registry & Route');

test('webp-to-png exists in PHASE_5_TOOLS', () => {
  assert.ok(PHASE_5_TOOLS.some((t) => t.id === 'webp-to-png'), 'webp-to-png missing from PHASE_5_TOOLS');
});

test('webp-to-png has path /webp-to-png', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'webp-to-png');
  assert.equal(t.path, '/webp-to-png');
});

test('webp-to-png has phase Phase 5', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'webp-to-png');
  assert.equal(t.phase, 'Phase 5');
});

test('webp-to-png has category Image Conversion', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'webp-to-png');
  assert.equal(t.category, 'Image Conversion');
});

test('ALL_TOOLS has at least 34 entries', () => {
  assert.ok(ALL_TOOLS.length >= 34, `Expected >= 34 tools, got ${ALL_TOOLS.length}`);
});

test('TOTAL_STRATEGY_TOOLS is still 55', () => {
  assert.equal(TOTAL_STRATEGY_TOOLS, 55);
});

// GROUP 2: App.jsx Integration
console.log('\nGROUP 2: App.jsx Integration');

test('App.jsx imports WebpToPngTool', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes("import WebpToPngTool from './tools/webp-to-png'"));
});

test('App.jsx has webp-to-png route', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes('path="webp-to-png"'));
});

// GROUP 3: Component Source & Exports
console.log('\nGROUP 3: Component Files');

test('src/tools/webp-to-png/index.jsx exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, 'src/tools/webp-to-png/index.jsx')));
});

test('index.jsx exports WebpToPngTool as default', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-png/index.jsx'), 'utf8');
  assert.ok(c.includes('export default function WebpToPngTool'));
});

// GROUP 4: Validation Logic
console.log('\nGROUP 4: Validation Logic');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-png/index.jsx'), 'utf8');

test('isWebpFile checks image/webp MIME type', () => {
  assert.ok(src.includes("type === 'image/webp'"));
});

test('isWebpFile checks .webp extension', () => {
  assert.ok(src.includes(".endsWith('.webp')"));
});

test('Magic bytes validateWebpBuffer checks RIFF and WEBP signatures', () => {
  assert.ok(src.includes('0x52') && src.includes('0x49') && src.includes('0x46') && src.includes('0x46'), 'Missing RIFF signature');
  assert.ok(src.includes('0x57') && src.includes('0x45') && src.includes('0x42') && src.includes('0x50'), 'Missing WEBP signature');
});

test('Max file size 50 MB enforced', () => {
  assert.ok(src.includes('50 * 1024 * 1024'));
});

test('Empty file (0 bytes) rejected', () => {
  assert.ok(src.includes('file.size === 0'));
});

// GROUP 5: PNG Pipeline & Transparency
console.log('\nGROUP 5: PNG Pipeline & Transparency');

test('Canvas toBlob uses image/png MIME type', () => {
  assert.ok(src.includes("'image/png'"));
});

test('Preserve transparency state toggle present', () => {
  assert.ok(src.includes('preserveTransparency'));
});

test('Dimensions preserved from img.naturalWidth & naturalHeight', () => {
  assert.ok(src.includes('canvas.width = img.naturalWidth'));
  assert.ok(src.includes('canvas.height = img.naturalHeight'));
});

test('PNG signature validation function present (0x89, 0x50, 0x4E, 0x47)', () => {
  assert.ok(
    src.includes('0x89') && src.includes('0x50') && src.includes('0x4E') && src.includes('0x47'),
    'PNG magic signature missing'
  );
  assert.ok(
    src.includes('0x0D') && src.includes('0x0A') && src.includes('0x1A'),
    'PNG line ending signature missing'
  );
});

test('IHDR chunk check present', () => {
  assert.ok(src.includes('0x49') && src.includes('0x48') && src.includes('0x44') && src.includes('0x52'), 'IHDR check missing');
});

// GROUP 6: Filename and Download
console.log('\nGROUP 6: Filename & Download');

test('getPngDownloadName sanitizes special characters and ends in .png', () => {
  assert.ok(src.includes("replace(/[^a-zA-Z0-9_-]/g, '_')"));
  assert.ok(src.includes('.png'));
});

test('Download trigger present with HTMLAnchorElement click', () => {
  assert.ok(src.includes('handleDownload') && src.includes('a.click()'));
});

// GROUP 7: Object URL Safety & Lifecycle
console.log('\nGROUP 7: Object URL Safety & Lifecycle');

test('Object URLs revoked on reset and unmount', () => {
  assert.ok(src.includes('revokeOriginalUrl') && src.includes('revokeConvertedUrl'));
  assert.ok(src.includes('URL.revokeObjectURL'));
});

test('useEffect cleanup callback registered', () => {
  assert.ok(src.includes('useEffect(() => {'));
});

// GROUP 8: Navigation Links
console.log('\nGROUP 8: Navigation Links');

test('Header.jsx contains webp-to-png link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Header.jsx'), 'utf8');
  assert.ok(c.includes('/webp-to-png'));
});

test('Footer.jsx contains webp-to-png link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Footer.jsx'), 'utf8');
  assert.ok(c.includes('/webp-to-png'));
});

// GROUP 9: UX States & Accessibility
console.log('\nGROUP 9: UX States & Accessibility');

test('All required states present (IDLE, LOADING, CONVERTING, VALIDATING, SUCCESS, ERROR)', () => {
  ['IDLE', 'LOADING', 'CONVERTING', 'VALIDATING', 'SUCCESS', 'ERROR'].forEach((s) => {
    assert.ok(src.includes(`'${s}'`), `State '${s}' missing`);
  });
});

test('Dropzone element has id webp-to-png-dropzone', () => {
  assert.ok(src.includes('id="webp-to-png-dropzone"'));
});

test('Download button has id webp-to-png-download-btn', () => {
  assert.ok(src.includes('id="webp-to-png-download-btn"'));
});

test('Reset button has id webp-to-png-reset-btn', () => {
  assert.ok(src.includes('id="webp-to-png-reset-btn"'));
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
