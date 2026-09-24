import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ACTIVE_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Ready');
const SHOT_DIR = path.resolve('scripts/header_audit_screenshots');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

const REPRESENTATIVE_TOOLS = [
  'jpg-to-pdf',
  'word-to-pdf',
  'compress-pdf',
  'image-compressor',
  'image-converter',
  'png-to-jpg',
  'qr-code-generator',
  'barcode-generator',
  'password-generator',
  'image-to-text',
  'pdf-ocr',
  'word-counter',
  'mp4-to-mp3',
  'video-compressor'
];

async function runHeaderChromeAudit() {
  console.log(`=== Starting Chrome CDP Header Audit for ALL ${ACTIVE_TOOLS.length} Active Tools ===\n`);

  const port = 9355;
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
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
          http.get(`http://127.0.0.1:${port}/json/list`, (res) => {
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
      throw new Error(`Chrome did not open remote debugging port ${port} within 6s`);
    }

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No Chrome page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => { ws.onopen = resolve; });

    let reqId = 1;
    const pendingRequests = new Map();
    const consoleErrors = [];

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pendingRequests.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          consoleErrors.push({
            type: 'console.error',
            args: msg.params.args.map((a) => a.value || a.description).join(' ')
          });
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push({
          type: 'exception',
          text: msg.params.exceptionDetails?.text || 'Uncaught exception',
          exception: msg.params.exceptionDetails?.exception?.description
        });
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(`Eval failed: ${res.exceptionDetails.text}`);
      }
      return res.result.value;
    }

    async function waitForSelector(selector, timeoutMs = 4000) {
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const found = await evaluate(`!!document.querySelector('${selector}')`);
        if (found) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    }

    async function setViewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768
      });
    }

    await setViewport(1280, 800);

    let passedRoutes = 0;
    const auditResults = [];

    for (let i = 0; i < ACTIVE_TOOLS.length; i++) {
      const tool = ACTIVE_TOOLS[i];
      const url = `${BASE_URL}${tool.path}`;
      const errorsBefore = consoleErrors.length;

      await send('Page.navigate', { url });
      await waitForSelector('.tool-detail-header', 5000);

      const check = await evaluate(`
        (() => {
          const header = document.querySelector('.tool-detail-header');
          const nav = document.querySelector('nav[aria-label="Breadcrumb"]');
          const homeLink = nav ? nav.querySelector('a') : null;
          const currentItem = nav ? nav.querySelector('[aria-current="page"]') : null;
          const separator = nav ? nav.querySelector('.breadcrumb-separator') : null;
          const h1List = document.querySelectorAll('h1');
          const h1 = h1List.length === 1 ? h1List[0] : null;
          const desc = header ? header.querySelector('.tool-detail-description') : null;
          const lowerContent = document.querySelector('.tool-detail-content-area');

          // Check for any legacy badges in header
          const hasFreeBadge = !!document.body.innerText.match(/Free\\s*·\\s*In-Browser/i);
          const badPill = header ? header.querySelector('.tool-badge, .tool-badge-row, .tool-badge-primary, .tool-badge-tag, .tool-badge-item') : null;

          let preH1Text = '';
          if (header) {
            const h1 = header.querySelector('h1');
            let node = header.firstElementChild;
            while (node && node !== h1) {
              if (node.tagName.toLowerCase() !== 'nav') {
                preH1Text += ' ' + (node.innerText || '');
              }
              node = node.nextElementSibling;
            }
          }

          const legacyEyebrows = [
            'Image Tool',
            'Client-Side · 100% Private',
            'JPG · PNG · WEBP',
            'PNG → JPG',
            'Generator',
            'QR · SVG + PNG',
            '1D · SVG + PNG',
            'Security Tool',
            'Text Utility'
          ];
          const foundEyebrows = legacyEyebrows.filter(e => preH1Text.includes(e));
          if (badPill) foundEyebrows.push(badPill.innerText.trim());

          // Check overflow
          const hasOverflow = document.documentElement.scrollWidth > window.innerWidth;

          return {
            hasHeader: !!header,
            hasBreadcrumbNav: !!nav,
            homeHref: homeLink ? homeLink.getAttribute('href') : null,
            homeText: homeLink ? homeLink.textContent.trim() : null,
            currentText: currentItem ? currentItem.textContent.trim() : null,
            hasSeparator: !!separator,
            h1Count: h1List.length,
            h1Text: h1 ? h1.textContent.trim() : null,
            hasDescription: !!desc && desc.textContent.trim().length > 10,
            descText: desc ? desc.textContent.trim() : null,
            hasLowerContent: !!lowerContent,
            hasFreeBadge,
            foundEyebrows,
            hasOverflow
          };
        })()
      `);

      const routeConsoleErrors = consoleErrors.slice(errorsBefore);

      const errors = [];
      if (!check.hasHeader) errors.push('Missing .tool-detail-header');
      if (!check.hasBreadcrumbNav) errors.push('Missing nav[aria-label="Breadcrumb"]');
      if (check.homeHref !== '/') errors.push(`Home href is "${check.homeHref}", expected "/"`);
      if (check.homeText !== 'Home') errors.push(`Home text is "${check.homeText}", expected "Home"`);
      if (check.currentText !== tool.name) {
        errors.push(`Breadcrumb current text "${check.currentText}" !== tool.name "${tool.name}"`);
      }
      if (!check.hasSeparator) errors.push('Missing breadcrumb separator');
      if (check.h1Count !== 1) errors.push(`Expected 1 H1, found ${check.h1Count}`);
      if (!check.hasDescription) errors.push('Missing or empty tool description');
      if (!check.hasLowerContent) errors.push('Missing Step 9.2 lower content area');
      if (check.hasFreeBadge) errors.push('Visible Free · In-Browser badge detected');
      if (check.foundEyebrows.length > 0) errors.push(`Unwanted eyebrows found: ${check.foundEyebrows.join(', ')}`);
      if (check.hasOverflow) errors.push('Horizontal overflow detected on desktop');
      if (routeConsoleErrors.length > 0) errors.push(`Console errors: ${JSON.stringify(routeConsoleErrors)}`);

      const passed = errors.length === 0;
      if (passed) passedRoutes++;

      auditResults.push({
        id: tool.id,
        path: tool.path,
        name: tool.name,
        passed,
        errors,
        check
      });

      const icon = passed ? '✓' : '✗';
      console.log(`[${String(i + 1).padStart(2, '0')}/49] ${icon} ${tool.name.padEnd(26)} -> Breadcrumb: "Home / ${check.currentText}", H1: "${check.h1Text}"`);
      if (!passed) {
        console.error(`     ERRORS: ${errors.join(', ')}`);
      }

      // If representative tool, capture screenshot
      if (REPRESENTATIVE_TOOLS.includes(tool.id)) {
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        const shotPath = path.join(SHOT_DIR, `${tool.id}_header.png`);
        fs.writeFileSync(shotPath, Buffer.from(screenshot.data, 'base64'));
      }
    }

    console.log(`\n=== Chrome Audit Summary: ${passedRoutes}/49 Routes Passed ===\n`);

    // Multi-viewport audit on representative sample
    console.log('Testing Multi-Viewport Layouts on Representative Tools (375x844, 390x844, 768x1024, 1024x768, 1280x800, 1440x900)...');
    const viewports = [
      { name: 'Mobile 375x844', width: 375, height: 844 },
      { name: 'Mobile 390x844', width: 390, height: 844 },
      { name: 'Tablet 768x1024', width: 768, height: 1024 },
      { name: 'Desktop 1024x768', width: 1024, height: 768 },
      { name: 'Desktop 1280x800', width: 1280, height: 800 },
      { name: 'Desktop 1440x900', width: 1440, height: 900 }
    ];

    const sampleSet = ['jpg-to-pdf', 'word-to-pdf', 'image-compressor', 'qr-code-generator', 'password-generator', 'video-compressor'];

    for (const toolId of sampleSet) {
      await send('Page.navigate', { url: `${BASE_URL}/${toolId}` });
      await waitForSelector('.tool-detail-header', 4000);

      for (const vp of viewports) {
        await setViewport(vp.width, vp.height);
        await new Promise((r) => setTimeout(r, 80));
        const overflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth + 1');
        console.log(`  ${toolId.padEnd(20)} @ ${vp.name.padEnd(18)}: Overflow = ${overflow ? 'FAIL' : 'PASS'}`);
      }
    }

    console.log('\n=== All Chrome Audits Finished Successfully ===');
    ws.close();
    chrome.kill();
    return { passedRoutes, total: ACTIVE_TOOLS.length, auditResults };
  } catch (err) {
    chrome.kill();
    console.error('Audit Error:', err);
    process.exit(1);
  }
}

runHeaderChromeAudit();
