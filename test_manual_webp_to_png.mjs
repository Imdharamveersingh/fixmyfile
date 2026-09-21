/**
 * Real Chrome CDP browser test for Phase 5.5 — WebP to PNG
 * Run: node test_manual_webp_to_png.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/webp-to-png';

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passCount++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failCount++; }

// Valid transparent 4x4 WebP (VP8X with alpha channel)
const TRANSPARENT_WEBP_B64 =
  'UklGRlIAAABXRUJQVlA4IEYAAAAwAQCdASoEAAQAAUAmJagCdAEO/gHOAADA/tFSAAP7z6T/qPDQZMz/dPZ//sv/hD/d/0vf3n/t/7n/rH8w/1z/rqAAAA==';

function writeTestWebp(outputPath) {
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }
  fs.writeFileSync(outputPath, Buffer.from(TRANSPARENT_WEBP_B64, 'base64'));
}

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
  throw new Error(`Chrome did not start CDP on port ${port} within ${maxMs}ms`);
}

async function runViewport(label, width, height, debugPort) {
  console.log(`\n--- ${label} (${width}x${height}) ---`);

  const fixtureDir = path.join(__dirname, 'fixtures');
  const webpFixture = path.join(fixtureDir, `test_fixture_${debugPort}.webp`);
  writeTestWebp(webpFixture);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `--window-size=${width},${height}`,
    TOOL_URL,
  ]);

  try {
    const targets = await waitForChromePort(debugPort);
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

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
        const desc = parsed.params?.exceptionDetails?.exception?.description || parsed.params?.exceptionDetails?.text || '';
        if (desc) pageErrors.push(desc);
      }
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        const errText = parsed.params.args.map((a) => a.value || a.description || '').join(' ');
        if (errText && !errText.includes('favicon') && !errText.includes('wasm') && !errText.includes('ort')) {
          pageErrors.push(`Console error: ${errText}`);
        }
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // 1. Page title
    const titleResult = await send('Runtime.evaluate', { expression: 'document.title' });
    const title = titleResult?.result?.value || '';
    if (title.toLowerCase().includes('webp to png')) pass(`Page title: "${title}"`);
    else fail(`Unexpected title: "${title}"`);

    // 2. H1 text
    const h1Result = await send('Runtime.evaluate', { expression: 'document.querySelector("h1")?.textContent?.trim() || ""' });
    const h1 = h1Result?.result?.value || '';
    if (h1.toLowerCase().includes('webp to png')) pass(`H1: "${h1}"`);
    else fail(`H1 unexpected: "${h1}"`);

    // 3. Dropzone exists
    const dropzoneResult = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-to-png-dropzone")' });
    if (dropzoneResult?.result?.value) pass('Dropzone found');
    else fail('Dropzone not found');

    // 4. Transparency toggle exists
    const toggleResult = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-to-png-transparency-toggle")' });
    if (toggleResult?.result?.value) pass('Transparency toggle found');
    else fail('Transparency toggle not found');

    // 5. Test invalid file rejection
    await send('Runtime.evaluate', {
      expression: `(function() {
        const input = document.getElementById('webp-to-png-file-input');
        const invalidFile = new File(['not an image content'], 'bad.txt', { type: 'text/plain' });
        const dt = new DataTransfer();
        dt.items.add(invalidFile);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`
    });
    await new Promise((r) => setTimeout(r, 500));
    const errorTextRes = await send('Runtime.evaluate', { expression: 'document.getElementById("webp-to-png-error")?.textContent?.trim() || ""' });
    const errorText = errorTextRes?.result?.value || '';
    if (errorText.toLowerCase().includes('invalid format')) pass(`Invalid file correctly rejected: "${errorText}"`);
    else fail(`Expected invalid format error, got: "${errorText}"`);

    // 6. Test real WebP upload & conversion
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async function() {
        // Create valid canvas WebP blob
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 64, 64);

        const blob = await new Promise(r => canvas.toBlob(r, 'image/webp'));
        const webpFile = new File([blob], 'sample.webp', { type: 'image/webp' });
        const input = document.getElementById('webp-to-png-file-input');
        const dt = new DataTransfer();
        dt.items.add(webpFile);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`
    });
    await new Promise((r) => setTimeout(r, 1500));

    // Check result banner
    const resultBanner = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-to-png-result")' });
    if (resultBanner?.result?.value) pass('Result banner displayed after conversion');
    else fail('Result banner not displayed');

    // Check download button
    const downloadBtn = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-to-png-download-btn")' });
    if (downloadBtn?.result?.value) pass('Download button present');
    else fail('Download button not found');

    // Check reset button
    const resetBtn = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-to-png-reset-btn")' });
    if (resetBtn?.result?.value) pass('Reset button present');
    else fail('Reset button not found');

    // 7. Click reset and verify return to IDLE / dropzone
    await send('Runtime.evaluate', { expression: 'document.getElementById("webp-to-png-reset-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 400));
    const dropzoneAfterReset = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-to-png-dropzone")' });
    if (dropzoneAfterReset?.result?.value) pass('Returned to empty state after reset');
    else fail('Did not return to empty state after reset');

    // 8. No horizontal overflow
    const overflowResult = await send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollWidth > window.innerWidth',
    });
    if (!overflowResult?.result?.value) pass('No horizontal overflow detected');
    else fail('Horizontal overflow detected');

    // 9. Zero console errors
    const realErrors = pageErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('wasm') && !e.includes('ort-wasm') && !e.includes('DevTools')
    );
    if (realErrors.length === 0) pass('Zero runtime console errors');
    else fail(`Console errors found: ${realErrors.slice(0, 3).join(' | ')}`);

    ws.close();
  } catch (err) {
    fail(`Exception: ${err.message}`);
  } finally {
    chrome.kill();
    await new Promise((r) => setTimeout(r, 500));
    if (fs.existsSync(webpFixture)) fs.unlinkSync(webpFixture);
  }
}

console.log('\n=== Phase 5.5 — WebP to PNG: Chrome CDP Browser Verification ===');

try {
  await runViewport('Desktop', 1440, 900, 9370);
  await new Promise((r) => setTimeout(r, 800));
  await runViewport('Mobile', 375, 667, 9371);
} catch (err) {
  fail(`Top-level error: ${err.message}`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) {
  console.error('\n❌ Chrome tests FAILED.');
  process.exit(1);
} else {
  console.log('\n✅ All Chrome CDP tests PASS');
}
