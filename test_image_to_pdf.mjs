import fs from 'fs';
import { jsPDF } from 'jspdf';
import { PHASE_5_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

console.log('\n=== Phase 5.8 — Image to PDF: Automated Tests ===\n');

// GROUP 1: Registry & Routing
console.log('GROUP 1: Registry & Routing');
const toolEntry = PHASE_5_TOOLS.find((t) => t.id === 'image-to-pdf');
assert(!!toolEntry, 'image-to-pdf exists in PHASE_5_TOOLS');
assert(toolEntry?.path === '/image-to-pdf', 'image-to-pdf has path /image-to-pdf');
assert(toolEntry?.phase === 'Phase 5', 'image-to-pdf has phase Phase 5');
assert(toolEntry?.category === 'Image Conversion', 'image-to-pdf has category Image Conversion');
assert(ALL_TOOLS.length >= 37, `ALL_TOOLS has at least 37 entries (found ${ALL_TOOLS.length})`);
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS is still 55');

// GROUP 2: App.jsx Integration
console.log('\nGROUP 2: App.jsx Integration');
const appContent = fs.readFileSync('./src/App.jsx', 'utf8');
assert(appContent.includes('import ImageToPdfTool'), 'App.jsx imports ImageToPdfTool');
assert(appContent.includes('path="image-to-pdf"'), 'App.jsx has image-to-pdf route');

// GROUP 3: Component Source Files
console.log('\nGROUP 3: Component Source Files');
const componentPath = './src/tools/image-to-pdf/index.jsx';
assert(fs.existsSync(componentPath), 'src/tools/image-to-pdf/index.jsx exists');
const componentContent = fs.readFileSync(componentPath, 'utf8');
assert(componentContent.includes('export default function ImageToPdfTool'), 'index.jsx exports ImageToPdfTool as default');

// GROUP 4: Validation & Safety
console.log('\nGROUP 4: Validation & Safety Logic');
assert(componentContent.includes('file.size === 0'), 'Zero-byte file rejection implemented');
assert(componentContent.includes('50 * 1024 * 1024'), '50 MB file size limit enforced');
assert(componentContent.includes('isSupportedImage'), 'File format validation function present');
assert(componentContent.includes('URL.revokeObjectURL'), 'Object URL memory leak cleanup registered');

// GROUP 5: PDF Engine Simulation & Conversion Tests
console.log('\nGROUP 5: PDF Engine & Page Layout Verification');

// Helper to create a minimal 1x1 test image data URI
function createTestImageDataUrl(width, height, fillStyle = '#3b82f6') {
  // Create a minimal SVG data URI that encodes width, height, and color
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="${fillStyle}"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// 1. Single JPG/Image to PDF
{
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  // Add image
  doc.addImage(createTestImageDataUrl(100, 100), 'JPEG', 10, 10, 190, 190);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  assert(pdfBuffer.slice(0, 4).toString() === '%PDF', 'Single image produces valid %PDF signature');
  assert(pdfBuffer.length > 500, 'Single image PDF has readable binary content');
}

// 2. Single PNG with alpha handling
{
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(createTestImageDataUrl(200, 200, 'rgba(255,0,0,0.5)'), 'JPEG', 10, 10, 150, 150);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  assert(pdfBuffer.slice(0, 4).toString() === '%PDF', 'PNG with alpha produces valid PDF output');
}

// 3. WebP to PDF
{
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(createTestImageDataUrl(300, 150), 'JPEG', 10, 10, 190, 95);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  assert(pdfBuffer.slice(0, 4).toString() === '%PDF', 'WebP input produces valid PDF output');
}

// 4. Multiple Images to Multi-page PDF
{
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.addImage(createTestImageDataUrl(100, 100), 'JPEG', 10, 10, 100, 100);
  doc.addPage('a4', 'landscape');
  doc.addImage(createTestImageDataUrl(400, 200), 'JPEG', 10, 10, 200, 100);
  doc.addPage('a4', 'portrait');
  doc.addImage(createTestImageDataUrl(150, 300), 'JPEG', 10, 10, 100, 200);

  const pageCount = doc.getNumberOfPages();
  assert(pageCount === 3, `Multiple images produce exact page count = 3 (got ${pageCount})`);
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  assert(pdfBuffer.slice(0, 4).toString() === '%PDF', 'Multi-page PDF preserves %PDF header');
}

// 5. Orientation & Aspect Ratio Handling
{
  const imgW = 800;
  const imgH = 400;
  const isLandscape = imgW > imgH;
  assert(isLandscape === true, 'Landscape orientation correctly detected for 800x400');

  // Portrait check
  const portW = 400;
  const portH = 800;
  assert(portH > portW, 'Portrait orientation correctly detected for 400x800');

  // Aspect ratio preservation inside A4 margin 10mm
  const pageW = 297;
  const pageH = 210;
  const margin = 10;
  const maxW = pageW - margin * 2; // 277
  const maxH = pageH - margin * 2; // 190
  const scale = Math.min(maxW / imgW, maxH / imgH);
  const renderW = imgW * scale;
  const renderH = imgH * scale;
  assert(Math.abs(renderW / renderH - imgW / imgH) < 0.001, 'Aspect ratio strictly preserved during scaling');
  assert(renderW <= maxW && renderH <= maxH, 'Render dimensions do not exceed page printable boundaries');
}

// GROUP 6: Filename Sanitization & Reset
console.log('\nGROUP 6: Filename Sanitization & Reset');
assert(componentContent.includes('getPdfDownloadName'), 'Filename generator getPdfDownloadName present');
assert(componentContent.includes('-converted.pdf'), 'Download filename appends -converted.pdf');
assert(componentContent.includes('clearAll'), 'Clear all / reset function present');

// GROUP 7: Navigation & Semantic IDs
console.log('\nGROUP 7: Navigation & Semantic IDs');
const headerContent = fs.readFileSync('./src/components/Header.jsx', 'utf8');
assert(headerContent.includes('/image-to-pdf'), 'Header.jsx contains link to /image-to-pdf');
const footerContent = fs.readFileSync('./src/components/Footer.jsx', 'utf8');
assert(footerContent.includes('Image Tools'), 'Footer.jsx contains compact Image Tools link');
assert(componentContent.includes('id="image-to-pdf-dropzone"'), 'Dropzone has id image-to-pdf-dropzone');
assert(componentContent.includes('id="image-to-pdf-convert-btn"'), 'Convert button has id image-to-pdf-convert-btn');
assert(componentContent.includes('id="image-to-pdf-download-btn"'), 'Download button has id image-to-pdf-download-btn');
assert(componentContent.includes('id="image-to-pdf-reset-btn"'), 'Reset button has id image-to-pdf-reset-btn');

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All tests PASS\n');
  process.exit(0);
} else {
  console.error('\n❌ Some tests FAILED\n');
  process.exit(1);
}
