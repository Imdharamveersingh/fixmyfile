/**
 * Difficult / Edge Case Benchmark for Phase 5.2 — HEIC to JPG
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runDifficultHeicBenchmark() {
  console.log('=== STARTING DIFFICULT HEIC TO JPG BENCHMARK ===\n');

  const largeHeicPath = path.resolve('fixtures/sample2.heic');
  const unsupportedHeicPath = path.resolve('fixtures/sample1.heic');

  assert(fs.existsSync(largeHeicPath), `Large HEIC fixture must exist at ${largeHeicPath}`);
  assert(fs.existsSync(unsupportedHeicPath), `Unsupported HEIC fixture must exist at ${unsupportedHeicPath}`);

  const largeStats = fs.statSync(largeHeicPath);
  console.log(`1. Large HEIC Fixture size: ${(largeStats.size / 1024 / 1024).toFixed(2)} MB`);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9362',
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
          http.get('http://127.0.0.1:9362/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9362 within 6 seconds');
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

    console.log('2. Loading /heic-to-jpg...');
    await send('Page.navigate', { url: `${BASE_URL}/heic-to-jpg` });
    await new Promise((r) => setTimeout(r, 1200));

    console.log('3. Uploading large 2.5MB real HEIC photo...');
    const docRoot = await send('DOM.getDocument');
    const fileInputNode = await send('DOM.querySelector', {
      nodeId: docRoot.root.nodeId,
      selector: '#heic-file-input'
    });

    await send('DOM.setFileInputFiles', {
      nodeId: fileInputNode.nodeId,
      files: [largeHeicPath]
    });

    // Wait for workbench to appear
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 200));
      const check = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('#heic-convert-btn')`,
        returnByValue: true
      });
      if (check.result.value) break;
    }

    console.log('4. Converting large HEIC image to high-quality JPEG...');
    const startTime = Date.now();

    await send('Runtime.evaluate', {
      expression: `document.querySelector('#heic-convert-btn')?.click()`
    });

    // Wait for completion
    let successBanner = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const check = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('#heic-success-banner')`,
        returnByValue: true
      });
      if (check.result.value) {
        successBanner = true;
        break;
      }
    }
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`   Large HEIC conversion finished in ${elapsedSeconds}s!`);
    assert(successBanner, 'Conversion of large HEIC must succeed');

    console.log('5. Verifying output JPEG binary integrity & dimensions...');
    const outputInspection = await send('Runtime.evaluate', {
      expression: `(async () => {
        const img = document.querySelector('#heic-result-img');
        if (!img || !img.src) return { ok: false, error: 'No result image found' };

        // Fetch the blob and inspect first 3 bytes (JPEG magic 0xFF 0xD8 0xFF)
        const resp = await fetch(img.src);
        const buffer = await resp.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

        return {
          ok: true,
          size: bytes.length,
          isJpeg,
          width: img.naturalWidth,
          height: img.naturalHeight
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });

    const insp = outputInspection.result.value;
    console.log('   Output Inspection Result:', insp);
    assert(insp.ok, 'Output inspection must succeed');
    assert.equal(insp.isJpeg, true, 'Output must be a valid JPEG with 0xFF 0xD8 0xFF signature');
    assert(insp.size > 50000, `Output JPEG size (${insp.size} bytes) must be substantial`);
    assert(insp.width > 0 && insp.height > 0, `Output dimensions must be valid (${insp.width}x${insp.height})`);

    console.log('6. Testing Graceful Rejection on Unsupported HEIC Profile...');
    // Click "Convert Another"
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#heic-convert-another-btn')?.click()`
    });
    await new Promise((r) => setTimeout(r, 500));

    // Upload unsupported variant
    const docRoot2 = await send('DOM.getDocument');
    const fileInputNode2 = await send('DOM.querySelector', {
      nodeId: docRoot2.root.nodeId,
      selector: '#heic-file-input'
    });

    await send('DOM.setFileInputFiles', {
      nodeId: fileInputNode2.nodeId,
      files: [unsupportedHeicPath]
    });

    await new Promise((r) => setTimeout(r, 600));
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#heic-convert-btn')?.click()`
    });

    let handledGracefully = false;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const errCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const err = document.querySelector('.tool-alert-error')?.textContent;
          return err || null;
        })()`,
        returnByValue: true
      });
      if (errCheck.result.value) {
        console.log('   Graceful rejection banner:', errCheck.result.value);
        assert(errCheck.result.value.includes('not supported'), 'Must display friendly unsupported notice');
        handledGracefully = true;
        break;
      }
    }
    assert(handledGracefully, 'Unsupported HEIC format must be handled gracefully');

    console.log('\n🎉 ALL DIFFICULT HEIC TO JPG BENCHMARKS PASSED SUCCESSFULLY!');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {}
  }
}

runDifficultHeicBenchmark().catch((err) => {
  console.error('\n❌ Difficult HEIC benchmark failed:', err);
  process.exit(1);
});
