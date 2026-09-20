/**
 * QR Code Engine for FixMyFile (/qr-code-generator)
 * 100% Client-side QR generation, vector SVG rendering, Canvas rasterization,
 * color contrast safety analysis, and content formatters.
 */
import qrcode from 'qrcode-generator';

/**
 * Escapes special characters for Wi-Fi QR strings (WPA/WEP standard)
 * Characters '\', ';', ',', '"', and ':' must be backslash-escaped.
 */
export function escapeWifiString(str) {
  if (!str) return '';
  return str.replace(/([\\;,":])/g, '\\$1');
}

/**
 * Formats structured inputs into standard QR payload strings
 */
export function formatQrPayload({
  contentType = 'text',
  text = '',
  url = '',
  email = '',
  emailSubject = '',
  emailBody = '',
  phone = '',
  wifiSsid = '',
  wifiPassword = '',
  wifiAuth = 'WPA',
  wifiHidden = false
}) {
  switch (contentType) {
    case 'url': {
      const trimmed = (url || '').trim();
      if (!trimmed) return '';
      // If no protocol specified and doesn't start with //, default to https://
      if (!/^https?:\/\//i.test(trimmed) && !/^[a-z0-9+.-]+:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    }
    case 'email': {
      const trimmedEmail = (email || '').trim();
      if (!trimmedEmail) return '';
      const params = [];
      if (emailSubject) params.push(`subject=${encodeURIComponent(emailSubject)}`);
      if (emailBody) params.push(`body=${encodeURIComponent(emailBody)}`);
      return `mailto:${trimmedEmail}${params.length ? '?' + params.join('&') : ''}`;
    }
    case 'phone': {
      const trimmedPhone = (phone || '').trim();
      if (!trimmedPhone) return '';
      return `tel:${trimmedPhone}`;
    }
    case 'wifi': {
      const trimmedSsid = (wifiSsid || '').trim();
      if (!trimmedSsid) return '';
      const auth = wifiAuth || 'WPA';
      const escapedSsid = escapeWifiString(trimmedSsid);
      const escapedPass = auth === 'nopass' ? '' : escapeWifiString(wifiPassword || '');
      const hiddenFlag = wifiHidden ? 'true' : 'false';
      return `WIFI:T:${auth};S:${escapedSsid};P:${escapedPass};H:${hiddenFlag};;`;
    }
    case 'text':
    default:
      return text || '';
  }
}

/**
 * Generates raw QR matrix using qrcode-generator
 * @param {string} data - Content to encode
 * @param {'L'|'M'|'Q'|'H'} errorCorrection - Error correction level
 * @returns {{ count: number, isDark: (r: number, c: number) => boolean }}
 */
export function generateQrMatrix(data, errorCorrection = 'M') {
  if (!data || typeof data !== 'string') {
    throw new Error('QR code content cannot be empty.');
  }

  // qrcode(typeNumber, errorCorrectionLevel)
  // typeNumber = 0 means auto-detect minimum QR version (1 to 40)
  const qr = qrcode(0, errorCorrection || 'M');
  qr.addData(data);
  qr.make();

  const count = qr.getModuleCount();
  return {
    count,
    isDark: (r, c) => qr.isDark(r, c)
  };
}

/**
 * Calculates WCAG 2.1 relative luminance and contrast ratio between two hex colors.
 */
export function calculateContrast(fgHex = '#000000', bgHex = '#ffffff') {
  function hexToRgb(hex) {
    const clean = hex.replace(/^#/, '');
    const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function getLuminance({ r, g, b }) {
    const a = [r, g, b].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
  }

  try {
    const l1 = getLuminance(hexToRgb(fgHex));
    const l2 = getLuminance(hexToRgb(bgHex));
    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (brighter + 0.05) / (darker + 0.05);

    return {
      ratio: Math.round(ratio * 100) / 100,
      isSafe: ratio >= 3.0,
      isRecommended: ratio >= 4.5,
      isDarkOnLight: l1 < l2
    };
  } catch {
    return {
      ratio: 21.0,
      isSafe: true,
      isRecommended: true,
      isDarkOnLight: true
    };
  }
}

/**
 * Generates genuine, vector SVG string for QR Code with user-selected appearance options.
 */
export function generateQrSvgString({
  matrix,
  fgColor = '#000000',
  bgColor = '#ffffff',
  margin = 4,
  moduleStyle = 'square', // 'square' | 'rounded' | 'dots' | 'classy'
  eyeStyle = 'square',    // 'square' | 'rounded' | 'dot'
  renderSize = 320
}) {
  if (!matrix || !matrix.count) {
    return '';
  }

  const count = matrix.count;
  const safeMargin = Math.max(1, Math.min(10, margin));
  const totalModules = count + safeMargin * 2;
  const cellSize = 10; // internal coordinate unit
  const viewSize = totalModules * cellSize;

  // Helper to identify the 3 standard 7x7 finder patterns (eyes)
  function isEyeZone(r, c) {
    if (r < 7 && c < 7) return true; // Top-left
    if (r < 7 && c >= count - 7) return true; // Top-right
    if (r >= count - 7 && c < 7) return true; // Bottom-left
    return false;
  }

  let moduleElements = '';

  // Render individual data modules
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (!matrix.isDark(r, c) || isEyeZone(r, c)) continue;

      const x = (c + safeMargin) * cellSize;
      const y = (r + safeMargin) * cellSize;

      if (moduleStyle === 'dots') {
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const radius = cellSize * 0.52; // Overlapping circular modules ensure 100% binarization
        moduleElements += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${radius.toFixed(1)}" fill="${fgColor}"/>`;
      } else if (moduleStyle === 'rounded') {
        const rx = (cellSize * 0.3).toFixed(1);
        moduleElements += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${rx}" fill="${fgColor}"/>`;
      } else if (moduleStyle === 'classy') {
        // Diagonal rounded corners for smooth aesthetic
        const rx = (cellSize * 0.4).toFixed(1);
        const isAlternate = (r + c) % 2 === 0;
        if (isAlternate) {
          moduleElements += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="${rx}" fill="${fgColor}"/>`;
        } else {
          moduleElements += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`;
        }
      } else {
        // Standard square module
        moduleElements += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" fill="${fgColor}"/>`;
      }
    }
  }

  // Render 3 standard finder patterns (eyes)
  const eyeCoords = [
    [0, 0],              // Top-left
    [0, count - 7],      // Top-right
    [count - 7, 0]       // Bottom-left
  ];

  let eyeElements = '';
  for (const [er, ec] of eyeCoords) {
    const x = (ec + safeMargin) * cellSize;
    const y = (er + safeMargin) * cellSize;
    const outerSize = 7 * cellSize;
    const midSize = 5 * cellSize;
    const innerSize = 3 * cellSize;
    const midOffset = 1 * cellSize;
    const innerOffset = 2 * cellSize;

    let outerRx = 0;
    let midRx = 0;
    let innerRx = 0;

    if (eyeStyle === 'rounded') {
      outerRx = cellSize * 1.5;
      midRx = cellSize * 1.0;
      innerRx = cellSize * 0.8;
    } else if (eyeStyle === 'dot') {
      outerRx = outerSize / 2;
      midRx = midSize / 2;
      innerRx = innerSize / 2;
    }

    // Outer 7x7 dark frame
    eyeElements += `<rect x="${x}" y="${y}" width="${outerSize}" height="${outerSize}" rx="${outerRx}" fill="${fgColor}"/>`;
    // Middle 5x5 background cutout
    eyeElements += `<rect x="${x + midOffset}" y="${y + midOffset}" width="${midSize}" height="${midSize}" rx="${midRx}" fill="${bgColor}"/>`;
    // Center 3x3 solid dark dot
    eyeElements += `<rect x="${x + innerOffset}" y="${y + innerOffset}" width="${innerSize}" height="${innerSize}" rx="${innerRx}" fill="${fgColor}"/>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" width="${renderSize}" height="${renderSize}">` +
    `<rect width="100%" height="100%" fill="${bgColor}"/>` +
    moduleElements +
    eyeElements +
    `</svg>`;

  return svg;
}

/**
 * Converts SVG string into high-resolution PNG Blob using Canvas 2D
 */
export async function svgToPngBlob(svgString, targetWidth = 512, targetHeight = 512) {
  if (typeof document === 'undefined') {
    throw new Error('Rasterization requires browser environment.');
  }

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas 2D context not available.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        URL.revokeObjectURL(url);

        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            resolve(pngBlob);
          } else {
            reject(new Error('Canvas PNG encoding failed.'));
          }
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG for PNG rasterization.'));
    };
    img.src = url;
  });
}

/**
 * Sanitizes base filename for downloaded files
 */
export function sanitizeFilename(name, defaultName = 'qr-code') {
  if (!name || typeof name !== 'string') return defaultName;
  const clean = name
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return clean || defaultName;
}
