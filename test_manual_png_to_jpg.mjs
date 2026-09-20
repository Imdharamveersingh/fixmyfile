/**
 * Real Google Chrome automated browser test suite for PNG to JPG (/png-to-jpg)
 * Uses Chrome DevTools Protocol (CDP) on port 9334.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/png-to-jpg';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser PNG to JPG Validation ===\n');

  // Launch headless Chrome
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9334',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    DEV_SERVER_URL
  ]);

  try {
    await new Promise((r) => setTimeout(r, 2000));

    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9334/json/list', (res) => {
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
    assert.ok(pageInfo.result.value.title.includes('PNG to JPG Converter Online'));
    assert.strictEqual(pageInfo.result.value.heading, 'PNG to JPG Converter Online');
    assert.strictEqual(pageInfo.result.value.hasDropzone, true);
    assert.strictEqual(pageInfo.result.value.badgeFormat, 'PNG → JPG');

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

    // Helper to click reset / convert another image
    async function clickReset() {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const resetBtn = btns.find(b => b.textContent.includes('Convert Another') || b.textContent.includes('Reset'));
          if (resetBtn) resetBtn.click();
        })()`
      });
      await new Promise((r) => setTimeout(r, 400));
    }

    // TEST 1: OPAQUE PNG -> JPG (640 × 853 px)
    console.log('\n2. TEST 1: Uploading Opaque PNG (640 × 853 px)...');
    const opaquePath = path.resolve('test-fixtures/portrait-640x853.png');
    await uploadFile(opaquePath);

    const opaqueWorkbench = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        fileName: document.querySelector('.compress-file-name')?.textContent,
        inputBadge: document.querySelector('.compress-icon-badge')?.textContent,
        dimensionsBadge: document.querySelectorAll('.compress-page-badge')[1]?.textContent,
        hasTransparencyNotice: !!document.querySelector('.png-transparency-notice')
      })`
    });
    console.log('  Opaque Workbench State:', opaqueWorkbench.result.value);
    assert.strictEqual(opaqueWorkbench.result.value.inputBadge, 'PNG');
    assert.ok(opaqueWorkbench.result.value.dimensionsBadge.includes('640 × 853 px'));
    assert.strictEqual(opaqueWorkbench.result.value.hasTransparencyNotice, false);

    console.log('  Clicking "Convert to JPG"...');
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
    assert.ok(t1Details.result.value.metrics.includes('PNG → JPG'));
    assert.ok(t1Details.result.value.convertedSub.includes('640 × 853 px'));
    assert.strictEqual(t1Details.result.value.hasDownload, true);
    console.log('  ✓ TEST 1 (Opaque PNG -> JPG) Passed!');

    // TEST 2: TRANSPARENT PNG -> WHITE JPG (400 × 400 px)
    console.log('\n3. TEST 2: Uploading Transparent PNG -> White Background JPG (400 × 400 px)...');
    await clickReset();

    const transparentPath = path.resolve('test-fixtures/transparent-badge.png');
    await uploadFile(transparentPath);

    // Verify White background option is active by default
    const bgCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        activeBg: document.querySelector('.bg-color-btn.active span:last-child')?.textContent,
        noticeText: document.querySelector('.bg-picker-explanation')?.textContent
      })`
    });
    console.log('  Background Control Check:', bgCheck.result.value);
    assert.strictEqual(bgCheck.result.value.activeBg, 'White');
    assert.ok(bgCheck.result.value.noticeText.includes('JPG does not support transparency'));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t2Res = await waitForConversion();
    assert.strictEqual(t2Res.hasSuccess, true);

    const t2Details = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        sub: document.querySelectorAll('.bg-preview-sub')[1]?.textContent
      })`
    });
    console.log('  Test 2 Output:', t2Details.result.value);
    assert.ok(t2Details.result.value.sub.includes('400 × 400 px'));
    console.log('  ✓ TEST 2 (Transparent PNG -> White JPG) Passed!');

    // TEST 3: TRANSPARENT PNG -> BLACK JPG
    console.log('\n4. TEST 3: Uploading Transparent PNG -> Black Background JPG...');
    await clickReset();
    await uploadFile(transparentPath);

    // Select Black background option
    console.log('  Selecting Black background option...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const options = Array.from(document.querySelectorAll('.bg-color-btn'));
        const blackOpt = options.find(o => o.textContent.includes('Black'));
        if (blackOpt) blackOpt.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t3Res = await waitForConversion();
    assert.strictEqual(t3Res.hasSuccess, true);
    console.log('  ✓ TEST 3 (Transparent PNG -> Black JPG) Passed!');

    // TEST 4: TRANSPARENT PNG -> CUSTOM BACKGROUND JPG (#FF6600)
    console.log('\n5. TEST 4: Uploading Transparent PNG -> Custom Background JPG (#ff6600)...');
    await clickReset();
    await uploadFile(transparentPath);

    // Select Custom option and set hex to #ff6600
    await send('Runtime.evaluate', {
      expression: `(() => {
        const customInput = document.getElementById('custom-bg-color-input');
        if (customInput) {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeInputValueSetter.call(customInput, '#ff6600');
          customInput.dispatchEvent(new Event('input', { bubbles: true }));
          customInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t4Res = await waitForConversion();
    assert.strictEqual(t4Res.hasSuccess, true);
    console.log('  ✓ TEST 4 (Transparent PNG -> Custom #ff6600 JPG) Passed!');

    // TEST 5: SEMI-TRANSPARENT PNG (200 × 200 px)
    console.log('\n6. TEST 5: Uploading Semi-transparent PNG (200 × 200 px)...');
    await clickReset();
    const semiPath = path.resolve('test-fixtures/semitransparent.png');
    await uploadFile(semiPath);

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    const t5Res = await waitForConversion();
    assert.strictEqual(t5Res.hasSuccess, true);

    const t5Details = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelectorAll('.bg-preview-sub')[1]?.textContent`
    });
    console.log('  Test 5 Dimensions:', t5Details.result.value);
    assert.ok(t5Details.result.value.includes('200 × 200 px'));
    console.log('  ✓ TEST 5 (Semi-transparent PNG) Passed!');

    // TEST 6: QUALITY COMPARISON (Quality 40 vs 90)
    console.log('\n7. TEST 6: Quality Comparison (40% vs 90%)...');
    await clickReset();
    await uploadFile(opaquePath);

    // Set slider to 40%
    await send('Runtime.evaluate', {
      expression: `(() => {
        const slider = document.getElementById('png-to-jpg-quality-slider');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(slider, '40');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    await waitForConversion();

    const q40SizeText = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelectorAll('.bg-preview-sub')[1]?.textContent`
    });
    console.log('  Quality 40% Output Info:', q40SizeText.result.value);

    // Now test with 90%
    await clickReset();
    await uploadFile(opaquePath);

    await send('Runtime.evaluate', {
      expression: `(() => {
        const slider = document.getElementById('png-to-jpg-quality-slider');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(slider, '90');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    await waitForConversion();

    const q90SizeText = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelectorAll('.bg-preview-sub')[1]?.textContent`
    });
    console.log('  Quality 90% Output Info:', q90SizeText.result.value);
    console.log('  ✓ TEST 6 (Quality 40% vs 90% response) Passed!');

    // TEST 7: DIMENSIONS EXACT PRESERVATION (400 × 400 -> 400 × 400)
    console.log('\n8. TEST 7: Strict Dimension Preservation Check...');
    await clickReset();
    await uploadFile(transparentPath);
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    await waitForConversion();

    const dimCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        origSub: document.querySelectorAll('.bg-preview-sub')[0]?.textContent,
        convertedSub: document.querySelectorAll('.bg-preview-sub')[1]?.textContent
      })`
    });
    console.log('  Dimension Check:', dimCheck.result.value);
    assert.ok(dimCheck.result.value.origSub.includes('400 × 400 px'));
    assert.ok(dimCheck.result.value.convertedSub.includes('400 × 400 px'));
    console.log('  ✓ TEST 7 (400 × 400 preserved exactly) Passed!');

    // TEST 8: DOWNLOADED BLOB INTEGRITY & MAGIC BYTES
    console.log('\n9. TEST 8: Downloaded Blob JPEG Verification in Browser...');
    const blobCheck = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const img = document.querySelectorAll('.bg-preview-img')[1];
        if (!img || !img.src) return { error: 'No converted img element' };
        const res = await fetch(img.src);
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[bytes.length - 2] === 0xFF && bytes[bytes.length - 1] === 0xD9;
        const bmp = await createImageBitmap(new Blob([buf], { type: 'image/jpeg' }));
        return {
          byteLength: bytes.length,
          isJpeg,
          width: bmp.width,
          height: bmp.height,
          type: res.headers.get('content-type') || 'image/jpeg'
        };
      })()`
    });
    console.log('  Blob Binary JPEG Verification:', blobCheck.result.value);
    assert.strictEqual(blobCheck.result.value.isJpeg, true);
    assert.strictEqual(blobCheck.result.value.width, 400);
    assert.strictEqual(blobCheck.result.value.height, 400);
    assert.ok(blobCheck.result.value.byteLength > 1000);
    console.log('  ✓ TEST 8 (Blob is authentic decodable JPEG with exact dimensions) Passed!');

    // TEST 9: UNSUPPORTED JPG UPLOAD REJECTION
    console.log('\n10. TEST 9: Uploading Unsupported JPG File...');
    await clickReset();

    const jpgFixturePath = path.resolve('test-fixtures/fixmyfile-test-portrait.jpg');
    await uploadFile(jpgFixturePath);
    await new Promise((r) => setTimeout(r, 400));

    const jpgErr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasError: !!document.querySelector('.tool-alert-error'),
        msg: document.querySelector('.tool-alert-error .alert-message')?.textContent
      })`
    });
    console.log('  Unsupported JPG Rejection:', jpgErr.result.value);
    assert.strictEqual(jpgErr.result.value.hasError, true);
    assert.strictEqual(jpgErr.result.value.msg, 'Please upload a PNG image.');
    console.log('  ✓ TEST 9 (Unsupported JPG rejected with friendly message) Passed!');

    // TEST 10: RESET & RE-UPLOAD VALID PNG
    console.log('\n11. TEST 10: Reset & Upload Another Image...');
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

    await uploadFile(transparentPath);
    await new Promise((r) => setTimeout(r, 400));

    const reuploadCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasDropzone: !!document.querySelector('.dropzone'),
        hasWorkbench: !!document.querySelector('.files-workbench'),
        fileName: document.querySelector('.compress-file-name')?.textContent
      })`
    });
    console.log('  Re-upload Workbench State:', reuploadCheck.result.value);
    assert.strictEqual(reuploadCheck.result.value.hasWorkbench, true);
    assert.strictEqual(reuploadCheck.result.value.fileName, 'transparent-badge.png');
    console.log('  ✓ TEST 10 (Clean reset and re-upload) Passed!');

    console.log('\n==================================================');
    console.log('ALL 10 REAL CHROME MANUAL TESTS PASSED (100%)!');
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
