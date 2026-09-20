import ExcelJS from 'exceljs';

/**
 * PDF to Excel (XLSX) Conversion Engine
 *
 * Extracts tabular and structured data from PDF pages using spatial coordinates
 * and generates a genuine OpenXML (.xlsx) spreadsheet workbook.
 */

/**
 * Parses a cell value into number or date if applicable, else returns clean string.
 */
export function parseCellValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str === '') return '';

  // Clean currency symbols or commas for numeric testing
  const cleaned = str.replace(/^[$\u20AC\u00A3\u20B9]\s*/, '').replace(/,/g, '');

  // Check if it's a valid integer or float
  if (/^-?\d+(\.\d+)?$/.test(cleaned)) {
    const num = parseFloat(cleaned);
    if (!isNaN(num) && isFinite(num)) {
      return num;
    }
  }

  // Check percentage e.g. "15.5%"
  if (/^-?\d+(\.\d+)?%$/.test(cleaned)) {
    const num = parseFloat(cleaned.replace('%', ''));
    if (!isNaN(num) && isFinite(num)) {
      return num / 100;
    }
  }

  return str;
}

/**
 * Extracts lines and columns from a single PDF.js page using spatial coordinates.
 */
export async function extractPageGrid(page) {
  const textContent = await page.getTextContent();
  const rawItems = textContent.items || [];

  // Filter non-empty items and capture coordinates
  const items = rawItems
    .filter((it) => it.str !== undefined && it.str.trim().length > 0)
    .map((it) => {
      const tx = it.transform ? it.transform[4] : 0;
      const ty = it.transform ? it.transform[5] : 0;
      const scaleX = it.transform ? it.transform[0] : 1;
      const fontSize = Math.hypot(scaleX, it.transform ? it.transform[1] : 0) || it.height || 11;

      return {
        str: it.str,
        x: tx,
        y: ty,
        width: it.width,
        right: tx + it.width,
        height: it.height || fontSize,
        fontSize
      };
    });

  if (items.length === 0) {
    return [];
  }

  // Group items into horizontal lines (Y-axis tolerance ~3px)
  items.sort((a, b) => b.y - a.y || a.x - b.x);

  const lines = [];
  let currentLine = null;

  for (const item of items) {
    if (!currentLine) {
      currentLine = { y: item.y, items: [item] };
    } else {
      const vDiff = Math.abs(currentLine.y - item.y);
      if (vDiff <= 3.5) {
        currentLine.items.push(item);
      } else {
        currentLine.items.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
        currentLine = { y: item.y, items: [item] };
      }
    }
  }
  if (currentLine) {
    currentLine.items.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  // Segment items into columns within each line
  // If horizontal distance between items exceeds wordSpaceLimit, treat as separate column
  const tableRows = [];

  for (const line of lines) {
    const segments = [];
    let curSeg = null;

    for (const item of line.items) {
      if (!curSeg) {
        curSeg = { text: item.str, x: item.x, right: item.right, fontSize: item.fontSize };
      } else {
        const gap = item.x - curSeg.right;
        // Natural column separation gap
        const colGapThreshold = Math.max(14, item.fontSize * 1.1);

        if (gap < colGapThreshold) {
          // Merge as part of same cell
          if (gap > 0.5 && !curSeg.text.endsWith(' ') && !item.str.startsWith(' ')) {
            curSeg.text += ' ';
          }
          curSeg.text += item.str;
          curSeg.right = Math.max(curSeg.right, item.right);
        } else {
          // New column
          segments.push(curSeg.text.trim());
          curSeg = { text: item.str, x: item.x, right: item.right, fontSize: item.fontSize };
        }
      }
    }
    if (curSeg && curSeg.text.trim()) {
      segments.push(curSeg.text.trim());
    }

    if (segments.length > 0) {
      tableRows.push(segments);
    }
  }

  return tableRows;
}

/**
 * Converts a PDF ArrayBuffer into an Excel XLSX ArrayBuffer.
 *
 * @param {object} pdfDoc - PDF.js document instance
 * @param {string} baseName - original filename
 * @param {function} onProgress - optional progress callback (0-100, status)
 * @returns {Promise<{ buffer: Uint8Array, blob: Blob, filename: string, sheetCount: number, totalRows: number }>}
 */
export async function convertPdfToExcel(pdfDoc, baseName = 'document', onProgress = () => {}) {
  const numPages = pdfDoc.numPages;
  if (!numPages || numPages < 1) {
    throw new Error('Invalid or empty PDF document.');
  }

  onProgress(10, 'Analyzing PDF pages and table structure...');
  const pagesData = [];
  let totalExtractedRows = 0;

  for (let p = 1; p <= numPages; p++) {
    const pct = Math.round(10 + (p / numPages) * 50);
    onProgress(pct, `Reading page ${p} of ${numPages}...`);

    const page = await pdfDoc.getPage(p);
    const rows = await extractPageGrid(page);

    if (rows && rows.length > 0) {
      pagesData.push({ pageNum: p, rows });
      totalExtractedRows += rows.length;
    }
  }

  if (totalExtractedRows === 0) {
    throw new Error(
      'No extractable table or text content detected in this PDF. If this document is a scanned image or photo, OCR is required before converting to spreadsheet.'
    );
  }

  onProgress(65, 'Building OpenXML (.xlsx) workbook...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'FixMyFile';
  workbook.created = new Date();

  const cleanBaseName = (baseName || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_') || 'document';

  let sheetCount = 0;

  // Add individual worksheets per page
  for (const pageData of pagesData) {
    sheetCount++;
    const sheetName = `Page ${pageData.pageNum}`;
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true }]
    });

    const maxCols = Math.max(...pageData.rows.map((r) => r.length), 1);
    const colMaxLens = new Array(maxCols).fill(10);

    pageData.rows.forEach((row, rowIdx) => {
      const parsedRow = row.map((cell, cIdx) => {
        const val = parseCellValue(cell);
        const strLen = String(val).length;
        if (strLen > colMaxLens[cIdx]) {
          colMaxLens[cIdx] = Math.min(strLen + 2, 45);
        }
        return val;
      });

      const excelRow = worksheet.addRow(parsedRow);

      // If first row looks like a header, style it
      if (rowIdx === 0 && pageData.rows.length > 1) {
        excelRow.font = { bold: true, color: { argb: 'FF0F172A' } };
        excelRow.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF1F5F9' }
        };
        excelRow.alignment = { vertical: 'middle' };
      }
    });

    // Apply auto column widths
    worksheet.columns = colMaxLens.map((w) => ({ width: Math.max(w, 12) }));
  }

  // If multi-page, add a consolidated sheet with all rows
  if (pagesData.length > 1) {
    const combinedSheet = workbook.addWorksheet('All Data', {
      views: [{ showGridLines: true }]
    });
    sheetCount++;

    let isHeaderWritten = false;
    let maxColsAll = 1;

    for (const pageData of pagesData) {
      pageData.rows.forEach((row, rIdx) => {
        if (rIdx === 0 && isHeaderWritten) return; // avoid repeating header
        const parsed = row.map(parseCellValue);
        maxColsAll = Math.max(maxColsAll, parsed.length);
        const excelRow = combinedSheet.addRow(parsed);
        if (!isHeaderWritten) {
          excelRow.font = { bold: true };
          excelRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE2E8F0' }
          };
          isHeaderWritten = true;
        }
      });
    }
  }

  onProgress(90, 'Generating binary Excel spreadsheet...');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const filename = `${cleanBaseName}.xlsx`;
  onProgress(100, 'Excel workbook generated successfully!');

  return {
    buffer: new Uint8Array(buffer),
    blob,
    filename,
    sheetCount,
    totalRows: totalExtractedRows
  };
}
