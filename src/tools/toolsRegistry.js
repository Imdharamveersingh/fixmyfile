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

export const ALL_TOOLS = [...PHASE_1_TOOLS, ...PHASE_2_TOOLS];

export function getToolByPath(path) {
  return ALL_TOOLS.find((tool) => tool.path === path);
}

export function getToolById(id) {
  return ALL_TOOLS.find((tool) => tool.id === id);
}
