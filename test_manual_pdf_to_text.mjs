import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runPdfToTextChromeTest() {
  console.log('=== Starting Real Chrome CDP PDF to Text Manual Test ===\n');

  // Create a real 2-page text PDF for extraction testing
  const samplePdfPath = path.resolve('temp_test_text_extract.pdf');
  const doc = await PDFDocument.create();
  for (let i = 1; i <= 2; i++) {
    const page = doc.addPage([500, 600]);
    page.drawText(`FixMyFile Chrome CDP Text Page ${i}`, { x: 50, y: 550, size: 18, color: rgb(0.1, 0.2, 0.6) });
    page.drawText(`This is paragraph content on page ${i} for client verification.`, { x: 50, y: 500, size: 12, color: rgb(0, 0, 0) });
  }
  fs.writeFileSync(samplePdfPath, await doc.save());

  // Create a scanned/image-only PDF (no text)
  const scannedPdfPath = path.resolve('temp_test_scanned.pdf');
  const scannedDoc = await PDFDocument.create();
  const scannedPage = scannedDoc.addPage([500, 600]);
  scannedPage.drawRectangle({ x: 40, y: 40, width: 420, height: 520, color: rgb(0.9, 0.9, 0.9) });
  fs.writeFileSync(scannedPdfPath, await scannedDoc.save());

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9354',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/pdf-to-text`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9354/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9354 within 6 seconds');
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
    assert.strictEqual(title, 'PDF to Text — Extract Text Online');
    const hasDropzone = await evaluate('!!document.getElementById("pdf-to-text-dropzone")');
    assert.strictEqual(hasDropzone, true, 'Dropzone must exist');

    const phaseBadge = await evaluate('document.querySelector(".tool-badge-accent")?.textContent');
    assert.strictEqual(phaseBadge, 'Phase 4', 'Phase badge must be Phase 4');

    const breadcrumb = await evaluate('document.querySelector(".breadcrumb-current")?.textContent');
    assert.strictEqual(breadcrumb, 'PDF to Text');

    const pageDocumentTitle = await evaluate('document.title');
    assert.match(pageDocumentTitle, /PDF to Text/);

    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, badges, breadcrumb, dropzone, zero overflow)\n');

    console.log('2. Simulating Text PDF File Upload...');
    let docNode = await send('DOM.getDocument');
    let inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#pdf-to-text-file-input'
    });
    assert.ok(inputNode.nodeId, 'File input element must exist in DOM');

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [samplePdfPath]
    });

    // Wait for file info bar and page count inspection
    let fileName = '';
    let fileMeta = '';
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      fileName = await evaluate('document.getElementById("pdf-text-file-name")?.textContent') || '';
      fileMeta = await evaluate('document.getElementById("pdf-text-file-size")?.textContent') || '';
      if (fileName && fileMeta && !fileMeta.includes('0 page')) break;
    }
    assert.strictEqual(fileName, 'temp_test_text_extract.pdf');
    console.log(`   File loaded: ${fileName} (${fileMeta})`);
    assert.match(fileMeta, /2 pages/);
    console.log('   ✓ File selection and metadata inspection verified\n');

    console.log('3. Executing Text Extraction...');
    const extractBtnExists = await evaluate('!!document.getElementById("extract-text-action-btn")');
    assert.strictEqual(extractBtnExists, true);

    await evaluate('document.getElementById("extract-text-action-btn").click()');

    // Wait for extracted-text-success-card
    let successCardVisible = false;
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 250));
      successCardVisible = await evaluate('!!document.getElementById("extracted-text-success-card")');
      if (successCardVisible) break;
    }
    assert.strictEqual(successCardVisible, true, 'Success card must appear after extraction');

    const extractedText = await evaluate('document.getElementById("extracted-text-preview")?.value') || '';
    console.log('   Extracted preview length:', extractedText.length, 'characters');
    assert.match(extractedText, /--- Page 1 ---/);
    assert.match(extractedText, /FixMyFile Chrome CDP Text Page 1/);
    assert.match(extractedText, /--- Page 2 ---/);
    assert.match(extractedText, /FixMyFile Chrome CDP Text Page 2/);

    const statsText = await evaluate('document.getElementById("pdf-text-meta")?.textContent');
    console.log(`   Stats displayed: "${statsText}"`);
    assert.match(statsText, /2 pages/);
    assert.match(statsText, /words/);
    assert.match(statsText, /characters/);
    console.log('   ✓ Extraction completed with valid structured text and page separators\n');

    console.log('4. Testing Copy Text and Download buttons...');
    // Test Copy button
    await evaluate('document.getElementById("copy-text-btn").click()');
    await new Promise((r) => setTimeout(r, 100));
    const copyBtnText = await evaluate('document.getElementById("copy-text-btn")?.textContent');
    assert.match(copyBtnText, /Copied/);
    console.log('   ✓ Copy button interactive state verified');

    // Verify Download button exists
    const downloadBtnExists = await evaluate('!!document.getElementById("download-txt-btn")');
    assert.strictEqual(downloadBtnExists, true);
    console.log('   ✓ Download .txt button verified\n');

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
    await evaluate('document.getElementById("extract-another-pdf-btn").click()');
    await new Promise((r) => setTimeout(r, 300));
    const dropzoneRestored = await evaluate('!!document.getElementById("pdf-to-text-dropzone")');
    assert.strictEqual(dropzoneRestored, true, 'Dropzone must be restored after reset');
    console.log('   ✓ Reset successfully cleared state and restored dropzone\n');

    console.log('7. Testing Scanned / Image-Only PDF Alert Flow...');
    // Re-query file input on restored dropzone
    docNode = await send('DOM.getDocument');
    inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#pdf-to-text-file-input'
    });
    assert.ok(inputNode.nodeId);

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [scannedPdfPath]
    });

    // Wait for file info bar
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      fileName = await evaluate('document.getElementById("pdf-text-file-name")?.textContent') || '';
      if (fileName) break;
    }
    assert.strictEqual(fileName, 'temp_test_scanned.pdf');

    // Click extract
    await evaluate('document.getElementById("extract-text-action-btn").click()');

    // Wait for scanned alert card
    let scannedCardVisible = false;
    for (let i = 0; i < 35; i++) {
      await new Promise((r) => setTimeout(r, 250));
      scannedCardVisible = await evaluate('!!document.getElementById("no-text-alert-card")');
      if (scannedCardVisible) break;
    }
    assert.strictEqual(scannedCardVisible, true, 'No selectable text alert card must appear');

    const alertMessage = await evaluate('document.getElementById("no-text-alert-card")?.textContent') || '';
    assert.ok(alertMessage.includes('No selectable text was found'), 'Alert must state no selectable text was found');
    assert.ok(alertMessage.includes('OCR') && alertMessage.includes('not currently supported'), 'Alert must clarify OCR is not supported');
    console.log('   ✓ Scanned PDF alert card properly warns user without generating empty file\n');

    // Reset from alert card
    await evaluate('document.getElementById("no-text-choose-another-btn").click()');
    await new Promise((r) => setTimeout(r, 300));
    const finalDropzone = await evaluate('!!document.getElementById("pdf-to-text-dropzone")');
    assert.strictEqual(finalDropzone, true);
    console.log('   ✓ Scanned alert reset works properly\n');

    console.log('8. Checking Console Errors...');
    console.log('   Console error count:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.error('   Errors detected:', pageErrors);
    }
    assert.strictEqual(pageErrors.length, 0, 'No console errors should occur');
    console.log('   ✓ Zero console errors detected\n');

    ws.close();
    console.log('=== REAL CHROME CDP PDF TO TEXT TEST: ALL PASS ===');
  } finally {
    try {
      if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
      if (fs.existsSync(scannedPdfPath)) fs.unlinkSync(scannedPdfPath);
    } catch {}
    chrome.kill();
  }
}

runPdfToTextChromeTest().catch((err) => {
  console.error('Chrome CDP Test FAILED:', err);
  process.exit(1);
});
