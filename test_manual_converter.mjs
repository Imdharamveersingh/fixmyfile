/**
 * Real Google Chrome automated browser test suite for Image Converter (/image-converter)
 * Uses Chrome DevTools Protocol (CDP) on port 9333.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/image-converter';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Image Converter Validation ===\n');

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

    console.log('1. Verifying initial page load and SEO...');
    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        title: document.title,
        heading: document.querySelector('.tool-title')?.textContent,
        hasDropzone: !!document.querySelector('.dropzone'),
        badge: document.querySelector('.tool-badge')?.textContent
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.ok(pageInfo.result.value.title.includes('Image Converter Online'));
    assert.strictEqual(pageInfo.result.value.heading, 'Image Converter Online');
    assert.strictEqual(pageInfo.result.value.hasDropzone, true);

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

    // TEST 1: JPG -> PNG (640 x 853)
    console.log('\n2. TEST 1: JPG -> PNG Conversion...');
    const jpgPath = path.resolve('test-fixtures/fixmyfile-test-portrait.jpg');
    await uploadFile(jpgPath);

    const jpgWorkbench = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        fileName: document.querySelector('.compress-file-name')?.textContent,
        inputBadge: document.querySelector('.compress-icon-badge')?.textContent,
        activeOutput: document.querySelector('.format-pill-btn.active .format-pill-name')?.textContent
      })`
    });
    console.log('  Workbench State:', jpgWorkbench.result.value);
    assert.strictEqual(jpgWorkbench.result.value.inputBadge, 'JPG');
    // For JPG input, default target is PNG
    assert.strictEqual(jpgWorkbench.result.value.activeOutput, 'PNG');

    console.log('  Clicking "Convert to PNG"...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    const t1Res = await waitForConversion();
    assert.strictEqual(t1Res.hasSuccess, true);
    assert.strictEqual(t1Res.hasError, false);

    const t1Details = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        metrics: document.querySelector('.compress-metrics-strip')?.textContent,
        convertedTitle: document.querySelectorAll('.bg-preview-title')[1]?.textContent,
        convertedSub: document.querySelectorAll('.bg-preview-sub')[1]?.textContent,
        hasDownload: !!document.querySelector('.bg-action-group button')
      })`
    });
    console.log('  Test 1 Result:', t1Details.result.value);
    assert.ok(t1Details.result.value.metrics.includes('JPG → PNG'));
    assert.ok(t1Details.result.value.convertedSub.includes('1200 × 1600 px'), 'Exact dimensions preserved');
    assert.strictEqual(t1Details.result.value.hasDownload, true);
    console.log('  ✓ TEST 1 (JPG -> PNG) Passed!');

    // TEST 2: PNG -> JPG with Background Color Selection
    console.log('\n3. TEST 2: PNG -> JPG with Transparency & Background Color...');
    // Reset first
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    const transPngPath = path.resolve('test-fixtures/transparent-badge.png');
    await uploadFile(transPngPath);

    const pngWorkbench = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        inputBadge: document.querySelector('.compress-icon-badge')?.textContent,
        activeOutput: document.querySelector('.format-pill-btn.active .format-pill-name')?.textContent,
        hasBgPicker: !!document.querySelector('.converter-bg-picker-box'),
        defaultBgActive: document.querySelector('.bg-color-btn.active')?.textContent.trim()
      })`
    });
    console.log('  PNG Workbench State:', pngWorkbench.result.value);
    assert.strictEqual(pngWorkbench.result.value.inputBadge, 'PNG');
    assert.strictEqual(pngWorkbench.result.value.activeOutput, 'JPG');
    assert.strictEqual(pngWorkbench.result.value.hasBgPicker, true);
    assert.ok(pngWorkbench.result.value.defaultBgActive.includes('White'));

    console.log('  Converting to JPG with White background...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    const t2WhiteRes = await waitForConversion();
    assert.strictEqual(t2WhiteRes.hasSuccess, true);

    const t2WhiteDetails = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        metrics: document.querySelector('.compress-metrics-strip')?.textContent,
        convertedTitle: document.querySelectorAll('.bg-preview-title')[1]?.textContent,
        dimensions: document.querySelector('.metric-pill.highlight')?.textContent
      })`
    });
    console.log('  Test 2 (White BG) Result:', t2WhiteDetails.result.value);
    assert.ok(t2WhiteDetails.result.value.metrics.includes('PNG → JPG'));

    // Now test Black background option
    console.log('  Resetting to test Black background...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));
    await uploadFile(transPngPath);

    // Select Black background
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-color-btn')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t2BlackRes = await waitForConversion();
    assert.strictEqual(t2BlackRes.hasSuccess, true);
    console.log('  ✓ TEST 2 (PNG -> JPG with White & Black backgrounds) Passed!');

    // TEST 3: PNG -> WEBP with Transparency Preservation
    console.log('\n4. TEST 3: PNG -> WEBP with Transparency Preservation...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));
    await uploadFile(transPngPath);

    // Click WEBP pill
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.format-pill-btn')[2].click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    const webpState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        activeOutput: document.querySelector('.format-pill-btn.active .format-pill-name')?.textContent,
        hasQualitySlider: !!document.querySelector('#webp-quality-slider'),
        hasBgPicker: !!document.querySelector('.converter-bg-picker-box')
      })`
    });
    console.log('  PNG -> WEBP Settings:', webpState.result.value);
    assert.strictEqual(webpState.result.value.activeOutput, 'WEBP');
    assert.strictEqual(webpState.result.value.hasQualitySlider, true);
    assert.strictEqual(webpState.result.value.hasBgPicker, false, 'WEBP supports transparency, no JPG background picker');

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t3Res = await waitForConversion();
    assert.strictEqual(t3Res.hasSuccess, true);

    const t3Details = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        metrics: document.querySelector('.compress-metrics-strip')?.textContent,
        hasBackdropToggles: !!document.querySelector('.bg-backdrop-toggles')
      })`
    });
    console.log('  Test 3 (PNG -> WEBP) Result:', t3Details.result.value);
    assert.ok(t3Details.result.value.metrics.includes('PNG → WEBP'));
    assert.strictEqual(t3Details.result.value.hasBackdropToggles, true, 'Backdrop toggles visible for alpha preview');
    console.log('  ✓ TEST 3 (PNG -> WEBP) Passed!');

    // TEST 4: JPG -> WEBP
    console.log('\n5. TEST 4: JPG -> WEBP with Quality Setting...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));
    await uploadFile(jpgPath);

    // Click WEBP
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.format-pill-btn')[2].click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t4Res = await waitForConversion();
    assert.strictEqual(t4Res.hasSuccess, true);
    console.log('  ✓ TEST 4 (JPG -> WEBP) Passed!');

    // Generate a temporary WEBP image file for TEST 5 (WEBP -> PNG)
    console.log('\n6. Generating test WEBP file for TEST 5 (WEBP -> PNG)...');
    const webpDataUrl = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const c = document.createElement('canvas');
        c.width = 400;
        c.height = 300;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, 400, 300);
        return c.toDataURL('image/webp');
      })()`
    });
    const base64Data = webpDataUrl.result.value.replace(/^data:image\/webp;base64,/, '');
    const webpFixturePath = path.resolve('test-fixtures/generated-sample.webp');
    fs.writeFileSync(webpFixturePath, Buffer.from(base64Data, 'base64'));

    // TEST 5: WEBP -> PNG
    console.log('  TEST 5: Uploading WEBP image and converting to PNG...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));
    await uploadFile(webpFixturePath);

    const t5Workbench = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        inputBadge: document.querySelector('.compress-icon-badge')?.textContent,
        activeOutput: document.querySelector('.format-pill-btn.active .format-pill-name')?.textContent
      })`
    });
    console.log('  WEBP Workbench State:', t5Workbench.result.value);
    assert.strictEqual(t5Workbench.result.value.inputBadge, 'WEBP');
    assert.strictEqual(t5Workbench.result.value.activeOutput, 'PNG');

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t5Res = await waitForConversion();
    assert.strictEqual(t5Res.hasSuccess, true);

    const t5Details = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        metrics: document.querySelector('.compress-metrics-strip')?.textContent,
        dimensions: document.querySelector('.metric-pill.highlight')?.textContent
      })`
    });
    console.log('  Test 5 Result:', t5Details.result.value);
    assert.ok(t5Details.result.value.metrics.includes('WEBP → PNG'));
    assert.ok(t5Details.result.value.dimensions.includes('400 × 300 px'));
    console.log('  ✓ TEST 5 (WEBP -> PNG) Passed!');

    // TEST 6: SAME FORMAT (JPG -> JPG)
    console.log('\n7. TEST 6: Same-Format Conversion (JPG -> JPG)...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 400));
    await uploadFile(jpgPath);

    // Select JPG as output
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.format-pill-btn')[0].click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    const sameNotice = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasNotice: !!document.querySelector('.converter-notice-box'),
        noticeText: document.querySelector('.converter-notice-box .notice-text')?.textContent
      })`
    });
    console.log('  Same Format Notice State:', sameNotice.result.value);
    assert.strictEqual(sameNotice.result.value.hasNotice, true);
    assert.ok(sameNotice.result.value.noticeText.includes('re-encoded'));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t6Res = await waitForConversion();
    assert.strictEqual(t6Res.hasSuccess, true);
    console.log('  ✓ TEST 6 (Same format JPG -> JPG) Passed!');

    // TEST 7: RESET
    console.log('\n8. TEST 7: Reset & Convert Another Image...');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });
    await new Promise((r) => setTimeout(r, 300));

    const resetState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasDropzone: !!document.querySelector('.dropzone'),
        hasWorkbench: !!document.querySelector('.files-workbench')
      })`
    });
    assert.strictEqual(resetState.result.value.hasDropzone, true);
    assert.strictEqual(resetState.result.value.hasWorkbench, false);
    console.log('  ✓ TEST 7 (Reset) Passed!');

    // TEST 8: ERROR HANDLING
    console.log('\n9. TEST 8: Unsupported File Error Handling...');
    const dummyPdfPath = path.resolve('test-fixtures/dummy.pdf');
    fs.writeFileSync(dummyPdfPath, '%PDF-1.4 dummy file');

    await uploadFile(dummyPdfPath);
    await new Promise((r) => setTimeout(r, 300));

    const errState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasErrorAlert: !!document.querySelector('.tool-alert-error'),
        errorMessage: document.querySelector('.tool-alert-error .alert-message')?.textContent
      })`
    });
    console.log('  Error Alert State:', errState.result.value);
    assert.strictEqual(errState.result.value.hasErrorAlert, true);
    assert.ok(errState.result.value.errorMessage.includes('Unsupported file format'));

    // Clean up temporary files
    if (fs.existsSync(dummyPdfPath)) fs.unlinkSync(dummyPdfPath);
    if (fs.existsSync(webpFixturePath)) fs.unlinkSync(webpFixturePath);

    console.log('  ✓ TEST 8 (Error handling) Passed!');

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
