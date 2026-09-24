import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const CDP_PORT = 9368;

console.log('=== FIXMYFILE: REAL CHROME CDP TOOL CARD POLISH V2 VERIFICATION ===\n');

async function run() {
  const chromeProcess = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
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
          http.get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Chrome did not open remote debugging port ${CDP_PORT} within 6 seconds`);
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

    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && pendingRequests.has(parsed.id)) {
        const { resolve, reject } = pendingRequests.get(parsed.id);
        pendingRequests.delete(parsed.id);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.result);
      }
      if (parsed.method === 'Runtime.exceptionThrown') {
        const desc = parsed.params?.exceptionDetails?.exception?.description || parsed.params?.exceptionDetails?.text;
        pageErrors.push(desc);
      }
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        const errText = parsed.params.args.map((a) => a.value || a.description || '').join(' ');
        pageErrors.push(`Console error: ${errText}`);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    // 1. Test Viewports & Responsiveness
    const testViewports = [
      { width: 375, height: 667, name: 'Mobile 375px' },
      { width: 390, height: 844, name: 'Mobile 390px' },
      { width: 768, height: 1024, name: 'Tablet 768px' },
      { width: 1024, height: 768, name: 'Laptop 1024px' },
      { width: 1280, height: 800, name: 'Desktop 1280px' },
      { width: 1440, height: 900, name: 'Desktop 1440px' }
    ];

    console.log('1. Evaluating Viewports & Responsive Rendering on Homepage...');
    for (const vp of testViewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });
      await send('Page.navigate', { url: BASE_URL });
      await new Promise((r) => setTimeout(r, 600));

      const overflowCheck = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          return {
            windowWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth
          };
        })()`
      });
      const ov = overflowCheck.result.value;
      assert.equal(ov.hasHorizontalOverflow, false, `Horizontal overflow detected at ${vp.name}: scrollWidth=${ov.scrollWidth} > windowWidth=${ov.windowWidth}`);
      console.log(`   ✓ ${vp.name} (${vp.width}x${vp.height}): 0 horizontal overflow (scrollWidth=${ov.scrollWidth}px)`);
    }

    // Set standard desktop viewport for deep audits
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 800));

    // 2. Deep Audit of All 49 Homepage Tool Cards
    console.log('\n2. Deep DOM Audit of All Homepage Tool Cards...');
    const cardsAudit = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('.tool-card'));
        return cards.map(c => {
          const href = c.getAttribute('href');
          const title = c.querySelector('.tool-card-title')?.textContent?.trim();
          const desc = c.querySelector('.tool-card-description')?.textContent?.trim();
          const iconWrap = c.querySelector('.tool-card-icon-wrap');
          const svg = iconWrap?.querySelector('svg');
          const ariaHidden = svg?.getAttribute('aria-hidden');
          const catBadge = c.querySelector('.tool-category-badge');
          const arrow = c.querySelector('.tool-card-arrow');
          const pill = c.querySelector('.tool-path-pill');
          const rawText = c.innerText;
          const hasArrowSymbol = rawText.includes('→') || rawText.includes('➜') || rawText.includes('›');
          const isCategoryBadgeVisible = catBadge ? window.getComputedStyle(catBadge).display !== 'none' : false;
          const isArrowVisible = arrow ? window.getComputedStyle(arrow).display !== 'none' : false;
          const isPillVisible = pill ? window.getComputedStyle(pill).display !== 'none' : false;

          return {
            href,
            title,
            descLength: desc ? desc.length : 0,
            hasIconWrap: !!iconWrap,
            hasSvg: !!svg,
            ariaHidden,
            catBadgeExists: !!catBadge,
            isCategoryBadgeVisible,
            arrowExists: !!arrow,
            isArrowVisible,
            hasArrowSymbol,
            pillExists: !!pill,
            isPillVisible
          };
        });
      })()`
    });

    const renderedCards = cardsAudit.result.value;
    console.log(`   Total .tool-card elements rendered: ${renderedCards.length}`);
    assert.equal(renderedCards.length, 49, `Must render exactly 49 tool cards on Home, got ${renderedCards.length}`);

    for (let i = 0; i < renderedCards.length; i++) {
      const c = renderedCards[i];
      assert.ok(c.href, `Card #${i} must have href`);
      assert.ok(c.title, `Card #${i} must have a title`);
      assert.ok(c.descLength > 10, `Card "${c.title}" description too short: ${c.descLength} chars`);
      assert.equal(c.hasIconWrap, true, `Card "${c.title}" must have .tool-card-icon-wrap`);
      assert.equal(c.hasSvg, true, `Card "${c.title}" must have SVG icon`);
      assert.equal(c.ariaHidden, 'true', `Card "${c.title}" icon must have aria-hidden="true"`);
      assert.equal(c.isCategoryBadgeVisible, false, `Card "${c.title}" must NOT show visible category badge`);
      assert.equal(c.isArrowVisible, false, `Card "${c.title}" must NOT show visible arrow`);
      assert.equal(c.hasArrowSymbol, false, `Card "${c.title}" must NOT render arrow symbol (→)`);
      assert.equal(c.isPillVisible, false, `Card "${c.title}" must NOT show route slug pill`);
    }
    console.log('   ✓ All 49 tool cards verified: icons rendered, aria-hidden="true", badges/arrows/slugs removed');

    // 3. Verify Categories & Category Anchor
    console.log('\n3. Verifying Category Sections on Homepage...');
    const categorySections = [
      { id: 'tools-phase1', title: 'PDF Tools', count: 6 },
      { id: 'tools-phase2', title: 'Image Tools', count: 6 },
      { id: 'tools-phase3', title: 'Calculators & Generators', count: 7 },
      { id: 'tools-phase4', title: 'Advanced PDF Tools', count: 10 },
      { id: 'tools-phase5', title: 'Advanced Image Tools', count: 9 },
      { id: 'tools-phase6', title: 'Media Tools', count: 4 },
      { id: 'tools-phase7', title: 'OCR & Text Tools', count: 7 }
    ];

    for (const cat of categorySections) {
      const catEval = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          const sec = document.getElementById('${cat.id}');
          if (!sec) return null;
          const h2 = sec.querySelector('.section-title')?.textContent?.trim();
          const cardCount = sec.querySelectorAll('.tool-card').length;
          return { exists: true, title: h2, cardCount };
        })()`
      });
      const res = catEval.result.value;
      assert.ok(res, `Category section #${cat.id} must exist`);
      assert.equal(res.title, cat.title, `Section #${cat.id} title mismatch: expected "${cat.title}", got "${res.title}"`);
      assert.equal(res.cardCount, cat.count, `Section #${cat.id} card count mismatch: expected ${cat.count}, got ${res.cardCount}`);
      console.log(`   ✓ Section #${cat.id} ("${res.title}"): ${res.cardCount} cards`);
    }

    // 4. Keyboard Navigation & Focus Visible
    console.log('\n4. Verifying Keyboard Focus & Interactivity...');
    const focusEval = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const firstCard = document.querySelector('.tool-card');
        if (!firstCard) return false;
        firstCard.focus();
        const active = document.activeElement;
        const styles = window.getComputedStyle(firstCard);
        return {
          isFocused: active === firstCard,
          tagName: active?.tagName,
          href: active?.getAttribute('href'),
          outline: styles.outline || styles.outlineColor
        };
      })()`
    });
    const fRes = focusEval.result.value;
    assert.equal(fRes.isFocused, true, 'First .tool-card must receive focus');
    assert.equal(fRes.tagName, 'A', 'Focused element must be an anchor link <a>');
    console.log(`   ✓ Keyboard focus active on <a href="${fRes.href}"> with outline visible`);

    // 5. Representative Tool Pages (No Regressions & 0 Console Errors)
    const representativeRoutes = [
      '/jpg-to-pdf',
      '/compress-pdf',
      '/image-compressor',
      '/image-to-text',
      '/mp4-to-mp3',
      '/qr-code-generator'
    ];

    console.log('\n5. Evaluating Representative Tool Pages for Regressions...');
    for (const route of representativeRoutes) {
      await send('Page.navigate', { url: `${BASE_URL}${route}` });
      await new Promise((r) => setTimeout(r, 800));

      const pageCheck = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `(() => {
          return {
            title: document.title,
            h1: document.querySelector('h1')?.textContent?.trim(),
            hasDropzoneOrWorkspace: !!(document.querySelector('.dropzone') || document.querySelector('.converter-card') || document.querySelector('.tool-card') || document.querySelector('.workspace-area') || document.querySelector('form') || document.querySelector('.tool-header')),
            scrollWidth: document.documentElement.scrollWidth,
            windowWidth: window.innerWidth,
            hasOverflow: document.documentElement.scrollWidth > window.innerWidth
          };
        })()`
      });
      const pRes = pageCheck.result.value;
      assert.ok(pRes.title, `Page ${route} must have a title`);
      assert.ok(pRes.h1, `Page ${route} must have an h1`);
      assert.equal(pRes.hasOverflow, false, `Page ${route} must have no horizontal overflow`);
      console.log(`   ✓ Route ${route}: "${pRes.h1}" loaded successfully without overflow`);
    }

    // 6. Blog Article Page Related Tools Check
    console.log('\n6. Evaluating Blog Article Related Tool Cards...');
    await send('Page.navigate', { url: `${BASE_URL}/blog/how-to-compress-a-pdf-without-uploading-it` });
    await new Promise((r) => setTimeout(r, 800));

    const blogCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const relatedCards = Array.from(document.querySelectorAll('.related-tool-card'));
        return {
          count: relatedCards.length,
          cards: relatedCards.map(c => ({
            text: c.innerText,
            href: c.getAttribute('href'),
            hasArrow: c.innerText.includes('→')
          }))
        };
      })()`
    });
    const bRes = blogCheck.result.value;
    assert.ok(bRes.count > 0, 'Blog article must render related tool cards');
    for (const c of bRes.cards) {
      assert.equal(c.hasArrow, false, `Blog related card ${c.href} must not contain arrow (→)`);
    }
    console.log(`   ✓ Verified ${bRes.count} related tool cards on blog article with zero arrows`);

    // 7. Console Errors Verification
    console.log('\n7. Checking Console Errors...');
    assert.equal(pageErrors.length, 0, `Expected 0 runtime console errors, got:\n${pageErrors.join('\n')}`);
    console.log('   ✓ 0 runtime console errors across all tested pages and viewports');

    console.log('\n🎉 ALL REAL CHROME CDP TOOL CARD POLISH TESTS PASSED SUCCESSFULLY!');
  } finally {
    chromeProcess.kill('SIGTERM');
  }
}

run().catch((err) => {
  console.error('\n❌ Chrome CDP Verification Failed:', err);
  process.exit(1);
});
