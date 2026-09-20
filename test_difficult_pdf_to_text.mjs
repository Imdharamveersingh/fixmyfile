import assert from 'node:assert/strict';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  extractTextFromPdf,
  createTxtBlob
} from './src/tools/pdf-to-text/pdfToTextEngine.js';

console.log('=== STARTING DIFFICULT EDGE TEST: PDF TO TEXT ===\n');

// 1. Build a complex 6-page PDF with diverse dimensions, layouts, and Unicode
console.log('1. Building 6-page complex test document...');
const doc = await PDFDocument.create();
const font = await doc.embedFont(StandardFonts.Helvetica);
const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

// Page 1: US Letter - Long paragraphs and nested headings
{
  const p1 = doc.addPage([612, 792]);
  p1.drawText('Annual Executive Strategy Report', { x: 50, y: 720, size: 20, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
  p1.drawText('Section 1: Global Market Overview and Dynamics', { x: 50, y: 680, size: 14, font: fontBold });

  p1.drawText('In the current fiscal period, global technological advancements have continued at an unprecedented rate.', { x: 50, y: 650, size: 11, font });
  p1.drawText('Organizations worldwide are transitioning to localized, client-side processing to guarantee maximum user data privacy.', { x: 50, y: 635, size: 11, font });
  p1.drawText('FixMyFile spearheads this paradigm shift by maintaining 100% browser-based document utilities.', { x: 50, y: 620, size: 11, font });

  // Second paragraph with larger vertical gap (> 22pt)
  p1.drawText('Key Strategic Pillars for Scalable Architecture:', { x: 50, y: 570, size: 13, font: fontBold });
  p1.drawText('1. Zero-server document conversion pipelines.', { x: 60, y: 545, size: 11, font });
  p1.drawText('2. Highly responsive, accessibility-first user interfaces.', { x: 60, y: 530, size: 11, font });
  p1.drawText('3. Exhaustive automated and real-device regression test suites.', { x: 60, y: 515, size: 11, font });
}

// Page 2: A4 - International text and multilingual phrasing
{
  const p2 = doc.addPage([595, 842]);
  p2.drawText('International & Regional Localization', { x: 50, y: 770, size: 18, font: fontBold });
  p2.drawText('European French: Bienvenue au service FixMyFile avec haute performance.', { x: 50, y: 730, size: 11, font });
  p2.drawText('Spanish Latin America: Procesamiento de archivos rapido, seguro y confiable.', { x: 50, y: 700, size: 11, font });
  p2.drawText('German Regional: Hochwertige PDF-Tools direkt im Webbrowser ohne Cloud-Upload.', { x: 50, y: 670, size: 11, font });
  p2.drawText('Currencies & Numeric Data: $1,250,500.00 USD | 850,200.50 EUR | 100,000 GBP', { x: 50, y: 630, size: 11, font });
}

// Page 3: Square - Completely blank page (Scanned/Empty test)
{
  doc.addPage([500, 500]);
  // No text drawn
}

// Page 4: Landscape Banner - Mixed text and geometric vector diagrams
{
  const p4 = doc.addPage([800, 400]);
  // Draw diagram boxes
  p4.drawRectangle({ x: 50, y: 150, width: 200, height: 120, color: rgb(0.85, 0.9, 0.95) });
  p4.drawRectangle({ x: 300, y: 150, width: 200, height: 120, color: rgb(0.95, 0.9, 0.85) });
  p4.drawRectangle({ x: 550, y: 150, width: 200, height: 120, color: rgb(0.85, 0.95, 0.85) });

  p4.drawText('System Architecture Blueprint (Landscape)', { x: 50, y: 340, size: 18, font: fontBold });
  p4.drawText('Client Interface Layer', { x: 70, y: 220, size: 12, font: fontBold });
  p4.drawText('PDF.js Parser Worker', { x: 320, y: 220, size: 12, font: fontBold });
  p4.drawText('UTF-8 Plaintext Output', { x: 570, y: 220, size: 12, font: fontBold });
}

// Page 5: US Legal - Multi-column layout with unusual horizontal spacing
{
  const p5 = doc.addPage([612, 1008]);
  p5.drawText('Dual Column Comparative Technical Specification', { x: 50, y: 940, size: 16, font: fontBold });

  // Column A
  p5.drawText('Column A: Traditional Server Pipeline', { x: 50, y: 890, size: 11, font: fontBold });
  p5.drawText('Requires network bandwidth for multi-megabyte uploads.', { x: 50, y: 870, size: 10, font });
  p5.drawText('Server compute bottlenecks and queue delays.', { x: 50, y: 855, size: 10, font });

  // Column B
  p5.drawText('Column B: FixMyFile In-Browser Engine', { x: 320, y: 890, size: 11, font: fontBold });
  p5.drawText('Instant execution directly on user machine CPU.', { x: 320, y: 870, size: 10, font });
  p5.drawText('Zero latency and unlimited private operations.', { x: 320, y: 855, size: 10, font });
}

// Page 6: Standard - Quotations, punctuation, and mathematical symbols
{
  const p6 = doc.addPage([500, 700]);
  p6.drawText('Appendix: Mathematical Formulas & Citations', { x: 50, y: 640, size: 16, font: fontBold });
  p6.drawText('Formula: E = mc^2 and f(x) = (ax + b) / (cx + d)', { x: 50, y: 600, size: 12, font });
  p6.drawText('"Quality is not an act, it is a habit." -- Aristotle', { x: 50, y: 560, size: 12, font });
  p6.drawText('End of Verification Document.', { x: 50, y: 520, size: 12, font: fontBold });
}

const complexPdfBytes = await doc.save();
console.log(`   Document generated: 6 pages, ${complexPdfBytes.length} bytes\n`);

// 2. Execute extraction with progress monitoring
console.log('2. Running text extraction with progress tracking...');
const progressEvents = [];
const result = await extractTextFromPdf(complexPdfBytes, {
  pdfjsLib: pdfjsLegacy,
  baseFilename: 'complex-edge-case.pdf',
  onProgress: (p) => progressEvents.push(p)
});

console.log('3. Validating extraction metrics and structural integrity...');
assert.equal(result.totalPages, 6, 'Must extract all 6 pages');
assert.equal(result.hasSelectableText, true, 'Document has selectable text');
assert.equal(result.scannedPageCount, 1, 'Page 3 was completely empty');
assert.equal(result.filename, 'complex-edge-case-text.txt');
assert(result.totalCharacters > 500, `Expected > 500 characters, got ${result.totalCharacters}`);
assert(result.totalWords > 80, `Expected > 80 words, got ${result.totalWords}`);
console.log(`   Extracted ${result.totalCharacters} characters across ${result.totalWords} words.`);
console.log('   ✓ Metrics verified\n');

console.log('4. Verifying page delimiters and boundary preservation...');
for (let page = 1; page <= 6; page++) {
  assert(result.fullText.includes(`--- Page ${page} ---`), `Missing boundary marker for Page ${page}`);
}
assert(result.fullText.includes('[No selectable text found on this page]'), 'Blank page 3 marker missing');
console.log('   ✓ Page delimiters and blank page markers verified\n');

console.log('5. Verifying textual content from every page...');
// Page 1
assert(result.fullText.includes('Annual Executive Strategy Report'));
assert(result.fullText.includes('Zero-server document conversion pipelines.'));
// Page 2
assert(result.fullText.includes('Bienvenue au service FixMyFile'));
assert(result.fullText.includes('1,250,500.00 USD'));
// Page 4
assert(result.fullText.includes('System Architecture Blueprint (Landscape)'));
assert(result.fullText.includes('PDF.js Parser Worker'));
// Page 5
assert(result.fullText.includes('Column A: Traditional Server Pipeline'));
assert(result.fullText.includes('Column B: FixMyFile In-Browser Engine'));
// Page 6
assert(result.fullText.includes('Appendix: Mathematical Formulas & Citations'));
assert(result.fullText.includes('Aristotle'));
console.log('   ✓ All key phrases and section contents verified\n');

console.log('6. Verifying downloadable UTF-8 text Blob...');
const textBlob = createTxtBlob(result.fullText);
assert.equal(textBlob.type, 'text/plain;charset=utf-8');
assert.equal(textBlob.size, new TextEncoder().encode(result.fullText).length);
console.log(`   Blob generated: ${textBlob.size} bytes\n`);

console.log('=== DIFFICULT EDGE TEST FOR PDF TO TEXT: ALL PASS ===\n');
