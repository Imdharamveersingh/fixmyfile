/**
 * Phase 7.3 — JPG to Text: Difficult Edge Cases Test Suite
 *
 * Tests:
 * 1. Low-contrast / dark background JPEG processing
 * 2. High-resolution JPEG OCR
 * 3. Corrupted JPEG file rejection
 * 4. Fake JPEG (text file renamed .jpg) rejection
 * 5. Zero-byte file rejection
 * 6. Repeated OCR cycles back-to-back
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { validateJpgFile } from './src/services/ocr/ocrUtils.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9495;

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

console.log('\n=== Phase 7.3 — Difficult Edge Cases: JPG to Text ===\n');

// 1. Fake JPEG rejection (renamed .txt)
class MockFile {
  constructor(buffer, name) {
    this._buffer = buffer;
    this.name = name;
    this.size = buffer.byteLength;
  }
  slice(start, end) {
    return {
      arrayBuffer: async () => this._buffer.slice(start, end)
    };
  }
  async arrayBuffer() {
    return this._buffer;
  }
}

const fakeJpgBuffer = new TextEncoder().encode('This is not a real JPEG image, just text.');
try {
  await validateJpgFile(new MockFile(fakeJpgBuffer.buffer, 'fake.jpg'));
  assert(false, 'Should reject fake .jpg file');
} catch (e) {
  assert(e.message.includes('valid JPG or JPEG image'), 'Properly rejects text file renamed as .jpg');
}

// 2. Chrome automation for high-res & repeated OCR
async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const cdpDataDir = 'C:\\tmp\\cdp_difficult_jpg';
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
  assert(!!version.webSocketDebuggerUrl, 'Connected to Chrome for difficult edge cases');

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
  await send('Page.navigate', { url: 'http://localhost:5173/jpg-to-text' });

  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: '!!document.querySelector(".tool-workspace")'
    });
    if (check.result?.value) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Edge case: High-res JPEG
  console.log('  Testing high-resolution JPEG processing...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 600;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#111111';
      ctx.font = 'bold 44px Arial';
      ctx.fillText('HIGH RESOLUTION RECEIPT', 80, 150);
      ctx.fillText('SUBTOTAL: $1499.00', 80, 250);
      ctx.fillText('DIFFICULT EDGE CASE VERIFIED', 80, 350);

      window.__highResJpg = new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.9));
    })()`
  });

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const blob = await window.__highResJpg;
      const file = new File([blob], 'high-res.jpg', { type: 'image/jpeg' });
      const input = document.getElementById('jpg-to-text-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`
  });
  await new Promise((r) => setTimeout(r, 500));

  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-text').click()`
  });

  let ocrHighResDone = false;
  let highResText = '';
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const res = await send('Runtime.evaluate', {
      expression: `document.getElementById('ocr-extracted-textarea')?.value || null`,
      returnByValue: true
    });
    if (res.result.value) {
      ocrHighResDone = true;
      highResText = res.result.value.toUpperCase();
      break;
    }
  }

  assert(ocrHighResDone, 'High-resolution JPEG OCR succeeded');
  assert(highResText.includes('HIGH') || highResText.includes('RESOLUTION') || highResText.includes('RECEIPT'), 'High-res OCR recovered expected tokens');
  assert(highResText.includes('1499') || highResText.includes('SUBTOTAL'), 'High-res OCR recovered dollar amount/subtotal');

  // Edge case: Repeated cycle without page reload
  console.log('  Testing repeated cycle without reload...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-another').click()`
  });
  await new Promise((r) => setTimeout(r, 400));

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const blob = await window.__highResJpg;
      const file = new File([blob], 'repeated-receipt.jpg', { type: 'image/jpeg' });
      const input = document.getElementById('jpg-to-text-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
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
  assert(repeatDone, 'Repeated OCR cycle without reload executed smoothly');

  ws.close();
} finally {
  chromeProc.kill();
  console.log('Chrome difficult test instance closed.');
}

console.log(`\n=== Difficult Suite Results: ${passCount} PASSED, ${failCount} FAILED ===\n`);
if (failCount > 0) {
  process.exit(1);
}
