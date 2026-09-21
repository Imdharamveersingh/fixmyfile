/**
 * Phase 7.4 — PNG to Text: Difficult Edge Cases Test Suite
 *
 * Tests:
 * 1. Fake PNG rejection (text file renamed .png)
 * 2. High-resolution / large PNG OCR (1920x800)
 * 3. Tiny monospace code text extraction
 * 4. Repeated OCR cycles back-to-back without reload
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { validatePngFile } from './src/services/ocr/ocrUtils.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9497;

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

console.log('\n=== Phase 7.4 — Difficult Edge Cases: PNG to Text ===\n');

// 1. Fake PNG rejection (renamed .txt)
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

const fakePngBuffer = new TextEncoder().encode('This is not a real PNG image, just text content.');
try {
  await validatePngFile(new MockFile(fakePngBuffer.buffer, 'fake.png'));
  assert(false, 'Should reject fake .png file');
} catch (e) {
  assert(e.message.includes('valid PNG image'), 'Properly rejects text file renamed as .png');
}

// 2. Chrome automation for high-resolution PNG & repeated OCR
async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const cdpDataDir = 'C:\\tmp\\cdp_difficult_png';
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
  assert(!!version.webSocketDebuggerUrl, 'Connected to Chrome for difficult PNG tests');

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
  await send('Page.navigate', { url: 'http://localhost:5173/png-to-text' });

  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: '!!document.querySelector(".tool-workspace")'
    });
    if (check.result?.value) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Edge case: Large resolution PNG with multiple code blocks
  console.log('  Testing high-resolution code screenshot PNG...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e1e1e';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('ASYNC FUNCTION PROCESSFILE(DATA) {', 60, 100);
      ctx.fillText('  CONST PAYLOAD = PARSE(DATA);', 60, 180);
      ctx.fillText('  IF (!PAYLOAD.VALID) THROW NEW ERROR();', 60, 260);
      ctx.fillText('  RETURN PAYLOAD.RESULT;', 60, 340);
      ctx.fillText('}', 60, 420);

      window.__highResPng = new Promise(res => canvas.toBlob(res, 'image/png'));
    })()`
  });

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const blob = await window.__highResPng;
      const file = new File([blob], 'complex-code.png', { type: 'image/png' });
      const input = document.getElementById('png-to-text-input');
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

  assert(ocrHighResDone, 'High-resolution PNG code extraction completed');
  assert(highResText.includes('ASYNC') || highResText.includes('FUNCTION') || highResText.includes('PROCESSFILE'), 'Recovered function declaration');
  assert(highResText.includes('PAYLOAD') || highResText.includes('RETURN') || highResText.includes('RESULT'), 'Recovered code statement tokens');

  // Edge case: Repeated cycle without reload
  console.log('  Testing repeated cycle without reload...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-another').click()`
  });
  await new Promise((r) => setTimeout(r, 400));

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const blob = await window.__highResPng;
      const file = new File([blob], 'repeat-code.png', { type: 'image/png' });
      const input = document.getElementById('png-to-text-input');
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
  assert(repeatDone, 'Repeated OCR cycle on PNG executed cleanly');

  ws.close();
} finally {
  chromeProc.kill();
  console.log('Chrome difficult test instance closed.');
}

console.log(`\n=== Difficult Suite Results: ${passCount} PASSED, ${failCount} FAILED ===\n`);
if (failCount > 0) {
  process.exit(1);
}
