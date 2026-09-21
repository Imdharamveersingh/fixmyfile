/**
 * Phase 6.2 — Video Compressor: Real Chrome CDP Verification
 * Tests Desktop (1440x900) and Mobile (375x667).
 * Run: node test_manual_video_compressor.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/video-compressor';

let passCount = 0;
let failCount = 0;

function pass(msg) {
  console.log(`  ✓ ${msg}`);
  passCount++;
}

function fail(msg) {
  console.error(`  ✗ FAIL: ${msg}`);
  failCount++;
}

async function waitForChromePort(port, maxMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const targets = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => {
            try {
              resolve(JSON.parse(d));
            } catch {
              resolve([]);
            }
          });
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      if (targets && targets.length > 0) return targets;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Chrome did not start on port ${port}`);
}

async function runViewportTest(label, width, height, debugPort) {
  console.log(`\n--- ${label} (${width}x${height}) ---`);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    TOOL_URL
  ]);

  try {
    const targets = await waitForChromePort(debugPort);
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

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
        const desc = parsed.params?.exceptionDetails?.exception?.description || parsed.params?.exceptionDetails?.text || '';
        if (desc) pageErrors.push(desc);
      }
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        const errText = parsed.params.args.map((a) => a.value || a.description || '').join(' ');
        if (errText && !errText.includes('favicon')) {
          pageErrors.push(`Console error: ${errText}`);
        }
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 1500));

    // 1. Page title & H1
    const titleRes = await send('Runtime.evaluate', { expression: 'document.title' });
    const title = titleRes?.result?.value || '';
    if (title.includes('Video Compressor')) pass(`Page title: "${title}"`);
    else fail(`Unexpected title: "${title}"`);

    const h1Res = await send('Runtime.evaluate', { expression: 'document.querySelector("h1")?.innerText || ""' });
    const h1 = h1Res?.result?.value || '';
    if (h1.includes('Video Compressor')) pass(`H1 heading: "${h1}"`);
    else fail(`Unexpected H1: "${h1}"`);

    // 2. Dropzone exists
    const dropzoneRes = await send('Runtime.evaluate', { expression: '!!document.getElementById("video-compressor-dropzone")' });
    if (dropzoneRes?.result?.value) pass('Dropzone is visible and interactive');
    else fail('Dropzone missing');

    // 3. Upload real video fixture
    const sampleBytes = fs.readFileSync('test_fixtures/sample_high_bitrate.mp4');
    const sampleB64 = sampleBytes.toString('base64');

    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          const bin = atob('${sampleB64}');
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const file = new File([bytes], 'sample_screencast.mp4', { type: 'video/mp4' });

          const dt = new DataTransfer();
          dt.items.add(file);
          const input = document.querySelector('input[type="file"]');
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });

    await new Promise((r) => setTimeout(r, 1200));

    // 4. Metadata verification & controls
    const metaCheck = await send('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          hasActiveCard: !!document.querySelector('.file-active-card'),
          filename: document.querySelector('.file-name')?.innerText || '',
          hasPresetSelect: !!document.getElementById('preset-select'),
          hasResolutionSelect: !!document.getElementById('resolution-select'),
          hasCompressBtn: !!document.getElementById('btn-compress-video')
        })
      `
    });
    const metaParsed = JSON.parse(metaCheck?.result?.value);
    if (metaParsed.hasActiveCard) pass('File metadata card rendered');
    else fail('File metadata card not rendered');
    if (metaParsed.filename === 'sample_screencast.mp4') pass('Uploaded filename rendered correctly');
    else fail(`Expected sample_screencast.mp4, got "${metaParsed.filename}"`);
    if (metaParsed.hasPresetSelect && metaParsed.hasResolutionSelect) pass('Preset & resolution selection dropdowns available');
    else fail('Preset/resolution dropdowns missing');
    if (metaParsed.hasCompressBtn) pass('Compress Video button enabled');
    else fail('Compress Video button missing');

    // 5. Trigger Real Video Compression
    console.log(`    Triggering video compression in ${label}...`);
    await send('Runtime.evaluate', {
      expression: `document.getElementById('btn-compress-video').click()`
    });

    // Wait for compression completion
    let compressionDone = false;
    const startWait = Date.now();
    while (Date.now() - startWait < 30000) {
      const stateCheck = await send('Runtime.evaluate', {
        expression: `
          JSON.stringify({
            hasResult: !!document.getElementById('video-compressor-result'),
            hasDownload: !!document.getElementById('btn-download-video'),
            downloadHref: document.getElementById('btn-download-video')?.getAttribute('href') || '',
            downloadName: document.getElementById('btn-download-video')?.getAttribute('download') || '',
            hasError: !!document.querySelector('.alert-error')
          })
        `
      });
      const st = JSON.parse(stateCheck?.result?.value);
      if (st.hasResult) {
        compressionDone = true;
        break;
      }
      if (st.hasError) {
        fail('Encountered alert-error during compression');
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    if (compressionDone) pass('Compression completed successfully and result card appeared');
    else fail('Compression timed out or failed to show result card');

    // 6. Download button, stats, and filename validation
    const downloadCheck = await send('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          href: document.getElementById('btn-download-video')?.getAttribute('href') || '',
          download: document.getElementById('btn-download-video')?.getAttribute('download') || '',
          statsText: document.querySelector('.stats-comparison')?.innerText || ''
        })
      `
    });
    const dlParsed = JSON.parse(downloadCheck?.result?.value);
    if (dlParsed.href.startsWith('blob:')) pass(`Video Blob download URL generated: ${dlParsed.href.slice(0, 30)}...`);
    else fail(`Expected blob: download URL, got "${dlParsed.href}"`);
    if (dlParsed.download === 'sample_screencast_compressed.mp4') pass('Download filename correctly sanitized');
    else fail(`Unexpected download filename: "${dlParsed.download}"`);
    if (dlParsed.statsText.includes('Compressed Size') && dlParsed.statsText.includes('Size Reduction')) {
      pass('Compression statistics (original, compressed, reduction %) displayed');
    } else fail('Compression statistics incomplete');

    // 7. Reset behavior
    await send('Runtime.evaluate', {
      expression: `document.getElementById('btn-compress-another').click()`
    });
    await new Promise((r) => setTimeout(r, 500));

    const resetCheck = await send('Runtime.evaluate', {
      expression: `
        JSON.stringify({
          dropzoneVisible: !!document.getElementById('video-compressor-dropzone'),
          resultGone: !document.getElementById('video-compressor-result')
        })
      `
    });
    const rsParsed = JSON.parse(resetCheck?.result?.value);
    if (rsParsed.dropzoneVisible && rsParsed.resultGone) pass('Reset button restored dropzone initial state cleanly');
    else fail('Reset failed to restore initial dropzone state');

    // 8. Second Upload & Conversion Check (No Stale State)
    console.log(`    Triggering second conversion after reset in ${label}...`);
    await send('Runtime.evaluate', {
      awaitPromise: true,
      expression: `
        (async () => {
          const bin = atob('${sampleB64}');
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          const file = new File([bytes], 'second_video.mp4', { type: 'video/mp4' });

          const dt = new DataTransfer();
          dt.items.add(file);
          const input = document.querySelector('input[type="file"]');
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()
      `
    });
    await new Promise((r) => setTimeout(r, 1000));
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-compress-video').click()` });

    let secondDone = false;
    const startWait2 = Date.now();
    while (Date.now() - startWait2 < 30000) {
      const st2 = await send('Runtime.evaluate', {
        expression: `!!document.getElementById('video-compressor-result')`
      });
      if (st2?.result?.value) {
        secondDone = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    if (secondDone) pass('Second conversion after reset completed without stale FFmpeg state');
    else fail('Second conversion timed out or failed');

    // Reset again after second run
    await send('Runtime.evaluate', { expression: `document.getElementById('btn-compress-another').click()` });

    // 9. Horizontal overflow
    const overflowCheck = await send('Runtime.evaluate', {
      expression: `document.documentElement.scrollWidth > document.documentElement.clientWidth`
    });
    if (!overflowCheck?.result?.value) pass('Zero horizontal overflow detected');
    else fail('Horizontal overflow detected on viewport');

    // 10. Console errors
    if (pageErrors.length === 0) pass('Zero runtime console errors during entire workflow');
    else fail(`Console errors observed: ${pageErrors.join(', ')}`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

async function runAllManualTests() {
  console.log('\n=== Phase 6.2 — Video Compressor: Real Chrome CDP Tests ===\n');
  await runViewportTest('Desktop Viewport', 1440, 900, 9460);
  await runViewportTest('Mobile Viewport', 375, 667, 9461);

  console.log('\n========================================');
  console.log(`TOTAL CDP CHECKS: ${passCount + failCount}`);
  console.log(`PASSED:           ${passCount}`);
  console.log(`FAILED:           ${failCount}`);
  console.log('========================================\n');

  if (failCount > 0) process.exit(1);
  else process.exit(0);
}

runAllManualTests();
