import { PDFDocument } from 'pdf-lib';

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
 * Loads a PDF buffer and inspects total pages and basic metadata.
 *
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {Promise<{ pageCount: number, title?: string }>}
 */
export async function getPdfMetadata(buffer) {
  const bytes = validatePdfBuffer(buffer);

  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
    const pageCount = doc.getPageCount();
    const title = doc.getTitle();
    return { pageCount, title };
  } catch (err) {
    if (err.name === 'EncryptedPDFError' || err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('encrypt')) {
      throw new Error('This PDF is password-protected. Please unlock the document first using the Unlock PDF tool.');
    }
    throw new Error(`Failed to parse PDF: ${err.message || 'Corrupted or unsupported document format.'}`);
  }
}

/**
 * Validates that an array or string of page numbers represents an exact, complete permutation of all document pages.
 *
 * @param {number[]|string} inputOrder
 * @param {number} totalPages
 * @returns {number[]} - Array of 1-based page numbers in validated order
 */
export function validatePageOrder(inputOrder, totalPages) {
  if (!totalPages || totalPages < 1) {
    throw new Error('Invalid document page count.');
  }

  let orderArr = [];
  if (Array.isArray(inputOrder)) {
    orderArr = inputOrder.map((n) => parseInt(n, 10));
  } else if (typeof inputOrder === 'string') {
    if (inputOrder.trim() === '') {
      throw new Error('Page order cannot be empty.');
    }
    orderArr = inputOrder
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => parseInt(s, 10));
  } else {
    throw new Error('Invalid page order format.');
  }

  if (orderArr.some(isNaN)) {
    throw new Error('Page order contains non-numeric values.');
  }

  if (orderArr.length !== totalPages) {
    throw new Error(`Page order count (${orderArr.length}) does not match document page count (${totalPages}). All pages must be included.`);
  }

  const seen = new Set();
  for (const pageNum of orderArr) {
    if (pageNum < 1 || pageNum > totalPages) {
      throw new Error(`Page number ${pageNum} is out of bounds (1 to ${totalPages}).`);
    }
    if (seen.has(pageNum)) {
      throw new Error(`Duplicate page number ${pageNum} detected. Each page must appear exactly once.`);
    }
    seen.add(pageNum);
  }

  for (let p = 1; p <= totalPages; p++) {
    if (!seen.has(p)) {
      throw new Error(`Missing page ${p} in requested order. All pages must be preserved.`);
    }
  }

  return orderArr;
}

/**
 * Reorders pages in a PDF document based on specified sequence.
 *
 * @param {ArrayBuffer|Uint8Array} buffer - Source PDF data
 * @param {number[]|string} pageOrderInput - Validated 1-based page sequence
 * @param {Object} [options={}]
 * @param {string} [options.baseFilename='document']
 * @param {Function} [options.onProgress]
 * @returns {Promise<{ bytes: Uint8Array, blob: Blob, pageCount: number, filename: string, pageOrder: number[] }>}
 */
export async function reorderPdfPages(buffer, pageOrderInput, options = {}) {
  const { baseFilename = 'document', onProgress = null } = options;
  const bytes = validatePdfBuffer(buffer);

  onProgress?.({ percent: 15, message: 'Opening PDF document...' });

  let srcDoc;
  let totalPages;
  try {
    srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: false });
    totalPages = srcDoc.getPageCount();
  } catch (err) {
    if (err.name === 'EncryptedPDFError' || err.message?.toLowerCase().includes('password') || err.message?.toLowerCase().includes('encrypt')) {
      throw new Error('This PDF is password-protected. Please unlock the document first using the Unlock PDF tool.');
    }
    throw new Error(`Unable to load PDF: ${err.message || 'Corrupted or unsupported format.'}`);
  }

  if (totalPages === 0) {
    throw new Error('The PDF document contains 0 pages.');
  }

  onProgress?.({ percent: 35, message: 'Validating requested page order...' });
  const validatedOrder = validatePageOrder(pageOrderInput, totalPages);

  onProgress?.({ percent: 60, message: `Reordering ${totalPages} pages...` });
  const newDoc = await PDFDocument.create();

  // Convert to 0-based indices in the requested sequence
  const zeroBasedIndices = validatedOrder.map((p) => p - 1);
  const copiedPages = await newDoc.copyPages(srcDoc, zeroBasedIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  onProgress?.({ percent: 85, message: 'Compiling reordered document...' });
  const outputBytes = await newDoc.save();
  const blob = new Blob([outputBytes], { type: 'application/pdf' });

  const cleanBase = (baseFilename || 'document').replace(/\.pdf$/i, '').trim() || 'document';
  const filename = `${cleanBase}-reordered.pdf`;

  onProgress?.({ percent: 100, message: 'Reordering complete!' });

  return {
    bytes: outputBytes,
    blob,
    pageCount: totalPages,
    filename,
    pageOrder: validatedOrder
  };
}
