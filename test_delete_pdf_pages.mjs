import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  validatePdfBuffer,
  getPdfMetadata,
  parsePagesToDelete,
  deletePdfPages
} from './src/tools/delete-pdf-pages/deleteEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING DELETE PDF PAGES AUTOMATED TEST SUITE ---');

let testsPassed = 0;

// Helper to create a test PDF with distinct text on each page
async function createNumberedPdf(pageCount = 5) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([500, 600]);
    page.drawText(`Original Page ${i}`, { x: 50, y: 500, size: 24, color: rgb(0.1 * i, 0.3, 0.6) });
  }
  return await doc.save();
}

// Test 1: Registry and active tools count (28 active tools, 55 planned)
{
  console.log('Test 1: Tool Registry & Active Tools verification (28/55)...');
  const deleteTool = ALL_TOOLS.find((t) => t.path === '/delete-pdf-pages');
  assert(deleteTool, 'Delete PDF Pages must exist in ALL_TOOLS');
  assert.equal(deleteTool.name, 'Delete PDF Pages');
  assert.equal(deleteTool.phase, 'Phase 4');
  assert.equal(deleteTool.category, 'PDF Organization');
  assert(ALL_TOOLS.length >= 28, `Expected at least 28 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS (>=28 verified)');
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

// Test 3: Parse pages to delete - Single page, multiple, ranges, normalization
{
  console.log('Test 3: Parse pages to delete...');
  // Delete page 2 from 5 pages -> remaining [1, 3, 4, 5]
  const res1 = parsePagesToDelete('2', 5);
  assert.deepEqual(res1.pagesToDelete, [2]);
  assert.deepEqual(res1.remainingPages, [1, 3, 4, 5]);

  // Delete [2, 4] from 5 pages -> remaining [1, 3, 5]
  const res2 = parsePagesToDelete('2, 4', 5);
  assert.deepEqual(res2.pagesToDelete, [2, 4]);
  assert.deepEqual(res2.remainingPages, [1, 3, 5]);

  // Delete range "2-4" from 5 pages -> remaining [1, 5]
  const res3 = parsePagesToDelete('2-4', 5);
  assert.deepEqual(res3.pagesToDelete, [2, 3, 4]);
  assert.deepEqual(res3.remainingPages, [1, 5]);

  // Normalization of duplicates "2, 2, 4"
  const res4 = parsePagesToDelete('2, 2, 4', 5);
  assert.deepEqual(res4.pagesToDelete, [2, 4]);
  assert.deepEqual(res4.remainingPages, [1, 3, 5]);
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Guardrails and error handling
{
  console.log('Test 4: Parser guardrails and validation...');
  assert.throws(() => parsePagesToDelete('', 5), /at least one page/i);
  assert.throws(() => parsePagesToDelete('   ', 5), /at least one page/i);
  assert.throws(() => parsePagesToDelete('0', 5), /start from 1/i);
  assert.throws(() => parsePagesToDelete('6', 5), /exceeds total/i);
  assert.throws(() => parsePagesToDelete('4-2', 5), /cannot be greater/i);
  assert.throws(() => parsePagesToDelete('xyz', 5), /non-numeric/i);
  assert.throws(() => parsePagesToDelete([], 5), /at least one page/i);
  testsPassed++;
  console.log('  PASS');
}

// Test 5: All-pages deletion block
{
  console.log('Test 5: Rejection of deleting all pages...');
  assert.throws(() => parsePagesToDelete('1-5', 5), /At least one page must remain/i);
  assert.throws(() => parsePagesToDelete('1, 2, 3, 4, 5', 5), /At least one page must remain/i);
  assert.throws(() => parsePagesToDelete([1, 2, 3], 3), /At least one page must remain/i);
  testsPassed++;
  console.log('  PASS');
}

// Test 6: Delete first page
{
  console.log('Test 6: Delete first page (page 1 from 4 pages)...');
  const pdfBytes = await createNumberedPdf(4);
  const result = await deletePdfPages(pdfBytes, '1', { baseFilename: 'test.pdf' });

  assert.equal(result.pageCount, 3);
  assert.equal(result.originalCount, 4);
  assert.equal(result.deletedCount, 1);
  assert.deepEqual(result.remainingPages, [2, 3, 4]);
  assert.deepEqual(result.deletedPages, [1]);
  assert.equal(result.filename, 'test-modified.pdf');

  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 3);
  testsPassed++;
  console.log('  PASS');
}

// Test 7: Delete last page
{
  console.log('Test 7: Delete last page (page 5 from 5 pages)...');
  const pdfBytes = await createNumberedPdf(5);
  const result = await deletePdfPages(pdfBytes, '5');

  assert.equal(result.pageCount, 4);
  assert.deepEqual(result.remainingPages, [1, 2, 3, 4]);
  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 4);
  testsPassed++;
  console.log('  PASS');
}

// Test 8: Delete middle page
{
  console.log('Test 8: Delete middle page (page 3 from 5 pages)...');
  const pdfBytes = await createNumberedPdf(5);
  const result = await deletePdfPages(pdfBytes, '3');

  assert.equal(result.pageCount, 4);
  assert.deepEqual(result.remainingPages, [1, 2, 4, 5]);
  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 4);
  testsPassed++;
  console.log('  PASS');
}

// Test 9: Delete multiple non-contiguous pages
{
  console.log('Test 9: Delete multiple pages [2, 4] from 5 pages...');
  const pdfBytes = await createNumberedPdf(5);
  const result = await deletePdfPages(pdfBytes, [2, 4]);

  assert.equal(result.pageCount, 3);
  assert.deepEqual(result.remainingPages, [1, 3, 5]);
  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 3);
  testsPassed++;
  console.log('  PASS');
}

// Test 10: Delete page range
{
  console.log('Test 10: Delete range "2-4" from 6 pages...');
  const pdfBytes = await createNumberedPdf(6);
  const result = await deletePdfPages(pdfBytes, '2-4');

  assert.equal(result.pageCount, 3);
  assert.deepEqual(result.remainingPages, [1, 5, 6]);
  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 3);
  testsPassed++;
  console.log('  PASS');
}

// Test 11: Progress callback reporting
{
  console.log('Test 11: Progress callback reporting...');
  const pdfBytes = await createNumberedPdf(4);
  const events = [];
  await deletePdfPages(pdfBytes, '2', {
    onProgress: (p) => events.push(p)
  });
  assert(events.length >= 3, 'Should emit multiple progress steps');
  assert.equal(events[events.length - 1].percent, 100);
  testsPassed++;
  console.log('  PASS');
}

// Test 12: Corrupted PDF handling
{
  console.log('Test 12: Corrupted PDF handling...');
  const corruptBuffer = new TextEncoder().encode('%PDF-1.4 truncated corrupted buffer');
  await assert.rejects(
    async () => deletePdfPages(corruptBuffer, '1'),
    /Unable to load PDF|Failed to parse PDF/i
  );
  testsPassed++;
  console.log('  PASS');
}

// Test 13: Blob generation and mime type
{
  console.log('Test 13: Blob generation and mime type...');
  const pdfBytes = await createNumberedPdf(3);
  const result = await deletePdfPages(pdfBytes, '2');
  assert(result.blob instanceof Blob);
  assert.equal(result.blob.type, 'application/pdf');
  assert.equal(result.blob.size, result.bytes.byteLength);
  testsPassed++;
  console.log('  PASS');
}

console.log(`\n🎉 ALL ${testsPassed} AUTOMATED TESTS PASSED!`);
