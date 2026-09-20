/**
 * Difficult / Edge Case Benchmark for Phase 5.1 — Image Cropper
 */
import assert from 'node:assert';
import UPNG from 'upng-js';
import {
  clampCropCoordinates,
  calculateInitialCrop,
  resolveOutputFormat
} from './src/tools/image-cropper/cropEngine.js';

console.log('=== STARTING DIFFICULT IMAGE CROPPER BENCHMARK ===\n');

// 1. Create a High-Resolution Transparent PNG (2400x1600) with intricate alpha patterns
console.log('1. Generating 2400x1600 High-Res Transparent PNG fixture...');
const highResW = 2400;
const highResH = 1600;
const rgbaBuffer = new Uint8Array(highResW * highResH * 4);

let transparentPixelsCount = 0;
let opaquePixelsCount = 0;

for (let y = 0; y < highResH; y++) {
  for (let x = 0; x < highResW; x++) {
    const idx = (y * highResW + x) * 4;
    // Circular transparent cutout in the middle
    const dx = x - highResW / 2;
    const dy = y - highResH / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 300) {
      // Fully transparent center
      rgbaBuffer[idx] = 0;
      rgbaBuffer[idx + 1] = 0;
      rgbaBuffer[idx + 2] = 0;
      rgbaBuffer[idx + 3] = 0; // Alpha = 0
      transparentPixelsCount++;
    } else {
      rgbaBuffer[idx] = (x * 7) % 255;
      rgbaBuffer[idx + 1] = (y * 5) % 255;
      rgbaBuffer[idx + 2] = 220;
      rgbaBuffer[idx + 3] = 255; // Alpha = 255
      opaquePixelsCount++;
    }
  }
}

const highResPngBytes = UPNG.encode([rgbaBuffer.buffer], highResW, highResH, 0);
console.log(`   Encoded High-Res PNG size: ${(highResPngBytes.byteLength / 1024 / 1024).toFixed(2)} MB`);
assert(highResPngBytes.byteLength > 0, 'High-res PNG fixture must be created');

// Verify decoded fixture
const decodedHighRes = UPNG.decode(highResPngBytes);
assert.equal(decodedHighRes.width, 2400);
assert.equal(decodedHighRes.height, 1600);
console.log('   High-res fixture decoded successfully!');

// 2. Perform extreme crop coordinates verification
console.log('2. Testing precision crop mapping and coordinate clamping on high-res dimensions...');
const edgeCrop1 = { x: 2350, y: 1550, width: 200, height: 200 };
const clampedEdge1 = clampCropCoordinates(edgeCrop1, highResW, highResH, 24);
assert.equal(clampedEdge1.x + clampedEdge1.width, highResW, 'Right boundary must clamp strictly to 2400');
assert.equal(clampedEdge1.y + clampedEdge1.height, highResH, 'Bottom boundary must clamp strictly to 1600');
console.log('   Boundary clamping verified:', clampedEdge1);

// 3. Test Unusual Aspect Ratio 1:3 Ultra-Tall Portrait (800x2400)
console.log('3. Testing Ultra-Tall Portrait (800x2400) with 16:9 widescreen crop preset...');
const tallW = 800;
const tallH = 2400;
const crop16_9OnTall = calculateInitialCrop(tallW, tallH, '16:9');
console.log('   16:9 crop on 800x2400:', crop16_9OnTall);
assert(crop16_9OnTall.width <= tallW, 'Crop width must fit inside tall image width');
assert(crop16_9OnTall.height <= tallH, 'Crop height must fit inside tall image height');
const tallRatio = crop16_9OnTall.width / crop16_9OnTall.height;
assert(Math.abs(tallRatio - 16 / 9) < 0.05, 'Aspect ratio must match 16:9');

// 4. Test Unusual Aspect Ratio 16:3 Ultra-Wide Panorama (3200x600)
console.log('4. Testing Ultra-Wide Panorama (3200x600) with 9:16 story crop preset...');
const wideW = 3200;
const wideH = 600;
const crop9_16OnWide = calculateInitialCrop(wideW, wideH, '9:16');
console.log('   9:16 crop on 3200x600:', crop9_16OnWide);
assert(crop9_16OnWide.width <= wideW, 'Crop width must fit inside wide image width');
assert(crop9_16OnWide.height <= wideH, 'Crop height must fit inside wide image height');
const wideRatio = crop9_16OnWide.width / crop9_16OnWide.height;
assert(Math.abs(wideRatio - 9 / 16) < 0.05, 'Aspect ratio must match 9:16');

// 5. Test Precision Slicing & Alpha Preservation directly on binary RGBA
console.log('5. Verifying direct RGBA pixel extraction and transparency retention...');
// Crop the center region (1000x1000 at x: 700, y: 300) containing the transparent circle
const sliceCrop = { x: 700, y: 300, width: 1000, height: 1000 };
const slicedRgba = new Uint8Array(sliceCrop.width * sliceCrop.height * 4);

for (let row = 0; row < sliceCrop.height; row++) {
  const srcY = sliceCrop.y + row;
  const srcRowStart = (srcY * highResW + sliceCrop.x) * 4;
  const dstRowStart = row * sliceCrop.width * 4;
  const rowBytes = sliceCrop.width * 4;
  slicedRgba.set(rgbaBuffer.subarray(srcRowStart, srcRowStart + rowBytes), dstRowStart);
}

// Encode cropped slice to PNG
const croppedSlicePngBytes = UPNG.encode([slicedRgba.buffer], sliceCrop.width, sliceCrop.height, 0);
assert(croppedSlicePngBytes.byteLength > 0, 'Cropped slice PNG must not be empty');

// Decode cropped slice and verify dimensions & transparency
const decodedSlice = UPNG.decode(croppedSlicePngBytes);
assert.equal(decodedSlice.width, 1000);
assert.equal(decodedSlice.height, 1000);

const decodedFrames = UPNG.toRGBA8(decodedSlice);
const decodedSliceRgba = new Uint8Array(decodedFrames[0]);

let foundTransparent = false;
let foundOpaque = false;

for (let i = 3; i < decodedSliceRgba.length; i += 4) {
  if (decodedSliceRgba[i] === 0) foundTransparent = true;
  if (decodedSliceRgba[i] === 255) foundOpaque = true;
  if (foundTransparent && foundOpaque) break;
}

assert(foundTransparent, 'Cropped PNG must preserve transparent pixels (Alpha = 0)');
assert(foundOpaque, 'Cropped PNG must preserve opaque pixels (Alpha = 255)');
console.log('   Cropped image successfully verified: Dimensions = 1000x1000, Alpha preserved!');

// 6. Test Format Resolution under difficult conditions
console.log('6. Testing format resolution under tricky extension/mime conditions...');
const formatCheck1 = resolveOutputFormat('auto', 'application/octet-stream', 'avatar.PNG');
assert.equal(formatCheck1.mime, 'image/png');
assert.equal(formatCheck1.isTransparent, true);

const formatCheck2 = resolveOutputFormat('auto', 'image/webp', 'GRAPHIC.WEBP');
assert.equal(formatCheck2.mime, 'image/webp');
assert.equal(formatCheck2.isTransparent, true);

const formatCheck3 = resolveOutputFormat('jpeg', 'image/png', 'transparent.png');
assert.equal(formatCheck3.mime, 'image/jpeg');
assert.equal(formatCheck3.isTransparent, false, 'JPEG must not attempt alpha channel');

console.log('   All difficult format resolutions passed!');

console.log('\n🎉 ALL DIFFICULT IMAGE CROPPER TESTS PASSED SUCCESSFULLY!');
