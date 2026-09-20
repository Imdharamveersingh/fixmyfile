/**
 * Real Google Chrome automated browser test suite for Image Compressor (/image-compressor)
 * Uses Chrome DevTools Protocol (CDP) on port 9333.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/image-compressor';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Image Compressor Validation ===\n');

  // Launch headless Chrome
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9333',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    DEV_SERVER_URL
  ]);

  try {
    await new Promise((r) => setTimeout(r, 2000));

    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9333/json/list', (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No Chrome page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let reqId = 1;
    const pendingRequests = new Map();

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pendingRequests.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };

    await send('Page.enable');
    await send('DOM.enable');

    // Wait for React to mount
    for (let i = 0; i < 50; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.dropzone')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log('1. Verifying initial page load and SEO...');
    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        title: document.title,
        heading: document.querySelector('.tool-h1')?.textContent,
        hasDropzone: !!document.querySelector('.dropzone'),
        badge: document.querySelector('.tool-badge-accent')?.textContent
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.ok(pageInfo.result.value.title.includes('Image Compressor Online'));
    assert.strictEqual(pageInfo.result.value.heading, 'Image Compressor');
    assert.strictEqual(pageInfo.result.value.hasDropzone, true);

    // TEST A: Photographic JPG (fixmyfile-test-landscape.jpg)
    console.log('\n2. TEST A: Uploading photographic JPG (1600 × 1000 px)...');
    const jpgPath = path.resolve('test-fixtures/fixmyfile-test-landscape.jpg');

    const docRes = await send('DOM.getDocument');
    const inputNode = await send('DOM.querySelector', {
      nodeId: docRes.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [jpgPath],
      nodeId: inputNode.nodeId
    });

    await new Promise((r) => setTimeout(r, 600));

    const workbenchInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        fileName: document.querySelector('.compress-file-name')?.textContent,
        dimensions: document.querySelector('.compress-page-badge')?.textContent,
        buttonText: document.querySelector('.workbench-cta-bar button')?.textContent?.trim(),
        quality: document.querySelector('.quality-label strong')?.textContent
      })`
    });
    console.log('  Workbench State:', workbenchInfo.result.value);
    assert.strictEqual(workbenchInfo.result.value.fileName, 'fixmyfile-test-landscape.jpg');
    assert.strictEqual(workbenchInfo.result.value.dimensions, '1600 × 1000 px');
    assert.strictEqual(workbenchInfo.result.value.quality, '80%');

    console.log('  Clicking "Compress Image" and waiting for completion...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    let completed = false;
    let resData = null;
    for (let i = 0; i < 40; i++) {
      const stateSnap = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const successBanner = document.querySelector('.compress-success-banner');
          const downloadBtn = document.querySelector('.bg-action-group button');
          const metricPills = Array.from(document.querySelectorAll('.metric-pill')).map(p => p.textContent.trim());
          const metricBadge = document.querySelector('.metric-badge')?.textContent?.trim();
          const metricDim = document.querySelector('.metric-dim-badge')?.textContent?.trim();
          const previewImg = document.querySelectorAll('.bg-preview-img')[1];
          return {
            hasSuccess: !!successBanner,
            downloadBtn: downloadBtn?.textContent?.trim(),
            metricPills,
            metricBadge,
            metricDim,
            renderedWidth: previewImg?.naturalWidth,
            renderedHeight: previewImg?.naturalHeight,
            hasSrc: !!previewImg?.src
          };
        })()`
      });
      resData = stateSnap.result?.value;
      if (resData?.hasSuccess) {
        completed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    assert.ok(completed, 'JPEG compression completed successfully');
    console.log('  Compression Metrics:', {
      pills: resData.metricPills,
      badge: resData.metricBadge,
      dim: resData.metricDim,
      renderedWidth: resData.renderedWidth,
      renderedHeight: resData.renderedHeight
    });
    assert.strictEqual(resData.renderedWidth, 1600, 'Output width strictly preserved at 1600px');
    assert.strictEqual(resData.renderedHeight, 1000, 'Output height strictly preserved at 1000px');
    assert.ok(resData.downloadBtn.includes('Download Compressed JPG'));

    // TEST B & C: Transparent PNG (transparent-badge.png 400 × 400 px)
    console.log('\n3. TEST B & C: Uploading Transparent PNG (400 × 400 px)...');
    const pngPath = path.resolve('test-fixtures/transparent-badge.png');

    // Click "Compress Another Image"
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });

    const docRes2 = await send('DOM.getDocument');
    const inputNode2 = await send('DOM.querySelector', {
      nodeId: docRes2.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [pngPath],
      nodeId: inputNode2.nodeId
    });

    await new Promise((r) => setTimeout(r, 600));

    const pngWorkbench = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        fileName: document.querySelector('.compress-file-name')?.textContent,
        dimensions: document.querySelector('.compress-page-badge')?.textContent,
        formatBadge: document.querySelector('.compress-icon-badge')?.textContent
      })`
    });
    console.log('  PNG Workbench State:', pngWorkbench.result.value);
    assert.strictEqual(pngWorkbench.result.value.dimensions, '400 × 400 px');
    assert.strictEqual(pngWorkbench.result.value.formatBadge, 'PNG');

    console.log('  Compressing Transparent PNG...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    let pngCompleted = false;
    let pngResData = null;
    for (let i = 0; i < 40; i++) {
      const snap = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const successBanner = document.querySelector('.compress-success-banner');
          const downloadBtn = document.querySelector('.bg-action-group button');
          const previewImg = document.querySelectorAll('.bg-preview-img')[1];
          const hasBackdropToggles = !!document.querySelector('.bg-backdrop-toggles');
          const checkerboardActive = !!document.querySelector('.backdrop-btn.active');
          return {
            hasSuccess: !!successBanner,
            downloadBtn: downloadBtn?.textContent?.trim(),
            renderedWidth: previewImg?.naturalWidth,
            renderedHeight: previewImg?.naturalHeight,
            hasBackdropToggles,
            checkerboardActive
          };
        })()`
      });
      pngResData = snap.result?.value;
      if (pngResData?.hasSuccess) {
        pngCompleted = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    assert.ok(pngCompleted, 'PNG compression completed successfully');
    console.log('  PNG Result State:', pngResData);
    assert.strictEqual(pngResData.renderedWidth, 400, 'PNG output width strictly preserved at 400px');
    assert.strictEqual(pngResData.renderedHeight, 400, 'PNG output height strictly preserved at 400px');
    assert.strictEqual(pngResData.hasBackdropToggles, true, 'Transparency backdrop toggles visible');
    assert.ok(pngResData.downloadBtn.includes('Download Compressed PNG'));

    // TEST D: Quality Controls & Presets
    console.log('\n4. TEST D: Testing Quality Presets and Sliders...');
    // Click "Clear & Reset"
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-text-danger').click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    // Check reset returned to dropzone
    const resetCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `!!document.querySelector('.dropzone')`
    });
    assert.strictEqual(resetCheck.result.value, true, 'Clear & Reset returned to initial dropzone');

    // Upload test-736x736.png
    const test736Path = path.resolve('test-fixtures/test-736x736.png');
    const docRes3 = await send('DOM.getDocument');
    const inputNode3 = await send('DOM.querySelector', {
      nodeId: docRes3.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [test736Path],
      nodeId: inputNode3.nodeId
    });
    await new Promise((r) => setTimeout(r, 600));

    // Test clicking preset 40%
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.preset-btn')[0].click();`
    });
    const preset40Val = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelector('.quality-label strong')?.textContent`
    });
    console.log('  Preset 40% active:', preset40Val.result.value);
    assert.strictEqual(preset40Val.result.value, '40%');

    // Test clicking preset 90%
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.preset-btn')[3].click();`
    });
    const preset90Val = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelector('.quality-label strong')?.textContent`
    });
    console.log('  Preset 90% active:', preset90Val.result.value);
    assert.strictEqual(preset90Val.result.value, '90%');

    console.log('\n================================================================');
    console.log('ALL IN-BROWSER CHROME MANUAL TESTS PASSED (100%)!');
    console.log('================================================================\n');
  } finally {
    chrome.kill();
  }
}

runBrowserValidation().catch((err) => {
  console.error('Validation error:', err);
  process.exit(1);
});
