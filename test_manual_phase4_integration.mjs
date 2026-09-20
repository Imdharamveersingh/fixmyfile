import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runPhase4IntegrationVerification() {
  console.log('=== Starting Real Chrome CDP Phase 4 Integration Verification ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9355',
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
          http.get('http://127.0.0.1:9355/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9355 within 6 seconds');
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

    ws.onmessage = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const desc = msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text;
        pageErrors.push(desc);
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        const text = msg.params.args.map((a) => a.value || a.description).join(' ');
        pageErrors.push(text);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error('Evaluation error: ' + JSON.stringify(res.exceptionDetails));
      }
      return res.result?.value;
    }

    // 1. Verify Homepage
    console.log('1. Checking Homepage Discovery & Tool Counts...');
    await send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 1200));

    const totalToolCards = await evaluate('document.querySelectorAll(".tool-card").length');
    console.log(`   Found ${totalToolCards} tool cards on homepage.`);
    assert.strictEqual(totalToolCards, 24, 'All 24 active tools must be rendered on homepage');

    const phase4Section = await evaluate(`(() => {
      const sec = document.getElementById("tools-phase4");
      if (!sec) return null;
      const title = sec.querySelector(".section-title")?.textContent?.trim();
      const count = sec.querySelectorAll(".tool-card").length;
      const cards = Array.from(sec.querySelectorAll(".tool-card-title")).map(el => el.textContent.trim());
      return { title, count, cards };
    })()`);
    console.log('   Phase 4 section:', phase4Section);
    assert.ok(phase4Section, 'Phase 4 section must exist on homepage');
    assert.strictEqual(phase4Section.count, 5, 'Phase 4 section must contain all 5 tools');
    assert.deepStrictEqual(phase4Section.cards, [
      'Split PDF',
      'PDF to Excel',
      'PDF to PowerPoint',
      'Rotate PDF',
      'Protect PDF'
    ]);
    console.log('   ✓ Homepage shows all 5 Phase 4 tools under Phase 4: PDF Tools.');

    // 2. Verify PDF Tools Navigation Dropdown
    console.log('\n2. Checking PDF Tools Navigation Dropdown...');
    const pdfNavLinks = await evaluate(`(() => {
      const dropdowns = Array.from(document.querySelectorAll(".nav-dropdown"));
      const pdfDropdown = dropdowns.find(d => d.querySelector(".nav-dropdown-label")?.textContent?.includes("PDF Tools"));
      if (!pdfDropdown) return [];
      return Array.from(pdfDropdown.querySelectorAll(".nav-dropdown-menu a")).map(a => ({
        name: a.textContent.trim(),
        href: a.getAttribute("href")
      }));
    })()`);
    console.log(`   PDF Dropdown has ${pdfNavLinks.length} links.`);
    assert.strictEqual(pdfNavLinks.length, 11, 'PDF Tools dropdown must have all 11 PDF tools');
    assert.ok(pdfNavLinks.some(l => l.name === 'Split PDF' && l.href === '/split-pdf'));
    assert.ok(pdfNavLinks.some(l => l.name === 'PDF to Excel' && l.href === '/pdf-to-excel'));
    assert.ok(pdfNavLinks.some(l => l.name === 'PDF to PowerPoint' && l.href === '/pdf-to-powerpoint'));
    assert.ok(pdfNavLinks.some(l => l.name === 'Rotate PDF' && l.href === '/rotate-pdf'));
    assert.ok(pdfNavLinks.some(l => l.name === 'Protect PDF' && l.href === '/protect-pdf'));
    console.log('   ✓ PDF Tools navigation includes all 5 Phase 4 tools.');

    // 3. Verify Each Phase 4 Tool Page UI & Badges
    const phase4Routes = [
      { path: '/split-pdf', title: 'Split PDF' },
      { path: '/pdf-to-excel', title: 'PDF to Excel Converter' },
      { path: '/pdf-to-powerpoint', title: 'PDF to PowerPoint Converter' },
      { path: '/rotate-pdf', title: 'Rotate PDF Pages' },
      { path: '/protect-pdf', title: 'Protect PDF with Password' }
    ];

    console.log('\n3. Verifying Phase 4 Pages (UI Consistency, Badges, Styling)...');
    for (const route of phase4Routes) {
      await send('Page.navigate', { url: `${BASE_URL}${route.path}` });
      await new Promise((r) => setTimeout(r, 600));

      const pageState = await evaluate(`(() => {
        const brandBadge = document.querySelector(".brand-badge")?.textContent?.trim();
        const headerBadge = document.querySelector(".tool-badge-accent")?.textContent?.trim();
        const title = document.querySelector(".tool-h1")?.textContent?.trim();
        const hasCard = !!document.querySelector(".converter-card");
        const hasDropzone = !!document.querySelector(".dropzone");
        const overflow = document.documentElement.scrollWidth > window.innerWidth;
        return { brandBadge, headerBadge, title, hasCard, hasDropzone, overflow };
      })()`);

      console.log(`   Checking ${route.path}:`, pageState);
      assert.strictEqual(pageState.brandBadge, 'Phase 4', `${route.path} brand badge must be Phase 4`);
      assert.strictEqual(pageState.headerBadge, 'Phase 4', `${route.path} tool header badge must be Phase 4`);
      assert.strictEqual(pageState.title, route.title, `${route.path} title match`);
      assert.strictEqual(pageState.hasCard, true, `${route.path} has styled converter-card`);
      assert.strictEqual(pageState.hasDropzone, true, `${route.path} has styled dropzone`);
      assert.strictEqual(pageState.overflow, false, `${route.path} has zero overflow`);
    }
    console.log('   ✓ All 5 Phase 4 tool pages verified with Phase 4 badge and SaaS styling.');

    // 4. Verify Existing Phase 1, 2, 3 Pages (Regression Check)
    console.log('\n4. Verifying Phase 1-3 Pages Integrity & Badges...');
    // Phase 1 check: /compress-pdf
    await send('Page.navigate', { url: `${BASE_URL}/compress-pdf` });
    await new Promise((r) => setTimeout(r, 500));
    const p1State = await evaluate(`(() => ({
      brandBadge: document.querySelector(".brand-badge")?.textContent?.trim(),
      headerBadge: document.querySelector(".tool-badge-accent")?.textContent?.trim()
    }))()`);
    console.log('   Phase 1 (/compress-pdf):', p1State);
    assert.strictEqual(p1State.brandBadge, 'Phase 1');
    assert.strictEqual(p1State.headerBadge, 'Phase 1');

    // Phase 2 check: /background-remover
    await send('Page.navigate', { url: `${BASE_URL}/background-remover` });
    await new Promise((r) => setTimeout(r, 500));
    const p2Badge = await evaluate('document.querySelector(".brand-badge")?.textContent?.trim()');
    console.log('   Phase 2 (/background-remover): brand badge =', p2Badge);
    assert.strictEqual(p2Badge, 'Phase 2');

    // Phase 3 check: /qr-code-generator
    await send('Page.navigate', { url: `${BASE_URL}/qr-code-generator` });
    await new Promise((r) => setTimeout(r, 500));
    const p3Badge = await evaluate('document.querySelector(".brand-badge")?.textContent?.trim()');
    console.log('   Phase 3 (/qr-code-generator): brand badge =', p3Badge);
    assert.strictEqual(p3Badge, 'Phase 3');
    console.log('   ✓ Phase 1-3 tool pages remain intact and dynamically display their own phase badges.');

    // 5. Mobile Viewport Check (375x667)
    console.log('\n5. Testing Mobile Viewport (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });

    const mobilePages = ['/', '/split-pdf', '/pdf-to-excel', '/pdf-to-powerpoint', '/rotate-pdf', '/protect-pdf'];
    for (const p of mobilePages) {
      await send('Page.navigate', { url: `${BASE_URL}${p}` });
      await new Promise((r) => setTimeout(r, 400));
      const mobileOverflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
      assert.strictEqual(mobileOverflow, false, `Mobile overflow detected on ${p}`);
    }
    console.log('   ✓ Mobile 375px verified with zero horizontal overflow across homepage and all Phase 4 tools.');

    // 6. Console Error Check
    console.log('\n6. Checking Runtime Console Errors...');
    console.log('   Total runtime console errors:', pageErrors.length);
    assert.strictEqual(pageErrors.length, 0, 'Zero runtime console errors expected');
    console.log('   ✓ 0 runtime console errors detected.');

    console.log('\n=== REAL CHROME CDP PHASE 4 INTEGRATION TEST: ALL PASS ===\n');

    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

runPhase4IntegrationVerification().catch((err) => {
  console.error('❌ Phase 4 Integration Verification Failed:', err);
  process.exit(1);
});
