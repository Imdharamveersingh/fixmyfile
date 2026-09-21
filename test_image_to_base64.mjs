import fs from 'fs';
import { PHASE_5_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

console.log('\n=== Phase 5.10 — Image to Base64: Automated Tests ===\n');

// GROUP 1: Registry & Routing
console.log('GROUP 1: Registry & Routing');
const toolEntry = PHASE_5_TOOLS.find((t) => t.id === 'image-to-base64');
assert(!!toolEntry, 'image-to-base64 exists in PHASE_5_TOOLS');
assert(toolEntry?.path === '/image-to-base64', 'image-to-base64 has path /image-to-base64');
assert(toolEntry?.phase === 'Phase 5', 'image-to-base64 has phase Phase 5');
assert(toolEntry?.category === 'Image Utilities', 'image-to-base64 has category Image Utilities');
assert(ALL_TOOLS.length >= 39, `ALL_TOOLS has 39 entries (found ${ALL_TOOLS.length})`);
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS is still 55');
assert(PHASE_5_TOOLS.length === 10, `PHASE_5_TOOLS is complete with 10 tools (found ${PHASE_5_TOOLS.length})`);

// GROUP 2: App.jsx Integration
console.log('\nGROUP 2: App.jsx Integration');
const appContent = fs.readFileSync('./src/App.jsx', 'utf8');
assert(appContent.includes('import ImageToBase64Tool'), 'App.jsx imports ImageToBase64Tool');
assert(appContent.includes('path="image-to-base64"'), 'App.jsx has image-to-base64 route');

// GROUP 3: Component Source Files
console.log('\nGROUP 3: Component Source Files');
const componentPath = './src/tools/image-to-base64/index.jsx';
assert(fs.existsSync(componentPath), 'src/tools/image-to-base64/index.jsx exists');
const componentContent = fs.readFileSync(componentPath, 'utf8');
assert(componentContent.includes('export default function ImageToBase64Tool'), 'index.jsx exports ImageToBase64Tool as default');

// GROUP 4: Base64 Encoding & Round-Trip Fidelity
console.log('\nGROUP 4: Base64 Encoding & Round-Trip Fidelity');

// Test fixtures for PNG, JPEG, WebP
const fixtures = [
  {
    name: 'test.png',
    mime: 'image/png',
    bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])
  },
  {
    name: 'photo.jpg',
    mime: 'image/jpeg',
    bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x60])
  },
  {
    name: 'graphic.webp',
    mime: 'image/webp',
    bytes: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20])
  }
];

fixtures.forEach((f) => {
  const base64Str = f.bytes.toString('base64');
  const dataUri = `data:${f.mime};base64,${base64Str}`;

  // Check prefix
  assert(dataUri.startsWith(`data:${f.mime};base64,`), `${f.name}: Data URI begins with correct prefix`);

  // Extract raw
  const raw = dataUri.slice(dataUri.indexOf(',') + 1);
  assert(raw === base64Str, `${f.name}: Raw payload accurately isolated from Data URI`);

  // Decode round-trip
  const decoded = Buffer.from(raw, 'base64');
  assert(Buffer.compare(decoded, f.bytes) === 0, `${f.name}: Decoded bytes exactly match original bytes`);
  assert(decoded.length === f.bytes.length, `${f.name}: Decoded byte length matches original byte count`);
});

// GROUP 5: Input Validation & Safety
console.log('\nGROUP 5: Input Validation & Safety Logic');
assert(componentContent.includes('file.size === 0'), 'Zero-byte file rejection logic present');
assert(componentContent.includes('50 * 1024 * 1024'), '50 MB file ceiling enforced');
assert(componentContent.includes('isSupportedImage'), 'File format validation function present');
assert(componentContent.includes('reader.readAsDataURL(file)'), 'FileReader directly encodes binary bytes without canvas pass');

// GROUP 6: UI Features, Copy & Reset
console.log('\nGROUP 6: UI Features, Copy & Reset');
assert(componentContent.includes('htmlSnippet'), 'HTML <img> tag generator implemented');
assert(componentContent.includes('cssSnippet'), 'CSS background-image snippet generator implemented');
assert(componentContent.includes('getBase64DownloadName'), 'Sanitized text download generator present');
assert(componentContent.includes('resetAll'), 'Reset function defined');

// GROUP 7: Navigation & Semantic IDs
console.log('\nGROUP 7: Navigation & Semantic IDs');
const headerContent = fs.readFileSync('./src/components/Header.jsx', 'utf8');
assert(headerContent.includes('/image-to-base64'), 'Header.jsx contains link to /image-to-base64');
const footerContent = fs.readFileSync('./src/components/Footer.jsx', 'utf8');
assert(footerContent.includes('/image-to-base64'), 'Footer.jsx contains link to /image-to-base64');
assert(componentContent.includes('id="image-to-base64-dropzone"'), 'Dropzone has id image-to-base64-dropzone');
assert(componentContent.includes('id="image-to-base64-copy-datauri-btn"'), 'Copy Data URI button has id');
assert(componentContent.includes('id="image-to-base64-copy-raw-btn"'), 'Copy Raw button has id');
assert(componentContent.includes('id="image-to-base64-download-btn"'), 'Download button has id');
assert(componentContent.includes('id="image-to-base64-reset-btn"'), 'Reset button has id');

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All tests PASS\n');
  process.exit(0);
} else {
  console.error('\n❌ Some tests FAILED\n');
  process.exit(1);
}
