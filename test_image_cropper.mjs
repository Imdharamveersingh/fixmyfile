/**
 * Automated Test Suite for Phase 5.1 — Image Cropper
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import UPNG from 'upng-js';
import {
  ALL_TOOLS,
  PHASE_5_TOOLS,
  TOTAL_STRATEGY_TOOLS,
  getToolByPath
} from './src/tools/toolsRegistry.js';
import {
  validateImageFile,
  clampCropCoordinates,
  calculateInitialCrop,
  enforceAspectRatio,
  getCroppedDownloadName,
  resolveOutputFormat
} from './src/tools/image-cropper/cropEngine.js';

console.log('--- STARTING IMAGE CROPPER AUTOMATED TEST SUITE ---');

let testsPassed = 0;

// Test 1: Route & Registry verification
{
  console.log('Test 1: Tool Registry & Active Tools verification (30/55, Phase 5)...');
  const cropTool = getToolByPath('/image-cropper');
  assert(cropTool, 'Route /image-cropper must exist in registry');
  assert.equal(cropTool.id, 'image-cropper');
  assert.equal(cropTool.name, 'Image Cropper');
  assert.equal(cropTool.phase, 'Phase 5');
  assert.equal(cropTool.category, 'Image Editing');
  assert(PHASE_5_TOOLS.some((t) => t.id === 'image-cropper'), 'image-cropper must be in PHASE_5_TOOLS');
  assert(ALL_TOOLS.length >= 30, `Expected at least 30 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');

  // Verify App.jsx registration
  const appJsx = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
  assert(appJsx.includes('path="image-cropper"'), 'App.jsx must contain path="image-cropper"');
  assert(appJsx.includes('ImageCropperTool'), 'App.jsx must import ImageCropperTool');

  testsPassed++;
  console.log('  PASS (30/55 verified)');
}

// Test 2: Valid JPG acceptance
{
  console.log('Test 2: Valid JPG validation...');
  assert.doesNotThrow(() => {
    validateImageFile({ name: 'photo.jpg', type: 'image/jpeg', size: 1024 * 500 });
  });
  assert.doesNotThrow(() => {
    validateImageFile({ name: 'picture.jpeg', type: 'image/jpeg', size: 2048 });
  });
  testsPassed++;
  console.log('  PASS');
}

// Test 3: Valid PNG acceptance
{
  console.log('Test 3: Valid PNG validation...');
  assert.doesNotThrow(() => {
    validateImageFile({ name: 'transparent_logo.png', type: 'image/png', size: 1024 * 1024 });
  });
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Valid WebP acceptance
{
  console.log('Test 4: Valid WebP validation...');
  assert.doesNotThrow(() => {
    validateImageFile({ name: 'banner.webp', type: 'image/webp', size: 85000 });
  });
  testsPassed++;
  console.log('  PASS');
}

// Test 5: Crop dimensions calculation & boundary clamping
{
  console.log('Test 5: Crop dimensions calculation & boundary clamping...');
  const naturalW = 1920;
  const naturalH = 1080;

  // Unconstrained crop within bounds
  const crop = { x: 100, y: 100, width: 800, height: 600 };
  const clamped = clampCropCoordinates(crop, naturalW, naturalH);
  assert.equal(clamped.x, 100);
  assert.equal(clamped.y, 100);
  assert.equal(clamped.width, 800);
  assert.equal(clamped.height, 600);

  // Negative coordinates clamped to 0
  const negCrop = { x: -50, y: -20, width: 500, height: 400 };
  const clampedNeg = clampCropCoordinates(negCrop, naturalW, naturalH);
  assert.equal(clampedNeg.x, 0);
  assert.equal(clampedNeg.y, 0);

  // Overflowing coordinates clamped within canvas
  const overCrop = { x: 1500, y: 800, width: 1000, height: 800 };
  const clampedOver = clampCropCoordinates(overCrop, naturalW, naturalH);
  assert(clampedOver.x + clampedOver.width <= naturalW, 'Crop must not exceed natural width');
  assert(clampedOver.y + clampedOver.height <= naturalH, 'Crop must not exceed natural height');

  testsPassed++;
  console.log('  PASS');
}

// Test 6: 1:1 Square aspect ratio crop
{
  console.log('Test 6: 1:1 Square aspect ratio crop calculation...');
  const naturalW = 1920;
  const naturalH = 1080;

  const squareCrop = calculateInitialCrop(naturalW, naturalH, '1:1');
  assert.equal(squareCrop.width, squareCrop.height, 'Width and height must be equal for 1:1');
  assert(squareCrop.width <= naturalH, 'Square crop height must fit inside image');
  assert.equal(squareCrop.x, Math.round((naturalW - squareCrop.width) / 2), 'Must be centered horizontally');
  assert.equal(squareCrop.y, Math.round((naturalH - squareCrop.height) / 2), 'Must be centered vertically');

  testsPassed++;
  console.log('  PASS');
}

// Test 7: 16:9 Widescreen aspect ratio crop
{
  console.log('Test 7: 16:9 Widescreen aspect ratio crop calculation...');
  const naturalW = 1080;
  const naturalH = 1920; // Portrait image

  const wideCrop = calculateInitialCrop(naturalW, naturalH, '16:9');
  const ratio = wideCrop.width / wideCrop.height;
  assert(Math.abs(ratio - 16 / 9) < 0.05, `Ratio should be ~1.777, got ${ratio}`);
  assert(wideCrop.width <= naturalW);
  assert(wideCrop.height <= naturalH);

  testsPassed++;
  console.log('  PASS');
}

// Test 8: Portrait 3:4 aspect ratio crop
{
  console.log('Test 8: Portrait 3:4 aspect ratio crop calculation...');
  const naturalW = 1920;
  const naturalH = 1080; // Landscape image

  const portraitCrop = calculateInitialCrop(naturalW, naturalH, '3:4');
  const ratio = portraitCrop.width / portraitCrop.height;
  assert(Math.abs(ratio - 3 / 4) < 0.05, `Ratio should be ~0.75, got ${ratio}`);
  assert(portraitCrop.width <= naturalW);
  assert(portraitCrop.height <= naturalH);

  testsPassed++;
  console.log('  PASS');
}

// Test 9: Transparent PNG format resolution
{
  console.log('Test 9: Transparent PNG format resolution...');
  const pngAuto = resolveOutputFormat('auto', 'image/png', 'icon.png');
  assert.equal(pngAuto.mime, 'image/png');
  assert.equal(pngAuto.ext, 'png');
  assert.equal(pngAuto.isTransparent, true, 'PNG output must preserve transparency');

  const pngExplicit = resolveOutputFormat('png', 'image/jpeg', 'photo.jpg');
  assert.equal(pngExplicit.mime, 'image/png');
  assert.equal(pngExplicit.isTransparent, true);

  const jpegAuto = resolveOutputFormat('auto', 'image/jpeg', 'photo.jpg');
  assert.equal(jpegAuto.mime, 'image/jpeg');
  assert.equal(jpegAuto.isTransparent, false);

  testsPassed++;
  console.log('  PASS');
}

// Test 10: Invalid file rejection
{
  console.log('Test 10: Invalid file rejection...');
  assert.throws(() => {
    validateImageFile({ name: 'document.pdf', type: 'application/pdf', size: 1024 });
  }, /unsupported format/i);

  assert.throws(() => {
    validateImageFile({ name: 'notes.txt', type: 'text/plain', size: 500 });
  }, /unsupported format/i);

  testsPassed++;
  console.log('  PASS');
}

// Test 11: Corrupted / zero-byte file rejection
{
  console.log('Test 11: Zero-byte file rejection...');
  assert.throws(() => {
    validateImageFile({ name: 'empty.png', type: 'image/png', size: 0 });
  }, /empty/i);

  assert.throws(() => {
    validateImageFile(null);
  }, /no image file/i);

  testsPassed++;
  console.log('  PASS');
}

// Test 12: Output filename generation
{
  console.log('Test 12: Output filename generation...');
  assert.equal(getCroppedDownloadName('my photo.jpeg', 'jpg'), 'my_photo-cropped.jpg');
  assert.equal(getCroppedDownloadName('profile-avatar.png', 'png'), 'profile-avatar-cropped.png');
  assert.equal(getCroppedDownloadName('complex.name.with.dots.webp', 'webp'), 'complex_name_with_dots-cropped.webp');
  assert.equal(getCroppedDownloadName('', 'png'), 'cropped-image.png');

  testsPassed++;
  console.log('  PASS');
}

// Test 13: Real binary PNG generation and decoding via upng-js
{
  console.log('Test 13: Binary PNG fixture decoding & natural dimensions test...');
  // Create a 100x100 32-bit RGBA test PNG
  const width = 100;
  const height = 100;
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 255;     // R
    rgba[i + 1] = 128; // G
    rgba[i + 2] = 0;   // B
    rgba[i + 3] = 200; // A (semi-transparent)
  }

  const pngBuffer = UPNG.encode([rgba.buffer], width, height, 0);
  assert(pngBuffer.byteLength > 0, 'Generated PNG buffer must not be empty');

  const decoded = UPNG.decode(pngBuffer);
  assert.equal(decoded.width, 100);
  assert.equal(decoded.height, 100);
  const rgbaFrames = UPNG.toRGBA8(decoded);
  assert(rgbaFrames && rgbaFrames.length > 0, 'Must decode at least one frame');
  assert.equal(rgbaFrames[0].byteLength, 100 * 100 * 4);

  testsPassed++;
  console.log('  PASS');
}

// Test 14: Minimum dimension guard
{
  console.log('Test 14: Minimum dimension guard...');
  const tinyCrop = { x: 10, y: 10, width: 2, height: 3 };
  const clampedTiny = clampCropCoordinates(tinyCrop, 500, 500, 24);
  assert(clampedTiny.width >= 24, 'Width must satisfy minimum dimension');
  assert(clampedTiny.height >= 24, 'Height must satisfy minimum dimension');

  testsPassed++;
  console.log('  PASS');
}

// Test 15: Aspect ratio enforcement helper
{
  console.log('Test 15: Aspect ratio enforcement helper...');
  const enforcedW = enforceAspectRatio(800, 600, 16 / 9, 'width');
  assert.equal(enforcedW.width, 800);
  assert.equal(enforcedW.height, 450); // 800 / (16/9) = 450

  const enforcedH = enforceAspectRatio(800, 600, 16 / 9, 'height');
  assert.equal(enforcedH.height, 600);
  assert.equal(enforcedH.width, 1067); // 600 * (16/9) = 1066.67 -> 1067

  testsPassed++;
  console.log('  PASS');
}

// Test 16: 4:5 Social aspect ratio crop calculation
{
  console.log('Test 16: 4:5 Social aspect ratio crop calculation...');
  const crop45 = calculateInitialCrop(1000, 1000, '4:5');
  const ratio = crop45.width / crop45.height;
  assert(Math.abs(ratio - 4 / 5) < 0.05, `Ratio should be 0.8, got ${ratio}`);
  testsPassed++;
  console.log('  PASS');
}

// Test 17: 3:2 Classic landscape aspect ratio crop calculation
{
  console.log('Test 17: 3:2 Classic landscape aspect ratio crop calculation...');
  const crop32 = calculateInitialCrop(1200, 1200, '3:2');
  const ratio = crop32.width / crop32.height;
  assert(Math.abs(ratio - 3 / 2) < 0.05, `Ratio should be 1.5, got ${ratio}`);
  testsPassed++;
  console.log('  PASS');
}

// Test 18: 2:3 Portrait aspect ratio crop calculation
{
  console.log('Test 18: 2:3 Portrait aspect ratio crop calculation...');
  const crop23 = calculateInitialCrop(1200, 1200, '2:3');
  const ratio = crop23.width / crop23.height;
  assert(Math.abs(ratio - 2 / 3) < 0.05, `Ratio should be 0.667, got ${ratio}`);
  testsPassed++;
  console.log('  PASS');
}

// Test 19: Freeform aspect ratio crop calculation
{
  console.log('Test 19: Freeform aspect ratio crop calculation...');
  const cropFree = calculateInitialCrop(800, 600, 'free');
  assert.equal(cropFree.width, 720); // 90% of 800
  assert.equal(cropFree.height, 540); // 90% of 600
  testsPassed++;
  console.log('  PASS');
}

// Test 20: Edge-boundary clamping (coordinates exceeding natural bounds)
{
  console.log('Test 20: Edge-boundary clamping (coordinates exceeding natural bounds)...');
  const outOfBoundsCrop = { x: 950, y: 750, width: 200, height: 200 };
  const clamped = clampCropCoordinates(outOfBoundsCrop, 1000, 800);
  assert(clamped.x + clamped.width <= 1000, 'Crop box must not exceed natural width');
  assert(clamped.y + clamped.height <= 800, 'Crop box must not exceed natural height');
  testsPassed++;
  console.log('  PASS');
}

console.log(`\n🎉 ALL ${testsPassed} IMAGE CROPPER AUTOMATED TESTS PASSED!`);
