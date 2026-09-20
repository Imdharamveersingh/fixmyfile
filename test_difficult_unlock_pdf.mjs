import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import {
  validatePdfBuffer,
  checkPdfStatus,
  unlockPdf
} from './src/tools/unlock-pdf/unlockEngine.js';

console.log('=== STARTING DIFFICULT EDGE TEST: UNLOCK PDF ===\n');

// 1. Create a difficult 5-page PDF with diverse page dimensions
console.log('1. Generating 5-page PDF with varying dimensions (Letter, A4, Square, Banner)...');
const doc = await PDFDocument.create();
const dimensions = [
  { w: 612, h: 792, name: 'US Letter' },
  { w: 595, h: 842, name: 'A4' },
  { w: 500, h: 500, name: 'Square' },
  { w: 800, h: 400, name: 'Landscape Banner' },
  { w: 612, h: 1008, name: 'US Legal' }
];

for (let i = 0; i < dimensions.length; i++) {
  const d = dimensions[i];
  const p = doc.addPage([d.w, d.h]);
  p.drawText(`Page ${i + 1}: ${d.name} (${d.w}x${d.h})`, {
    x: 40,
    y: d.h - 60,
    size: 18,
    color: rgb(0.2, 0.3, 0.4)
  });
}
const plainBytes = await doc.save();
console.log(`   Source PDF generated: ${plainBytes.length} bytes, 5 distinct page sizes\n`);

// 2. Encrypt with complex password containing unicode & special symbols
console.log('2. Encrypting with AES-256 and complex password...');
const complexPassword = 'P@ssw0rd with $peci@l ch@rs & sp@ces! 2026';
const encBytes = await encryptPDF(plainBytes, complexPassword, { algorithm: 'AES-256' });
console.log(`   Encrypted buffer size: ${encBytes.length} bytes\n`);

// 3. Verify status detection
console.log('3. Verifying encryption status detection...');
const status = await checkPdfStatus(encBytes, pdfjsLegacy);
assert.equal(status.isEncrypted, true);
assert.equal(status.requiresPassword, true);
console.log('   ✓ Detected encrypted status requiring password\n');

// 4. Test wrong password
console.log('4. Testing wrong password rejection on complex document...');
await assert.rejects(
  async () => unlockPdf(encBytes, 'DefinitelyWrongPass', { pdfjsLib: pdfjsLegacy }),
  /incorrect password/i
);
console.log('   ✓ Wrong password correctly rejected\n');

// 5. Test unlock with complex password
console.log('5. Executing unlock with complex password...');
const res = await unlockPdf(encBytes, complexPassword, {
  pdfjsLib: pdfjsLegacy,
  baseFilename: 'complex-legal-dossier'
});

assert.equal(res.pageCount, 5);
assert.equal(res.filename, 'complex-legal-dossier-unlocked.pdf');
console.log(`   ✓ Unlocked ${res.pageCount} pages, output size: ${res.buffer.byteLength} bytes\n`);

// 6. Verify page dimension preservation in unlocked output
console.log('6. Inspecting unlocked PDF page dimensions...');
const verifiedDoc = await PDFDocument.load(res.buffer);
assert.equal(verifiedDoc.getPageCount(), 5);
const outPages = verifiedDoc.getPages();

for (let i = 0; i < dimensions.length; i++) {
  const expected = dimensions[i];
  const size = outPages[i].getSize();
  assert.equal(size.width, expected.w, `Page ${i + 1} width mismatch`);
  assert.equal(size.height, expected.h, `Page ${i + 1} height mismatch`);
}
console.log('   ✓ All 5 varied page dimensions preserved exactly\n');

// 7. Test unencrypted status on the unlocked result
console.log('7. Confirming output PDF is genuinely unencrypted...');
const outputStatus = await checkPdfStatus(res.buffer, pdfjsLegacy);
assert.equal(outputStatus.isEncrypted, false);
assert.equal(outputStatus.requiresPassword, false);
console.log('   ✓ Output confirmed 100% unencrypted\n');

// 8. Edge case: Malformed / corrupted PDF buffers
console.log('8. Testing corrupted and invalid inputs...');
assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
assert.throws(() => validatePdfBuffer(new TextEncoder().encode('%PNG-corrupted')), /missing %PDF-/i);
console.log('   ✓ Corrupted / invalid buffers properly rejected\n');

console.log('=== ALL DIFFICULT EDGE TESTS PASSED! ✓ ===');
