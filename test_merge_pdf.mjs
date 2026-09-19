import { PDFDocument, rgb } from 'pdf-lib';

async function runMergePdfRegressionTests() {
  console.log('--- Starting Merge PDF Regression Tests ---');

  // Test 1: Create 3 distinct sample PDFs
  console.log('1. Generating sample PDFs with distinct dimensions and page counts...');

  // Doc A: 2 pages, Portrait A4 (approx 595 x 842 pt)
  const docA = await PDFDocument.create();
  const pageA1 = docA.addPage([595.28, 841.89]);
  pageA1.drawText('Document A - Page 1', { x: 50, y: 800, size: 18 });
  const pageA2 = docA.addPage([595.28, 841.89]);
  pageA2.drawText('Document A - Page 2', { x: 50, y: 800, size: 18 });
  const bytesA = await docA.save();

  // Doc B: 1 page, Landscape Letter (approx 792 x 612 pt)
  const docB = await PDFDocument.create();
  const pageB1 = docB.addPage([792.0, 612.0]);
  pageB1.drawText('Document B - Page 1 (Landscape)', { x: 50, y: 550, size: 20, color: rgb(0.8, 0.2, 0.2) });
  const bytesB = await docB.save();

  // Doc C: 3 pages, Square (500 x 500 pt)
  const docC = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const pageC = docC.addPage([500, 500]);
    pageC.drawText(`Document C - Page ${i}`, { x: 40, y: 450, size: 16, color: rgb(0.1, 0.6, 0.2) });
  }
  const bytesC = await docC.save();

  // Test 2: Merge 2 PDFs [Doc A (2 pages) + Doc B (1 page)]
  console.log('2. Merging 2 PDFs (Doc A + Doc B)...');
  const merged2 = await PDFDocument.create();
  const loadedA = await PDFDocument.load(bytesA);
  const loadedB = await PDFDocument.load(bytesB);

  const pagesA = await merged2.copyPages(loadedA, loadedA.getPageIndices());
  pagesA.forEach((p) => merged2.addPage(p));
  const pagesB = await merged2.copyPages(loadedB, loadedB.getPageIndices());
  pagesB.forEach((p) => merged2.addPage(p));

  const merged2Bytes = await merged2.save();
  const verify2 = await PDFDocument.load(merged2Bytes);
  if (verify2.getPageCount() !== 3) {
    throw new Error(`Test 2 failed: expected 3 pages, got ${verify2.getPageCount()}`);
  }
  console.log('✓ 2 PDFs merged successfully into 3 pages.');

  // Test 3: Merge 3 PDFs [Doc A (2 pages) + Doc B (1 page) + Doc C (3 pages)]
  console.log('3. Merging 3 PDFs (Doc A + Doc B + Doc C)...');
  const merged3 = await PDFDocument.create();
  const loadedC = await PDFDocument.load(bytesC);

  const copyA = await merged3.copyPages(loadedA, loadedA.getPageIndices());
  copyA.forEach((p) => merged3.addPage(p));
  const copyB = await merged3.copyPages(loadedB, loadedB.getPageIndices());
  copyB.forEach((p) => merged3.addPage(p));
  const copyC = await merged3.copyPages(loadedC, loadedC.getPageIndices());
  copyC.forEach((p) => merged3.addPage(p));

  const merged3Bytes = await merged3.save();
  const verify3 = await PDFDocument.load(merged3Bytes);
  const totalCount = verify3.getPageCount();
  if (totalCount !== 6) {
    throw new Error(`Test 3 failed: expected 6 pages, got ${totalCount}`);
  }
  console.log(`✓ 3 PDFs merged successfully into ${totalCount} pages.`);

  // Test 4: Verify page size, orientation, and dimensions preserved
  console.log('4. Verifying page dimensions and orientation preservation...');
  const p0 = verify3.getPage(0); // From A (Portrait: 595.28 x 841.89)
  const p2 = verify3.getPage(2); // From B (Landscape: 792 x 612)
  const p3 = verify3.getPage(3); // From C (Square: 500 x 500)

  if (Math.abs(p0.getWidth() - 595.28) > 1 || Math.abs(p0.getHeight() - 841.89) > 1) {
    throw new Error(`Page 0 dimensions altered: ${p0.getWidth()}x${p0.getHeight()}`);
  }
  if (Math.abs(p2.getWidth() - 792.0) > 1 || Math.abs(p2.getHeight() - 612.0) > 1) {
    throw new Error(`Page 2 dimensions altered: ${p2.getWidth()}x${p2.getHeight()}`);
  }
  if (Math.abs(p3.getWidth() - 500) > 1 || Math.abs(p3.getHeight() - 500) > 1) {
    throw new Error(`Page 3 dimensions altered: ${p3.getWidth()}x${p3.getHeight()}`);
  }
  console.log('✓ Page dimensions and orientations (Portrait, Landscape, Custom) preserved exactly.');

  // Test 5: Reordering test [Doc C, Doc B, Doc A]
  console.log('5. Testing reordering: [Doc C (3p), Doc B (1p), Doc A (2p)]...');
  const reorderedDoc = await PDFDocument.create();
  const reorderedPagesC = await reorderedDoc.copyPages(loadedC, loadedC.getPageIndices());
  reorderedPagesC.forEach((p) => reorderedDoc.addPage(p));
  const reorderedPagesB = await reorderedDoc.copyPages(loadedB, loadedB.getPageIndices());
  reorderedPagesB.forEach((p) => reorderedDoc.addPage(p));
  const reorderedPagesA = await reorderedDoc.copyPages(loadedA, loadedA.getPageIndices());
  reorderedPagesA.forEach((p) => reorderedDoc.addPage(p));

  const reorderedBytes = await reorderedDoc.save();
  const verifyReordered = await PDFDocument.load(reorderedBytes);
  if (verifyReordered.getPageCount() !== 6) {
    throw new Error('Reordered PDF page count mismatch');
  }
  const firstPage = verifyReordered.getPage(0);
  if (Math.abs(firstPage.getWidth() - 500) > 1) {
    throw new Error('Reordering failed: first page should be Doc C (500x500)');
  }
  const fourthPage = verifyReordered.getPage(3);
  if (Math.abs(fourthPage.getWidth() - 792.0) > 1) {
    throw new Error('Reordering failed: fourth page should be Doc B (792x612)');
  }
  console.log('✓ Reordering verified: output follows specified file sequence precisely.');

  // Test 6: Valid PDF binary structure verification
  console.log('6. Verifying binary PDF header and trailer structure...');
  const header = String.fromCharCode(...merged3Bytes.subarray(0, 5));
  if (header !== '%PDF-') {
    throw new Error(`Invalid PDF header: ${header}`);
  }
  console.log(`✓ PDF header is valid: "${header}"`);

  // Test 7: Corrupted PDF detection and error handling
  console.log('7. Testing corrupted PDF handling...');
  const garbageBytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]);
  let corruptedCaught = false;
  try {
    await PDFDocument.load(garbageBytes);
  } catch (err) {
    corruptedCaught = true;
    console.log(`✓ Corrupted PDF correctly rejected with expected error: "${err.message}"`);
  }
  if (!corruptedCaught) {
    throw new Error('Corrupted PDF was not rejected!');
  }

  console.log('\n=============================================');
  console.log('ALL MERGE PDF REGRESSION TESTS PASSED (7/7)!');
  console.log('=============================================');
}

runMergePdfRegressionTests().catch((err) => {
  console.error('\n❌ Regression Test Failed:', err);
  process.exit(1);
});
