import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, rgb } from 'pdf-lib';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runPdfToExcelChromeTest() {
  console.log('=== Starting Real Chrome CDP PDF to Excel Manual Test ===\n');

  // Create a real tabular PDF for ingestion
  const samplePdfPath = path.resolve('temp_test_table.pdf');
  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 400]);
  const rows = [
    ['Product', 'Qty', 'Unit Price', 'Total'],
    ['MacBook Pro', '3', '$2,499.00', '$7,497.00'],
    ['Dell XPS 15', '2', '$1,899.00', '$3,798.00'],
    ['LG UltraFine 4K', '5', '$699.00', '$3,495.00']
  ];
  let y = 340;
  for (const row of rows) {
    let x = 40;
    for (const cell of row) {
      page.drawText(cell, { x, y, size: 13, color: rgb(0.1, 0.1, 0.3) });
      x += 130;
    }
    y -= 26;
  }
  const sampleBytes = await doc.save();
  fs.writeFileSync(samplePdfPath, sampleBytes);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9348',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/pdf-to-excel`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9348/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9348 within 6 seconds');
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
    assert.strictEqual(title, 'PDF to Excel Converter');
    const hasDropzone = await evaluate('!!document.querySelector(".dropzone-container")');
    assert.strictEqual(hasDropzone, true);
    const overflowDesktop = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(overflowDesktop, false);
    console.log('   ✓ Desktop initial UI verified (title, dropzone, zero overflow)\n');

    console.log('2. Simulating Tabular PDF File Upload...');
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

    // Wait for file parsing and worker initialization
    let pageCountBadge = '';
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      pageCountBadge = await evaluate('document.querySelector(".file-info-badges .split-badge")?.textContent') || '';
      if (pageCountBadge && !pageCountBadge.includes('Loading')) break;
    }
    console.log(`   Detected document badge: "${pageCountBadge}"`);
    assert.match(pageCountBadge, /1 page/);

    console.log('3. Triggering PDF to Excel Conversion...');
    await evaluate('document.getElementById("convert-excel-btn").click()');

    // Wait for conversion completion
    let downloadBtnExists = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      downloadBtnExists = await evaluate('!!document.getElementById("download-excel-btn")');
      if (downloadBtnExists) break;
    }
    assert.strictEqual(downloadBtnExists, true, 'Download Excel button must appear after conversion');

    const resultFilename = await evaluate('document.querySelector(".split-result-filename")?.textContent');
    const resultMeta = await evaluate('document.querySelector(".split-result-meta")?.textContent');
    console.log(`   Generated output: "${resultFilename}" (${resultMeta})`);
    assert.ok(resultFilename.includes('.xlsx'));
    assert.ok(resultMeta.includes('rows'));
    console.log('   ✓ Excel XLSX conversion generated successfully\n');

    console.log('4. Testing Mobile Viewport (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));
    const mobileOverflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
    assert.strictEqual(mobileOverflow, false, 'Mobile viewport must have zero horizontal overflow');
    console.log('   ✓ Mobile layout verified (zero overflow)\n');

    console.log('5. Verifying Runtime Console Errors...');
    console.log('   Console errors:', pageErrors);
    assert.strictEqual(pageErrors.length, 0, 'No console errors should occur');
    console.log('   ✓ 0 runtime console errors detected.\n');

    console.log('=== REAL CHROME PDF TO EXCEL TEST PASSED ===\n');

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

runPdfToExcelChromeTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
