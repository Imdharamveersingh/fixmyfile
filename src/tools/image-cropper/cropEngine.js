/**
 * Image Cropper Engine for FixMyFile
 * Pure client-side image cropping, aspect ratio calculation, coordinate clamping, and canvas export.
 */

export const ASPECT_RATIOS = [
  { id: 'free', label: 'Freeform', ratio: null, icon: 'crop_free' },
  { id: '1:1', label: '1:1 Square', ratio: 1 / 1, icon: 'crop_square' },
  { id: '4:5', label: '4:5 Social', ratio: 4 / 5, icon: 'crop_portrait' },
  { id: '16:9', label: '16:9 Widescreen', ratio: 16 / 9, icon: 'crop_16_9' },
  { id: '9:16', label: '9:16 Story', ratio: 9 / 16, icon: 'crop_portrait' },
  { id: '3:2', label: '3:2 Classic', ratio: 3 / 2, icon: 'crop_landscape' },
  { id: '2:3', label: '2:3 Portrait', ratio: 2 / 3, icon: 'crop_portrait' },
  { id: '4:3', label: '4:3 Standard', ratio: 4 / 3, icon: 'crop_landscape' },
  { id: '3:4', label: '3:4 Portrait', ratio: 3 / 4, icon: 'crop_portrait' }
];

export const SUPPORTED_OUTPUT_FORMATS = [
  { id: 'auto', label: 'Same as original', mime: null },
  { id: 'png', label: 'PNG (Lossless, Transparent)', mime: 'image/png', ext: 'png' },
  { id: 'jpeg', label: 'JPG / JPEG', mime: 'image/jpeg', ext: 'jpg' },
  { id: 'webp', label: 'WebP (Modern)', mime: 'image/webp', ext: 'webp' }
];

/**
 * Validates whether the supplied file is a valid image.
 */
export function validateImageFile(file) {
  if (!file) {
    throw new Error('No image file selected.');
  }

  if (file.size === 0) {
    throw new Error('Selected file is empty (0 bytes).');
  }

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.svg'];
  const fileName = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  const hasValidExt = validExtensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime = fileType.startsWith('image/');

  if (!hasValidExt && !hasValidMime) {
    throw new Error('Unsupported format. Please select a valid image (JPG, PNG, WebP, GIF, BMP, or SVG).');
  }

  const MAX_BYTES = 50 * 1024 * 1024; // 50MB
  if (file.size > MAX_BYTES) {
    throw new Error('File exceeds the 50MB limit. Please select a smaller image.');
  }

  return true;
}

/**
 * Normalizes and clamps crop coordinates within natural image boundaries.
 */
export function clampCropCoordinates(crop, naturalWidth, naturalHeight, minDimension = 10) {
  if (!naturalWidth || naturalWidth <= 0 || !naturalHeight || naturalHeight <= 0) {
    throw new Error('Invalid natural image dimensions.');
  }

  let x = Math.round(crop.x || 0);
  let y = Math.round(crop.y || 0);
  let width = Math.round(crop.width || naturalWidth);
  let height = Math.round(crop.height || naturalHeight);

  // Guarantee minimum dimension
  width = Math.max(minDimension, Math.min(width, naturalWidth));
  height = Math.max(minDimension, Math.min(height, naturalHeight));

  // Clamp within image bounds
  x = Math.max(0, Math.min(x, naturalWidth - width));
  y = Math.max(0, Math.min(y, naturalHeight - height));

  return { x, y, width, height };
}

/**
 * Computes an initial centered crop box given an aspect ratio and image bounds.
 */
export function calculateInitialCrop(naturalWidth, naturalHeight, aspectRatioId = 'free') {
  if (!naturalWidth || naturalWidth <= 0 || !naturalHeight || naturalHeight <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const preset = ASPECT_RATIOS.find((p) => p.id === aspectRatioId) || ASPECT_RATIOS[0];

  if (!preset.ratio || preset.id === 'free') {
    // 90% centered box
    const width = Math.round(naturalWidth * 0.9);
    const height = Math.round(naturalHeight * 0.9);
    const x = Math.round((naturalWidth - width) / 2);
    const y = Math.round((naturalHeight - height) / 2);
    return { x, y, width, height };
  }

  const targetRatio = preset.ratio;
  const imageRatio = naturalWidth / naturalHeight;

  let width, height;
  if (imageRatio > targetRatio) {
    // Image is wider than desired ratio -> fit height
    height = Math.round(naturalHeight * 0.9);
    width = Math.round(height * targetRatio);
  } else {
    // Image is taller than desired ratio -> fit width
    width = Math.round(naturalWidth * 0.9);
    height = Math.round(width / targetRatio);
  }

  // Ensure within bounds
  width = Math.min(width, naturalWidth);
  height = Math.min(height, naturalHeight);

  const x = Math.round((naturalWidth - width) / 2);
  const y = Math.round((naturalHeight - height) / 2);

  return { x, y, width, height };
}

/**
 * Adjusts crop dimensions to maintain a fixed aspect ratio when resizing.
 */
export function enforceAspectRatio(width, height, targetRatio, lockDimension = 'width') {
  if (!targetRatio || targetRatio <= 0) {
    return { width, height };
  }

  if (lockDimension === 'width') {
    return {
      width,
      height: Math.max(1, Math.round(width / targetRatio))
    };
  }

  return {
    width: Math.max(1, Math.round(height * targetRatio)),
    height
  };
}

/**
 * Generates download filename for cropped image.
 */
export function getCroppedDownloadName(originalName, outputExt = 'png') {
  if (!originalName) return `cropped-image.${outputExt}`;
  const lastDot = originalName.lastIndexOf('.');
  const base = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase = base.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-cropped.${outputExt}`;
}

/**
 * Determines target mime type and extension from user choice and original file.
 */
export function resolveOutputFormat(userFormatChoice, originalMime, originalName) {
  const nameLower = (originalName || '').toLowerCase();
  const isOriginalPng = originalMime === 'image/png' || nameLower.endsWith('.png');
  const isOriginalWebp = originalMime === 'image/webp' || nameLower.endsWith('.webp');

  if (userFormatChoice === 'png') {
    return { mime: 'image/png', ext: 'png', isTransparent: true };
  }
  if (userFormatChoice === 'jpeg') {
    return { mime: 'image/jpeg', ext: 'jpg', isTransparent: false };
  }
  if (userFormatChoice === 'webp') {
    return { mime: 'image/webp', ext: 'webp', isTransparent: true };
  }

  // Auto mode
  if (isOriginalPng) {
    return { mime: 'image/png', ext: 'png', isTransparent: true };
  }
  if (isOriginalWebp) {
    return { mime: 'image/webp', ext: 'webp', isTransparent: true };
  }
  return { mime: 'image/jpeg', ext: 'jpg', isTransparent: false };
}

/**
 * Performs actual canvas cropping and returns a Blob.
 * Executes in a browser context.
 */
export async function executeCropOnCanvas(imageElement, crop, options = {}) {
  const {
    format = 'auto',
    quality = 0.92,
    rotation = 0,
    flipHorizontal = false,
    flipVertical = false,
    originalMime = 'image/jpeg',
    originalName = 'image.jpg'
  } = options;

  const naturalWidth = imageElement.naturalWidth || imageElement.width;
  const naturalHeight = imageElement.naturalHeight || imageElement.height;

  if (!naturalWidth || !naturalHeight) {
    throw new Error('Cannot read natural dimensions from image element.');
  }

  const clampedCrop = clampCropCoordinates(crop, naturalWidth, naturalHeight);
  const resolvedFormat = resolveOutputFormat(format, originalMime, originalName);

  // Normalize rotation angle to 0, 90, 180, 270
  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const isQuarterTurn = normalizedRotation === 90 || normalizedRotation === 270;

  // Destination canvas dimensions
  const destWidth = isQuarterTurn ? clampedCrop.height : clampedCrop.width;
  const destHeight = isQuarterTurn ? clampedCrop.width : clampedCrop.height;

  // Create high-precision canvas
  const canvas = document.createElement('canvas');
  canvas.width = destWidth;
  canvas.height = destHeight;

  const ctx = canvas.getContext('2d', { alpha: resolvedFormat.isTransparent });
  if (!ctx) {
    throw new Error('Failed to obtain 2D rendering context for cropping.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill white matte only for non-transparent JPEG
  if (!resolvedFormat.isTransparent) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, destWidth, destHeight);
  }

  ctx.save();

  // Move origin to center of destination canvas
  ctx.translate(destWidth / 2, destHeight / 2);

  // Apply rotation
  if (normalizedRotation !== 0) {
    ctx.rotate((normalizedRotation * Math.PI) / 180);
  }

  // Apply flip
  const scaleX = flipHorizontal ? -1 : 1;
  const scaleY = flipVertical ? -1 : 1;
  if (scaleX !== 1 || scaleY !== 1) {
    ctx.scale(scaleX, scaleY);
  }

  // Draw source image slice onto canvas centered
  ctx.drawImage(
    imageElement,
    clampedCrop.x,
    clampedCrop.y,
    clampedCrop.width,
    clampedCrop.height,
    -clampedCrop.width / 2,
    -clampedCrop.height / 2,
    clampedCrop.width,
    clampedCrop.height
  );

  ctx.restore();

  // Export to Blob
  const blobQuality = Math.max(0.05, Math.min(1.0, quality));
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob failed to produce an image Blob.'));
      },
      resolvedFormat.mime,
      resolvedFormat.mime === 'image/png' ? undefined : blobQuality
    );
  });

  return {
    blob,
    width: destWidth,
    height: destHeight,
    format: resolvedFormat.ext,
    mime: resolvedFormat.mime,
    size: blob.size,
    crop: clampedCrop
  };
}
