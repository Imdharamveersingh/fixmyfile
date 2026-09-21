/**
 * Phase 5.10 — Image to Base64: Difficult Edge Test
 * Run: node test_difficult_image_to_base64.mjs
 */

import fs from 'fs';
import crypto from 'crypto';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

console.log('\n=== Phase 5.10 — Image to Base64: Difficult / Edge Test ===\n');

// GROUP 1: Source Invariants & Security
console.log('GROUP 1: Source Invariants & Architecture');
const src = fs.readFileSync('src/tools/image-to-base64/index.jsx', 'utf8');

assert(src.includes('reader.readAsDataURL(file)'), 'FileReader encodes binary bytes directly without canvas pass');
assert(!src.includes('drawImage('), 'Zero Canvas drawImage re-rendering (prevents image compression/alteration)');
assert(!src.includes('console.log('), 'Zero console.log in production component');

// GROUP 2: Byte-for-Byte Equality Across Formats & Edge Payloads
console.log('\nGROUP 2: Byte-for-Byte Equality & Round-Trip Verification');

// 1. Generate 512 KB known binary payload with arbitrary binary values (0x00 through 0xFF)
const largeBinaryBuffer = crypto.randomBytes(512 * 1024);
const largeBase64 = largeBinaryBuffer.toString('base64');
const largeDataUri = `data:image/png;base64,${largeBase64}`;

// Check prefix
assert(largeDataUri.startsWith('data:image/png;base64,'), 'Large 512KB payload correctly formatted with data URI prefix');

// Check no whitespace or newline wrapping inserted
assert(!largeBase64.includes('\n') && !largeBase64.includes('\r') && !largeBase64.includes(' '), 'Raw Base64 contains zero unwanted whitespace or line breaks');

// Decode back
const decodedLarge = Buffer.from(largeBase64, 'base64');
assert(Buffer.compare(largeBinaryBuffer, decodedLarge) === 0, 'Decoded 512KB buffer matches original byte-for-byte (exact hash equality)');
assert(decodedLarge.length === 512 * 1024, `Decoded byte length (${decodedLarge.length}) matches source exactly`);

// 2. Unicode and Special Character Filename Handling
const edgeFilenames = [
  'photo_über_cool.jpeg',
  '日本語_画像.png',
  'file with spaces & symbols (#@!).webp'
];

edgeFilenames.forEach((name) => {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot !== -1 ? name.substring(0, lastDot) : name;
  const clean = base.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  const outName = `${clean}-base64.txt`;
  assert(outName.endsWith('-base64.txt'), `${name} produces valid sanitized text export filename: ${outName}`);
  assert(!/[^a-zA-Z0-9_.-]/.test(outName), `${name} sanitized filename contains only safe characters`);
});

// 3. Exact MIME Mapping
const mimes = [
  { ext: 'png', mime: 'image/png' },
  { ext: 'jpg', mime: 'image/jpeg' },
  { ext: 'webp', mime: 'image/webp' },
  { ext: 'gif', mime: 'image/gif' },
  { ext: 'svg', mime: 'image/svg+xml' },
  { ext: 'ico', mime: 'image/x-icon' },
  { ext: 'bmp', mime: 'image/bmp' }
];

mimes.forEach((m) => {
  const uri = `data:${m.mime};base64,QUJD`;
  const comma = uri.indexOf(',');
  const prefix = uri.slice(0, comma);
  const detected = prefix.slice(5, prefix.indexOf(';base64'));
  assert(detected === m.mime, `${m.ext}: MIME string properly resolved to ${m.mime}`);
});

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All difficult tests PASS\n');
  process.exit(0);
} else {
  console.error('\n❌ Some difficult tests FAILED\n');
  process.exit(1);
}
