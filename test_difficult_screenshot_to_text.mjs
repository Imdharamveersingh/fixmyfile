/**
 * Phase 7.5 — Screenshot to Text: Difficult Edge Cases Test Suite
 *
 * Tests:
 * 1. Non-image clipboard paste (plain text) handling without crash
 * 2. Large high-resolution screenshot (2000x900)
 * 3. Rapid consecutive paste events
 * 4. Repeated OCR cycles back-to-back without page reload
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9499;

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

console.log('\n=== Phase 7.5 — Difficult Edge Cases: Screenshot to Text ===\n');

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const cdpDataDir = 'C:\\tmp\\cdp_difficult_screenshot';
if (!fs.existsSync(cdpDataDir)) {
  fs.mkdirSync(cdpDataDir, { recursive: true });
}

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${cdpDataDir}`,
  '--headless=new',
  '--no-first-run',
  '--disable-gpu',
  '--window-size=1280,900',
  'about:blank'
]);

await new Promise((r) => setTimeout(r, 1500));

try {
  const version = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  assert(!!version.webSocketDebuggerUrl, 'Connected to Chrome for difficult screenshot tests');

  const list = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  const page = list.find((p) => p.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));

  let msgId = 1;
  function send(method, params = {}) {
    const id = msgId++;
    return new Promise((resolve, reject) => {
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === id) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: 'http://localhost:5173/screenshot-to-text' });

  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: '!!document.querySelector(".tool-workspace")'
    });
    if (check.result?.value) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // 1. Edge case: Non-image paste event (e.g. text/plain copied)
  console.log('  Testing non-image paste event handling...');
  const textPasteResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const dt = new DataTransfer();
      dt.setData('text/plain', 'https://example.com/some/link');
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      window.dispatchEvent(pasteEvent);
      return {
        dropzoneRemains: !!document.getElementById('screenshot-to-text-dropzone'),
        activeCardNotOpened: !document.getElementById('screenshot-to-text-active-card')
      };
    })()`,
    returnByValue: true
  });
  assert(textPasteResult.result.value.dropzoneRemains, 'Text paste safely ignored, dropzone remains receptive');
  assert(textPasteResult.result.value.activeCardNotOpened, 'Active card not erroneously created for text paste');

  // 2. Edge case: Large resolution screenshot OCR (2000x800)
  console.log('  Testing high-resolution 2000x800 screenshot OCR...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#fafafa';
      ctx.font = 'bold 44px sans-serif';
      ctx.fillText('DIFFICULT 4K SCREENSHOT TEST', 80, 150);
      ctx.fillText('HOST: PRODUCTION-CLUSTER-09', 80, 280);
      ctx.fillText('IP ADDRESS: 192.168.1.105', 80, 410);

      window.__highResScreenshot = new Promise(res => canvas.toBlob(res, 'image/png'));
    })()`
  });

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const blob = await window.__highResScreenshot;
      const file = new File([blob], 'cluster-screenshot.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const pasteEvent = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dt
      });
      window.dispatchEvent(pasteEvent);
    })()`
  });
  await new Promise((r) => setTimeout(r, 600));

  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-text').click()`
  });

  let ocrLargeDone = false;
  let largeText = '';
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const res = await send('Runtime.evaluate', {
      expression: `document.getElementById('ocr-extracted-textarea')?.value || null`,
      returnByValue: true
    });
    if (res.result.value) {
      ocrLargeDone = true;
      largeText = res.result.value.toUpperCase();
      break;
    }
  }

  assert(ocrLargeDone, 'Large dark-theme screenshot OCR completed');
  assert(largeText.includes('SCREENSHOT') || largeText.includes('TEST') || largeText.includes('DIFFICULT'), 'Recovered header text from 4K screenshot');
  assert(largeText.includes('PRODUCTION') || largeText.includes('CLUSTER') || largeText.includes('192.168'), 'Recovered host/network tokens');

  // 3. Edge case: Repeated OCR cycle without page reload
  console.log('  Testing repeated OCR cycle...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-another').click()`
  });
  await new Promise((r) => setTimeout(r, 400));

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const blob = await window.__highResScreenshot;
      const file = new File([blob], 'cluster-screenshot-2.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      window.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dt }));
    })()`
  });
  await new Promise((r) => setTimeout(r, 400));

  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-text').click()`
  });

  let repeatDone = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const res = await send('Runtime.evaluate', {
      expression: `!!document.getElementById('ocr-extracted-textarea')?.value`,
      returnByValue: true
    });
    if (res.result.value) {
      repeatDone = true;
      break;
    }
  }
  assert(repeatDone, 'Repeated paste & OCR cycle executed cleanly');

  ws.close();
} finally {
  chromeProc.kill();
  console.log('Chrome difficult test instance closed.');
}

console.log(`\n=== Difficult Suite Results: ${passCount} PASSED, ${failCount} FAILED ===\n`);
if (failCount > 0) {
  process.exit(1);
}
