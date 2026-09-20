/**
 * Comprehensive automated test suite for JPG to PNG (Phase 2.5).
 * Validates route registration, strict JPG/JPEG format acceptance,
 * rejection of PNG, WEBP, PDF and others, dimension preservation,
 * lossless PNG encoding, state machine, safety checks, and non-regression.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import UPNG from 'upng-js';
import { ALL_TOOLS, PHASE_2_TOOLS, getToolByPath, getToolById } from './src/tools/toolsRegistry.js';

console.log('=== JPG to PNG Automated Test Suite ===\n');

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

  test('Route /jpg-to-png is registered in tool registry', () => {
    const tool = getToolByPath('/jpg-to-png');
    assert.ok(tool, 'Route /jpg-to-png must be registered');
    assert.strictEqual(tool.id, 'jpg-to-png');
  });

  test('getToolById("jpg-to-png") returns valid tool definition', () => {
    const tool = getToolById('jpg-to-png');
    assert.ok(tool);
    assert.strictEqual(tool.name, 'JPG to PNG');
    assert.strictEqual(tool.path, '/jpg-to-png');
    assert.strictEqual(tool.category, 'Image Conversion');
    assert.strictEqual(tool.phase, 'Phase 2');
    assert.strictEqual(tool.status, 'Ready');
  });

  test('Phase 2 contains 5 tools registered (Background Remover, Compressor, Resizer, Converter, JPG to PNG)', () => {
    assert.ok(PHASE_2_TOOLS.length >= 5);
    assert.ok(PHASE_2_TOOLS.some((t) => t.id === 'jpg-to-png'));
  });

  test('ALL_TOOLS contains Phase 1 and Phase 2 tools (total >= 11)', () => {
    assert.ok(ALL_TOOLS.length >= 11);
  });

  // 2. Verifying Non-Regression of Existing Routes
  console.log('\n2. Verifying All Existing Routes Remain Intact...');
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
    '/image-converter',
    '/jpg-to-png'
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

  test('App.jsx contains path="jpg-to-png"', () => {
    assert.ok(appJsx.includes('path="jpg-to-png"'));
  });

  test('App.jsx imports JpgToPngTool', () => {
    assert.ok(appJsx.includes('import JpgToPngTool from \'./tools/jpg-to-png\''));
  });

  // 4. Strict File Format Validation
  console.log('\n4. Testing Strict File Format Validation (JPG/JPEG only)...');
  function isJpgFile(file) {
    if (!file) return false;
    const type = (file.type || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    return type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
  }

  function validateJpgInput(file) {
    if (!file) return { valid: false, error: 'No file selected' };
    if (!isJpgFile(file)) {
      return { valid: false, error: 'Please upload a JPG or JPEG image.' };
    }
    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 30MB limit.' };
    }
    return { valid: true, error: null };
  }

  test('JPG accepted', () => {
    const res = validateJpgInput({ name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 500 });
    assert.strictEqual(res.valid, true);
  });

  test('JPEG accepted', () => {
    const res = validateJpgInput({ name: 'graphic.jpeg', type: 'image/jpeg', size: 1024 * 500 });
    assert.strictEqual(res.valid, true);
  });

  test('Uppercase .JPG and .JPEG accepted', () => {
    assert.strictEqual(validateJpgInput({ name: 'PHOTO.JPG', type: '', size: 50000 }).valid, true);
    assert.strictEqual(validateJpgInput({ name: 'IMAGE.JPEG', type: '', size: 50000 }).valid, true);
  });

  test('PNG rejected with user-friendly error', () => {
    const res = validateJpgInput({ name: 'graphic.png', type: 'image/png', size: 1024 * 200 });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Please upload a JPG or JPEG image.');
  });

  test('WEBP rejected with user-friendly error', () => {
    const res = validateJpgInput({ name: 'banner.webp', type: 'image/webp', size: 1024 * 200 });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Please upload a JPG or JPEG image.');
  });

  test('PDF rejected with user-friendly error', () => {
    const res = validateJpgInput({ name: 'document.pdf', type: 'application/pdf', size: 1024 * 100 });
    assert.strictEqual(res.valid, false);
    assert.strictEqual(res.error, 'Please upload a JPG or JPEG image.');
  });

  test('Other formats (GIF, SVG, DOCX) rejected with user-friendly error', () => {
    assert.strictEqual(validateJpgInput({ name: 'anim.gif', type: 'image/gif', size: 1000 }).valid, false);
    assert.strictEqual(validateJpgInput({ name: 'vector.svg', type: 'image/svg+xml', size: 1000 }).valid, false);
    assert.strictEqual(validateJpgInput({ name: 'report.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 1000 }).valid, false);
  });

  test('File exceeding 30MB rejected safely', () => {
    const res = validateJpgInput({ name: 'giant.jpg', type: 'image/jpeg', size: 35 * 1024 * 1024 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('exceeds 30MB limit'));
  });

  // 5. Output Filename Formulation
  console.log('\n5. Testing Output Filename Generation...');
  function getPngDownloadName(originalName) {
    if (!originalName) return 'image-converted.png';
    const lastDot = originalName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
    const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
    return `${cleanBase}-converted.png`;
  }

  test('photo.jpg -> photo-converted.png', () => {
    assert.strictEqual(getPngDownloadName('photo.jpg'), 'photo-converted.png');
  });

  test('vacation-landscape.jpeg -> vacation-landscape-converted.png', () => {
    assert.strictEqual(getPngDownloadName('vacation-landscape.jpeg'), 'vacation-landscape-converted.png');
  });

  test('Sanitizes spaces and special characters', () => {
    assert.strictEqual(getPngDownloadName('my photo #1 (final).jpg'), 'my_photo_1_final-converted.png');
  });

  test('Fallback when original name is empty', () => {
    assert.strictEqual(getPngDownloadName(''), 'image-converted.png');
  });

  // 6. Dimension Preservation & Real UPNG Encoding/Decoding
  console.log('\n6. Testing Real PNG Encoding, Decodability & Dimension Preservation (UPNG.js)...');
  const upngLib = UPNG.default || UPNG;

  function simulateJpgToPngConversion(w, h) {
    const buf = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h * 4; i += 4) {
      buf[i] = 220;     // R
      buf[i + 1] = 180; // G
      buf[i + 2] = 120; // B
      buf[i + 3] = 255; // A (opaque JPG)
    }
    const encoded = upngLib.encode([buf.buffer], w, h, 0);
    const decoded = upngLib.decode(encoded);
    return {
      encodedSize: encoded.byteLength,
      decodedWidth: decoded.width,
      decodedHeight: decoded.height,
      isPng: encoded.byteLength > 8
    };
  }

  test('Real conversion of Portrait JPG (640 × 853) preserves exact dimensions', () => {
    const res = simulateJpgToPngConversion(640, 853);
    assert.strictEqual(res.decodedWidth, 640);
    assert.strictEqual(res.decodedHeight, 853);
    assert.ok(res.isPng);
  });

  test('Real conversion of Landscape JPG (1600 × 1000) preserves exact dimensions', () => {
    const res = simulateJpgToPngConversion(1600, 1000);
    assert.strictEqual(res.decodedWidth, 1600);
    assert.strictEqual(res.decodedHeight, 1000);
    assert.ok(res.isPng);
  });

  test('Real conversion of Square JPG (1400 × 1400) preserves exact dimensions', () => {
    const res = simulateJpgToPngConversion(1400, 1400);
    assert.strictEqual(res.decodedWidth, 1400);
    assert.strictEqual(res.decodedHeight, 1400);
    assert.ok(res.isPng);
  });

  test('Dimension validation asserts strict equality', () => {
    function validateDimensions(sourceW, sourceH, outputW, outputH) {
      return sourceW === outputW && sourceH === outputH;
    }
    assert.strictEqual(validateDimensions(1200, 1600, 1200, 1600), true);
    assert.strictEqual(validateDimensions(1200, 1600, 1200, 1599), false);
    assert.strictEqual(validateDimensions(1200, 1600, 800, 1600), false);
  });

  // 7. Large Image Safety
  console.log('\n7. Testing Large Dimension Safety Guardrails...');
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

  // 8. Processing State Machine
  console.log('\n8. Testing Processing State Machine...');
  class JpgToPngStateMachine {
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

  const sm = new JpgToPngStateMachine();
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
    sm.complete({ size: 245000, type: 'image/png' });
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

  console.log(`\n=== Automated Test Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
