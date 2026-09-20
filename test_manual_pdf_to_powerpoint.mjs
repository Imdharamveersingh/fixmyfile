import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runPdfToPowerPointChromeTest() {
  console.log('=== Starting Real Chrome CDP PDF to PowerPoint Manual Test ===\n');

  // Create a real 2-page PDF for testing
  const samplePdfPath = path.resolve('temp_test_presentation.pdf');
  const doc = await PDFDocument.create();
  
  // Page 1: Title slide
  const page1 = doc.addPage([720, 540]);
  page1.drawText('Quarterly Business Review', { x: 50, y: 350, size: 28, color: rgb(0.1, 0.2, 0.6) });
  page1.drawText('FixMyFile Automated Testing', { x: 50, y: 300, size: 16, color: rgb(0.3, 0.3, 0.4) });

  // Page 2: Data slide
  const page2 = doc.addPage([720, 540]);
  page2.drawText('Key Performance Indicators', { x: 50, y: 450, size: 24, color: rgb(0.1, 0.2, 0.6) });
  page2.drawText('- Revenue: $1.2M (+24% YoY)', { x: 50, y: 380, size: 16, color: rgb(0.2, 0.2, 0.2) });
  page2.drawText('- Active Users: 85,000 (+40%)', { x: 50, y: 340, size: 16, color: rgb(0.2, 0.2, 0.2) });

  const sampleBytes = await doc.save();
  fs.writeFileSync(samplePdfPath, sampleBytes);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9349',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/pdf-to-powerpoint`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9349/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9349 within 6 seconds');
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
    assert.strictEqual(title, 'PDF to PowerPoint Converter');
    const hasDropzone = await evaluate('!!document.querySelector(".dropzone-container")');
    assert.strictEqual(hasDropzone, true);
    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, dropzone, zero overflow)\n');

    console.log('2. Simulating PDF File Upload...');
    const docNode = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', {
      nodeId: docNode.root.nodeId,
      selector: '#file-input-pptx'
    });
    assert.ok(inputNode.nodeId, 'File input element must exist in DOM');

    await send('DOM.setFileInputFiles', {
      nodeId: inputNode.nodeId,
      files: [samplePdfPath]
    });

    // Wait for file parsing and slide count
    let slideCountText = '';
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      slideCountText = await evaluate('document.getElementById("pptx-page-count")?.textContent') || '';
      if (slideCountText && !slideCountText.includes('Analyzing')) break;
    }
    console.log(`   Detected slide count: "${slideCountText}"`);
    assert.match(slideCountText, /2 slides/);

    console.log('3. Triggering PDF to PowerPoint Conversion...');
    await evaluate('document.getElementById("convert-pptx-btn").click()');

    // Wait for conversion completion
    let downloadBtnExists = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 250));
      downloadBtnExists = await evaluate('!!document.getElementById("download-pptx-btn")');
      if (downloadBtnExists) break;
    }
    if (!downloadBtnExists) {
      const errText = await evaluate('document.querySelector(".tool-error-alert")?.textContent');
      const statusMsg = await evaluate('document.querySelector(".split-controls-area")?.innerText');
      console.error('Conversion failed! Error alert:', errText);
      console.error('Status/Controls text:', statusMsg);
      console.error('Captured page errors:', pageErrors);
    }
    assert.strictEqual(downloadBtnExists, true, 'Download presentation button must appear after conversion');

    const resultMeta = await evaluate('document.getElementById("pptx-result-meta")?.textContent');
    console.log(`   Generated output: "${resultMeta}"`);
    assert.ok(resultMeta.includes('.pptx'));
    assert.ok(resultMeta.includes('2 slides'));
    console.log('   ✓ PowerPoint PPTX presentation generated successfully\n');

    console.log('4. Checking Mobile Responsive Layout (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 300));
    const overflowMobile = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowMobile, false, 'Mobile viewport should have no horizontal overflow');
    console.log('   ✓ Mobile responsive layout verified (no horizontal overflow)\n');

    console.log('5. Testing Reset Action...');
    await evaluate('document.getElementById("reset-pptx-btn").click()');
    await new Promise((r) => setTimeout(r, 300));
    const dropzoneAfterReset = await evaluate('!!document.querySelector(".dropzone-container")');
    assert.strictEqual(dropzoneAfterReset, true, 'Dropzone must be restored after reset');
    console.log('   ✓ Reset successfully cleared state\n');

    console.log('6. Checking Console Errors...');
    console.log('   Console error count:', pageErrors.length);
    if (pageErrors.length > 0) {
      console.error('   Errors detected:', pageErrors);
    }
    assert.strictEqual(pageErrors.length, 0, 'No console errors should occur');
    console.log('   ✓ Zero console errors detected\n');

    ws.close();
    console.log('=== REAL CHROME CDP PDF TO POWERPOINT TEST: ALL PASS ===');
  } finally {
    try {
      if (fs.existsSync(samplePdfPath)) fs.unlinkSync(samplePdfPath);
    } catch {}
    chrome.kill();
  }
}

runPdfToPowerPointChromeTest().catch((err) => {
  console.error('Chrome CDP Test FAILED:', err);
  process.exit(1);
});
