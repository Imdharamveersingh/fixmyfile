/**
 * HEIC to JPG Engine for FixMyFile
 * Genuine client-side HEIC/HEIF conversion using on-demand lazy-loaded libheif/heic2any.
 */

let cachedHeic2any = null;

/**
 * Checks if the buffer contains a standard HEIC/HEIF ISO BMFF ftyp box.
 */
export function isHeicSignature(buffer) {
  if (!buffer || buffer.byteLength < 12) return false;
  const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer.buffer || buffer);
  if (bytes.length < 12) return false;

  // Check 'ftyp' at offset 4..7
  const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  if (ftyp !== 'ftyp') return false;

  // Check major brand at offset 8..11
  const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
  const validBrands = ['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1', 'avif'];
  return validBrands.includes(brand);
}

/**
 * Validates a HEIC or HEIF file before processing.
 */
export function validateHeicFile(file) {
  if (!file) {
    throw new Error('No HEIC/HEIF file selected.');
  }

  if (file.size === 0) {
    throw new Error('Selected file is empty (0 bytes).');
  }

  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();

  const isHeicExt = name.endsWith('.heic') || name.endsWith('.heif');
  const isHeicMime =
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/heic-sequence' ||
    type === 'image/heif-sequence';

  // Windows and some browsers report generic application/octet-stream or empty string for .heic
  if (!isHeicExt && !isHeicMime) {
    throw new Error('Invalid format. Please upload a valid .heic or .heif image.');
  }

  const MAX_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_SIZE) {
    throw new Error('File exceeds 100MB limit. Please select a smaller HEIC image.');
  }

  return true;
}

/**
 * Lazy loads the HEIC decoding engine dynamically to prevent increasing initial bundle size.
 */
export async function loadHeicDecoder(onProgress) {
  if (cachedHeic2any) {
    return { decoder: cachedHeic2any, loadTime: 0 };
  }

  const start = performance.now();
  if (onProgress) onProgress('Loading HEIC converter...');

  const mod = await import('heic2any');
  cachedHeic2any = mod.default || mod;

  const loadTime = Math.round(performance.now() - start);
  return { decoder: cachedHeic2any, loadTime };
}

/**
 * Formats a clean download name with .jpg extension.
 */
export function getHeicConvertedName(originalName) {
  if (!originalName) return 'converted.jpg';
  const lastDot = originalName.lastIndexOf('.');
  const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-converted.jpg`;
}

/**
 * Converts a HEIC/HEIF File or Blob to a JPG Blob.
 */
export async function convertHeicToJpg(fileOrBlob, options = {}, onProgress) {
  const totalStart = performance.now();
  const quality = options.quality !== undefined ? options.quality : 0.9;

  validateHeicFile(fileOrBlob);

  // 1. Lazy load decoder
  const { decoder, loadTime } = await loadHeicDecoder(onProgress);

  // 2. Decode and convert
  if (onProgress) onProgress('Decoding HEIC image and converting to JPG...');
  const decodeStart = performance.now();

  const convertedBlob = await decoder({
    blob: fileOrBlob,
    toType: 'image/jpeg',
    quality: Math.max(0.1, Math.min(1.0, quality))
  });

  const decodeTime = Math.round(performance.now() - decodeStart);
  const totalTime = Math.round(performance.now() - totalStart);

  // Handle single blob or array returned for container files
  const outputBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

  if (!outputBlob || outputBlob.size === 0) {
    throw new Error('HEIC conversion produced an empty result.');
  }

  return {
    blob: outputBlob,
    size: outputBlob.size,
    loadTime,
    decodeTime,
    totalTime,
    downloadName: getHeicConvertedName(fileOrBlob.name)
  };
}
