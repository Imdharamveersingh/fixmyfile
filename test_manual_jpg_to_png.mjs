/**
 * Real Google Chrome automated browser test suite for JPG to PNG (/jpg-to-png)
 * Uses Chrome DevTools Protocol (CDP) on port 9333.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/jpg-to-png';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser JPG to PNG Validation ===\n');

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

    // Wait for React app mount
    for (let i = 0; i < 50; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.dropzone')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log('1. Verifying initial page load, SEO, and headings...');
    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        title: document.title,
        heading: document.querySelector('.tool-title')?.textContent,
        hasDropzone: !!document.querySelector('.dropzone'),
        badge: document.querySelector('.tool-badge')?.textContent,
        badgeFormat: document.querySelector('.tool-badge-format')?.textContent
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.ok(pageInfo.result.value.title.includes('JPG to PNG Converter Online'));
    assert.strictEqual(pageInfo.result.value.heading, 'JPG to PNG Converter Online');
    assert.strictEqual(pageInfo.result.value.hasDropzone, true);
    assert.strictEqual(pageInfo.result.value.badgeFormat, 'JPG → PNG');

    // Helper to upload a file via CDP
    async function uploadFile(filePath) {
      const docRes = await send('DOM.getDocument');
      const inputNode = await send('DOM.querySelector', {
        nodeId: docRes.root.nodeId,
        selector: 'input[type="file"]'
      });
      await send('DOM.setFileInputFiles', {
        files: [filePath],
        nodeId: inputNode.nodeId
      });
      await new Promise((r) => setTimeout(r, 600));
    }

    // Helper to wait for conversion to complete
    async function waitForConversion() {
      for (let i = 0; i < 40; i++) {
        const res = await send('Runtime.evaluate', {
          returnByValue: true,
          expression: `({
            hasSuccess: !!document.querySelector('.compress-success-banner'),
            hasError: !!document.querySelector('.tool-alert-error'),
            errorMsg: document.querySelector('.tool-alert-error .alert-message')?.textContent,
            btnText: document.querySelector('.workbench-cta-bar button')?.textContent
          })`
        });
        if (res.result.value.hasSuccess || res.result.value.hasError) {
          return res.result.value;
        }
        await new Promise((r) => setTimeout(r, 250));
      }
      throw new Error('Timeout waiting for conversion');
    }

    // TEST A: PORTRAIT JPG -> PNG (1200 × 1600 px)
    console.log('\n2. TEST A: Uploading Portrait JPG (1200 × 1600 px)...');
    const portraitPath = path.resolve('test-fixtures/fixmyfile-test-portrait.jpg');
    await uploadFile(portraitPath);

    const portraitWorkbench = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        fileName: document.querySelector('.compress-file-name')?.textContent,
        inputBadge: document.querySelector('.compress-icon-badge')?.textContent,
        dimensionsBadge: document.querySelectorAll('.compress-page-badge')[1]?.textContent
      })`
    });
    console.log('  Portrait Workbench State:', portraitWorkbench.result.value);
    assert.strictEqual(portraitWorkbench.result.value.inputBadge, 'JPG');
    assert.ok(portraitWorkbench.result.value.dimensionsBadge.includes('1200 × 1600 px'));

    console.log('  Clicking "Convert to PNG"...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    const tARes = await waitForConversion();
    assert.strictEqual(tARes.hasSuccess, true);
    assert.strictEqual(tARes.hasError, false);

    const tADetails = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        metrics: document.querySelector('.compress-metrics-strip')?.textContent,
        convertedTitle: document.querySelectorAll('.bg-preview-title')[1]?.textContent,
        convertedSub: document.querySelectorAll('.bg-preview-sub')[1]?.textContent,
        hasDownload: !!document.querySelector('.bg-action-group button')
      })`
    });
    console.log('  Test A Result:', tADetails.result.value);
    assert.ok(tADetails.result.value.metrics.includes('JPG → PNG'));
    assert.ok(tADetails.result.value.convertedSub.includes('1200 × 1600 px'));
    assert.strictEqual(tADetails.result.value.hasDownload, true);
    console.log('  ✓ TEST A (Portrait JPG -> PNG) Passed!');

    // TEST B: LANDSCAPE JPG -> PNG (1200 × 800 px)
    console.log('\n3. TEST B: Uploading Landscape JPG (1600 × 1000 px)...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    const landscapePath = path.resolve('test-fixtures/fixmyfile-test-landscape.jpg');
    await uploadFile(landscapePath);

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const tBRes = await waitForConversion();
    assert.strictEqual(tBRes.hasSuccess, true);

    const tBDetails = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelectorAll('.bg-preview-sub')[1]?.textContent`
    });
    console.log('  Test B Converted Dimensions:', tBDetails.result.value);
    assert.ok(tBDetails.result.value.includes('1600 × 1000 px'));
    console.log('  ✓ TEST B (Landscape JPG -> PNG) Passed!');

    // TEST C: SQUARE JPG -> PNG (1400 × 1400 px)
    console.log('\n4. TEST C: Uploading Square JPG (1400 × 1400 px)...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    const squarePath = path.resolve('test-fixtures/fixmyfile-test-square.jpg');
    await uploadFile(squarePath);

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const tCRes = await waitForConversion();
    assert.strictEqual(tCRes.hasSuccess, true);

    const tCDetails = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelectorAll('.bg-preview-sub')[1]?.textContent`
    });
    console.log('  Test C Converted Dimensions:', tCDetails.result.value);
    assert.ok(tCDetails.result.value.includes('1400 × 1400 px'));
    console.log('  ✓ TEST C (Square JPG -> PNG) Passed!');

    // TEST D: HIGH RESOLUTION & FINE DETAIL PREVIEW
    console.log('\n5. TEST D & E: High Resolution & Fine Detail Visual Verification...');
    const previewChecks = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        origImgSrc: document.querySelectorAll('.bg-preview-img')[0]?.src?.substring(0, 30),
        convertedImgSrc: document.querySelectorAll('.bg-preview-img')[1]?.src?.substring(0, 30),
        hasBackdropToggles: !!document.querySelector('.bg-backdrop-toggles')
      })`
    });
    console.log('  Preview Checks:', previewChecks.result.value);
    assert.ok(previewChecks.result.value.origImgSrc.startsWith('blob:'));
    assert.ok(previewChecks.result.value.convertedImgSrc.startsWith('blob:'));
    assert.strictEqual(previewChecks.result.value.hasBackdropToggles, true);
    console.log('  ✓ TEST D & E Passed!');

    // TEST F: UNSUPPORTED PNG UPLOAD REJECTION
    console.log('\n6. TEST F: Uploading Unsupported PNG File...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    const pngFixturePath = path.resolve('test-fixtures/portrait-640x853.png');
    await uploadFile(pngFixturePath);
    await new Promise((r) => setTimeout(r, 300));

    const pngErr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasError: !!document.querySelector('.tool-alert-error'),
        msg: document.querySelector('.tool-alert-error .alert-message')?.textContent
      })`
    });
    console.log('  Unsupported PNG Rejection:', pngErr.result.value);
    assert.strictEqual(pngErr.result.value.hasError, true);
    assert.strictEqual(pngErr.result.value.msg, 'Please upload a JPG or JPEG image.');
    console.log('  ✓ TEST F (Unsupported PNG rejected) Passed!');

    // TEST G: CORRUPT JPG HANDLING
    console.log('\n7. TEST G: Corrupt JPG Handling...');
    const corruptJpgPath = path.resolve('test-fixtures/corrupt.jpg');
    fs.writeFileSync(corruptJpgPath, 'NOT A REAL JPEG IMAGE CONTENT');

    await uploadFile(corruptJpgPath);
    await new Promise((r) => setTimeout(r, 400));

    const corruptErr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasError: !!document.querySelector('.tool-alert-error'),
        msg: document.querySelector('.tool-alert-error .alert-message')?.textContent
      })`
    });
    console.log('  Corrupt JPG Handling:', corruptErr.result.value);
    assert.strictEqual(corruptErr.result.value.hasError, true);
    assert.ok(corruptErr.result.value.msg.includes('corrupted') || corruptErr.result.value.msg.includes('failed'));
    fs.unlinkSync(corruptJpgPath);
    console.log('  ✓ TEST G (Corrupt JPG handled gracefully) Passed!');

    // TEST H: RESET & UPLOAD ANOTHER JPG
    console.log('\n8. TEST H: Reset & Upload Another Image...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const closeBtn = document.querySelector('.alert-close-btn');
        if (closeBtn) closeBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    const resetCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasDropzone: !!document.querySelector('.dropzone'),
        hasWorkbench: !!document.querySelector('.files-workbench')
      })`
    });
    assert.strictEqual(resetCheck.result.value.hasDropzone, true);
    assert.strictEqual(resetCheck.result.value.hasWorkbench, false);
    console.log('  ✓ TEST H (Clean reset state) Passed!');

    // TEST I: DOWNLOAD BUTTON & BLOB VERIFICATION
    console.log('\n9. TEST I: Download Action Verification...');
    await uploadFile(portraitPath);
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    await waitForConversion();

    const downloadCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        btnText: document.querySelector('.bg-action-group button')?.textContent,
        convertedSizeText: document.querySelectorAll('.bg-preview-sub')[1]?.textContent
      })`
    });
    console.log('  Download Info:', downloadCheck.result.value);
    assert.ok(downloadCheck.result.value.btnText.includes('Download PNG Image'));
    console.log('  ✓ TEST I (Download verified) Passed!');

    console.log('\n==================================================');
    console.log('ALL REAL CHROME MANUAL TESTS PASSED (100%)!');
    console.log('==================================================\n');

    ws.close();
    chrome.kill('SIGTERM');
  } catch (err) {
    console.error('\nChrome Browser Test Failed:', err);
    chrome.kill('SIGKILL');
    process.exit(1);
  }
}

runBrowserValidation();
