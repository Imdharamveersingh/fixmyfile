import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runDeletePdfPagesChromeTest() {
  console.log('=== Starting Real Chrome CDP Delete PDF Pages Manual Test ===\n');

  // Create a real 5-page sample PDF
  const samplePdfPath = path.resolve('temp_test_delete_pages.pdf');
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 5; i++) {
    const page = doc.addPage([500, 600]);
    page.drawText(`Delete Verification Page ${i}`, { x: 50, y: 500, size: 20, color: rgb(0.2, 0.4, 0.6) });
  }
  fs.writeFileSync(samplePdfPath, await doc.save());

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9356',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/delete-pdf-pages`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9356/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9356 within 6 seconds');
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
    assert.strictEqual(title, 'Delete PDF Pages — Remove Pages Online');
    const hasDropzone = await evaluate('!!document.getElementById("delete-pdf-dropzone")');
    assert.strictEqual(hasDropzone, true, 'Dropzone must exist');

    const phaseBadge = await evaluate('document.querySelector(".tool-badge-accent")?.textContent');
    assert.strictEqual(phaseBadge, 'Phase 4', 'Phase badge must be Phase 4');

    const breadcrumb = await evaluate('document.querySelector(".breadcrumb-current")?.textContent');
    assert.strictEqual(breadcrumb, 'Delete PDF Pages');

    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, badges, breadcrumb, dropzone, zero overflow)\n');

    console.log('2. Simulating 5-Page PDF File Upload...');
    const docNode = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#delete-pdf-file-input'
    });
    assert.ok(inputNode.nodeId, 'File input element must exist in DOM');

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [samplePdfPath]
    });

    // Wait for file info bar
    let fileName = '';
    let fileMeta = '';
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      fileName = await evaluate('document.getElementById("delete-file-name")?.textContent') || '';
      fileMeta = await evaluate('document.getElementById("delete-file-meta")?.textContent') || '';
      if (fileName && fileMeta && fileMeta.includes('5 pages')) break;
    }
    assert.strictEqual(fileName, 'temp_test_delete_pages.pdf');
    console.log(`   File loaded: ${fileName} (${fileMeta})`);
    assert.match(fileMeta, /5 pages/);
    console.log('   ✓ File selection and metadata inspection verified\n');

    console.log('3. Interacting with Page Deletion UI & Presets...');
    // Verify 5 page cards exist in the delete grid
    const pageCardCount = await evaluate('document.querySelectorAll("#delete-page-grid button").length');
    assert.strictEqual(pageCardCount, 5);

    // Test Delete Even preset (pages 2, 4)
    await evaluate('document.getElementById("delete-even-btn").click()');
    await new Promise((r) => setTimeout(r, 100));
    let rangeVal = await evaluate('document.getElementById("delete-range-input").value');
    console.log('   Range input after Delete Even:', rangeVal);
    assert.strictEqual(rangeVal, '2, 4');

    const summaryText = await evaluate('document.getElementById("delete-summary-text")?.textContent');
    console.log(`   Summary: "${summaryText}"`);
    assert.match(summaryText, /Selected to delete: 2 pages/);
    assert.match(summaryText, /Remaining: 3 pages/);

    const actionBtnText = await evaluate('document.getElementById("delete-pages-action-btn")?.textContent');
    console.log(`   Action button label: "${actionBtnText}"`);
    assert.match(actionBtnText, /Delete 2 Pages \(3 Left\)/);
    console.log('   ✓ Interactive page deletion selection and metrics verified\n');

    console.log('4. Executing Page Deletion...');
    await evaluate('document.getElementById("delete-pages-action-btn").click()');

    // Wait for success card
    let successCardVisible = false;
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 200));
      successCardVisible = await evaluate('!!document.getElementById("delete-success-card")');
      if (successCardVisible) break;
    }
    assert.strictEqual(successCardVisible, true, 'Delete success card must appear');

    const resultMeta = await evaluate('document.getElementById("delete-result-meta")?.textContent');
    console.log(`   Result metadata: "${resultMeta}"`);
    assert.match(resultMeta, /3 pages remaining/);
    assert.match(resultMeta, /2 removed/);

    const downloadBtnExists = await evaluate('!!document.getElementById("download-modified-pdf-btn")');
    assert.strictEqual(downloadBtnExists, true);
    console.log('   ✓ Page deletion completed with verified output metadata\n');

    console.log('5. Checking Mobile Responsive Layout (375x667)...');
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

    console.log('6. Testing Reset Action...');
    await evaluate('document.getElementById("delete-another-btn").click()');
    await new Promise((r) => setTimeout(r, 300));
    const dropzoneRestored = await evaluate('!!document.getElementById("delete-pdf-dropzone")');
    assert.strictEqual(dropzoneRestored, true, 'Dropzone must be restored after reset');
    console.log('   ✓ Reset successfully cleared state and restored dropzone\n');

    console.log('7. Checking Console Errors...');
    console.log('   Console error count:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.error('   Errors detected:', pageErrors);
    }
    assert.strictEqual(pageErrors.length, 0, 'No console errors should occur');
    console.log('   ✓ Zero console errors detected\n');

    ws.close();
    console.log('=== REAL CHROME CDP DELETE PDF PAGES TEST: ALL PASS ===');
  } finally {
    try {
      if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
    } catch {}
    chrome.kill();
  }
}

runDeletePdfPagesChromeTest().catch((err) => {
  console.error('Chrome CDP Test FAILED:', err);
  process.exit(1);
});
