import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  validatePdfBuffer,
  getPdfMetadata,
  validatePageOrder,
  reorderPdfPages
} from './src/tools/reorder-pdf-pages/reorderEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS, PHASE_4_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING REORDER PDF PAGES AUTOMATED TEST SUITE ---');

let testsPassed = 0;

// Helper to create a test PDF with distinct page dimensions and text
async function createNumberedPdf(pageCount = 5) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([500 + i * 10, 600]);
    page.drawText(`Original Page ${i}`, { x: 50, y: 500, size: 24, color: rgb(0.1 * i, 0.2, 0.5) });
  }
  return await doc.save();
}

// Test 1: Registry and active tools count (29 active tools, 55 planned, Phase 4 COMPLETE with 10 tools)
{
  console.log('Test 1: Tool Registry & Active Tools verification (29/55, Phase 4: 10/10)...');
  const reorderTool = ALL_TOOLS.find((t) => t.path === '/reorder-pdf-pages');
  assert(reorderTool, 'Reorder PDF Pages must exist in ALL_TOOLS');
  assert.equal(reorderTool.name, 'Reorder PDF Pages');
  assert.equal(reorderTool.phase, 'Phase 4');
  assert.equal(reorderTool.category, 'PDF Organization');
  assert(ALL_TOOLS.length >= 29, `Expected at least 29 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(PHASE_4_TOOLS.length, 10, `Expected 10 completed Phase 4 tools, got ${PHASE_4_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS (29/55 verified, Phase 4 10/10 complete)');
}

// Test 2: Buffer validation and metadata inspection
{
  console.log('Test 2: Buffer validation and metadata inspection...');
  assert.throws(() => validatePdfBuffer(null), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
  assert.throws(() => validatePdfBuffer(new TextEncoder().encode('NOT_A_PDF')), /missing %PDF-/i);

  const samplePdf = await createNumberedPdf(5);
  const meta = await getPdfMetadata(samplePdf);
  assert.equal(meta.pageCount, 5);
  testsPassed++;
  console.log('  PASS');
}

// Test 3: Page order validation (array and string formats)
{
  console.log('Test 3: Page order validation parsing...');
  assert.deepEqual(validatePageOrder([2, 1, 3], 3), [2, 1, 3]);
  assert.deepEqual(validatePageOrder('3, 1, 2', 3), [3, 1, 2]);
  assert.deepEqual(validatePageOrder('5, 3, 1, 4, 2', 5), [5, 3, 1, 4, 2]);
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Guardrails and error handling
{
  console.log('Test 4: Page order guardrails and validation...');
  // Missing pages (incomplete length)
  assert.throws(() => validatePageOrder('1, 2', 3), /does not match/i);
  // Extra pages
  assert.throws(() => validatePageOrder('1, 2, 3, 4', 3), /does not match/i);
  // Duplicate page numbers
  assert.throws(() => validatePageOrder('1, 1, 3', 3), /Duplicate page/i);
  // Out of bounds page numbers
  assert.throws(() => validatePageOrder('0, 2, 3', 3), /out of bounds/i);
  assert.throws(() => validatePageOrder('1, 2, 4', 3), /out of bounds/i);
  // Non-numeric values
  assert.throws(() => validatePageOrder('1, two, 3', 3), /non-numeric/i);
  // Empty input
  assert.throws(() => validatePageOrder('', 3), /cannot be empty/i);
  testsPassed++;
  console.log('  PASS');
}

// Test 5: Reverse order
{
  console.log('Test 5: Reverse page order (5-page PDF -> 5, 4, 3, 2, 1)...');
  const pdfBytes = await createNumberedPdf(5);
  const result = await reorderPdfPages(pdfBytes, [5, 4, 3, 2, 1], { baseFilename: 'test.pdf' });

  assert.equal(result.pageCount, 5);
  assert.deepEqual(result.pageOrder, [5, 4, 3, 2, 1]);
  assert.equal(result.filename, 'test-reordered.pdf');

  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 5);

  // Check that page 0 has original page 5's width (500 + 5*10 = 550)
  assert.equal(loaded.getPages()[0].getSize().width, 550);
  // Check that page 4 has original page 1's width (500 + 1*10 = 510)
  assert.equal(loaded.getPages()[4].getSize().width, 510);
  testsPassed++;
  console.log('  PASS');
}

// Test 6: Move first page to last
{
  console.log('Test 6: Shift left (first page to last: 2, 3, 4, 5, 1)...');
  const pdfBytes = await createNumberedPdf(5);
  const result = await reorderPdfPages(pdfBytes, [2, 3, 4, 5, 1]);

  assert.equal(result.pageCount, 5);
  assert.deepEqual(result.pageOrder, [2, 3, 4, 5, 1]);

  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPages()[0].getSize().width, 520); // orig P2
  assert.equal(loaded.getPages()[4].getSize().width, 510); // orig P1
  testsPassed++;
  console.log('  PASS');
}

// Test 7: Complex arbitrary reordering: [5, 3, 1, 4, 2]
{
  console.log('Test 7: Complex reorder: [5, 3, 1, 4, 2]...');
  const pdfBytes = await createNumberedPdf(5);
  const result = await reorderPdfPages(pdfBytes, '5, 3, 1, 4, 2');

  assert.equal(result.pageCount, 5);
  assert.deepEqual(result.pageOrder, [5, 3, 1, 4, 2]);

  const loaded = await PDFDocument.load(result.bytes);
  const pages = loaded.getPages();
  assert.equal(pages[0].getSize().width, 550); // orig P5
  assert.equal(pages[1].getSize().width, 530); // orig P3
  assert.equal(pages[2].getSize().width, 510); // orig P1
  assert.equal(pages[3].getSize().width, 540); // orig P4
  assert.equal(pages[4].getSize().width, 520); // orig P2
  testsPassed++;
  console.log('  PASS');
}

// Test 8: Progress callback reporting
{
  console.log('Test 8: Progress callback reporting...');
  const pdfBytes = await createNumberedPdf(3);
  const events = [];
  await reorderPdfPages(pdfBytes, [3, 2, 1], {
    onProgress: (p) => events.push(p)
  });
  assert(events.length >= 3, 'Should emit multiple progress steps');
  assert.equal(events[events.length - 1].percent, 100);
  testsPassed++;
  console.log('  PASS');
}

// Test 9: Corrupted PDF handling
{
  console.log('Test 9: Corrupted PDF handling...');
  const corruptBuffer = new TextEncoder().encode('%PDF-1.4 truncated corrupted buffer');
  await assert.rejects(
    async () => reorderPdfPages(corruptBuffer, [1]),
    /Unable to load PDF|Failed to parse PDF/i
  );
  testsPassed++;
  console.log('  PASS');
}

// Test 10: Blob generation and mime type
{
  console.log('Test 10: Blob generation and mime type...');
  const pdfBytes = await createNumberedPdf(2);
  const result = await reorderPdfPages(pdfBytes, [2, 1]);
  assert(result.blob instanceof Blob);
  assert.equal(result.blob.type, 'application/pdf');
  assert.equal(result.blob.size, result.bytes.byteLength);
  testsPassed++;
  console.log('  PASS');
}

console.log(`\n🎉 ALL ${testsPassed} AUTOMATED TESTS PASSED!`);
