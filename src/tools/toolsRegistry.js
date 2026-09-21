/**
 * Central registry for utility tools on the platform.
 * Phase 1 contains 6 core PDF tools.
 */
export const PHASE_1_TOOLS = [
  {
    id: 'jpg-to-pdf',
    name: 'JPG to PDF',
    path: '/jpg-to-pdf',
    category: 'PDF Conversion',
    description: 'Convert JPG and JPEG images into clean, formatted PDF documents.',
    status: 'Ready',
    phase: 'Phase 1'
  },
  {
    id: 'pdf-to-word',
    name: 'PDF to Word',
    path: '/pdf-to-word',
    category: 'PDF Conversion',
    description: 'Convert PDF documents into editable Microsoft Word DOCX files.',
    status: 'Ready',
    phase: 'Phase 1'
  },
  {
    id: 'pdf-to-jpg',
    name: 'PDF to JPG',
    path: '/pdf-to-jpg',
    category: 'PDF Conversion',
    description: 'Extract pages from PDF files and save them as high-quality JPG images.',
    status: 'Ready',
    phase: 'Phase 1'
  },
  {
    id: 'word-to-pdf',
    name: 'Word to PDF',
    path: '/word-to-pdf',
    category: 'PDF Conversion',
    description: 'Convert DOC and DOCX documents directly into standardized PDF files.',
    status: 'Ready',
    phase: 'Phase 1'
  },
  {
    id: 'merge-pdf',
    name: 'Merge PDF',
    path: '/merge-pdf',
    category: 'PDF Organization',
    description: 'Combine multiple PDF documents into a single organized file in your desired order.',
    status: 'Ready',
    phase: 'Phase 1'
  },
  {
    id: 'compress-pdf',
    name: 'Compress PDF',
    path: '/compress-pdf',
    category: 'PDF Optimization',
    description: 'Reduce PDF file size while preserving optimal text and visual quality.',
    status: 'Ready',
    phase: 'Phase 1'
  }
];

export const PHASE_2_TOOLS = [
  {
    id: 'background-remover',
    name: 'Background Remover',
    path: '/background-remover',
    category: 'Image Editing',
    description: 'Remove image backgrounds automatically with client-side AI and transparent PNG export.',
    status: 'Ready',
    phase: 'Phase 2'
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    path: '/image-compressor',
    category: 'Image Optimization',
    description: 'Compress JPG and PNG images online with fine-tuned quality controls while preserving dimensions and transparency.',
    status: 'Ready',
    phase: 'Phase 2'
  },
  {
    id: 'image-resizer',
    name: 'Image Resizer',
    path: '/image-resizer',
    category: 'Image Editing',
    description: 'Resize JPG and PNG images online with aspect ratio lock, custom dimensions, and popular social presets.',
    status: 'Ready',
    phase: 'Phase 2'
  },
  {
    id: 'image-converter',
    name: 'Image Converter',
    path: '/image-converter',
    category: 'Image Conversion',
    description: 'Convert images between JPG, PNG, and WEBP formats client-side with dimension preservation and transparency controls.',
    status: 'Ready',
    phase: 'Phase 2'
  },
  {
    id: 'jpg-to-png',
    name: 'JPG to PNG',
    path: '/jpg-to-png',
    category: 'Image Conversion',
    description: 'Convert JPG and JPEG images to PNG format online for free with 1:1 dimension preservation.',
    status: 'Ready',
    phase: 'Phase 2'
  },
  {
    id: 'png-to-jpg',
    name: 'PNG to JPG',
    path: '/png-to-jpg',
    category: 'Image Conversion',
    description: 'Convert PNG images to JPG format online with customizable background colors for transparent areas and adjustable quality.',
    status: 'Ready',
    phase: 'Phase 2'
  }
];

export const PHASE_3_TOOLS = [
  {
    id: 'qr-code-generator',
    name: 'QR Code Generator',
    path: '/qr-code-generator',
    category: 'Generators',
    description: 'Create customizable, high-resolution QR codes for text, URLs, email, phone, and Wi-Fi networks with vector SVG and PNG downloads.',
    status: 'Ready',
    phase: 'Phase 3'
  },
  {
    id: 'barcode-generator',
    name: 'Barcode Generator',
    path: '/barcode-generator',
    category: 'Generators',
    description: 'Create real, machine-readable 1D barcodes with CODE 128, CODE 39, EAN-13, EAN-8, UPC-A, ITF-14, ITF, and Codabar. Download as PNG or SVG.',
    status: 'Ready',
    phase: 'Phase 3'
  },
  {
    id: 'currency-converter',
    name: 'Currency Converter',
    path: '/currency-converter',
    category: 'Calculators',
    description: 'Real-time and reference currency conversion across major world currencies with smart offline fallback.',
    status: 'Ready',
    phase: 'Phase 3'
  },
  {
    id: 'percentage-calculator',
    name: 'Percentage Calculator',
    path: '/percentage-calculator',
    category: 'Calculators',
    description: 'Calculate percentages, increases, decreases, additions, and subtractions instantly with full formulas.',
    status: 'Ready',
    phase: 'Phase 3'
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    path: '/password-generator',
    category: 'Generators',
    description: 'Generate cryptographically strong, customizable random passwords locally with instant entropy strength checking.',
    status: 'Ready',
    phase: 'Phase 3'
  },
  {
    id: 'word-counter',
    name: 'Word Counter',
    path: '/word-counter',
    category: 'Text Utilities',
    description: 'Count words, characters, sentences, paragraphs, reading time, and speaking time with full Unicode support.',
    status: 'Ready',
    phase: 'Phase 3'
  },
  {
    id: 'emi-calculator',
    name: 'EMI Calculator',
    path: '/emi-calculator',
    category: 'Calculators',
    description: 'Calculate monthly EMI, total interest, and loan repayment breakdown instantly with yearly and monthly tenure support.',
    status: 'Ready',
    phase: 'Phase 3'
  }
];

export const PHASE_4_TOOLS = [
  {
    id: 'split-pdf',
    name: 'Split PDF',
    path: '/split-pdf',
    category: 'PDF Organization',
    description: 'Extract pages, split by custom ranges, or burst PDF documents into separate files client-side.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'pdf-to-excel',
    name: 'PDF to Excel',
    path: '/pdf-to-excel',
    category: 'PDF Conversion',
    description: 'Extract tables and structured data from PDF documents into editable Microsoft Excel (.xlsx) spreadsheets.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'pdf-to-powerpoint',
    name: 'PDF to PowerPoint',
    path: '/pdf-to-powerpoint',
    category: 'PDF Conversion',
    description: 'Convert PDF documents into genuine Microsoft PowerPoint (.pptx) presentation slides client-side.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'rotate-pdf',
    name: 'Rotate PDF',
    path: '/rotate-pdf',
    category: 'PDF Organization',
    description: 'Rotate individual or all PDF pages clockwise and counter-clockwise with lossless output.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'protect-pdf',
    name: 'Protect PDF',
    path: '/protect-pdf',
    category: 'PDF Security',
    description: 'Protect PDF documents with password encryption using genuine AES-256 standard encryption client-side.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'unlock-pdf',
    name: 'Unlock PDF',
    path: '/unlock-pdf',
    category: 'PDF Security',
    description: 'Remove password protection and permissions security from PDF documents client-side.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'pdf-to-text',
    name: 'PDF to Text',
    path: '/pdf-to-text',
    category: 'PDF Conversion',
    description: 'Extract selectable text from PDF documents into clean, formatted .txt files client-side.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'extract-pdf-pages',
    name: 'Extract PDF Pages',
    path: '/extract-pdf-pages',
    category: 'PDF Organization',
    description: 'Select and extract specific pages or custom ranges from PDF documents into a new lightweight PDF.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'delete-pdf-pages',
    name: 'Delete PDF Pages',
    path: '/delete-pdf-pages',
    category: 'PDF Organization',
    description: 'Remove unwanted pages or page ranges from PDF documents while preserving remaining page integrity.',
    status: 'Ready',
    phase: 'Phase 4'
  },
  {
    id: 'reorder-pdf-pages',
    name: 'Reorder PDF Pages',
    path: '/reorder-pdf-pages',
    category: 'PDF Organization',
    description: 'Rearrange and resequence PDF page order interactively with 100% layout and quality preservation.',
    status: 'Ready',
    phase: 'Phase 4'
  }
];

export const PHASE_5_TOOLS = [
  {
    id: 'image-cropper',
    name: 'Image Cropper',
    path: '/image-cropper',
    category: 'Image Editing',
    description: 'Crop JPG, PNG, WebP, and common images client-side with custom aspect ratios, rotation, and high-precision export.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'heic-to-jpg',
    name: 'HEIC to JPG',
    path: '/heic-to-jpg',
    category: 'Image Conversion',
    description: 'Convert Apple iPhone HEIC and HEIF photos to standard JPG format client-side with zero cloud uploads.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'webp-to-jpg',
    name: 'WebP to JPG',
    path: '/webp-to-jpg',
    category: 'Image Conversion',
    description: 'Convert Google WebP images to universal JPEG format client-side with background fill and quality control.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'jpg-to-webp',
    name: 'JPG to WebP',
    path: '/jpg-to-webp',
    category: 'Image Conversion',
    description: 'Convert JPEG images to modern WebP format for up to 35% smaller file sizes with lossy or lossless modes.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'webp-to-png',
    name: 'WebP to PNG',
    path: '/webp-to-png',
    category: 'Image Conversion',
    description: 'Convert WebP images to lossless PNG format client-side with full transparency and dimension preservation.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'image-rotate-flip',
    name: 'Image Rotate & Flip',
    path: '/image-rotate-flip',
    category: 'Image Editing',
    description: 'Rotate images 90°, 180°, 270° and mirror horizontally or vertically with instant live canvas preview.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'image-watermark',
    name: 'Image Watermark',
    path: '/image-watermark',
    category: 'Image Editing',
    description: 'Apply customizable text and image watermarks with opacity, positioning presets, and diagonal tiling.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'image-to-pdf',
    name: 'Image to PDF',
    path: '/image-to-pdf',
    category: 'Image Conversion',
    description: 'Convert JPG, PNG, WebP, GIF, and SVG images into a combined formatted PDF document with custom margins and page sizes.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'image-upscaler',
    name: 'Image Upscaler',
    path: '/image-upscaler',
    category: 'Image Editing',
    description: 'Enlarge images 2x and 4x with progressive bicubic resampling and optional edge acuity enhancement in your browser.',
    status: 'Ready',
    phase: 'Phase 5'
  },
  {
    id: 'image-to-base64',
    name: 'Image to Base64',
    path: '/image-to-base64',
    category: 'Image Utilities',
    description: 'Encode image binaries directly into standard Base64 Data URIs, HTML image tags, and CSS background snippets.',
    status: 'Ready',
    phase: 'Phase 5'
  }
];

export const PHASE_6_TOOLS = [
  {
    id: 'mp4-to-mp3',
    name: 'MP4 to MP3',
    path: '/mp4-to-mp3',
    category: 'Audio Extraction',
    description: 'Extract audio track from MP4 video containers into MP3 audio streams.',
    status: 'Ready',
    phase: 'Phase 6'
  },
  {
    id: 'video-compressor',
    name: 'Video Compressor',
    path: '/video-compressor',
    category: 'Video Optimization',
    description: 'Reduce video bitrate and/or dimensions for messaging and email sharing.',
    status: 'Ready',
    phase: 'Phase 6'
  },
  {
    id: 'video-to-gif',
    name: 'Video to GIF',
    path: '/video-to-gif',
    category: 'Video Conversion',
    description: 'Render animated GIF loops from short video clips with framerate controls.',
    status: 'Ready',
    phase: 'Phase 6'
  },
  {
    id: 'gif-maker',
    name: 'GIF Maker',
    path: '/gif-maker',
    category: 'Video Conversion',
    description: 'Assemble multiple JPG, PNG, or WebP images into a genuine animated GIF with custom framerate and resolution controls.',
    status: 'Ready',
    phase: 'Phase 6'
  }
];

export const ALL_TOOLS = [
  ...PHASE_1_TOOLS,
  ...PHASE_2_TOOLS,
  ...PHASE_3_TOOLS,
  ...PHASE_4_TOOLS,
  ...PHASE_5_TOOLS,
  ...PHASE_6_TOOLS
];

/**
 * Total planned strategy tools across Phase 1 through Phase 7 as defined in tool-build-strategy.md.
 * 55 total planned tools.
 */
export const TOTAL_STRATEGY_TOOLS = 55;

export function getToolByPath(path) {
  return ALL_TOOLS.find((tool) => tool.path === path);
}

export function getToolById(id) {
  return ALL_TOOLS.find((tool) => tool.id === id);
}
