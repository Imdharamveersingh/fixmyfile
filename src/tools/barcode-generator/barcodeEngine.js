/**
 * Barcode Engine for FixMyFile (/barcode-generator)
 * 100% Client-side 1D barcode generation, vector SVG rendering,
 * Canvas PNG rasterization, format validation, and contrast safety.
 */
import JsBarcode from 'jsbarcode';

/* ── Format Definitions ─────────────────────────────────────────── */

export const BARCODE_FORMATS = [
  {
    id: 'CODE128',
    name: 'CODE 128',
    jsbFormat: 'CODE128',
    description: 'General-purpose alphanumeric barcode. Supports full ASCII.',
    hint: 'Enter any text or numbers.',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (v.length > 80) return 'Value too long (max 80 characters for CODE 128).';
      return null;
    }
  },
  {
    id: 'CODE39',
    name: 'CODE 39',
    jsbFormat: 'CODE39',
    description: 'Alphanumeric barcode used in logistics and defense.',
    hint: 'Allowed: A–Z, 0–9, - . $ / + % SPACE',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (!/^[A-Z0-9\-. $/+%]+$/i.test(v))
        return 'Invalid characters. CODE 39 allows: A–Z, 0–9, - . $ / + % and SPACE.';
      if (v.length > 43) return 'Value too long (max 43 characters for CODE 39).';
      return null;
    }
  },
  {
    id: 'EAN13',
    name: 'EAN-13',
    jsbFormat: 'EAN13',
    description: 'International article numbering for retail products.',
    hint: 'Enter 12 digits (checksum auto-calculated) or 13 digits.',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (!/^\d+$/.test(v)) return 'EAN-13 requires only digits (0–9).';
      if (v.length === 12) return null;
      if (v.length === 13) {
        if (!verifyEanChecksum(v)) return 'Invalid EAN-13 checksum. Check the last digit.';
        return null;
      }
      return 'EAN-13 requires exactly 12 digits (auto checksum) or 13 digits.';
    }
  },
  {
    id: 'EAN8',
    name: 'EAN-8',
    jsbFormat: 'EAN8',
    description: 'Compact product barcode for small packages.',
    hint: 'Enter 7 digits (checksum auto-calculated) or 8 digits.',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (!/^\d+$/.test(v)) return 'EAN-8 requires only digits (0–9).';
      if (v.length === 7) return null;
      if (v.length === 8) {
        if (!verifyEanChecksum(v)) return 'Invalid EAN-8 checksum. Check the last digit.';
        return null;
      }
      return 'EAN-8 requires exactly 7 digits (auto checksum) or 8 digits.';
    }
  },
  {
    id: 'UPC',
    name: 'UPC-A',
    jsbFormat: 'UPC',
    description: 'Universal Product Code used in North American retail.',
    hint: 'Enter 11 digits (checksum auto-calculated) or 12 digits.',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (!/^\d+$/.test(v)) return 'UPC-A requires only digits (0–9).';
      if (v.length === 11) return null;
      if (v.length === 12) {
        if (!verifyUpcChecksum(v)) return 'Invalid UPC-A checksum. Check the last digit.';
        return null;
      }
      return 'UPC-A requires exactly 11 digits (auto checksum) or 12 digits.';
    }
  },
  {
    id: 'ITF14',
    name: 'ITF-14',
    jsbFormat: 'ITF14',
    description: 'Shipping container barcode for outer packaging.',
    hint: 'Enter 13 digits (checksum auto-calculated) or 14 digits.',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (!/^\d+$/.test(v)) return 'ITF-14 requires only digits (0–9).';
      if (v.length === 13) return null;
      if (v.length === 14) {
        if (!verifyEanChecksum(v)) return 'Invalid ITF-14 checksum. Check the last digit.';
        return null;
      }
      return 'ITF-14 requires exactly 13 digits (auto checksum) or 14 digits.';
    }
  },
  {
    id: 'ITF',
    name: 'ITF (Interleaved 2 of 5)',
    jsbFormat: 'ITF',
    description: 'Numeric-only barcode used in warehouse and distribution.',
    hint: 'Enter an even number of digits.',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (!/^\d+$/.test(v)) return 'ITF requires only digits (0–9).';
      if (v.length % 2 !== 0) return 'ITF requires an even number of digits.';
      if (v.length > 30) return 'Value too long (max 30 digits for ITF).';
      return null;
    }
  },
  {
    id: 'codabar',
    name: 'Codabar',
    jsbFormat: 'codabar',
    description: 'Used in libraries, blood banks, and shipping labels.',
    hint: 'Allowed: 0–9, - $ : / . + and start/stop A–D.',
    validate: (v) => {
      if (!v) return 'Value is required.';
      if (!/^[A-Da-d][0-9\-$:/.+]+[A-Da-d]$/i.test(v))
        return 'Codabar must start and end with A, B, C, or D. Middle: 0–9, - $ : / . +';
      if (v.length > 32) return 'Value too long (max 32 characters for Codabar).';
      return null;
    }
  }
];

/* ── Checksum Helpers ────────────────────────────────────────────── */

/**
 * Verifies EAN/ITF-14 checksum (last digit)
 * Works for EAN-13 (13 digits), EAN-8 (8 digits), and ITF-14 (14 digits)
 */
export function verifyEanChecksum(digits) {
  const d = digits.split('').map(Number);
  const len = d.length;
  let sum = 0;
  for (let i = 0; i < len - 1; i++) {
    sum += d[i] * ((len - 1 - i) % 2 === 1 ? 3 : 1);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === d[len - 1];
}

/**
 * Verifies UPC-A checksum (last digit of 12 digits)
 */
export function verifyUpcChecksum(digits) {
  if (digits.length !== 12) return false;
  const d = digits.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += d[i] * (i % 2 === 0 ? 3 : 1);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === d[11];
}

/* ── Barcode Generation ──────────────────────────────────────────── */

/**
 * Generate a barcode SVG string using JsBarcode
 */
export function generateBarcodeSvg({
  value,
  format = 'CODE128',
  lineColor = '#000000',
  background = '#ffffff',
  width = 2,
  height = 100,
  margin = 10,
  displayValue = true,
  fontSize = 20,
  textPosition = 'bottom',
  textAlign = 'center',
  flat = false
}) {
  const svgNs = 'http://www.w3.org/2000/svg';
  const svgElement = document.createElementNS(svgNs, 'svg');

  try {
    JsBarcode(svgElement, value, {
      format,
      lineColor,
      background,
      width,
      height,
      margin,
      displayValue,
      fontSize,
      textPosition,
      textAlign,
      flat,
      xmlDocument: document
    });
  } catch (err) {
    throw new Error(`Barcode generation failed: ${err.message}`);
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(svgElement);
}

/**
 * Generate a barcode PNG blob from SVG via offscreen canvas
 */
export function generateBarcodePng({
  value,
  format = 'CODE128',
  lineColor = '#000000',
  background = '#ffffff',
  width = 2,
  height = 100,
  margin = 10,
  displayValue = true,
  fontSize = 20,
  textPosition = 'bottom',
  scaleFactor = 2
}) {
  return new Promise((resolve, reject) => {
    try {
      const svgString = generateBarcodeSvg({
        value, format, lineColor, background, width, height,
        margin, displayValue, fontSize, textPosition
      });

      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgEl = svgDoc.documentElement;
      const svgWidth = parseFloat(svgEl.getAttribute('width')) || 200;
      const svgHeight = parseFloat(svgEl.getAttribute('height')) || 150;

      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * scaleFactor;
      canvas.height = svgHeight * scaleFactor;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((pngBlob) => {
          if (pngBlob) resolve(pngBlob);
          else reject(new Error('PNG blob creation failed'));
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('SVG to PNG rasterization failed'));
      };

      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

/* ── Contrast / Accessibility ────────────────────────────────────── */

function sRGBtoLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

export function calculateContrast(fgHex, bgHex) {
  const l1 = luminance(fgHex);
  const l2 = luminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  const isInverted = l1 > l2;
  return { ratio: Math.round(ratio * 100) / 100, isInverted };
}

/* ── Filename ────────────────────────────────────────────────────── */

export function sanitizeFilename(value) {
  if (!value) return 'barcode';
  const cleaned = value
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40);
  return cleaned || 'barcode';
}

/* ── Format Lookup ───────────────────────────────────────────────── */

export function getFormatById(id) {
  return BARCODE_FORMATS.find((f) => f.id === id);
}
