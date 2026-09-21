/**
 * Real Chrome CDP browser test for Phase 5.9 — Image Upscaler
 * Run: node test_manual_image_upscaler.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/image-upscaler';

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
    if (title.toLowerCase().includes('upscaler')) pass(`Page title: "${title}"`);
    else fail(`Unexpected title: "${title}"`);

    const h1Result = await send('Runtime.evaluate', { expression: 'document.querySelector("h1")?.textContent?.trim() || ""' });
    const h1 = h1Result?.result?.value || '';
    if (h1.toLowerCase().includes('image upscaler')) pass(`H1: "${h1}"`);
    else fail(`H1 unexpected: "${h1}"`);

    // 2. Dropzone exists
    const dropzone = await send('Runtime.evaluate', { expression: '!!document.getElementById("image-upscaler-dropzone")' });
    if (dropzone?.result?.value) pass('Dropzone found');
    else fail('Dropzone missing');

    // 3. Upload test image (200x150)
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async function() {
        const canvas = document.createElement('canvas');
        canvas.width = 200;
        canvas.height = 150;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#10b981';
        ctx.fillRect(0, 0, 200, 150);
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px sans-serif';
        ctx.fillText('FIXMYFILE', 30, 80);

        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const file = new File([blob], 'test_graphic.png', { type: 'image/png' });

        const input = document.getElementById('image-upscaler-file-input');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });

    await new Promise((r) => setTimeout(r, 1200));

    // 4. Source dimensions displayed
    const dimsCheck = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('200 × 150 px')`
    });
    if (dimsCheck?.result?.value) pass('Source dimensions displayed (200 × 150 px)');
    else fail('Source dimensions not displayed');

    // 5. Check scale selectors and target resolution
    const scaleBtn4x = await send('Runtime.evaluate', {
      expression: `(function() {
        const btn4x = document.getElementById('image-upscaler-scale-4x');
        if (btn4x) {
          btn4x.click();
          return true;
        }
        return false;
      })()`
    });
    if (scaleBtn4x?.result?.value) pass('Selected 4x scale preset');
    else fail('Could not select 4x scale preset');

    await new Promise((r) => setTimeout(r, 400));

    const targetDimsCheck = await send('Runtime.evaluate', {
      expression: `document.body.innerText.includes('800 × 600 px')`
    });
    if (targetDimsCheck?.result?.value) pass('Estimated 4x target dimensions displayed (800 × 600 px)');
    else fail('Target 4x dimensions not updated');

    // 6. Execute upscaling
    await send('Runtime.evaluate', {
      expression: `document.getElementById('image-upscaler-btn')?.click()`
    });

    await new Promise((r) => setTimeout(r, 2000));

    // 7. Verify result banner & download button
    const resultCheck = await send('Runtime.evaluate', {
      expression: `(function() {
        const res = document.getElementById('image-upscaler-result');
        const downloadBtn = document.getElementById('image-upscaler-download-btn');
        const href = downloadBtn?.getAttribute('href') || '';
        const downloadName = downloadBtn?.getAttribute('download') || '';
        return !!res && !!downloadBtn && href.startsWith('blob:') && downloadName.includes('upscaled');
      })()`
    });
    if (resultCheck?.result?.value) pass('Upscaling completed with download blob and sanitized filename');
    else fail('Upscaling result missing or invalid');

    // 8. Test reset button
    await send('Runtime.evaluate', {
      expression: `document.getElementById('image-upscaler-reset-btn')?.click()`
    });
    await new Promise((r) => setTimeout(r, 500));

    const resetCheck = await send('Runtime.evaluate', {
      expression: `!document.getElementById('image-upscaler-result') && !!document.getElementById('image-upscaler-dropzone')`
    });
    if (resetCheck?.result?.value) pass('Reset successfully restored initial empty dropzone state');
    else fail('Reset failed to restore empty state');

    // 9. Check horizontal overflow
    const overflow = await send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollWidth > window.innerWidth'
    });
    if (!overflow?.result?.value) pass('Zero horizontal overflow');
    else fail('Horizontal overflow detected');

    // 10. Check console errors
    if (pageErrors.length === 0) pass('Zero runtime console errors');
    else fail(`Console errors encountered: ${pageErrors.join(', ')}`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function run() {
  console.log('=== Phase 5.9 — Image Upscaler: Chrome CDP Browser Verification ===');
  await runViewport('Desktop', 1440, 900, 9341);
  await runViewport('Mobile', 375, 667, 9342);

  console.log('\n==================================================');
  console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);

  if (failCount === 0) {
    console.log('\n✅ All Chrome CDP tests PASS\n');
    process.exit(0);
  } else {
    console.error('\n❌ Some Chrome CDP tests FAILED\n');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
