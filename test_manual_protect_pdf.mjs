import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runProtectPdfChromeTest() {
  console.log('=== Starting Real Chrome CDP Protect PDF Manual Test ===\n');

  // Create a real 2-page PDF for protection testing
  const samplePdfPath = path.resolve('temp_test_protect.pdf');
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 2; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`Top Secret Document Page ${i}`, { x: 50, y: 650, size: 22, color: rgb(0.8, 0.1, 0.1) });
  }
  const sampleBytes = await doc.save();
  fs.writeFileSync(samplePdfPath, sampleBytes);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9351',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/protect-pdf`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9351/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9351 within 6 seconds');
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
    assert.strictEqual(title, 'Protect PDF with Password');
    const hasDropzone = await evaluate('!!document.querySelector(".dropzone-container")');
    assert.strictEqual(hasDropzone, true);
    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, dropzone, zero overflow)\n');

    console.log('2. Simulating PDF File Upload...');
    const docNode = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#file-input-protect'
    });
    assert.ok(inputNode.nodeId, 'File input element must exist in DOM');

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [samplePdfPath]
    });

    // Wait for page parsing
    let pageCountText = '';
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      pageCountText = await evaluate('document.getElementById("protect-page-count")?.textContent') || '';
      if (pageCountText && !pageCountText.includes('0')) break;
    }
    console.log(`   Detected page count: "${pageCountText}"`);
    assert.match(pageCountText, /2 pages/);

    console.log('3. Testing Password Validation & Mismatch Detection...');
    // Helper to trigger React controlled input
    await evaluate(`
      window.__setReactInput = (id, val) => {
        const el = document.getElementById(id);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
    `);

    // Enter password
    await evaluate('window.__setReactInput("protect-password-input", "SafePass123!")');
    // Enter mismatched confirmation
    await evaluate('window.__setReactInput("protect-confirm-input", "MismatchPass")');
    await new Promise((r) => setTimeout(r, 150));

    const mismatchWarning = await evaluate('document.body.innerText.includes("Passwords do not match")');
    assert.strictEqual(mismatchWarning, true, 'Mismatch warning must be visible');
    const isActionDisabled = await evaluate('document.getElementById("protect-pdf-action-btn").disabled');
    assert.strictEqual(isActionDisabled, true, 'Protect button must be disabled when passwords mismatch');
    console.log('   ✓ Password mismatch detection verified\n');

    console.log('4. Testing Password Show/Hide Toggle & Matching Confirmation...');
    // Toggle show password
    await evaluate('document.getElementById("toggle-password-visibility").click()');
    await new Promise((r) => setTimeout(r, 50));
    const inputTypeAfterToggle = await evaluate('document.getElementById("protect-password-input").type');
    assert.strictEqual(inputTypeAfterToggle, 'text', 'Password input should toggle to text');

    // Toggle back to password
    await evaluate('document.getElementById("toggle-password-visibility").click()');
    await new Promise((r) => setTimeout(r, 50));
    const inputTypeRestored = await evaluate('document.getElementById("protect-password-input").type');
    assert.strictEqual(inputTypeRestored, 'password', 'Password input should toggle back to password');

    // Enter matching confirmation
    await evaluate('window.__setReactInput("protect-confirm-input", "SafePass123!")');
    await new Promise((r) => setTimeout(r, 150));
    const isActionNowEnabled = await evaluate('!document.getElementById("protect-pdf-action-btn").disabled');
    assert.strictEqual(isActionNowEnabled, true, 'Protect button must be enabled when passwords match');
    console.log('   ✓ Password toggle and matching confirmation verified\n');

    console.log('5. Executing Real AES-256 PDF Encryption...');
    await evaluate('document.getElementById("protect-pdf-action-btn").click()');

    // Wait for output generation
    let downloadBtnExists = false;
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 200));
      downloadBtnExists = await evaluate('!!document.getElementById("download-protected-pdf-btn")');
      if (downloadBtnExists) break;
    }
    assert.strictEqual(downloadBtnExists, true, 'Download protected PDF button must appear');

    const resultMeta = await evaluate('document.getElementById("protect-result-meta")?.textContent');
    console.log(`   Generated output: "${resultMeta}"`);
    assert.ok(resultMeta.includes('-protected.pdf'));
    assert.ok(resultMeta.includes('AES-256 Encrypted'));

    // Verify security: password inputs cleared from memory
    const passValueAfter = await evaluate('document.getElementById("protect-password-input")?.value || ""');
    assert.strictEqual(passValueAfter, '', 'Password must be wiped from memory/DOM after encryption');
    console.log('   ✓ AES-256 encrypted output created & password state purged from memory\n');

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
    await evaluate('document.getElementById("reset-protect-btn").click()');
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
    console.log('=== REAL CHROME CDP PROTECT PDF TEST: ALL PASS ===');
  } finally {
    try {
      if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
    } catch {}
    chrome.kill();
  }
}

runProtectPdfChromeTest().catch((err) => {
  console.error('Chrome CDP Test FAILED:', err);
  process.exit(1);
});
