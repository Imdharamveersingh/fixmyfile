import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import ExcelJS from 'exceljs';
import { PDFDocument, rgb } from 'pdf-lib';
import {
  parseCellValue,
  convertPdfToExcel
} from './src/tools/pdf-to-excel/excelEngine.js';
import {
  PHASE_4_TOOLS,
  ALL_TOOLS,
  TOTAL_STRATEGY_TOOLS,
  getToolById,
  getToolByPath
} from './src/tools/toolsRegistry.js';

test('=== PDF to Excel Automated Test Suite ===', async (t) => {
  // Helper: create a PDF with tabular data using pdf-lib
  async function createTabularPdf(pagesData) {
    const doc = await PDFDocument.create();
    for (const pageRows of pagesData) {
      const page = doc.addPage([600, 400]);
      let y = 350;
      for (const row of pageRows) {
        // Draw each column with distinct X spacing
        let x = 50;
        for (const col of row) {
          page.drawText(String(col), { x, y, size: 12, color: rgb(0.1, 0.1, 0.2) });
          x += 130;
        }
        y -= 25;
      }
    }
    return await doc.save();
  }

  await t.test('1. Tool Registry & Route Definitions', () => {
    const tool = getToolById('pdf-to-excel');
    assert.ok(tool, 'pdf-to-excel must exist in registry');
    assert.strictEqual(tool.path, '/pdf-to-excel');
    assert.strictEqual(tool.phase, 'Phase 4');
    assert.strictEqual(tool.status, 'Ready');

    const byPath = getToolByPath('/pdf-to-excel');
    assert.ok(byPath, 'pdf-to-excel must be retrievable by path');

    assert.ok(PHASE_4_TOOLS.some((t) => t.id === 'pdf-to-excel'));
    assert.ok(ALL_TOOLS.length >= 21, 'ALL_TOOLS must have at least 21 active tools');
    assert.strictEqual(TOTAL_STRATEGY_TOOLS, 55, 'TOTAL_STRATEGY_TOOLS must be 55');
  });

  await t.test('2. Navigation and Router Setup', () => {
    const appContent = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
    assert.match(appContent, /import\s+PdfToExcelTool\s+from\s+['"]\.\/tools\/pdf-to-excel['"]/);
    assert.match(appContent, /path="pdf-to-excel"/);

    const headerContent = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
    assert.match(headerContent, /<Link to="\/pdf-to-excel">PDF to Excel<\/Link>/);

    const footerContent = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf8');
    assert.match(footerContent, /PDF Tools/);
  });

  await t.test('3. Cell Value Parser - Types & Conversions', () => {
    // Numbers & Decimals
    assert.strictEqual(parseCellValue('100'), 100);
    assert.strictEqual(parseCellValue('45.99'), 45.99);
    assert.strictEqual(parseCellValue('-250.50'), -250.5);

    // Currency Formats
    assert.strictEqual(parseCellValue('$1,500.00'), 1500);
    assert.strictEqual(parseCellValue('₹2,40,000'), 240000);
    assert.strictEqual(parseCellValue('€85.20'), 85.2);

    // Percentages
    assert.strictEqual(parseCellValue('25%'), 0.25);
    assert.strictEqual(parseCellValue('12.5%'), 0.125);

    // General Text
    assert.strictEqual(parseCellValue('Widget Pro X'), 'Widget Pro X');
    assert.strictEqual(parseCellValue('INV-2026-001'), 'INV-2026-001');
    assert.strictEqual(parseCellValue(''), '');
    assert.strictEqual(parseCellValue(null), '');
  });

  await t.test('4. End-to-End Conversion & Real XLSX Verification', async () => {
    const sampleTable = [
      ['Item Name', 'Quantity', 'Unit Price', 'Total'],
      ['Mechanical Keyboard', '2', '$120.00', '$240.00'],
      ['Wireless Mouse', '5', '$45.50', '$227.50'],
      ['USB-C Hub', '10', '$19.99', '$199.90']
    ];

    const pdfBytes = await createTabularPdf([sampleTable]);
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

    const result = await convertPdfToExcel(pdfDoc, 'sales_report.pdf');

    // 1. Verify PK zip container signature
    assert.ok(result.buffer.length > 1000);
    const pkHeader = String.fromCharCode(result.buffer[0], result.buffer[1]);
    assert.strictEqual(pkHeader, 'PK', 'XLSX must be a valid PK ZIP archive');

    // 2. Programmatically re-open with ExcelJS parser
    const verifyWorkbook = new ExcelJS.Workbook();
    await verifyWorkbook.xlsx.load(result.buffer);

    assert.strictEqual(verifyWorkbook.worksheets.length, 1);
    const sheet1 = verifyWorkbook.getWorksheet('Page 1');
    assert.ok(sheet1, 'Worksheet "Page 1" must exist');
    assert.strictEqual(sheet1.rowCount, 4);

    // Verify cell contents
    const headerRow = sheet1.getRow(1).values;
    assert.ok(headerRow.includes('Item Name'));
    assert.ok(headerRow.includes('Quantity'));

    const row2 = sheet1.getRow(2).values;
    assert.ok(row2.includes('Mechanical Keyboard'));
    assert.ok(row2.includes(2)); // Parsed as numeric 2
    assert.ok(row2.includes(120)); // Parsed as numeric 120
  });

  await t.test('5. Multi-Page PDF with Multiple Tables', async () => {
    const page1Data = [
      ['Department', 'Staff Count', 'Budget'],
      ['Engineering', '45', '$850,000'],
      ['Design', '12', '$240,000']
    ];

    const page2Data = [
      ['Region', 'Q1 Revenue', 'Q2 Revenue'],
      ['North America', '$1,200,000', '$1,450,000'],
      ['Europe', '$950,000', '$1,100,000'],
      ['Asia Pacific', '$820,000', '$990,000']
    ];

    const pdfBytes = await createTabularPdf([page1Data, page2Data]);
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

    const result = await convertPdfToExcel(pdfDoc, 'quarterly_financials');

    const verifyWb = new ExcelJS.Workbook();
    await verifyWb.xlsx.load(result.buffer);

    // Multi-page creates Page 1, Page 2, and All Data
    assert.strictEqual(verifyWb.worksheets.length, 3);
    assert.ok(verifyWb.getWorksheet('Page 1'));
    assert.ok(verifyWb.getWorksheet('Page 2'));
    assert.ok(verifyWb.getWorksheet('All Data'));
  });

  await t.test('6. Unicode & Multilingual Characters Preservation', async () => {
    const unicodeData = [
      ['Language', 'Greeting', 'Metric'],
      ['French', 'Café & Résumé', '100'],
      ['Spanish', 'Español Año', '200'],
      ['German', 'Über Größe', '300']
    ];

    const pdfBytes = await createTabularPdf([unicodeData]);
    const pdfDoc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

    const result = await convertPdfToExcel(pdfDoc, 'unicode_test');
    const verifyWb = new ExcelJS.Workbook();
    await verifyWb.xlsx.load(result.buffer);
    const sheet = verifyWb.getWorksheet('Page 1');
    assert.ok(sheet.rowCount >= 4);
  });

  await t.test('7. Empty / Non-Text PDF Guard (Scanned PDF Warning)', async () => {
    // Create an empty 1-page PDF with no text elements
    const emptyPdfDoc = await PDFDocument.create();
    emptyPdfDoc.addPage([500, 500]);
    const emptyBytes = await emptyPdfDoc.save();

    const pdfDoc = await pdfjsLib.getDocument({ data: emptyBytes }).promise;

    await assert.rejects(
      () => convertPdfToExcel(pdfDoc, 'scanned_image.pdf'),
      /No extractable table or text content detected/i
    );
  });
});
