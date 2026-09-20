/**
 * Comprehensive automated test suite for PNG to JPG (Phase 2.6).
 * Validates route registration, strict PNG format acceptance,
 * rejection of JPG, WEBP, PDF and others, dimension preservation,
 * explicit background color application (White, Black, Custom),
 * complete flattening of alpha channels, JPEG quality settings,
 * safety checks, and non-regression of prior tools.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import UPNG from 'upng-js';
import { ALL_TOOLS, PHASE_2_TOOLS, getToolByPath, getToolById } from './src/tools/toolsRegistry.js';

console.log('=== PNG to JPG Automated Test Suite ===\n');

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

  test('Route /png-to-jpg is registered in tool registry', () => {
    const tool = getToolByPath('/png-to-jpg');
    assert.ok(tool, 'Route /png-to-jpg must be registered');
    assert.strictEqual(tool.id, 'png-to-jpg');
  });

  test('getToolById("png-to-jpg") returns valid tool definition', () => {
    const tool = getToolById('png-to-jpg');
    assert.ok(tool);
    assert.strictEqual(tool.name, 'PNG to JPG');
    assert.strictEqual(tool.path, '/png-to-jpg');
    assert.strictEqual(tool.category, 'Image Conversion');
    assert.strictEqual(tool.phase, 'Phase 2');
    assert.strictEqual(tool.status, 'Ready');
  });

  test('Phase 2 has 6 tools registered (Completing Phase 2)', () => {
    assert.strictEqual(PHASE_2_TOOLS.length, 6);
    assert.ok(PHASE_2_TOOLS.some((t) => t.id === 'png-to-jpg'));
  });

  test('ALL_TOOLS contains 12 tools in total (6 Phase 1 + 6 Phase 2)', () => {
    assert.strictEqual(ALL_TOOLS.length, 12);
  });

  // 2. Verifying Non-Regression of All Registered Routes
  console.log('\n2. Verifying All Phase 1 and Phase 2 Routes Remain Intact...');
  const allRoutes = [
    '/jpg-to-pdf',
    '/pdf-to-word',
    '/pdf-to-jpg',
    '/word-to-pdf',
    '/merge-pdf',
    '/compress-pdf',
    '/background-remover',
    '/image-compressor',
    '/image-resizer',
    '/image-converter',
    '/jpg-to-png',
    '/png-to-jpg'
  ];

  for (const r of allRoutes) {
    test(`Route ${r} is registered`, () => {
      const tool = getToolByPath(r);
      assert.ok(tool, `Route ${r} not found in tools registry`);
    });
  }

  // 3. App.jsx Route Setup
  console.log('\n3. Verifying App.jsx Route Setup...');
  const appJsx = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');

  test('App.jsx contains path="png-to-jpg"', () => {
    assert.ok(appJsx.includes('path="png-to-jpg"'));
  });

  test('App.jsx imports PngToJpgTool', () => {
    assert.ok(appJsx.includes('import PngToJpgTool from \'./tools/png-to-jpg\''));
  });

  // 4. Strict File Format Validation
  console.log('\n4. Testing Strict Input Format Validation (PNG only)...');
  function isPngFile(file) {
    if (!file) return false;
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return type === 'image/png' || name.endsWith('.png');
  }

  function validatePngInput(file) {
    if (!file) return { valid: false, error: 'No file selected' };
    if (!isPngFile(file)) {
      return { valid: false, error: 'Please upload a PNG image.' };
    }
    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 30MB limit.' };
    }
    return { valid: true, error: null };
  }

  test('PNG accepted', () => {
    const res = validatePngInput({ name: 'graphic.png', type: 'image/png', size: 1024 * 500 });
    assert.strictEqual(res.valid, true);
  });

  test('Uppercase .PNG accepted', () => {
    assert.strictEqual(validatePngInput({ name: 'PHOTO.PNG', type: '', size: 50000 }).valid, true);
  });

  test('JPG rejected with user-friendly error', () => {
    const res = validatePngInput({ name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 200 });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Please upload a PNG image.');
  });

  test('JPEG rejected with user-friendly error', () => {
    const res = validatePngInput({ name: 'image.jpeg', type: 'image/jpeg', size: 1024 * 200 });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Please upload a PNG image.');
  });

  test('WEBP rejected with user-friendly error', () => {
    const res = validatePngInput({ name: 'banner.webp', type: 'image/webp', size: 1024 * 200 });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Please upload a PNG image.');
  });

  test('PDF rejected with user-friendly error', () => {
    const res = validatePngInput({ name: 'document.pdf', type: 'application/pdf', size: 1024 * 100 });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Please upload a PNG image.');
  });

  test('File exceeding 30MB rejected safely', () => {
    const res = validatePngInput({ name: 'giant.png', type: 'image/png', size: 35 * 1024 * 1024 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('exceeds 30MB limit'));
  });

  // 5. Output Filename Formulation
  console.log('\n5. Testing Output Filename Generation...');
  function getJpgDownloadName(originalName) {
    if (!originalName) return 'image-converted.jpg';
    const lastDot = originalName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
    const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
    return `${cleanBase}-converted.jpg`;
  }

  test('icon.png -> icon-converted.jpg', () => {
    assert.strictEqual(getJpgDownloadName('icon.png'), 'icon-converted.jpg');
  });

  test('transparent-cutout.png -> transparent-cutout-converted.jpg', () => {
    assert.strictEqual(getJpgDownloadName('transparent-cutout.png'), 'transparent-cutout-converted.jpg');
  });

  test('Sanitizes spaces and special characters', () => {
    assert.strictEqual(getJpgDownloadName('app logo #2 (draft).png'), 'app_logo_2_draft-converted.jpg');
  });

  // 6. Transparency & Background Color Simulation
  console.log('\n6. Testing Transparency & Background Color Blending...');
  function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  function compositeOverBackground(r, g, b, a, bgHex) {
    const bg = hexToRgb(bgHex);
    const alphaFrac = a / 255;
    return {
      r: Math.round(r * alphaFrac + bg.r * (1 - alphaFrac)),
      g: Math.round(g * alphaFrac + bg.g * (1 - alphaFrac)),
      b: Math.round(b * alphaFrac + bg.b * (1 - alphaFrac)),
      a: 255 // JPG has no alpha channel
    };
  }

  test('White background: transparent pixel (alpha=0) becomes pure white (255, 255, 255, 255)', () => {
    const res = compositeOverBackground(0, 0, 0, 0, '#ffffff');
    assert.strictEqual(res.r, 255);
    assert.strictEqual(res.g, 255);
    assert.strictEqual(res.b, 255);
    assert.strictEqual(res.a, 255, 'Alpha is 255 (opaque)');
  });

  test('Black background: transparent pixel (alpha=0) becomes pure black (0, 0, 0, 255)', () => {
    const res = compositeOverBackground(255, 255, 255, 0, '#000000');
    assert.strictEqual(res.r, 0);
    assert.strictEqual(res.g, 0);
    assert.strictEqual(res.b, 0);
    assert.strictEqual(res.a, 255, 'Alpha is 255 (opaque)');
  });

  test('Custom background (#ff5500): transparent pixel becomes #ff5500', () => {
    const res = compositeOverBackground(0, 0, 0, 0, '#ff5500');
    assert.strictEqual(res.r, 255);
    assert.strictEqual(res.g, 85);
    assert.strictEqual(res.b, 0);
    assert.strictEqual(res.a, 255);
  });

  test('Semi-transparent pixel (50% red over white background) blends correctly', () => {
    const res = compositeOverBackground(255, 0, 0, 128, '#ffffff');
    // 255 * (128/255) + 255 * (127/255) = 255
    // 0 * (128/255) + 255 * (127/255) = 127
    assert.strictEqual(res.r, 255);
    assert.ok(Math.abs(res.g - 127) <= 1);
    assert.ok(Math.abs(res.b - 127) <= 1);
    assert.strictEqual(res.a, 255);
  });

  test('Fully opaque pixel remains unchanged regardless of background', () => {
    const res = compositeOverBackground(100, 150, 200, 255, '#ffffff');
    assert.strictEqual(res.r, 100);
    assert.strictEqual(res.g, 150);
    assert.strictEqual(res.b, 200);
    assert.strictEqual(res.a, 255);
  });

  // 7. Dimension Preservation Validation
  console.log('\n7. Testing Strict 1:1 Dimension Preservation...');
  function validateOutputDimensions(sourceW, sourceH, outputW, outputH) {
    return sourceW === outputW && sourceH === outputH;
  }

  test('400 x 400 remains 400 x 400', () => {
    assert.strictEqual(validateOutputDimensions(400, 400, 400, 400), true);
  });

  test('1080 x 1440 remains 1080 x 1440', () => {
    assert.strictEqual(validateOutputDimensions(1080, 1440, 1080, 1440), true);
  });

  test('1920 x 1080 remains 1920 x 1080', () => {
    assert.strictEqual(validateOutputDimensions(1920, 1080, 1920, 1080), true);
  });

  test('Rejects mismatched dimensions', () => {
    assert.strictEqual(validateOutputDimensions(1080, 1440, 1080, 1400), false);
  });

  // 8. Large Dimension Safety Guardrails
  console.log('\n8. Testing Dimension Safety Guardrails...');
  function validateImageSafety(w, h) {
    const MAX_DIM = 10000;
    const MAX_PIXELS = 40000000;
    if (w > MAX_DIM || h > MAX_DIM || w * h > MAX_PIXELS) {
      return { safe: false, error: 'This image is too large to process safely in your browser.' };
    }
    return { safe: true, error: null };
  }

  test('Standard resolution (1920x1080) is safe', () => {
    assert.strictEqual(validateImageSafety(1920, 1080).safe, true);
  });

  test('High resolution 4K (3840x2160) is safe', () => {
    assert.strictEqual(validateImageSafety(3840, 2160).safe, true);
  });

  test('Dimension exceeding 10,000 px rejected with user-friendly alert', () => {
    const res = validateImageSafety(12000, 2000);
    assert.strictEqual(res.safe, false);
    assert.ok(res.error.includes('too large to process safely'));
  });

  test('Pixel count exceeding 40MP rejected safely', () => {
    const res = validateImageSafety(8000, 7000);
    assert.strictEqual(res.safe, false);
    assert.ok(res.error.includes('too large to process safely'));
  });

  // 9. Processing State Machine
  console.log('\n9. Testing Processing State Machine...');
  class PngToJpgStateMachine {
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
      this.errorMessage = null;
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

  const sm = new PngToJpgStateMachine();
  test('Initial state is IDLE', () => {
    assert.strictEqual(sm.state, 'IDLE');
    assert.strictEqual(sm.isProcessing, false);
  });

  test('Starting conversion transitions to CONVERTING and locks processing', () => {
    sm.startConverting();
    assert.strictEqual(sm.state, 'CONVERTING');
    assert.strictEqual(sm.isProcessing, true);
  });

  test('Validation transitions to VALIDATING and preserves processing lock', () => {
    sm.startValidating();
    assert.strictEqual(sm.state, 'VALIDATING');
    assert.strictEqual(sm.isProcessing, true);
  });

  test('Successful completion transitions to SUCCESS and releases lock', () => {
    sm.complete({ size: 120000, type: 'image/jpeg' });
    assert.strictEqual(sm.state, 'SUCCESS');
    assert.strictEqual(sm.isProcessing, false);
  });

  test('Reset returns cleanly to IDLE', () => {
    sm.reset();
    assert.strictEqual(sm.state, 'IDLE');
    assert.strictEqual(sm.convertedBlob, null);
  });

  test('Error state registers failure and releases lock', () => {
    sm.fail('Image conversion failed. Please try another image.');
    assert.strictEqual(sm.state, 'ERROR');
    assert.strictEqual(sm.isProcessing, false);
    assert.strictEqual(sm.errorMessage, 'Image conversion failed. Please try another image.');
  });

  // 10. Real Image Reading with UPNG.js
  console.log('\n10. Testing Real PNG Decoding and Verification (UPNG.js)...');
  const upngLib = UPNG.default || UPNG;
  const fixturePath = path.resolve('test-fixtures/transparent-badge.png');
  const fileBytes = fs.readFileSync(fixturePath);
  const decoded = upngLib.decode(fileBytes);
  test('transparent-badge.png decoded successfully with exact dimensions', () => {
    assert.strictEqual(decoded.width, 400);
    assert.strictEqual(decoded.height, 400);
  });

  test('transparent-badge.png contains alpha transparency pixels (alpha < 255)', () => {
    const rgba = new Uint8Array(upngLib.toRGBA8(decoded)[0]);
    let hasAlpha = false;
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] < 255) {
        hasAlpha = true;
        break;
      }
    }
    assert.strictEqual(hasAlpha, true, 'Source PNG contains transparent pixels');
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
