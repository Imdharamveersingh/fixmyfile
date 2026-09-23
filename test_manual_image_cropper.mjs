import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import UPNG from 'upng-js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runImageCropperChromeTest() {
  console.log('=== Starting Real Chrome CDP Image Cropper Manual Test ===\n');

  // Create a real 600x400 RGBA sample PNG fixture
  const samplePngPath = path.resolve('temp_test_crop_fixture.png');
  const width = 600;
  const height = 400;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      rgba[idx] = Math.round((x / width) * 255);       // R gradient
      rgba[idx + 1] = Math.round((y / height) * 255);  // G gradient
      rgba[idx + 2] = 180;                             // B
      rgba[idx + 3] = 255;                             // A
    }
  }
  const pngBuffer = UPNG.encode([rgba.buffer], width, height, 0);
  fs.writeFileSync(samplePngPath, Buffer.from(pngBuffer));

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9358',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `${BASE_URL}/image-cropper`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9358/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9358 within 6 seconds');
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

    console.log('2. Navigating to /image-cropper...');
    await send('Page.navigate', { url: `${BASE_URL}/image-cropper` });
    for (let wait = 0; wait < 20; wait++) {
      await new Promise((r) => setTimeout(r, 200));
      const chk = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('#image-cropper-dropzone')`,
        returnByValue: true
      });
      if (chk.result?.value) break;
    }

    // Evaluate Desktop UI Elements
    const desktopEvaluation = await send('Runtime.evaluate', {
      expression: `(() => {
        const h1 = document.querySelector('.tool-h1')?.textContent?.trim();
        const phaseBadge = document.querySelector('.tool-badge-accent')?.textContent?.trim();
        const dropzone = document.querySelector('#image-cropper-dropzone');
        const fileInput = document.querySelector('#image-cropper-file-input');
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
    assert(dRes.title.includes('Image Cropper'), 'Document title must contain "Image Cropper"');
    assert.equal(dRes.h1, 'Image Cropper', 'H1 must be "Image Cropper"');
    assert.equal(dRes.phaseBadge, 'Phase 7.7', 'Page badge must be Phase 7.7');
    assert(dRes.hasDropzone, 'Dropzone must be visible');
    assert(dRes.hasFileInput, 'File input must exist');

    console.log('3. Uploading 600x400 sample image fixture...');
    const docRoot = await send('DOM.getDocument');
    const fileInputNode = await send('DOM.querySelector', {
      nodeId: docRoot.root.nodeId,
      selector: '#image-cropper-file-input'
    });

    await send('DOM.setFileInputFiles', {
      nodeId: fileInputNode.nodeId,
      files: [samplePngPath]
    });

    // Wait for image preview and display dimensions to settle
    let imageLoaded = false;
    for (let i = 0; i < 25; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const check = await send('Runtime.evaluate', {
        expression: `(() => {
          const img = document.querySelector('#image-cropper-preview-img');
          const box = document.querySelector('#image-cropper-active-box');
          return !!(img && box && img.complete && img.naturalWidth > 0);
        })()`,
        returnByValue: true
      });
      if (check.result.value) {
        imageLoaded = true;
        break;
      }
    }
    assert(imageLoaded, 'Image preview and crop box must load successfully');
    console.log('   Image preview and interactive crop box loaded!');

    console.log('4. Interacting with Aspect Ratio Presets (1:1 Square)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btn1_1 = document.querySelector('#crop-ratio-1-1');
        if (btn1_1) btn1_1.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 300));

    const ratioCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.querySelector('#image-cropper-active-box');
        if (!box) return null;
        const rect = box.getBoundingClientRect();
        return { w: Math.round(rect.width), h: Math.round(rect.height) };
      })()`,
      returnByValue: true
    });
    console.log('   Crop box 1:1 dimensions:', ratioCheck.result.value);
    assert(ratioCheck.result.value, 'Crop box must exist');
    assert(Math.abs(ratioCheck.result.value.w - ratioCheck.result.value.h) <= 2, 'Crop box width and height must match 1:1');

    console.log('5. Rotating and Flipping...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('#image-cropper-rotate-right')?.click();
        document.querySelector('#image-cropper-flip-h')?.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 300));

    console.log('6. Executing Crop operation...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const submitBtn = document.querySelector('#image-cropper-submit-btn');
        if (submitBtn) submitBtn.click();
      })()`
    });

    // Wait for success result card
    let successCardVisible = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const check = await send('Runtime.evaluate', {
        expression: `(() => {
          const card = document.querySelector('#image-cropper-success-card');
          const resultImg = document.querySelector('#image-cropper-result-img');
          const downloadBtn = document.querySelector('#image-cropper-download-btn');
          return !!(card && resultImg && downloadBtn);
        })()`,
        returnByValue: true
      });
      if (check.result.value) {
        successCardVisible = true;
        break;
      }
    }
    assert(successCardVisible, 'Success result card with cropped image must appear');
    console.log('   Cropped image generated successfully!');

    console.log('7. Testing Mobile Viewport 375x667...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 600));

    const mobile375Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const docW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        const overflow = docW > clientW;
        const successCard = document.querySelector('#image-cropper-success-card');
        return { docW, clientW, overflow, hasSuccessCard: !!successCard };
      })()`,
      returnByValue: true
    });

    const m375Res = mobile375Check.result.value;
    console.log('   Mobile Check (375x667):', m375Res);
    assert.equal(m375Res.overflow, false, '375px viewport must have 0 horizontal overflow');
    assert(m375Res.hasSuccessCard, 'Success card must remain visible on 375px');

    console.log('8. Testing Mobile Viewport 390x844...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));

    const mobile390Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const docW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        return { docW, clientW, overflow: docW > clientW };
      })()`,
      returnByValue: true
    });
    assert.equal(mobile390Check.result.value.overflow, false, '390px viewport must have 0 horizontal overflow');
    console.log('   390px viewport: 0 horizontal overflow confirmed');

    console.log('9. Testing Tablet Viewport 768x1024...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));

    const tablet768Check = await send('Runtime.evaluate', {
      expression: `(() => {
        const docW = document.documentElement.scrollWidth;
        const clientW = document.documentElement.clientWidth;
        return { docW, clientW, overflow: docW > clientW };
      })()`,
      returnByValue: true
    });
    assert.equal(tablet768Check.result.value.overflow, false, '768px viewport must have 0 horizontal overflow');
    console.log('   768px viewport: 0 horizontal overflow confirmed');

    console.log('10. Testing Download action and output validity...');
    const downloadCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('#image-cropper-download-btn');
        const img = document.querySelector('#image-cropper-result-img');
        const imgSrc = img?.getAttribute('src') || '';
        
        let downloadTriggered = false;
        const origAppendChild = document.body.appendChild;
        document.body.appendChild = function(el) {
          if (el.tagName === 'A' && el.download && el.href) {
            downloadTriggered = { download: el.download, href: el.href };
          }
          return origAppendChild.apply(this, arguments);
        };

        if (btn) btn.click();
        document.body.appendChild = origAppendChild;

        return {
          hasBtn: !!btn,
          imgSrcValid: imgSrc.startsWith('blob:'),
          naturalWidth: img?.naturalWidth || 0,
          naturalHeight: img?.naturalHeight || 0,
          downloadTriggered
        };
      })()`,
      returnByValue: true
    });
    const dlRes = downloadCheck.result.value;
    console.log('   Download Check:', dlRes);
    assert(dlRes.hasBtn, 'Download button must exist');
    assert(dlRes.imgSrcValid, 'Result image must have valid blob URL');
    assert(dlRes.naturalWidth > 0 && dlRes.naturalHeight > 0, 'Cropped output image must have valid dimensions');
    assert(dlRes.downloadTriggered, 'Download must be triggered upon clicking download button');
    assert(dlRes.downloadTriggered.download.includes('cropped'), 'Download attribute must include "cropped"');

    console.log('11. Testing Reset/Crop Again workflow...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const editBtn = document.querySelector('#image-cropper-edit-btn');
        if (editBtn) editBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 500));

    const resetCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const box = document.querySelector('#image-cropper-active-box');
        const submitBtn = document.querySelector('#image-cropper-submit-btn');
        return { hasBox: !!box, hasSubmitBtn: !!submitBtn };
      })()`,
      returnByValue: true
    });
    assert(resetCheck.result.value.hasBox, 'Crop editor must restore upon Edit/Crop Again');
    console.log('   Crop editor restored successfully upon Edit/Crop Again!');

    console.log('12. Checking console errors...');
    const criticalErrors = pageErrors.filter((e) => !e.includes('favicon') && !e.includes('manifest'));
    assert.equal(criticalErrors.length, 0, `Expected 0 console errors, got: ${criticalErrors.join('; ')}`);
    console.log('   0 console errors confirmed!');

    console.log('\n🎉 REAL CHROME MANUAL TEST PASSED SUCCESSFULLY!');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {}
    if (fs.existsSync(samplePngPath)) {
      fs.unlinkSync(samplePngPath);
    }
  }
}

runImageCropperChromeTest().catch((err) => {
  console.error('\n❌ Chrome test failed:', err);
  process.exit(1);
});
