import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'Mobile 375x844', width: 375, height: 844 },
  { name: 'Mobile 390x844', width: 390, height: 844 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
  { name: 'Desktop 1024x768', width: 1024, height: 768 },
  { name: 'Desktop 1280x800', width: 1280, height: 800 },
  { name: 'Desktop 1440x900', width: 1440, height: 900 }
];

async function runChromeAudit() {
  console.log('=== Starting Real Chrome CDP Verification for Step 9.4: Homepage Discovery & Brand Polish ===\n');

  const port = 9349;
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
    const pending = new Map();
    const consoleErrors = [];

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        if (data.params.type === 'error') {
          const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
          if (!text.includes('favicon') && !text.includes('manifest')) {
            consoleErrors.push(text);
          }
        }
      } else if (data.method === 'Runtime.exceptionThrown') {
        const text = data.params.exceptionDetails?.text || 'Uncaught Exception';
        consoleErrors.push(text);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.value;
    }

    async function setViewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768
      });
    }

    // 1. Initial Load at 1280x800
    await setViewport(1280, 800);
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 1500));

    console.log('1. Checking DOM structure and category counts...');
    const auditData = await evaluate(`
      (() => {
        const hero = document.querySelector('.hero-section');
        const heroTitle = hero ? hero.querySelector('.hero-title')?.textContent?.trim() : null;
        const eyebrow = hero ? hero.querySelector('.hero-eyebrow')?.textContent?.trim() : null;
        const hasStatsRow = !!document.querySelector('.stats-row');
        const hasArchSection = !!document.querySelector('.architecture-section');

        // Check categories
        const categorySections = Array.from(document.querySelectorAll('.tools-section'));
        const categories = categorySections.map(sec => {
          const title = sec.querySelector('.section-title')?.textContent?.trim();
          const subtitle = sec.querySelector('.section-subtitle')?.textContent?.trim();
          const cardCount = sec.querySelectorAll('.tool-card').length;
          const toolLinks = Array.from(sec.querySelectorAll('.tool-card')).map(c => c.getAttribute('href'));
          return { id: sec.id, title, subtitle, cardCount, toolLinks };
        });

        // Check total unique cards
        const allCards = Array.from(document.querySelectorAll('.tool-card'));
        const allCardHrefs = allCards.map(c => c.getAttribute('href'));
        const uniqueHrefs = new Set(allCardHrefs);

        // Check header and footer brand logo
        const headerLogo = document.querySelector('.site-header .brand-logo-img');
        const headerBrandText = document.querySelector('.site-header .brand-name')?.textContent?.trim();
        const footerLogo = document.querySelector('.site-footer .footer-logo-img');
        const footerBrandText = document.querySelector('.site-footer .brand-title, .site-footer .brand-name')?.textContent?.trim();

        return {
          hasHero: !!hero,
          heroTitle,
          eyebrow,
          hasStatsRow,
          hasArchSection,
          categoryCount: categorySections.length,
          categories,
          totalCards: allCards.length,
          uniqueCards: uniqueHrefs.size,
          headerLogoSrc: headerLogo?.getAttribute('src'),
          headerBrandText,
          footerLogoSrc: footerLogo?.getAttribute('src'),
          footerBrandText
        };
      })()
    `);

    console.log('   Hero Title:', auditData.heroTitle);
    console.log('   Hero Eyebrow:', auditData.eyebrow);
    console.log('   Has Stats Row:', auditData.hasStatsRow ? 'FAIL' : 'PASS (absent)');
    console.log('   Has Architecture Section:', auditData.hasArchSection ? 'FAIL' : 'PASS (absent)');
    console.log('   Public Categories Count:', auditData.categoryCount);
    auditData.categories.forEach(c => {
      console.log(`     - [${c.id}] ${c.title} (${c.cardCount} tools): "${c.subtitle}"`);
    });
    console.log('   Total Active Tool Cards:', auditData.totalCards);
    console.log('   Unique Tool Cards:', auditData.uniqueCards);
    console.log('   Header Brand:', auditData.headerLogoSrc, auditData.headerBrandText);
    console.log('   Footer Brand:', auditData.footerLogoSrc, auditData.footerBrandText);

    assert.ok(auditData.hasHero, 'Hero section must exist');
    assert.ok(!auditData.hasStatsRow, 'Stats row must be completely absent');
    assert.ok(!auditData.hasArchSection, 'Architecture section must be completely absent');
    assert.strictEqual(auditData.categoryCount, 4, 'Must have exactly 4 public categories');
    assert.strictEqual(auditData.totalCards, 49, 'Must render exactly 49 tool cards');
    assert.strictEqual(auditData.uniqueCards, 49, 'Zero duplicate tool cards');

    assert.strictEqual(auditData.categories[0].title, 'PDF Tools');
    assert.strictEqual(auditData.categories[0].cardCount, 18);
    assert.strictEqual(auditData.categories[1].title, 'Image Tools');
    assert.strictEqual(auditData.categories[1].cardCount, 20);
    assert.strictEqual(auditData.categories[2].title, 'Generators');
    assert.strictEqual(auditData.categories[2].cardCount, 7);
    assert.strictEqual(auditData.categories[3].title, 'Media Tools');
    assert.strictEqual(auditData.categories[3].cardCount, 4);

    assert.strictEqual(auditData.headerLogoSrc, '/logo.png');
    assert.strictEqual(auditData.headerBrandText, 'FixMyFile');
    assert.strictEqual(auditData.footerLogoSrc, '/logo.png');
    assert.strictEqual(auditData.footerBrandText, 'FixMyFile');

    console.log('   ✓ DOM and category counts verified.\n');

    // 2. Multi-viewport testing
    console.log('2. Testing layout and horizontal overflow across 6 viewports...');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await new Promise((r) => setTimeout(r, 200));

      const vpMetrics = await evaluate(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const hasOverflow = docW > winW;
          return { docW, winW, hasOverflow };
        })()
      `);

      const status = vpMetrics.hasOverflow ? `FAIL (doc: ${vpMetrics.docW}px, win: ${vpMetrics.winW}px)` : 'PASS';
      console.log(`   ${vp.name.padEnd(20)} : Overflow = ${status}`);
      assert.ok(!vpMetrics.hasOverflow, `Horizontal overflow detected at ${vp.name}`);
    }

    console.log('\n3. Testing ToolCard V2 interactive states (hover/floating, focus)...');
    const interactiveCheck = await evaluate(`
      (() => {
        const firstCard = document.querySelector('.tool-card');
        firstCard.focus();
        const isFocused = document.activeElement === firstCard;
        const styles = window.getComputedStyle(firstCard);
        return {
          isFocused,
          cursor: styles.cursor,
          borderRadius: styles.borderRadius,
          transition: styles.transition
        };
      })()
    `);
    console.log('   Card Focusable:', interactiveCheck.isFocused ? 'PASS' : 'FAIL');
    console.log('   Card Cursor:', interactiveCheck.cursor);
    console.log('   Card Border Radius:', interactiveCheck.borderRadius);
    assert.ok(interactiveCheck.isFocused, 'ToolCard must be keyboard focusable');

    console.log('\n4. Checking for Console Errors / Runtime Exceptions...');
    console.log('   Errors recorded:', consoleErrors.length);
    assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, got ${consoleErrors.length}`);

    console.log('\n=== ALL CHROME CDP CHECKS PASSED FOR STEP 9.4 ===');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

runChromeAudit().catch((err) => {
  console.error('\n❌ Chrome Audit Failed:', err);
  process.exit(1);
});
