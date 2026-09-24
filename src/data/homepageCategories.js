import { getToolById } from '../tools/toolsRegistry.js';

/**
 * Homepage User-Facing Presentation Grouping
 * Exactly 4 canonical categories covering all 49 active tools:
 * 1. PDF Tools (18 tools)
 * 2. Image Tools (20 tools)
 * 3. Generators (7 tools)
 * 4. Media Tools (4 tools)
 * Total: 49 active tools. Zero deferred tools. Zero duplicates.
 */
export const HOMEPAGE_CATEGORIES = [
  {
    id: 'pdf-tools',
    title: 'PDF Tools',
    subtitle: 'Convert, organize, compress, protect, and extract content from PDF files.',
    toolIds: [
      'jpg-to-pdf',
      'pdf-to-word',
      'pdf-to-jpg',
      'word-to-pdf',
      'merge-pdf',
      'compress-pdf',
      'split-pdf',
      'pdf-to-excel',
      'pdf-to-powerpoint',
      'rotate-pdf',
      'protect-pdf',
      'unlock-pdf',
      'pdf-to-text',
      'extract-pdf-pages',
      'delete-pdf-pages',
      'reorder-pdf-pages',
      'pdf-ocr',
      'extract-text-from-pdf'
    ]
  },
  {
    id: 'image-tools',
    title: 'Image Tools',
    subtitle: 'Convert, compress, resize, crop, enhance, and extract content from images.',
    toolIds: [
      'background-remover',
      'image-compressor',
      'image-resizer',
      'image-converter',
      'jpg-to-png',
      'png-to-jpg',
      'heic-to-jpg',
      'webp-to-jpg',
      'jpg-to-webp',
      'webp-to-png',
      'image-rotate-flip',
      'image-watermark',
      'image-to-pdf',
      'image-upscaler',
      'image-to-base64',
      'image-cropper',
      'image-to-text',
      'jpg-to-text',
      'png-to-text',
      'screenshot-to-text'
    ]
  },
  {
    id: 'generators',
    title: 'Generators',
    subtitle: 'Create QR codes, barcodes, passwords, calculations, and other useful utilities.',
    toolIds: [
      'qr-code-generator',
      'barcode-generator',
      'currency-converter',
      'percentage-calculator',
      'password-generator',
      'word-counter',
      'emi-calculator'
    ]
  },
  {
    id: 'media-tools',
    title: 'Media Tools',
    subtitle: 'Convert and optimize common audio, video, and animated media files.',
    toolIds: [
      'mp4-to-mp3',
      'video-compressor',
      'video-to-gif',
      'gif-maker'
    ]
  }
];

export function getHomepageCategoryTools(categoryId) {
  const cat = HOMEPAGE_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return [];
  return cat.toolIds.map((id) => getToolById(id)).filter(Boolean);
}

export function getAllHomepageTools() {
  return HOMEPAGE_CATEGORIES.flatMap((cat) =>
    cat.toolIds.map((id) => getToolById(id)).filter(Boolean)
  );
}
