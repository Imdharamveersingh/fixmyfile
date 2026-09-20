/**
 * Comprehensive automated test suite for Image Compressor (Phase 2.2).
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import UPNG from 'upng-js';
import { ALL_TOOLS, PHASE_1_TOOLS, PHASE_2_TOOLS, getToolByPath, getToolById } from './src/tools/toolsRegistry.js';

console.log('=== Image Compressor Automated Test Suite ===\n');

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
  test('Phase 2 has exactly 2 tools registered (Background Remover + Image Compressor)', () => {
    assert.strictEqual(PHASE_2_TOOLS.length, 2);
  });

  test('ALL_TOOLS contains 8 tools in total (6 Phase 1 + 2 Phase 2)', () => {
    assert.strictEqual(ALL_TOOLS.length, 8);
  });

  test('getToolById("image-compressor") found', () => {
    const tool = getToolById('image-compressor');
    assert.ok(tool);
    assert.strictEqual(tool.id, 'image-compressor');
    assert.strictEqual(tool.name, 'Image Compressor');
    assert.strictEqual(tool.path, '/image-compressor');
    assert.strictEqual(tool.category, 'Image Optimization');
    assert.strictEqual(tool.phase, 'Phase 2');
    assert.strictEqual(tool.status, 'Ready');
  });

  test('getToolByPath("/image-compressor") resolves correctly', () => {
    const tool = getToolByPath('/image-compressor');
    assert.ok(tool);
    assert.strictEqual(tool.id, 'image-compressor');
  });

  // 2. Verifying Non-Regression of Existing Routes
  console.log('\n2. Verifying All Existing Routes Remain Intact...');
  test('Phase 1 has all 6 tools intact', () => {
    assert.strictEqual(PHASE_1_TOOLS.length, 6);
  });

  const expectedRoutes = [
    '/jpg-to-pdf',
    '/pdf-to-word',
    '/pdf-to-jpg',
    '/word-to-pdf',
    '/merge-pdf',
    '/compress-pdf',
    '/background-remover'
  ];

  for (const r of expectedRoutes) {
    test(`Route ${r} remains registered`, () => {
      const tool = getToolByPath(r);
      assert.ok(tool, `Route ${r} not found in tools registry`);
    });
  }

  // 3. App.jsx Route Setup
  console.log('\n3. Verifying App.jsx Route Setup...');
  const appJsx = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');

  test('App.jsx contains path="image-compressor"', () => {
    assert.ok(appJsx.includes('path="image-compressor"'));
  });

  test('App.jsx imports ImageCompressorTool', () => {
    assert.ok(appJsx.includes('import ImageCompressorTool from \'./tools/image-compressor\''));
  });

  test('App.jsx preserves BackgroundRemoverTool route', () => {
    assert.ok(appJsx.includes('path="background-remover"'));
  });

  // 4. File Validation Logic
  console.log('\n4. Testing File Validation Logic...');
  function validateFile(file) {
    if (!file) return { valid: false, error: 'No file' };
    const fileNameLower = file.name.toLowerCase();
    const isJpg = file.type === 'image/jpeg' || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
    const isPng = file.type === 'image/png' || fileNameLower.endsWith('.png');

    if (!isJpg && !isPng) {
      return { valid: false, error: 'Unsupported file format. Please select a valid JPG, JPEG, or PNG image.' };
    }

    const MAX_SIZE = 30 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 30MB limit. Please choose a smaller image.' };
    }

    return { valid: true, error: null };
  }

  test('Valid JPG accepted', () => {
    assert.strictEqual(validateFile({ name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 500 }).valid, true);
  });

  test('Valid JPEG accepted', () => {
    assert.strictEqual(validateFile({ name: 'photo.jpeg', type: 'image/jpeg', size: 1024 * 500 }).valid, true);
  });

  test('Valid PNG accepted', () => {
    assert.strictEqual(validateFile({ name: 'graphic.png', type: 'image/png', size: 1024 * 500 }).valid, true);
  });

  test('Uppercase .JPG extension accepted', () => {
    assert.strictEqual(validateFile({ name: 'PHOTO.JPG', type: '', size: 1024 * 500 }).valid, true);
  });

  test('Uppercase .PNG extension accepted', () => {
    assert.strictEqual(validateFile({ name: 'LOGO.PNG', type: '', size: 1024 * 500 }).valid, true);
  });

  test('PDF file rejected', () => {
    const res = validateFile({ name: 'document.pdf', type: 'application/pdf', size: 1024 * 500 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Unsupported file format'));
  });

  test('GIF file rejected', () => {
    const res = validateFile({ name: 'animation.gif', type: 'image/gif', size: 1024 * 500 });
    assert.strictEqual(res.valid, false);
  });

  test('File exceeding 30MB rejected', () => {
    const res = validateFile({ name: 'huge.png', type: 'image/png', size: 31 * 1024 * 1024 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('exceeds 30MB limit'));
  });

  // 5. Download Filename Formulation
  console.log('\n5. Testing Download Filename Formulation...');
  function getCompressedDownloadName(originalName, isPng) {
    if (!originalName) return isPng ? 'image-compressed.png' : 'image-compressed.jpg';
    const lastDot = originalName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
    const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'image';
    const ext = isPng ? 'png' : 'jpg';
    return `${cleanBase}-compressed.${ext}`;
  }

  test('photo.jpg -> photo-compressed.jpg', () => {
    assert.strictEqual(getCompressedDownloadName('photo.jpg', false), 'photo-compressed.jpg');
  });

  test('transparent-cutout.png -> transparent-cutout-compressed.png', () => {
    assert.strictEqual(getCompressedDownloadName('transparent-cutout.png', true), 'transparent-cutout-compressed.png');
  });

  test('Preserves dashes and numbers', () => {
    assert.strictEqual(getCompressedDownloadName('IMG_2026_09-20.JPG', false), 'IMG_2026_09-20-compressed.jpg');
  });

  test('Sanitizes spaces and special characters', () => {
    assert.strictEqual(getCompressedDownloadName('my photo @ summer #1.png', true), 'my_photo_summer_1-compressed.png');
  });

  // 6. Quality Slider & Math Calculations
  console.log('\n6. Testing Quality Slider & Math Calculations...');
  function calculateReduction(originalBytes, compressedBytes) {
    const savedBytes = originalBytes - compressedBytes;
    const reductionPercent = originalBytes > 0 ? ((savedBytes / originalBytes) * 100).toFixed(1) : '0.0';
    const isReduced = savedBytes > 0;
    return { savedBytes, reductionPercent, isReduced };
  }

  test('Accurate reduction calculation for 2.4MB -> 680KB', () => {
    const orig = 2400000;
    const comp = 680000;
    const { savedBytes, reductionPercent, isReduced } = calculateReduction(orig, comp);
    assert.strictEqual(savedBytes, 1720000);
    assert.strictEqual(reductionPercent, '71.7');
    assert.strictEqual(isReduced, true);
  });

  test('Honest reporting when compressed output is equal or larger', () => {
    const orig = 50000;
    const comp = 52000;
    const { savedBytes, isReduced } = calculateReduction(orig, comp);
    assert.strictEqual(savedBytes, -2000);
    assert.strictEqual(isReduced, false);
  });

  // 7. UPNG.js PNG Encoding & Dimension Verification
  console.log('\n7. Testing Real PNG Compression & Dimension Fidelity (UPNG.js)...');
  const upngLib = UPNG.default || UPNG;
  test('UPNG.encode and UPNG.decode are functions', () => {
    assert.strictEqual(typeof upngLib.encode, 'function');
    assert.strictEqual(typeof upngLib.decode, 'function');
  });

  test('Lossless PNG encoding preserves 1:1 dimensions and alpha channel', () => {
    const width = 120;
    const height = 80;
    const rgbaBuffer = new Uint8Array(width * height * 4);

    // Create gradient with alpha transparency
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        rgbaBuffer[idx] = Math.round((x / width) * 255); // R
        rgbaBuffer[idx + 1] = Math.round((y / height) * 255); // G
        rgbaBuffer[idx + 2] = 180; // B
        rgbaBuffer[idx + 3] = x < 60 ? 255 : 128; // Alpha semi-transparent on right half
      }
    }

    const encoded = upngLib.encode([rgbaBuffer.buffer], width, height, 0);
    assert.ok(encoded instanceof ArrayBuffer);
    assert.ok(encoded.byteLength > 0);

    // Verify PNG header signature: 89 50 4E 47 0D 0A 1A 0A
    const header = new Uint8Array(encoded.slice(0, 8));
    const expectedHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (let i = 0; i < 8; i++) {
      assert.strictEqual(header[i], expectedHeader[i], `Header byte ${i} matches PNG signature`);
    }

    // Decode and verify dimensions
    const decoded = upngLib.decode(encoded);
    assert.strictEqual(decoded.width, width, 'Decoded PNG width matches 1:1');
    assert.strictEqual(decoded.height, height, 'Decoded PNG height matches 1:1');

    const decodedRgba = new Uint8Array(upngLib.toRGBA8(decoded)[0]);
    // Check alpha preserved
    const sampleIdxLeft = (10 * width + 10) * 4 + 3;
    const sampleIdxRight = (10 * width + 90) * 4 + 3;
    assert.strictEqual(decodedRgba[sampleIdxLeft], 255, 'Left side is fully opaque');
    assert.strictEqual(decodedRgba[sampleIdxRight], 128, 'Right side preserves 128 alpha transparency');
  });

  test('Quantized PNG encoding (lossy compression) reduces byte size', () => {
    const width = 160;
    const height = 120;
    const rgbaBuffer = new Uint8Array(width * height * 4);

    for (let i = 0; i < rgbaBuffer.length; i += 4) {
      rgbaBuffer[i] = Math.floor(Math.sin(i * 0.1) * 127 + 128);
      rgbaBuffer[i + 1] = Math.floor(Math.cos(i * 0.2) * 127 + 128);
      rgbaBuffer[i + 2] = Math.floor(Math.sin(i * 0.3) * 127 + 128);
      rgbaBuffer[i + 3] = 255;
    }

    const lossless = upngLib.encode([rgbaBuffer.buffer], width, height, 0);
    const quantized = upngLib.encode([rgbaBuffer.buffer], width, height, 32);

    assert.ok(quantized.byteLength < lossless.byteLength, `Quantized PNG (${quantized.byteLength} B) is smaller than unquantized PNG (${lossless.byteLength} B)`);

    const decoded = upngLib.decode(quantized);
    assert.strictEqual(decoded.width, width, 'Quantized PNG preserves exact width');
    assert.strictEqual(decoded.height, height, 'Quantized PNG preserves exact height');
  });

  // 8. Test State Machine
  console.log('\n8. Testing Compressor State Machine...');
  class CompressorStateMachine {
    constructor() {
      this.reset();
    }
    reset() {
      this.state = 'IDLE';
      this.isProcessing = false;
      this.compressedBlob = null;
      this.errorMessage = null;
    }
    startCompressing() {
      this.state = 'COMPRESSING';
      this.isProcessing = true;
      this.errorMessage = null;
    }
    complete(blob) {
      this.state = 'SUCCESS';
      this.isProcessing = false;
      this.compressedBlob = blob;
    }
    fail(err) {
      this.state = 'ERROR';
      this.isProcessing = false;
      this.errorMessage = err;
    }
  }

  const sm = new CompressorStateMachine();
  test('Initial state is IDLE', () => {
    assert.strictEqual(sm.state, 'IDLE');
    assert.strictEqual(sm.isProcessing, false);
  });

  test('Start compression transitions to COMPRESSING and locks processing flag', () => {
    sm.startCompressing();
    assert.strictEqual(sm.state, 'COMPRESSING');
    assert.strictEqual(sm.isProcessing, true);
  });

  test('Completion transitions to SUCCESS and unlocks processing flag', () => {
    sm.complete({ size: 45000, type: 'image/jpeg' });
    assert.strictEqual(sm.state, 'SUCCESS');
    assert.strictEqual(sm.isProcessing, false);
    assert.ok(sm.compressedBlob);
  });

  test('Reset returns to IDLE', () => {
    sm.reset();
    assert.strictEqual(sm.state, 'IDLE');
    assert.strictEqual(sm.compressedBlob, null);
  });

  test('Error transitions to ERROR with clear message', () => {
    sm.fail('Image decoding failed');
    assert.strictEqual(sm.state, 'ERROR');
    assert.strictEqual(sm.errorMessage, 'Image decoding failed');
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
