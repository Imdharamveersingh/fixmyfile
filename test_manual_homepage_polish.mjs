/**
 * Real Google Chrome validation for Homepage UI Polish Patch
 * Tests layout, hero gap, centered 7th card, footer grouping, and console errors.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Homepage Polish Validation ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9342',
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
          http.get('http://127.0.0.1:9342/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9342 within 6 seconds');
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
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        pageErrors.push(msg.params.exceptionDetails);
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');

    async function evalScript(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(`Eval error: ${res.exceptionDetails.text || res.exceptionDetails.exception?.description}`);
      }
      return res.result?.value;
    }

    // 1. Navigate to homepage on desktop 1280x800
    console.log('1. Setting desktop viewport 1280x800 and navigating to /...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 1200));

    // 2. Verify Stats row values
    console.log('2. Verifying stats row...');
    const stats = await evalScript(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.stat-card'));
        return cards.map(c => ({
          num: c.querySelector('.stat-number')?.textContent?.trim(),
          label: c.querySelector('.stat-label')?.textContent?.trim()
        }));
      })()
    `);
    console.log('   Stats:', stats);
    assert.strictEqual(stats[0].num, '19');
    assert.strictEqual(stats[0].label, 'Active Tools');
    assert.strictEqual(stats[1].num, '36');
    assert.strictEqual(stats[1].label, 'Total Strategy Tools');
    assert.strictEqual(stats[2].num, '100%');
    console.log('   ✓ Stats confirmed 19 / 36 / 100%.');

    // 3. Verify vertical gap between stats-row and Phase 3 section
    console.log('3. Verifying hero → Phase 3 vertical gap...');
    const gapMetrics = await evalScript(`
      (() => {
        const statsRow = document.querySelector('.stats-row');
        const phase3Header = document.querySelector('.tools-section .section-header');
        const statsBottom = statsRow.getBoundingClientRect().bottom;
        const phase3Top = phase3Header.getBoundingClientRect().top;
        return { gap: Math.round(phase3Top - statsBottom) };
      })()
    `);
    console.log(`   Vertical gap: ${gapMetrics.gap}px`);
    assert.ok(gapMetrics.gap >= 40 && gapMetrics.gap <= 55, `Expected gap ~44-48px, got ${gapMetrics.gap}px`);
    console.log('   ✓ Excessive gap successfully reduced.');

    // 4. Verify Desktop Centering of 7th Card (EMI Calculator)
    console.log('4. Verifying Phase 3 layout & centered 7th card...');
    const p3Layout = await evalScript(`
      (() => {
        const grid = document.querySelector('.phase3-grid');
        const cards = Array.from(grid.children);
        const cardRects = cards.map(c => {
          const r = c.getBoundingClientRect();
          return {
            title: c.querySelector('.tool-card-title')?.textContent?.trim(),
            left: Math.round(r.left),
            right: Math.round(r.right),
            center: Math.round(r.left + r.width / 2),
            width: Math.round(r.width),
            top: Math.round(r.top)
          };
        });
        const gridRect = grid.getBoundingClientRect();
        const gridCenter = Math.round(gridRect.left + gridRect.width / 2);

        return {
          totalCards: cards.length,
          gridCenter,
          cardRects
        };
      })()
    `);
    assert.strictEqual(p3Layout.totalCards, 7, 'Phase 3 must have 7 cards');
    const emiCard = p3Layout.cardRects[6];
    const passwordCard = p3Layout.cardRects[4]; // Row 2 middle card
    console.log(`   Card 5 (Password) center: ${passwordCard.center}px`);
    console.log(`   Card 7 (EMI) center: ${emiCard.center}px`);
    console.log(`   Grid center: ${p3Layout.gridCenter}px`);
    assert.ok(
      Math.abs(emiCard.center - passwordCard.center) <= 2,
      `EMI card center (${emiCard.center}) must align with center column (${passwordCard.center})`
    );
    console.log('   ✓ Card 7 (EMI Calculator) is visually centered directly under middle column.');

    // 5. Verify Footer Phase 1 grouping & Phase 3 heading
    console.log('5. Verifying Footer structure...');
    const footerCheck = await evalScript(`
      (() => {
        const headings = Array.from(document.querySelectorAll('.footer-col .footer-heading')).map(h => h.textContent.trim());
        const phase1Col = Array.from(document.querySelectorAll('.footer-col')).find(c =>
          c.querySelector('.footer-heading')?.textContent?.includes('Phase 1')
        );
        const phase1Links = Array.from(phase1Col?.querySelectorAll('a') || []).map(a => a.textContent.trim());
        const phase3Col = Array.from(document.querySelectorAll('.footer-col')).find(c =>
          c.querySelector('.footer-heading')?.textContent?.includes('Phase 3')
        );
        const phase3Heading = phase3Col?.querySelector('.footer-heading')?.textContent?.trim();
        const phase3Links = Array.from(phase3Col?.querySelectorAll('a') || []).map(a => a.textContent.trim());

        return {
          headings,
          phase1Links,
          phase3Heading,
          phase3Links
        };
      })()
    `);
    console.log('   Footer Headings:', footerCheck.headings);
    console.log('   Phase 1 Links Count:', footerCheck.phase1Links.length);
    console.log('   Phase 1 Links:', footerCheck.phase1Links);
    console.log('   Phase 3 Heading:', footerCheck.phase3Heading);
    console.log('   Phase 3 Links Count:', footerCheck.phase3Links.length);

    assert.strictEqual(footerCheck.phase1Links.length, 6, 'Phase 1 must contain all 6 PDF tools in one group');
    assert.ok(footerCheck.phase1Links.includes('JPG to PDF'));
    assert.ok(footerCheck.phase1Links.includes('PDF to Word'));
    assert.ok(footerCheck.phase1Links.includes('PDF to JPG'));
    assert.ok(footerCheck.phase1Links.includes('Word to PDF'));
    assert.ok(footerCheck.phase1Links.includes('Merge PDF'));
    assert.ok(footerCheck.phase1Links.includes('Compress PDF'));
    assert.strictEqual(footerCheck.phase3Heading, 'Phase 3: Calculators & Generators');
    assert.strictEqual(footerCheck.phase3Links.length, 7);
    console.log('   ✓ Footer successfully unified Phase 1 into 1 group and renamed Phase 3 heading.');

    // 6. Mobile Viewport Check (375x667)
    console.log('6. Testing Mobile Viewport (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));
    const mobileMetrics = await evalScript(`
      (() => {
        return {
          overflowX: document.documentElement.scrollWidth > window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: window.innerWidth
        };
      })()
    `);
    console.log('   Mobile metrics:', mobileMetrics);
    assert.strictEqual(mobileMetrics.overflowX, false, 'Mobile must have zero horizontal overflow');
    console.log('   ✓ Mobile responsive check passed with zero overflow.');

    // 7. Check Console Errors
    console.log('7. Checking Console Errors...');
    const fatalErrors = pageErrors.filter((e) => !e.text?.includes('favicon'));
    assert.strictEqual(fatalErrors.length, 0, `Expected 0 page errors, found ${fatalErrors.length}`);
    console.log('   ✓ 0 runtime page errors detected.');

    console.log('\n=== REAL CHROME HOMEPAGE POLISH VALIDATION: ALL TESTS PASSED ===\n');
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n❌ Browser Validation Failed:', err);
  process.exit(1);
});
