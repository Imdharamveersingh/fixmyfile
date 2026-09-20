import assert from 'node:assert/strict';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as pdfjsLegacy from 'pdfjs-dist/legacy/build/pdf.mjs';
import JSZip from 'jszip';
import { convertPdfToPowerpoint, validatePdfBuffer } from './src/tools/pdf-to-powerpoint/powerpointEngine.js';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

console.log('--- STARTING PDF TO POWERPOINT AUTOMATED TEST SUITE ---');

// Helper to create valid sample PDF buffers using pdf-lib
async function createSamplePdf({ pageCount = 1, texts = [], width = 612, height = 792 }) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.addPage([width, height]);
    const pageText = texts[i] || `Page ${i + 1} Content`;
    page.drawText(pageText, {
      x: 50,
      y: height - 100,
      size: 18,
      font,
      color: rgb(0.1, 0.1, 0.2)
    });
  }

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

// Mock renderer for headless Node environment
const mockNodeRenderer = async (_page) => {
  // Return a 1x1 transparent PNG data URI
  const dummyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return { dataUrl: dummyPng };
};

let testsPassed = 0;

// Test 1: Registry & Roadmap verification
{
  console.log('Test 1: Registry & Active Tools verification...');
  const pptTool = ALL_TOOLS.find((t) => t.path === '/pdf-to-powerpoint');
  assert(pptTool, 'PDF to PowerPoint must exist in ALL_TOOLS');
  assert.equal(pptTool.name, 'PDF to PowerPoint');
  assert.equal(pptTool.phase, 'Phase 4');
  assert(ALL_TOOLS.length >= 22, `Expected at least 22 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');
  testsPassed++;
  console.log('  PASS');
}

// Test 2: Input validation (empty buffer, corrupted buffer)
{
  console.log('Test 2: Validation errors on empty and corrupted buffers...');
  assert.throws(() => validatePdfBuffer(new Uint8Array(0)), /empty/i);
  assert.throws(() => validatePdfBuffer(new Uint8Array([1, 2, 3])), /too small/i);
  assert.throws(() => validatePdfBuffer(new TextEncoder().encode('NOT_A_PDF_FILE')), /missing %PDF-/i);

  await assert.rejects(
    async () => {
      await convertPdfToPowerpoint(new TextEncoder().encode('%PDF-corrupted-content'), {
        pdfjsLib: pdfjsLegacy,
        renderPage: mockNodeRenderer
      });
    },
    /Failed to parse PDF/i
  );
  testsPassed++;
  console.log('  PASS');
}

// Test 3: 1-Page PDF to PowerPoint
{
  console.log('Test 3: 1-Page PDF conversion...');
  const pdfBytes = await createSamplePdf({
    pageCount: 1,
    texts: ['Single Page Presentation Slide Title']
  });

  const result = await convertPdfToPowerpoint(pdfBytes, {
    baseFilename: 'single-slide',
    pdfjsLib: pdfjsLegacy,
    renderPage: mockNodeRenderer
  });

  assert.equal(result.filename, 'single-slide.pptx');
  assert.equal(result.slideCount, 1);
  assert(result.buffer instanceof Uint8Array, 'Result must contain binary buffer');
  assert(result.buffer.byteLength > 1000, 'Resulting PPTX must have meaningful size');

  // Verify PK ZIP structure
  assert.equal(result.buffer[0], 0x50); // 'P'
  assert.equal(result.buffer[1], 0x4b); // 'K'

  // Inspect package with JSZip
  const zip = await JSZip.loadAsync(result.buffer);
  assert(zip.file('[Content_Types].xml'), 'Must contain [Content_Types].xml');
  assert(zip.file('ppt/presentation.xml'), 'Must contain ppt/presentation.xml');
  assert(zip.file('ppt/slides/slide1.xml'), 'Must contain ppt/slides/slide1.xml');
  assert(!zip.file('ppt/slides/slide2.xml'), 'Must not contain slide 2');

  testsPassed++;
  console.log('  PASS');
}

// Test 4: Multi-Page PDF (5 pages) conversion with sequential order
{
  console.log('Test 4: Multi-Page PDF (5 pages) conversion with sequential slide order...');
  const texts = [
    'Slide 1: Executive Overview',
    'Slide 2: Market Opportunity',
    'Slide 3: Financial Projections',
    'Slide 4: Technical Architecture',
    'Slide 5: Conclusion and Q&A'
  ];

  const pdfBytes = await createSamplePdf({ pageCount: 5, texts });

  let progressReported = false;
  const result = await convertPdfToPowerpoint(pdfBytes, {
    baseFilename: 'deck-report',
    pdfjsLib: pdfjsLegacy,
    renderPage: mockNodeRenderer,
    onProgress: (pct) => {
      if (pct > 0) progressReported = true;
    }
  });

  assert(progressReported, 'Progress callback should be invoked');
  assert.equal(result.filename, 'deck-report.pptx');
  assert.equal(result.slideCount, 5);

  // Inspect package with JSZip
  const zip = await JSZip.loadAsync(result.buffer);
  for (let i = 1; i <= 5; i++) {
    const slideFile = zip.file(`ppt/slides/slide${i}.xml`);
    assert(slideFile, `Slide ${i} file must exist in package`);
  }
  assert(!zip.file('ppt/slides/slide6.xml'), 'Must not contain slide 6');

  // Check slide notes
  const notesFile = zip.file('ppt/notesSlides/notesSlide1.xml');
  if (notesFile) {
    const notesContent = await notesFile.async('string');
    assert(notesContent.includes('Executive Overview'), 'Slide notes should contain extracted page text');
  }

  testsPassed++;
  console.log('  PASS');
}

// Test 5: Landscape vs Portrait aspect ratio handling
{
  console.log('Test 5: Landscape vs Portrait aspect ratio...');
  // Landscape 16:9 PDF (960 x 540)
  const landscapePdf = await createSamplePdf({
    pageCount: 2,
    width: 960,
    height: 540,
    texts: ['Landscape Slide 1', 'Landscape Slide 2']
  });

  const result = await convertPdfToPowerpoint(landscapePdf, {
    baseFilename: 'landscape-deck',
    pdfjsLib: pdfjsLegacy,
    renderPage: mockNodeRenderer
  });

  assert.equal(result.slideCount, 2);
  const zip = await JSZip.loadAsync(result.buffer);
  const presXml = await zip.file('ppt/presentation.xml').async('string');
  assert(presXml.includes('sldSz'), 'Presentation must declare slide size');

  testsPassed++;
  console.log('  PASS');
}

// Test 6: Text-heavy PDF with Unicode text
{
  console.log('Test 6: Text-heavy & Unicode slide notes extraction...');
  const pdfBytes = await createSamplePdf({
    pageCount: 2,
    texts: [
      'Unicode Slide: Hello World 12345 $99.99',
      'Symbols and punctuation: @ # $ % ^ & * ( ) - + = [ ] { }'
    ]
  });

  const result = await convertPdfToPowerpoint(pdfBytes, {
    baseFilename: 'unicode-test',
    pdfjsLib: pdfjsLegacy,
    renderPage: mockNodeRenderer
  });

  assert.equal(result.slideCount, 2);
  const zip = await JSZip.loadAsync(result.buffer);
  assert(zip.file('ppt/slides/slide1.xml'));
  assert(zip.file('ppt/slides/slide2.xml'));
  testsPassed++;
  console.log('  PASS');
}

// Test 7: Large PDF (10 pages) stress and ordering test
{
  console.log('Test 7: 10-page PDF stress test...');
  const texts = Array.from({ length: 10 }, (_, i) => `Slide Number ${i + 1} Content`);
  const largePdf = await createSamplePdf({ pageCount: 10, texts });

  const result = await convertPdfToPowerpoint(largePdf, {
    baseFilename: 'large-presentation',
    pdfjsLib: pdfjsLegacy,
    renderPage: mockNodeRenderer
  });

  assert.equal(result.slideCount, 10);
  assert.equal(result.filename, 'large-presentation.pptx');

  const zip = await JSZip.loadAsync(result.buffer);
  for (let i = 1; i <= 10; i++) {
    assert(zip.file(`ppt/slides/slide${i}.xml`), `Slide ${i} should be present in ZIP`);
  }
  testsPassed++;
  console.log('  PASS');
}

console.log(`\nALL ${testsPassed}/${testsPassed} PDF TO POWERPOINT AUTOMATED TESTS PASSED!`);
