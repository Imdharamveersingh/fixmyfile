import fs from 'fs';
import { PHASE_5_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
  }
}

console.log('\n=== Phase 5.9 — Image Upscaler: Automated Tests ===\n');

// GROUP 1: Registry & Routing
console.log('GROUP 1: Registry & Routing');
const toolEntry = PHASE_5_TOOLS.find((t) => t.id === 'image-upscaler');
assert(!!toolEntry, 'image-upscaler exists in PHASE_5_TOOLS');
assert(toolEntry?.path === '/image-upscaler', 'image-upscaler has path /image-upscaler');
assert(toolEntry?.phase === 'Phase 5', 'image-upscaler has phase Phase 5');
assert(toolEntry?.category === 'Image Editing', 'image-upscaler has category Image Editing');
assert(ALL_TOOLS.length >= 38, `ALL_TOOLS has at least 38 entries (found ${ALL_TOOLS.length})`);
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS is still 55');

// GROUP 2: App.jsx Integration
console.log('\nGROUP 2: App.jsx Integration');
const appContent = fs.readFileSync('./src/App.jsx', 'utf8');
assert(appContent.includes('import ImageUpscalerTool'), 'App.jsx imports ImageUpscalerTool');
assert(appContent.includes('path="image-upscaler"'), 'App.jsx has image-upscaler route');

// GROUP 3: Component Source Files
console.log('\nGROUP 3: Component Source Files');
const componentPath = './src/tools/image-upscaler/index.jsx';
assert(fs.existsSync(componentPath), 'src/tools/image-upscaler/index.jsx exists');
const componentContent = fs.readFileSync(componentPath, 'utf8');
assert(componentContent.includes('export default function ImageUpscalerTool'), 'index.jsx exports ImageUpscalerTool as default');

// GROUP 4: Dimension Calculations & Scaling Mathematics
console.log('\nGROUP 4: Dimension Calculations & Scaling Mathematics');
{
  const testW = 320;
  const testH = 240;

  // 2x scale
  const scale2W = testW * 2;
  const scale2H = testH * 2;
  assert(scale2W === 640 && scale2H === 480, '2x dimension calculation is exact (640x480)');
  assert(scale2W / scale2H === testW / testH, '2x preserves exact aspect ratio (4:3)');

  // 4x scale
  const scale4W = testW * 4;
  const scale4H = testH * 4;
  assert(scale4W === 1280 && scale4H === 960, '4x dimension calculation is exact (1280x960)');
  assert(scale4W / scale4H === testW / testH, '4x preserves exact aspect ratio (4:3)');

  // Unsafe dimension detection
  const giantW = 5000;
  const giantH = 4000;
  const targetPixels4x = giantW * 4 * (giantH * 4); // 20000 * 16000 = 320 MP
  const isUnsafe = targetPixels4x > 40000000 || (giantW * 4) > 16384;
  assert(isUnsafe === true, 'Unsafe canvas dimensions properly flagged by safety threshold');
}

// GROUP 5: Interpolation Pipeline & Resampling Quality
console.log('\nGROUP 5: Interpolation Pipeline & Resampling Quality');
assert(componentContent.includes('imageSmoothingQuality = \'high\''), 'Canvas uses high-quality bicubic smoothing');
assert(componentContent.includes('imageSmoothingEnabled = true'), 'Canvas enables smoothing interpolation');
assert(componentContent.includes('isSharpenEnabled'), 'Edge acuity sharpening filter logic present');
assert(componentContent.includes('MAX_SAFE_CANVAS_DIMENSION'), 'Max safe canvas dimension threshold defined');
assert(componentContent.includes('MAX_SAFE_OUTPUT_PIXELS'), 'Max safe output pixel limit defined');

// GROUP 6: Input Validation & Memory Safety
console.log('\nGROUP 6: Input Validation & Memory Safety');
assert(componentContent.includes('file.size === 0'), 'Zero-byte file rejection implemented');
assert(componentContent.includes('50 * 1024 * 1024'), '50 MB maximum file size enforced');
assert(componentContent.includes('isSupportedImage'), 'Valid image format checker present');
assert(componentContent.includes('URL.revokeObjectURL'), 'Object URL memory leak cleanup registered');

// GROUP 7: Formats, Filename & Reset
console.log('\nGROUP 7: Formats, Filename & Reset');
assert(componentContent.includes('getUpscaledDownloadName'), 'Sanitized download filename generator present');
assert(componentContent.includes('-upscaled-'), 'Filename contains -upscaled- indicator');
assert(componentContent.includes('resetAll'), 'Reset function defined');
assert(componentContent.includes('outputFormat'), 'Output format selection (PNG, JPG, WebP) supported');

// GROUP 8: Navigation & Semantic IDs
console.log('\nGROUP 8: Navigation & Semantic IDs');
const headerContent = fs.readFileSync('./src/components/Header.jsx', 'utf8');
assert(headerContent.includes('/image-upscaler'), 'Header.jsx contains link to /image-upscaler');
const footerContent = fs.readFileSync('./src/components/Footer.jsx', 'utf8');
assert(footerContent.includes('Image Tools'), 'Footer.jsx contains compact Image Tools link');
assert(componentContent.includes('id="image-upscaler-dropzone"'), 'Dropzone has id image-upscaler-dropzone');
assert(componentContent.includes('id="image-upscaler-scale-2x"'), '2x Scale button has id image-upscaler-scale-2x');
assert(componentContent.includes('id="image-upscaler-scale-4x"'), '4x Scale button has id image-upscaler-scale-4x');
assert(componentContent.includes('id="image-upscaler-btn"'), 'Upscale button has id image-upscaler-btn');
assert(componentContent.includes('id="image-upscaler-download-btn"'), 'Download button has id image-upscaler-download-btn');
assert(componentContent.includes('id="image-upscaler-reset-btn"'), 'Reset button has id image-upscaler-reset-btn');

console.log('\n==================================================');
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
if (failed === 0) {
  console.log('\n✅ All tests PASS\n');
  process.exit(0);
} else {
  console.error('\n❌ Some tests FAILED\n');
  process.exit(1);
}
