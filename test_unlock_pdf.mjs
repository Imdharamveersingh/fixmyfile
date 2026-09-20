import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import {
  validatePdfBuffer,
  checkPdfStatus,
  unlockPdf,
  verifyUnlockedPdf
} from './src/tools/unlock-pdf/unlockEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING UNLOCK PDF AUTOMATED TEST SUITE ---');

// Helper to create sample plain PDF bytes
async function createSamplePdf(pageCount = 2) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`Sample Page ${i} Content`, { x: 50, y: 650, size: 20, color: rgb(0, 0, 0) });
  }
  return await doc.save();
}

let testsPassed = 0;

// Test 1: Registry & Active Tools verification
{
  console.log('Test 1: Registry & Active Tools count (25 active tools, 55 planned)...');
  const unlockTool = ALL_TOOLS.find((t) => t.path === '/unlock-pdf');
  assert(unlockTool, 'Unlock PDF must exist in ALL_TOOLS');
  assert.equal(unlockTool.name, 'Unlock PDF');
  assert.equal(unlockTool.phase, 'Phase 4');
  assert.equal(unlockTool.category, 'PDF Security');
  assert(ALL_TOOLS.length >= 25, `Expected at least 25 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS');
}

// Test 2: Buffer validation (empty, too small, invalid header)
{
  console.log('Test 2: Buffer validation...');
  assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
  assert.throws(() => validatePdfBuffer(new TextEncoder().encode('NOT_A_PDF')), /missing %PDF-/i);
  testsPassed++;
  console.log('  PASS');
}

// Test 3: Unencrypted PDF detection
{
  console.log('Test 3: Detection of already unlocked / unencrypted PDF...');
  const plainPdf = await createSamplePdf(1);
  const status = await checkPdfStatus(plainPdf, pdfjsLegacy);
  assert.equal(status.isEncrypted, false, 'Plain PDF must not be identified as encrypted');
  assert.equal(status.requiresPassword, false, 'Plain PDF must not require password');
  assert.equal(status.pageCount, 1);
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Encrypted PDF detection
{
  console.log('Test 4: Detection of encrypted PDF...');
  const plainPdf = await createSamplePdf(1);
  const encPdf = await encryptPDF(plainPdf, 'DocPassword123', { algorithm: 'AES-256' });

  const status = await checkPdfStatus(encPdf, pdfjsLegacy);
  assert.equal(status.isEncrypted, true, 'Encrypted PDF must be identified as encrypted');
  assert.equal(status.requiresPassword, true, 'Encrypted PDF must require password');
  testsPassed++;
  console.log('  PASS');
}

// Test 5: Wrong password and empty password rejection
{
  console.log('Test 5: Wrong password and empty password rejection...');
  const plainPdf = await createSamplePdf(1);
  const encPdf = await encryptPDF(plainPdf, 'CorrectPassword!99', { algorithm: 'AES-256' });

  // Empty password
  await assert.rejects(
    async () => unlockPdf(encPdf, '', { pdfjsLib: pdfjsLegacy }),
    /password-protected|enter the password/i
  );

  // Wrong password
  await assert.rejects(
    async () => unlockPdf(encPdf, 'WrongPasswordX', { pdfjsLib: pdfjsLegacy }),
    /incorrect password/i
  );

  testsPassed++;
  console.log('  PASS');
}

// Test 6: Successful unlock with valid password (single-page)
{
  console.log('Test 6: Successful unlock with valid password and verification...');
  const plainPdf = await createSamplePdf(1);
  const testPassword = 'SecureSecretPassword2026';
  const encPdf = await encryptPDF(plainPdf, testPassword, { algorithm: 'AES-256' });

  const progressEvents = [];
  const res = await unlockPdf(encPdf, testPassword, {
    pdfjsLib: pdfjsLegacy,
    baseFilename: 'financial-report',
    onProgress: (state) => progressEvents.push(state)
  });

  assert.equal(res.filename, 'financial-report-unlocked.pdf');
  assert.equal(res.pageCount, 1);
  assert(res.buffer instanceof Uint8Array, 'Result must be a Uint8Array');
  assert(res.buffer.byteLength > 0, 'Unlocked PDF buffer must not be empty');

  // Verify header
  const header = new TextDecoder('ascii').decode(res.buffer.subarray(0, 5));
  assert.equal(header, '%PDF-', 'Must be valid PDF');

  // Verify that the output PDF loads cleanly WITHOUT password in standard PDFDocument
  const verifiedDoc = await PDFDocument.load(res.buffer);
  assert.equal(verifiedDoc.getPageCount(), 1, 'Verified document must have 1 page');

  // Verify progress tracking
  assert(progressEvents.length > 0, 'Progress events must be dispatched');
  assert.equal(progressEvents[progressEvents.length - 1].percent, 100);

  testsPassed++;
  console.log('  PASS');
}

// Test 7: Multi-page encrypted PDF unlock (Difficult test)
{
  console.log('Test 7: Difficult Test — Multi-page AES-256 encrypted PDF unlock...');
  const multiPlainPdf = await createSamplePdf(4);
  const multiPassword = 'MultiPagePassword#456';
  const encMultiPdf = await encryptPDF(multiPlainPdf, multiPassword, { algorithm: 'AES-256' });

  const res = await unlockPdf(encMultiPdf, multiPassword, {
    pdfjsLib: pdfjsLegacy,
    baseFilename: 'contract-bundle'
  });

  assert.equal(res.filename, 'contract-bundle-unlocked.pdf');
  assert.equal(res.pageCount, 4);

  // Verify output can be loaded and read with zero passwords
  const verifiedMulti = await PDFDocument.load(res.buffer);
  assert.equal(verifiedMulti.getPageCount(), 4);

  // Verify each page can be inspected
  const pages = verifiedMulti.getPages();
  assert.equal(pages.length, 4);
  for (let i = 0; i < 4; i++) {
    const size = pages[i].getSize();
    assert.equal(size.width, 500);
    assert.equal(size.height, 700);
  }

  testsPassed++;
  console.log('  PASS');
}

// Test 8: verifyUnlockedPdf helper verification
{
  console.log('Test 8: verifyUnlockedPdf verification logic...');
  const sample = await createSamplePdf(2);
  const ok = await verifyUnlockedPdf(sample, 2);
  assert.equal(ok, true);

  await assert.rejects(
    async () => verifyUnlockedPdf(sample, 5),
    /page count mismatch/i
  );

  testsPassed++;
  console.log('  PASS');
}

console.log(`\nALL ${testsPassed} AUTOMATED TESTS PASSED SUCCESSFULLY! ✓`);
