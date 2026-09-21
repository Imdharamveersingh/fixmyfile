/**
 * Difficult Edge-Case Test Suite: Image to Text (7.1)
 */

import fs from 'node:fs';
import { spawn } from 'node:child_process';
import http from 'node:http';
import {
  validateImageFile,
  detectImageSignature,
  MAX_IMAGE_FILE_SIZE
} from './src/services/ocr/ocrUtils.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9491;

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

console.log('\n=== Phase 7.1 — Difficult Edge-Case Test Suite ===\n');

// 1. Zero-byte file
let zeroRejected = false;
try {
  const fakeFile = { size: 0, name: 'zero.png', slice: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }) };
  await validateImageFile(fakeFile);
} catch (err) {
  zeroRejected = err.message.includes('0 bytes');
}
assert(zeroRejected, 'Zero-byte image rejected with clear message');

// 2. Corrupted header
let corruptRejected = false;
try {
  const fakeCorrupt = {
    size: 500,
    name: 'corrupt.jpg',
    slice: () => ({ arrayBuffer: async () => new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]).buffer })
  };
  await validateImageFile(fakeCorrupt);
} catch (err) {
  corruptRejected = err.message.includes('Unsupported or corrupted');
}
assert(corruptRejected, 'Corrupted binary header rejected');

// 3. Oversized file
let oversizedRejected = false;
try {
  const fakeOversized = { size: MAX_IMAGE_FILE_SIZE + 1, name: 'huge.png' };
  await validateImageFile(fakeOversized);
} catch (err) {
  oversizedRejected = err.message.includes('maximum size');
}
assert(oversizedRejected, 'Oversized file (>50MB) rejected safely');

// 4. Real Chrome Difficult In-Browser OCR tests
const chrome = spawn(CHROME_PATH, [
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\udte prinde\\.gemini\\antigravity-ide\\chrome_test_profile_diff_ocr'
]);

try {
  await new Promise((r) => setTimeout(r, 2000));

  const targets = await new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${DEBUG_PORT}/json`, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    }).on('error', reject);
  });

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const cur = id++;
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id === cur) {
          ws.removeEventListener('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: cur, method, params }));
    });
  }

  await send('Page.enable');
  await send('Runtime.enable');

  await send('Page.navigate', { url: 'http://localhost:5173/image-to-text' });
  await new Promise((r) => setTimeout(r, 1500));

  // Difficult Case A: Low-contrast text with preprocessing enabled
  const diffA = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    timeout: 60000,
    expression: `(async () => {
      try {
        const { runOcr } = await import('/src/services/ocr/ocrEngine.js');

        // Light gray text on darker gray background
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#666666';
        ctx.fillRect(0, 0, 400, 100);
        ctx.fillStyle = '#cccccc';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('CONTRAST TEST', 20, 55);

        const result = await runOcr(canvas, {
          preprocess: true,
          preprocessOptions: { enhanceContrast: true, grayscale: true }
        });

        return { success: true, text: result.text.trim() };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`
  });

  const resA = diffA.result?.value || {};
  assert(resA.success === true, 'Low-contrast image processed successfully with preprocessing');
  assert(resA.text?.includes('CONTRAST'), 'Low-contrast text recognized correctly');

  // Difficult Case B: 3 consecutive rapid OCR runs (concurrency / recycling)
  const diffB = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    timeout: 60000,
    expression: `(async () => {
      try {
        const { runOcr } = await import('/src/services/ocr/ocrEngine.js');

        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 300, 60);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('RAPID CYCLE', 20, 40);

        const r1 = await runOcr(canvas);
        const r2 = await runOcr(canvas);
        const r3 = await runOcr(canvas);

        return {
          success: r1.text.includes('RAPID') && r2.text.includes('RAPID') && r3.text.includes('RAPID')
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`
  });

  const resB = diffB.result?.value || {};
  assert(resB.success === true, 'Multiple consecutive OCR cycles succeed without memory leak or worker hang');

  ws.close();
} finally {
  chrome.kill();
}

console.log(`\n========================================`);
console.log(`DIFFICULT TESTS PASSED: ${passCount}/${passCount + failCount}`);
console.log(`========================================\n`);

if (failCount > 0) process.exit(1);
else process.exit(0);
