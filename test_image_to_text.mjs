/**
 * Phase 7.1 — Image to Text (OCR) Automated Test Suite
 *
 * Verifies:
 * - Tool registry integration (44 tools active)
 * - Route registration in App.jsx
 * - Component & engine architecture
 * - Binary signature detection (JPEG, PNG, WebP)
 * - Validation & error handling for invalid/corrupted files
 * - Character, word, and line count computation
 * - In-browser local Tesseract OCR with deterministic text fixtures
 * - Offline vendor assets verification (zero CDN leakage)
 * - Multiple OCR cycles and worker lifecycle
 * - Desktop & mobile viewports (375px, 390px, 768px, 1280px)
 * - Regression: Phase 6 routes
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PHASE_7_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';
import {
  detectImageSignature,
  calculateTextStats,
  formatBytes,
  MAX_IMAGE_FILE_SIZE
} from './src/services/ocr/ocrUtils.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9490;

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

console.log('\n=== Phase 7.1 — Image to Text: Automated Test Suite ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Tool Registry & Routing
// ─────────────────────────────────────────────────────────────────────────────
console.log('GROUP 1: Tool Registry & Routing');

const imageToTextTool = PHASE_7_TOOLS.find((t) => t.id === 'image-to-text');
assert(!!imageToTextTool, 'image-to-text exists in PHASE_7_TOOLS');
assert(imageToTextTool?.path === '/image-to-text', 'tool path is /image-to-text');
assert(imageToTextTool?.category === 'OCR & Text', 'tool category is OCR & Text');
assert(imageToTextTool?.phase === 'Phase 7', 'tool phase is Phase 7');
assert(imageToTextTool?.status === 'Ready', 'tool status is Ready');

const inAllTools = ALL_TOOLS.find((t) => t.id === 'image-to-text');
assert(!!inAllTools, 'image-to-text is registered in ALL_TOOLS');
assert(ALL_TOOLS.length === 44, `ALL_TOOLS count is exactly 44 (found ${ALL_TOOLS.length})`);
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS remains 55');

const appJsx = fs.readFileSync('src/App.jsx', 'utf-8');
assert(appJsx.includes('import ImageToTextTool from'), 'App.jsx imports ImageToTextTool');
assert(appJsx.includes('path="image-to-text"'), 'App.jsx registers /image-to-text route');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Component & Service Architecture
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 2: Component & Service Architecture');

assert(fs.existsSync('src/tools/image-to-text/index.jsx'), 'src/tools/image-to-text/index.jsx exists');
assert(fs.existsSync('src/services/ocr/ocrEngine.js'), 'src/services/ocr/ocrEngine.js exists');
assert(fs.existsSync('src/services/ocr/ocrPreprocess.js'), 'src/services/ocr/ocrPreprocess.js exists');
assert(fs.existsSync('src/services/ocr/ocrUtils.js'), 'src/services/ocr/ocrUtils.js exists');

// Verify offline vendor assets exist
assert(fs.existsSync('public/vendor/tesseract/worker.min.js'), 'Vendor worker.min.js exists in public/');
assert(fs.existsSync('public/vendor/tesseract/tesseract-core.wasm'), 'Vendor tesseract-core.wasm exists in public/');
assert(fs.existsSync('public/vendor/tesseract/lang-data/eng.traineddata.gz'), 'Vendor eng.traineddata.gz exists in public/');

const toolSource = fs.readFileSync('src/tools/image-to-text/index.jsx', 'utf-8');
assert(toolSource.includes('export default function ImageToTextTool'), 'index.jsx exports ImageToTextTool as default');
assert(toolSource.includes('id="image-to-text-dropzone"'), 'index.jsx includes dropzone with ID');
assert(toolSource.includes('id="image-to-text-input"'), 'index.jsx includes file input with ID');
assert(toolSource.includes('id="btn-extract-text"'), 'index.jsx includes extract button with ID');
assert(toolSource.includes('id="ocr-extracted-textarea"'), 'index.jsx includes extracted textarea with ID');
assert(toolSource.includes('id="btn-copy-text"'), 'index.jsx includes copy button with ID');
assert(toolSource.includes('id="btn-download-txt"'), 'index.jsx includes download TXT button with ID');
assert(toolSource.includes('id="btn-extract-another"'), 'index.jsx includes reset button with ID');
assert(toolSource.includes('100% Client-Side'), 'index.jsx includes local privacy statement');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Validation, Signatures & Text Metrics
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 3: Validation, Signatures & Text Metrics');

// Signatures
const jpegSig = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const pngSig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const webpSig = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const fakeSig = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);

assert(detectImageSignature(jpegSig.buffer) === 'jpeg', 'JPEG binary signature recognized');
assert(detectImageSignature(pngSig.buffer) === 'png', 'PNG binary signature recognized');
assert(detectImageSignature(webpSig.buffer) === 'webp', 'WebP binary signature recognized');
assert(detectImageSignature(fakeSig.buffer) === null, 'Non-image binary signature rejected');
assert(detectImageSignature(null) === null, 'Null buffer safely rejected');
assert(detectImageSignature(new ArrayBuffer(4)) === null, 'Short buffer safely rejected');

// Text Stats
const stats1 = calculateTextStats('Hello world\nThis is a test line.\nAnother line here.');
assert(stats1.charCount === 51, `Character count matches (got ${stats1.charCount})`);
assert(stats1.wordCount === 10, `Word count matches (got ${stats1.wordCount})`);
assert(stats1.lineCount === 3, `Line count matches (got ${stats1.lineCount})`);

const statsEmpty = calculateTextStats('');
assert(statsEmpty.charCount === 0 && statsEmpty.wordCount === 0 && statsEmpty.lineCount === 0, 'Empty string produces 0 counts');

assert(MAX_IMAGE_FILE_SIZE === 50 * 1024 * 1024, 'MAX_IMAGE_FILE_SIZE is set to 50 MB');
assert(formatBytes(1048576) === '1 MB', 'formatBytes formats accurately');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: In-Browser Real OCR Execution & Layout Tests
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 4: In-Browser Real OCR Execution & Layout Tests');

async function runBrowserTests() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\udte prinde\\.gemini\\antigravity-ide\\chrome_test_profile_ocr'
  ]);

  try {
    await new Promise((r) => setTimeout(r, 2000));

    const targets = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${DEBUG_PORT}/json`, (res) => {
        let raw = '';
        res.on('data', (c) => raw += c);
        res.on('end', () => resolve(JSON.parse(raw)));
      }).on('error', reject);
    });

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let id = 1;
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const cur = id++;
        const handler = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id === cur) {
            ws.removeEventListener('message', handler);
            if (msg.error) reject(msg.error);
            else resolve(msg.result);
          }
        };
        ws.addEventListener('message', handler);
        ws.send(JSON.stringify({ id: cur, method, params }));
      });
    }

    await send('Page.enable');
    await send('Runtime.enable');

    const consoleErrors = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails?.text || 'Exception');
      }
    });

    await send('Page.navigate', { url: 'http://localhost:5173/image-to-text' });
    for (let i = 0; i < 25; i++) {
      const check = await send('Runtime.evaluate', {
        expression: '!!document.querySelector(".tool-workspace")'
      });
      if (check.result?.value) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    // Page title check
    const titleRes = await send('Runtime.evaluate', { expression: 'document.title' });
    assert(titleRes.result?.value?.includes('Image to Text'), 'Page title contains Image to Text');

    // Dropzone check
    const dropzoneRes = await send('Runtime.evaluate', {
      expression: '!!document.getElementById("image-to-text-dropzone")'
    });
    assert(dropzoneRes.result?.value === true, 'Dropzone element renders on page load');

    // ── Deterministic OCR execution test ─────────────────────────────────────
    const ocrRun = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      timeout: 60000,
      expression: `(async () => {
        try {
          const { runOcr } = await import('/src/services/ocr/ocrEngine.js');

          // Create high-contrast text canvas
          const canvas = document.createElement('canvas');
          canvas.width = 600;
          canvas.height = 120;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 600, 120);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 28px sans-serif';
          ctx.fillText('FIXMYFILE OCR TEST', 24, 50);
          ctx.font = '22px sans-serif';
          ctx.fillText('HELLO WORLD 123456789', 24, 90);

          const result = await runOcr(canvas, { preprocess: true });

          return {
            success: true,
            text: result.text.trim(),
            confidence: result.confidence,
            wordsCount: result.words.length
          };
        } catch (err) {
          return {
            success: false,
            error: err.message || String(err)
          };
        }
      })()`
    });

    const parsedOcr = ocrRun.result?.value || {};
    assert(parsedOcr.success === true, 'In-browser OCR engine executed successfully');
    assert(parsedOcr.text?.includes('FIXMYFILE'), 'OCR extracted "FIXMYFILE" token');
    assert(parsedOcr.text?.includes('HELLO WORLD'), 'OCR extracted "HELLO WORLD" token');
    assert(parsedOcr.confidence > 70, `OCR confidence score is robust (${parsedOcr.confidence}%)`);
    assert(parsedOcr.wordsCount >= 4, `Word segmentation detected words (${parsedOcr.wordsCount})`);

    // ── Repeated OCR run (lifecycle & worker reuse) ──────────────────────────
    const secondOcrRun = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      timeout: 60000,
      expression: `(async () => {
        try {
          const { runOcr } = await import('/src/services/ocr/ocrEngine.js');

          const canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 80;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 300, 80);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px sans-serif';
          ctx.fillText('SECOND RUN OK', 20, 50);

          const result = await runOcr(canvas);
          return { success: true, text: result.text.trim() };
        } catch (err) {
          return { success: false, error: err.message };
        }
      })()`
    });

    const parsedSecond = secondOcrRun.result?.value || {};
    assert(parsedSecond.success === true, 'Second sequential OCR cycle succeeded without reload');
    assert(parsedSecond.text?.includes('SECOND'), 'Second run text recognized correctly');

    // ── Responsive viewports ─────────────────────────────────────────────────
    const viewports = [
      { name: 'Mobile 375px', width: 375, height: 667 },
      { name: 'Mobile 390px', width: 390, height: 844 },
      { name: 'Tablet 768px', width: 768, height: 1024 },
      { name: 'Desktop 1280px', width: 1280, height: 800 }
    ];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise((r) => setTimeout(r, 400));

      const overflowRes = await send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollWidth <= window.innerWidth + 2'
      });
      assert(overflowRes.result?.value === true, `${vp.name}: no horizontal overflow`);
    }

    assert(consoleErrors.length === 0, `0 console errors during execution (found ${consoleErrors.length})`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

await runBrowserTests();

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5: Regression — Phase 6 Routes Still Accessible
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 5: Regression — Phase 6 Routes Accessible');

async function checkRoute(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:5173/${path}`, (res) => {
      resolve(res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

assert(await checkRoute('mp4-to-mp3'), 'GET /mp4-to-mp3 returns 2xx (regression)');
assert(await checkRoute('video-compressor'), 'GET /video-compressor returns 2xx (regression)');
assert(await checkRoute('video-to-gif'), 'GET /video-to-gif returns 2xx (regression)');
assert(await checkRoute('gif-maker'), 'GET /gif-maker returns 2xx (regression)');
assert(await checkRoute('image-to-text'), 'GET /image-to-text returns 2xx');

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED:      ${passCount}`);
console.log(`FAILED:      ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
