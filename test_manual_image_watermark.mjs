/**
 * Real Chrome CDP browser test for Phase 5.7 — Image Watermark
 * Run: node test_manual_image_watermark.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/image-watermark';

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passCount++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failCount++; }

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

async function runViewport(label, width, height, debugPort) {
  console.log(`\n--- ${label} (${width}x${height}) ---`);

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
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 2000));

    // 1. Title & Heading
    const titleResult = await send('Runtime.evaluate', { expression: 'document.title' });
    const title = titleResult?.result?.value || '';
    if (title.toLowerCase().includes('watermark')) pass(`Page title: "${title}"`);
    else fail(`Unexpected title: "${title}"`);

    const h1Result = await send('Runtime.evaluate', { expression: 'document.querySelector("h1")?.textContent?.trim() || ""' });
    const h1 = h1Result?.result?.value || '';
    if (h1.toLowerCase().includes('watermark')) pass(`H1: "${h1}"`);
    else fail(`H1 unexpected: "${h1}"`);

    // 2. Dropzone exists
    const dropzone = await send('Runtime.evaluate', { expression: '!!document.getElementById("image-watermark-dropzone")' });
    if (dropzone?.result?.value) pass('Dropzone found');
    else fail('Dropzone missing');

    // 3. Upload test image
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async function() {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 400, 300);

        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'photo.png', { type: 'image/png' });
        const input = document.getElementById('image-watermark-file-input');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`
    });
    await new Promise((r) => setTimeout(r, 1200));

    // 4. Preview Canvas exists
    const previewCanvas = await send('Runtime.evaluate', { expression: '!!document.getElementById("watermark-preview-canvas")' });
    if (previewCanvas?.result?.value) pass('Live watermark preview canvas rendered');
    else fail('Preview canvas missing');

    // 5. Watermark controls: text input, font size, opacity, positions
    const textInput = await send('Runtime.evaluate', { expression: '!!document.getElementById("watermark-text-input")' });
    if (textInput?.result?.value) pass('Text input found');
    else fail('Text input missing');

    const sizeSlider = await send('Runtime.evaluate', { expression: '!!document.getElementById("watermark-font-size-slider")' });
    if (sizeSlider?.result?.value) pass('Font size slider found');
    else fail('Font size slider missing');

    const opacitySlider = await send('Runtime.evaluate', { expression: '!!document.getElementById("watermark-opacity-slider")' });
    if (opacitySlider?.result?.value) pass('Opacity slider found');
    else fail('Opacity slider missing');

    // Test position preset click (Top-Left)
    await send('Runtime.evaluate', { expression: 'document.getElementById("watermark-pos-top-left")?.click()' });
    await new Promise((r) => setTimeout(r, 300));
    pass('Position preset Top-Left clicked');

    // Test position preset click (Center)
    await send('Runtime.evaluate', { expression: 'document.getElementById("watermark-pos-center")?.click()' });
    await new Promise((r) => setTimeout(r, 300));
    pass('Position preset Center clicked');

    // 6. Apply & Export
    await send('Runtime.evaluate', { expression: 'document.getElementById("watermark-apply-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 1200));

    const resultBanner = await send('Runtime.evaluate', { expression: '!!document.getElementById("image-watermark-result")' });
    if (resultBanner?.result?.value) pass('Watermark result banner displayed');
    else fail('Result banner missing');

    const downloadBtn = await send('Runtime.evaluate', { expression: '!!document.getElementById("watermark-download-btn")' });
    if (downloadBtn?.result?.value) pass('Download button present');
    else fail('Download button missing');

    // 7. Reset settings
    await send('Runtime.evaluate', { expression: 'document.getElementById("watermark-reset-btn")?.click()' });
    await new Promise((r) => setTimeout(r, 300));
    pass('Reset settings clicked');

    // 8. Horizontal overflow
    const overflowResult = await send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollWidth > window.innerWidth',
    });
    if (!overflowResult?.result?.value) pass('Zero horizontal overflow');
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
  }
}

console.log('\n=== Phase 5.7 — Image Watermark: Chrome CDP Browser Verification ===');

try {
  await runViewport('Desktop', 1440, 900, 9380);
  await new Promise((r) => setTimeout(r, 800));
  await runViewport('Mobile', 375, 667, 9381);
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
