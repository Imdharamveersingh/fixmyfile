import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Rotate PDF Engine
 *
 * Provides genuine client-side PDF page rotation using pdf-lib.
 * Handles per-page rotations (90°, 180°, 270°), bulk rotations ("Rotate All"),
 * and canonical angle normalization avoiding floating-point drift.
 */

/**
 * Normalizes any rotation angle to canonical discrete values: 0, 90, 180, 270.
 *
 * @param {number} angle - Input rotation in degrees
 * @returns {number} 0, 90, 180, or 270
 */
export function normalizeRotation(angle) {
  if (typeof angle !== 'number' || isNaN(angle)) return 0;
  const canonical = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  return canonical;
}

/**
 * Validates PDF binary buffer.
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
 * Inspects a PDF and returns metadata including existing page count and current page rotations.
 *
 * @param {ArrayBuffer|Uint8Array} pdfBuffer
 * @returns {Promise<{ pageCount: number, rotations: number[] }>}
 */
export async function getPdfRotationMeta(pdfBuffer) {
  const bytes = validatePdfBuffer(pdfBuffer);
  let doc;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('encrypted')) {
      throw new Error('This PDF is password-protected. Please unlock it before rotating.');
    }
    throw new Error(`Unable to parse PDF document: ${err.message || 'Corrupted file'}`);
  }

  const pages = doc.getPages();
  const pageCount = pages.length;
  if (pageCount === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  const rotations = pages.map((page) => normalizeRotation(page.getRotation().angle));
  return { pageCount, rotations };
}

/**
 * Rotates pages in a PDF document and returns the newly generated PDF bytes.
 *
 * @param {ArrayBuffer|Uint8Array} pdfBuffer - Source PDF bytes
 * @param {Object} [pageRotationMap={}] - Mapping of 1-based page numbers to target rotation angles: { 1: 90, 2: 180 }
 * @param {Object} [options={}] - Extra configuration
 * @param {number} [options.globalDelta=0] - Additional rotation delta applied to all pages (e.g. +90, -90)
 * @param {string} [options.baseFilename='rotated'] - Base output filename
 * @returns {Promise<{ buffer: Uint8Array, blob: Blob, filename: string, pageCount: number, rotations: number[] }>}
 */
export async function rotatePdf(pdfBuffer, pageRotationMap = {}, options = {}) {
  const { globalDelta = 0, baseFilename = 'rotated' } = options;
  const bytes = validatePdfBuffer(pdfBuffer);

  let doc;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('encrypted')) {
      throw new Error('This PDF is password-protected. Please unlock it before rotating.');
    }
    throw new Error(`Failed to load PDF for rotation: ${err.message || 'Corrupted file'}`);
  }

  const pages = doc.getPages();
  const pageCount = pages.length;
  if (pageCount === 0) {
    throw new Error('The PDF document contains no pages.');
  }

  const finalRotations = [];

  for (let i = 0; i < pageCount; i++) {
    const pageNum = i + 1;
    const page = pages[i];
    const initialRotation = normalizeRotation(page.getRotation().angle);

    // Check if a specific target rotation or delta was provided for this page
    let targetAngle = initialRotation;
    if (pageRotationMap[pageNum] !== undefined) {
      targetAngle = pageRotationMap[pageNum];
    } else if (pageRotationMap[i] !== undefined) {
      targetAngle = pageRotationMap[i];
    }

    // Apply global delta if specified
    if (globalDelta !== 0) {
      targetAngle += globalDelta;
    }

    const canonicalAngle = normalizeRotation(targetAngle);
    page.setRotation(degrees(canonicalAngle));
    finalRotations.push(canonicalAngle);
  }

  const outputBytes = await doc.save({ useObjectStreams: true });
  const uint8Buffer = new Uint8Array(outputBytes);

  // Validate output can be reloaded
  const verifyDoc = await PDFDocument.load(uint8Buffer);
  if (verifyDoc.getPageCount() !== pageCount) {
    throw new Error('Output validation failed: page count mismatch.');
  }

  const cleanBaseName = baseFilename.replace(/\.pdf$/i, '').trim() || 'rotated-document';
  const filename = `${cleanBaseName}-rotated.pdf`;

  const blob = new Blob([uint8Buffer], { type: 'application/pdf' });

  return {
    buffer: uint8Buffer,
    blob,
    filename,
    pageCount,
    rotations: finalRotations
  };
}
