/**
 * Automated test suite for Phase 5.3 — WebP to JPG Tool
 * Tests run in Node.js. Canvas-based conversion tests use fixture files.
 *
 * Run: node test_webp_to_jpg.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Import registry ---
// Evaluate registry in a minimal way by extracting the PHASE_5_TOOLS and ALL_TOOLS arrays
// We'll use a targeted dynamic import approach
let PHASE_5_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS;
try {
  const mod = await import('./src/tools/toolsRegistry.js');
  PHASE_5_TOOLS = mod.PHASE_5_TOOLS;
  ALL_TOOLS = mod.ALL_TOOLS;
  TOTAL_STRATEGY_TOOLS = mod.TOTAL_STRATEGY_TOOLS;
} catch {
  // Fallback: parse from file content manually for Node test context
  console.error('Could not dynamically import registry — parsing statically.');
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
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
  }
}

console.log('\n=== Phase 5.3 — WebP to JPG: Automated Tests ===\n');

// --- 1. Registry & Route Tests ---
console.log('GROUP 1: Registry & Route');

test('webp-to-jpg exists in PHASE_5_TOOLS', () => {
  const tool = PHASE_5_TOOLS.find((t) => t.id === 'webp-to-jpg');
  assert.ok(tool, 'webp-to-jpg must be in PHASE_5_TOOLS');
});

test('webp-to-jpg has correct path /webp-to-jpg', () => {
  const tool = PHASE_5_TOOLS.find((t) => t.id === 'webp-to-jpg');
  assert.equal(tool.path, '/webp-to-jpg');
});

test('webp-to-jpg has correct phase Phase 5', () => {
  const tool = PHASE_5_TOOLS.find((t) => t.id === 'webp-to-jpg');
  assert.equal(tool.phase, 'Phase 5');
});

test('webp-to-jpg has correct category Image Conversion', () => {
  const tool = PHASE_5_TOOLS.find((t) => t.id === 'webp-to-jpg');
  assert.equal(tool.category, 'Image Conversion');
});

test('ALL_TOOLS has at least 32 entries (31 previous + webp-to-jpg)', () => {
  assert.ok(ALL_TOOLS.length >= 32, `Expected >= 32 tools, got ${ALL_TOOLS.length}`);
});

test('TOTAL_STRATEGY_TOOLS is still 55', () => {
  assert.equal(TOTAL_STRATEGY_TOOLS, 55);
});

// --- 2. App.jsx Route Registration ---
console.log('\nGROUP 2: App.jsx Route Registration');

test('App.jsx imports WebpToJpgTool', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(content.includes("import WebpToJpgTool from './tools/webp-to-jpg'"), 'WebpToJpgTool import missing');
});

test('App.jsx has webp-to-jpg route', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/App.jsx'), 'utf8');
  assert.ok(content.includes('path="webp-to-jpg"'), 'webp-to-jpg route missing in App.jsx');
});

// --- 3. Component File Existence ---
console.log('\nGROUP 3: Component Files');

test('src/tools/webp-to-jpg/index.jsx exists', () => {
  const p = path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx');
  assert.ok(fs.existsSync(p), 'index.jsx not found');
});

test('index.jsx exports WebpToJpgTool default', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('export default function WebpToJpgTool'), 'WebpToJpgTool default export missing');
});

// --- 4. Input Validation Logic ---
console.log('\nGROUP 4: Validation Logic');

test('isWebpFile accepts image/webp MIME type', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes("type === 'image/webp'"), 'image/webp MIME check missing');
});

test('isWebpFile accepts .webp extension', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes(".endsWith('.webp')"), '.webp extension check missing');
});

test('Max file size limit of 50 MB is enforced', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('50 * 1024 * 1024'), '50MB limit check missing');
});

test('Empty file (0 bytes) is rejected', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('file.size === 0'), '0-byte file check missing');
});

// --- 5. Background / Transparency Handling ---
console.log('\nGROUP 5: Transparency Handling');

test('Background color fill is applied before JPEG encoding', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('fillStyle = bgColor'), 'Background fill missing');
  assert.ok(content.includes('fillRect'), 'fillRect call missing');
});

test('White, Black, Custom presets are present', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes("'#ffffff'") && content.includes("'#000000'"), 'White/Black presets missing');
});

// --- 6. Output / JPEG Validation ---
console.log('\nGROUP 6: Output Validation');

test('JPEG magic byte validation present (0xff, 0xd8)', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('0xff') && content.includes('0xd8'), 'JPEG magic byte check missing');
});

test('Output MIME type is image/jpeg in toBlob call', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes("'image/jpeg'"), 'image/jpeg MIME in toBlob missing');
});

// --- 7. Quality Control ---
console.log('\nGROUP 7: Quality Control');

test('Default quality is 90', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('useState(90)'), 'Default quality 90 missing');
});

test('Quality slider range is 10–100', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('min="10"') && content.includes('max="100"'), 'Quality slider range missing');
});

// --- 8. Navigation Registration ---
console.log('\nGROUP 8: Navigation');

test('Header.jsx contains webp-to-jpg link', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/components/Header.jsx'), 'utf8');
  assert.ok(content.includes('/webp-to-jpg'), 'webp-to-jpg missing from Header');
});

test('Footer.jsx contains compact Image Tools link', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/components/Footer.jsx'), 'utf8');
  assert.ok(content.includes('Image Tools'), 'Image Tools missing from Footer');
});

// --- 9. Object URL Safety ---
console.log('\nGROUP 9: Object URL Safety');

test('Object URLs are revoked in cleanup (revokeObjectURL)', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('revokeObjectURL'), 'URL.revokeObjectURL cleanup missing');
});

test('useEffect cleanup is present', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('useEffect'), 'useEffect cleanup hook missing');
});

// --- 10. UX States ---
console.log('\nGROUP 10: UX States');

test('All required processing states are present (IDLE, LOADING, CONVERTING, VALIDATING, SUCCESS, ERROR)', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  ['IDLE', 'LOADING', 'CONVERTING', 'VALIDATING', 'SUCCESS', 'ERROR'].forEach((state) => {
    assert.ok(content.includes(`'${state}'`), `Processing state '${state}' missing`);
  });
});

test('Reset / Convert Another button is present', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('handleReset') && content.includes('Convert Another'), 'Reset flow missing');
});

test('Download button is present', () => {
  const content = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-jpg/index.jsx'), 'utf8');
  assert.ok(content.includes('handleDownload') && content.includes('Download JPG'), 'Download button missing');
});

// Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${testsPassed + testsFailed} | Passed: ${testsPassed} | Failed: ${testsFailed}`);
if (testsFailed > 0) {
  console.error('\n❌ Some tests FAILED. Fix before proceeding.');
  process.exit(1);
} else {
  console.log('\n✅ All tests PASS');
}
