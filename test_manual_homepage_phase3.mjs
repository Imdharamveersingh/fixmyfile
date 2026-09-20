/**
 * Real Google Chrome automated browser test suite for Homepage Phase 3 Integration (/)
 * Uses Chrome DevTools Protocol (CDP) on port 9336.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Homepage Phase 3 Validation ===\n');

  // Launch headless Chrome on port 9336
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9336',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    DEV_SERVER_URL
  ]);

  try {
    await new Promise((r) => setTimeout(r, 2000));

    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9336/json/list', (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No Chrome page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let reqId = 1;
    const pendingRequests = new Map();
    const consoleLogs = [];
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
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
        consoleLogs.push({ type: msg.params.type, text });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        pageErrors.push(msg.params.exceptionDetails);
      }
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');

    // Wait for React app to mount
    for (let i = 0; i < 50; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.home-page')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log('1. Checking page load, title, and header badge...');
    const headerInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        title: document.title,
        headerBadge: document.querySelector('.brand-badge')?.textContent?.trim(),
        brandName: document.querySelector('.brand-name')?.textContent?.trim()
      })`
    });
    console.log('   Header info:', headerInfo.result.value);
    assert.strictEqual(headerInfo.result.value.brandName, 'FixMyFile');
    assert.strictEqual(headerInfo.result.value.headerBadge, 'Phase 3');

    console.log('2. Checking Hero section badge, title, description, and stats...');
    const heroInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        heroBadge: document.querySelector('.hero-badge')?.textContent?.trim(),
        heroTitle: document.querySelector('.hero-title')?.textContent?.trim(),
        heroDesc: document.querySelector('.hero-description')?.textContent?.trim(),
        stats: Array.from(document.querySelectorAll('.stat-card')).map(c => ({
          num: c.querySelector('.stat-number')?.textContent?.trim(),
          label: c.querySelector('.stat-label')?.textContent?.trim()
        }))
      })`
    });
    console.log('   Hero badge:', heroInfo.result.value.heroBadge);
    console.log('   Hero stats:', heroInfo.result.value.stats);
    assert.strictEqual(heroInfo.result.value.heroBadge, 'Phase 3 Active');
    assert.ok(heroInfo.result.value.heroDesc.includes('Phase 3 generators now rolling out'));

    const activeToolsStat = heroInfo.result.value.stats.find(s => s.label === 'Active Tools');
    assert.ok(activeToolsStat, 'Active Tools stat card should be present');
    assert.strictEqual(activeToolsStat.num, '13', 'Active Tools count should be 13');

    const totalStat = heroInfo.result.value.stats.find(s => s.label === 'Total Strategy Tools');
    assert.strictEqual(totalStat.num, '36');

    console.log('3. Checking visible Phase sections and headers...');
    const sectionsInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `Array.from(document.querySelectorAll('.tools-section')).map(s => ({
        title: s.querySelector('.section-title')?.textContent?.trim(),
        indicator: s.querySelector('.phase-indicator')?.textContent?.trim(),
        toolCount: s.querySelectorAll('.tool-card').length,
        tools: Array.from(s.querySelectorAll('.tool-card-title')).map(t => t.textContent.trim())
      }))`
    });
    console.log('   Sections found:', sectionsInfo.result.value.map(s => `${s.title} (${s.indicator}) - ${s.toolCount} tools`));

    const p3Sec = sectionsInfo.result.value.find(s => s.title.includes('Phase 3'));
    assert.ok(p3Sec, 'Phase 3 section must be present');
    assert.strictEqual(p3Sec.title, 'Phase 3: Calculators & Generators');
    assert.strictEqual(p3Sec.indicator, 'Phase 3 Active');
    assert.strictEqual(p3Sec.toolCount, 1);
    assert.deepStrictEqual(p3Sec.tools, ['QR Code Generator']);

    const p2Sec = sectionsInfo.result.value.find(s => s.title.includes('Phase 2'));
    assert.ok(p2Sec, 'Phase 2 section must be present');
    assert.strictEqual(p2Sec.toolCount, 6);

    const p1Sec = sectionsInfo.result.value.find(s => s.title.includes('Phase 1'));
    assert.ok(p1Sec, 'Phase 1 section must be present');
    assert.strictEqual(p1Sec.toolCount, 6);

    console.log('4. Verifying QR Code Generator card details on homepage...');
    const qrCardInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const qrCard = document.querySelector('a.tool-card[href="/qr-code-generator"]');
        if (!qrCard) return null;
        return {
          title: qrCard.querySelector('.tool-card-title')?.textContent?.trim(),
          category: qrCard.querySelector('.tool-category-badge')?.textContent?.trim(),
          phase: qrCard.querySelector('.tool-phase-badge')?.textContent?.trim(),
          pill: qrCard.querySelector('.tool-path-pill')?.textContent?.trim(),
          status: qrCard.querySelector('.tool-status-tag')?.textContent?.trim(),
          href: qrCard.getAttribute('href')
        };
      })()`
    });
    console.log('   QR Card Info:', qrCardInfo.result.value);
    assert.ok(qrCardInfo.result.value, 'QR Code Generator card must exist with href /qr-code-generator');
    assert.strictEqual(qrCardInfo.result.value.title, 'QR Code Generator');
    assert.strictEqual(qrCardInfo.result.value.category, 'Generators');
    assert.strictEqual(qrCardInfo.result.value.phase, 'Phase 3');
    assert.strictEqual(qrCardInfo.result.value.pill, '/qr-code-generator');
    assert.strictEqual(qrCardInfo.result.value.status, 'Ready');

    console.log('5. Verifying Barcode Generator does NOT appear anywhere on homepage...');
    const barcodeCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.body.innerText.includes('Barcode Generator')`
    });
    assert.strictEqual(barcodeCheck.result.value, false, 'Barcode Generator should not appear anywhere on homepage');

    console.log('6. Verifying no duplicate QR Code Generator cards...');
    const allQrCardsCount = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelectorAll('a.tool-card[href="/qr-code-generator"]').length`
    });
    assert.strictEqual(allQrCardsCount.result.value, 1, 'Exactly one QR Code Generator tool card must exist');

    console.log('7. Testing click on QR Code Generator card navigation...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('a.tool-card[href="/qr-code-generator"]').click()`
    });

    await new Promise((r) => setTimeout(r, 600));

    const navigatedInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        pathname: window.location.pathname,
        h1: document.querySelector('.tool-title')?.textContent?.trim(),
        hasPreview: !!document.querySelector('.qr-code-preview-wrap')
      })`
    });
    console.log('   Navigated to:', navigatedInfo.result.value);
    assert.strictEqual(navigatedInfo.result.value.pathname, '/qr-code-generator');
    assert.ok(navigatedInfo.result.value.h1.includes('QR Code Generator'));
    assert.strictEqual(navigatedInfo.result.value.hasPreview, true);

    console.log('8. Navigating back to homepage for responsive checks...');
    await send('Page.navigate', { url: DEV_SERVER_URL });
    await new Promise((r) => setTimeout(r, 800));

    console.log('9. Checking Mobile Viewport (375x812 iPhone X) for layout and no overflow...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));

    const mobileCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        qrCardVisible: !!document.querySelector('a.tool-card[href="/qr-code-generator"]')
      })`
    });
    console.log('   Mobile check:', mobileCheck.result.value);
    assert.strictEqual(mobileCheck.result.value.hasHorizontalOverflow, false, 'Mobile viewport must not have horizontal overflow');
    assert.strictEqual(mobileCheck.result.value.qrCardVisible, true);

    console.log('10. Checking console errors...');
    const criticalErrors = pageErrors.concat(
      consoleLogs.filter((l) => l.type === 'error' && !l.text.includes('favicon'))
    );
    console.log(`   Console errors count: ${criticalErrors.length}`);
    assert.strictEqual(criticalErrors.length, 0, `No console errors allowed: ${JSON.stringify(criticalErrors)}`);

    console.log('\n=== REAL CHROME HOMEPAGE VALIDATION COMPLETE: ALL PASS ===');
  } finally {
    chrome.kill('SIGKILL');
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n*** BROWSER VALIDATION FAILED ***\n', err);
  process.exit(1);
});
