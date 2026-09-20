/**
 * Real Google Chrome automated browser test suite for Image Resizer (/image-resizer)
 * Uses Chrome DevTools Protocol (CDP) on port 9333.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/image-resizer';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Image Resizer Validation ===\n');

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

    async function setInputValue(selector, value) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const input = document.querySelector('${selector}');
          if (!input) return;
          if (input._valueTracker) {
            input._valueTracker.setValue('');
          }
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, '${value}');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        })()`
      });
      await new Promise((r) => setTimeout(r, 200));
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
        heading: document.querySelector('.tool-h1')?.textContent,
        hasDropzone: !!document.querySelector('.dropzone'),
        badge: document.querySelector('.tool-badge-accent')?.textContent
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.ok(pageInfo.result.value.title.includes('Image Resizer Online'));
    assert.strictEqual(pageInfo.result.value.heading, 'Image Resizer');
    assert.strictEqual(pageInfo.result.value.hasDropzone, true);

    // TEST A: PORTRAIT (640 × 853 px -> Width 1080 with locked ratio)
    console.log('\n2. TEST A: Uploading Portrait image (640 × 853 px)...');
    const portraitPath = path.resolve('test-fixtures/portrait-640x853.png');

    const docRes1 = await send('DOM.getDocument');
    const inputNode1 = await send('DOM.querySelector', {
      nodeId: docRes1.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [portraitPath],
      nodeId: inputNode1.nodeId
    });

    await new Promise((r) => setTimeout(r, 600));

    const portraitWorkbench = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        fileName: document.querySelector('.compress-file-name')?.textContent,
        origBadge: document.querySelector('.compress-page-badge')?.textContent,
        initialW: document.querySelector('#target-width-input')?.value,
        initialH: document.querySelector('#target-height-input')?.value,
        isLocked: document.querySelector('.ratio-lock-btn')?.classList.contains('locked')
      })`
    });
    console.log('  Portrait Workbench State:', portraitWorkbench.result.value);
    assert.strictEqual(portraitWorkbench.result.value.initialW, '640');
    assert.strictEqual(portraitWorkbench.result.value.initialH, '853');
    assert.strictEqual(portraitWorkbench.result.value.isLocked, true);

    console.log('  Changing Width to 1080 (Aspect Ratio Locked)...');
    await setInputValue('#target-width-input', '1080');

    const calcCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        w: document.querySelector('#target-width-input')?.value,
        h: document.querySelector('#target-height-input')?.value,
        scale: document.querySelector('.scale-badge')?.textContent
      })`
    });
    console.log('  Calculated Proportional Dimensions:', calcCheck.result.value);
    assert.strictEqual(calcCheck.result.value.w, '1080');
    assert.ok(['1439', '1440'].includes(calcCheck.result.value.h), `Height is proportional (${calcCheck.result.value.h})`);

    console.log('  Clicking "Resize Image"...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    let resA = null;
    for (let i = 0; i < 40; i++) {
      const snap = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const successBanner = document.querySelector('.compress-success-banner');
          const previewImg = document.querySelectorAll('.bg-preview-img')[1];
          const downloadBtn = document.querySelector('.bg-action-group button');
          return {
            hasSuccess: !!successBanner,
            renderedWidth: previewImg?.naturalWidth,
            renderedHeight: previewImg?.naturalHeight,
            downloadBtn: downloadBtn?.textContent?.trim()
          };
        })()`
      });
      resA = snap.result?.value;
      if (resA?.hasSuccess) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    assert.ok(resA?.hasSuccess, 'Resize completed successfully');
    console.log('  TEST A Result:', resA);
    assert.strictEqual(resA.renderedWidth, 1080, 'Output width matches 1080');
    assert.ok([1439, 1440].includes(resA.renderedHeight), 'Output height matches proportional 1439/1440');

    // TEST B: LANDSCAPE (1600 × 1000 px)
    console.log('\n3. TEST B: Uploading Landscape image (1600 × 1000 px)...');
    const landscapePath = path.resolve('test-fixtures/fixmyfile-test-landscape.jpg');
    // Click "Resize Another Image"
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });

    const docRes2 = await send('DOM.getDocument');
    const inputNode2 = await send('DOM.querySelector', {
      nodeId: docRes2.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [landscapePath],
      nodeId: inputNode2.nodeId
    });
    await new Promise((r) => setTimeout(r, 600));

    // Set width to 1080
    await setInputValue('#target-width-input', '1080');

    const calcB = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        w: document.querySelector('#target-width-input')?.value,
        h: document.querySelector('#target-height-input')?.value
      })`
    });
    console.log('  Landscape Proportional Dimensions (Width 1080):', calcB.result.value);
    assert.strictEqual(calcB.result.value.w, '1080');
    assert.strictEqual(calcB.result.value.h, '675');

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    let resB = null;
    for (let i = 0; i < 40; i++) {
      const snap = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const successBanner = document.querySelector('.compress-success-banner');
          const previewImg = document.querySelectorAll('.bg-preview-img')[1];
          return {
            hasSuccess: !!successBanner,
            renderedWidth: previewImg?.naturalWidth,
            renderedHeight: previewImg?.naturalHeight
          };
        })()`
      });
      resB = snap.result?.value;
      if (resB?.hasSuccess) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(resB?.hasSuccess, 'Landscape resize completed');
    console.log('  TEST B Result:', resB);
    assert.strictEqual(resB.renderedWidth, 1080);
    assert.strictEqual(resB.renderedHeight, 675);

    // TEST C: SQUARE (1400 × 1400 px)
    console.log('\n4. TEST C: Uploading Square image (1400 × 1400 px)...');
    const squarePath = path.resolve('test-fixtures/fixmyfile-test-square.jpg');
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.bg-action-group button')[1].click();`
    });

    const docRes3 = await send('DOM.getDocument');
    const inputNode3 = await send('DOM.querySelector', {
      nodeId: docRes3.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [squarePath],
      nodeId: inputNode3.nodeId
    });
    await new Promise((r) => setTimeout(r, 600));

    // Select preset 1080 × 1080 (index 2)
    await send('Runtime.evaluate', {
      expression: `document.querySelectorAll('.preset-pill-btn')[2].click();`
    });
    await new Promise((r) => setTimeout(r, 300));

    const squarePresetState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        w: document.querySelector('#target-width-input')?.value,
        h: document.querySelector('#target-height-input')?.value
      })`
    });
    console.log('  Square 1080 × 1080 preset selected:', squarePresetState.result.value);
    assert.strictEqual(squarePresetState.result.value.w, '1080');
    assert.strictEqual(squarePresetState.result.value.h, '1080');

    // TEST E: TRANSPARENT PNG (transparent-badge.png)
    console.log('\n5. TEST E: Uploading Transparent PNG (400 × 400 px)...');
    const pngPath = path.resolve('test-fixtures/transparent-badge.png');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-text-danger').click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    const docRes4 = await send('DOM.getDocument');
    const inputNode4 = await send('DOM.querySelector', {
      nodeId: docRes4.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [pngPath],
      nodeId: inputNode4.nodeId
    });
    await new Promise((r) => setTimeout(r, 600));

    // Set width to 600
    await send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.querySelector('#target-width-input');
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeInputValueSetter.call(input, '600');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 300));

    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });

    let resE = null;
    for (let i = 0; i < 40; i++) {
      const snap = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const successBanner = document.querySelector('.compress-success-banner');
          const previewImg = document.querySelectorAll('.bg-preview-img')[1];
          const hasBackdropToggles = !!document.querySelector('.bg-backdrop-toggles');
          const downloadBtn = document.querySelector('.bg-action-group button');
          return {
            hasSuccess: !!successBanner,
            renderedWidth: previewImg?.naturalWidth,
            renderedHeight: previewImg?.naturalHeight,
            hasBackdropToggles,
            downloadBtn: downloadBtn?.textContent?.trim()
          };
        })()`
      });
      resE = snap.result?.value;
      if (resE?.hasSuccess) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    assert.ok(resE?.hasSuccess, 'Transparent PNG resize completed');
    console.log('  TEST E Result:', resE);
    assert.strictEqual(resE.renderedWidth, 600);
    assert.strictEqual(resE.renderedHeight, 600);
    assert.strictEqual(resE.hasBackdropToggles, true, 'Transparency backdrop toggles visible');
    assert.ok(resE.downloadBtn.includes('Download Resized PNG'));

    // TEST F: UNLOCKED ASPECT RATIO
    console.log('\n6. TEST F: Unlocking aspect ratio & testing independent dimensions...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.ratio-lock-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 300));

    // Change Width to 500 and Height to 800
    await setInputValue('#target-width-input', '500');
    await setInputValue('#target-height-input', '800');

    const unlockState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        w: document.querySelector('#target-width-input')?.value,
        h: document.querySelector('#target-height-input')?.value,
        isUnlocked: document.querySelector('.ratio-lock-btn')?.classList.contains('unlocked'),
        warning: document.querySelector('.ratio-hint-badge.unlocked')?.textContent
      })`
    });
    console.log('  Unlocked Custom Dimensions:', unlockState.result.value);
    assert.strictEqual(unlockState.result.value.w, '500');
    assert.strictEqual(unlockState.result.value.h, '800');
    assert.strictEqual(unlockState.result.value.isUnlocked, true);
    assert.ok(unlockState.result.value.warning.includes('may distort image'));

    // TEST G: SAFE HANDLING OF LARGE / UNSAFE DIMENSIONS
    console.log('\n7. TEST G: Testing safe handling of excessive dimensions (15,000 px)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const inputW = document.querySelector('#target-width-input');
        nativeInputValueSetter.call(inputW, '15000');
        inputW.dispatchEvent(new Event('input', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    // Clear previous output so resize button shows
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-actions button').click();`
    });
    await new Promise((r) => setTimeout(r, 300));

    // Re-upload test square
    const docRes5 = await send('DOM.getDocument');
    const inputNode5 = await send('DOM.querySelector', {
      nodeId: docRes5.root.nodeId,
      selector: 'input[type="file"]'
    });
    await send('DOM.setFileInputFiles', {
      files: [squarePath],
      nodeId: inputNode5.nodeId
    });
    await new Promise((r) => setTimeout(r, 600));

    // Set excessive width
    await setInputValue('#target-width-input', '15000');

    // Click Resize Image
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.workbench-cta-bar button').click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    const errorAlert = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelector('.tool-alert-error .alert-message')?.textContent`
    });
    console.log('  Excessive dimension error alert:', errorAlert.result.value);
    assert.ok(errorAlert.result.value?.includes('too large for your browser'));

    // TEST H: RESET STATE
    console.log('\n8. TEST H: Testing Clear & Reset...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('.btn-text-danger').click();`
    });
    await new Promise((r) => setTimeout(r, 400));

    const finalDropzone = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `!!document.querySelector('.dropzone')`
    });
    assert.strictEqual(finalDropzone.result.value, true, 'Returned cleanly to dropzone');

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
