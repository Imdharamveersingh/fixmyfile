import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runRotatePdfChromeTest() {
  console.log('=== Starting Real Chrome CDP Rotate PDF Manual Test ===\n');

  // Create a real 3-page PDF for rotation testing
  const samplePdfPath = path.resolve('temp_test_rotate.pdf');
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 3; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`Document Page ${i}`, { x: 50, y: 650, size: 24, color: rgb(0.1, 0.2, 0.7) });
  }
  const sampleBytes = await doc.save();
  fs.writeFileSync(samplePdfPath, sampleBytes);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9350',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/rotate-pdf`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9350/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9350 within 6 seconds');
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
    let title = '';
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      title = await evaluate('document.querySelector("h1.tool-main-title")?.textContent') || '';
      if (title) break;
    }

    console.log('1. Checking Initial UI State on Desktop (1440x900)...');
    assert.strictEqual(title, 'Rotate PDF Pages');
    const hasDropzone = await evaluate('!!document.querySelector(".dropzone-container")');
    assert.strictEqual(hasDropzone, true);
    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, dropzone, zero overflow)\n');

    console.log('2. Simulating PDF File Upload...');
    const docNode = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#file-input-rotate'
    });
    assert.ok(inputNode.nodeId, 'File input element must exist in DOM');

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [samplePdfPath]
    });

    // Wait for page parsing and grid rendering
    let pageCountText = '';
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      pageCountText = await evaluate('document.getElementById("rotate-page-count")?.textContent') || '';
      if (pageCountText && !pageCountText.includes('0')) break;
    }
    console.log(`   Detected page count: "${pageCountText}"`);
    assert.match(pageCountText, /3 pages/);

    const cardCount = await evaluate('document.querySelectorAll("#rotate-pages-grid > div").length');
    assert.strictEqual(cardCount, 3, 'Must render 3 page cards');
    console.log('   ✓ Rendered 3 interactive page thumbnail cards\n');

    console.log('3. Testing Per-Page Interactive Rotations...');
    // Rotate Page 1 clockwise (+90°)
    await evaluate('document.getElementById("rotate-right-p1").click()');
    await new Promise((r) => setTimeout(r, 100));
    const p1Badge = await evaluate('document.querySelector("#page-card-1 .page-angle-badge")?.textContent');
    assert.strictEqual(p1Badge?.trim(), '90°', 'Page 1 badge must show 90°');

    // Rotate Page 3 counter-clockwise (-90° = 270°)
    await evaluate('document.getElementById("rotate-left-p3").click()');
    await new Promise((r) => setTimeout(r, 100));
    const p3Badge = await evaluate('document.querySelector("#page-card-3 .page-angle-badge")?.textContent');
    assert.strictEqual(p3Badge?.trim(), '270°', 'Page 3 badge must show 270°');
    console.log('   ✓ Per-page rotations verified: Page 1 = 90°, Page 3 = 270°\n');

    console.log('4. Testing Bulk Rotate All Actions...');
    // Rotate All +90°
    await evaluate('document.getElementById("rotate-all-right-btn").click()');
    await new Promise((r) => setTimeout(r, 100));
    const p1AfterBulk = await evaluate('document.querySelector("#page-card-1 .page-angle-badge")?.textContent');
    const p2AfterBulk = await evaluate('document.querySelector("#page-card-2 .page-angle-badge")?.textContent');
    assert.strictEqual(p1AfterBulk?.trim(), '180°', 'Page 1 must now be 180° (90 + 90)');
    assert.strictEqual(p2AfterBulk?.trim(), '90°', 'Page 2 must now be 90° (0 + 90)');
    console.log('   ✓ Bulk Rotate All verified (Page 1 = 180°, Page 2 = 90°)\n');

    console.log('5. Executing Rotation & Output Generation...');
    await evaluate('document.getElementById("rotate-pdf-action-btn").click()');

    // Wait for output generation
    let downloadBtnExists = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      downloadBtnExists = await evaluate('!!document.getElementById("download-rotated-pdf-btn")');
      if (downloadBtnExists) break;
    }
    assert.strictEqual(downloadBtnExists, true, 'Download rotated PDF button must appear');

    const resultMeta = await evaluate('document.getElementById("rotate-result-meta")?.textContent');
    console.log(`   Generated output: "${resultMeta}"`);
    assert.ok(resultMeta.includes('-rotated.pdf'));
    assert.ok(resultMeta.includes('3 pages'));
    console.log('   ✓ Rotated PDF generated and validated\n');

    console.log('6. Checking Mobile Responsive Layout (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 300));
    const overflowMobile = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowMobile, false, 'Mobile viewport should have zero horizontal overflow');
    console.log('   ✓ Mobile responsive layout verified (no horizontal overflow)\n');

    console.log('7. Testing Reset Action...');
    await evaluate('document.getElementById("reset-rotate-btn").click()');
    await new Promise((r) => setTimeout(r, 300));
    const dropzoneAfterReset = await evaluate('!!document.querySelector(".dropzone-container")');
    assert.strictEqual(dropzoneAfterReset, true, 'Dropzone must be restored after reset');
    console.log('   ✓ Reset successfully cleared state\n');

    console.log('8. Checking Console Errors...');
    console.log('   Console error count:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.error('   Errors detected:', pageErrors);
    }
    assert.strictEqual(pageErrors.length, 0, 'No console errors should occur');
    console.log('   ✓ Zero console errors detected\n');

    ws.close();
    console.log('=== REAL CHROME CDP ROTATE PDF TEST: ALL PASS ===');
  } finally {
    try {
      if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
    } catch {}
    chrome.kill();
  }
}

runRotatePdfChromeTest().catch((err) => {
  console.error('Chrome CDP Test FAILED:', err);
  process.exit(1);
});
