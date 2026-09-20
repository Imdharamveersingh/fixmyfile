import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  validatePdfBuffer,
  getPdfMetadata,
  parsePageSelection,
  extractPdfPages
} from './src/tools/extract-pdf-pages/extractEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING EXTRACT PDF PAGES AUTOMATED TEST SUITE ---');

let testsPassed = 0;

// Helper to create a test PDF with distinct text on each page
async function createNumberedPdf(pageCount = 5) {
  const doc = await PDFDocument.create();
  for (let i = 1; i <= pageCount; i++) {
    const page = doc.addPage([500, 600]);
    page.drawText(`Page Content ${i}`, { x: 50, y: 500, size: 24, color: rgb(0.1 * i, 0.2, 0.5) });
  }
  return await doc.save();
}

// Test 1: Registry and active tools count (27 active tools, 55 planned)
{
  console.log('Test 1: Tool Registry & Active Tools verification (27/55)...');
  const extractTool = ALL_TOOLS.find((t) => t.path === '/extract-pdf-pages');
  assert(extractTool, 'Extract PDF Pages must exist in ALL_TOOLS');
  assert.equal(extractTool.name, 'Extract PDF Pages');
  assert.equal(extractTool.phase, 'Phase 4');
  assert.equal(extractTool.category, 'PDF Organization');
  assert.equal(ALL_TOOLS.length, 27, `Expected exactly 27 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS');
}

// Test 2: Buffer validation and metadata inspection
{
  console.log('Test 2: Buffer validation and metadata inspection...');
  assert.throws(() => validatePdfBuffer(null), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
  assert.throws(() => validatePdfBuffer(new TextEncoder().encode('NOT_A_PDF')), /missing %PDF-/i);

  const samplePdf = await createNumberedPdf(4);
  const meta = await getPdfMetadata(samplePdf);
  assert.equal(meta.pageCount, 4);
  testsPassed++;
  console.log('  PASS');
}

// Test 3: Range parser - Single page, multi-page, ranges, and deduplication
{
  console.log('Test 3: Range parser verification...');
  assert.deepEqual(parsePageSelection('1', 5), [1]);
  assert.deepEqual(parsePageSelection('1, 3, 5', 5), [1, 3, 5]);
  assert.deepEqual(parsePageSelection('2-4', 5), [2, 3, 4]);
  assert.deepEqual(parsePageSelection('1-2, 4-5', 5), [1, 2, 4, 5]);
  assert.deepEqual(parsePageSelection('1-3, 2, 5', 5), [1, 2, 3, 5], 'Should deduplicate predictably');
  assert.deepEqual(parsePageSelection([4, 2, 1], 5), [4, 2, 1], 'Should preserve array order');
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Range parser - Guardrails and error handling
{
  console.log('Test 4: Range parser error handling...');
  assert.throws(() => parsePageSelection('', 5), /at least one page/i);
  assert.throws(() => parsePageSelection('   ', 5), /at least one page/i);
  assert.throws(() => parsePageSelection('0', 5), /start from 1/i);
  assert.throws(() => parsePageSelection('6', 5), /exceeds total/i);
  assert.throws(() => parsePageSelection('5-2', 5), /cannot be greater/i);
  assert.throws(() => parsePageSelection('abc', 5), /non-numeric/i);
  assert.throws(() => parsePageSelection('1-abc', 5), /non-numeric/i);
  assert.throws(() => parsePageSelection([], 5), /at least one page/i);
  testsPassed++;
  console.log('  PASS');
}

// Test 5: Single-page extraction
{
  console.log('Test 5: Single-page extraction (extract page 2 from 4-page PDF)...');
  const pdfBytes = await createNumberedPdf(4);
  const result = await extractPdfPages(pdfBytes, '2', { baseFilename: 'report.pdf' });

  assert.equal(result.pageCount, 1);
  assert.deepEqual(result.pages, [2]);
  assert.equal(result.filename, 'report-extracted-page-2.pdf');

  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 1);
  testsPassed++;
  console.log('  PASS');
}

// Test 6: First and last page extraction
{
  console.log('Test 6: First and last page extraction...');
  const pdfBytes = await createNumberedPdf(6);

  // First page
  const firstRes = await extractPdfPages(pdfBytes, '1');
  assert.equal(firstRes.pageCount, 1);
  assert.deepEqual(firstRes.pages, [1]);
  const loadedFirst = await PDFDocument.load(firstRes.bytes);
  assert.equal(loadedFirst.getPageCount(), 1);

  // Last page
  const lastRes = await extractPdfPages(pdfBytes, '6');
  assert.equal(lastRes.pageCount, 1);
  assert.deepEqual(lastRes.pages, [6]);
  const loadedLast = await PDFDocument.load(lastRes.bytes);
  assert.equal(loadedLast.getPageCount(), 1);
  testsPassed++;
  console.log('  PASS');
}

// Test 7: Multi-page and range extraction with order fidelity
{
  console.log('Test 7: Multi-page range extraction (pages 2-4 and custom sequence)...');
  const pdfBytes = await createNumberedPdf(7);
  const resultRange = await extractPdfPages(pdfBytes, '2-4', { baseFilename: 'test.pdf' });

  assert.equal(resultRange.pageCount, 3);
  assert.deepEqual(resultRange.pages, [2, 3, 4]);
  const loadedRange = await PDFDocument.load(resultRange.bytes);
  assert.equal(loadedRange.getPageCount(), 3);

  // Order fidelity test [5, 2, 4, 1]
  const resultOrder = await extractPdfPages(pdfBytes, [5, 2, 4, 1]);
  assert.equal(resultOrder.pageCount, 4);
  assert.deepEqual(resultOrder.pages, [5, 2, 4, 1]);
  const loadedOrder = await PDFDocument.load(resultOrder.bytes);
  assert.equal(loadedOrder.getPageCount(), 4);
  testsPassed++;
  console.log('  PASS');
}

// Test 8: Extract all pages
{
  console.log('Test 8: Extract all pages...');
  const pdfBytes = await createNumberedPdf(3);
  const result = await extractPdfPages(pdfBytes, '1-3');
  assert.equal(result.pageCount, 3);
  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 3);
  testsPassed++;
  console.log('  PASS');
}

// Test 9: Single-page source PDF extraction
{
  console.log('Test 9: Single-page source PDF extraction...');
  const singlePdf = await createNumberedPdf(1);
  const result = await extractPdfPages(singlePdf, '1');
  assert.equal(result.pageCount, 1);
  const loaded = await PDFDocument.load(result.bytes);
  assert.equal(loaded.getPageCount(), 1);
  testsPassed++;
  console.log('  PASS');
}

// Test 10: Progress callback reporting
{
  console.log('Test 10: Progress callback reporting...');
  const pdfBytes = await createNumberedPdf(3);
  const events = [];
  await extractPdfPages(pdfBytes, '1, 2', {
    onProgress: (p) => events.push(p)
  });
  assert(events.length >= 3, 'Should emit multiple progress steps');
  assert.equal(events[events.length - 1].percent, 100);
  testsPassed++;
  console.log('  PASS');
}

// Test 11: Malformed and corrupted PDF error handling
{
  console.log('Test 11: Malformed and corrupted PDF handling...');
  const corruptBuffer = new TextEncoder().encode('%PDF-1.4 truncated corrupted buffer');
  await assert.rejects(
    async () => extractPdfPages(corruptBuffer, '1'),
    /Unable to load PDF|Failed to parse PDF/i
  );
  testsPassed++;
  console.log('  PASS');
}

// Test 12: Blob generation and mime type
{
  console.log('Test 12: Blob generation and mime type...');
  const pdfBytes = await createNumberedPdf(2);
  const result = await extractPdfPages(pdfBytes, '1');
  assert(result.blob instanceof Blob);
  assert.equal(result.blob.type, 'application/pdf');
  assert.equal(result.blob.size, result.bytes.byteLength);
  testsPassed++;
  console.log('  PASS');
}

console.log(`\n🎉 ALL ${testsPassed} AUTOMATED TESTS PASSED!`);
