import { PDFDocument } from 'pdf-lib';

async function runCompressPdfRegressionTests() {
  console.log('--- Starting Compress PDF Regression Tests ---');

  // Helper compression function matching browser implementation
  async function compressPdfBuffer(inputBuffer) {
    const srcDoc = await PDFDocument.load(inputBuffer, { ignoreEncryption: false });
    const pageCount = srcDoc.getPageCount();

    // Strategy: Create clean document, copy reachable pages (strips orphaned objects/revisions),
    // and serialize with compressed binary object streams
    const compressedDoc = await PDFDocument.create();
    const copiedPages = await compressedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => compressedDoc.addPage(page));

    // Save with compressed object streams enabled
    const compressedBytes = await compressedDoc.save({ useObjectStreams: true });

    const originalSize = inputBuffer.byteLength;
    const compressedSize = compressedBytes.byteLength;
    const savedBytes = Math.max(0, originalSize - compressedSize);
    const reductionPercent = originalSize > 0 ? ((savedBytes / originalSize) * 100) : 0;
    const isAlreadyOptimized = compressedSize >= originalSize;

    // Never return a file larger than the original
    const finalBytes = isAlreadyOptimized ? new Uint8Array(inputBuffer) : compressedBytes;

    return {
      originalSize,
      compressedSize: finalBytes.byteLength,
      reductionPercent: isAlreadyOptimized ? 0 : reductionPercent,
      isAlreadyOptimized,
      finalBytes,
      pageCount
    };
  }

  // Test 1: Compress an unoptimized PDF with redundant objects and metadata
  console.log('1. Testing compression on unoptimized document with structural overhead...');
  const unoptDoc = await PDFDocument.create();
  unoptDoc.setTitle('Unoptimized Document Title with Long Descriptive Text');
  unoptDoc.setAuthor('Original Author Name');
  unoptDoc.setSubject('Subject matter of the test document');
  unoptDoc.setProducer('Legacy PDF Producer v1.0');
  for (let i = 1; i <= 3; i++) {
    const page = unoptDoc.addPage([595.28, 841.89]);
    page.drawText(`Document Page ${i} Content`, { x: 50, y: 750, size: 16 });
  }
  // Save with useObjectStreams: false to simulate uncompressed objects
  const rawBytes = await unoptDoc.save({ useObjectStreams: false });

  const result1 = await compressPdfBuffer(rawBytes);
  console.log(`Original: ${result1.originalSize} B, Compressed: ${result1.compressedSize} B, Reduction: ${result1.reductionPercent.toFixed(1)}%`);

  if (result1.compressedSize >= result1.originalSize) {
    throw new Error('Test 1 failed: Expected size reduction on uncompressed object stream');
  }
  if (result1.pageCount !== 3) {
    throw new Error(`Test 1 failed: Expected 3 pages, got ${result1.pageCount}`);
  }
  console.log('✓ Test 1 passed: Document successfully compressed with preserved page count.');

  // Test 2: Verify the output is a valid, parseable PDF with preserved page dimensions
  console.log('2. Verifying compressed PDF validity, header and page dimensions...');
  const header = String.fromCharCode(...result1.finalBytes.subarray(0, 5));
  if (header !== '%PDF-') {
    throw new Error(`Invalid PDF header: ${header}`);
  }

  const verifiedDoc = await PDFDocument.load(result1.finalBytes);
  if (verifiedDoc.getPageCount() !== 3) {
    throw new Error('Parsed page count mismatch');
  }
  const p0 = verifiedDoc.getPage(0);
  if (Math.abs(p0.getWidth() - 595.28) > 1 || Math.abs(p0.getHeight() - 841.89) > 1) {
    throw new Error('Page dimensions were not preserved');
  }
  console.log(`✓ Test 2 passed: Valid PDF header (${header}), correct dimensions (${p0.getWidth()}x${p0.getHeight()}).`);

  // Test 3: Already optimized PDF handling
  console.log('3. Testing already-optimized PDF handling...');
  // Compress the already compressed output
  const result2 = await compressPdfBuffer(result1.finalBytes);
  console.log(`Already-optimized test - Original: ${result2.originalSize} B, Compressed: ${result2.compressedSize} B`);

  if (result2.finalBytes.byteLength > result2.originalSize) {
    throw new Error('Test 3 failed: Output must never exceed original size');
  }
  console.log('✓ Test 3 passed: Already optimized document handled safely without size inflation.');

  // Test 4: Corrupted file handling
  console.log('4. Testing corrupted PDF input handling...');
  const garbage = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);
  let caughtCorrupted = false;
  try {
    await compressPdfBuffer(garbage);
  } catch (err) {
    caughtCorrupted = true;
    console.log(`✓ Test 4 passed: Corrupted PDF correctly rejected ("${err.message}")`);
  }
  if (!caughtCorrupted) {
    throw new Error('Test 4 failed: Corrupted PDF was not rejected');
  }

  // Test 5: Multi-page mixed dimension document
  console.log('5. Testing multi-page mixed dimension document...');
  const mixedDoc = await PDFDocument.create();
  mixedDoc.addPage([400, 600]);
  mixedDoc.addPage([800, 500]); // landscape
  const mixedRaw = await mixedDoc.save({ useObjectStreams: false });

  const mixedResult = await compressPdfBuffer(mixedRaw);
  const reloadedMixed = await PDFDocument.load(mixedResult.finalBytes);
  if (reloadedMixed.getPage(0).getWidth() !== 400 || reloadedMixed.getPage(1).getWidth() !== 800) {
    throw new Error('Mixed page dimensions were not preserved');
  }
  console.log('✓ Test 5 passed: Mixed orientations and dimensions preserved accurately.');

  console.log('\n================================================');
  console.log('ALL COMPRESS PDF REGRESSION TESTS PASSED (5/5)!');
  console.log('================================================');
}

runCompressPdfRegressionTests().catch((err) => {
  console.error('\n❌ Regression Test Failed:', err);
  process.exit(1);
});
