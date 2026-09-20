/**
 * Comprehensive Chrome CDP Route Navigation Scroll-to-Top Validation
 * Verifies that route navigation resets scroll position to 0 across
 * all required paths on both Desktop and Mobile viewports.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runScrollRestorationTest() {
  console.log('=== Starting Real Chrome Route Navigation Scroll-to-Top Test ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9346',
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
          http.get('http://127.0.0.1:9346/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9346 within 6 seconds');
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

    // Helper: scroll down to bottom/specified offset, click selector, wait for path, verify scrollY === 0
    async function testNavScroll({ name, fromUrl, scrollOffset, clickSelector, expectedPath }) {
      console.log(`Testing [${name}]: ${fromUrl} -> ${expectedPath}`);
      
      // Navigate to fromUrl if not already there
      const curPath = await evaluate('window.location.pathname');
      if (curPath !== fromUrl) {
        await evaluate(`window.history.pushState({}, '', '${fromUrl}'); window.dispatchEvent(new PopStateEvent('popstate'));`);
        await new Promise((r) => setTimeout(r, 400));
      }

      // Scroll down
      await evaluate(`window.scrollTo(0, ${scrollOffset || 1200});`);
      await new Promise((r) => setTimeout(r, 100));
      const scrollBefore = await evaluate('window.scrollY');
      assert.ok(scrollBefore > 200, `Expected page to be scrolled down before click, got ${scrollBefore}`);

      // Click link or card
      const clicked = await evaluate(`(() => {
        const el = document.querySelector('${clickSelector}');
        if (!el) return false;
        el.click();
        return true;
      })()`);
      assert.ok(clicked, `Selector "${clickSelector}" not found on page`);

      // Wait for route change and scroll reset
      let reached = false;
      let scrollAfter = -1;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 100));
        const p = await evaluate('window.location.pathname');
        scrollAfter = await evaluate('window.scrollY');
        if (p === expectedPath && scrollAfter === 0) {
          reached = true;
          break;
        }
      }
      assert.ok(reached, `Failed to reach route ${expectedPath} with scroll 0`);

      const finalPath = await evaluate('window.location.pathname');
      const finalScroll = await evaluate('window.scrollY');
      console.log(`   Scroll before: ${scrollBefore}px -> Path: ${finalPath} -> Scroll after: ${finalScroll}px`);
      assert.strictEqual(finalPath, expectedPath, `Expected path ${expectedPath}, got ${finalPath}`);
      assert.strictEqual(finalScroll, 0, `Expected scrollY === 0 on route ${expectedPath}, got ${finalScroll}`);
      console.log(`   ✓ ${name} passed with scrollY = 0\n`);
    }

    // Load initial homepage
    await evaluate(`window.location.href = '${BASE_URL}';`);
    await new Promise((r) => setTimeout(r, 1000));

    // A. Homepage -> JPG to PDF
    await testNavScroll({
      name: 'A. Homepage -> JPG to PDF',
      fromUrl: '/',
      scrollOffset: 1400,
      clickSelector: 'a[href="/jpg-to-pdf"]',
      expectedPath: '/jpg-to-pdf'
    });

    // B. Homepage -> PDF to Word
    await testNavScroll({
      name: 'B. Homepage -> PDF to Word',
      fromUrl: '/',
      scrollOffset: 1400,
      clickSelector: 'a[href="/pdf-to-word"]',
      expectedPath: '/pdf-to-word'
    });

    // C. Homepage -> PNG to JPG
    await testNavScroll({
      name: 'C. Homepage -> PNG to JPG',
      fromUrl: '/',
      scrollOffset: 1200,
      clickSelector: 'a[href="/png-to-jpg"]',
      expectedPath: '/png-to-jpg'
    });

    // D. Homepage -> Merge PDF
    await testNavScroll({
      name: 'D. Homepage -> Merge PDF',
      fromUrl: '/',
      scrollOffset: 1500,
      clickSelector: 'a[href="/merge-pdf"]',
      expectedPath: '/merge-pdf'
    });

    // E. Homepage -> QR Code Generator
    await testNavScroll({
      name: 'E. Homepage -> QR Code Generator',
      fromUrl: '/',
      scrollOffset: 800,
      clickSelector: 'a[href="/qr-code-generator"]',
      expectedPath: '/qr-code-generator'
    });

    // F. Homepage -> EMI Calculator
    await testNavScroll({
      name: 'F. Homepage -> EMI Calculator',
      fromUrl: '/',
      scrollOffset: 800,
      clickSelector: 'a[href="/emi-calculator"]',
      expectedPath: '/emi-calculator'
    });

    // G. Tool page -> Footer / other tool link -> another tool
    await testNavScroll({
      name: 'G. Tool page -> Another tool (/word-counter)',
      fromUrl: '/emi-calculator',
      scrollOffset: 600,
      clickSelector: 'footer a[href="/word-counter"]',
      expectedPath: '/word-counter'
    });

    // H. Tool page -> Home (brand logo)
    await testNavScroll({
      name: 'H. Tool page -> Home (brand logo)',
      fromUrl: '/word-counter',
      scrollOffset: 700,
      clickSelector: 'a.brand-logo',
      expectedPath: '/'
    });

    // I. Tool A -> Tool B (via Header Image Tools dropdown)
    console.log('Testing [I. Tool A -> Tool B via Navigation Dropdown]');
    await evaluate(`window.history.pushState({}, '', '/background-remover'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate('window.scrollTo(0, 800);');
    await new Promise((r) => setTimeout(r, 100));
    const scrollBeforeI = await evaluate('window.scrollY');
    assert.ok(scrollBeforeI > 200);
    // Click header link to /image-compressor
    await evaluate(`document.querySelector('.nav-dropdown-menu a[href="/image-compressor"]').click();`);
    await new Promise((r) => setTimeout(r, 400));
    const pathI = await evaluate('window.location.pathname');
    const scrollAfterI = await evaluate('window.scrollY');
    console.log(`   Scroll before: ${scrollBeforeI}px -> Path: ${pathI} -> Scroll after: ${scrollAfterI}px`);
    assert.strictEqual(pathI, '/image-compressor');
    assert.strictEqual(scrollAfterI, 0);
    console.log('   ✓ Tool A -> Tool B passed with scrollY = 0\n');

    // J. Back / Forward Navigation Test
    console.log('Testing [J. Back / Forward Navigation]');
    // Navigate to /password-generator, scroll down, then click back
    await evaluate(`window.history.pushState({}, '', '/password-generator'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await new Promise((r) => setTimeout(r, 400));
    await evaluate('window.scrollTo(0, 500);');
    await new Promise((r) => setTimeout(r, 100));
    // Now pushState to /currency-converter
    await evaluate(`document.querySelector('.nav-dropdown-menu a[href="/currency-converter"]').click();`);
    await new Promise((r) => setTimeout(r, 400));
    assert.strictEqual(await evaluate('window.location.pathname'), '/currency-converter');
    assert.strictEqual(await evaluate('window.scrollY'), 0);
    // Now trigger window.history.back()
    await evaluate('window.history.back();');
    await new Promise((r) => setTimeout(r, 500));
    const backPath = await evaluate('window.location.pathname');
    console.log(`   History back target: ${backPath}`);
    // Trigger window.history.forward()
    await evaluate('window.history.forward();');
    await new Promise((r) => setTimeout(r, 500));
    const forwardPath = await evaluate('window.location.pathname');
    console.log(`   History forward target: ${forwardPath}`);
    assert.strictEqual(forwardPath, '/currency-converter');
    console.log('   ✓ Back / Forward navigation verified without errors\n');

    // K. Mobile Viewport (375x667)
    console.log('Testing [K. Mobile Viewport 375x667]');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await evaluate(`window.history.pushState({}, '', '/'); window.dispatchEvent(new PopStateEvent('popstate'));`);
    await new Promise((r) => setTimeout(r, 500));
    // Scroll mobile to bottom
    await evaluate('window.scrollTo(0, 2000);');
    await new Promise((r) => setTimeout(r, 100));
    const mobileScrollBefore = await evaluate('window.scrollY');
    assert.ok(mobileScrollBefore > 500, `Mobile should be scrolled down, got ${mobileScrollBefore}`);

    // Click tool card on mobile
    await evaluate(`document.querySelector('a[href="/png-to-jpg"]').click();`);
    await new Promise((r) => setTimeout(r, 500));
    const mobilePath = await evaluate('window.location.pathname');
    const mobileScrollAfter = await evaluate('window.scrollY');
    const mobileOverflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth');

    console.log(`   Mobile scroll before: ${mobileScrollBefore}px -> Path: ${mobilePath} -> Scroll after: ${mobileScrollAfter}px`);
    assert.strictEqual(mobilePath, '/png-to-jpg');
    assert.strictEqual(mobileScrollAfter, 0, `Mobile scrollY must be 0, got ${mobileScrollAfter}`);
    assert.strictEqual(mobileOverflow, false, 'Mobile should have zero horizontal overflow');
    console.log('   ✓ Mobile test passed with scrollY = 0 and zero overflow\n');

    // Console Errors
    console.log('Checking for runtime errors during all route changes...');
    console.log('   Page errors:', pageErrors);
    assert.strictEqual(pageErrors.length, 0, 'No console errors should occur during navigation');
    console.log('   ✓ 0 runtime console errors detected.\n');

    console.log('=== ALL ROUTE NAVIGATION SCROLL-TO-TOP TESTS PASSED ===\n');

    ws.close();
    chrome.kill();
  } catch (err) {
    chrome.kill();
    throw err;
  }
}

runScrollRestorationTest().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
