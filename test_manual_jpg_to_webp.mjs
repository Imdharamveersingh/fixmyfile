/**
 * Real Chrome CDP manual browser test for Phase 5.4 — JPG to WebP
 * Run: node test_manual_jpg_to_webp.mjs
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TOOL_URL = 'http://localhost:5173/jpg-to-webp';

let passCount = 0;
let failCount = 0;

function pass(msg) { console.log(`  ✓ ${msg}`); passCount++; }
function fail(msg) { console.error(`  ✗ ${msg}`); failCount++; }

async function waitForChrome(port, maxMs = 12000) {
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
  throw new Error(`Chrome did not start on port ${port}`);
}

async function runViewport(label, width, height, debugPort) {
  console.log(`\n--- ${label} (${width}x${height}) ---`);

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
    const targets = await waitForChrome(debugPort);
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => { ws.onopen = resolve; });

    let reqId = 1;
    const pending = new Map();
    const pageErrors = [];

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (msg) => {
      const p = JSON.parse(msg.data);
      if (p.id && pending.has(p.id)) {
        const { resolve, reject } = pending.get(p.id);
        pending.delete(p.id);
        if (p.error) reject(new Error(p.error.message));
        else resolve(p.result);
      }
      if (p.method === 'Runtime.exceptionThrown') {
        const d = p.params?.exceptionDetails?.exception?.description || '';
        if (d) pageErrors.push(d);
      }
      if (p.method === 'Runtime.consoleAPICalled' && p.params.type === 'error') {
        const e = p.params.args.map((a) => a.value || a.description || '').join(' ');
        if (e && !e.includes('wasm') && !e.includes('ort-wasm') && !e.includes('favicon')) {
          pageErrors.push(`Console: ${e}`);
        }
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 500 });
    await send('Page.navigate', { url: TOOL_URL });
    await new Promise((r) => setTimeout(r, 2500));

    // Title check
    const titleRes = await send('Runtime.evaluate', { expression: 'document.title' });
    const title = titleRes?.result?.value || '';
    if (title.toLowerCase().includes('webp') || title.toLowerCase().includes('jpg')) pass(`Title: "${title}"`);
    else fail(`Unexpected title: "${title}"`);

    // H1 check
    const h1Res = await send('Runtime.evaluate', { expression: 'document.querySelector("h1")?.textContent?.trim() || ""' });
    const h1 = h1Res?.result?.value || '';
    if (h1.toLowerCase().includes('jpg') || h1.toLowerCase().includes('webp')) pass(`H1: "${h1}"`);
    else fail(`H1 unexpected: "${h1}"`);

    // Dropzone
    const dzRes = await send('Runtime.evaluate', { expression: '!!document.getElementById("jpg-to-webp-dropzone")' });
    if (dzRes?.result?.value) pass('Dropzone found');
    else fail('Dropzone not found');

    // Quality slider
    const qs = await send('Runtime.evaluate', { expression: '!!document.getElementById("jpg-to-webp-quality-slider")' });
    if (qs?.result?.value) pass('Quality slider found');
    else fail('Quality slider not found');

    // Lossless toggle
    const lt = await send('Runtime.evaluate', { expression: '!!document.getElementById("jpg-to-webp-lossless")' });
    if (lt?.result?.value) pass('Lossless toggle found');
    else fail('Lossless toggle not found');

    // No overflow
    const ov = await send('Runtime.evaluate', { expression: 'document.documentElement.scrollWidth > window.innerWidth' });
    if (!ov?.result?.value) pass('No horizontal overflow');
    else fail('Horizontal overflow detected');

    // No console errors
    const realErrors = pageErrors.filter((e) => !e.includes('DevTools') && !e.includes('favicon'));
    if (realErrors.length === 0) pass('No console errors');
    else fail(`Console errors: ${realErrors.slice(0, 3).join(' | ')}`);

    ws.close();
  } catch (err) {
    fail(`Exception: ${err.message}`);
  } finally {
    chrome.kill();
    await new Promise((r) => setTimeout(r, 500));
  }
}

console.log('\n=== Phase 5.4 — JPG to WebP: Real Chrome Browser Test ===');

try {
  await runViewport('Desktop', 1440, 900, 9364);
  await new Promise((r) => setTimeout(r, 1000));
  await runViewport('Mobile', 375, 667, 9365);
} catch (err) {
  fail(`Top-level: ${err.message}`);
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Total: ${passCount + failCount} | Passed: ${passCount} | Failed: ${failCount}`);
if (failCount > 0) { process.exit(1); }
else { console.log('\n✅ All browser checks PASS'); }
