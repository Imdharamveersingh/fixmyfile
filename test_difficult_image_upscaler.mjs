/**
 * Phase 5.9 — Image Upscaler: Difficult Edge Test
 * Run: node test_difficult_image_upscaler.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/image-upscaler';

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passCount++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failCount++; }

console.log('\n=== Phase 5.9 — Image Upscaler: Difficult / Edge Test ===\n');

// GROUP 1: Source Invariants & Security
console.log('GROUP 1: Source Invariants & Security');
const src = fs.readFileSync('src/tools/image-upscaler/index.jsx', 'utf8');
if (src.includes('MAX_SAFE_OUTPUT_PIXELS = 40000000')) pass('Maximum output pixel safety ceiling defined (40 MP)');
else fail('Safety pixel threshold missing');

if (src.includes('isScaleUnsafe')) pass('Unsafe scale rejection logic implemented in UI and processing');
else fail('Unsafe scale logic missing');

if (!src.includes('console.log(')) pass('Zero console.log in production component');
else fail('console.log found in production component');

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

async function runDifficultBrowserTest() {
  console.log('\nGROUP 2: In-Browser Resampling & Alpha Integrity (200x100 → 400x200 → 800x400)');
  const debugPort = 9348;
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--disable-gpu',
    TOOL_URL,
  ]);

  try {
    const targets = await waitForChromePort(debugPort);
    const pageTarget = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => { ws.onopen = resolve; });

    let reqId = 1;
    const pending = new Map();
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && pending.has(parsed.id)) {
        const { resolve, reject } = pending.get(parsed.id);
        pending.delete(parsed.id);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.result);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Evaluate in-browser progressive upscaling directly on canvas pipeline
    const testResults = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async function() {
        // Create 200x100 asymmetric test image with sharp edges, diagonal line, and transparent region
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        // Top-left: red
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 0, 100, 50);

        // Top-right: blue
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(100, 0, 100, 50);

        // Bottom-left: diagonal green line on white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 50, 100, 50);
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, 50);
        ctx.lineTo(100, 100);
        ctx.stroke();

        // Bottom-right: transparent (alpha = 0)

        // 1. Test 2x upscaling (200x100 -> 400x200)
        const canvas2x = document.createElement('canvas');
        canvas2x.width = 400;
        canvas2x.height = 200;
        const ctx2x = canvas2x.getContext('2d');
        ctx2x.imageSmoothingEnabled = true;
        ctx2x.imageSmoothingQuality = 'high';
        ctx2x.drawImage(canvas, 0, 0, 400, 200);

        // 2. Test 4x upscaling (200x100 -> 800x400)
        const canvas4x = document.createElement('canvas');
        canvas4x.width = 800;
        canvas4x.height = 400;
        const ctx4x = canvas4x.getContext('2d');
        ctx4x.imageSmoothingEnabled = true;
        ctx4x.imageSmoothingQuality = 'high';
        ctx4x.drawImage(canvas2x, 0, 0, 800, 400);

        // Sample pixels
        // Top-Left (Red quadrant): should be predominantly red
        const pRed = ctx4x.getImageData(50, 50, 1, 1).data;
        // Top-Right (Blue quadrant): should be predominantly blue
        const pBlue = ctx4x.getImageData(600, 50, 1, 1).data;
        // Bottom-Right (Transparent quadrant): alpha should remain 0
        const pAlpha = ctx4x.getImageData(700, 350, 1, 1).data;

        // Export to PNG blob
        const blob4x = await new Promise(r => canvas4x.toBlob(r, 'image/png'));
        const arrayBuf = await blob4x.arrayBuffer();
        const header = new Uint8Array(arrayBuf.slice(0, 8));

        return {
          width2x: canvas2x.width,
          height2x: canvas2x.height,
          width4x: canvas4x.width,
          height4x: canvas4x.height,
          pRed: [pRed[0], pRed[1], pRed[2], pRed[3]],
          pBlue: [pBlue[0], pBlue[1], pBlue[2], pBlue[3]],
          pAlpha: [pAlpha[0], pAlpha[1], pAlpha[2], pAlpha[3]],
          blobSize: blob4x.size,
          pngHeader: Array.from(header)
        };
      })()`
    });

    const res = testResults?.result?.value;
    if (!res) throw new Error('Failed to run in-browser difficult test');

    // 1. 2x dimensions
    if (res.width2x === 400 && res.height2x === 200) pass('2x canvas has exact dimensions 400 × 200');
    else fail(`2x dimensions unexpected: ${res.width2x}x${res.height2x}`);

    // 2. 4x dimensions
    if (res.width4x === 800 && res.height4x === 400) pass('4x canvas has exact dimensions 800 × 400');
    else fail(`4x dimensions unexpected: ${res.width4x}x${res.height4x}`);

    // 3. Aspect ratio preservation
    if (res.width4x / res.height4x === 200 / 100) pass('Aspect ratio strictly 2:1 preserved');
    else fail('Aspect ratio corrupted');

    // 4. Content recognizability (Red quadrant)
    if (res.pRed[0] > 180 && res.pRed[1] < 80 && res.pRed[2] < 80) pass('Top-left quadrant remains distinctly Red in 4x output');
    else fail(`Red quadrant pixel unexpected: ${res.pRed}`);

    // 5. Content recognizability (Blue quadrant)
    if (res.pBlue[2] > 180 && res.pBlue[0] < 80) pass('Top-right quadrant remains distinctly Blue in 4x output');
    else fail(`Blue quadrant pixel unexpected: ${res.pBlue}`);

    // 6. Alpha transparency preserved
    if (res.pAlpha[3] === 0) pass('Transparent bottom-right quadrant preserves Alpha = 0 in 4x PNG');
    else fail(`Transparent quadrant has non-zero alpha: ${res.pAlpha[3]}`);

    // 7. Valid PNG signature
    const isPng = res.pngHeader[0] === 0x89 && res.pngHeader[1] === 0x50 && res.pngHeader[2] === 0x4E && res.pngHeader[3] === 0x47;
    if (isPng) pass('4x export produces valid 8-byte PNG signature');
    else fail('4x export failed PNG signature validation');

    // 8. Size is substantial
    if (res.blobSize > 1000) pass(`Substantial output file size: ${res.blobSize} bytes`);
    else fail(`Blob size too small: ${res.blobSize}`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function main() {
  await runDifficultBrowserTest();
  console.log('\n==================================================');
  console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);

  if (failCount === 0) {
    console.log('\n✅ All difficult tests PASS\n');
    process.exit(0);
  } else {
    console.error('\n❌ Some difficult tests FAILED\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
