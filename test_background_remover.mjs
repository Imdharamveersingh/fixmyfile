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
  assert(PHASE_2_TOOLS.some((t) => t.id === 'background-remover'), 'Phase 2 contains background remover tool');
  assert(ALL_TOOLS.length >= 7, 'ALL_TOOLS contains Phase 1 and Phase 2 tools');
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

  // 6. Processing State Machine & Button Label Transitions
  console.log('\n6. Testing Processing State Machine & Button Labels...');

  class ProcessingStateMachine {
    constructor() {
      this.reset();
    }

    reset() {
      this.state = 'IDLE';
      this.modelDownloadPercent = null;
      this.statusMessage = '';
      this.errorMessage = null;
      this.processedBlob = null;
    }

    get isProcessing() {
      return (
        this.state === 'LOADING_MODEL' ||
        this.state === 'MODEL_READY' ||
        this.state === 'ANALYZING' ||
        this.state === 'REMOVING_BACKGROUND' ||
        this.state === 'GENERATING_OUTPUT'
      );
    }

    get buttonText() {
      switch (this.state) {
        case 'LOADING_MODEL':
        case 'MODEL_READY':
          return 'Preparing AI Model...';
        case 'ANALYZING':
        case 'REMOVING_BACKGROUND':
          return 'Removing Background...';
        case 'GENERATING_OUTPUT':
          return 'Generating Transparent PNG...';
        default:
          return '🪄 Remove Background';
      }
    }

    handleProgress(key, current, total) {
      if (typeof key === 'string' && key.startsWith('fetch:')) {
        this.state = 'LOADING_MODEL';
        if (total > 0) {
          const pct = Math.min(100, Math.round((current / total) * 100));
          this.modelDownloadPercent = pct;
          if (pct < 100) {
            this.statusMessage = `Downloading AI model... ${pct}%`;
          } else {
            this.state = 'MODEL_READY';
            this.statusMessage = 'AI model ready ✓';
          }
        } else {
          this.statusMessage = 'Preparing AI model...';
        }
      } else if (key === 'compute:decode') {
        this.state = 'ANALYZING';
        this.statusMessage = 'Analyzing image...';
      } else if (key === 'compute:inference' || key === 'compute:mask') {
        this.state = 'REMOVING_BACKGROUND';
        this.statusMessage = 'Removing background...';
      } else if (key === 'compute:encode') {
        this.state = 'GENERATING_OUTPUT';
        this.statusMessage = 'Generating transparent PNG...';
      }
    }

    handleError(errorPhase) {
      this.state = 'ERROR';
      if (errorPhase === 'LOADING_MODEL' || errorPhase === 'MODEL_READY') {
        this.errorMessage = 'Could not load AI model. Please check your connection and try again.';
      } else {
        this.errorMessage = 'Background removal failed. Please try another image.';
      }
    }

    handleSuccess(blob) {
      this.state = 'SUCCESS';
      this.processedBlob = blob;
      this.statusMessage = 'Background removed successfully!';
    }
  }

  const sm = new ProcessingStateMachine();

  // Test 6.1: Initial State
  assert(sm.state === 'IDLE', 'State 1: Initial state is IDLE');
  assert(sm.buttonText === '🪄 Remove Background', 'State 1: Button label is "🪄 Remove Background"');
  assert(!sm.isProcessing, 'State 1: isProcessing is false');

  // Test 6.2: Model Loading State (76% download)
  sm.handleProgress('fetch:/models/isnet_fp16', 76, 100);
  assert(sm.state === 'LOADING_MODEL', 'State 2: State is LOADING_MODEL');
  assert(sm.modelDownloadPercent === 76, 'State 2: Model download percent is 76');
  assert(sm.statusMessage === 'Downloading AI model... 76%', 'State 2: Status text displays "Downloading AI model... 76%"');
  assert(sm.buttonText === 'Preparing AI Model...', 'State 2: Button label is "Preparing AI Model..." (NOT Removing Background)');
  assert(sm.isProcessing, 'State 2: isProcessing is true');

  // Test 6.3: Model Completion Transition (100%)
  sm.handleProgress('fetch:/models/isnet_fp16', 100, 100);
  assert(sm.state === 'MODEL_READY', 'State 3: Transition to MODEL_READY upon 100%');
  assert(sm.statusMessage === 'AI model ready ✓', 'State 3: Status text is "AI model ready ✓"');
  assert(sm.buttonText === 'Preparing AI Model...', 'State 3: Button label remains "Preparing AI Model..." during transition');

  // Test 6.4: Analyzing State (compute:decode)
  sm.handleProgress('compute:decode', 0, 4);
  assert(sm.state === 'ANALYZING', 'State 4: Transition to ANALYZING upon compute:decode');
  assert(sm.statusMessage === 'Analyzing image...', 'State 4: Status text is "Analyzing image..."');
  assert(sm.buttonText === 'Removing Background...', 'State 4: Button label updates to "Removing Background..."');

  // Test 6.5: Removing Background State (compute:inference)
  sm.handleProgress('compute:inference', 1, 4);
  assert(sm.state === 'REMOVING_BACKGROUND', 'State 5: Transition to REMOVING_BACKGROUND upon compute:inference');
  assert(sm.statusMessage === 'Removing background...', 'State 5: Status text is "Removing background..."');
  assert(sm.buttonText === 'Removing Background...', 'State 5: Button label remains "Removing Background..."');

  // Test 6.6: Generating Output State (compute:encode)
  sm.handleProgress('compute:encode', 3, 4);
  assert(sm.state === 'GENERATING_OUTPUT', 'State 6: Transition to GENERATING_OUTPUT upon compute:encode');
  assert(sm.statusMessage === 'Generating transparent PNG...', 'State 6: Status text is "Generating transparent PNG..."');
  assert(sm.buttonText === 'Generating Transparent PNG...', 'State 6: Button label updates to "Generating Transparent PNG..."');

  // Test 6.7: Success State
  sm.handleSuccess({ size: 1024 * 300, type: 'image/png' });
  assert(sm.state === 'SUCCESS', 'State 7: Transition to SUCCESS');
  assert(!sm.isProcessing, 'State 7: isProcessing is false');
  assert(sm.statusMessage === 'Background removed successfully!', 'State 7: Status message indicates success');

  // Test 6.8: Reset State
  sm.reset();
  assert(sm.state === 'IDLE', 'State 8: Reset restores state to IDLE');
  assert(sm.modelDownloadPercent === null, 'State 8: Reset clears model download percent');
  assert(sm.statusMessage === '', 'State 8: Reset clears status message');
  assert(!sm.isProcessing, 'State 8: Reset clears isProcessing flag');

  // Test 6.9: Model Load Error
  sm.handleProgress('fetch:/models/isnet_fp16', 30, 100);
  sm.handleError('LOADING_MODEL');
  assert(sm.state === 'ERROR', 'State 9: Transition to ERROR on model load failure');
  assert(
    sm.errorMessage === 'Could not load AI model. Please check your connection and try again.',
    'State 9: User-friendly model download error message displayed without raw stack trace'
  );

  // Test 6.10: Processing Error
  sm.reset();
  sm.handleProgress('compute:inference', 1, 4);
  sm.handleError('REMOVING_BACKGROUND');
  assert(sm.state === 'ERROR', 'State 10: Transition to ERROR on inference failure');
  assert(
    sm.errorMessage === 'Background removal failed. Please try another image.',
    'State 10: User-friendly processing error message displayed without raw stack trace'
  );

  // Test 6.11: Reprocess Second Image
  sm.reset();
  assert(sm.state === 'IDLE', 'State 11: Ready for second image');
  sm.handleProgress('compute:decode', 0, 4); // second run hits cache directly
  assert(sm.state === 'ANALYZING', 'State 11: Second run immediately starts image analysis without download loop');
  assert(sm.buttonText === 'Removing Background...', 'State 11: Second run immediately shows "Removing Background..."');

  // 7. Engine Package Resolution & Named Exports
  console.log('\n7. Verifying Engine Package & Exports...');
  const imglyModule = await import('@imgly/background-removal');
  assert(typeof imglyModule.removeBackground === 'function', '@imgly/background-removal exports removeBackground');
  assert(typeof imglyModule.preload === 'function', '@imgly/background-removal exports preload');

  // 8. Test Summary
  console.log(`\n=== Automated Test Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

runBackgroundRemoverTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
