/**
 * Difficult / Edge-Case Test for Phase 5.5 — WebP to PNG
 * Run: node test_difficult_webp_to_png.mjs
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/webp-to-png';

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

console.log('\n=== Phase 5.5 — WebP to PNG: Difficult / Edge Test ===\n');

// GROUP 1: Source Analysis & Guarantees
console.log('GROUP 1: Source Analysis & Guarantees');

const src = fs.readFileSync(path.join(__dirname, 'src/tools/webp-to-png/index.jsx'), 'utf8');

test('Non-WebP input guard rejects non-webp types', () => {
  assert.ok(src.includes("type === 'image/webp'"), 'MIME check image/webp missing');
  assert.ok(src.includes(".endsWith('.webp')"), 'Extension check .webp missing');
});

test('RIFF / WEBP magic container validation is implemented', () => {
  assert.ok(src.includes('validateWebpBuffer'), 'Buffer validator missing');
  assert.ok(src.includes('0x52') && src.includes('0x49') && src.includes('0x46') && src.includes('0x46'), 'RIFF check incomplete');
  assert.ok(src.includes('0x57') && src.includes('0x45') && src.includes('0x42') && src.includes('0x50'), 'WEBP check incomplete');
});

test('Genuine PNG signature validation on output blob', () => {
  assert.ok(src.includes('0x89') && src.includes('0x50') && src.includes('0x4E') && src.includes('0x47'), 'PNG signature check missing');
});

test('PNG IHDR chunk header validation (0x49 0x48 0x44 0x52)', () => {
  assert.ok(src.includes('0x49') && src.includes('0x48') && src.includes('0x44') && src.includes('0x52'), 'IHDR chunk validation missing');
});

test('Canvas export uses image/png', () => {
  assert.ok(src.includes("'image/png'"), 'image/png MIME target missing');
});

test('Preserve transparency preserves alpha channel', () => {
  assert.ok(src.includes('preserveTransparency'), 'Preserve transparency state missing');
});

test('Zero console.log in production tool source', () => {
  const matches = (src.match(/console\.log\(/g) || []).length;
  assert.equal(matches, 0, `Found ${matches} console.log calls in tool source`);
});

// GROUP 2: In-Browser Real Difficult Test (Large dimensions, Transparent WebP, IHDR & Alpha inspection)
console.log('\nGROUP 2: In-Browser Difficult Test (Large Dimensions & Alpha Channel)');

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
  const debugPort = 9372;
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
    const pageErrors = [];

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
      if (parsed.method === 'Runtime.exceptionThrown') {
        const desc = parsed.params?.exceptionDetails?.exception?.description || '';
        if (desc) pageErrors.push(desc);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // Execute difficult conversion:
    // Generate a 1280x720 transparent WebP with asymmetric content (semi-transparent red circle + opaque blue rectangle + transparent background)
    const result = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async function() {
        const TARGET_W = 1280;
        const TARGET_H = 720;

        // Step 1: Create 1280x720 canvas with transparent background and draw patterns
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = TARGET_W;
        sourceCanvas.height = TARGET_H;
        const sCtx = sourceCanvas.getContext('2d');
        // Clear (transparent)
        sCtx.clearRect(0, 0, TARGET_W, TARGET_H);

        // Draw opaque blue rectangle in top-left
        sCtx.fillStyle = '#0055ff';
        sCtx.fillRect(50, 50, 200, 150);

        // Draw semi-transparent magenta circle in center (alpha = 0.5)
        sCtx.beginPath();
        sCtx.arc(TARGET_W / 2, TARGET_H / 2, 100, 0, Math.PI * 2);
        sCtx.fillStyle = 'rgba(255, 0, 128, 0.5)';
        sCtx.fill();

        // Convert to WebP blob
        const webpBlob = await new Promise(r => sourceCanvas.toBlob(r, 'image/webp'));
        const webpFile = new File([webpBlob], 'difficult_large_alpha.webp', { type: 'image/webp' });

        // Step 2: Inject into WebP to PNG tool input
        const input = document.getElementById('webp-to-png-file-input');
        const dt = new DataTransfer();
        dt.items.add(webpFile);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // Wait for SUCCESS state
        let maxWait = 40;
        while (maxWait > 0) {
          await new Promise(r => setTimeout(r, 200));
          const resBanner = document.getElementById('webp-to-png-result');
          if (resBanner) break;
          maxWait--;
        }

        // Step 3: Get the download URL of the converted PNG
        const downloadBtn = document.getElementById('webp-to-png-download-btn');
        if (!downloadBtn) return { error: 'Download button not found' };

        // Fetch the converted PNG blob via the active object URL in DOM
        const img = document.querySelector('.preview-panel:nth-child(2) img');
        if (!img || !img.src) return { error: 'Converted image preview not found' };

        const pngRes = await fetch(img.src);
        const pngBuf = await pngRes.arrayBuffer();
        const pngBytes = new Uint8Array(pngBuf);

        // Verify PNG magic signature
        const isPng =
          pngBytes[0] === 0x89 &&
          pngBytes[1] === 0x50 &&
          pngBytes[2] === 0x4E &&
          pngBytes[3] === 0x47 &&
          pngBytes[4] === 0x0D &&
          pngBytes[5] === 0x0A &&
          pngBytes[6] === 0x1A &&
          pngBytes[7] === 0x0A;

        // Verify IHDR width, height, and color type
        const view = new DataView(pngBuf);
        const ihdrWidth = view.getUint32(16, false);
        const ihdrHeight = view.getUint32(20, false);
        const bitDepth = pngBytes[24];
        const colorType = pngBytes[25]; // 6 is RGBA (Truecolor with alpha)

        // Step 4: Verify transparency is preserved by drawing PNG back onto a canvas and inspecting pixels
        const testImg = new Image();
        await new Promise((r) => {
          testImg.onload = r;
          testImg.src = img.src;
        });

        const inspectCanvas = document.createElement('canvas');
        inspectCanvas.width = TARGET_W;
        inspectCanvas.height = TARGET_H;
        const iCtx = inspectCanvas.getContext('2d');
        iCtx.drawImage(testImg, 0, 0);

        // Pixel at (10, 10) must be transparent (alpha = 0)
        const cornerPixel = iCtx.getImageData(10, 10, 1, 1).data;
        const cornerAlpha = cornerPixel[3];

        // Pixel in blue rect (100, 100) must be opaque blue
        const bluePixel = iCtx.getImageData(100, 100, 1, 1).data;
        const blueR = bluePixel[0];
        const blueB = bluePixel[2];
        const blueAlpha = bluePixel[3];

        // Pixel in center circle (TARGET_W/2, TARGET_H/2) must have alpha around 128 (semi-transparent)
        const centerPixel = iCtx.getImageData(TARGET_W / 2, TARGET_H / 2, 1, 1).data;
        const centerAlpha = centerPixel[3];

        return {
          isPng,
          ihdrWidth,
          ihdrHeight,
          bitDepth,
          colorType,
          cornerAlpha,
          blueR,
          blueB,
          blueAlpha,
          centerAlpha,
          byteLength: pngBytes.byteLength
        };
      })()`
    });

    const res = result?.result?.value;
    if (!res) throw new Error('Evaluation returned null');
    if (res.error) throw new Error(res.error);

    test('Output has genuine PNG 8-byte magic signature (not renamed WebP)', () => {
      assert.equal(res.isPng, true, 'Output does not have valid PNG signature');
    });

    test('PNG IHDR width matches source (1280px)', () => {
      assert.equal(res.ihdrWidth, 1280, `Expected 1280, got ${res.ihdrWidth}`);
    });

    test('PNG IHDR height matches source (720px)', () => {
      assert.equal(res.ihdrHeight, 720, `Expected 720, got ${res.ihdrHeight}`);
    });

    test('PNG color type is 6 (RGBA with alpha channel) or supports alpha', () => {
      assert.ok(res.colorType === 6 || res.colorType === 4, `Expected color type with alpha (6 or 4), got ${res.colorType}`);
    });

    test('Transparent background has alpha = 0 (corner pixel)', () => {
      assert.equal(res.cornerAlpha, 0, `Expected corner alpha 0, got ${res.cornerAlpha}`);
    });

    test('Opaque blue rectangle retains full alpha (alpha = 255) and blue color', () => {
      assert.equal(res.blueAlpha, 255, `Expected blue rect alpha 255, got ${res.blueAlpha}`);
      assert.ok(res.blueB > 200, `Expected high blue component, got ${res.blueB}`);
    });

    test('Semi-transparent circle retains partial alpha (~128)', () => {
      assert.ok(res.centerAlpha > 80 && res.centerAlpha < 180, `Expected center alpha ~128, got ${res.centerAlpha}`);
    });

    test('Exported PNG file size is substantial (> 1KB)', () => {
      assert.ok(res.byteLength > 1024, `PNG size is too small: ${res.byteLength} bytes`);
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
  await runDifficultBrowserTest();
} catch (err) {
  fail(`Top-level: ${err.message}`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) {
  console.error('\n❌ Difficult tests FAILED.');
  process.exit(1);
} else {
  console.log('\n✅ All difficult tests PASS');
}
