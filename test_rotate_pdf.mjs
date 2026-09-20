import assert from 'node:assert/strict';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import {
  rotatePdf,
  getPdfRotationMeta,
  normalizeRotation,
  validatePdfBuffer
} from './src/tools/rotate-pdf/rotateEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING ROTATE PDF AUTOMATED TEST SUITE ---');

// Helper to create sample PDF with specified page count and initial rotations
async function createSamplePdf(pageCount = 3, initialRotations = []) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`Page ${i + 1} Content`, { x: 50, y: 650, size: 20, color: rgb(0, 0, 0) });
    if (initialRotations[i]) {
      page.setRotation(degrees(initialRotations[i]));
    }
  }
  return await doc.save();
}

let testsPassed = 0;

// Test 1: Registry & Active Tools verification
{
  console.log('Test 1: Registry & Active Tools verification...');
  const rotateTool = ALL_TOOLS.find((t) => t.path === '/rotate-pdf');
  assert(rotateTool, 'Rotate PDF must exist in ALL_TOOLS');
  assert.equal(rotateTool.name, 'Rotate PDF');
  assert.equal(rotateTool.phase, 'Phase 4');
  assert(ALL_TOOLS.length >= 23, `Expected at least 23 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS');
}

// Test 2: Angle Normalization & Canonical Values
{
  console.log('Test 2: Angle Normalization avoids floating-point drift...');
  assert.equal(normalizeRotation(0), 0);
  assert.equal(normalizeRotation(90), 90);
  assert.equal(normalizeRotation(180), 180);
  assert.equal(normalizeRotation(270), 270);
  assert.equal(normalizeRotation(360), 0);
  assert.equal(normalizeRotation(450), 90);
  assert.equal(normalizeRotation(-90), 270);
  assert.equal(normalizeRotation(-180), 180);
  assert.equal(normalizeRotation(-270), 90);
  assert.equal(normalizeRotation(-360), 0);
  assert.equal(normalizeRotation(89.9), 90);
  assert.equal(normalizeRotation(180.1), 180);
  assert.equal(normalizeRotation(NaN), 0);
  testsPassed++;
  console.log('  PASS');
}

// Test 3: Validation on empty, corrupted, and non-PDF buffers
{
  console.log('Test 3: Buffer validation...');
  assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
  assert.throws(() => validatePdfBuffer(new TextEncoder().encode('INVALID_HEADER')), /missing %PDF-/i);

  await assert.rejects(
    async () => {
      await rotatePdf(new TextEncoder().encode('%PDF-broken-garbage'));
    },
    /Failed to load PDF/i
  );
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Single-Page PDF Rotation (90°, 180°, 270°)
{
  console.log('Test 4: Single-page PDF rotation and reopening...');
  const pdfBytes = await createSamplePdf(1);
  const meta = await getPdfRotationMeta(pdfBytes);
  assert.equal(meta.pageCount, 1);
  assert.equal(meta.rotations[0], 0);

  // Rotate to 90
  const r90 = await rotatePdf(pdfBytes, { 1: 90 });
  assert.equal(r90.rotations[0], 90);
  const doc90 = await PDFDocument.load(r90.buffer);
  assert.equal(doc90.getPageCount(), 1);
  assert.equal(doc90.getPages()[0].getRotation().angle, 90);

  // Rotate to 180
  const r180 = await rotatePdf(pdfBytes, { 1: 180 });
  assert.equal(r180.rotations[0], 180);
  const doc180 = await PDFDocument.load(r180.buffer);
  assert.equal(doc180.getPages()[0].getRotation().angle, 180);

  // Rotate to 270
  const r270 = await rotatePdf(pdfBytes, { 1: 270 });
  assert.equal(r270.rotations[0], 270);
  const doc270 = await PDFDocument.load(r270.buffer);
  assert.equal(doc270.getPages()[0].getRotation().angle, 270);

  testsPassed++;
  console.log('  PASS');
}

// Test 5: Multi-page Mixed Rotations (Per-page control)
{
  console.log('Test 5: Multi-page mixed rotations...');
  const pdfBytes = await createSamplePdf(4);

  // Pages: 1 -> 90, 2 -> 0, 3 -> 180, 4 -> 270
  const targetMap = { 1: 90, 2: 0, 3: 180, 4: 270 };
  const res = await rotatePdf(pdfBytes, targetMap, { baseFilename: 'report' });

  assert.equal(res.pageCount, 4);
  assert.equal(res.filename, 'report-rotated.pdf');
  assert.deepEqual(res.rotations, [90, 0, 180, 270]);

  // Reopen output and verify every page's exact angle
  const reloaded = await PDFDocument.load(res.buffer);
  assert.equal(reloaded.getPageCount(), 4);
  const reloadedPages = reloaded.getPages();
  assert.equal(reloadedPages[0].getRotation().angle, 90);
  assert.equal(reloadedPages[1].getRotation().angle, 0);
  assert.equal(reloadedPages[2].getRotation().angle, 180);
  assert.equal(reloadedPages[3].getRotation().angle, 270);

  testsPassed++;
  console.log('  PASS');
}

// Test 6: Rotate All Pages in Bulk
{
  console.log('Test 6: Rotate all pages in bulk (+90 and -90)...');
  const pdfBytes = await createSamplePdf(3, [0, 90, 180]);

  // Apply global +90 delta
  const resPlus90 = await rotatePdf(pdfBytes, {}, { globalDelta: 90 });
  assert.deepEqual(resPlus90.rotations, [90, 180, 270]);

  // Apply global -90 delta
  const resMinus90 = await rotatePdf(pdfBytes, {}, { globalDelta: -90 });
  assert.deepEqual(resMinus90.rotations, [270, 0, 90]);

  testsPassed++;
  console.log('  PASS');
}

// Test 7: Repeated Rotation (Cycle 4 times = 360 = 0)
{
  console.log('Test 7: Repeated rotations full cycle...');
  let currentBytes = await createSamplePdf(2);

  for (let cycle = 1; cycle <= 4; cycle++) {
    const res = await rotatePdf(currentBytes, {}, { globalDelta: 90 });
    currentBytes = res.buffer;
    const expectedAngle = (cycle * 90) % 360;
    assert.equal(res.rotations[0], expectedAngle);
    assert.equal(res.rotations[1], expectedAngle);
  }

  // After 4x 90 rotations, angles must return to 0
  const finalDoc = await PDFDocument.load(currentBytes);
  assert.equal(finalDoc.getPages()[0].getRotation().angle, 0);
  assert.equal(finalDoc.getPages()[1].getRotation().angle, 0);

  testsPassed++;
  console.log('  PASS');
}

// Test 8: Large PDF (15 pages) rotation and structure preservation
{
  console.log('Test 8: Large PDF (15 pages) rotation test...');
  const largePdf = await createSamplePdf(15);
  const meta = await getPdfRotationMeta(largePdf);
  assert.equal(meta.pageCount, 15);

  const res = await rotatePdf(largePdf, {}, { globalDelta: 180 });
  assert.equal(res.pageCount, 15);
  assert(res.rotations.every((angle) => angle === 180));

  const verifyLarge = await PDFDocument.load(res.buffer);
  assert.equal(verifyLarge.getPageCount(), 15);

  testsPassed++;
  console.log('  PASS');
}

console.log(`\nALL ${testsPassed}/${testsPassed} ROTATE PDF AUTOMATED TESTS PASSED!`);
