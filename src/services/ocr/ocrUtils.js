/**
 * OCR Utility Functions & Validation
 * Phase 7 — OCR / Text / Advanced File Tools
 */

export const MAX_IMAGE_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
export const MAX_PDF_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
export const MAX_PDF_PAGE_COUNT = 25; // 25 pages limit for browser OCR memory safety

/**
 * Detect image binary signature (JPEG, PNG, WebP)
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {'jpeg'|'png'|'webp'|null}
 */
export function detectImageSignature(buffer) {
  if (!buffer || buffer.byteLength < 12) return null;
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF .... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Validate input image file for general Image to Text (7.1)
 * @param {File} file
 * @returns {Promise<{ format: string, buffer: ArrayBuffer }>}
 */
export async function validateImageFile(file) {
  if (!file) throw new Error('No file selected.');
  if (file.size === 0) throw new Error('File is empty (0 bytes).');
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${formatBytes(MAX_IMAGE_FILE_SIZE)}.`);
  }

  const headerBuffer = await file.slice(0, 16).arrayBuffer();
  const format = detectImageSignature(headerBuffer);
  if (!format) {
    throw new Error('Unsupported or corrupted image file. Please provide a valid JPG, PNG, or WebP image.');
  }

  const buffer = await file.arrayBuffer();
  return { format, buffer };
}

/**
 * Validate input specifically for JPG to Text (7.3)
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export async function validateJpgFile(file) {
  if (!file) throw new Error('No file selected.');
  if (file.size === 0) throw new Error('File is empty (0 bytes).');
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${formatBytes(MAX_IMAGE_FILE_SIZE)}.`);
  }

  const headerBuffer = await file.slice(0, 16).arrayBuffer();
  const format = detectImageSignature(headerBuffer);
  if (format !== 'jpeg') {
    throw new Error('Please select a valid JPG or JPEG image. Other formats are not supported by this tool.');
  }

  return await file.arrayBuffer();
}

/**
 * Validate input specifically for PNG to Text (7.4)
 * @param {File} file
 * @returns {Promise<ArrayBuffer>}
 */
export async function validatePngFile(file) {
  if (!file) throw new Error('No file selected.');
  if (file.size === 0) throw new Error('File is empty (0 bytes).');
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error(`File exceeds maximum size of ${formatBytes(MAX_IMAGE_FILE_SIZE)}.`);
  }

  const headerBuffer = await file.slice(0, 16).arrayBuffer();
  const format = detectImageSignature(headerBuffer);
  if (format !== 'png') {
    throw new Error('Please select a valid PNG image. Other formats are not supported by this tool.');
  }

  return await file.arrayBuffer();
}

/**
 * Calculate accurate text statistics (Characters, Words, Lines)
 * @param {string} text
 * @returns {{ charCount: number, wordCount: number, lineCount: number }}
 */
export function calculateTextStats(text) {
  if (!text || typeof text !== 'string') {
    return { charCount: 0, wordCount: 0, lineCount: 0 };
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { charCount: 0, wordCount: 0, lineCount: 0 };
  }

  const charCount = text.length;
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  const lineCount = lines.length;

  return { charCount, wordCount, lineCount };
}

/**
 * Human-readable byte formatting
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Trigger browser download of text file
 * @param {string} text
 * @param {string} filename
 */
export function downloadTextAsFile(text, filename = 'extracted_text.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
