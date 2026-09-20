import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runSplitPdfChromeTest() {
  console.log('=== Starting Real Chrome CDP Split PDF Manual Test ===\n');

  // Create a temporary 6-page PDF for upload
  const samplePdfPath = path.resolve('temp_test_split.pdf');
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 6; i++) {
    const page = doc.addPage([400, 600]);
    page.drawText(`FixMyFile Page ${i}`, { x: 50, y: 500, size: 28, color: rgb(0.1, 0.4, 0.8) });
  }
  const sampleBytes = await doc.save();
  fs.writeFileSync(samplePdfPath, sampleBytes);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9347',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/split-pdf`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9347/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {
        // retry
      }
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9347 within 6 seconds');
    }

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No Chrome page target found');

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

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
        pageErrors.push(desc);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map((a) => a.value || a.description).join(' ');
        pageErrors.push(text);
      }
    };

    await send('Runtime.enable');
    await send('DOM.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error('Evaluation error: ' + JSON.stringify(res.exceptionDetails));
      }
      return res.result?.value;
    }

    // Wait for page load
    await new Promise((r) => setTimeout(r, 1200));

    console.log('1. Checking Initial UI State on Desktop (1440x900)...');
    const title = await evaluate('document.querySelector("h1.tool-main-title")?.textContent');
    assert.strictEqual(title, 'Split PDF');
    const hasDropzone = await evaluate('!!document.querySelector(".dropzone-container")');
    assert.strictEqual(hasDropzone, true);
    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, dropzone, zero overflow)\n');

    console.log('2. Simulating PDF File Ingestion...');
    const docNode = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: 'input[type="file"]'
    });
    assert.ok(inputNode.nodeId, 'File input element must exist in DOM');

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [samplePdfPath]
    });

    // Wait for file parsing
    await new Promise((r) => setTimeout(r, 800));

    const pageCountBadge = await evaluate('document.querySelector(".file-info-badges .split-badge")?.textContent');
    console.log(`   Detected page count badge: "${pageCountBadge}"`);
    assert.match(pageCountBadge, /6 pages/);

    console.log('3. Testing Invalid Range Error Handling in UI...');
    // Enter invalid out of bounds range
    await evaluate(`(() => {
      const input = document.querySelector(".split-range-input");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, "10-20");
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 200));
    await evaluate('document.getElementById("split-pdf-btn").click()');
    await new Promise((r) => setTimeout(r, 400));

    const errorText = await evaluate('document.querySelector(".split-error-banner")?.textContent');
    console.log(`   Captured error message: "${errorText}"`);
    assert.match(errorText, /exceeds total document pages/i);
    console.log('   ✓ Range validation error displayed correctly\n');

    console.log('4. Executing Valid Range Split ("1-2, 4-6")...');
    await evaluate(`(() => {
      const input = document.querySelector(".split-range-input");
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(input, "1-2, 4-6");
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await new Promise((r) => setTimeout(r, 200));
    await evaluate('document.getElementById("split-pdf-btn").click()');

    // Wait for split completion
    let resultsCount = 0;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 150));
      resultsCount = await evaluate('document.querySelectorAll(".split-result-item").length');
      if (resultsCount === 2) break;
    }
    assert.strictEqual(resultsCount, 2, 'Should produce 2 output files for ranges 1-2 and 4-6');
    const resultFiles = await evaluate('Array.from(document.querySelectorAll(".split-result-filename")).map(el => el.textContent)');
    console.log('   Generated filenames:', resultFiles);
    assert.ok(resultFiles.some((f) => f.includes('pages-1-2.pdf')));
    assert.ok(resultFiles.some((f) => f.includes('pages-4-6.pdf')));
    console.log('   ✓ Range split verified with downloadable PDF outputs\n');

    console.log('5. Testing Burst Mode (Extract All Pages)...');
    // Switch to burst tab
    await evaluate('document.querySelectorAll(".split-tab-btn")[2].click()');
    await new Promise((r) => setTimeout(r, 200));
    await evaluate('document.getElementById("split-pdf-btn").click()');

    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 150));
      resultsCount = await evaluate('document.querySelectorAll(".split-result-item").length');
      if (resultsCount === 6) break;
    }
    assert.strictEqual(resultsCount, 6, 'Burst mode should produce 6 individual page files');
    console.log('   ✓ Burst mode produced 6 individual 1-page PDF items\n');

    console.log('6. Testing Mobile Viewport (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));
    const mobileOverflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(mobileOverflow, false, 'Mobile viewport must have zero horizontal overflow');
    console.log('   ✓ Mobile responsive layout verified (zero overflow)\n');

    console.log('7. Verifying Runtime Console Errors...');
    console.log('   Console errors:', pageErrors);
    assert.strictEqual(pageErrors.length, 0, 'No console errors should occur');
    console.log('   ✓ 0 runtime console errors detected.\n');

    console.log('=== REAL CHROME SPLIT PDF TEST PASSED ===\n');

    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  } finally {
    if (fs.existsSync(samplePdfPath)) {
      fs.unlinkSync(samplePdfPath);
    }
  }
}

runSplitPdfChromeTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
