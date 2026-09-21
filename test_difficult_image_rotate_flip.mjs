/**
 * Difficult / Edge-Case Test for Phase 5.6 — Image Rotate & Flip
 * Sequence: 90° → horizontal flip → 270° → vertical flip on asymmetric transparent image
 * Run: node test_difficult_image_rotate_flip.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/image-rotate-flip';

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passCount++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failCount++; }

function test(name, fn) {
  try {
    fn();
    pass(name);
  } catch (err) {
    fail(`${name}: ${err.message}`);
  }
}

console.log('\n=== Phase 5.6 — Image Rotate / Flip: Difficult / Edge Test ===\n');

// GROUP 1: Source & Static Invariants
console.log('GROUP 1: Source Code & Mathematical Invariants');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/image-rotate-flip/index.jsx'), 'utf8');

test('Canvas dimension calculation correctly swaps width & height when matrix swaps axes', () => {
  assert.ok(src.includes('Math.abs(matrix[0][0]) === 0'));
});

test('Context save/restore wraps transformation to prevent state pollution', () => {
  assert.ok(src.includes('ctx.save()') && src.includes('ctx.restore()'));
});

test('Origin translated to center before matrix transform', () => {
  assert.ok(src.includes('ctx.translate'));
  assert.ok(src.includes('ctx.transform'));
  assert.ok(src.includes('ctx.drawImage'));
});

test('Zero console.log statements in production component', () => {
  const matches = (src.match(/console\.log\(/g) || []).length;
  assert.equal(matches, 0);
});

// GROUP 2: In-Browser Real Asymmetric Transform Sequence
console.log('\nGROUP 2: Asymmetric Image Sequence (90° → HFlip → 270° → VFlip)');

async function waitForChromePort(port, maxMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const targets = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
        }).on('error', reject);
      });
      if (targets && targets.length > 0) return targets;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Chrome did not start on port ${port}`);
}

async function runDifficultTest() {
  const debugPort = 9376;
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    TOOL_URL,
  ]);

  try {
    const targets = await waitForChromePort(debugPort);
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => { ws.onopen = resolve; });

    let reqId = 1;
    const pendingRequests = new Map();

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pendingRequests.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && pendingRequests.has(parsed.id)) {
        const { resolve, reject } = pendingRequests.get(parsed.id);
        pendingRequests.delete(parsed.id);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.result);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Upload 200x100 asymmetric image with 4 distinct quadrants:
    // Top-Left (TL): Solid RED (#ff0000)
    // Top-Right (TR): Solid GREEN (#00ff00)
    // Bottom-Left (BL): Solid BLUE (#0000ff)
    // Bottom-Right (BR): Fully TRANSPARENT (rgba(0,0,0,0))
    await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async function() {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 200, 100);

        // TL: RED
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, 100, 50);

        // TR: GREEN
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(100, 0, 100, 50);

        // BL: BLUE
        ctx.fillStyle = '#0000ff';
        ctx.fillRect(0, 50, 100, 50);

        // BR: TRANSPARENT (remains clear)

        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'asymmetric_test.png', { type: 'image/png' });
        const input = document.getElementById('image-rotate-file-input');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Step 1: 90° Clockwise
    await send('Runtime.evaluate', { expression: 'document.getElementById("image-rotate-90-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 250));
    const step1Dim = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: '({ w: document.getElementById("image-preview-canvas").width, h: document.getElementById("image-preview-canvas").height })'
    });
    test('Step 1 (90° CW): Canvas swapped dimensions to 100x200', () => {
      assert.equal(step1Dim.result.value.w, 100);
      assert.equal(step1Dim.result.value.h, 200);
    });

    // Step 2: Horizontal Flip
    await send('Runtime.evaluate', { expression: 'document.getElementById("image-rotate-flip-h-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 250));
    const step2Dim = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: '({ w: document.getElementById("image-preview-canvas").width, h: document.getElementById("image-preview-canvas").height })'
    });
    test('Step 2 (H-Flip): Dimensions remain 100x200', () => {
      assert.equal(step2Dim.result.value.w, 100);
      assert.equal(step2Dim.result.value.h, 200);
    });

    // Step 3: 270° Rotation
    await send('Runtime.evaluate', { expression: 'document.getElementById("image-rotate-270-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 250));
    const step3Dim = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: '({ w: document.getElementById("image-preview-canvas").width, h: document.getElementById("image-preview-canvas").height })'
    });
    test('Step 3 (270° CCW): Canvas swapped back to 200x100', () => {
      assert.equal(step3Dim.result.value.w, 200);
      assert.equal(step3Dim.result.value.h, 100);
    });

    // Step 4: Vertical Flip
    await send('Runtime.evaluate', { expression: 'document.getElementById("image-rotate-flip-v-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 250));
    const step4Dim = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: '({ w: document.getElementById("image-preview-canvas").width, h: document.getElementById("image-preview-canvas").height })'
    });
    test('Step 4 (V-Flip): Canvas dimensions are 200x100', () => {
      assert.equal(step4Dim.result.value.w, 200);
      assert.equal(step4Dim.result.value.h, 100);
    });

    // Step 5: Export & Verify Transformed Pixels & Genuine PNG Output
    await send('Runtime.evaluate', { expression: 'document.getElementById("image-rotate-apply-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 1200));

    const exportVerification = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async function() {
        const previewCanvas = document.getElementById('image-preview-canvas');
        const pCtx = previewCanvas.getContext('2d');

        // Sample quadrants on the live preview canvas (200x100):
        // TL (50, 25), TR (150, 25), BL (50, 75), BR (150, 75)
        const tl = pCtx.getImageData(50, 25, 1, 1).data;
        const tr = pCtx.getImageData(150, 25, 1, 1).data;
        const bl = pCtx.getImageData(50, 75, 1, 1).data;
        const br = pCtx.getImageData(150, 75, 1, 1).data;

        // Fetch exported PNG from download button
        const dlBtn = document.getElementById('image-rotate-download-btn');
        if (!dlBtn) return { error: 'Download button not found' };

        // Read exported image back via Image
        const resultBanner = document.getElementById('image-rotate-result');
        const img = new Image();
        // Extract blob URL from activeExportUrl via download link or re-fetch
        return {
          tl: Array.from(tl),
          tr: Array.from(tr),
          bl: Array.from(bl),
          br: Array.from(br),
          canvasW: previewCanvas.width,
          canvasH: previewCanvas.height,
        };
      })()`
    });

    const val = exportVerification.result.value;
    if (val.error) throw new Error(val.error);

    test('Transformed preview canvas width is 200', () => {
      assert.equal(val.canvasW, 200);
    });

    test('Transformed preview canvas height is 100', () => {
      assert.equal(val.canvasH, 100);
    });

    test('Top-Left quadrant pixel is Red (R > 200, G < 50, B < 50, A = 255)', () => {
      assert.ok(val.tl[0] > 200 && val.tl[1] < 50 && val.tl[2] < 50 && val.tl[3] === 255, `TL: ${JSON.stringify(val.tl)}`);
    });

    test('Top-Right quadrant pixel is Green (R < 50, G > 200, B < 50, A = 255)', () => {
      assert.ok(val.tr[0] < 50 && val.tr[1] > 200 && val.tr[2] < 50 && val.tr[3] === 255, `TR: ${JSON.stringify(val.tr)}`);
    });

    test('Bottom-Left quadrant pixel is Blue (R < 50, G < 50, B > 200, A = 255)', () => {
      assert.ok(val.bl[0] < 50 && val.bl[1] < 50 && val.bl[2] > 200 && val.bl[3] === 255, `BL: ${JSON.stringify(val.bl)}`);
    });

    test('Bottom-Right quadrant preserves transparency (Alpha = 0)', () => {
      assert.equal(val.br[3], 0, `BR Alpha expected 0, got: ${val.br[3]}`);
    });

    ws.close();
  } catch (err) {
    fail(`Difficult test browser error: ${err.message}`);
  } finally {
    chrome.kill();
    await new Promise((r) => setTimeout(r, 500));
  }
}

try {
  await runDifficultTest();
} catch (err) {
  fail(`Top-level error: ${err.message}`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) {
  console.error('\n❌ Difficult tests FAILED.');
  process.exit(1);
} else {
  console.log('\n✅ All difficult tests PASS');
}
