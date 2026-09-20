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
  }
];

export const ALL_TOOLS = [...PHASE_1_TOOLS, ...PHASE_2_TOOLS];

export function getToolByPath(path) {
  return ALL_TOOLS.find((tool) => tool.path === path);
}

export function getToolById(id) {
  return ALL_TOOLS.find((tool) => tool.id === id);
}
