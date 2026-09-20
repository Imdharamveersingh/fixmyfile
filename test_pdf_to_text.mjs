import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';
import {
  validatePdfBuffer,
  extractTextFromPdf,
  createTxtBlob
} from './src/tools/pdf-to-text/pdfToTextEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING PDF TO TEXT AUTOMATED TEST SUITE ---');

let testsPassed = 0;

// Test 1: Registry & Active Tools count (26 active tools, 55 planned)
{
  console.log('Test 1: Registry & Active Tools count...');
  const textTool = ALL_TOOLS.find((t) => t.path === '/pdf-to-text');
  assert(textTool, 'PDF to Text must exist in ALL_TOOLS');
  assert.equal(textTool.name, 'PDF to Text');
  assert.equal(textTool.phase, 'Phase 4');
  assert.equal(textTool.category, 'PDF Conversion');
  assert(ALL_TOOLS.length >= 26, `Expected at least 26 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS (>=26 active tools verified)');
}

// Test 2: Buffer validation (empty, too small, invalid header)
{
  console.log('Test 2: Buffer validation...');
  assert.throws(() => validatePdfBuffer(null), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
  assert.throws(() => validatePdfBuffer(new TextEncoder().encode('NOT_A_PDF_FILE')), /missing %PDF-/i);
  testsPassed++;
  console.log('  PASS');
}

// Test 3: Single-page text PDF extraction
{
  console.log('Test 3: Single-page text PDF extraction...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  page.drawText('FixMyFile is an open web utility suite.', { x: 50, y: 350, size: 16 });
  page.drawText('This is a test line for text extraction.', { x: 50, y: 300, size: 14 });
  const pdfBytes = await doc.save();

  const result = await extractTextFromPdf(pdfBytes, {
    pdfjsLib: pdfjsLegacy,
    baseFilename: 'sample-doc.pdf'
  });

  assert.equal(result.totalPages, 1);
  assert.equal(result.hasSelectableText, true);
  assert.equal(result.scannedPageCount, 0);
  assert(result.fullText.includes('FixMyFile is an open web utility suite.'));
  assert(result.fullText.includes('This is a test line for text extraction.'));
  assert.equal(result.filename, 'sample-doc-text.txt');
  assert(result.totalCharacters > 0);
  assert(result.totalWords >= 12);
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Multi-page text PDF with page separation
{
  console.log('Test 4: Multi-page text PDF with page separation...');
  const doc = await PDFDocument.create();
  const page1 = doc.addPage([600, 400]);
  page1.drawText('First page executive summary.', { x: 50, y: 350, size: 14 });

  const page2 = doc.addPage([600, 400]);
  page2.drawText('Second page detailed analysis.', { x: 50, y: 350, size: 14 });

  const page3 = doc.addPage([600, 400]);
  page3.drawText('Third page conclusion and roadmap.', { x: 50, y: 350, size: 14 });
  const pdfBytes = await doc.save();

  const result = await extractTextFromPdf(pdfBytes, {
    pdfjsLib: pdfjsLegacy,
    baseFilename: 'financial-report.pdf'
  });

  assert.equal(result.totalPages, 3);
  assert.equal(result.hasSelectableText, true);
  assert(result.fullText.includes('--- Page 1 ---'));
  assert(result.fullText.includes('First page executive summary.'));
  assert(result.fullText.includes('--- Page 2 ---'));
  assert(result.fullText.includes('Second page detailed analysis.'));
  assert(result.fullText.includes('--- Page 3 ---'));
  assert(result.fullText.includes('Third page conclusion and roadmap.'));
  assert.equal(result.filename, 'financial-report-text.txt');
  testsPassed++;
  console.log('  PASS');
}

// Test 5: Multiple paragraphs and lines formatting
{
  console.log('Test 5: Multiple paragraphs and line formatting...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 500]);
  // Paragraph 1
  page.drawText('Paragraph 1 line A', { x: 50, y: 450, size: 12 });
  page.drawText('Paragraph 1 line B', { x: 50, y: 435, size: 12 });

  // Paragraph 2 with a larger gap (> 22pt)
  page.drawText('Paragraph 2 starts here.', { x: 50, y: 380, size: 12 });
  page.drawText('Paragraph 2 continues here.', { x: 50, y: 365, size: 12 });

  const pdfBytes = await doc.save();
  const result = await extractTextFromPdf(pdfBytes, { pdfjsLib: pdfjsLegacy });

  assert.equal(result.totalPages, 1);
  assert(result.fullText.includes('Paragraph 1 line A'));
  assert(result.fullText.includes('Paragraph 2 starts here.'));
  // Ensure paragraph break exists
  assert(result.fullText.includes('\n\n'));
  testsPassed++;
  console.log('  PASS');
}

// Test 6: Empty / blank page handling
{
  console.log('Test 6: Empty / blank page handling...');
  const doc = await PDFDocument.create();
  const page1 = doc.addPage([600, 400]);
  page1.drawText('Valid text on page 1', { x: 50, y: 350, size: 14 });

  // Blank page
  doc.addPage([600, 400]);

  const page3 = doc.addPage([600, 400]);
  page3.drawText('Valid text on page 3', { x: 50, y: 350, size: 14 });

  const pdfBytes = await doc.save();
  const result = await extractTextFromPdf(pdfBytes, { pdfjsLib: pdfjsLegacy });

  assert.equal(result.totalPages, 3);
  assert.equal(result.scannedPageCount, 1);
  assert(result.fullText.includes('--- Page 2 ---'));
  assert(result.fullText.includes('[No selectable text found on this page]'));
  testsPassed++;
  console.log('  PASS');
}

// Test 7: Mixed text + vector graphic/image page
{
  console.log('Test 7: Mixed text + graphic shapes page...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  // Draw shapes
  page.drawRectangle({ x: 50, y: 200, width: 200, height: 100, color: rgb(0.8, 0.8, 0.9) });
  // Draw text
  page.drawText('Diagram title caption', { x: 60, y: 250, size: 14, color: rgb(0, 0, 0) });

  const pdfBytes = await doc.save();
  const result = await extractTextFromPdf(pdfBytes, { pdfjsLib: pdfjsLegacy });

  assert.equal(result.totalPages, 1);
  assert.equal(result.hasSelectableText, true);
  assert(result.fullText.includes('Diagram title caption'));
  testsPassed++;
  console.log('  PASS');
}

// Test 8: Scanned / image-only PDF (No selectable text)
{
  console.log('Test 8: Scanned / image-only PDF detection...');
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  // Draw only shapes/colors, no text elements
  page.drawRectangle({ x: 50, y: 50, width: 500, height: 300, color: rgb(0.9, 0.9, 0.9) });

  const pdfBytes = await doc.save();
  const result = await extractTextFromPdf(pdfBytes, { pdfjsLib: pdfjsLegacy });

  assert.equal(result.totalPages, 1);
  assert.equal(result.hasSelectableText, false, 'Should detect zero selectable text');
  assert.equal(result.totalCharacters, 0);
  assert.equal(result.scannedPageCount, 1);
  assert.equal(result.fullText, '', 'Full text must be empty when no selectable text is found');
  testsPassed++;
  console.log('  PASS');
}

// Test 9: Corrupted / malformed PDF rejection
{
  console.log('Test 9: Corrupted / malformed PDF rejection...');
  const corruptedBuffer = new TextEncoder().encode('%PDF-1.4 truncated corrupted random stream content end');
  await assert.rejects(
    async () => {
      await extractTextFromPdf(corruptedBuffer, { pdfjsLib: pdfjsLegacy });
    },
    /Failed to parse PDF document/i
  );
  testsPassed++;
  console.log('  PASS');
}

// Test 10: Encrypted PDF rejection with informative message
{
  console.log('Test 10: Encrypted PDF rejection...');
  const plainDoc = await PDFDocument.create();
  const plainPage = plainDoc.addPage([500, 500]);
  plainPage.drawText('Confidential encrypted content', { x: 50, y: 400, size: 14 });
  const plainBytes = await plainDoc.save();

  const encryptedBytes = await encryptPDF(plainBytes, 'Secret123', 'OwnerSecret456');

  await assert.rejects(
    async () => {
      await extractTextFromPdf(encryptedBytes, { pdfjsLib: pdfjsLegacy });
    },
    /password-protected.*Unlock PDF/i
  );
  testsPassed++;
  console.log('  PASS');
}

// Test 11: Text Blob generation and UTF-8 encoding
{
  console.log('Test 11: Text Blob generation and UTF-8 encoding...');
  const sampleContent = 'Unicode text: Español, Français, 日本語, 🚀 FixMyFile!';
  const blob = createTxtBlob(sampleContent);
  assert(blob instanceof Blob, 'Output must be a Blob instance');
  assert.equal(blob.type, 'text/plain;charset=utf-8');
  assert.equal(blob.size, new TextEncoder().encode(sampleContent).length);
  testsPassed++;
  console.log('  PASS');
}

// Test 12: Progress callback reporting
{
  console.log('Test 12: Progress callback reporting...');
  const doc = await PDFDocument.create();
  doc.addPage([500, 500]).drawText('Page 1', { x: 50, y: 400, size: 12 });
  doc.addPage([500, 500]).drawText('Page 2', { x: 50, y: 400, size: 12 });
  const pdfBytes = await doc.save();

  const progressEvents = [];
  await extractTextFromPdf(pdfBytes, {
    pdfjsLib: pdfjsLegacy,
    onProgress: (p) => progressEvents.push(p)
  });

  assert(progressEvents.length >= 3, 'Expected multiple progress events');
  const finalEvent = progressEvents[progressEvents.length - 1];
  assert.equal(finalEvent.percent, 100);
  assert.equal(finalEvent.current, 2);
  testsPassed++;
  console.log('  PASS');
}

console.log(`\n🎉 ALL ${testsPassed} AUTOMATED TESTS PASSED!`);
