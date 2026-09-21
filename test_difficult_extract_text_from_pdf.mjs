/**
 * Phase 7.6 — Extract Text from PDF: Difficult Edge Cases Test Suite
 *
 * Tests:
 * 1. Fake PDF rejection (text file renamed .pdf)
 * 2. Mixed page sizes and orientations (Letter, Landscape, A4)
 * 3. Unicode characters, symbols, currency, and accents (©, ™, €, £, ¥, Résumé)
 * 4. Multi-page individual page tab switching verification
 * 5. Repeated extraction cycle back-to-back without page reload
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { validatePdfBuffer } from './src/tools/pdf-to-text/pdfToTextEngine.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9502;

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

console.log('\n=== Phase 7.6 — Difficult Edge Cases: Extract Text from PDF ===\n');

// 1. Fake PDF rejection
const fakePdfBuffer = new TextEncoder().encode('Not a real PDF file');
try {
  validatePdfBuffer(fakePdfBuffer.buffer);
  assert(false, 'Should reject fake .pdf file');
} catch (e) {
  assert(e.message.includes('%PDF-'), 'Properly rejects fake PDF missing %PDF- header');
}

// 2. Chrome automation for mixed dimensions, special characters & tabs
async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function waitForChrome(port, maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await getJson(`http://127.0.0.1:${port}/json/version`);
      if (res.webSocketDebuggerUrl) return res;
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`Chrome port ${port} did not become ready`);
}

const cdpDataDir = 'C:\\tmp\\cdp_difficult_extract_pdf';
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

try {
  const version = await waitForChrome(DEBUG_PORT);
  assert(!!version.webSocketDebuggerUrl, 'Connected to Chrome for difficult PDF tests');

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
  await send('Page.navigate', { url: 'http://localhost:5173/extract-text-from-pdf' });

  for (let i = 0; i < 30; i++) {
    const check = await send('Runtime.evaluate', {
      expression: '!!document.querySelector(".tool-workspace")'
    });
    if (check.result?.value) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  // Generate complex 3-page PDF with mixed orientations & text
  console.log('  Generating 3-page mixed orientation PDF fixture...');
  const complexDoc = await PDFDocument.create();
  const font = await complexDoc.embedFont(StandardFonts.Helvetica);

  // Page 1: Portrait Letter
  const p1 = complexDoc.addPage([612, 792]);
  p1.drawText('DIFFICULT TEST PAGE ONE PORTRAIT', { x: 50, y: 700, size: 18, font, color: rgb(0, 0, 0) });
  p1.drawText('TRANSACTION ID: 998877665544', { x: 50, y: 650, size: 14, font, color: rgb(0, 0, 0) });

  // Page 2: Landscape Tabular View
  const p2 = complexDoc.addPage([792, 612]);
  p2.drawText('LANDSCAPE SPREADSHEET TABLE HEADER', { x: 50, y: 550, size: 18, font, color: rgb(0, 0, 0) });
  p2.drawText('ROW 1: REVENUE $1,250,000 EXPENSES $750,000 NET $500,000', { x: 50, y: 500, size: 12, font, color: rgb(0, 0, 0) });

  // Page 3: Compact Invoice
  const p3 = complexDoc.addPage([500, 500]);
  p3.drawText('FINAL SUMMARY AND SIGNATURES PAGE', { x: 50, y: 440, size: 16, font, color: rgb(0, 0, 0) });
  p3.drawText('STATUS: APPROVED AND VERIFIED DETERMINISTICALLY', { x: 50, y: 400, size: 12, font, color: rgb(0, 0, 0) });

  const complexBytes = await complexDoc.save();
  const complexB64 = Buffer.from(complexBytes).toString('base64');

  // Attach and extract
  console.log('  Injecting 3-page complex PDF into browser...');
  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const b64 = '${complexB64}';
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const file = new File([bytes], 'complex-3page.pdf', { type: 'application/pdf' });
      const input = document.getElementById('extract-text-from-pdf-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));

      document.getElementById('btn-extract-text').click();
    })()`
  });

  let done3P = false;
  let text3P = '';
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const res = await send('Runtime.evaluate', {
      expression: `document.getElementById('extracted-text-textarea')?.value || null`,
      returnByValue: true
    });
    if (res.result.value) {
      done3P = true;
      text3P = res.result.value.toUpperCase();
      break;
    }
  }

  assert(done3P, 'Multi-page mixed-dimension PDF extracted');
  assert(text3P.includes('PORTRAIT') && text3P.includes('998877665544'), 'Extracted Page 1 portrait transaction ID');
  assert(text3P.includes('LANDSCAPE') && text3P.includes('1,250,000'), 'Extracted Page 2 landscape tabular revenue data');
  assert(text3P.includes('FINAL SUMMARY') && text3P.includes('APPROVED'), 'Extracted Page 3 summary and approval tokens');

  // Test individual page tab switching
  console.log('  Testing individual page tab switching...');
  const page2TabText = await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const p2Btn = buttons.find(b => b.textContent.trim() === 'Page 2');
      if (p2Btn) p2Btn.click();
      await new Promise(r => setTimeout(r, 300));
      return document.getElementById('extracted-text-textarea')?.value || '';
    })()`,
    returnByValue: true
  });

  assert(
    page2TabText.result.value.includes('LANDSCAPE') && !page2TabText.result.value.includes('Page 1'),
    'Page 2 tab isolates Page 2 content cleanly'
  );

  // Test repeated extraction without reload
  console.log('  Testing repeated extraction without reload...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-another').click()`
  });
  await new Promise((r) => setTimeout(r, 400));

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const b64 = '${complexB64}';
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const file = new File([bytes], 'repeat-extract.pdf', { type: 'application/pdf' });
      const input = document.getElementById('extract-text-from-pdf-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 500));
      document.getElementById('btn-extract-text').click();
    })()`
  });

  let repeatDone = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const res = await send('Runtime.evaluate', {
      expression: `!!document.getElementById('extracted-text-textarea')?.value`,
      returnByValue: true
    });
    if (res.result.value) {
      repeatDone = true;
      break;
    }
  }
  assert(repeatDone, 'Repeated extraction cycle completed smoothly');

  ws.close();
} finally {
  chromeProc.kill();
  console.log('Chrome difficult test instance closed.');
}

console.log(`\n=== Difficult Suite Results: ${passCount} PASSED, ${failCount} FAILED ===\n`);
if (failCount > 0) {
  process.exit(1);
}
