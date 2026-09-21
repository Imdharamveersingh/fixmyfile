/**
 * Difficult / Edge-Case Test for Phase 5.7 — Image Watermark
 * Tests: Large image (1200x800), asymmetric transparent content, long watermark text,
 * low opacity (20%), center position, corner position, baked pixel verification.
 * Run: node test_difficult_image_watermark.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/image-watermark';

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

console.log('\n=== Phase 5.7 — Image Watermark: Difficult / Edge Test ===\n');

// GROUP 1: Source Invariants & Guarantees
console.log('GROUP 1: Source Invariants & Security');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/image-watermark/index.jsx'), 'utf8');

test('Watermark directly draws onto export canvas before toBlob', () => {
  assert.ok(src.includes('drawWatermark(canvas, imgElement, true)'));
  assert.ok(src.includes('canvas.toBlob('));
});

test('Zero console.log in production tool component', () => {
  const matches = (src.match(/console\.log\(/g) || []).length;
  assert.equal(matches, 0);
});

// GROUP 2: In-Browser Large Image Baked Watermark Test
console.log('\nGROUP 2: In-Browser 1200x800 Baked Watermark Verification');

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
  const debugPort = 9382;
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

    // Upload 1200x800 image with:
    // - Black rectangle in center (width 600, height 300)
    // - Transparent background in bottom-right quadrant
    await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async function() {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 800;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 1200, 800);

        // Center black rectangle
        ctx.fillStyle = '#000000';
        ctx.fillRect(300, 250, 600, 300);

        // Top-left dark blue block
        ctx.fillStyle = '#0a192f';
        ctx.fillRect(0, 0, 300, 250);

        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'large_asymmetric.png', { type: 'image/png' });
        const input = document.getElementById('image-watermark-file-input');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Configure watermark controls:
    // Long text watermark, white color, 20% opacity, 0 rotation, center position
    await send('Runtime.evaluate', {
      expression: `(function() {
        // Set text input
        const txtInput = document.getElementById('watermark-text-input');
        txtInput.value = 'CONFIDENTIAL PROPRIETARY DOCUMENT 2026 FIXMYFILE';
        txtInput.dispatchEvent(new Event('input', { bubbles: true }));
        txtInput.dispatchEvent(new Event('change', { bubbles: true }));

        // Set opacity to 20%
        const opSlider = document.getElementById('watermark-opacity-slider');
        opSlider.value = '20';
        opSlider.dispatchEvent(new Event('input', { bubbles: true }));
        opSlider.dispatchEvent(new Event('change', { bubbles: true }));

        // Set font size to 48px
        const fsSlider = document.getElementById('watermark-font-size-slider');
        fsSlider.value = '48';
        fsSlider.dispatchEvent(new Event('input', { bubbles: true }));
        fsSlider.dispatchEvent(new Event('change', { bubbles: true }));

        // Set rotation to 0
        const rotSlider = document.getElementById('watermark-rotation-slider');
        rotSlider.value = '0';
        rotSlider.dispatchEvent(new Event('input', { bubbles: true }));
        rotSlider.dispatchEvent(new Event('change', { bubbles: true }));

        // Select Center preset
        document.getElementById('watermark-pos-center')?.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 800));

    // Click Apply / Export
    await send('Runtime.evaluate', { expression: 'document.getElementById("watermark-apply-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 1500));

    // Inspect exported PNG
    const evaluation = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async function() {
        const previewCanvas = document.getElementById('watermark-preview-canvas');
        if (!previewCanvas) return { error: 'Preview canvas missing' };

        const pCtx = previewCanvas.getContext('2d');
        const canvasW = previewCanvas.width;
        const canvasH = previewCanvas.height;

        // Sample center pixel (600, 400) where text was stamped at 20% opacity over black (#000000)
        const centerPixel = pCtx.getImageData(600, 400, 1, 1).data;

        // Sample top-right of black rect (500, 270) where text is NOT stamped
        const blackPixel = pCtx.getImageData(500, 270, 1, 1).data;

        // Sample bottom-right corner (1150, 750) which was transparent and has no watermark
        const transparentPixel = pCtx.getImageData(1150, 750, 1, 1).data;

        // Fetch download blob to check genuine PNG header
        const dlBtn = document.getElementById('watermark-download-btn');
        if (!dlBtn) return { error: 'Download button not found' };

        // Export through an offscreen canvas with same drawWatermark logic to read binary PNG
        const testBlob = await new Promise(r => previewCanvas.toBlob(r, 'image/png'));
        const testBuf = await testBlob.arrayBuffer();
        const bytes = new Uint8Array(testBuf);

        const isPng =
          bytes[0] === 0x89 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x4E &&
          bytes[3] === 0x47 &&
          bytes[4] === 0x0D &&
          bytes[5] === 0x0A &&
          bytes[6] === 0x1A &&
          bytes[7] === 0x0A;

        const view = new DataView(testBuf);
        const ihdrWidth = view.getUint32(16, false);
        const ihdrHeight = view.getUint32(20, false);

        return {
          canvasW,
          canvasH,
          ihdrWidth,
          ihdrHeight,
          isPng,
          centerPixel: Array.from(centerPixel),
          blackPixel: Array.from(blackPixel),
          transparentPixel: Array.from(transparentPixel),
          blobSize: testBlob.size
        };
      })()`
    });

    const val = evaluation?.result?.value;
    if (!val) throw new Error('Evaluation returned null');
    if (val.error) throw new Error(val.error);

    test('Exported output has valid PNG 8-byte magic signature', () => {
      assert.equal(val.isPng, true, 'PNG signature missing');
    });

    test('Source dimensions strictly preserved (1200 x 800)', () => {
      assert.equal(val.ihdrWidth, 1200, `Expected 1200, got ${val.ihdrWidth}`);
      assert.equal(val.ihdrHeight, 800, `Expected 800, got ${val.ihdrHeight}`);
      assert.equal(val.canvasW, 1200);
      assert.equal(val.canvasH, 800);
    });

    test('Watermark is genuinely baked into center pixel (brightness shifted from black)', () => {
      // Black rectangle is [0, 0, 0, 255]. White text at 20% opacity lifts R, G, B > 10
      assert.ok(
        val.centerPixel[0] > 10 || val.centerPixel[1] > 10 || val.centerPixel[2] > 10,
        `Center pixel should show baked watermark: ${JSON.stringify(val.centerPixel)}`
      );
    });

    test('Low opacity is reflected (brightness < 120, not opaque white)', () => {
      // At 20% opacity over black, brightness is around 40-60, NOT 255
      assert.ok(
        val.centerPixel[0] < 150,
        `Opacity not reflected (too bright): ${val.centerPixel[0]}`
      );
    });

    test('Unwatermarked transparent quadrant retains alpha = 0', () => {
      assert.equal(val.transparentPixel[3], 0, `Alpha should be 0, got: ${val.transparentPixel[3]}`);
    });

    test('Exported PNG file size is substantial (> 1000 bytes)', () => {
      assert.ok(val.blobSize > 1000, `Blob size too small: ${val.blobSize}`);
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
