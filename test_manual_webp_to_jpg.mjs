/**
 * Real Chrome CDP manual browser test for Phase 5.3 — WebP to JPG
 * Uses native Chrome headless + WebSocket CDP (no puppeteer dependency).
 *
 * Run: node test_manual_webp_to_jpg.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const TOOL_URL = `${BASE_URL}/webp-to-jpg`;

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passCount++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failCount++; }

// Minimal valid WebP (4x4 solid color, VP8 lossy, valid RIFF structure)
const WEBP_B64 = 'UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoEAAQAAUAmJagCdAEO/gHOAADA/tFSAAP7z6T/qPDQZMz/dPZ//sv/hD/d/0vf3n/t/7n/rH8w/1z/rqAA';

function writeTestWebp(outputPath) {
  if (!fs.existsSync(path.dirname(outputPath))) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  }
  fs.writeFileSync(outputPath, Buffer.from(WEBP_B64, 'base64'));
}

async function waitForChromePort(port, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const targets = await new Promise((resolve, reject) => {
        http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
          let d = '';
          res.on('data', (c) => (d += c));
          res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve([]); } });
        }).on('error', reject);
      });
      if (targets && targets.length > 0) return targets;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Chrome did not start CDP on port ${port} within ${maxMs}ms`);
}

async function runViewport(label, width, height, debugPort) {
  console.log(`\n--- ${label} (${width}x${height}) ---`);

  const fixtureDir = path.join(__dirname, 'fixtures');
  const webpFixture = path.join(fixtureDir, `test_webp_${debugPort}.webp`);
  writeTestWebp(webpFixture);

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${debugPort}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    `--window-size=${width},${height}`,
    TOOL_URL,
  ]);

  try {
    const targets = await waitForChromePort(debugPort, 12000);
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

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
        const desc = parsed.params?.exceptionDetails?.exception?.description || parsed.params?.exceptionDetails?.text || '';
        if (desc) pageErrors.push(desc);
      }
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        const errText = parsed.params.args.map((a) => a.value || a.description || '').join(' ');
        if (errText && !errText.includes('favicon') && !errText.includes('wasm') && !errText.includes('ort')) {
          pageErrors.push(`Console error: ${errText}`);
        }
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 2500));

    // Check title
    const titleResult = await send('Runtime.evaluate', { expression: 'document.title' });
    const title = titleResult?.result?.value || '';
    if (title.toLowerCase().includes('webp')) pass(`Page title: "${title}"`);
    else fail(`Unexpected title: "${title}"`);

    // Check h1
    const h1Result = await send('Runtime.evaluate', { expression: 'document.querySelector("h1")?.textContent?.trim() || ""' });
    const h1 = h1Result?.result?.value || '';
    if (h1.toLowerCase().includes('webp')) pass(`H1: "${h1}"`);
    else fail(`H1 unexpected: "${h1}"`);

    // Dropzone exists
    const dropzoneResult = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-to-jpg-dropzone")' });
    if (dropzoneResult?.result?.value) pass('Dropzone found');
    else fail('Dropzone not found');

    // Quality slider exists
    const sliderResult = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-quality-slider")' });
    if (sliderResult?.result?.value) pass('Quality slider found');
    else fail('Quality slider not found');

    // Background preset buttons
    const bgWhiteResult = await send('Runtime.evaluate', { expression: '!!document.getElementById("webp-bg-white")' });
    if (bgWhiteResult?.result?.value) pass('Background White preset button found');
    else fail('Background White button not found');

    // No horizontal overflow
    const overflowResult = await send('Runtime.evaluate', {
      expression: 'document.documentElement.scrollWidth > window.innerWidth',
    });
    if (!overflowResult?.result?.value) pass('No horizontal overflow');
    else fail('Horizontal overflow detected');

    // Filter real errors
    const realErrors = pageErrors.filter(
      (e) => !e.includes('favicon') && !e.includes('wasm') && !e.includes('ort-wasm') && !e.includes('DevTools')
    );
    if (realErrors.length === 0) pass('No console errors');
    else fail(`Console errors: ${realErrors.slice(0, 3).join(' | ')}`);

    ws.close();
  } catch (err) {
    fail(`Exception: ${err.message}`);
  } finally {
    chrome.kill();
    await new Promise((r) => setTimeout(r, 500));
    if (fs.existsSync(webpFixture)) fs.unlinkSync(webpFixture);
  }
}

console.log('\n=== Phase 5.3 — WebP to JPG: Real Chrome Browser Test ===');

try {
  await runViewport('Desktop', 1440, 900, 9362);
  await new Promise((r) => setTimeout(r, 1000));
  await runViewport('Mobile', 375, 667, 9363);
} catch (err) {
  fail(`Top-level error: ${err.message}`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) {
  console.error('\n❌ Some checks FAILED.');
  process.exit(1);
} else {
  console.log('\n✅ All browser checks PASS');
}
