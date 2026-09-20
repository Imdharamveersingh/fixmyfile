/**
 * Comprehensive Visual QA script using Chrome DevTools Protocol (CDP)
 * Tests Desktop (1440x900), Tablet (768x1024), and Mobile (375x667)
 * across Homepage, PDF Tool, Image Tool, and Phase 3 Generator.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runVisualQA() {
  console.log('=== Starting Real Chrome Browser Visual QA Redesign Validation ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9345',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    BASE_URL
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9345/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {
        // retry
      }
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9345 within 6 seconds');
    }

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No Chrome page target found');

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

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails?.text;
        pageErrors.push(desc);
      }
      if (msg.method === 'Log.entryAdded' && msg.params?.entry?.level === 'error') {
        pageErrors.push(msg.params.entry.text);
      }
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };

    await send('Runtime.enable');
    await send('Log.enable');
    await send('Page.enable');

    async function navigateTo(path, width, height, waitSelector = 'body') {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 600
      });
      await send('Page.navigate', { url: `${BASE_URL}${path}` });
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const ready = await evalScript(`!!document.querySelector("${waitSelector}")`);
        if (ready) break;
      }
      await new Promise((r) => setTimeout(r, 400));
    }

    async function evalScript(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.value;
    }

    // 1. Desktop 1440x900 on Homepage
    console.log('1. Testing Desktop (1440x900) on Homepage (/)');
    await navigateTo('/', 1440, 900, '.stat-card');

    const desktopHome = await evalScript(`
      (() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        const stats = Array.from(document.querySelectorAll('.stat-card')).map(c => ({
          num: c.querySelector('.stat-number')?.textContent?.trim(),
          label: c.querySelector('.stat-label')?.textContent?.trim()
        }));
        const heroTitle = document.querySelector('.hero-title')?.textContent?.trim();
        const headerLogo = document.querySelector('.brand-name')?.textContent?.trim();
        const cardsCount = document.querySelectorAll('.tool-card').length;
        return {
          overflowX: scrollWidth > clientWidth,
          scrollWidth,
          clientWidth,
          stats,
          heroTitle,
          headerLogo,
          cardsCount
        };
      })()
    `);

    console.log('   Desktop metrics:', desktopHome);
    assert.strictEqual(desktopHome.overflowX, false, 'No horizontal overflow on Desktop');
    assert.strictEqual(desktopHome.stats[0].num, '19');
    assert.strictEqual(desktopHome.stats[1].num, '55');
    assert.strictEqual(desktopHome.stats[2].num, '100%');
    assert.strictEqual(desktopHome.cardsCount, 19);
    console.log('   ✓ Desktop Homepage verified (19 tools, 55 planned, zero overflow).');

    // 2. Tablet 768x1024 on Homepage
    console.log('\n2. Testing Tablet (768x1024) on Homepage (/)');
    await navigateTo('/', 768, 1024, '.stat-card');

    const tabletHome = await evalScript(`
      (() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          overflowX: scrollWidth > clientWidth,
          scrollWidth,
          clientWidth
        };
      })()
    `);
    console.log('   Tablet metrics:', tabletHome);
    assert.strictEqual(tabletHome.overflowX, false, 'No horizontal overflow on Tablet');
    console.log('   ✓ Tablet Homepage verified (zero overflow).');

    // 3. Mobile 375x667 on Homepage
    console.log('\n3. Testing Mobile (375x667) on Homepage (/)');
    await navigateTo('/', 375, 667, '.stat-card');

    const mobileHome = await evalScript(`
      (() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          overflowX: scrollWidth > clientWidth,
          scrollWidth,
          clientWidth
        };
      })()
    `);
    console.log('   Mobile metrics:', mobileHome);
    assert.strictEqual(mobileHome.overflowX, false, 'No horizontal overflow on Mobile 375px');
    console.log('   ✓ Mobile Homepage verified (zero overflow).');

    // 4. Testing Representative Phase 1 Tool (/jpg-to-pdf)
    console.log('\n4. Testing Representative PDF Tool (/jpg-to-pdf) on Desktop');
    await navigateTo('/jpg-to-pdf', 1440, 900, '.dropzone');
    const pdfTool = await evalScript(`
      (() => {
        const title = document.querySelector('.tool-h1')?.textContent?.trim();
        const dropzone = document.querySelector('.dropzone');
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          title,
          hasDropzone: !!dropzone,
          overflowX: scrollWidth > clientWidth
        };
      })()
    `);
    console.log('   PDF Tool metrics:', pdfTool);
    assert.strictEqual(pdfTool.overflowX, false);
    assert.strictEqual(pdfTool.hasDropzone, true);
    console.log('   ✓ /jpg-to-pdf verified with dropzone and clean layout.');

    // 5. Testing Representative Phase 2 Tool (/image-compressor)
    console.log('\n5. Testing Representative Image Tool (/image-compressor) on Mobile');
    await navigateTo('/image-compressor', 375, 667, '.converter-card');
    const imgTool = await evalScript(`
      (() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          overflowX: scrollWidth > clientWidth,
          scrollWidth,
          clientWidth
        };
      })()
    `);
    console.log('   Image Tool mobile metrics:', imgTool);
    assert.strictEqual(imgTool.overflowX, false);
    console.log('   ✓ /image-compressor verified without overflow on mobile.');

    // 6. Testing Representative Phase 3 Tool (/qr-code-generator)
    console.log('\n6. Testing Representative Phase 3 Tool (/qr-code-generator) on Desktop');
    await navigateTo('/qr-code-generator', 1440, 900, '#download-svg-btn');
    const qrTool = await evalScript(`
      (() => {
        const title = document.querySelector('.tool-h1')?.textContent?.trim();
        const svgBtn = document.querySelector('#download-svg-btn');
        const scrollWidth = document.documentElement.scrollWidth;
        const clientWidth = document.documentElement.clientWidth;
        return {
          title,
          hasSvgBtn: !!svgBtn,
          overflowX: scrollWidth > clientWidth
        };
      })()
    `);
    console.log('   QR Tool metrics:', qrTool);
    assert.strictEqual(qrTool.overflowX, false);
    assert.strictEqual(qrTool.hasSvgBtn, true);
    console.log('   ✓ /qr-code-generator verified with SVG action.');

    // 7. Verify Console Errors across all tested views
    console.log('\n7. Checking Console Errors across all sessions...');
    console.log('   Page errors recorded:', pageErrors);
    assert.strictEqual(pageErrors.length, 0, 'Must have zero runtime console errors');
    console.log('   ✓ 0 runtime page errors detected.');

    console.log('\n=== REAL CHROME VISUAL QA VALIDATION: ALL TESTS PASSED ===\n');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

runVisualQA().catch((err) => {
  console.error('\nVisual QA FAILED:', err);
  process.exit(1);
});
