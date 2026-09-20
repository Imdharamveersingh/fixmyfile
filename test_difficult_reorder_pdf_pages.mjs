import assert from 'node:assert/strict';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
import {
  reorderPdfPages
} from './src/tools/reorder-pdf-pages/reorderEngine.js';

console.log('=== STARTING DIFFICULT EDGE TEST: REORDER PDF PAGES ===\n');

// 1. Build a 5-page PDF with diverse dimensions, orientations, and a blank page
console.log('1. Building 5-page complex test document (mixed sizes, rotation, blank page)...');
const doc = await PDFDocument.create();

// Page 1: US Letter (612x792)
doc.addPage([612, 792]).drawText('Orig Page 1: Letter', { x: 50, y: 700, size: 20, color: rgb(0.1, 0.2, 0.8) });

// Page 2: A4 Landscape (842x595)
doc.addPage([842, 595]).drawText('Orig Page 2: A4 Landscape', { x: 50, y: 520, size: 20, color: rgb(0.8, 0.2, 0.1) });

// Page 3: Blank page (500x500)
doc.addPage([500, 500]);

// Page 4: Rotated 90° Page (612x792)
{
  const p4 = doc.addPage([612, 792]);
  p4.setRotation(degrees(90));
  p4.drawText('Orig Page 4: Rotated 90 Deg', { x: 50, y: 700, size: 20, color: rgb(0.2, 0.7, 0.3) });
}

// Page 5: US Legal (612x1008)
doc.addPage([612, 1008]).drawText('Orig Page 5: Legal', { x: 50, y: 920, size: 20, color: rgb(0.6, 0.2, 0.6) });

const complexPdfBytes = await doc.save();
console.log(`   Source complex PDF generated: 5 pages, ${complexPdfBytes.length} bytes\n`);

// 2. Perform arbitrary complex permutation: [5, 3, 1, 4, 2]
console.log('2. Performing complex reorder: [5, 3, 1, 4, 2]...');
const targetOrder = [5, 3, 1, 4, 2];
const result = await reorderPdfPages(complexPdfBytes, targetOrder, {
  baseFilename: 'complex-reorder.pdf'
});

// 3. Verify output integrity and exact dimensions for every page
console.log('3. Validating output PDF integrity and page geometry order...');
assert.equal(result.pageCount, 5);
assert.deepEqual(result.pageOrder, targetOrder);

const loadedDoc = await PDFDocument.load(result.bytes);
assert.equal(loadedDoc.getPageCount(), 5);

const pages = loadedDoc.getPages();

// Output Page 0 should be original Page 5 (Legal: 612x1008)
const p0 = pages[0].getSize();
console.log(`   Out Page 1 (orig P5 Legal): ${p0.width}x${p0.height}`);
assert.equal(p0.width, 612);
assert.equal(p0.height, 1008);

// Output Page 1 should be original Page 3 (Blank: 500x500)
const p1 = pages[1].getSize();
console.log(`   Out Page 2 (orig P3 Blank): ${p1.width}x${p1.height}`);
assert.equal(p1.width, 500);
assert.equal(p1.height, 500);

// Output Page 2 should be original Page 1 (Letter: 612x792)
const p2 = pages[2].getSize();
console.log(`   Out Page 3 (orig P1 Letter): ${p2.width}x${p2.height}`);
assert.equal(p2.width, 612);
assert.equal(p2.height, 792);

// Output Page 3 should be original Page 4 (Letter rotated 90°)
const p3 = pages[3].getSize();
const p3Rot = pages[3].getRotation().angle;
console.log(`   Out Page 4 (orig P4 Rotated): ${p3.width}x${p3.height}, rot: ${p3Rot}°`);
assert.equal(p3.width, 612);
assert.equal(p3.height, 792);
assert.equal(p3Rot, 90);

// Output Page 4 should be original Page 2 (A4 Landscape: 842x595)
const p4 = pages[4].getSize();
console.log(`   Out Page 5 (orig P2 Landscape): ${p4.width}x${p4.height}`);
assert.equal(p4.width, 842);
assert.equal(p4.height, 595);

console.log('   ✓ Output sequence and page geometries verified exactly for: [5, 3, 1, 4, 2]\n');

console.log('=== DIFFICULT EDGE TEST FOR REORDER PDF PAGES: ALL PASS ===\n');
