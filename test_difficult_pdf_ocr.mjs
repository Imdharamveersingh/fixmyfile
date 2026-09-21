/**
 * Difficult Edge-Case Test Suite: PDF OCR (7.2)
 */

import { PDFDocument, StandardFonts } from 'pdf-lib';
import { validatePdfInput, processPdfOcr } from './src/services/ocr/ocrPdfLayer.js';
import { spawn } from 'node:child_process';
import http from 'node:http';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9493;

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

console.log('\n=== Phase 7.2 — Difficult PDF OCR Test Suite ===\n');

// 1. Zero-byte rejection
let zeroRejected = false;
try {
  await validatePdfInput(new ArrayBuffer(0));
} catch (err) {
  zeroRejected = err.message.includes('0 bytes');
}
assert(zeroRejected, 'Zero-byte PDF rejected with clear error');

// 2. Corrupted header rejection
let corruptRejected = false;
try {
  await validatePdfInput(new Uint8Array([0x12, 0x34, 0x56, 0x78]).buffer);
} catch (err) {
  corruptRejected = err.message.includes('%PDF-');
}
assert(corruptRejected, 'Corrupted binary lacking %PDF- rejected');

// 3. Mixed orientation / dimensions multi-page PDF in browser
const mixedDoc = await PDFDocument.create();
const font = await mixedDoc.embedFont(StandardFonts.Helvetica);
// Page 1: Portrait (300 x 500)
const p1 = mixedDoc.addPage([300, 500]);
p1.drawText('PORTRAIT PAGE', { x: 20, y: 400, size: 20, font });
// Page 2: Landscape (600 x 300)
const p2 = mixedDoc.addPage([600, 300]);
p2.drawText('LANDSCAPE PAGE', { x: 20, y: 200, size: 20, font });
const mixedPdfBase64 = Buffer.from(await mixedDoc.save()).toString('base64');

const chrome = spawn(CHROME_PATH, [
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\udte prinde\\.gemini\\antigravity-ide\\chrome_test_profile_diff_pdf'
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

  await send('Page.navigate', { url: 'http://localhost:5173/pdf-ocr' });
  await new Promise((r) => setTimeout(r, 1500));

  const mixedEval = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    timeout: 90000,
    expression: `(async () => {
      try {
        const { processPdfOcr } = await import('/src/services/ocr/ocrPdfLayer.js');
        const binStr = atob('${mixedPdfBase64}');
        const bytes = new Uint8Array(binStr.length);
        for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

        const result = await processPdfOcr(bytes.buffer, { scale: 1.2 });
        return {
          success: true,
          totalPages: result.totalPages,
          size: result.searchableBlob.size
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    })()`
  });

  const mixedRes = mixedEval.result?.value || {};
  assert(mixedRes.success === true, 'Mixed-dimension (portrait + landscape) PDF processed cleanly');
  assert(mixedRes.totalPages === 2, 'Both portrait and landscape pages preserved');
  assert(mixedRes.size > 1000, 'Searchable mixed PDF output generated with valid size');

  ws.close();
} finally {
  chrome.kill();
}

console.log(`\n========================================`);
console.log(`DIFFICULT PDF OCR TESTS: ${passCount}/${passCount + failCount}`);
console.log(`========================================\n`);

if (failCount > 0) process.exit(1);
else process.exit(0);
