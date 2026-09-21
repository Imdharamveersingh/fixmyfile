/**
 * PDF OCR Searchable Layer Engine
 * Phase 7.2 — PDF OCR
 *
 * Renders scanned/flat PDF pages to high-resolution canvas using pdfjs-dist,
 * recognizes text and word coordinates via Tesseract OCR, and embeds an
 * invisible, searchable text layer directly onto the original PDF pages using pdf-lib.
 */

import { PDFDocument, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { runOcr } from './ocrEngine.js';

export { pdfjsLib };

// Ensure PDF.js worker is properly configured
if (typeof window !== 'undefined' && pdfjsLib && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker-TGcf_-kp.mjs';
}

/**
 * Validates a PDF file or buffer
 * @param {File|Blob|ArrayBuffer} fileOrBuffer
 * @returns {Promise<ArrayBuffer>}
 */
export async function validatePdfInput(fileOrBuffer) {
  let buffer;
  if (fileOrBuffer instanceof ArrayBuffer) {
    buffer = fileOrBuffer;
  } else if (fileOrBuffer instanceof Uint8Array) {
    buffer = fileOrBuffer.buffer;
  } else if (fileOrBuffer && typeof fileOrBuffer.arrayBuffer === 'function') {
    buffer = await fileOrBuffer.arrayBuffer();
  } else {
    throw new Error('Invalid PDF input source.');
  }

  if (buffer.byteLength === 0) {
    throw new Error('The selected PDF file is empty (0 bytes).');
  }

  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder('ascii').decode(bytes.subarray(0, 5));
  if (!header.startsWith('%PDF-')) {
    throw new Error('Invalid file format. The file is not a valid PDF document (missing %PDF- header).');
  }

  return buffer;
}

/**
 * Generate a searchable PDF from a flat/scanned PDF by OCRing each page
 * and injecting an invisible text layer with exact bounding boxes.
 *
 * @param {ArrayBuffer} pdfBuffer
 * @param {Object} [options={}]
 * @param {Function} [options.onProgress] - ({ current, total, percent, status }) => void
 * @param {number} [options.scale=1.5] - Rendering scale for OCR clarity
 * @returns {Promise<{
 *   searchableBlob: Blob,
 *   totalPages: number,
 *   totalWords: number,
 *   recognizedPages: number
 * }>}
 */
export async function processPdfOcr(pdfBuffer, options = {}) {
  const { onProgress = null, scale = 1.5 } = options;

  const buffer = await validatePdfInput(pdfBuffer);

  // 1. Load PDF with PDF.js for rendering
  let pdfJsDoc;
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: buffer.slice(0),
      isEvalSupported: false,
      useSystemFonts: true
    });
    pdfJsDoc = await loadingTask.promise;
  } catch (err) {
    if (err.name === 'PasswordException' || (err.message && err.message.toLowerCase().includes('password'))) {
      throw new Error('This PDF is password-protected. Please unlock it first using the Unlock PDF tool.');
    }
    throw new Error(`Failed to load PDF for OCR: ${err.message || 'Corrupted file'}`);
  }

  const totalPages = pdfJsDoc.numPages;
  if (totalPages === 0) {
    throw new Error('The PDF document contains zero pages.');
  }

  // 2. Load PDF with pdf-lib to modify pages
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pdfPages = pdfDoc.getPages();

  let totalWords = 0;
  let recognizedPages = 0;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const overallPercent = Math.round(((pageNum - 1) / totalPages) * 100);
    onProgress?.({
      current: pageNum,
      total: totalPages,
      percent: overallPercent,
      status: `Rendering page ${pageNum} of ${totalPages}...`
    });

    // Render page to canvas
    const jsPage = await pdfJsDoc.getPage(pageNum);
    const viewport = jsPage.getViewport({ scale });
    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    await jsPage.render({ canvasContext: ctx, viewport }).promise;

    onProgress?.({
      current: pageNum,
      total: totalPages,
      percent: Math.min(99, overallPercent + Math.round(50 / totalPages)),
      status: `Running OCR on page ${pageNum} of ${totalPages}...`
    });

    // Run OCR on this page
    const ocrResult = await runOcr(canvas, {
      preprocess: true,
      preprocessOptions: { enhanceContrast: true, grayscale: true }
    });

    const words = ocrResult.words || [];
    if (words.length > 0) {
      recognizedPages++;
      totalWords += words.length;

      // Inject invisible text layer onto pdf-lib page
      const pdfPage = pdfPages[pageNum - 1];
      const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();

      for (const word of words) {
        if (!word.text || !word.text.trim()) continue;
        const rawText = word.text.trim();
        const box = word.bbox;
        if (!box) continue;

        // Map canvas coordinates to PDF point coordinates
        const wordX = (box.x0 / width) * pdfWidth;
        const wordBottom = (box.y1 / height) * pdfHeight;
        const wordTop = (box.y0 / height) * pdfHeight;
        const wordHeight = Math.max(6, Math.min(72, wordBottom - wordTop));
        const pdfY = Math.max(0, pdfHeight - wordBottom);

        // Sanitize characters for standard Helvetica
        const safeText = rawText.replace(/[^\x20-\x7E]/g, '');
        if (safeText.length === 0) continue;

        try {
          pdfPage.drawText(safeText, {
            x: Math.max(0, Math.min(pdfWidth - 10, wordX)),
            y: Math.max(0, Math.min(pdfHeight - 10, pdfY)),
            size: wordHeight,
            font: helveticaFont,
            opacity: 0 // Invisible layer enables Ctrl+F and selection
          });
        } catch {
          // Continue if any glyph fails
        }
      }
    }
  }

  onProgress?.({
    current: totalPages,
    total: totalPages,
    percent: 100,
    status: 'Finalizing searchable PDF...'
  });

  const searchableBytes = await pdfDoc.save();
  const searchableBlob = new Blob([searchableBytes], { type: 'application/pdf' });

  return {
    searchableBlob,
    totalPages,
    totalWords,
    recognizedPages
  };
}
