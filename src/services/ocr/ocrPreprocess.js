/**
 * OCR Image Preprocessing Pipeline
 * Enhances contrast, converts to grayscale, and sharpens text for improved OCR accuracy.
 */

/**
 * Preprocess image for OCR recognition
 * @param {HTMLImageElement|HTMLCanvasElement|Blob|File} source
 * @param {Object} options
 * @param {boolean} [options.grayscale=true]
 * @param {boolean} [options.enhanceContrast=true]
 * @param {boolean} [options.binarize=false]
 * @param {number} [options.scale=1]
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function preprocessImageForOcr(source, options = {}) {
  const {
    grayscale = true,
    enhanceContrast = true,
    binarize = false,
    scale = 1
  } = options;

  let imgElement;
  let shouldRevoke = false;

  if (source instanceof HTMLCanvasElement) {
    imgElement = source;
  } else if (source instanceof HTMLImageElement) {
    imgElement = source;
  } else {
    // Blob or File
    const url = URL.createObjectURL(source);
    shouldRevoke = true;
    imgElement = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image for preprocessing'));
      img.src = url;
    });
  }

  try {
    const width = Math.round(imgElement.width * scale);
    const height = Math.round(imgElement.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Draw scaled image
    ctx.drawImage(imgElement, 0, 0, width, height);

    if (!grayscale && !enhanceContrast && !binarize) {
      return canvas;
    }

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const len = data.length;

    // First pass: grayscale & compute min/max luminance for contrast stretching
    let minLum = 255;
    let maxLum = 0;

    for (let i = 0; i < len; i += 4) {
      // Rec. 709 luma coefficients
      const lum = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;

      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
    }

    // Second pass: contrast enhancement (histogram normalization/stretching)
    if (enhanceContrast && maxLum > minLum) {
      const range = maxLum - minLum;
      for (let i = 0; i < len; i += 4) {
        let lum = ((data[i] - minLum) / range) * 255;
        // Apply slight sigmoid curve for midtone contrast
        lum = 255 / (1 + Math.exp(-((lum - 128) / 32)));
        data[i] = lum;
        data[i + 1] = lum;
        data[i + 2] = lum;
      }
    }

    // Third pass: optional binarization (Otsu-like threshold)
    if (binarize) {
      const threshold = 140;
      for (let i = 0; i < len; i += 4) {
        const val = data[i] > threshold ? 255 : 0;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  } finally {
    if (shouldRevoke && imgElement.src) {
      URL.revokeObjectURL(imgElement.src);
    }
  }
}
