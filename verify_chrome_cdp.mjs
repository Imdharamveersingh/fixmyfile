import { spawn } from 'node:child_process';
import http from 'node:http';
// Use built-in WebSocket in Node.js

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9390;
const BASE_URL = 'http://localhost:5173';

const ROUTES = [
  '/jpg-to-pdf',
  '/merge-pdf',
  '/compress-pdf',
  '/extract-text-from-pdf',
  '/image-to-pdf',
  '/image-compressor',
  '/image-cropper',
  '/qr-code-generator',
  '/password-generator',
  '/video-compressor'
];

const VIEWPORTS = [
  { width: 375, height: 844, name: '375x844 (Mobile)' },
  { width: 390, height: 844, name: '390x844 (Mobile)' },
  { width: 768, height: 1024, name: '768x1024 (Tablet)' },
  { width: 1024, height: 768, name: '1024x768 (Desktop)' },
  { width: 1280, height: 800, name: '1280x800 (Desktop)' },
  { width: 1440, height: 900, name: '1440x900 (Large Desktop)' }
];

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function waitForCdpReady(port, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const version = await fetchJson(`http://127.0.0.1:${port}/json/version`);
      if (version.webSocketDebuggerUrl) return version;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('CDP port not ready in time');
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.eventListeners = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Use native WebSocket (Node 22+)
      this.ws = new globalThis.WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = err => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const cb = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else cb.resolve(msg.result);
        } else if (msg.method && this.eventListeners.has(msg.method)) {
          for (const listener of this.eventListeners.get(msg.method)) {
            listener(msg.params);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  on(method, callback) {
    if (!this.eventListeners.has(method)) {
      this.eventListeners.set(method, []);
    }
    this.eventListeners.get(method).push(callback);
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function main() {
  console.log('--- Starting Chrome with remote debugging ---');
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--user-data-dir=C:\\temp\\chrome-test-profile-' + Date.now(),
    'about:blank'
  ], { stdio: 'ignore' });

  try {
    const version = await waitForCdpReady(CDP_PORT);
    console.log(`Connected to Chrome: ${version['Browser']}`);

    // Create a new target/page
    const targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];
    const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    // Enable Page, Runtime, DOM
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    let totalErrors = 0;
    let totalExceptions = 0;
    let totalOverflows = 0;

    const consoleMessages = [];
    client.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = params.args.map(a => a.value || a.description || '').join(' ');
        consoleMessages.push(text);
        totalErrors++;
      }
    });

    client.on('Runtime.exceptionThrown', (params) => {
      const text = params.exceptionDetails?.text || params.exceptionDetails?.exception?.description || 'Runtime error';
      consoleMessages.push(text);
      totalExceptions++;
    });

    console.log(`\nTesting ${ROUTES.length} routes across ${VIEWPORTS.length} viewports...`);

    for (const route of ROUTES) {
      const url = `${BASE_URL}${route}`;
      process.stdout.write(`Route ${route.padEnd(26)}: `);

      // Navigate to route
      await client.send('Page.navigate', { url });
      
      // Wait for page to render (Vite initial chunk load can take 1-2s on first hit)
      let rendered = false;
      for (let i = 0; i < 40; i++) {
        const check = await client.send('Runtime.evaluate', {
          expression: `!!document.querySelector('h1')`,
          returnByValue: true
        });
        if (check.result.value) {
          rendered = true;
          break;
        }
        await new Promise(r => setTimeout(r, 150));
      }

      if (!rendered) {
        const debugHtml = await client.send('Runtime.evaluate', {
          expression: `document.body.innerHTML`,
          returnByValue: true
        });
        console.error(`\nTimed out waiting for h1 on ${route}. Body:`, debugHtml.result.value?.slice(0, 300));
        process.exit(1);
      }

      // Small settle delay for sub-components
      await new Promise(r => setTimeout(r, 200));

      // Verify page element checks on default desktop viewport first
      const checkResult = await client.send('Runtime.evaluate', {
        expression: `(() => {
          const h1 = document.querySelector('h1')?.textContent || '';
          const hasIcon = !!document.querySelector('.tool-header-icon-wrap img');
          const hasPills = document.querySelectorAll('.tool-capability-pill').length;
          const hasCard = !!document.querySelector('.converter-card, .workbench-card, .tool-workspace, .qr-app-layout, .barcode-app-layout, .currency-app-layout, .percentage-app-layout, .password-app-layout, .word-counter-app-layout, .emi-calculator-layout, .dropzone-container, .tool-main-card, .tool-card');
          const hasPrivacyCard = !!document.querySelector('.tool-privacy-note-card');
          const category = document.querySelector('.tool-detail-header')?.getAttribute('data-category');
          return { h1, hasIcon, hasPills, hasCard, hasPrivacyCard, category };
        })()`,
        returnByValue: true
      });

      const checks = checkResult.result.value;
      if (!checks.hasIcon || !checks.h1.includes('Free') || checks.hasPills === 0 || !checks.hasCard || !checks.hasPrivacyCard) {
        console.error(`\nFAILED visual checks on ${route}:`, checks);
        process.exit(1);
      }

      // Now check overflow across all 6 viewports
      let routeOverflows = 0;
      for (const vp of VIEWPORTS) {
        await client.send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.width < 768
        });
        await new Promise(r => setTimeout(r, 80));

        const overflowCheck = await client.send('Runtime.evaluate', {
          expression: `(() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return { docWidth, winWidth, overflow: docWidth > winWidth + 1 };
          })()`,
          returnByValue: true
        });

        if (overflowCheck.result.value.overflow) {
          console.error(`\nOverflow detected on ${route} at ${vp.name}: doc=${overflowCheck.result.value.docWidth}px, win=${overflowCheck.result.value.winWidth}px`);
          routeOverflows++;
          totalOverflows++;
        }
      }

      if (routeOverflows === 0) {
        process.stdout.write(`OK (icon: YES, H1: "${checks.h1}", pills: ${checks.hasPills}, category: ${checks.category}, 6 viewports overflow-free)\n`);
      }
    }

    client.close();

    console.log('\n========================================');
    console.log('REAL CHROME / CDP VERIFICATION REPORT:');
    console.log(`Routes Tested: ${ROUTES.length}/${ROUTES.length}`);
    console.log(`Viewports Tested: ${VIEWPORTS.length}/${VIEWPORTS.length} (375x844, 390x844, 768x1024, 1024x768, 1280x800, 1440x900)`);
    console.log(`Console Errors: ${totalErrors}`);
    console.log(`Runtime Exceptions: ${totalExceptions}`);
    console.log(`Horizontal Overflows: ${totalOverflows}`);
    console.log('========================================\n');

    if (totalErrors > 0 || totalExceptions > 0 || totalOverflows > 0) {
      console.error('CDP verification FAILED with errors/overflows.');
      process.exit(1);
    } else {
      console.log('ALL CHROME / CDP REAL BROWSER VERIFICATIONS PASSED 100%!');
    }
  } finally {
    try {
      chromeProcess.kill();
    } catch {}
  }
}

main().catch(err => {
  console.error('Fatal error in Chrome CDP runner:', err);
  process.exit(1);
});
