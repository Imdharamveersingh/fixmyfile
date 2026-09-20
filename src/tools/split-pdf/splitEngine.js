import { PDFDocument } from 'pdf-lib';

/**
 * Parses user range strings (e.g., "1-3, 5, 8-10") into structured ranges.
 *
 * @param {string} rangeStr - The raw comma-separated range input
 * @param {number} totalPages - Total pages in the source document
 * @returns {Array<{ label: string, start: number, end: number, pages: number[] }>}
 */
export function parsePageRanges(rangeStr, totalPages) {
  if (!rangeStr || typeof rangeStr !== 'string' || rangeStr.trim() === '') {
    throw new Error('Please enter at least one page number or range (e.g. 1-3, 5).');
  }

  if (!totalPages || totalPages < 1) {
    throw new Error('Invalid source document page count.');
  }

  const parts = rangeStr.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) {
    throw new Error('Please enter valid page numbers or ranges.');
  }

  const result = [];
  const seenRanges = new Set();

  for (const part of parts) {
    // Check for range A-B
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

      const label = `${start}-${end}`;
      if (seenRanges.has(label)) continue; // skip duplicate exact range
      seenRanges.add(label);

      const pages = [];
      for (let p = start; p <= end; p++) {
        pages.push(p);
      }

      result.push({
        label,
        start,
        end,
        pages
      });
    } else {
      // Single page N
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum)) {
        throw new Error(`Invalid non-numeric page number "${part}".`);
      }

      if (pageNum < 1) {
        throw new Error(`Page number must be at least 1. Found: ${pageNum}`);
      }

      if (pageNum > totalPages) {
        throw new Error(`Page number ${pageNum} exceeds total document pages (${totalPages}).`);
      }

      const label = `${pageNum}`;
      if (seenRanges.has(label)) continue;
      seenRanges.add(label);

      result.push({
        label,
        start: pageNum,
        end: pageNum,
        pages: [pageNum]
      });
    }
  }

  if (result.length === 0) {
    throw new Error('No valid pages found in the entered range.');
  }

  return result;
}

/**
 * Loads a PDF ArrayBuffer and returns basic metadata.
 *
 * @param {ArrayBuffer} buffer
 * @returns {Promise<{ pageCount: number, title?: string }>}
 */
export async function getPdfMetadata(buffer) {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('The selected file is empty (0 bytes).');
  }

  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    const pageCount = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle();
    return { pageCount, title };
  } catch (err) {
    if (err.name === 'EncryptedPDFError' || err.message?.includes('encrypted') || err.message?.includes('password')) {
      throw new Error('This PDF is password-protected. Please remove password protection before splitting.');
    }
    throw new Error(`Unable to read PDF: ${err.message || 'Corrupted or unsupported format.'}`);
  }
}

/**
 * Splits a PDF into multiple separate documents based on range descriptors.
 *
 * @param {ArrayBuffer} buffer
 * @param {Array<{ label: string, pages: number[] }>} ranges
 * @param {string} baseName - original file base name (without extension)
 * @returns {Promise<Array<{ filename: string, bytes: Uint8Array, blob: Blob, pageCount: number, label: string }>>}
 */
export async function splitPdfByRanges(buffer, ranges, baseName = 'document') {
  const cleanBaseName = (baseName || 'document').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'document';
  const srcDoc = await PDFDocument.load(buffer);
  const totalPages = srcDoc.getPageCount();
  const outputs = [];

  for (const range of ranges) {
    // Validate page bounds
    const invalidPage = range.pages.find((p) => p < 1 || p > totalPages);
    if (invalidPage) {
      throw new Error(`Page ${invalidPage} is out of bounds (1 to ${totalPages}).`);
    }

    const newDoc = await PDFDocument.create();
    const zeroBasedIndices = range.pages.map((p) => p - 1);
    const copiedPages = await newDoc.copyPages(srcDoc, zeroBasedIndices);
    copiedPages.forEach((page) => newDoc.addPage(page));

    const bytes = await newDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const filename = `${cleanBaseName}-pages-${range.label}.pdf`;

    outputs.push({
      filename,
      bytes,
      blob,
      pageCount: range.pages.length,
      label: range.label
    });
  }

  return outputs;
}

/**
 * Extracts all requested pages into a single combined new PDF document.
 *
 * @param {ArrayBuffer} buffer
 * @param {number[]} pages
 * @param {string} baseName
 * @returns {Promise<{ filename: string, bytes: Uint8Array, blob: Blob, pageCount: number }>}
 */
export async function extractToSinglePdf(buffer, pages, baseName = 'document') {
  if (!pages || pages.length === 0) {
    throw new Error('No pages specified for extraction.');
  }

  const cleanBaseName = (baseName || 'document').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'document';
  const srcDoc = await PDFDocument.load(buffer);
  const totalPages = srcDoc.getPageCount();

  const newDoc = await PDFDocument.create();
  const zeroBasedIndices = pages.map((p) => {
    if (p < 1 || p > totalPages) {
      throw new Error(`Page ${p} is out of bounds (1 to ${totalPages}).`);
    }
    return p - 1;
  });

  const copiedPages = await newDoc.copyPages(srcDoc, zeroBasedIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const bytes = await newDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const filename = `${cleanBaseName}-extracted.pdf`;

  return {
    filename,
    bytes,
    blob,
    pageCount: pages.length
  };
}

/**
 * Bursts a multi-page PDF into individual single-page documents.
 *
 * @param {ArrayBuffer} buffer
 * @param {string} baseName
 * @returns {Promise<Array<{ filename: string, bytes: Uint8Array, blob: Blob, pageCount: number, pageNum: number }>>}
 */
export async function burstPdf(buffer, baseName = 'document') {
  const cleanBaseName = (baseName || 'document').replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_') || 'document';
  const srcDoc = await PDFDocument.load(buffer);
  const totalPages = srcDoc.getPageCount();
  const outputs = [];

  for (let i = 0; i < totalPages; i++) {
    const pageNum = i + 1;
    const newDoc = await PDFDocument.create();
    const [copiedPage] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(copiedPage);

    const bytes = await newDoc.save();
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const filename = `${cleanBaseName}-page-${pageNum}.pdf`;

    outputs.push({
      filename,
      bytes,
      blob,
      pageCount: 1,
      pageNum
    });
  }

  return outputs;
}
