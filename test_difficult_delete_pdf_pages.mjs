import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  deletePdfPages
} from './src/tools/delete-pdf-pages/deleteEngine.js';

console.log('=== STARTING DIFFICULT EDGE TEST: DELETE PDF PAGES ===\n');

// 1. Build a 6-page PDF with diverse dimensions, blank page, and distinctive metadata
console.log('1. Building 6-page complex test document...');
const doc = await PDFDocument.create();

// Page 1: US Letter (612x792)
doc.addPage([612, 792]).drawText('Document Page 1: Letter', { x: 50, y: 700, size: 20, color: rgb(0.1, 0.1, 0.7) });

// Page 2: A4 (595x842) - Scheduled to be DELETED
doc.addPage([595, 842]).drawText('Document Page 2: To Be Removed', { x: 50, y: 750, size: 20, color: rgb(0.8, 0.1, 0.1) });

// Page 3: Blank page (500x500)
doc.addPage([500, 500]);

// Page 4: Landscape Banner (800x400)
doc.addPage([800, 400]).drawText('Document Page 4: Landscape Banner', { x: 50, y: 350, size: 20, color: rgb(0.1, 0.6, 0.2) });

// Page 5: US Legal (612x1008) - Scheduled to be DELETED
doc.addPage([612, 1008]).drawText('Document Page 5: Legal To Be Removed', { x: 50, y: 920, size: 20, color: rgb(0.8, 0.1, 0.1) });

// Page 6: Standard Square (600x600)
doc.addPage([600, 600]).drawText('Document Page 6: Conclusion', { x: 50, y: 520, size: 20, color: rgb(0.3, 0.3, 0.3) });

const complexPdfBytes = await doc.save();
console.log(`   Source complex PDF generated: 6 pages, ${complexPdfBytes.length} bytes\n`);

// 2. Perform deletion of pages [2, 5]
console.log('2. Executing deletion of pages 2 and 5 (Expected remaining: [1, 3, 4, 6])...');
const result = await deletePdfPages(complexPdfBytes, [2, 5], {
  baseFilename: 'complex-report.pdf'
});

// 3. Verify output integrity, page counts, and page dimensions
console.log('3. Validating output PDF integrity and remaining page geometries...');
assert.equal(result.pageCount, 4);
assert.equal(result.originalCount, 6);
assert.equal(result.deletedCount, 2);
assert.deepEqual(result.remainingPages, [1, 3, 4, 6]);
assert.deepEqual(result.deletedPages, [2, 5]);

const loadedDoc = await PDFDocument.load(result.bytes);
assert.equal(loadedDoc.getPageCount(), 4);

const outPages = loadedDoc.getPages();

// Page 0 should correspond to original Page 1 (Letter: 612x792)
const p0 = outPages[0].getSize();
console.log(`   Remaining Page 1 (orig P1): ${p0.width}x${p0.height}`);
assert.equal(p0.width, 612);
assert.equal(p0.height, 792);

// Page 1 should correspond to original Page 3 (Blank: 500x500)
const p1 = outPages[1].getSize();
console.log(`   Remaining Page 2 (orig P3 blank): ${p1.width}x${p1.height}`);
assert.equal(p1.width, 500);
assert.equal(p1.height, 500);

// Page 2 should correspond to original Page 4 (Banner: 800x400)
const p2 = outPages[2].getSize();
console.log(`   Remaining Page 3 (orig P4): ${p2.width}x${p2.height}`);
assert.equal(p2.width, 800);
assert.equal(p2.height, 400);

// Page 3 should correspond to original Page 6 (Square: 600x600)
const p3 = outPages[3].getSize();
console.log(`   Remaining Page 4 (orig P6): ${p3.width}x${p3.height}`);
assert.equal(p3.width, 600);
assert.equal(p3.height, 600);
console.log('   ✓ Page geometry and sequence verified for remaining pages [1, 3, 4, 6]\n');

// 4. Test "Delete All Pages" Safe Rejection Gate
console.log('4. Testing "Delete All Pages" Safe Rejection Gate...');
await assert.rejects(
  async () => deletePdfPages(complexPdfBytes, '1-6'),
  /At least one page must remain in the PDF/i,
  'Attempt to delete all pages must be safely blocked'
);
await assert.rejects(
  async () => deletePdfPages(complexPdfBytes, [1, 2, 3, 4, 5, 6]),
  /At least one page must remain in the PDF/i
);
console.log('   ✓ Safe rejection verified: Zero-page documents strictly blocked\n');

console.log('=== DIFFICULT EDGE TEST FOR DELETE PDF PAGES: ALL PASS ===\n');
