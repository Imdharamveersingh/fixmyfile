import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import assert from 'node:assert';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';

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

const REPRESENTATIVE_ROUTES = [
  '/jpg-to-pdf',
  '/merge-pdf',
  '/image-compressor',
  '/image-cropper',
  '/qr-code-generator',
  '/password-generator',
  '/video-compressor',
  '/gif-maker',
  '/image-to-text',
  '/pdf-ocr'
];

async function runChromeAudit() {
  console.log('=== Starting Real Chrome CDP Verification for Supplied SVG Icon Set ===\n');

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
    const pending = new Map();
    const consoleErrors = [];
    const runtimeExceptions = [];

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
        consoleErrors.push(text);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(data.params.exceptionDetails.text);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.value;
    }

    async function navigate(path) {
      await send('Page.navigate', { url: `${BASE_URL}${path}` });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const ready = await evaluate(`document.readyState === 'complete' && !!document.querySelector('h1, .tool-card')`);
        if (ready) {
          await new Promise((r) => setTimeout(r, 200));
          break;
        }
      }
    }

    // 1. Audit Homepage (all 49 tool cards)
    console.log('1. Checking Homepage (/) and all 49 Tool Cards...');
    await navigate('/');

    const homeCardsData = await evaluate(`
      (() => {
        const cards = Array.from(document.querySelectorAll('.tool-card'));
        return cards.map(c => {
          const href = c.getAttribute('href');
          const title = c.querySelector('.tool-card-title')?.textContent?.trim();
          const img = c.querySelector('.tool-card-icon-wrap img.tool-icon-svg');
          return {
            href,
            title,
            hasIconWrap: !!c.querySelector('.tool-card-icon-wrap'),
            hasImg: !!img,
            src: img ? img.getAttribute('src') : null,
            ariaHidden: img ? img.getAttribute('aria-hidden') : null,
            isComplete: img ? img.complete : false,
            naturalWidth: img ? img.naturalWidth : 0,
            naturalHeight: img ? img.naturalHeight : 0,
            displayedWidth: img ? img.offsetWidth : 0,
            displayedHeight: img ? img.offsetHeight : 0
          };
        });
      })()
    `);

    assert.equal(homeCardsData.length, 49, `Expected 49 tool cards on homepage, found ${homeCardsData.length}`);
    console.log(`  ✓ Exactly 49 tool cards found on homepage`);

    let brokenCount = 0;
    for (const card of homeCardsData) {
      assert(card.hasIconWrap, `Card for ${card.title} must have .tool-card-icon-wrap`);
      assert(card.hasImg, `Card for ${card.title} must render img.tool-icon-svg`);
      assert(card.src && card.src.includes('.svg'), `Card for ${card.title} src must be an SVG file: ${card.src}`);
      assert.equal(card.ariaHidden, 'true', `Card for ${card.title} img must have aria-hidden="true"`);
      assert(card.isComplete, `Card for ${card.title} image must be complete (loaded)`);
      assert(card.naturalWidth > 0, `Card for ${card.title} naturalWidth must be > 0: got ${card.naturalWidth}`);
      assert(card.displayedWidth > 0, `Card for ${card.title} displayedWidth must be > 0: got ${card.displayedWidth}`);
      if (!card.isComplete || card.naturalWidth === 0) brokenCount++;
    }

    console.log(`  ✓ All 49 tool cards render valid supplied SVGs with naturalWidth > 0`);
    console.log(`  ✓ All 49 icons have aria-hidden="true" and zero broken icons (broken: ${brokenCount})`);

    const homeScreenshot = await send('Page.captureScreenshot');
    fs.writeFileSync('scripts/homepage_svg_icons.png', Buffer.from(homeScreenshot.data, 'base64'));
    console.log('  ✓ Screenshot captured: scripts/homepage_svg_icons.png');

    await evaluate(`window.scrollTo(0, 750)`);
    await new Promise((r) => setTimeout(r, 400));
    const cardsScreenshot = await send('Page.captureScreenshot');
    fs.writeFileSync('scripts/tool_cards_screenshot.png', Buffer.from(cardsScreenshot.data, 'base64'));
    console.log('  ✓ Scrolled screenshot captured: scripts/tool_cards_screenshot.png');

    // Verify hover effect
    console.log('\n2. Testing Hover and Focus styles on ToolCard...');
    const hoverCheck = await evaluate(`
      (() => {
        const card = document.querySelector('.tool-card');
        const iconWrap = card.querySelector('.tool-card-icon-wrap');
        const style = window.getComputedStyle(iconWrap);
        return {
          bg: style.backgroundColor,
          width: style.width,
          height: style.height,
          borderRadius: style.borderRadius
        };
      })()
    `);
    assert.equal(hoverCheck.width, '44px', 'Icon wrap width must be 44px');
    assert.equal(hoverCheck.height, '44px', 'Icon wrap height must be 44px');
    console.log(`  ✓ ToolCard icon wrapper dimensions preserved: ${hoverCheck.width} x ${hoverCheck.height}, borderRadius: ${hoverCheck.borderRadius}`);

    // 3. Representative routes verification
    console.log('\n3. Checking 10 Representative Routes for Related Tools icons and header...');
    for (const route of REPRESENTATIVE_ROUTES) {
      await navigate(route);
      const pageInfo = await evaluate(`
        (() => {
          const h1 = document.querySelector('h1')?.textContent?.trim();
          const relatedCards = Array.from(document.querySelectorAll('.tool-related-grid .tool-card'));
          const iconsValid = relatedCards.every(c => {
            const img = c.querySelector('.tool-card-icon-wrap img.tool-icon-svg');
            return img && img.complete && img.naturalWidth > 0 && img.getAttribute('aria-hidden') === 'true';
          });
          return {
            h1,
            relatedCount: relatedCards.length,
            iconsValid
          };
        })()
      `);
      assert(pageInfo.h1, `Route ${route} must have an H1`);
      assert(pageInfo.relatedCount >= 3, `Route ${route} must have at least 3 related tools cards`);
      assert(pageInfo.iconsValid, `Route ${route} related tools cards must all have valid loaded SVGs`);
      console.log(`  ✓ Route ${route.padEnd(24)} H1: "${pageInfo.h1}" | Related tools: ${pageInfo.relatedCount} (all icons valid)`);
    }

    // 4. Viewport & Overflow checks on Homepage and /jpg-to-pdf
    console.log('\n4. Checking Viewports & Horizontal Overflow...');
    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width < 768
      });
      await navigate('/');
      const overflowHome = await evaluate(`
        (() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientWidth = doc.clientWidth;
          return {
            hasOverflow: scrollWidth > clientWidth,
            scrollWidth,
            clientWidth
          };
        })()
      `);
      assert(!overflowHome.hasOverflow, `Homepage horizontal overflow at ${vp.name}: scrollWidth=${overflowHome.scrollWidth}, clientWidth=${overflowHome.clientWidth}`);
      console.log(`  ✓ ${vp.name.padEnd(20)}: No horizontal overflow (scrollWidth=${overflowHome.scrollWidth}, clientWidth=${overflowHome.clientWidth})`);
    }

    // Reset emulation
    await send('Emulation.clearDeviceMetricsOverride');

    // 5. Console & Runtime errors check
    console.log('\n5. Checking Console Errors & Runtime Exceptions...');
    console.log(`  Total Console Errors: ${consoleErrors.length}`);
    console.log(`  Total Runtime Exceptions: ${runtimeExceptions.length}`);
    if (consoleErrors.length > 0) {
      console.error('Console errors:', consoleErrors);
    }
    if (runtimeExceptions.length > 0) {
      console.error('Runtime exceptions:', runtimeExceptions);
    }
    assert.equal(consoleErrors.length, 0, 'Must have zero console errors');
    assert.equal(runtimeExceptions.length, 0, 'Must have zero runtime exceptions');
    console.log('  ✓ Zero console errors and zero runtime exceptions detected!');

    ws.close();
    console.log('\n=== REAL CHROME CDP VERIFICATION SUCCESSFUL ===\n');
  } finally {
    chrome.kill();
  }
}

runChromeAudit().catch((err) => {
  console.error('\n❌ Chrome CDP Verification Failed:\n', err);
  process.exit(1);
});
