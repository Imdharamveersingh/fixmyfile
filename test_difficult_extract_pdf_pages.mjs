import assert from 'node:assert/strict';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import {
  extractPdfPages
} from './src/tools/extract-pdf-pages/extractEngine.js';

console.log('=== STARTING DIFFICULT EDGE TEST: EXTRACT PDF PAGES ===\n');

// 1. Build a 6-page PDF with diverse dimensions, orientations, and a blank page
console.log('1. Building 6-page complex test document (diverse sizes & orientations)...');
const doc = await PDFDocument.create();

// Page 1: US Letter Portrait (612x792)
{
  const p1 = doc.addPage([612, 792]);
  p1.drawText('Original Page 1: US Letter Portrait', { x: 50, y: 720, size: 18, color: rgb(0.2, 0.2, 0.8) });
}

// Page 2: A4 Landscape (842x595)
{
  const p2 = doc.addPage([842, 595]);
  p2.drawText('Original Page 2: A4 Landscape', { x: 50, y: 530, size: 18, color: rgb(0.8, 0.2, 0.2) });
}

// Page 3: Blank page (Square 500x500)
{
  doc.addPage([500, 500]);
  // No text
}

// Page 4: Rotated Page (US Letter with 90° clockwise rotation)
{
  const p4 = doc.addPage([612, 792]);
  p4.setRotation(degrees(90));
  p4.drawText('Original Page 4: Rotated 90 Degrees', { x: 50, y: 720, size: 18, color: rgb(0.2, 0.7, 0.2) });
}

// Page 5: Legal Sheet (612x1008)
{
  const p5 = doc.addPage([612, 1008]);
  p5.drawText('Original Page 5: US Legal Height', { x: 50, y: 950, size: 18, color: rgb(0.5, 0.1, 0.5) });
}

// Page 6: Standard presentation slide (800x450)
{
  const p6 = doc.addPage([800, 450]);
  p6.drawText('Original Page 6: 16:9 Slide', { x: 50, y: 390, size: 18, color: rgb(0.1, 0.5, 0.5) });
}

const complexPdfBytes = await doc.save();
console.log(`   Source complex PDF created: 6 pages, ${complexPdfBytes.length} bytes\n`);

// 2. Perform non-trivial arbitrary sequence extraction: [5, 2, 4, 1]
console.log('2. Performing non-trivial extraction sequence: [5, 2, 4, 1]...');
const targetSequence = [5, 2, 4, 1];
const result = await extractPdfPages(complexPdfBytes, targetSequence, {
  baseFilename: 'difficult-doc.pdf'
});

// 3. Verify output integrity
console.log('3. Validating output PDF integrity, page count, and dimensions...');
assert.equal(result.pageCount, 4, 'Output must have exactly 4 pages');
assert.deepEqual(result.pages, targetSequence, 'Extracted page metadata must match requested order');
assert.equal(result.filename, 'difficult-doc-extracted-4-pages.pdf');

// Load generated PDF with pdf-lib to inspect actual underlying pages and dimensions
const loadedDoc = await PDFDocument.load(result.bytes);
assert.equal(loadedDoc.getPageCount(), 4, 'Loaded output must contain exactly 4 pages');

const outPages = loadedDoc.getPages();

// Page 0 should correspond to original Page 5 (Legal: 612x1008)
const p0Size = outPages[0].getSize();
console.log(`   Output Page 1 (from orig P5): ${p0Size.width}x${p0Size.height}`);
assert.equal(p0Size.width, 612);
assert.equal(p0Size.height, 1008);

// Page 1 should correspond to original Page 2 (A4 Landscape: 842x595)
const p1Size = outPages[1].getSize();
console.log(`   Output Page 2 (from orig P2): ${p1Size.width}x${p1Size.height}`);
assert.equal(p1Size.width, 842);
assert.equal(p1Size.height, 595);

// Page 2 should correspond to original Page 4 (Letter rotated 90°)
const p2Size = outPages[2].getSize();
const p2Rotation = outPages[2].getRotation().angle;
console.log(`   Output Page 3 (from orig P4): ${p2Size.width}x${p2Size.height}, rotation: ${p2Rotation}°`);
assert.equal(p2Size.width, 612);
assert.equal(p2Size.height, 792);
assert.equal(p2Rotation, 90);

// Page 3 should correspond to original Page 1 (Letter: 612x792, rotation 0°)
const p3Size = outPages[3].getSize();
const p3Rotation = outPages[3].getRotation().angle;
console.log(`   Output Page 4 (from orig P1): ${p3Size.width}x${p3Size.height}, rotation: ${p3Rotation}°`);
assert.equal(p3Size.width, 612);
assert.equal(p3Size.height, 792);
assert.equal(p3Rotation, 0);

console.log('   ✓ Output sequence, page geometry, and orientations preserved exactly in order: [5, 2, 4, 1]\n');

console.log('=== DIFFICULT EDGE TEST FOR EXTRACT PDF PAGES: ALL PASS ===\n');
