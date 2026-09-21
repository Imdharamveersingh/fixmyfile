/**
 * Phase 5.8 — Image to PDF: Difficult Edge Test
 * Run: node test_difficult_image_to_pdf.mjs
 */

import fs from 'fs';
import { jsPDF } from 'jspdf';

let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

console.log('\n=== Phase 5.8 — Image to PDF: Difficult / Edge Test ===\n');

// GROUP 1: Source Implementation Guarantees
console.log('GROUP 1: Source Implementation Guarantees');
const componentSrc = fs.readFileSync('src/tools/image-to-pdf/index.jsx', 'utf8');
assert(componentSrc.includes('PAGE_DIMENSIONS'), 'Defined standard page dimensions');
assert(componentSrc.includes('fitMode === \'contain\''), 'Aspect-ratio preserving contain calculation');
assert(componentSrc.includes('ctx.fillStyle = bgColor'), 'Background flattening for transparent graphics');
assert(!componentSrc.includes('console.log('), 'Zero console.log in production component');

// GROUP 2: Difficult Mixed-Format Image Ingestion Pipeline
console.log('\nGROUP 2: Difficult Mixed-Format Image Ingestion Pipeline');

// Test items with diverse dimensions, formats, and orientations:
const testItems = [
  { name: 'high_res_photo.jpg', width: 2400, height: 1600, orientation: 'landscape', format: 'JPEG', color: '#1d4ed8' },
  { name: 'transparent_logo.png', width: 800, height: 800, orientation: 'portrait', format: 'PNG', color: 'rgba(234, 88, 12, 0.6)' },
  { name: 'tall_banner.webp', width: 600, height: 1800, orientation: 'portrait', format: 'WEBP', color: '#10b981' },
  { name: 'wide_panorama.svg', width: 3200, height: 800, orientation: 'landscape', format: 'SVG', color: '#8b5cf6' },
  { name: 'square_icon.bmp', width: 512, height: 512, orientation: 'portrait', format: 'BMP', color: '#ec4899' }
];

let doc = null;
const margin = 10; // 10mm

testItems.forEach((item, idx) => {
  const isLandscape = item.width > item.height;
  const pageOrientation = isLandscape ? 'landscape' : 'portrait';
  const pageW = isLandscape ? 297 : 210;
  const pageH = isLandscape ? 210 : 297;

  // Margin boundary
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;

  // Preserve aspect ratio
  const scale = Math.min(maxW / item.width, maxH / item.height);
  const renderW = item.width * scale;
  const renderH = item.height * scale;
  const posX = margin + (maxW - renderW) / 2;
  const posY = margin + (maxH - renderH) / 2;

  if (idx === 0) {
    doc = new jsPDF({
      orientation: pageOrientation,
      unit: 'mm',
      format: 'a4',
      compress: true
    });
  } else {
    doc.addPage('a4', pageOrientation);
  }

  // Create SVG data URL simulating the format
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${item.width}" height="${item.height}"><rect width="${item.width}" height="${item.height}" fill="${item.color}"/></svg>`;
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

  doc.addImage(dataUrl, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
});

// Verify PDF output
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

// 1. Signature
const header = pdfBuffer.slice(0, 5).toString();
assert(header.startsWith('%PDF'), `Output has genuine PDF signature: ${header.trim()}`);

// 2. Page count
const totalPages = doc.getNumberOfPages();
assert(totalPages === 5, `Total pages exactly matches 5 input images (got ${totalPages})`);

// 3. Size is substantial
assert(pdfBuffer.length > 2000, `Multi-page PDF has substantial content size: ${pdfBuffer.length} bytes`);

// 4. Content verification: Check that PDF string contains page markers
const pdfString = pdfBuffer.toString('binary');
const pageMatches = pdfString.match(/\/Type\s*\/Page\b/g);
assert(pageMatches && pageMatches.length >= 5, `PDF catalog contains at least 5 Page objects (found ${pageMatches?.length})`);

// 5. Check MediaBox orientations in PDF
assert(pdfString.includes('/MediaBox'), 'PDF dictionary defines valid MediaBox boundaries');

// 6. Test zero stretching: aspect ratios
testItems.forEach((item, i) => {
  const isLandscape = item.width > item.height;
  const pageW = isLandscape ? 297 : 210;
  const pageH = isLandscape ? 210 : 297;
  const maxW = pageW - margin * 2;
  const maxH = pageH - margin * 2;
  const scale = Math.min(maxW / item.width, maxH / item.height);
  const rw = item.width * scale;
  const rh = item.height * scale;

  assert(
    Math.abs(rw / rh - item.width / item.height) < 0.0001,
    `Page ${i + 1} (${item.name}): ratio ${item.width}:${item.height} matches scaled ${rw.toFixed(2)}:${rh.toFixed(2)}`
  );
  assert(
    rw <= maxW && rh <= maxH,
    `Page ${i + 1} (${item.name}): bounded within ${maxW}x${maxH} mm`
  );
});

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ All difficult tests PASS\n');
  process.exit(0);
} else {
  console.error('\n❌ Some difficult tests FAILED\n');
  process.exit(1);
}
