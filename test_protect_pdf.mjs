import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  protectPdf,
  verifyPdfProtection,
  validatePdfBuffer
} from './src/tools/protect-pdf/protectEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING PROTECT PDF AUTOMATED TEST SUITE ---');

// Helper to create sample PDF bytes
async function createSamplePdf(pageCount = 2) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`Confidential Page ${i} Content`, { x: 50, y: 650, size: 20, color: rgb(0, 0, 0) });
  }
  return await doc.save();
}

let testsPassed = 0;

// Test 1: Registry & Active Tools verification
{
  console.log('Test 1: Registry & Active Tools count (24 active tools, 55 planned)...');
  const protectTool = ALL_TOOLS.find((t) => t.path === '/protect-pdf');
  assert(protectTool, 'Protect PDF must exist in ALL_TOOLS');
  assert.equal(protectTool.name, 'Protect PDF');
  assert.equal(protectTool.phase, 'Phase 4');
  assert(ALL_TOOLS.length >= 24, `Expected at least 24 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS');
}

// Test 2: Input validation (empty password, confirmation mismatch, invalid buffer)
{
  console.log('Test 2: Password and buffer validation...');
  const samplePdf = await createSamplePdf(1);

  // Empty password
  await assert.rejects(async () => protectPdf(samplePdf, ''), /enter a password/i);
  await assert.rejects(async () => protectPdf(samplePdf, null), /enter a password/i);

  // Confirmation mismatch
  await assert.rejects(
    async () => protectPdf(samplePdf, 'Pass123', { confirmPassword: 'DifferentPass' }),
    /confirmation does not match|does not match/i
  );

  // Empty or invalid PDF buffer
  assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
  assert.throws(() => validatePdfBuffer(new TextEncoder().encode('NON_PDF_DATA')), /missing %PDF-/i);

  testsPassed++;
  console.log('  PASS');
}

// Test 3: Standard AES-256 PDF Encryption & Mandatory 7-Point Security Verification
{
  console.log('Test 3: Standard AES-256 Encryption & 7-Point Security Gate...');
  const samplePdf = await createSamplePdf(1);
  const correctPassword = 'MySecretPassword#2026';

  const res = await protectPdf(samplePdf, correctPassword, {
    confirmPassword: correctPassword,
    baseFilename: 'confidential'
  });

  assert.equal(res.filename, 'confidential-protected.pdf');
  assert.equal(res.algorithm, 'AES-256');
  assert(res.buffer instanceof Uint8Array, 'Result must be a Uint8Array');
  assert(res.buffer.byteLength > samplePdf.length, 'Encrypted PDF must include encryption dictionary');

  // Verify PDF header
  const header = new TextDecoder('ascii').decode(res.buffer.subarray(0, 5));
  assert.equal(header, '%PDF-', 'Encrypted file must be a valid PDF format');

  // Mandatory 7-Point Verification using PDF.js:
  // - Access without password -> blocked
  // - Access with wrong password -> blocked
  // - Access with correct password -> opens successfully
  const verification = await verifyPdfProtection(
    res.buffer,
    correctPassword,
    'DefinitelyWrongPassword!',
    pdfjsLegacy
  );
  assert.equal(verification.verified, true);
  assert.equal(verification.pageCount, 1);

  testsPassed++;
  console.log('  PASS');
}

// Test 4: Multi-page PDF encryption
{
  console.log('Test 4: Multi-page (5 pages) PDF encryption and page preservation...');
  const multiPdf = await createSamplePdf(5);
  const pass = 'MultiPageKey_99!';

  const res = await protectPdf(multiPdf, pass, {
    confirmPassword: pass,
    baseFilename: 'financial-audit'
  });

  assert.equal(res.filename, 'financial-audit-protected.pdf');

  // Verify security
  const verify = await verifyPdfProtection(res.buffer, pass, 'WrongKey123', pdfjsLegacy);
  assert.equal(verify.verified, true);
  assert.equal(verify.pageCount, 5, 'All 5 pages must be unlocked when authenticated');

  testsPassed++;
  console.log('  PASS');
}

// Test 5: Complex password with symbols and Unicode characters
{
  console.log('Test 5: Password with symbols, punctuation, and Unicode...');
  const samplePdf = await createSamplePdf(1);
  const complexPassword = 'P@$$w0rd_&_Sp€cîål!_2026';

  const res = await protectPdf(samplePdf, complexPassword, {
    confirmPassword: complexPassword
  });

  const verify = await verifyPdfProtection(res.buffer, complexPassword, 'BadGuess', pdfjsLegacy);
  assert.equal(verify.verified, true);
  assert.equal(verify.pageCount, 1);

  testsPassed++;
  console.log('  PASS');
}

// Test 6: Rejection of already-encrypted PDFs (Double-protection guard)
{
  console.log('Test 6: Guard against double-encrypting already protected PDFs...');
  const samplePdf = await createSamplePdf(1);
  const firstPass = 'FirstPass123';
  const encryptedRes = await protectPdf(samplePdf, firstPass);

  // Attempting to protect the already-protected PDF
  await assert.rejects(
    async () => protectPdf(encryptedRes.buffer, 'SecondPass456'),
    /already password-protected|already encrypted/i
  );

  testsPassed++;
  console.log('  PASS');
}

// Test 7: Large PDF (10 pages) encryption test
{
  console.log('Test 7: Large PDF (10 pages) encryption test...');
  const largePdf = await createSamplePdf(10);
  const largePass = 'SecureEnterprise2026';

  const res = await protectPdf(largePdf, largePass);
  const verify = await verifyPdfProtection(res.buffer, largePass, 'WrongEnterprise', pdfjsLegacy);
  assert.equal(verify.verified, true);
  assert.equal(verify.pageCount, 10);

  testsPassed++;
  console.log('  PASS');
}

console.log(`\nALL ${testsPassed}/${testsPassed} PROTECT PDF AUTOMATED TESTS PASSED!`);
