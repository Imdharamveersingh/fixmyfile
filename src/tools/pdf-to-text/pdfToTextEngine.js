/**
 * PDF to Text Extraction Engine
 *
 * Extracts selectable text page-by-page from PDF documents client-side using PDF.js.
 * Preserves readable reading order via spatial line grouping, distinguishes paragraphs,
 * separates pages with clear delimiters, and gracefully detects scanned/image-only documents.
 */

/**
 * Validates a PDF binary buffer.
 *
 * @param {ArrayBuffer|Uint8Array} pdfBuffer
 * @returns {Uint8Array}
 */
export function validatePdfBuffer(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.byteLength === 0) {
    throw new Error('The selected file is empty. Please select a valid PDF file.');
  }

  const bytes = new Uint8Array(pdfBuffer);
  if (bytes.length < 5) {
    throw new Error('The file is too small to be a valid PDF document.');
  }

  const header = new TextDecoder('ascii').decode(bytes.subarray(0, 5));
  if (!header.startsWith('%PDF-')) {
    throw new Error('Invalid file format. The file is not a valid PDF document (missing %PDF- header).');
  }

  return bytes;
}

/**
 * Formats raw text items from a PDF.js page into readable paragraphs and lines.
 *
 * @param {Array} items - Raw items from page.getTextContent()
 * @returns {string} - Clean, formatted page text
 */
export function formatPageText(items) {
  if (!items || items.length === 0) {
    return '';
  }

  const validItems = items
    .filter((it) => it.str && typeof it.str === 'string' && it.str.length > 0)
    .map((it) => {
      const tx = it.transform ? it.transform[4] : 0;
      const ty = it.transform ? it.transform[5] : 0;
      const fontSize = it.height || (it.transform ? Math.abs(it.transform[0]) : 12) || 12;
      return {
        str: it.str,
        x: tx,
        y: ty,
        width: it.width || 0,
        height: fontSize
      };
    });

  if (validItems.length === 0) {
    return '';
  }

  // Sort primarily by Y descending (top to bottom), secondarily by X ascending (left to right)
  validItems.sort((a, b) => b.y - a.y || a.x - b.x);

  // Group items into visual lines within vertical tolerance (4 points)
  const lines = [];
  for (const item of validItems) {
    let line = lines.find((l) => Math.abs(l.y - item.y) <= 4);
    if (!line) {
      line = { y: item.y, items: [] };
      lines.push(line);
    }
    line.items.push(item);
  }

  // Sort lines from top to bottom
  lines.sort((a, b) => b.y - a.y);

  // Sort items within each line left to right
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  let pageText = '';
  let lastY = null;

  for (const line of lines) {
    const lineString = line.items
      .map((i) => i.str.trim())
      .filter(Boolean)
      .join(' ');

    if (!lineString) continue;

    if (lastY !== null) {
      const lineGap = lastY - line.y;
      // If line gap is significantly larger than typical line height (e.g. > 20pt), treat as paragraph break
      if (lineGap > 22) {
        pageText += '\n\n';
      } else {
        pageText += '\n';
      }
    }

    pageText += lineString;
    lastY = line.y;
  }

  return pageText.trim();
}

/**
 * Extracts selectable text from a PDF document.
 *
 * @param {ArrayBuffer|Uint8Array} pdfBuffer - Binary bytes of the PDF
 * @param {Object} [options={}]
 * @param {Object} [options.pdfjsLib] - PDF.js instance
 * @param {string} [options.baseFilename='document'] - Base name for output text file
 * @param {Function} [options.onProgress] - Callback for progress reporting
 * @returns {Promise<Object>} - Extraction results
 */
export async function extractTextFromPdf(pdfBuffer, options = {}) {
  const {
    pdfjsLib = null,
    baseFilename = 'document',
    onProgress = null
  } = options;

  const bytes = validatePdfBuffer(pdfBuffer);

  let pdfLib = pdfjsLib;
  if (!pdfLib) {
    try {
      pdfLib = await import('pdfjs-dist');
    } catch {
      // Fallback for Node testing environments
      pdfLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    }
  }

  onProgress?.({ current: 0, total: 1, percent: 5, message: 'Opening PDF document...' });

  let pdf;
  try {
    const loadingTask = pdfLib.getDocument({
      data: bytes.slice(0),
      isEvalSupported: false,
      useSystemFonts: true,
      stopAtErrors: false
    });
    pdf = await loadingTask.promise;
  } catch (err) {
    if (err.name === 'PasswordException' || (err.message && err.message.toLowerCase().includes('password'))) {
      throw new Error('This PDF is password-protected. Please unlock the document first using the Unlock PDF tool.');
    }
    throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupted or unsupported format'}`);
  }

  const numPages = pdf.numPages;
  if (numPages === 0) {
    throw new Error('The PDF document contains zero pages.');
  }

  const pageResults = [];
  let totalCharacters = 0;
  let totalWords = 0;
  let scannedPages = 0;

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const percent = Math.min(95, Math.round(10 + ((pageNum / numPages) * 85)));
    onProgress?.({
      current: pageNum,
      total: numPages,
      percent,
      message: `Extracting text from page ${pageNum} of ${numPages}...`
    });

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const formattedText = formatPageText(textContent.items || []);

    const charCount = formattedText.length;
    const words = formattedText ? formattedText.split(/\s+/).filter(Boolean).length : 0;

    if (charCount === 0) {
      scannedPages++;
    }

    totalCharacters += charCount;
    totalWords += words;

    pageResults.push({
      pageNum,
      text: formattedText,
      charCount,
      hasText: charCount > 0
    });
  }

  onProgress?.({ current: numPages, total: numPages, percent: 100, message: 'Text extraction complete!' });

  const hasSelectableText = totalCharacters > 0;

  // Build the unified structured document text with page boundaries
  let fullText = '';
  if (hasSelectableText) {
    fullText = pageResults
      .map((p) => {
        const header = numPages > 1 ? `--- Page ${p.pageNum} ---\n\n` : '';
        const body = p.hasText ? p.text : '[No selectable text found on this page]';
        return `${header}${body}`;
      })
      .join('\n\n\n');
  }

  const cleanBase = baseFilename.replace(/\.pdf$/i, '').trim() || 'document';
  const filename = `${cleanBase}-text.txt`;

  return {
    fullText,
    pages: pageResults,
    totalCharacters,
    totalWords,
    totalPages: numPages,
    hasSelectableText,
    scannedPageCount: scannedPages,
    filename
  };
}

/**
 * Creates a downloadable UTF-8 text Blob from string content.
 *
 * @param {string} textContent
 * @returns {Blob}
 */
export function createTxtBlob(textContent) {
  return new Blob([textContent], { type: 'text/plain;charset=utf-8' });
}
