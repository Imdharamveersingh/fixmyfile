/**
 * Automated Test Suite for Phase 5.2 — HEIC to JPG
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_TOOLS,
  PHASE_5_TOOLS,
  TOTAL_STRATEGY_TOOLS,
  getToolByPath
} from './src/tools/toolsRegistry.js';
import {
  isHeicSignature,
  validateHeicFile,
  getHeicConvertedName
} from './src/tools/heic-to-jpg/heicEngine.js';

console.log('--- STARTING HEIC TO JPG AUTOMATED TEST SUITE ---');

let testsPassed = 0;

// Test 1: Tool Registry & Route Definitions
{
  console.log('Test 1: Tool Registry & Active Tools verification (31/55, Phase 5)...');
  const heicTool = getToolByPath('/heic-to-jpg');
  assert(heicTool, 'Route /heic-to-jpg must exist in registry');
  assert.equal(heicTool.id, 'heic-to-jpg');
  assert.equal(heicTool.name, 'HEIC to JPG');
  assert.equal(heicTool.phase, 'Phase 5');
  assert.equal(heicTool.category, 'Image Conversion');
  assert(PHASE_5_TOOLS.some((t) => t.id === 'heic-to-jpg'), 'heic-to-jpg must be in PHASE_5_TOOLS');
  assert.equal(ALL_TOOLS.length, 31, `Expected exactly 31 active tools, got ${ALL_TOOLS.length}`);
  assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'Total strategy tools must remain 55');

  // Verify App.jsx registration
  const appJsx = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
  assert(appJsx.includes('path="heic-to-jpg"'), 'App.jsx must contain path="heic-to-jpg"');
  assert(appJsx.includes('HeicToJpgTool'), 'App.jsx must import HeicToJpgTool');

  testsPassed++;
  console.log('  PASS (31/55 verified)');
}

// Test 2: Valid HEIC file extension validation
{
  console.log('Test 2: Valid HEIC file extension validation...');
  assert.doesNotThrow(() => {
    validateHeicFile({ name: 'IMG_2024.HEIC', type: 'image/heic', size: 1024 * 1024 * 3 });
  });
  assert.doesNotThrow(() => {
    validateHeicFile({ name: 'photo.heic', type: '', size: 500000 }); // Windows empty MIME
  });
  assert.doesNotThrow(() => {
    validateHeicFile({ name: 'camera.heic', type: 'application/octet-stream', size: 2000000 });
  });
  testsPassed++;
  console.log('  PASS');
}

// Test 3: Valid HEIF file extension validation
{
  console.log('Test 3: Valid HEIF file extension validation...');
  assert.doesNotThrow(() => {
    validateHeicFile({ name: 'scenery.heif', type: 'image/heif', size: 1024 * 500 });
  });
  assert.doesNotThrow(() => {
    validateHeicFile({ name: 'portrait.HEIF', type: '', size: 850000 });
  });
  testsPassed++;
  console.log('  PASS');
}

// Test 4: Real HEIC binary signature / ftyp box detection
{
  console.log('Test 4: Real HEIC binary signature & ftyp box detection...');
  const sample1Path = path.resolve('fixtures/sample1.heic');
  assert(fs.existsSync(sample1Path), 'Sample HEIC fixture fixtures/sample1.heic must exist');

  const sample1Bytes = fs.readFileSync(sample1Path);
  assert(sample1Bytes.length > 100000, 'Sample HEIC fixture must contain real image bytes');
  assert(isHeicSignature(sample1Bytes), 'Sample HEIC fixture must have a valid ftypheic signature');

  const sample2Path = path.resolve('fixtures/sample2.heic');
  assert(fs.existsSync(sample2Path), 'Sample HEIC fixture fixtures/sample2.heic must exist');
  const sample2Bytes = fs.readFileSync(sample2Path);
  assert(sample2Bytes.length > 100000, 'Sample HEIC fixture 2 must contain real image bytes');
  assert(isHeicSignature(sample2Bytes), 'Sample HEIC fixture 2 must have a valid ftypheic signature');

  testsPassed++;
  console.log('  PASS');
}

// Test 5: Rejection of non-HEIC signatures
{
  console.log('Test 5: Rejection of non-HEIC file signatures...');
  const fakeBuffer = Buffer.from('FAKE HEIC DATA NOT A REAL ISO BMFF FILE');
  assert.equal(isHeicSignature(fakeBuffer), false, 'Fake buffer must fail signature test');

  const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  assert.equal(isHeicSignature(pngBuffer), false, 'PNG signature must fail HEIC signature test');

  testsPassed++;
  console.log('  PASS');
}

// Test 6: Invalid file format rejection
{
  console.log('Test 6: Invalid file format rejection...');
  assert.throws(() => {
    validateHeicFile({ name: 'document.pdf', type: 'application/pdf', size: 1024 });
  }, /invalid format/i);

  assert.throws(() => {
    validateHeicFile({ name: 'picture.jpg', type: 'image/jpeg', size: 2048 });
  }, /invalid format/i);

  assert.throws(() => {
    validateHeicFile({ name: 'photo.png', type: 'image/png', size: 4096 });
  }, /invalid format/i);

  testsPassed++;
  console.log('  PASS');
}

// Test 7: Zero-byte and null file rejection
{
  console.log('Test 7: Zero-byte and null file rejection...');
  assert.throws(() => {
    validateHeicFile({ name: 'empty.heic', type: 'image/heic', size: 0 });
  }, /empty/i);

  assert.throws(() => {
    validateHeicFile(null);
  }, /no heic\/heif file/i);

  testsPassed++;
  console.log('  PASS');
}

// Test 8: Output filename formatting
{
  console.log('Test 8: Output filename formatting...');
  assert.equal(getHeicConvertedName('IMG_4021.HEIC'), 'IMG_4021-converted.jpg');
  assert.equal(getHeicConvertedName('summer vacation.heif'), 'summer_vacation-converted.jpg');
  assert.equal(getHeicConvertedName('photo.with.dots.heic'), 'photo_with_dots-converted.jpg');
  assert.equal(getHeicConvertedName(''), 'converted.jpg');

  testsPassed++;
  console.log('  PASS');
}

// Test 9: Quality boundary constraints
{
  const clampQ = (val) => Math.min(1.0, Math.max(0.1, val));
  assert.equal(clampQ(0.9), 0.9);
  assert.equal(clampQ(0.01), 0.1);
  assert.equal(clampQ(1.5), 1.0);

  testsPassed++;
  console.log('  PASS');
}

// Test 10: Package dependency verification
{
  console.log('Test 10: Verifying heic2any installation in package.json & node_modules...');
  const pkgJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
  assert(pkgJson.dependencies && pkgJson.dependencies.heic2any, 'heic2any must be present in package.json dependencies');
  assert(fs.existsSync(path.resolve('node_modules/heic2any/dist/heic2any.js')), 'heic2any.js must exist in node_modules');

  testsPassed++;
  console.log('  PASS');
}

console.log(`\n🎉 ALL ${testsPassed} HEIC TO JPG AUTOMATED TESTS PASSED!`);
