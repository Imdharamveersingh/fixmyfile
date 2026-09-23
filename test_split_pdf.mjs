import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  parsePageRanges,
  getPdfMetadata,
  splitPdfByRanges,
  extractToSinglePdf,
  burstPdf
} from './src/tools/split-pdf/splitEngine.js';
import {
  PHASE_4_TOOLS,
  ALL_TOOLS,
  TOTAL_STRATEGY_TOOLS,
  getToolById,
  getToolByPath
} from './src/tools/toolsRegistry.js';

test('=== Split PDF Automated Test Suite ===', async (t) => {
  // Helper: generate real test PDF with N pages
  async function createTestPdf(pageCount) {
    const doc = await PDFDocument.create();
    for (let i = 1; i <= pageCount; i++) {
      const page = doc.addPage([400, 600]);
      page.drawText(`FixMyFile Test Page ${i}`, {
        x: 50,
        y: 500,
        size: 24,
        color: rgb(0.1, 0.5, 0.9)
      });
    }
    return await doc.save();
  }

  await t.test('1. Tool Registry & Route Definitions', () => {
    const tool = getToolById('split-pdf');
    assert.ok(tool, 'split-pdf must exist in registry');
    assert.strictEqual(tool.path, '/split-pdf');
    assert.strictEqual(tool.phase, 'Phase 4');
    assert.strictEqual(tool.status, 'Ready');

    const byPath = getToolByPath('/split-pdf');
    assert.ok(byPath, 'split-pdf must be retrievable by path');

    assert.ok(PHASE_4_TOOLS.some((t) => t.id === 'split-pdf'));
    assert.ok(ALL_TOOLS.length >= 20, 'ALL_TOOLS must have at least 20 active tools');
    assert.strictEqual(TOTAL_STRATEGY_TOOLS, 55, 'TOTAL_STRATEGY_TOOLS must be 55');
  });

  await t.test('2. Navigation and Router Setup', () => {
    const appContent = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
    assert.match(appContent, /import\s+SplitPdfTool\s+from\s+['"]\.\/tools\/split-pdf['"]/);
    assert.match(appContent, /path="split-pdf"/);

    const headerContent = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
    assert.match(headerContent, /<Link to="\/split-pdf">Split PDF<\/Link>/);

    const footerContent = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf8');
    assert.match(footerContent, /PDF Tools/);
  });

  await t.test('3. Range Parsing - Valid Patterns', () => {
    // Standard comma-separated with ranges and singles
    const parsed1 = parsePageRanges('1-3, 5, 8-10', 10);
    assert.strictEqual(parsed1.length, 3);
    assert.deepStrictEqual(parsed1[0].pages, [1, 2, 3]);
    assert.deepStrictEqual(parsed1[1].pages, [5]);
    assert.deepStrictEqual(parsed1[2].pages, [8, 9, 10]);

    // Single page
    const parsed2 = parsePageRanges('4', 10);
    assert.strictEqual(parsed2.length, 1);
    assert.deepStrictEqual(parsed2[0].pages, [4]);

    // Disjoint individual pages
    const parsed3 = parsePageRanges('1, 3, 5, 7', 10);
    assert.strictEqual(parsed3.length, 4);

    // Whitespace tolerance
    const parsed4 = parsePageRanges('  2 - 4 ,   6  ', 10);
    assert.strictEqual(parsed4.length, 2);
    assert.deepStrictEqual(parsed4[0].pages, [2, 3, 4]);
    assert.deepStrictEqual(parsed4[1].pages, [6]);
  });

  await t.test('4. Range Parsing - Error Handling & Guardrails', () => {
    assert.throws(() => parsePageRanges('', 10), /enter at least one page/i);
    assert.throws(() => parsePageRanges('   ', 10), /enter at least one page/i);
    assert.throws(() => parsePageRanges('15', 10), /exceeds total document pages/i);
    assert.throws(() => parsePageRanges('5-15', 10), /exceeds total document pages/i);
    assert.throws(() => parsePageRanges('15-20', 10), /exceeds total document pages/i);
    assert.throws(() => parsePageRanges('5-2', 10), /cannot be greater than end page/i);
    assert.throws(() => parsePageRanges('0', 10), /must be at least 1/i);
    assert.throws(() => parsePageRanges('0-5', 10), /must start from 1/i);
    assert.throws(() => parsePageRanges('abc', 10), /non-numeric/i);
    assert.throws(() => parsePageRanges('1-abc', 10), /non-numeric/i);
  });

  await t.test('5. Metadata Reading & Corrupted File Guard', async () => {
    const validBytes = await createTestPdf(5);
    const meta = await getPdfMetadata(validBytes.buffer);
    assert.strictEqual(meta.pageCount, 5);

    // Empty buffer rejection
    await assert.rejects(
      () => getPdfMetadata(new ArrayBuffer(0)),
      /empty \(0 bytes\)/i
    );

    // Corrupted buffer rejection
    const fakeBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await assert.rejects(
      () => getPdfMetadata(fakeBytes.buffer),
      /Unable to read PDF/i
    );
  });

  await t.test('6. Split by Ranges Workflow', async () => {
    const pdfBytes = await createTestPdf(10);
    const ranges = parsePageRanges('1-3, 5, 8-10', 10);
    const outputs = await splitPdfByRanges(pdfBytes.buffer, ranges, 'my_report.pdf');

    assert.strictEqual(outputs.length, 3);

    // Output 1: pages 1-3
    assert.strictEqual(outputs[0].filename, 'my_report-pages-1-3.pdf');
    assert.strictEqual(outputs[0].pageCount, 3);
    const doc1 = await PDFDocument.load(outputs[0].bytes);
    assert.strictEqual(doc1.getPageCount(), 3);
    const header1 = new TextDecoder().decode(outputs[0].bytes.slice(0, 5));
    assert.strictEqual(header1, '%PDF-');

    // Output 2: page 5
    assert.strictEqual(outputs[1].filename, 'my_report-pages-5.pdf');
    assert.strictEqual(outputs[1].pageCount, 1);
    const doc2 = await PDFDocument.load(outputs[1].bytes);
    assert.strictEqual(doc2.getPageCount(), 1);

    // Output 3: pages 8-10
    assert.strictEqual(outputs[2].filename, 'my_report-pages-8-10.pdf');
    assert.strictEqual(outputs[2].pageCount, 3);
    const doc3 = await PDFDocument.load(outputs[2].bytes);
    assert.strictEqual(doc3.getPageCount(), 3);
  });

  await t.test('7. Extract to Single PDF Workflow', async () => {
    const pdfBytes = await createTestPdf(8);
    const extracted = await extractToSinglePdf(pdfBytes.buffer, [1, 3, 5, 7], 'financial_doc');

    assert.strictEqual(extracted.filename, 'financial_doc-extracted.pdf');
    assert.strictEqual(extracted.pageCount, 4);

    const reloaded = await PDFDocument.load(extracted.bytes);
    assert.strictEqual(reloaded.getPageCount(), 4);
    const header = new TextDecoder().decode(extracted.bytes.slice(0, 5));
    assert.strictEqual(header, '%PDF-');
  });

  await t.test('8. Burst Mode (Extract All Pages)', async () => {
    const pdfBytes = await createTestPdf(4);
    const burstOutputs = await burstPdf(pdfBytes.buffer, 'contract');

    assert.strictEqual(burstOutputs.length, 4);
    for (let i = 0; i < 4; i++) {
      const item = burstOutputs[i];
      assert.strictEqual(item.filename, `contract-page-${i + 1}.pdf`);
      assert.strictEqual(item.pageCount, 1);
      const doc = await PDFDocument.load(item.bytes);
      assert.strictEqual(doc.getPageCount(), 1);
    }
  });

  await t.test('9. Difficult / Edge Case: 12-Page Complex Range & Re-open Verification', async () => {
    const pdfBytes = await createTestPdf(12);
    const ranges = parsePageRanges('1, 3-5, 8, 11-12', 12);
    const outputs = await splitPdfByRanges(pdfBytes.buffer, ranges, 'test-large');

    assert.strictEqual(outputs.length, 4);
    assert.strictEqual(outputs[0].pageCount, 1);
    assert.strictEqual(outputs[1].pageCount, 3);
    assert.strictEqual(outputs[2].pageCount, 1);
    assert.strictEqual(outputs[3].pageCount, 2);

    // Re-verify each output independently
    for (const out of outputs) {
      const reDoc = await PDFDocument.load(out.bytes);
      assert.strictEqual(reDoc.getPageCount(), out.pageCount);
    }
  });

  await t.test('10. Single-Page PDF Edge Case', async () => {
    const singlePdf = await createTestPdf(1);
    const ranges = parsePageRanges('1', 1);
    const outputs = await splitPdfByRanges(singlePdf.buffer, ranges, 'one-pager');
    assert.strictEqual(outputs.length, 1);
    assert.strictEqual(outputs[0].pageCount, 1);
  });
});
