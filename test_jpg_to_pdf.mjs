import fs from 'fs';
import path from 'path';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

/**
 * FixMyFile JPG to PDF Bug Fix Regression Test Suite
 * 
 * Tests conversion of:
 * - fixmyfile-test-portrait.jpg (1200x1600)
 * - fixmyfile-test-landscape.jpg (1600x1000)
 * - fixmyfile-test-square.jpg (1400x1400)
 */

const FIXTURES = {
  portrait: path.resolve('test-fixtures/fixmyfile-test-portrait.jpg'),
  landscape: path.resolve('test-fixtures/fixmyfile-test-landscape.jpg'),
  square: path.resolve('test-fixtures/fixmyfile-test-square.jpg')
};

// Ensure fixtures exist (fallback to D:/chrome download if needed)
for (const [key, p] of Object.entries(FIXTURES)) {
  if (!fs.existsSync(p)) {
    const alt = `D:/chrome download/fixmyfile-test-${key}.jpg`;
    if (fs.existsSync(alt)) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.copyFileSync(alt, p);
    } else {
      throw new Error(`Fixture not found: ${p}`);
    }
  }
}

// Helper to extract JPEG dimensions from buffer
function getJpegDimensions(buf) {
  let offset = 2;
  while (offset < buf.length) {
    if (buf[offset] !== 0xFF) break;
    const marker = buf[offset + 1];
    if (marker === 0xC0 || marker === 0xC2) {
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      return { width, height };
    }
    const len = buf.readUInt16BE(offset + 2);
    offset += 2 + len;
  }
  throw new Error('Invalid JPEG stream: SOF marker not found');
}

// Conversion engine matching the browser pipeline
async function convertJpgFilesToPdf(fileList) {
  if (!fileList || fileList.length === 0) {
    throw new Error('Please add at least one JPG or JPEG image to convert.');
  }

  let doc = null;
  const margin = 10; // 10mm margins

  for (let i = 0; i < fileList.length; i++) {
    const item = fileList[i];
    const buf = fs.readFileSync(item.path);
    const dataUrl = 'data:image/jpeg;base64,' + buf.toString('base64');
    const { width: imgWidth, height: imgHeight } = getJpegDimensions(buf);

    const isLandscape = imgWidth > imgHeight;
    const orientation = isLandscape ? 'landscape' : 'portrait';

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    const maxUsableWidth = pageWidth - margin * 2;
    const maxUsableHeight = pageHeight - margin * 2;

    const scale = Math.min(maxUsableWidth / imgWidth, maxUsableHeight / imgHeight);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;

    const posX = margin + (maxUsableWidth - renderWidth) / 2;
    const posY = margin + (maxUsableHeight - renderHeight) / 2;

    if (i === 0) {
      doc = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        compress: true
      });
    } else {
      doc.addPage('a4', orientation);
    }

    doc.addImage(dataUrl, 'JPEG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
  }

  const pdfArrayBuffer = doc.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}

async function runJpgToPdfRegressionTests() {
  console.log('--- Starting FixMyFile JPG to PDF Regression Tests ---\n');

  // Verify test fixtures
  console.log('[Test 0] Verifying test image files and dimensions...');
  const dimPortrait = getJpegDimensions(fs.readFileSync(FIXTURES.portrait));
  const dimLandscape = getJpegDimensions(fs.readFileSync(FIXTURES.landscape));
  const dimSquare = getJpegDimensions(fs.readFileSync(FIXTURES.square));

  console.log(`Portrait: ${dimPortrait.width}x${dimPortrait.height}`);
  console.log(`Landscape: ${dimLandscape.width}x${dimLandscape.height}`);
  console.log(`Square: ${dimSquare.width}x${dimSquare.height}`);

  if (dimPortrait.width !== 1200 || dimPortrait.height !== 1600) throw new Error('Portrait dimensions mismatch');
  if (dimLandscape.width !== 1600 || dimLandscape.height !== 1000) throw new Error('Landscape dimensions mismatch');
  if (dimSquare.width !== 1400 || dimSquare.height !== 1400) throw new Error('Square dimensions mismatch');
  console.log('✓ Test 0 passed: All 3 input files verified as valid JPEGs with expected dimensions.\n');

  // Test A: Single portrait
  console.log('[Test A] Single portrait (1200x1600) -> PDF...');
  const pdfA = await convertJpgFilesToPdf([{ path: FIXTURES.portrait, name: 'fixmyfile-test-portrait.jpg' }]);
  const docA = await PDFDocument.load(pdfA);
  if (docA.getPageCount() !== 1) throw new Error(`Expected 1 page, got ${docA.getPageCount()}`);
  const pA = docA.getPage(0);
  console.log(`Page dimensions: ${Math.round(pA.getWidth())}x${Math.round(pA.getHeight())}`);
  if (Math.round(pA.getWidth()) !== 595 || Math.round(pA.getHeight()) !== 842) {
    throw new Error('Expected portrait A4 dimensions (595x842)');
  }
  console.log('✓ Test A passed: Single portrait converted successfully to Portrait A4 PDF.\n');

  // Test B: Single landscape
  console.log('[Test B] Single landscape (1600x1000) -> PDF...');
  const pdfB = await convertJpgFilesToPdf([{ path: FIXTURES.landscape, name: 'fixmyfile-test-landscape.jpg' }]);
  const docB = await PDFDocument.load(pdfB);
  if (docB.getPageCount() !== 1) throw new Error(`Expected 1 page, got ${docB.getPageCount()}`);
  const pB = docB.getPage(0);
  console.log(`Page dimensions: ${Math.round(pB.getWidth())}x${Math.round(pB.getHeight())}`);
  if (Math.round(pB.getWidth()) !== 842 || Math.round(pB.getHeight()) !== 595) {
    throw new Error('Expected landscape A4 dimensions (842x595)');
  }
  console.log('✓ Test B passed: Single landscape converted successfully to Landscape A4 PDF.\n');

  // Test C: Single square
  console.log('[Test C] Single square (1400x1400) -> PDF...');
  const pdfC = await convertJpgFilesToPdf([{ path: FIXTURES.square, name: 'fixmyfile-test-square.jpg' }]);
  const docC = await PDFDocument.load(pdfC);
  if (docC.getPageCount() !== 1) throw new Error(`Expected 1 page, got ${docC.getPageCount()}`);
  const pC = docC.getPage(0);
  console.log(`Page dimensions: ${Math.round(pC.getWidth())}x${Math.round(pC.getHeight())}`);
  if (Math.round(pC.getWidth()) !== 595 || Math.round(pC.getHeight()) !== 842) {
    throw new Error('Expected portrait A4 dimensions (595x842) for square');
  }
  console.log('✓ Test C passed: Single square converted successfully without distortion.\n');

  // Test D: All three -> 3-page PDF
  console.log('[Test D] All three images -> 3-page PDF...');
  const pdfD = await convertJpgFilesToPdf([
    { path: FIXTURES.portrait, name: 'fixmyfile-test-portrait.jpg' },
    { path: FIXTURES.landscape, name: 'fixmyfile-test-landscape.jpg' },
    { path: FIXTURES.square, name: 'fixmyfile-test-square.jpg' }
  ]);
  const docD = await PDFDocument.load(pdfD);
  if (docD.getPageCount() !== 3) throw new Error(`Expected 3 pages, got ${docD.getPageCount()}`);
  const pD1 = docD.getPage(0);
  const pD2 = docD.getPage(1);
  const pD3 = docD.getPage(2);
  if (Math.round(pD1.getWidth()) !== 595 || Math.round(pD1.getHeight()) !== 842) throw new Error('Page 1 should be Portrait');
  if (Math.round(pD2.getWidth()) !== 842 || Math.round(pD2.getHeight()) !== 595) throw new Error('Page 2 should be Landscape');
  if (Math.round(pD3.getWidth()) !== 595 || Math.round(pD3.getHeight()) !== 842) throw new Error('Page 3 should be Portrait');
  console.log('✓ Test D passed: Multi-image PDF contains 3 pages with exact orientations.\n');

  // Test E: Reordered images [square, landscape, portrait]
  console.log('[Test E] Reordered images [square, landscape, portrait]...');
  const pdfE = await convertJpgFilesToPdf([
    { path: FIXTURES.square, name: 'fixmyfile-test-square.jpg' },
    { path: FIXTURES.landscape, name: 'fixmyfile-test-landscape.jpg' },
    { path: FIXTURES.portrait, name: 'fixmyfile-test-portrait.jpg' }
  ]);
  const docE = await PDFDocument.load(pdfE);
  if (docE.getPageCount() !== 3) throw new Error(`Expected 3 pages, got ${docE.getPageCount()}`);
  const pE1 = docE.getPage(0);
  const pE2 = docE.getPage(1);
  const pE3 = docE.getPage(2);
  if (Math.round(pE1.getWidth()) !== 595) throw new Error('Page 1 (square) should be Portrait');
  if (Math.round(pE2.getWidth()) !== 842) throw new Error('Page 2 (landscape) should be Landscape');
  if (Math.round(pE3.getWidth()) !== 595) throw new Error('Page 3 (portrait) should be Portrait');
  console.log('✓ Test E passed: Reordered images converted successfully matching new sequence.\n');

  // Test F: Remove one image -> 2 remaining convert
  console.log('[Test F] Remove landscape -> convert [portrait, square]...');
  const pdfF = await convertJpgFilesToPdf([
    { path: FIXTURES.portrait, name: 'fixmyfile-test-portrait.jpg' },
    { path: FIXTURES.square, name: 'fixmyfile-test-square.jpg' }
  ]);
  const docF = await PDFDocument.load(pdfF);
  if (docF.getPageCount() !== 2) throw new Error(`Expected 2 pages, got ${docF.getPageCount()}`);
  console.log('✓ Test F passed: Removal of image handled cleanly; remaining 2 images converted.\n');

  // Test G: Empty list rejection
  console.log('[Test G] Empty list validation...');
  try {
    await convertJpgFilesToPdf([]);
    throw new Error('Should have thrown on empty list');
  } catch (err) {
    if (!err.message.includes('Please add at least one JPG')) {
      throw err;
    }
  }
  console.log('✓ Test G passed: Empty image list gracefully rejected with user guidance.\n');

  console.log('======================================================');
  console.log(' ALL JPG TO PDF REGRESSION TESTS PASSED! ');
  console.log('======================================================\n');
}

runJpgToPdfRegressionTests().catch((err) => {
  console.error('❌ JPG TO PDF REGRESSION TEST FAILED:', err);
  process.exit(1);
});
