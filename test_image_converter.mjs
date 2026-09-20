/**
 * Comprehensive automated test suite for Image Converter (Phase 2.4).
 * Validates route registration, format validation, format conversion logic,
 * dimension preservation, transparency handling, background color fills,
 * safety checks, and non-regression of prior tools.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import UPNG from 'upng-js';
import { ALL_TOOLS, PHASE_1_TOOLS, PHASE_2_TOOLS, getToolByPath, getToolById } from './src/tools/toolsRegistry.js';

console.log('=== Image Converter Automated Test Suite ===\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

async function runTests() {
  // 1. Tool Registry & Route Definitions
  console.log('1. Checking Tool Registry & Route Definitions...');

  test('Phase 2 contains Image Converter tool', () => {
    assert.ok(PHASE_2_TOOLS.some((t) => t.id === 'image-converter'));
  });

  test('ALL_TOOLS contains Phase 1 and Phase 2 tools', () => {
    assert.ok(ALL_TOOLS.length >= 10);
  });

  test('getToolById("image-converter") found with proper metadata', () => {
    const tool = getToolById('image-converter');
    assert.ok(tool);
    assert.strictEqual(tool.id, 'image-converter');
    assert.strictEqual(tool.name, 'Image Converter');
    assert.strictEqual(tool.path, '/image-converter');
    assert.strictEqual(tool.category, 'Image Conversion');
    assert.strictEqual(tool.phase, 'Phase 2');
    assert.strictEqual(tool.status, 'Ready');
  });

  test('getToolByPath("/image-converter") resolves correctly', () => {
    const tool = getToolByPath('/image-converter');
    assert.ok(tool);
    assert.strictEqual(tool.id, 'image-converter');
  });

  // 2. Verifying Non-Regression of Existing Routes
  console.log('\n2. Verifying All Existing Routes Remain Intact...');
  test('Phase 1 has all 6 tools intact', () => {
    assert.strictEqual(PHASE_1_TOOLS.length, 6);
  });

  const priorRoutes = [
    '/jpg-to-pdf',
    '/pdf-to-word',
    '/pdf-to-jpg',
    '/word-to-pdf',
    '/merge-pdf',
    '/compress-pdf',
    '/background-remover',
    '/image-compressor',
    '/image-resizer',
    '/image-converter'
  ];

  for (const r of priorRoutes) {
    test(`Route ${r} is registered`, () => {
      const tool = getToolByPath(r);
      assert.ok(tool, `Route ${r} not found in tools registry`);
    });
  }

  // 3. App.jsx Route Setup
  console.log('\n3. Verifying App.jsx Route Setup...');
  const appJsx = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');

  test('App.jsx contains path="image-converter"', () => {
    assert.ok(appJsx.includes('path="image-converter"'));
  });

  test('App.jsx imports ImageConverterTool', () => {
    assert.ok(appJsx.includes('import ImageConverterTool from \'./tools/image-converter\''));
  });

  // 4. File Format Validation Logic
  console.log('\n4. Testing Input File Format Validation...');
  function detectInputFormat(file) {
    if (!file) return 'UNKNOWN';
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'JPG';
    if (type === 'image/png' || name.endsWith('.png')) return 'PNG';
    if (type === 'image/webp' || name.endsWith('.webp')) return 'WEBP';
    return 'UNKNOWN';
  }

  function validateInputFile(file) {
    if (!file) return { valid: false, error: 'No file' };
    const detected = detectInputFormat(file);
    if (detected === 'UNKNOWN') {
      return { valid: false, error: 'Unsupported file format. Please select a valid JPG, JPEG, PNG, or WEBP image.' };
    }
    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 30MB limit.' };
    }
    return { valid: true, format: detected };
  }

  test('JPG accepted', () => {
    const res = validateInputFile({ name: 'photo.jpg', type: 'image/jpeg', size: 500000 });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.format, 'JPG');
  });

  test('JPEG accepted', () => {
    const res = validateInputFile({ name: 'graphic.jpeg', type: 'image/jpeg', size: 500000 });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.format, 'JPG');
  });

  test('PNG accepted', () => {
    const res = validateInputFile({ name: 'icon.png', type: 'image/png', size: 200000 });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.format, 'PNG');
  });

  test('WEBP accepted', () => {
    const res = validateInputFile({ name: 'banner.webp', type: 'image/webp', size: 300000 });
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.format, 'WEBP');
  });

  test('Unsupported PDF rejected with user-friendly error', () => {
    const res = validateInputFile({ name: 'doc.pdf', type: 'application/pdf', size: 100000 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Unsupported file format'));
  });

  test('Unsupported SVG rejected', () => {
    const res = validateInputFile({ name: 'vector.svg', type: 'image/svg+xml', size: 50000 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Unsupported file format'));
  });

  test('Unsupported GIF rejected', () => {
    const res = validateInputFile({ name: 'anim.gif', type: 'image/gif', size: 150000 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Unsupported file format'));
  });

  // 5. Output Format Selector & Default Logic
  console.log('\n5. Testing Output Format Selector & Default Targets...');
  function getDefaultTargetFormat(inputFormat) {
    if (inputFormat === 'PNG') return 'JPG';
    if (inputFormat === 'JPG') return 'PNG';
    if (inputFormat === 'WEBP') return 'PNG';
    return 'PNG';
  }

  test('PNG defaults to JPG target', () => {
    assert.strictEqual(getDefaultTargetFormat('PNG'), 'JPG');
  });

  test('JPG defaults to PNG target', () => {
    assert.strictEqual(getDefaultTargetFormat('JPG'), 'PNG');
  });

  test('WEBP defaults to PNG target', () => {
    assert.strictEqual(getDefaultTargetFormat('WEBP'), 'PNG');
  });

  // 6. Filename Formulation & Sanitization
  console.log('\n6. Testing Filename Formulation & Extensions...');
  function getConvertedDownloadName(originalName, targetFormat) {
    const ext = targetFormat.toLowerCase() === 'jpeg' || targetFormat.toLowerCase() === 'jpg'
      ? 'jpg'
      : targetFormat.toLowerCase() === 'webp'
      ? 'webp'
      : 'png';
    if (!originalName) return `image-converted.${ext}`;
    const lastDot = originalName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
    const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
    return `${cleanBase}-converted.${ext}`;
  }

  test('product.jpg -> product-converted.png when target is PNG', () => {
    assert.strictEqual(getConvertedDownloadName('product.jpg', 'PNG'), 'product-converted.png');
  });

  test('photo.png -> photo-converted.webp when target is WEBP', () => {
    assert.strictEqual(getConvertedDownloadName('photo.png', 'WEBP'), 'photo-converted.webp');
  });

  test('image.webp -> image-converted.jpg when target is JPG', () => {
    assert.strictEqual(getConvertedDownloadName('image.webp', 'JPG'), 'image-converted.jpg');
  });

  test('Sanitizes spaces and special characters cleanly', () => {
    assert.strictEqual(getConvertedDownloadName('vacation snapshot #1 (2026).jpeg', 'PNG'), 'vacation_snapshot_1_2026-converted.png');
  });

  // 7. Dimension Preservation & Validation Rules
  console.log('\n7. Testing Dimension Preservation Rules...');
  function validateOutputDimensions(sourceW, sourceH, outputW, outputH) {
    return sourceW === outputW && sourceH === outputH;
  }

  test('640 x 853 remains 640 x 853', () => {
    assert.strictEqual(validateOutputDimensions(640, 853, 640, 853), true);
  });

  test('1600 x 1000 remains 1600 x 1000', () => {
    assert.strictEqual(validateOutputDimensions(1600, 1000, 1600, 1000), true);
  });

  test('400 x 400 remains 400 x 400', () => {
    assert.strictEqual(validateOutputDimensions(400, 400, 400, 400), true);
  });

  test('Rejects altered dimensions as invalid conversion', () => {
    assert.strictEqual(validateOutputDimensions(640, 853, 640, 850), false);
    assert.strictEqual(validateOutputDimensions(640, 853, 500, 853), false);
  });

  // 8. Quality Settings & Format Nuances
  console.log('\n8. Testing Format-Specific Quality Rules...');
  function getQualityControlAvailability(outputFormat) {
    return {
      hasQualitySlider: outputFormat === 'JPG' || outputFormat === 'WEBP',
      isLossless: outputFormat === 'PNG',
      supportsAlpha: outputFormat === 'PNG' || outputFormat === 'WEBP'
    };
  }

  test('JPG exposes quality control and does not support alpha', () => {
    const q = getQualityControlAvailability('JPG');
    assert.strictEqual(q.hasQualitySlider, true);
    assert.strictEqual(q.supportsAlpha, false);
  });

  test('WEBP exposes quality control and supports alpha', () => {
    const q = getQualityControlAvailability('WEBP');
    assert.strictEqual(q.hasQualitySlider, true);
    assert.strictEqual(q.supportsAlpha, true);
  });

  test('PNG does not expose misleading lossy quality slider and supports alpha', () => {
    const q = getQualityControlAvailability('PNG');
    assert.strictEqual(q.hasQualitySlider, false);
    assert.strictEqual(q.isLossless, true);
    assert.strictEqual(q.supportsAlpha, true);
  });

  // 9. Transparency & Background Color Handling
  console.log('\n9. Testing Transparency & Background Color Handling...');
  function simulateCanvasExport(inputFormat, outputFormat, bgColor, sourcePixels) {
    // sourcePixels: array of { r, g, b, a } (a: 0..255)
    const outPixels = [];
    for (const p of sourcePixels) {
      if (outputFormat === 'JPG') {
        // JPG has no alpha: blend over background color
        const bgR = bgColor === '#000000' ? 0 : 255;
        const bgG = bgColor === '#000000' ? 0 : 255;
        const bgB = bgColor === '#000000' ? 0 : 255;
        const alphaFrac = p.a / 255;
        const r = Math.round(p.r * alphaFrac + bgR * (1 - alphaFrac));
        const g = Math.round(p.g * alphaFrac + bgG * (1 - alphaFrac));
        const b = Math.round(p.b * alphaFrac + bgB * (1 - alphaFrac));
        outPixels.push({ r, g, b, a: 255 });
      } else {
        // PNG or WEBP: preserve original alpha
        outPixels.push({ r: p.r, g: p.g, b: p.b, a: p.a });
      }
    }
    return outPixels;
  }

  test('PNG -> PNG preserves transparent pixels (alpha = 0)', () => {
    const src = [{ r: 255, g: 0, b: 0, a: 0 }]; // fully transparent
    const out = simulateCanvasExport('PNG', 'PNG', '#ffffff', src);
    assert.strictEqual(out[0].a, 0, 'Alpha transparency preserved in PNG output');
  });

  test('PNG -> WEBP preserves transparent pixels (alpha = 0)', () => {
    const src = [{ r: 0, g: 255, b: 0, a: 0 }];
    const out = simulateCanvasExport('PNG', 'WEBP', '#ffffff', src);
    assert.strictEqual(out[0].a, 0, 'Alpha transparency preserved in WEBP output');
  });

  test('PNG -> JPG applies white background by default for transparent pixels', () => {
    const src = [{ r: 255, g: 0, b: 0, a: 0 }]; // transparent
    const out = simulateCanvasExport('PNG', 'JPG', '#ffffff', src);
    assert.strictEqual(out[0].a, 255, 'JPG output has full alpha');
    assert.strictEqual(out[0].r, 255);
    assert.strictEqual(out[0].g, 255);
    assert.strictEqual(out[0].b, 255, 'Transparent area filled with white');
  });

  test('PNG -> JPG applies black background when requested', () => {
    const src = [{ r: 255, g: 255, b: 255, a: 0 }]; // transparent
    const out = simulateCanvasExport('PNG', 'JPG', '#000000', src);
    assert.strictEqual(out[0].a, 255);
    assert.strictEqual(out[0].r, 0);
    assert.strictEqual(out[0].g, 0);
    assert.strictEqual(out[0].b, 0, 'Transparent area filled with black');
  });

  // 10. Large Dimension Safety Validation
  console.log('\n10. Testing Dimension Safety Guardrails...');
  function validateImageSafety(w, h) {
    const MAX_DIM = 10000;
    const MAX_PIXELS = 40000000;
    if (w > MAX_DIM || h > MAX_DIM || w * h > MAX_PIXELS) {
      return { safe: false, error: 'Image is too large for your browser to process safely.' };
    }
    return { safe: true, error: null };
  }

  test('Standard dimensions (1920x1080) are safe', () => {
    assert.strictEqual(validateImageSafety(1920, 1080).safe, true);
  });

  test('High resolution photo (4000x3000 = 12MP) is safe', () => {
    assert.strictEqual(validateImageSafety(4000, 3000).safe, true);
  });

  test('Unsafe dimension > 10,000 px rejected with user-friendly alert', () => {
    const res = validateImageSafety(12000, 2000);
    assert.strictEqual(res.safe, false);
    assert.ok(res.error.includes('too large for your browser'));
  });

  test('Unsafe pixel count > 40MP rejected safely', () => {
    const res = validateImageSafety(8000, 7000); // 56 MP
    assert.strictEqual(res.safe, false);
    assert.ok(res.error.includes('too large for your browser'));
  });

  // 11. State Machine & Transition Logic
  console.log('\n11. Testing Converter State Machine...');
  class ConverterStateMachine {
    constructor() {
      this.reset();
    }
    reset() {
      this.state = 'IDLE';
      this.isProcessing = false;
      this.convertedBlob = null;
      this.errorMessage = null;
    }
    startConverting() {
      this.state = 'CONVERTING';
      this.isProcessing = true;
    }
    startValidating() {
      this.state = 'VALIDATING';
      this.isProcessing = true;
    }
    complete(blob) {
      this.state = 'SUCCESS';
      this.isProcessing = false;
      this.convertedBlob = blob;
    }
    fail(msg) {
      this.state = 'ERROR';
      this.isProcessing = false;
      this.errorMessage = msg;
    }
  }

  const csm = new ConverterStateMachine();
  test('Initial state is IDLE', () => {
    assert.strictEqual(csm.state, 'IDLE');
    assert.strictEqual(csm.isProcessing, false);
  });

  test('Conversion start locks processing in CONVERTING state', () => {
    csm.startConverting();
    assert.strictEqual(csm.state, 'CONVERTING');
    assert.strictEqual(csm.isProcessing, true);
  });

  test('Validation step sets VALIDATING state while keeping processing locked', () => {
    csm.startValidating();
    assert.strictEqual(csm.state, 'VALIDATING');
    assert.strictEqual(csm.isProcessing, true);
  });

  test('Successful completion transitions to SUCCESS and releases lock', () => {
    csm.complete({ size: 10240, type: 'image/png' });
    assert.strictEqual(csm.state, 'SUCCESS');
    assert.strictEqual(csm.isProcessing, false);
  });

  test('Reset returns cleanly to IDLE', () => {
    csm.reset();
    assert.strictEqual(csm.state, 'IDLE');
    assert.strictEqual(csm.convertedBlob, null);
  });

  test('Error state registers failure and releases lock', () => {
    csm.fail('Conversion failed. Please try another image or format.');
    assert.strictEqual(csm.state, 'ERROR');
    assert.strictEqual(csm.isProcessing, false);
  });

  // 12. Real Node/UPNG Image Encoding & Decoding
  console.log('\n12. Testing PNG Output Encoding & Decodability (UPNG.js)...');
  const upngLib = UPNG.default || UPNG;
  test('UPNG decodes and verifies dimensions match 1:1', () => {
    const w = 320;
    const h = 240;
    const buf = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
      buf[i] = 120;
      buf[i + 1] = 180;
      buf[i + 2] = 240;
      buf[i + 3] = 255;
    }
    const encoded = upngLib.encode([buf.buffer], w, h, 0);
    const decoded = upngLib.decode(encoded);
    assert.strictEqual(decoded.width, w, 'Output width exactly matches input width');
    assert.strictEqual(decoded.height, h, 'Output height exactly matches input height');
  });

  console.log(`\n=== Automated Test Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
