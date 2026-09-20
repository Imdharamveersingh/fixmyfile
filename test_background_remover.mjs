import fs from 'fs';
import path from 'path';
import { PHASE_1_TOOLS, PHASE_2_TOOLS, ALL_TOOLS, getToolByPath, getToolById } from './src/tools/toolsRegistry.js';

async function runBackgroundRemoverTests() {
  console.log('=== Background Remover Automated Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      failed++;
    }
  }

  // 1. Tool Registry Tests
  console.log('1. Checking Tool Registry & Route Definitions...');
  assert(PHASE_2_TOOLS.length === 1, 'Phase 2 has exactly 1 tool registered so far');
  assert(ALL_TOOLS.length === 7, 'ALL_TOOLS contains 7 tools in total (6 Phase 1 + 1 Phase 2)');
  const bgTool = getToolById('background-remover');
  assert(bgTool !== undefined, 'getToolById("background-remover") found');
  assert(bgTool?.path === '/background-remover', 'Background remover path is /background-remover');
  assert(bgTool?.category === 'Image Editing', 'Category is Image Editing');
  assert(bgTool?.phase === 'Phase 2', 'Phase is Phase 2');
  assert(bgTool?.status === 'Ready', 'Status is Ready');

  const bgByPath = getToolByPath('/background-remover');
  assert(bgByPath?.id === 'background-remover', 'getToolByPath("/background-remover") resolves correctly');

  // 2. Existing Phase 1 Routes Unbroken
  console.log('\n2. Verifying All Phase 1 Routes Remain Intact...');
  assert(PHASE_1_TOOLS.length === 6, 'Phase 1 has all 6 tools');
  const expectedPhase1Paths = [
    '/jpg-to-pdf',
    '/pdf-to-word',
    '/pdf-to-jpg',
    '/word-to-pdf',
    '/merge-pdf',
    '/compress-pdf'
  ];
  expectedPhase1Paths.forEach((p) => {
    assert(getToolByPath(p) !== undefined, `Phase 1 route ${p} remains registered`);
  });

  // 3. Router Component Route Verification in App.jsx
  console.log('\n3. Verifying App.jsx Route Setup...');
  const appJsx = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8');
  assert(appJsx.includes('path="background-remover"'), 'App.jsx contains path="background-remover"');
  assert(appJsx.includes('import BackgroundRemoverTool'), 'App.jsx imports BackgroundRemoverTool');
  expectedPhase1Paths.forEach((p) => {
    const routePath = p.replace('/', '');
    assert(appJsx.includes(`path="${routePath}"`), `App.jsx still has path="${routePath}"`);
  });

  // 4. File Validation Logic Test
  console.log('\n4. Testing File Validation Logic...');
  function validateFile(name, type, size) {
    const fileNameLower = name.toLowerCase();
    const isJpg = type === 'image/jpeg' || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
    const isPng = type === 'image/png' || fileNameLower.endsWith('.png');

    if (!isJpg && !isPng) {
      return { valid: false, error: 'Unsupported file format. Please select a valid JPG, JPEG, or PNG image.' };
    }

    const MAX_SIZE = 25 * 1024 * 1024;
    if (size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds the 25MB limit.' };
    }

    return { valid: true, error: null };
  }

  assert(validateFile('portrait.jpg', 'image/jpeg', 1024 * 500).valid, 'Valid JPG accepted');
  assert(validateFile('photo.jpeg', 'image/jpeg', 1024 * 500).valid, 'Valid JPEG accepted');
  assert(validateFile('graphic.png', 'image/png', 1024 * 800).valid, 'Valid PNG accepted');
  assert(validateFile('UPPERCASE.JPG', '', 1024 * 200).valid, 'Uppercase .JPG extension accepted');
  assert(validateFile('DOCUMENT.PNG', '', 1024 * 200).valid, 'Uppercase .PNG extension accepted');

  assert(!validateFile('doc.pdf', 'application/pdf', 1024).valid, 'PDF file rejected');
  assert(!validateFile('animation.gif', 'image/gif', 1024).valid, 'GIF file rejected');
  assert(!validateFile('script.js', 'text/javascript', 1024).valid, 'JS file rejected');
  assert(!validateFile('large.jpg', 'image/jpeg', 26 * 1024 * 1024).valid, 'File exceeding 25MB rejected');

  // 5. Download Filename Formulation Test
  console.log('\n5. Testing Download Filename Formulation...');
  function generateOutputFilename(originalName) {
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'image';
    return `${cleanBaseName}-no-bg.png`;
  }

  assert(generateOutputFilename('photo.jpg') === 'photo-no-bg.png', 'photo.jpg -> photo-no-bg.png');
  assert(generateOutputFilename('My Portrait 2026.png') === 'My Portrait 2026-no-bg.png', 'Preserves spaces/numbers');
  assert(generateOutputFilename('test@#$.jpeg') === 'test-no-bg.png', 'Sanitizes special characters');
  assert(generateOutputFilename('.png') === 'image-no-bg.png', 'Falls back to image-no-bg.png if blank');

  // 6. Engine Package Resolution & Named Exports
  console.log('\n6. Verifying Engine Package & Exports...');
  const imglyModule = await import('@imgly/background-removal');
  assert(typeof imglyModule.removeBackground === 'function', '@imgly/background-removal exports removeBackground');
  assert(typeof imglyModule.preload === 'function', '@imgly/background-removal exports preload');

  // 7. Test Summary
  console.log(`\n=== Automated Test Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

runBackgroundRemoverTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
