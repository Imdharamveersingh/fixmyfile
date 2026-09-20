import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';
import { encryptPDF } from '@pdfsmaller/pdf-encrypt';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runUnlockPdfChromeTest() {
  console.log('=== Starting Real Chrome CDP Unlock PDF Manual Test ===\n');

  // Create a real encrypted 2-page PDF for unlock testing
  const samplePdfPath = path.resolve('temp_test_unlock.pdf');
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 2; i++) {
    const page = doc.addPage([500, 700]);
    page.drawText(`Confidential Unlock Test Page ${i}`, { x: 50, y: 650, size: 20, color: rgb(0.1, 0.2, 0.7) });
  }
  const plainBytes = await doc.save();
  const encBytes = await encryptPDF(plainBytes, 'UnlockSecret#2026', { algorithm: 'AES-256' });
  fs.writeFileSync(samplePdfPath, encBytes);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9352',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/unlock-pdf`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9352/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9352 within 6 seconds');
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
    assert.strictEqual(title, 'Unlock PDF — Remove Password');
    const hasDropzone = await evaluate('!!document.getElementById("unlock-pdf-dropzone")');
    assert.strictEqual(hasDropzone, true, 'Dropzone must exist');

    const phaseBadge = await evaluate('document.querySelector(".tool-badge-accent")?.textContent');
    assert.strictEqual(phaseBadge, 'Phase 4', 'Phase badge must be Phase 4');

    const breadcrumb = await evaluate('document.querySelector(".breadcrumb-current")?.textContent');
    assert.strictEqual(breadcrumb, 'Unlock PDF');

    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, badges, breadcrumb, dropzone, zero overflow)\n');

    console.log('2. Simulating Encrypted PDF File Upload...');
    const docNode = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#unlock-pdf-file-input'
    });
    assert.ok(inputNode.nodeId, 'File input element must exist in DOM');

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [samplePdfPath]
    });

    // Wait for PDF status inspection
    let passwordPanelVisible = false;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      passwordPanelVisible = await evaluate('!!document.getElementById("password-required-panel")');
      if (passwordPanelVisible) break;
    }
    assert.strictEqual(passwordPanelVisible, true, 'Password required panel must appear for encrypted PDF');
    console.log('   ✓ Encrypted PDF detected, password panel displayed\n');

    console.log('3. Testing Wrong Password Rejection in UI...');
    await evaluate(`
      window.__setReactInput = (id, val) => {
        const el = document.getElementById(id);
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
    `);

    // Enter incorrect password
    await evaluate('window.__setReactInput("unlock-password-input", "WrongPasswordXYZ")');
    await evaluate('document.getElementById("unlock-pdf-action-btn").click()');

    let errorBannerText = '';
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      errorBannerText = await evaluate('document.getElementById("unlock-error-banner")?.textContent') || '';
      if (errorBannerText) break;
    }
    console.log(`   Error message displayed: "${errorBannerText}"`);
    assert.match(errorBannerText, /incorrect password/i);
    console.log('   ✓ Wrong password error correctly handled\n');

    console.log('4. Testing Password Toggle & Correct Password Decryption...');
    // Clear error by typing correct password
    await evaluate('window.__setReactInput("unlock-password-input", "UnlockSecret#2026")');
    await new Promise((r) => setTimeout(r, 100));

    // Test toggle eye
    await evaluate('document.querySelector(".protect-toggle-btn").click()');
    await new Promise((r) => setTimeout(r, 50));
    let inputType = await evaluate('document.getElementById("unlock-password-input").type');
    assert.strictEqual(inputType, 'text');

    await evaluate('document.querySelector(".protect-toggle-btn").click()');
    await new Promise((r) => setTimeout(r, 50));
    inputType = await evaluate('document.getElementById("unlock-password-input").type');
    assert.strictEqual(inputType, 'password');

    // Click unlock button
    await evaluate('document.getElementById("unlock-pdf-action-btn").click()');

    // Wait for success output card
    let successCardVisible = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      successCardVisible = await evaluate('!!document.getElementById("unlock-success-card")');
      if (successCardVisible) break;
    }
    assert.strictEqual(successCardVisible, true, 'Unlock success card must appear');

    const resultMeta = await evaluate('document.getElementById("unlock-result-meta")?.textContent');
    console.log(`   Generated output: "${resultMeta}"`);
    assert.ok(resultMeta.includes('unlocked.pdf'));
    assert.ok(resultMeta.includes('2 pages'));
    assert.ok(resultMeta.includes('Protection Removed'));

    const downloadBtnExists = await evaluate('!!document.getElementById("download-unlocked-pdf-btn")');
    assert.strictEqual(downloadBtnExists, true, 'Download button must exist');
    console.log('   ✓ Decryption, page reconstruction, and output generation verified\n');

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
    await evaluate('document.getElementById("unlock-another-btn").click()');
    await new Promise((r) => setTimeout(r, 300));
    const dropzoneRestored = await evaluate('!!document.getElementById("unlock-pdf-dropzone")');
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
    console.log('=== REAL CHROME CDP UNLOCK PDF TEST: ALL PASS ===');
  } finally {
    try {
      if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
    } catch {}
    chrome.kill();
  }
}

runUnlockPdfChromeTest().catch((err) => {
  console.error('Chrome CDP Test FAILED:', err);
  process.exit(1);
});
