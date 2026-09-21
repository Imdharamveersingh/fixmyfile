/**
 * Real Chrome CDP browser test for Phase 5.8 — Image to PDF
 * Run: node test_manual_image_to_pdf.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/image-to-pdf';

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
    if (title.toLowerCase().includes('pdf')) pass(`Page title: "${title}"`);
    else fail(`Unexpected title: "${title}"`);

    const h1Result = await send('Runtime.evaluate', { expression: 'document.querySelector("h1")?.textContent?.trim() || ""' });
    const h1 = h1Result?.result?.value || '';
    if (h1.toLowerCase().includes('image to pdf')) pass(`H1: "${h1}"`);
    else fail(`H1 unexpected: "${h1}"`);

    // 2. Dropzone exists
    const dropzone = await send('Runtime.evaluate', { expression: '!!document.getElementById("image-to-pdf-dropzone")' });
    if (dropzone?.result?.value) pass('Dropzone found');
    else fail('Dropzone missing');

    // 3. Upload multiple test images (landscape + portrait)
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `(async function() {
        const createImgFile = async (w, h, name, color) => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, w, h);
          const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9));
          return new File([blob], name, { type: 'image/jpeg' });
        };

        const f1 = await createImgFile(400, 200, 'landscape.jpg', '#3b82f6');
        const f2 = await createImgFile(200, 400, 'portrait.jpg', '#ef4444');

        const input = document.getElementById('image-to-pdf-file-input');
        const dt = new DataTransfer();
        dt.items.add(f1);
        dt.items.add(f2);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });

    await new Promise((r) => setTimeout(r, 1200));

    // 4. Verify images are rendered in list
    const listCount = await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.btn-sm[title="Remove"]').length`
    });
    if (listCount?.result?.value === 2) pass('Multiple images rendered in list (2 pages)');
    else fail(`Expected 2 images in list, got ${listCount?.result?.value}`);

    // 5. Test page settings interaction (Page Size, Orientation, Margin)
    const settingsCheck = await send('Runtime.evaluate', {
      expression: `(function() {
        const pageSize = document.getElementById('image-to-pdf-page-size');
        const orientation = document.getElementById('image-to-pdf-orientation');
        const margin = document.getElementById('image-to-pdf-margin');
        return !!pageSize && !!orientation && !!margin;
      })()`
    });
    if (settingsCheck?.result?.value) pass('PDF settings controls available (size, orientation, margin)');
    else fail('Settings controls missing');

    // 6. Click Convert to PDF
    await send('Runtime.evaluate', {
      expression: `document.getElementById('image-to-pdf-convert-btn')?.click()`
    });

    await new Promise((r) => setTimeout(r, 2000));

    // 7. Verify result banner & download button
    const resultCheck = await send('Runtime.evaluate', {
      expression: `(function() {
        const result = document.getElementById('image-to-pdf-result');
        const downloadBtn = document.getElementById('image-to-pdf-download-btn');
        const href = downloadBtn?.getAttribute('href') || '';
        const downloadName = downloadBtn?.getAttribute('download') || '';
        return !!result && !!downloadBtn && href.startsWith('blob:') && downloadName.endsWith('.pdf');
      })()`
    });
    if (resultCheck?.result?.value) pass('PDF generated successfully with download blob and .pdf extension');
    else fail('PDF conversion result missing or invalid');

    // 8. Test reset button
    await send('Runtime.evaluate', {
      expression: `document.getElementById('image-to-pdf-reset-btn')?.click()`
    });
    await new Promise((r) => setTimeout(r, 500));

    const resetCheck = await send('Runtime.evaluate', {
      expression: `!document.getElementById('image-to-pdf-result') && !document.querySelector('.btn-sm[title="Remove"]')`
    });
    if (resetCheck?.result?.value) pass('Reset restored initial empty state');
    else fail('Reset failed to clear images and result');

    // 9. Check horizontal overflow
    const overflow = await send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollWidth > window.innerWidth'
    });
    if (!overflow?.result?.value) pass('Zero horizontal overflow');
    else fail('Horizontal overflow detected');

    // 10. Check runtime errors
    if (pageErrors.length === 0) pass('Zero runtime console errors');
    else fail(`Errors encountered: ${pageErrors.join(', ')}`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function run() {
  console.log('=== Phase 5.8 — Image to PDF: Chrome CDP Browser Verification ===');
  await runViewport('Desktop', 1440, 900, 9331);
  await runViewport('Mobile', 375, 667, 9332);

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
