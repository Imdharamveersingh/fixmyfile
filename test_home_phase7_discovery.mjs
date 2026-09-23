import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  ALL_TOOLS,
  PHASE_1_TOOLS,
  PHASE_2_TOOLS,
  PHASE_3_TOOLS,
  PHASE_4_TOOLS,
  PHASE_5_TOOLS,
  PHASE_6_TOOLS,
  PHASE_7_TOOLS,
  TOTAL_STRATEGY_TOOLS
} from './src/tools/toolsRegistry.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

console.log('=== FIXMYFILE: PHASE 7 HOME & ALL TOOLS DISCOVERY TEST SUITE ===\n');

let passedTests = 0;

// GROUP 1: Canonical Registry Verification
console.log('GROUP 1: Canonical Tool Registry & Counts');
assert.equal(PHASE_7_TOOLS.length, 7, `Phase 7 must have exactly 7 tools, got ${PHASE_7_TOOLS.length}`);
console.log('  ✓ PHASE_7_TOOLS has exactly 7 tools');

const expectedPhase7Routes = [
  '/image-to-text',
  '/pdf-ocr',
  '/jpg-to-text',
  '/png-to-text',
  '/screenshot-to-text',
  '/extract-text-from-pdf',
  '/image-cropper'
];

for (const r of expectedPhase7Routes) {
  const t = PHASE_7_TOOLS.find((tool) => tool.path === r);
  assert(t, `Phase 7 tool for route ${r} must exist in PHASE_7_TOOLS`);
  assert(t.name, `Tool at ${r} must have a name`);
  assert(t.category, `Tool at ${r} must have a category`);
  assert(t.description, `Tool at ${r} must have a description`);
  assert.equal(t.status, 'Ready');
  assert(t.phase === 'Phase 7' || t.phase === 'Phase 7.7', `Tool at ${r} must be Phase 7 or 7.7, got ${t.phase}`);
}
console.log('  ✓ All 7 Phase 7 tools verified with correct properties and Phase 7 designation');

assert.equal(ALL_TOOLS.length, 49, `Expected exactly 49 active tools in ALL_TOOLS, got ${ALL_TOOLS.length}`);
console.log(`  ✓ ALL_TOOLS active count is factually 49 (got ${ALL_TOOLS.length})`);

assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'TOTAL_STRATEGY_TOOLS must be 55');
console.log('  ✓ TOTAL_STRATEGY_TOOLS remains 55');

// Verify Phase 1-6 counts intact
assert.equal(PHASE_1_TOOLS.length, 6, 'Phase 1 count intact (6)');
assert.equal(PHASE_2_TOOLS.length, 6, 'Phase 2 count intact (6)');
assert.equal(PHASE_3_TOOLS.length, 7, 'Phase 3 count intact (7)');
assert.equal(PHASE_4_TOOLS.length, 10, 'Phase 4 count intact (10)');
assert.equal(PHASE_5_TOOLS.length, 9, 'Phase 5 count intact (9)');
assert.equal(PHASE_6_TOOLS.length, 4, 'Phase 6 count intact (4)');
console.log('  ✓ Existing Phase 1–6 tool arrays remain fully intact');
passedTests += 5;

// GROUP 2: Component Source Markup Verification
console.log('\nGROUP 2: Component Source Code Inspection');
const homeJsx = fs.readFileSync(path.resolve('src/pages/HomePage.jsx'), 'utf8');
assert(homeJsx.includes('tools-phase7'), 'HomePage.jsx must have section #tools-phase7');
assert(homeJsx.includes('PHASE_7_TOOLS'), 'HomePage.jsx must consume PHASE_7_TOOLS');
assert(homeJsx.includes('Phase 7 Complete'), 'HomePage.jsx hero badge must say Phase 7 Complete');
console.log('  ✓ HomePage.jsx correctly imports and renders Phase 7 section and Phase 7 Complete hero badge');

const headerJsx = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
assert(headerJsx.includes('/pdf-ocr'), 'Header must link to /pdf-ocr');
assert(headerJsx.includes('/extract-text-from-pdf'), 'Header must link to /extract-text-from-pdf');
assert(headerJsx.includes('/image-to-text'), 'Header must link to /image-to-text');
assert(headerJsx.includes('/image-cropper'), 'Header must link to /image-cropper');
assert(headerJsx.includes('Phase 7 Complete'), 'Header default brand badge must be Phase 7 Complete');
console.log('  ✓ Header.jsx includes Phase 7 navigation links and Phase 7 Complete badge');

const footerJsx = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf8');
assert(footerJsx.includes('Phase 7: OCR & Text'), 'Footer must contain Phase 7 heading');
assert(footerJsx.includes('/extract-text-from-pdf'), 'Footer must link to /extract-text-from-pdf');
assert(footerJsx.includes('/image-cropper'), 'Footer must link to /image-cropper');
assert(footerJsx.includes('Media Tools (Phase 6)'), 'Footer must contain Phase 6 Media Tools');
assert(footerJsx.includes('Phase 7 Complete'), 'Footer must contain Phase 7 Complete badge');
console.log('  ✓ Footer.jsx includes Phase 7 OCR links, Phase 6 Media links, and Phase 7 Complete badge');
passedTests += 3;

// GROUP 3: Real Google Chrome CDP Automation
async function runChromeHomeTests() {
  console.log('\nGROUP 3: Real Google Chrome CDP Verification on http://localhost:5173');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9360',
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
          http.get('http://127.0.0.1:9360/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9360 within 6 seconds');
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

    console.log('1. Setting Desktop Viewport 1440x900...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('2. Navigating to Home / All Tools page...');
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 1200));

    // Evaluate Header & Hero
    console.log('3. Evaluating Header, Hero, and Statistics...');
    const heroEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const brandBadge = document.querySelector('.brand-badge')?.textContent?.trim();
        const heroBadge = document.querySelector('.hero-badge')?.textContent?.trim();
        const statCards = Array.from(document.querySelectorAll('.stat-card')).map(c => ({
          num: c.querySelector('.stat-number')?.textContent?.trim(),
          lbl: c.querySelector('.stat-label')?.textContent?.trim()
        }));
        return { brandBadge, heroBadge, statCards };
      })()`,
      returnByValue: true
    });

    const heroData = heroEval.result.value;
    console.log('   Hero Data:', heroData);
    assert.equal(heroData.brandBadge, 'Phase 7 Complete', 'Brand badge must display "Phase 7 Complete"');
    assert.equal(heroData.heroBadge, 'Phase 7 Complete', 'Hero badge must display "Phase 7 Complete"');

    const activeToolsStat = heroData.statCards.find(s => s.lbl.includes('Active Tools'));
    const strategyToolsStat = heroData.statCards.find(s => s.lbl.includes('Total Strategy Tools'));
    assert.equal(activeToolsStat?.num, '49', 'Active Tools metric must be exactly 49');
    assert.equal(strategyToolsStat?.num, '55', 'Total Strategy Tools metric must be 55');
    console.log('   ✓ Header and Hero badges display "Phase 7 Complete" and Active Tools = 49');

    // Evaluate Phase 7 Section
    console.log('4. Evaluating Phase 7 Section on Home page...');
    const phase7Eval = await send('Runtime.evaluate', {
      expression: `(() => {
        const sec = document.getElementById('tools-phase7');
        if (!sec) return null;
        const title = sec.querySelector('.section-title')?.textContent?.trim();
        const indicator = sec.querySelector('.phase-indicator')?.textContent?.trim();
        const cards = Array.from(sec.querySelectorAll('.tool-card')).map(card => {
          const href = card.getAttribute('href');
          const name = card.querySelector('.tool-card-title')?.textContent?.trim();
          const cat = card.querySelector('.tool-category-badge')?.textContent?.trim();
          const status = card.querySelector('.tool-status-tag')?.textContent?.trim();
          return { href, name, cat, status };
        });
        return { hasSec: true, title, indicator, cardCount: cards.length, cards };
      })()`,
      returnByValue: true
    });

    const p7Data = phase7Eval.result.value;
    assert(p7Data && p7Data.hasSec, 'Phase 7 section #tools-phase7 must exist on Home page');
    assert.equal(p7Data.title, 'Phase 7: OCR / Text / Advanced File Tools');
    assert.equal(p7Data.indicator, '7 tools complete');
    assert.equal(p7Data.cardCount, 7, 'Phase 7 must render exactly 7 tool cards');
    console.log(`   Phase 7 Section: "${p7Data.title}" with indicator "${p7Data.indicator}"`);
    console.log(`   Cards Rendered: ${p7Data.cardCount}`);

    for (const r of expectedPhase7Routes) {
      const found = p7Data.cards.find(c => c.href === r);
      assert(found, `Card linking to ${r} must render in Phase 7 section`);
      console.log(`     ✓ Found card: ${found.name} (${found.href}) [${found.cat}] - ${found.status}`);
    }

    // Verify Conceptual Phase Order: Phase 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7
    console.log('5. Verifying Conceptual Phase Section Order...');
    const orderEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const sections = Array.from(document.querySelectorAll('.tools-section')).map(s => s.id);
        return sections;
      })()`,
      returnByValue: true
    });
    const sectionOrder = orderEval.result.value;
    console.log('   Rendered Section Order:', sectionOrder);
    assert.deepEqual(sectionOrder, [
      'tools-phase1',
      'tools-phase2',
      'tools-phase3',
      'tools-phase4',
      'tools-phase5',
      'tools-phase6',
      'tools-phase7'
    ], 'Sections must follow conceptual order Phase 1 through 7');
    console.log('   ✓ Conceptual ordering Phase 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 confirmed');

    // Verify Phase 5 does NOT contain Image Cropper and total Home tool cards is exactly 49
    console.log('5b. Verifying Phase 5 and Total Home Card Counts...');
    const cardAuditEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const p5Cards = Array.from(document.querySelectorAll('#tools-phase5 .tool-card')).map(a => a.getAttribute('href'));
        const allCards = Array.from(document.querySelectorAll('.tools-section .tool-card')).map(a => a.getAttribute('href'));
        const cropperCards = Array.from(document.querySelectorAll('.tool-card[href="/image-cropper"]'));
        return {
          p5CardCount: p5Cards.length,
          p5HasCropper: p5Cards.includes('/image-cropper'),
          totalToolCards: allCards.length,
          uniqueToolCards: new Set(allCards).size,
          cropperCardCount: cropperCards.length
        };
      })()`,
      returnByValue: true
    });
    const cardAudit = cardAuditEval.result.value;
    console.log('   Card Audit:', cardAudit);
    assert.equal(cardAudit.p5CardCount, 9, 'Phase 5 must render exactly 9 cards');
    assert.equal(cardAudit.p5HasCropper, false, 'Phase 5 must NOT contain Image Cropper');
    assert.equal(cardAudit.totalToolCards, 49, 'Total rendered tool cards must be exactly 49');
    assert.equal(cardAudit.uniqueToolCards, 49, 'Total unique rendered tool cards must be exactly 49');
    assert.equal(cardAudit.cropperCardCount, 1, 'Image Cropper card must appear exactly once on Home');
    console.log('   ✓ Phase 5 has 9 cards (no Image Cropper), total 49 cards (exactly 1 Image Cropper)');

    // Verify Footer Phase 7 Links
    console.log('6. Verifying Footer Phase 7 Discovery...');
    const footerEval = await send('Runtime.evaluate', {
      expression: `(() => {
        const footerLinks = Array.from(document.querySelectorAll('.site-footer a')).map(a => a.getAttribute('href'));
        const pill = document.querySelector('.footer-pill')?.textContent?.trim();
        return { footerLinks, pill };
      })()`,
      returnByValue: true
    });
    const fData = footerEval.result.value;
    assert.equal(fData.pill, 'Phase 7 Complete', 'Footer pill must display Phase 7 Complete');
    for (const r of expectedPhase7Routes) {
      assert(fData.footerLinks.includes(r), `Footer must link to Phase 7 tool ${r}`);
    }
    console.log('   ✓ All 7 Phase 7 routes discovered in Footer');

    // Verify Responsive Viewports for Horizontal Overflow
    const viewports = [
      { w: 1440, h: 900, name: 'Desktop 1440px' },
      { w: 1280, h: 800, name: 'Desktop 1280px' },
      { w: 768, h: 1024, name: 'Tablet 768px' },
      { w: 390, h: 844, name: 'Mobile 390px' },
      { w: 375, h: 667, name: 'Mobile 375px' }
    ];

    console.log('7. Testing Responsive Viewports for 0 Horizontal Overflow...');
    for (const vp of viewports) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 2,
        mobile: vp.w < 800
      });
      await new Promise((r) => setTimeout(r, 300));

      const overflowCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const docW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          return { docW, clientW, overflow: docW > clientW };
        })()`,
        returnByValue: true
      });
      const ovRes = overflowCheck.result.value;
      assert.equal(ovRes.overflow, false, `${vp.name} must have 0 horizontal overflow (scroll: ${ovRes.docW}, client: ${ovRes.clientW})`);
      console.log(`   ✓ ${vp.name}: 0 horizontal overflow (scrollWidth=${ovRes.docW}, clientWidth=${ovRes.clientW})`);
    }

    // Interactive Click Verification on Phase 7 Cards
    console.log('8. Interactively clicking Phase 7 Tool Cards to verify actual page navigation...');
    const testClicks = [
      { selector: 'a[href="/extract-text-from-pdf"]', expectedTitle: 'Extract Text from PDF' },
      { selector: 'a[href="/image-cropper"]', expectedTitle: 'Image Cropper' },
      { selector: 'a[href="/image-to-text"]', expectedTitle: 'Image to Text' }
    ];

    for (const clickTarget of testClicks) {
      await send('Page.navigate', { url: BASE_URL });
      await new Promise((r) => setTimeout(r, 800));

      await send('Runtime.evaluate', {
        expression: `document.querySelector('${clickTarget.selector}')?.click()`
      });
      await new Promise((r) => setTimeout(r, 1000));

      const pageCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const h1 = document.querySelector('h1')?.textContent?.trim();
          const title = document.title;
          const pathname = window.location.pathname;
          return { h1, title, pathname };
        })()`,
        returnByValue: true
      });

      const pRes = pageCheck.result.value;
      console.log(`   Navigated to ${pRes.pathname}: H1="${pRes.h1}"`);
      assert(pRes.h1.includes(clickTarget.expectedTitle) || pRes.title.includes(clickTarget.expectedTitle), `Page heading or title must match "${clickTarget.expectedTitle}"`);
    }
    console.log('   ✓ Real browser card navigation verified for Phase 7 tools');

    // Check Console Errors
    console.log('9. Checking Console Errors...');
    const criticalErrors = pageErrors.filter((e) => !e.includes('favicon') && !e.includes('manifest'));
    assert.equal(criticalErrors.length, 0, `Expected 0 console errors, got: ${criticalErrors.join('; ')}`);
    console.log('   ✓ 0 console errors confirmed');

    console.log('\n🎉 ALL HOME PHASE 7 DISCOVERY TESTS PASSED SUCCESSFULLY!');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {}
  }
}

runChromeHomeTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
