import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import JSZip from 'jszip';
import { convertPdfToDocx } from './src/tools/pdf-to-word/converterEngine.js';
import { PDFDocument, StandardFonts } from 'pdf-lib';

/**
 * PDF to Word Pipeline Regression Test Suite
 */

const FIXTURE_PATH = path.resolve('fixmyfile-pdf-to-word-difficult-test.pdf');

// Helper to ensure benchmark PDF fixture exists deterministically
async function ensureBenchmarkFixture() {
  if (fs.existsSync(FIXTURE_PATH)) {
    return;
  }
  console.log('Fixture not found. Generating deterministic difficult benchmark PDF fixture...');
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Page 1: Intro + Table 1 (6 rows x 5 cols)
  const p1 = pdfDoc.addPage([595.28, 841.89]);
  p1.drawText('FixMyFile Quarterly Performance Report', { x: 50, y: 780, size: 18, font: fontBold });
  p1.drawText('This document provides an executive summary of enterprise operations, hardware procurement, and validation', { x: 50, y: 745, size: 11, font: fontRegular });
  p1.drawText('metrics for the fiscal year. All information has been audited for structural and regulatory compliance.', { x: 50, y: 730, size: 11, font: fontRegular });
  p1.drawText('Departmental Procurement Matrix', { x: 50, y: 695, size: 13, font: fontBold });

  const t1Cols = [50, 105, 265, 375, 475];
  const t1Headers = ['Item ID', 'Product Description', 'Category', 'Unit Price', 'In Stock'];
  let y = 665;
  t1Headers.forEach((h, i) => p1.drawText(h, { x: t1Cols[i], y, size: 10, font: fontBold }));

  const t1Data = [
    ['IT-901', 'Enterprise Server Blade', 'Hardware', '$1,450.00', '32'],
    ['IT-902', 'Secure Gateway Appliance', 'Networking', '$890.00', '15'],
    ['IT-903', 'Managed PoE Switch 48P', 'Networking', '$620.00', '48'],
    ['IT-904', 'Cloud Storage Array 10TB', 'Storage', '$2,100.00', '8'],
    ['IT-905', 'High-Density RAM 64GB', 'Components', '$185.00', '120']
  ];
  t1Data.forEach((row) => {
    y -= 22;
    row.forEach((val, i) => p1.drawText(val, { x: t1Cols[i], y, size: 10, font: fontRegular }));
  });
  p1.drawText('Hardware inventory is maintained by central logistics with weekly replenishment cycles.', { x: 50, y: y - 35, size: 10, font: fontItalic });

  // Page 2: Narrative + Table 2 (5 rows x 6 cols)
  const p2 = pdfDoc.addPage([595.28, 841.89]);
  p2.drawText('Section 2: Regional Revenue Breakdown', { x: 50, y: 780, size: 16, font: fontBold });
  p2.drawText('During the previous four quarters, regional business units demonstrated consistent revenue expansion.', { x: 50, y: 745, size: 11, font: fontRegular });
  p2.drawText('Tracking reference TXN-98421-XYZ governs the financial reconciliation process across North America,', { x: 50, y: 730, size: 11, font: fontRegular });
  p2.drawText('Europe, Asia-Pacific, and Latin America. Customer account ref CUST-4421 verified payment settlement.', { x: 50, y: 715, size: 11, font: fontRegular });

  const t2Cols = [50, 130, 205, 280, 355, 435];
  const t2Headers = ['Territory', 'Q1 Sales', 'Q2 Sales', 'Q3 Sales', 'Q4 Sales', 'Annual Total'];
  y = 665;
  t2Headers.forEach((h, i) => p2.drawText(h, { x: t2Cols[i], y, size: 10, font: fontBold }));

  const t2Data = [
    ['North America', '$420,000', '$465,000', '$490,000', '$540,000', '$1,915,000'],
    ['EMEA Region', '$310,000', '$335,000', '$350,000', '$380,000', '$1,375,000'],
    ['Asia-Pacific', '$280,000', '$310,000', '$340,000', '$390,000', '$1,320,000'],
    ['Latin America', '$115,000', '$125,000', '$140,000', '$160,000', '$540,000']
  ];
  t2Data.forEach((row) => {
    y -= 22;
    row.forEach((val, i) => p2.drawText(val, { x: t2Cols[i], y, size: 10, font: fontRegular }));
  });
  p2.drawText('Note: Revenue figures are presented in USD equivalent based on closing foreign exchange rates.', { x: 50, y: y - 35, size: 10, font: fontRegular });

  // Page 3: Form Table (8 rows x 2 cols)
  const p3 = pdfDoc.addPage([595.28, 841.89]);
  p3.drawText('Section 3: System Registration Form', { x: 50, y: 780, size: 16, font: fontBold });
  p3.drawText('Please review the registered system configuration and security profile attributes detailed below.', { x: 50, y: 745, size: 11, font: fontRegular });

  const t3Cols = [50, 240];
  const t3Data = [
    ['Form Field Name', 'Registered Configuration Value'],
    ['System Identifier', 'FMF-CLUSTER-NODE-01'],
    ['Operating Kernel', 'Enterprise Secure Linux v6.8'],
    ['Primary Administrator', 'DevOps Infrastructure Team'],
    ['Security Classification', 'Restricted Level 3'],
    ['Deployment Zone', 'US-East Production Cluster'],
    ['Backup Redundancy', 'Dual Geographic Mirroring Active'],
    ['Compliance Status', 'Passed ISO-27001 Annual Audit']
  ];
  y = 705;
  t3Data.forEach((row, rIdx) => {
    p3.drawText(row[0], { x: t3Cols[0], y, size: 10, font: rIdx === 0 ? fontBold : fontBold });
    p3.drawText(row[1], { x: t3Cols[1], y, size: 10, font: rIdx === 0 ? fontBold : fontRegular });
    y -= 24;
  });
  p3.drawText('Any modifications to this profile require authorization from the security governance board.', { x: 50, y: y - 30, size: 10, font: fontRegular });

  // Page 4: Validation Table (10 rows x 3 cols)
  const p4 = pdfDoc.addPage([595.28, 841.89]);
  p4.drawText('Section 4: Technical Validation Matrix', { x: 50, y: 780, size: 16, font: fontBold });
  p4.drawText('The test harness evaluated the following ten validation criteria against production criteria.', { x: 50, y: 745, size: 11, font: fontRegular });

  const t4Cols = [50, 140, 440];
  const t4Data = [
    ['Check ID', 'Validation Rule & Description', 'Result Status'],
    ['CHK-101', 'Schema validation and XML serialization test', 'COMPLIANT'],
    ['CHK-102', 'Binary buffer boundary memory allocation', 'COMPLIANT'],
    ['CHK-103', 'Coordinate transform calculation fidelity', 'COMPLIANT'],
    ['CHK-104', 'Multi-column clustering distance verification', 'COMPLIANT'],
    ['CHK-105', 'Spatial bounding box collision detection', 'COMPLIANT'],
    ['CHK-106', 'Page-break boundary sequence preservation', 'COMPLIANT'],
    ['CHK-107', 'Paragraph spacing continuity evaluation', 'COMPLIANT'],
    ['CHK-108', 'Inline font style weight and size parsing', 'COMPLIANT'],
    ['CHK-109', 'Unicode character encoding stream check', 'COMPLIANT']
  ];
  y = 705;
  t4Data.forEach((row, rIdx) => {
    p4.drawText(row[0], { x: t4Cols[0], y, size: 10, font: rIdx === 0 ? fontBold : fontBold });
    p4.drawText(row[1], { x: t4Cols[1], y, size: 10, font: rIdx === 0 ? fontBold : fontRegular });
    p4.drawText(row[2], { x: t4Cols[2], y, size: 10, font: rIdx === 0 ? fontBold : fontRegular });
    y -= 22;
  });
  p4.drawText('All ten validation criteria completed with zero defects and zero regressions detected.', { x: 50, y: y - 30, size: 10, font: fontRegular });

  // Page 5: Special Characters & Symbols
  const p5 = pdfDoc.addPage([595.28, 841.89]);
  p5.drawText('Section 5: Special Characters & Currency Verification', { x: 50, y: 780, size: 16, font: fontBold });
  p5.drawText('This final section verifies character set preservation and symbol rendering across document types.', { x: 50, y: 745, size: 11, font: fontRegular });
  p5.drawText('Standard Currency & Math Glyphs:', { x: 50, y: 700, size: 12, font: fontBold });
  p5.drawText('Currency denominations: $ 100.00 USD, EUR 75.50, GBP 50.25.', { x: 50, y: 675, size: 11, font: fontRegular });
  p5.drawText('Mathematical operators: Tolerance +- 0.05 mm, calculation: 10 * 5 = 50, 100 / 4 = 25.', { x: 50, y: 655, size: 11, font: fontRegular });
  p5.drawText('Inequality relations: x <= 10, y >= 20, a != b, delta ~= 0, sqrt(144) = 12.', { x: 50, y: 635, size: 11, font: fontRegular });
  p5.drawText('Directional notation: Top to bottom (down), Left to right (right).', { x: 50, y: 615, size: 11, font: fontRegular });
  p5.drawText('Legal notices: Copyright (C) 2026 FixMyFile Technologies, Registered (R).', { x: 50, y: 595, size: 11, font: fontRegular });
  p5.drawText('End of benchmark test document. All 5 sections and 4 tables are completed.', { x: 50, y: 550, size: 11, font: fontItalic });

  const bytes = await pdfDoc.save();
  fs.writeFileSync(FIXTURE_PATH, bytes);
  console.log(`Generated benchmark PDF fixture at ${FIXTURE_PATH} (${bytes.length} bytes).`);
}

async function runPdfToWordPipelineTests() {
  console.log('--- Starting FixMyFile PDF to Word V2 Pipeline Regression Tests ---');

  await ensureBenchmarkFixture();

  // 1. Valid PDF Parsing
  console.log('\n[Test 1] Valid PDF Parsing...');
  const pdfBuffer = fs.readFileSync(FIXTURE_PATH);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(pdfBuffer), disableFontFace: true });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;

  if (numPages !== 5) {
    throw new Error(`Expected 5 pages in benchmark PDF, got ${numPages}`);
  }
  console.log(`✓ Test 1 passed: PDF parsed successfully with ${numPages} pages.`);

  // 2. Conversion Pipeline Execution
  console.log('\n[Test 2] Conversion Pipeline Execution...');
  let lastProgress = 0;
  let lastMessage = '';

  const { doc, docxBlob, totalExtractedChars, detectedTables } = await convertPdfToDocx(pdfDoc, {
    title: 'Benchmark Difficult Test',
    onProgress: (pct, msg) => {
      lastProgress = pct;
      lastMessage = msg;
    }
  });

  if (!doc) throw new Error('Document object not created');
  if (!docxBlob || docxBlob.size === 0) throw new Error('DOCX blob is empty or missing');
  if (lastProgress !== 100) throw new Error(`Expected final progress 100%, got ${lastProgress}%`);
  console.log(`✓ Test 2 passed: Pipeline executed (DOCX size: ${docxBlob.size} bytes, total chars: ${totalExtractedChars}, final message: "${lastMessage}").`);

  // 3. DOCX Package Validity & Structure
  console.log('\n[Test 3] DOCX Package Validity & Structure...');
  const docxArrayBuffer = await docxBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(docxArrayBuffer);

  const hasContentTypes = !!zip.file('[Content_Types].xml');
  const hasRels = !!zip.file('_rels/.rels');
  const hasDocumentXml = !!zip.file('word/document.xml');

  if (!hasContentTypes) throw new Error('Missing [Content_Types].xml in DOCX package');
  if (!hasRels) throw new Error('Missing _rels/.rels in DOCX package');
  if (!hasDocumentXml) throw new Error('Missing word/document.xml in DOCX package');

  const documentXml = await zip.file('word/document.xml').async('string');
  console.log(`✓ Test 3 passed: Valid Office OpenXML (.docx) archive with word/document.xml (${documentXml.length} chars).`);

  // 4. Source Page Count & Page Breaks
  console.log('\n[Test 4] Source Page Count & Page-Boundary Handling...');
  // Check pageBreakBefore tags in document.xml
  const pageBreakBeforeCount = (documentXml.split('<w:pageBreakBefore/>').length - 1);
  const explicitPageBreaks = (documentXml.split('w:type="page"').length - 1);
  const totalPageBreaks = pageBreakBeforeCount + explicitPageBreaks;

  console.log(`Page break before tags: ${pageBreakBeforeCount}, explicit page breaks: ${explicitPageBreaks}, total: ${totalPageBreaks}`);
  if (totalPageBreaks < 4) {
    throw new Error(`Expected at least 4 page breaks for 5 source pages, got ${totalPageBreaks}`);
  }
  console.log('✓ Test 4 passed: Source page count preserved with clean page breaks separating pages.');

  // 5. Detected Table Validation
  console.log('\n[Test 5] Table Detection & DOCX Table Generation...');
  const tableXmlMatches = documentXml.match(/<w:tbl[\s>]/g) || [];
  console.log(`Detected tables in memory: ${detectedTables.length}, rendered <w:tbl> elements: ${tableXmlMatches.length}`);

  if (tableXmlMatches.length !== 4) {
    throw new Error(`Expected 4 tables in document.xml, got ${tableXmlMatches.length}`);
  }
  if (detectedTables.length !== 4) {
    throw new Error(`Expected 4 detected tables metadata, got ${detectedTables.length}`);
  }

  // Structural check for Table 1: 6 rows x 5 columns
  const t1 = detectedTables.find((t) => t.page === 1);
  if (!t1 || t1.rows !== 6 || t1.cols !== 5) {
    throw new Error(`Table 1 mismatch: expected 6 rows x 5 cols, got ${t1 ? `${t1.rows}x${t1.cols}` : 'none'}`);
  }

  // Structural check for Table 2: 5 rows x 6 columns
  const t2 = detectedTables.find((t) => t.page === 2);
  if (!t2 || t2.rows !== 5 || t2.cols !== 6) {
    throw new Error(`Table 2 mismatch: expected 5 rows x 6 cols, got ${t2 ? `${t2.rows}x${t2.cols}` : 'none'}`);
  }

  // Structural check for Form Table: 8 rows x 2 columns
  const t3 = detectedTables.find((t) => t.page === 3);
  if (!t3 || t3.rows !== 8 || t3.cols !== 2) {
    throw new Error(`Form Table mismatch: expected 8 rows x 2 cols, got ${t3 ? `${t3.rows}x${t3.cols}` : 'none'}`);
  }

  // Structural check for Validation Table: 10 rows x 3 columns
  const t4 = detectedTables.find((t) => t.page === 4);
  if (!t4 || t4.rows !== 10 || t4.cols !== 3) {
    throw new Error(`Validation Table mismatch: expected 10 rows x 3 cols, got ${t4 ? `${t4.rows}x${t4.cols}` : 'none'}`);
  }

  console.log('✓ Test 5 passed: All 4 tables correctly detected with exact expected dimensions:');
  console.log('  - Table 1: 6 rows × 5 cols');
  console.log('  - Table 2: 5 rows × 6 cols');
  console.log('  - Form Table: 8 rows × 2 cols');
  console.log('  - Validation Table: 10 rows × 3 cols');

  // 6. Table Cell Content Verification
  console.log('\n[Test 6] Table Cell Content Presence...');
  const requiredTableStrings = [
    'Item ID',
    'Enterprise Server Blade',
    'Hardware',
    '$1,450.00',
    'Territory',
    'North America',
    '$1,915,000',
    'Form Field Name',
    'FMF-CLUSTER-NODE-01',
    'Passed ISO-27001 Annual Audit',
    'Check ID',
    'CHK-101',
    'CHK-109',
    'COMPLIANT'
  ];
  for (const str of requiredTableStrings) {
    if (!documentXml.includes(str)) {
      throw new Error(`Missing expected table text string: "${str}"`);
    }
  }
  console.log(`✓ Test 6 passed: All ${requiredTableStrings.length} table text samples verified present.`);

  // 7. Normal Paragraphs & Identifiers Verification
  console.log('\n[Test 7] Paragraph Preservation & Important Identifiers...');
  const requiredParagraphStrings = [
    'FixMyFile Quarterly Performance Report',
    'Hardware inventory is maintained by central logistics',
    'Section 2: Regional Revenue Breakdown',
    'TXN-98421-XYZ',
    'CUST-4421',
    'Section 3: System Registration Form',
    'Section 4: Technical Validation Matrix',
    'Section 5: Special Characters'
  ];
  for (const str of requiredParagraphStrings) {
    if (!documentXml.includes(str)) {
      throw new Error(`Missing expected paragraph / identifier string: "${str}"`);
    }
  }
  console.log(`✓ Test 7 passed: Narrative paragraphs, headings, and key identifiers (TXN-98421-XYZ, CUST-4421) intact.`);

  // 8. Special Character Preservation
  console.log('\n[Test 8] Special Characters Preservation...');
  const unescapedXmlText = documentXml
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

  const requiredSpecialChars = ['$', 'EUR', 'GBP', '+-', '*', '/', '<=', '>=', '!=', '~=', 'sqrt', 'Copyright', 'Registered'];
  for (const sym of requiredSpecialChars) {
    if (!unescapedXmlText.includes(sym)) {
      throw new Error(`Missing expected symbol / character token: "${sym}"`);
    }
  }
  console.log('✓ Test 8 passed: Character tokens and symbol representations successfully preserved in Word document.');

  // 9. Scanned / Empty Document Edge Case
  console.log('\n[Test 9] Scanned / Empty Document Handling...');
  const emptyPdf = await PDFDocument.create();
  emptyPdf.addPage([595.28, 841.89]); // blank page
  const emptyPdfBytes = await emptyPdf.save();
  const emptyLoadingTask = pdfjsLib.getDocument({ data: new Uint8Array(emptyPdfBytes), disableFontFace: true });
  const emptyPdfDoc = await emptyLoadingTask.promise;

  const emptyResult = await convertPdfToDocx(emptyPdfDoc);
  if (emptyResult.totalExtractedChars !== 0) {
    throw new Error(`Expected 0 chars on blank page, got ${emptyResult.totalExtractedChars}`);
  }
  const emptyZip = await JSZip.loadAsync(await emptyResult.docxBlob.arrayBuffer());
  const emptyDocXml = await emptyZip.file('word/document.xml').async('string');
  if (!emptyDocXml.includes('No selectable text detected')) {
    throw new Error('Expected transparency notice for scanned/empty page');
  }
  console.log('✓ Test 9 passed: Handled scanned/empty document gracefully with user notice.');

  console.log('\n======================================================');
  console.log(' ALL 9 PDF TO WORD V2 REGRESSION TESTS PASSED! ');
  console.log('======================================================\n');
}

runPdfToWordPipelineTests().catch((err) => {
  console.error('\n❌ PDF TO WORD PIPELINE TEST FAILED:', err);
  process.exit(1);
});
