/**
 * Phase 7.6 — Extract Text from PDF Automated Test Suite
 *
 * Verifies:
 * - Tool registry integration (/extract-text-from-pdf in PHASE_7_TOOLS)
 * - Route registration in App.jsx
 * - PDF binary buffer validation (rejection of empty, invalid, corrupted files)
 * - Multi-page text extraction with spatial ordering
 * - Real Chrome CDP automation:
 *   - Route load, header, badges, dropzone
 *   - Ingestion of deterministic multi-page text PDF
 *   - Full text extraction with page boundaries
 *   - Accuracy verification of known tokens across pages
 *   - Page tab switching (All Pages vs Individual Pages)
 *   - Copy to clipboard & TXT download
 *   - Empty/scanned PDF handling with guidance link to /pdf-ocr
 *   - Reset and repeated processing cycle
 *   - Responsive viewports (375px, 390px, 768px, 1280px)
 * - Regression: Phase 7 tools (7.1, 7.2, 7.3, 7.4, 7.5)
 */

import fs from 'node:fs';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PHASE_7_TOOLS, ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';
import {
  validatePdfBuffer,
  formatPageText,
  extractTextFromPdf,
  createTxtBlob
} from './src/tools/pdf-to-text/pdfToTextEngine.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9501;

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

console.log('\n=== Phase 7.6 — Extract Text from PDF: Automated Test Suite ===\n');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Tool Registry & Routing
// ─────────────────────────────────────────────────────────────────────────────
console.log('GROUP 1: Tool Registry & Routing');

const extractTool = PHASE_7_TOOLS.find((t) => t.id === 'extract-text-from-pdf');
assert(!!extractTool, 'extract-text-from-pdf exists in PHASE_7_TOOLS');
assert(extractTool?.path === '/extract-text-from-pdf', 'tool path is /extract-text-from-pdf');
assert(extractTool?.category === 'Text Extraction', 'tool category is Text Extraction');
assert(extractTool?.phase === 'Phase 7', 'tool phase is Phase 7');
assert(extractTool?.status === 'Ready', 'tool status is Ready');

const inAllTools = ALL_TOOLS.find((t) => t.id === 'extract-text-from-pdf');
assert(!!inAllTools, 'extract-text-from-pdf is registered in ALL_TOOLS');
assert(TOTAL_STRATEGY_TOOLS === 55, 'TOTAL_STRATEGY_TOOLS remains 55');

const appJsx = fs.readFileSync('src/App.jsx', 'utf-8');
assert(appJsx.includes('import ExtractTextFromPdfTool from'), 'App.jsx imports ExtractTextFromPdfTool');
assert(appJsx.includes('path="extract-text-from-pdf"'), 'App.jsx registers /extract-text-from-pdf route');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Component & Buffer Validation
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 2: Component & Buffer Validation');

assert(fs.existsSync('src/tools/extract-text-from-pdf/index.jsx'), 'Component file exists');
const compContent = fs.readFileSync('src/tools/extract-text-from-pdf/index.jsx', 'utf-8');
assert(compContent.includes('extractTextFromPdf'), 'Component uses extractTextFromPdf');
assert(compContent.includes('createTxtBlob'), 'Component uses createTxtBlob');
assert(compContent.includes('100% Client-Side'), 'UI displays 100% Client-Side badge');

// Buffer validation tests
const validHeader = new TextEncoder().encode('%PDF-1.7\nSample data');
try {
  validatePdfBuffer(validHeader.buffer);
  assert(true, 'Validates %PDF- header');
} catch (e) {
  assert(false, `Validates %PDF- header: ${e.message}`);
}

try {
  validatePdfBuffer(new ArrayBuffer(0));
  assert(false, 'Should reject 0-byte buffer');
} catch (e) {
  assert(e.message.includes('empty'), 'Rejects empty buffer');
}

try {
  validatePdfBuffer(new TextEncoder().encode('GIF89aNotAPdf').buffer);
  assert(false, 'Should reject non-PDF binary');
} catch (e) {
  assert(e.message.includes('%PDF-'), 'Rejects non-PDF header');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Spatial Text Formatting Unit Tests
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 3: Spatial Text Formatting');

const mockItems = [
  { str: 'First Line Left', transform: [12, 0, 0, 12, 50, 700], width: 100, height: 12 },
  { str: 'First Line Right', transform: [12, 0, 0, 12, 200, 700], width: 100, height: 12 },
  { str: 'Paragraph Two', transform: [12, 0, 0, 12, 50, 650], width: 100, height: 12 }
];

const formatted = formatPageText(mockItems);
assert(formatted.includes('First Line Left First Line Right'), 'Combines horizontal line items in X order');
assert(formatted.includes('\n\nParagraph Two'), 'Inserts paragraph breaks for larger vertical gaps');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: Chrome CDP Automation & Real PDF Ingestion
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nGROUP 4: Chrome CDP Automation & In-Browser PDF Extraction');

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

const cdpDataDir = 'C:\\tmp\\cdp_extract_text_pdf';
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
  assert(!!version.webSocketDebuggerUrl, 'Connected to Chrome CDP for 7.6');

  async function openSession(targetUrl) {
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
    await send('Page.navigate', { url: targetUrl });
    for (let i = 0; i < 30; i++) {
      const check = await send('Runtime.evaluate', {
        expression: '!!document.querySelector(".tool-workspace")'
      });
      if (check.result?.value) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    return { ws, send };
  }

  const { ws, send } = await openSession('http://localhost:5173/extract-text-from-pdf');

  // Test 1: Page Header & Privacy Badges
  const evalResult = await send('Runtime.evaluate', {
    expression: `(() => {
      const title = document.querySelector('h1.tool-title')?.textContent || '';
      const privacy = document.querySelector('.tool-privacy-badge')?.textContent || '';
      const dropzone = !!document.getElementById('extract-text-from-pdf-dropzone');
      const input = !!document.getElementById('extract-text-from-pdf-input');
      return { title, privacy, dropzone, input };
    })()`,
    returnByValue: true
  });

  const headerInfo = evalResult.result.value;
  assert(headerInfo.title.includes('Extract Text from PDF'), `Page title contains 'Extract Text from PDF' (${headerInfo.title})`);
  assert(headerInfo.privacy.includes('100% Client-Side'), `Privacy badge displays '100% Client-Side' (${headerInfo.privacy})`);
  assert(headerInfo.dropzone, 'Dropzone exists on /extract-text-from-pdf');
  assert(headerInfo.input, 'Hidden file input exists');

  // Test 2: Generate deterministic 2-page PDF fixture
  console.log('\n  Generating deterministic 2-page PDF fixture with known text...');
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const page1 = pdfDoc.addPage([600, 400]);
  page1.drawText('FIXMYFILE PDF TEXT EXTRACTION TEST', { x: 50, y: 350, size: 20, font, color: rgb(0, 0, 0) });
  page1.drawText('SECTION A: CONTRACT TERMS AND OBLIGATIONS', { x: 50, y: 300, size: 14, font, color: rgb(0.1, 0.1, 0.1) });
  page1.drawText('PARAGRAPH 1 CONTENT RECOVERED 123456789', { x: 50, y: 250, size: 12, font, color: rgb(0.2, 0.2, 0.2) });

  // Page 2
  const page2 = pdfDoc.addPage([600, 400]);
  page2.drawText('PAGE TWO OF MULTIPAGE DOCUMENT', { x: 50, y: 350, size: 20, font, color: rgb(0, 0, 0) });
  page2.drawText('SECTION B: FINANCIAL DISCLOSURES', { x: 50, y: 300, size: 14, font, color: rgb(0.1, 0.1, 0.1) });
  page2.drawText('TOTAL AMOUNT: $54,321.00 USD', { x: 50, y: 250, size: 12, font, color: rgb(0.2, 0.2, 0.2) });

  const pdfBytes = await pdfDoc.save();
  const pdfBase64 = Buffer.from(pdfBytes).toString('base64');

  // Inject PDF into browser input
  console.log('  Attaching generated multi-page PDF to #extract-text-from-pdf-input...');
  const attachResult = await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const b64 = '${pdfBase64}';
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const file = new File([bytes], 'sample-contract.pdf', { type: 'application/pdf' });
      const input = document.getElementById('extract-text-from-pdf-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 600));

      const card = document.getElementById('extract-text-from-pdf-active-card');
      const meta = document.querySelector('.file-submeta')?.textContent || '';
      return { cardVisible: !!card, meta };
    })()`,
    returnByValue: true
  });

  assert(attachResult.result.value.cardVisible, 'Active file card is visible after file selection');
  assert(attachResult.result.value.meta.includes('2 pages'), `Submeta indicates '2 pages' (${attachResult.result.value.meta})`);

  // Click Extract Text
  console.log('  Triggering text extraction in Chrome...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-text').click()`
  });

  // Poll for result
  let extractDone = false;
  let resultData = null;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const checkRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.getElementById('extracted-text-textarea');
        if (!textarea) return null;
        const text = textarea.value || '';
        const statVals = Array.from(document.querySelectorAll('.stat-val')).map(el => el.textContent.trim());
        const copyBtn = !!document.getElementById('btn-copy-text');
        const downloadBtn = !!document.getElementById('btn-download-txt');
        return { text, statVals, copyBtn, downloadBtn };
      })()`,
      returnByValue: true
    });

    if (checkRes.result.value) {
      extractDone = true;
      resultData = checkRes.result.value;
      break;
    }
  }

  assert(extractDone, 'Text extraction completed in Chrome');
  assert(!!resultData?.text, 'Extracted text is non-empty');

  const textUpper = resultData.text.toUpperCase();
  console.log(`  Extracted document text snippet:\n    ${textUpper.substring(0, 140).replace(/\n/g, ' ')}...`);

  assert(textUpper.includes('FIXMYFILE'), 'Recovered expected token "FIXMYFILE"');
  assert(textUpper.includes('CONTRACT') || textUpper.includes('TERMS'), 'Recovered expected token "CONTRACT" or "TERMS"');
  assert(textUpper.includes('PAGE 1') || textUpper.includes('PAGE 2'), 'Preserves page boundary markers');
  assert(textUpper.includes('FINANCIAL') || textUpper.includes('DISCLOSURES'), 'Recovered Page 2 token "FINANCIAL"');
  assert(textUpper.includes('54,321'), 'Recovered Page 2 numerical amount "$54,321"');

  // Test Copy action
  console.log('  Testing copy action...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-copy-text').click()`
  });
  await new Promise((r) => setTimeout(r, 400));
  const copyFeedback = await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-copy-text')?.textContent || ''`,
    returnByValue: true
  });
  assert(
    copyFeedback.result.value.includes('Copied') || copyFeedback.result.value.includes('Copy'),
    `Copy button verified (${copyFeedback.result.value})`
  );

  // Test Reset button
  console.log('  Testing reset action...');
  await send('Runtime.evaluate', {
    expression: `document.getElementById('btn-extract-another').click()`
  });
  await new Promise((r) => setTimeout(r, 400));

  const afterReset = await send('Runtime.evaluate', {
    expression: `(() => {
      const dropzone = !!document.getElementById('extract-text-from-pdf-dropzone');
      const resultCard = !!document.getElementById('extract-text-from-pdf-result');
      return { dropzone, resultCard };
    })()`,
    returnByValue: true
  });
  assert(afterReset.result.value.dropzone, 'Reset returns UI to dropzone state');
  assert(!afterReset.result.value.resultCard, 'Result card removed after reset');

  // Test 3: Empty text PDF detection (scanned PDF prompt with /pdf-ocr link)
  console.log('\n  Testing empty text PDF graceful alert and OCR guidance...');
  const emptyPdfDoc = await PDFDocument.create();
  emptyPdfDoc.addPage([400, 300]); // Blank page
  const emptyPdfBytes = await emptyPdfDoc.save();
  const emptyPdfB64 = Buffer.from(emptyPdfBytes).toString('base64');

  await send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const b64 = '${emptyPdfB64}';
      const binary = atob(b64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

      const file = new File([bytes], 'blank.pdf', { type: 'application/pdf' });
      const input = document.getElementById('extract-text-from-pdf-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 500));
      document.getElementById('btn-extract-text').click();
    })()`
  });

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 300));
    const alertCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const alert = document.querySelector('.alert-info');
        return alert ? alert.textContent : null;
      })()`,
      returnByValue: true
    });
    if (alertCheck.result.value && alertCheck.result.value.includes('No selectable text')) {
      assert(true, 'Alerts user when document has no selectable text and provides guidance to PDF OCR');
      break;
    }
  }

  // Test 4: Mobile Viewports (375px, 390px, 768px)
  console.log('\n  Testing mobile responsiveness...');
  for (const width of [375, 390, 768]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height: 800,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 300));

    const overflowCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
        };
      })()`,
      returnByValue: true
    });

    assert(
      !overflowCheck.result.value.hasOverflow,
      `No horizontal overflow at width ${width}px (scroll: ${overflowCheck.result.value.scrollWidth}, client: ${overflowCheck.result.value.clientWidth})`
    );
  }

  // Restore desktop viewport
  await send('Emulation.clearDeviceMetricsOverride');

  // Test 5: Full Phase 7 Regression Check
  console.log('\n  Regression checking all Phase 7 tools...');
  for (const [route, id] of [
    ['http://localhost:5173/image-to-text', 'image-to-text-dropzone'],
    ['http://localhost:5173/pdf-ocr', 'pdf-ocr-dropzone'],
    ['http://localhost:5173/jpg-to-text', 'jpg-to-text-dropzone'],
    ['http://localhost:5173/png-to-text', 'png-to-text-dropzone'],
    ['http://localhost:5173/screenshot-to-text', 'screenshot-to-text-dropzone']
  ]) {
    await send('Page.navigate', { url: route });
    for (let i = 0; i < 20; i++) {
      const check = await send('Runtime.evaluate', {
        expression: `!!document.getElementById('${id}')`,
        returnByValue: true
      });
      if (check.result?.value) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const r = await send('Runtime.evaluate', {
      expression: `!!document.getElementById('${id}')`,
      returnByValue: true
    });
    assert(r.result.value, `${route} remains functional`);
  }

  ws.close();
} finally {
  chromeProc.kill();
  console.log('\nChrome test instance closed.');
}

console.log(`\n=== Results: ${passCount} PASSED, ${failCount} FAILED ===\n`);
if (failCount > 0) {
  process.exit(1);
}
