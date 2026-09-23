/**
 * Phase 7.2 — PDF OCR Automated Test Suite
 *
 * Verifies:
 * - Tool registry integration (45 tools active)
 * - Route registration in App.jsx
 * - Component & engine architecture
 * - PDF binary header validation
 * - Rejection of zero-byte & non-PDF files
 * - Real in-browser PDF rendering, OCR, and invisible text layer injection
 * - Searchable text verification via PDF.js getTextContent()
 * - Page count preservation & valid %PDF- signature
 * - Multi-page PDF OCR pipeline
 * - Desktop & mobile viewports (375px, 390px, 768px, 1280px)
 * - Regression: Phase 6 routes + 7.1 Image to Text
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PHASE_7_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';
import { validatePdfInput } from './src/services/ocr/ocrPdfLayer.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9492;

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

console.log('\n=== Phase 7.2 — PDF OCR: Automated Test Suite ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Tool Registry & Routing
// ─────────────────────────────────────────────────────────────────────────────
console.log('GROUP 1: Tool Registry & Routing');

const pdfOcrTool = PHASE_7_TOOLS.find((t) => t.id === 'pdf-ocr');
assert(!!pdfOcrTool, 'pdf-ocr exists in PHASE_7_TOOLS');
assert(pdfOcrTool?.path === '/pdf-ocr', 'tool path is /pdf-ocr');
assert(pdfOcrTool?.category === 'OCR & Text', 'tool category is OCR & Text');
assert(pdfOcrTool?.phase === 'Phase 7', 'tool phase is Phase 7');
assert(pdfOcrTool?.status === 'Ready', 'tool status is Ready');

const inAllTools = ALL_TOOLS.find((t) => t.id === 'pdf-ocr');
assert(!!inAllTools, 'pdf-ocr is registered in ALL_TOOLS');
assert(ALL_TOOLS.length === 49, `ALL_TOOLS count is exactly 49 (found ${ALL_TOOLS.length})`);
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS remains 55');

const appJsx = fs.readFileSync('src/App.jsx', 'utf-8');
assert(appJsx.includes('import PdfOcrTool from'), 'App.jsx imports PdfOcrTool');
assert(appJsx.includes('path="pdf-ocr"'), 'App.jsx registers /pdf-ocr route');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Component & Service Architecture
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 2: Component & Service Architecture');

assert(fs.existsSync('src/tools/pdf-ocr/index.jsx'), 'src/tools/pdf-ocr/index.jsx exists');
assert(fs.existsSync('src/services/ocr/ocrPdfLayer.js'), 'src/services/ocr/ocrPdfLayer.js exists');

const toolSource = fs.readFileSync('src/tools/pdf-ocr/index.jsx', 'utf-8');
assert(toolSource.includes('export default function PdfOcrTool'), 'index.jsx exports PdfOcrTool as default');
assert(toolSource.includes('id="pdf-ocr-dropzone"'), 'index.jsx includes dropzone with ID');
assert(toolSource.includes('id="pdf-ocr-input"'), 'index.jsx includes file input with ID');
assert(toolSource.includes('id="btn-process-pdf-ocr"'), 'index.jsx includes process OCR button with ID');
assert(toolSource.includes('id="pdf-ocr-result"'), 'index.jsx includes result container with ID');
assert(toolSource.includes('id="btn-download-searchable-pdf"'), 'index.jsx includes download link with ID');
assert(toolSource.includes('id="btn-ocr-another-pdf"'), 'index.jsx includes reset button with ID');
assert(toolSource.includes('100% Client-Side'), 'index.jsx includes local privacy statement');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Validation & Header Detection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 3: Validation & Header Detection');

// Valid PDF buffer
const validDoc = await PDFDocument.create();
validDoc.addPage([300, 200]);
const validBytes = await validDoc.save();
const validatedBuf = await validatePdfInput(validBytes.buffer);
assert(validatedBuf instanceof ArrayBuffer, 'Valid PDF buffer passes validation');

// Empty buffer
let zeroRejected = false;
try {
  await validatePdfInput(new ArrayBuffer(0));
} catch (err) {
  zeroRejected = err.message.includes('0 bytes');
}
assert(zeroRejected, 'Zero-byte buffer rejected');

// Non-PDF buffer
let nonPdfRejected = false;
try {
  await validatePdfInput(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer);
} catch (err) {
  nonPdfRejected = err.message.includes('%PDF-');
}
assert(nonPdfRejected, 'Non-PDF buffer missing %PDF- header rejected');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: In-Browser Real PDF OCR & Searchable Text Layer Verification
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 4: In-Browser Real PDF OCR & Searchable Text Layer Verification');

// Create test PDF fixture with deterministic rasterized text
const testPdfDoc = await PDFDocument.create();
const font = await testPdfDoc.embedFont(StandardFonts.HelveticaBold);
const p1 = testPdfDoc.addPage([500, 200]);
p1.drawText('SEARCHABLE PDF OCR TEST', { x: 30, y: 130, size: 24, font, color: rgb(0, 0, 0) });
p1.drawText('HELLO OCR WORLD 98765', { x: 30, y: 80, size: 18, font, color: rgb(0, 0, 0) });
const testPdfBase64 = Buffer.from(await testPdfDoc.save()).toString('base64');

async function runBrowserTests() {
  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=C:\\Users\\udte prinde\\.gemini\\antigravity-ide\\chrome_test_profile_pdf_ocr'
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

    const consoleErrors = [];
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(msg.params.exceptionDetails?.text || 'Exception');
      }
    });

    await send('Page.navigate', { url: 'http://localhost:5173/pdf-ocr' });
    for (let i = 0; i < 25; i++) {
      const check = await send('Runtime.evaluate', {
        expression: '!!document.querySelector(".tool-workspace")'
      });
      if (check.result?.value) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    // Page title check
    const titleRes = await send('Runtime.evaluate', { expression: 'document.title' });
    assert(titleRes.result?.value?.includes('PDF OCR'), 'Page title contains PDF OCR');

    // Dropzone check
    const dropzoneRes = await send('Runtime.evaluate', {
      expression: '!!document.getElementById("pdf-ocr-dropzone")'
    });
    assert(dropzoneRes.result?.value === true, 'Dropzone renders on initial load');

    // ── Execute Real PDF OCR Pipeline in Browser ─────────────────────────────
    const ocrRun = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      timeout: 90000,
      expression: `(async () => {
        try {
          const { processPdfOcr, pdfjsLib } = await import('/src/services/ocr/ocrPdfLayer.js');

          // Decode base64 fixture to ArrayBuffer
          const binStr = atob('${testPdfBase64}');
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

          const result = await processPdfOcr(bytes.buffer, { scale: 1.5 });

          // Verify output is a valid PDF
          const outBuffer = await result.searchableBlob.arrayBuffer();
          const outHeader = new TextDecoder('ascii').decode(new Uint8Array(outBuffer, 0, 5));

          // Inspect searchable text via PDF.js getTextContent
          const checkTask = pdfjsLib.getDocument({ data: outBuffer });
          const outPdfDoc = await checkTask.promise;
          const page1 = await outPdfDoc.getPage(1);
          const textContent = await page1.getTextContent();
          const extractedStrings = textContent.items.map(it => it.str).join(' ');

          return {
            success: true,
            hasPdfHeader: outHeader.startsWith('%PDF-'),
            totalPages: result.totalPages,
            totalWords: result.totalWords,
            extractedStrings,
            outDocPages: outPdfDoc.numPages
          };
        } catch (err) {
          return {
            success: false,
            error: err.message || String(err),
            stack: err.stack
          };
        }
      })()`
    });

    const parsedOcr = ocrRun.result?.value || {};
    if (parsedOcr.error) console.error('  PDF OCR browser error:', parsedOcr.error);

    assert(parsedOcr.success === true, 'In-browser PDF OCR execution completed');
    assert(parsedOcr.hasPdfHeader === true, 'Generated output begins with valid %PDF- signature');
    assert(parsedOcr.totalPages === 1, 'Total pages preserved in output (1 page)');
    assert(parsedOcr.totalWords >= 4, `Word detection identified words (got ${parsedOcr.totalWords})`);
    assert(parsedOcr.extractedStrings?.includes('SEARCHABLE') || parsedOcr.extractedStrings?.includes('OCR'), 'Searchable text layer contains recognized OCR tokens');

    // ── Multi-page PDF test fixture ──────────────────────────────────────────
    const multiPdfDoc = await PDFDocument.create();
    const mp1 = multiPdfDoc.addPage([400, 150]);
    mp1.drawText('PAGE ONE CONTENT', { x: 20, y: 70, size: 20, font });
    const mp2 = multiPdfDoc.addPage([400, 150]);
    mp2.drawText('PAGE TWO CONTENT', { x: 20, y: 70, size: 20, font });
    const multiPdfBase64 = Buffer.from(await multiPdfDoc.save()).toString('base64');

    const multiRun = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      timeout: 90000,
      expression: `(async () => {
        try {
          const { processPdfOcr } = await import('/src/services/ocr/ocrPdfLayer.js');
          const binStr = atob('${multiPdfBase64}');
          const bytes = new Uint8Array(binStr.length);
          for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);

          const result = await processPdfOcr(bytes.buffer, { scale: 1.2 });
          return {
            success: true,
            totalPages: result.totalPages,
            blobSize: result.searchableBlob.size
          };
        } catch (err) {
          return { success: false, error: err.message };
        }
      })()`
    });

    const parsedMulti = multiRun.result?.value || {};
    assert(parsedMulti.success === true, 'Multi-page PDF OCR pipeline executed cleanly');
    assert(parsedMulti.totalPages === 2, 'Multi-page PDF preserves exact 2 pages');
    assert(parsedMulti.blobSize > 1000, 'Searchable multi-page PDF output has non-zero size');

    // ── Viewport testing ─────────────────────────────────────────────────────
    const viewports = [
      { name: 'Mobile 375px', width: 375, height: 667 },
      { name: 'Mobile 390px', width: 390, height: 844 },
      { name: 'Tablet 768px', width: 768, height: 1024 },
      { name: 'Desktop 1280px', width: 1280, height: 800 }
    ];

    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await new Promise((r) => setTimeout(r, 400));

      const overflowRes = await send('Runtime.evaluate', {
        expression: 'document.documentElement.scrollWidth <= window.innerWidth + 2'
      });
      assert(overflowRes.result?.value === true, `${vp.name}: no horizontal overflow`);
    }

    assert(consoleErrors.length === 0, `0 console errors during execution (found ${consoleErrors.length})`);

    ws.close();
  } finally {
    chrome.kill();
  }
}

await runBrowserTests();

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5: Regression — Phase 6 Routes & 7.1 Accessible
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 5: Regression — Phase 6 & 7.1 Routes Accessible');

async function checkRoute(path) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:5173/${path}`, (res) => {
      resolve(res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => { req.destroy(); resolve(false); });
  });
}

assert(await checkRoute('mp4-to-mp3'), 'GET /mp4-to-mp3 returns 2xx');
assert(await checkRoute('video-compressor'), 'GET /video-compressor returns 2xx');
assert(await checkRoute('video-to-gif'), 'GET /video-to-gif returns 2xx');
assert(await checkRoute('gif-maker'), 'GET /gif-maker returns 2xx');
assert(await checkRoute('image-to-text'), 'GET /image-to-text returns 2xx');
assert(await checkRoute('pdf-ocr'), 'GET /pdf-ocr returns 2xx');

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${passCount + failCount}`);
console.log(`PASSED:      ${passCount}`);
console.log(`FAILED:      ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
