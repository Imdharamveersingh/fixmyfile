import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runHeicToJpgChromeTest() {
  console.log('=== Starting Real Chrome CDP HEIC to JPG Manual Test ===\n');

  const fixturePath = path.resolve('fixtures/sample2.heic');
  assert(fs.existsSync(fixturePath), `Fixture must exist at ${fixturePath}`);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9359',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/heic-to-jpg`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9359/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9359 within 6 seconds');
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

    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && pendingRequests.has(parsed.id)) {
        const { resolve, reject } = pendingRequests.get(parsed.id);
        pendingRequests.delete(parsed.id);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.result);
      }
      if (parsed.method === 'Runtime.exceptionThrown') {
        const desc = parsed.params?.exceptionDetails?.exception?.description || parsed.params?.exceptionDetails?.text;
        pageErrors.push(desc);
      }
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        const errText = parsed.params.args.map((a) => a.value || a.description || '').join(' ');
        pageErrors.push(`Console error: ${errText}`);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    console.log('1. Setting Desktop Viewport 1440x900...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('2. Navigating to /heic-to-jpg...');
    await send('Page.navigate', { url: `${BASE_URL}/heic-to-jpg` });
    await new Promise((r) => setTimeout(r, 1200));

    // Evaluate Desktop UI Elements
    const desktopEvaluation = await send('Runtime.evaluate', {
      expression: `(() => {
        const h1 = document.querySelector('.tool-h1')?.textContent?.trim();
        const phaseBadge = document.querySelector('.tool-badge-accent')?.textContent?.trim();
        const dropzone = document.querySelector('#heic-dropzone');
        const fileInput = document.querySelector('#heic-file-input');
        return {
          title: document.title,
          h1,
          phaseBadge,
          hasDropzone: !!dropzone,
          hasFileInput: !!fileInput
        };
      })()`,
      returnByValue: true
    });

    const dRes = desktopEvaluation.result.value;
    console.log('   Desktop Evaluation:', dRes);
    assert(dRes.title.includes('HEIC to JPG'), 'Document title must contain "HEIC to JPG"');
    assert.equal(dRes.h1, 'HEIC to JPG Converter', 'H1 must be "HEIC to JPG Converter"');
    assert.equal(dRes.phaseBadge, 'Phase 5', 'Page badge must be Phase 5');
    assert(dRes.hasDropzone, 'Dropzone must be visible');
    assert(dRes.hasFileInput, 'File input must exist');

    console.log('3. Uploading real HEIC fixture (fixtures/sample2.heic)...');
    const docRoot = await send('DOM.getDocument');
    const fileInputNode = await send('DOM.querySelector', {
      nodeId: docRoot.root.nodeId,
      selector: '#heic-file-input'
    });

    await send('DOM.setFileInputFiles', {
      nodeId: fileInputNode.nodeId,
      files: [fixturePath]
    });

    // Wait for workbench to appear
    let workbenchVisible = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const check = await send('Runtime.evaluate', {
        expression: `(() => {
          const wb = document.querySelector('#heic-workbench');
          const fn = document.querySelector('#heic-filename')?.textContent?.trim();
          const btn = document.querySelector('#heic-convert-btn');
          return !!(wb && fn && btn);
        })()`,
        returnByValue: true
      });
      if (check.result.value) {
        workbenchVisible = true;
        break;
      }
    }
    assert(workbenchVisible, 'Workbench with file details and convert button must appear');
    console.log('   HEIC file details and convert button loaded!');

    console.log('4. Triggering HEIC to JPG conversion...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('#heic-convert-btn');
        if (btn) btn.click();
      })()`
    });

    // Wait for conversion completion (can take 3-10s depending on CPU)
    console.log('   Waiting for client-side HEIC decoding and JPEG generation...');
    let successBannerVisible = false;
    for (let i = 0; i < 60; i++) { // Up to 30s timeout
      await new Promise((r) => setTimeout(r, 500));
      const check = await send('Runtime.evaluate', {
        expression: `(() => {
          const banner = document.querySelector('#heic-success-banner');
          const resultImg = document.querySelector('#heic-result-img');
          const downloadBtn = document.querySelector('#heic-download-btn');
          const err = document.querySelector('.tool-alert-error')?.textContent;
          const prog = document.querySelector('#heic-progress-indicator')?.textContent;
          return {
            ready: !!(banner && resultImg && downloadBtn),
            err,
            prog
          };
        })()`,
        returnByValue: true
      });
      const val = check.result.value;
      if (i % 4 === 0) {
        console.log(`   [t=${(i * 0.5).toFixed(1)}s] Progress: "${val.prog || 'none'}", Error: "${val.err || 'none'}"`);
      }
      if (val.err) {
        throw new Error(`Browser conversion displayed error: ${val.err}`);
      }
      if (val.ready) {
        successBannerVisible = true;
        break;
      }
    }
    assert(successBannerVisible, 'Conversion must succeed and display success banner with result image');
    console.log('   HEIC successfully converted to JPG!');

    console.log('5. Testing Mobile Viewport 375x667...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 600));

    const mobileCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const docW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        const overflow = docW > clientW;
        const successBanner = document.querySelector('#heic-success-banner');
        return { docW, clientW, overflow, hasSuccessBanner: !!successBanner };
      })()`,
      returnByValue: true
    });

    const mRes = mobileCheck.result.value;
    console.log('   Mobile Check (375x667):', mRes);
    assert.equal(mRes.overflow, false, 'Mobile viewport must have 0 horizontal overflow');
    assert(mRes.hasSuccessBanner, 'Success banner must remain visible and responsive on mobile');

    console.log('6. Checking console errors...');
    const criticalErrors = pageErrors.filter((e) => !e.includes('favicon') && !e.includes('manifest'));
    assert.equal(criticalErrors.length, 0, `Expected 0 console errors, got: ${criticalErrors.join('; ')}`);
    console.log('   0 console errors confirmed!');

    console.log('\n🎉 REAL CHROME HEIC TO JPG MANUAL TEST PASSED SUCCESSFULLY!');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {}
  }
}

runHeicToJpgChromeTest().catch((err) => {
  console.error('\n❌ Chrome HEIC test failed:', err);
  process.exit(1);
});
