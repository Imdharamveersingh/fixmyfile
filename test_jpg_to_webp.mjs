/**
 * Automated test suite for Phase 5.4 — JPG to WebP Tool
 * Run: node test_jpg_to_webp.mjs
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
} catch {
  console.error('Could not import registry.');
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

console.log('\n=== Phase 5.4 — JPG to WebP: Automated Tests ===\n');

// GROUP 1: Registry & Route
console.log('GROUP 1: Registry & Route');

test('jpg-to-webp exists in PHASE_5_TOOLS', () => {
  assert.ok(PHASE_5_TOOLS.some((t) => t.id === 'jpg-to-webp'), 'jpg-to-webp missing from PHASE_5_TOOLS');
});

test('jpg-to-webp has correct path /jpg-to-webp', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'jpg-to-webp');
  assert.equal(t.path, '/jpg-to-webp');
});

test('jpg-to-webp has correct phase Phase 5', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'jpg-to-webp');
  assert.equal(t.phase, 'Phase 5');
});

test('jpg-to-webp has correct category Image Conversion', () => {
  const t = PHASE_5_TOOLS.find((t) => t.id === 'jpg-to-webp');
  assert.equal(t.category, 'Image Conversion');
});

test('ALL_TOOLS has at least 33 entries', () => {
  assert.ok(ALL_TOOLS.length >= 33, `Expected >= 33 tools, got ${ALL_TOOLS.length}`);
});

test('TOTAL_STRATEGY_TOOLS is still 55', () => {
  assert.equal(TOTAL_STRATEGY_TOOLS, 55);
});

// GROUP 2: App.jsx
console.log('\nGROUP 2: App.jsx');

test('App.jsx imports JpgToWebpTool', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes("import JpgToWebpTool from './tools/jpg-to-webp'"));
});

test('App.jsx has jpg-to-webp route', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(c.includes('path="jpg-to-webp"'));
});

// GROUP 3: Component
console.log('\nGROUP 3: Component Files');

test('src/tools/jpg-to-webp/index.jsx exists', () => {
  assert.ok(fs.existsSync(path.join(__dirname, 'src/tools/jpg-to-webp/index.jsx')));
});

test('index.jsx exports JpgToWebpTool default', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/tools/jpg-to-webp/index.jsx'), 'utf8');
  assert.ok(c.includes('export default function JpgToWebpTool'));
});

// GROUP 4: Validation Logic
console.log('\nGROUP 4: Validation Logic');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/jpg-to-webp/index.jsx'), 'utf8');

test('isJpgFile accepts image/jpeg', () => {
  assert.ok(src.includes("type === 'image/jpeg'"));
});

test('isJpgFile accepts .jpg and .jpeg extensions', () => {
  assert.ok(src.includes(".endsWith('.jpg')") && src.includes(".endsWith('.jpeg')"));
});

test('Max file size 50 MB enforced', () => {
  assert.ok(src.includes('50 * 1024 * 1024'));
});

test('Empty file (0 bytes) rejected', () => {
  assert.ok(src.includes('file.size === 0'));
});

// GROUP 5: WebP Encoding
console.log('\nGROUP 5: WebP Encoding');

test('Output MIME type is image/webp in toBlob', () => {
  assert.ok(src.includes("'image/webp'"));
});

test('Quality divided by 100 for Canvas API', () => {
  assert.ok(src.includes('quality / 100') || src.includes('effectiveQuality / 100'));
});

test('RIFF/WEBP output signature validation present', () => {
  assert.ok(src.includes('0x52') && src.includes('0x57') && src.includes('0x45') && src.includes('0x42'));
});

// GROUP 6: Lossy/Lossless Mode
console.log('\nGROUP 6: Lossy/Lossless Mode');

test('Lossless mode state present', () => {
  assert.ok(src.includes('losslessMode'));
});

test('Default quality is 85', () => {
  assert.ok(src.includes('useState(85)'));
});

test('Lossless toggle button exists', () => {
  assert.ok(src.includes('jpg-to-webp-lossless'));
});

// GROUP 7: Object URL Safety
console.log('\nGROUP 7: Object URL Safety');

test('Object URLs revoked (revokeObjectURL)', () => {
  assert.ok(src.includes('revokeObjectURL'));
});

test('useEffect cleanup present', () => {
  assert.ok(src.includes('useEffect'));
});

// GROUP 8: Navigation
console.log('\nGROUP 8: Navigation');

test('Header.jsx contains jpg-to-webp link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Header.jsx'), 'utf8');
  assert.ok(c.includes('/jpg-to-webp'));
});

test('Footer.jsx contains compact Image Tools link', () => {
  const c = fs.readFileSync(path.join(__dirname, 'src/components/Footer.jsx'), 'utf8');
  assert.ok(c.includes('Image Tools'));
});

// GROUP 9: UX States
console.log('\nGROUP 9: UX States');

test('All required states present (IDLE, LOADING, CONVERTING, VALIDATING, SUCCESS, ERROR)', () => {
  ['IDLE', 'LOADING', 'CONVERTING', 'VALIDATING', 'SUCCESS', 'ERROR'].forEach((s) => {
    assert.ok(src.includes(`'${s}'`), `State '${s}' missing`);
  });
});

test('Download button present', () => {
  assert.ok(src.includes('Download WebP') && src.includes('handleDownload'));
});

test('Reset button present', () => {
  assert.ok(src.includes('Convert Another') && src.includes('handleReset'));
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
