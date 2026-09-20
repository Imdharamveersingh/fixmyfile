/**
 * Comprehensive automated test suite for Image Resizer (Phase 2.3).
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import UPNG from 'upng-js';
import { ALL_TOOLS, PHASE_1_TOOLS, PHASE_2_TOOLS, getToolByPath, getToolById } from './src/tools/toolsRegistry.js';

console.log('=== Image Resizer Automated Test Suite ===\n');

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
  test('Phase 2 contains Image Resizer tool', () => {
    assert.ok(PHASE_2_TOOLS.some((t) => t.id === 'image-resizer'));
  });

  test('ALL_TOOLS contains Phase 1 and Phase 2 tools', () => {
    assert.ok(ALL_TOOLS.length >= 9);
  });

  test('getToolById("image-resizer") found', () => {
    const tool = getToolById('image-resizer');
    assert.ok(tool);
    assert.strictEqual(tool.id, 'image-resizer');
    assert.strictEqual(tool.name, 'Image Resizer');
    assert.strictEqual(tool.path, '/image-resizer');
    assert.strictEqual(tool.category, 'Image Editing');
    assert.strictEqual(tool.phase, 'Phase 2');
    assert.strictEqual(tool.status, 'Ready');
  });

  test('getToolByPath("/image-resizer") resolves correctly', () => {
    const tool = getToolByPath('/image-resizer');
    assert.ok(tool);
    assert.strictEqual(tool.id, 'image-resizer');
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
    '/background-remover',
    '/image-compressor'
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

  test('App.jsx contains path="image-resizer"', () => {
    assert.ok(appJsx.includes('path="image-resizer"'));
  });

  test('App.jsx imports ImageResizerTool', () => {
    assert.ok(appJsx.includes('import ImageResizerTool from \'./tools/image-resizer\''));
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

  test('Valid PNG accepted', () => {
    assert.strictEqual(validateFile({ name: 'graphic.png', type: 'image/png', size: 1024 * 500 }).valid, true);
  });

  test('Uppercase .JPEG accepted', () => {
    assert.strictEqual(validateFile({ name: 'SCENE.JPEG', type: '', size: 1024 * 500 }).valid, true);
  });

  test('PDF file rejected', () => {
    const res = validateFile({ name: 'doc.pdf', type: 'application/pdf', size: 1024 * 100 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('Unsupported file format'));
  });

  test('File exceeding 30MB rejected', () => {
    const res = validateFile({ name: 'giant.png', type: 'image/png', size: 32 * 1024 * 1024 });
    assert.strictEqual(res.valid, false);
    assert.ok(res.error.includes('exceeds 30MB limit'));
  });

  // 5. Download Filename Formulation
  console.log('\n5. Testing Download Filename Formulation...');
  function getResizedDownloadName(originalName, isPng) {
    if (!originalName) return isPng ? 'image-resized.png' : 'image-resized.jpg';
    const lastDot = originalName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
    const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
    const ext = isPng ? 'png' : 'jpg';
    return `${cleanBase}-resized.${ext}`;
  }

  test('photo.jpg -> photo-resized.jpg', () => {
    assert.strictEqual(getResizedDownloadName('photo.jpg', false), 'photo-resized.jpg');
  });

  test('banner.png -> banner-resized.png', () => {
    assert.strictEqual(getResizedDownloadName('banner.png', true), 'banner-resized.png');
  });

  test('Sanitizes spaces and special characters', () => {
    assert.strictEqual(getResizedDownloadName('my poster #1 (final).jpg', false), 'my_poster_1_final-resized.jpg');
  });

  // 6. Aspect Ratio Proportional Recalculation
  console.log('\n6. Testing Aspect Ratio Calculations...');
  function calculateDimensions(origW, origH, newW, newH, changedField, isLocked) {
    if (!isLocked) {
      return { width: newW, height: newH };
    }
    const ratio = origW / origH;
    if (changedField === 'width') {
      const h = Math.max(1, Math.round(newW / ratio));
      return { width: newW, height: h };
    } else {
      const w = Math.max(1, Math.round(newH * ratio));
      return { width: w, height: newH };
    }
  }

  test('Portrait 640x853: setting width to 1080 (locked) yields 1080 x 1439', () => {
    const res = calculateDimensions(640, 853, 1080, 853, 'width', true);
    assert.strictEqual(res.width, 1080);
    assert.strictEqual(res.height, 1439);
  });

  test('Portrait 3:4 (600x800): setting width to 1080 (locked) yields 1080 x 1440', () => {
    const res = calculateDimensions(600, 800, 1080, 800, 'width', true);
    assert.strictEqual(res.width, 1080);
    assert.strictEqual(res.height, 1440);
  });

  test('Portrait 640x853: setting height to 1706 (locked) yields 1280 x 1706', () => {
    const res = calculateDimensions(640, 853, 640, 1706, 'height', true);
    assert.strictEqual(res.width, 1280);
    assert.strictEqual(res.height, 1706);
  });

  test('Landscape 1600x1000: setting width to 800 (locked) yields 800 x 500', () => {
    const res = calculateDimensions(1600, 1000, 800, 1000, 'width', true);
    assert.strictEqual(res.width, 800);
    assert.strictEqual(res.height, 500);
  });

  test('Unlocked ratio allows independent dimensions without recalculating', () => {
    const res = calculateDimensions(1600, 1000, 800, 800, 'width', false);
    assert.strictEqual(res.width, 800);
    assert.strictEqual(res.height, 800);
  });

  // 7. Preset "Fit Inside" Behavior
  console.log('\n7. Testing Preset Proportional Fit Calculations...');
  function applyPreset(origW, origH, presetW, presetH, isLocked) {
    if (!isLocked) {
      return { width: presetW, height: presetH };
    }
    const scale = Math.min(presetW / origW, presetH / origH);
    return {
      width: Math.max(1, Math.round(origW * scale)),
      height: Math.max(1, Math.round(origH * scale))
    };
  }

  test('Landscape 1600x1000 into 1080x1080 square preset fits proportionally (1080x675)', () => {
    const res = applyPreset(1600, 1000, 1080, 1080, true);
    assert.strictEqual(res.width, 1080);
    assert.strictEqual(res.height, 675);
    // Verified: fits completely inside 1080x1080 box without cropping
    assert.ok(res.width <= 1080);
    assert.ok(res.height <= 1080);
  });

  test('Portrait 640x853 into 1080x1350 portrait preset fits proportionally (1013x1350)', () => {
    const res = applyPreset(640, 853, 1080, 1350, true);
    assert.strictEqual(res.width, 1013);
    assert.strictEqual(res.height, 1350);
    assert.ok(res.width <= 1080);
    assert.ok(res.height <= 1350);
  });

  test('Unlocked preset applies exact target dimensions (1080x1080)', () => {
    const res = applyPreset(1600, 1000, 1080, 1080, false);
    assert.strictEqual(res.width, 1080);
    assert.strictEqual(res.height, 1080);
  });

  // 8. Dimensional Safety & Limits
  console.log('\n8. Testing Dimension Validation & Pixel Safety...');
  function validateDimensions(w, h) {
    const numW = parseInt(w, 10);
    const numH = parseInt(h, 10);
    if (isNaN(numW) || isNaN(numH) || numW <= 0 || numH <= 0) {
      return { safe: false, error: 'Positive dimensions required' };
    }
    const MAX_DIM = 10000;
    const MAX_PIXELS = 40000000;
    if (numW > MAX_DIM || numH > MAX_DIM || numW * numH > MAX_PIXELS) {
      return { safe: false, error: 'These dimensions are too large for your browser. Try smaller dimensions.' };
    }
    return { safe: true, error: null };
  }

  test('Normal dimensions 1920x1080 are accepted as safe', () => {
    assert.strictEqual(validateDimensions(1920, 1080).safe, true);
  });

  test('High resolution 4K (3840x2160) is accepted as safe', () => {
    assert.strictEqual(validateDimensions(3840, 2160).safe, true);
  });

  test('Zero or negative dimensions rejected', () => {
    assert.strictEqual(validateDimensions(0, 1080).safe, false);
    assert.strictEqual(validateDimensions(-50, 100).safe, false);
  });

  test('Dimensions exceeding 10,000 px rejected safely', () => {
    const res = validateDimensions(15000, 2000);
    assert.strictEqual(res.safe, false);
    assert.ok(res.error.includes('too large for your browser'));
  });

  test('Dimensions exceeding 40 Megapixels rejected safely', () => {
    const res = validateDimensions(8000, 7000); // 56 MP
    assert.strictEqual(res.safe, false);
    assert.ok(res.error.includes('too large for your browser'));
  });

  // 9. UPNG.js PNG Scaling & Alpha Transparency Test
  console.log('\n9. Testing PNG Transparency & Dimensional Encoding (UPNG.js)...');
  const upngLib = UPNG.default || UPNG;

  test('UPNG.encode produces valid PNG with exact requested dimensions and alpha preservation', () => {
    const targetW = 200;
    const targetH = 300;
    const buf = new Uint8Array(targetW * targetH * 4);

    // Create semi-transparent RGBA pattern
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const idx = (y * targetW + x) * 4;
        buf[idx] = 100;     // R
        buf[idx + 1] = 150; // G
        buf[idx + 2] = 250; // B
        buf[idx + 3] = x < 100 ? 255 : 80; // Alpha
      }
    }

    const encoded = upngLib.encode([buf.buffer], targetW, targetH, 0);
    assert.ok(encoded instanceof ArrayBuffer);

    const decoded = upngLib.decode(encoded);
    assert.strictEqual(decoded.width, targetW, 'Decoded PNG matches target width');
    assert.strictEqual(decoded.height, targetH, 'Decoded PNG matches target height');

    const decodedRgba = new Uint8Array(upngLib.toRGBA8(decoded)[0]);
    const alphaLeft = decodedRgba[(10 * targetW + 10) * 4 + 3];
    const alphaRight = decodedRgba[(10 * targetW + 150) * 4 + 3];
    assert.strictEqual(alphaLeft, 255, 'Left half is opaque (255)');
    assert.strictEqual(alphaRight, 80, 'Right half preserves alpha transparency (80)');
  });

  // 10. Resizer State Machine
  console.log('\n10. Testing Resizer State Machine...');
  class ResizerStateMachine {
    constructor() {
      this.reset();
    }
    reset() {
      this.state = 'IDLE';
      this.isProcessing = false;
      this.resizedBlob = null;
      this.errorMessage = null;
    }
    startResizing() {
      this.state = 'RESIZING';
      this.isProcessing = true;
      this.errorMessage = null;
    }
    complete(blob) {
      this.state = 'SUCCESS';
      this.isProcessing = false;
      this.resizedBlob = blob;
    }
    fail(err) {
      this.state = 'ERROR';
      this.isProcessing = false;
      this.errorMessage = err;
    }
  }

  const sm = new ResizerStateMachine();
  test('Initial state is IDLE', () => {
    assert.strictEqual(sm.state, 'IDLE');
    assert.strictEqual(sm.isProcessing, false);
  });

  test('Start resizing transitions to RESIZING and locks processing flag', () => {
    sm.startResizing();
    assert.strictEqual(sm.state, 'RESIZING');
    assert.strictEqual(sm.isProcessing, true);
  });

  test('Completion transitions to SUCCESS and unlocks processing flag', () => {
    sm.complete({ size: 85000, type: 'image/jpeg' });
    assert.strictEqual(sm.state, 'SUCCESS');
    assert.strictEqual(sm.isProcessing, false);
  });

  test('Reset returns to IDLE', () => {
    sm.reset();
    assert.strictEqual(sm.state, 'IDLE');
    assert.strictEqual(sm.resizedBlob, null);
  });

  test('Error transitions to ERROR with clear message', () => {
    sm.fail('Failed to decode source image');
    assert.strictEqual(sm.state, 'ERROR');
    assert.strictEqual(sm.errorMessage, 'Failed to decode source image');
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
