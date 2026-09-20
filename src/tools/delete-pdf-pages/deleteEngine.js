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
 * Parses user input for pages to delete and computes remaining pages.
 *
 * @param {string|number[]} input - Range string or array of pages to delete
 * @param {number} totalPages - Total pages in the source document
 * @returns {{ pagesToDelete: number[], remainingPages: number[] }}
 */
export function parsePagesToDelete(input, totalPages) {
  if (!totalPages || totalPages < 1) {
    throw new Error('Invalid document page count.');
  }

  const deleteSet = new Set();

  if (Array.isArray(input)) {
    for (const item of input) {
      const p = parseInt(item, 10);
      if (isNaN(p)) throw new Error(`Invalid non-numeric page number: "${item}"`);
      if (p < 1) throw new Error(`Page numbers must start from 1. Found: ${p}`);
      if (p > totalPages) throw new Error(`Page ${p} exceeds total document pages (${totalPages}).`);
      deleteSet.add(p);
    }
  } else if (typeof input === 'string') {
    if (input.trim() === '') {
      throw new Error('Please enter at least one page number or range to delete.');
    }

    const parts = input.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length === 0) {
      throw new Error('Please enter at least one valid page number or range to delete.');
    }

    for (const part of parts) {
      if (part.includes('-')) {
        const sides = part.split('-').map((s) => s.trim());
        if (sides.length !== 2) {
          throw new Error(`Invalid range format "${part}". Use format like "1-3".`);
        }

        const start = parseInt(sides[0], 10);
        const end = parseInt(sides[1], 10);

        if (isNaN(start) || isNaN(end)) {
          throw new Error(`Invalid non-numeric page range "${part}".`);
        }

        if (start < 1) {
          throw new Error(`Page numbers must start from 1. Found: ${start}`);
        }

        if (start > totalPages) {
          throw new Error(`Start page ${start} exceeds total document pages (${totalPages}).`);
        }

        if (end > totalPages) {
          throw new Error(`End page ${end} exceeds total document pages (${totalPages}).`);
        }

        if (start > end) {
          throw new Error(`Invalid range "${part}": start page (${start}) cannot be greater than end page (${end}).`);
        }

        for (let p = start; p <= end; p++) {
          deleteSet.add(p);
        }
      } else {
        const pageNum = parseInt(part, 10);
        if (isNaN(pageNum)) {
          throw new Error(`Invalid non-numeric page number "${part}".`);
        }

        if (pageNum < 1) {
          throw new Error(`Page numbers must start from 1. Found: ${pageNum}`);
        }

        if (pageNum > totalPages) {
          throw new Error(`Page ${pageNum} exceeds total document pages (${totalPages}).`);
        }

        deleteSet.add(pageNum);
      }
    }
  } else {
    throw new Error('Invalid pages input format.');
  }

  if (deleteSet.size === 0) {
    throw new Error('Please select at least one page to delete.');
  }

  if (deleteSet.size >= totalPages) {
    throw new Error('At least one page must remain in the PDF. You cannot delete all pages.');
  }

  const pagesToDelete = Array.from(deleteSet).sort((a, b) => a - b);
  const remainingPages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (!deleteSet.has(p)) {
      remainingPages.push(p);
    }
  }

  return {
    pagesToDelete,
    remainingPages
  };
}

/**
 * Removes specified pages from a PDF document and compiles remaining pages.
 *
 * @param {ArrayBuffer|Uint8Array} buffer - Source PDF binary data
 * @param {number[]|string} pagesToDeleteInput - 1-based page numbers or range string to delete
 * @param {Object} [options={}]
 * @param {string} [options.baseFilename='document']
 * @param {Function} [options.onProgress]
 * @returns {Promise<{ bytes: Uint8Array, blob: Blob, pageCount: number, originalCount: number, deletedCount: number, filename: string, remainingPages: number[], deletedPages: number[] }>}
 */
export async function deletePdfPages(buffer, pagesToDeleteInput, options = {}) {
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

  onProgress?.({ percent: 30, message: 'Calculating pages to remove...' });
  const { pagesToDelete, remainingPages } = parsePagesToDelete(pagesToDeleteInput, totalPages);

  if (remainingPages.length === 0) {
    throw new Error('At least one page must remain in the PDF. You cannot delete all pages.');
  }

  onProgress?.({ percent: 55, message: `Reconstructing document (${remainingPages.length} pages remaining)...` });
  const newDoc = await PDFDocument.create();

  // Copy remaining pages in order
  const zeroBasedIndices = remainingPages.map((p) => p - 1);
  const copiedPages = await newDoc.copyPages(srcDoc, zeroBasedIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  onProgress?.({ percent: 85, message: 'Saving updated PDF document...' });
  const outputBytes = await newDoc.save();
  const blob = new Blob([outputBytes], { type: 'application/pdf' });

  const cleanBase = (baseFilename || 'document').replace(/\.pdf$/i, '').trim() || 'document';
  const filename = `${cleanBase}-modified.pdf`;

  onProgress?.({ percent: 100, message: 'Deletion complete!' });

  return {
    bytes: outputBytes,
    blob,
    pageCount: remainingPages.length,
    originalCount: totalPages,
    deletedCount: pagesToDelete.length,
    filename,
    remainingPages,
    deletedPages: pagesToDelete
  };
}
