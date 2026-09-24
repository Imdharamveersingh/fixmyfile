import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const PORT = 9394;

const VIEWPORTS = [
  { width: 375, height: 844, name: 'iPhone 13 / Mobile Small (375x844)' },
  { width: 390, height: 844, name: 'iPhone 14 / Mobile Standard (390x844)' },
  { width: 768, height: 1024, name: 'iPad / Tablet Portrait (768x1024)' },
  { width: 1024, height: 768, name: 'Tablet Landscape / Small Desktop (1024x768)' },
  { width: 1280, height: 800, name: 'Laptop / Desktop Medium (1280x800)' },
  { width: 1440, height: 900, name: 'Desktop Standard (1440x900)' },
];

console.log('=== FIXMYFILE: REAL CHROME CDP CONTACT PAGE COMPACT VERIFICATION ===\n');

async function run() {
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `${BASE_URL}/contact`
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Chrome failed to connect on port ${PORT}`);
    }

    const pageTarget = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

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

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
        }
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    // Grant clipboard permissions if supported
    try {
      await send('Browser.grantPermissions', {
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        origin: BASE_URL,
      });
    } catch {
      // Browser domain permission grant may not be supported on all headless builds
    }

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(`Eval failed for "${expression}": ${JSON.stringify(res.exceptionDetails)}`);
      }
      return res.result ? res.result.value : undefined;
    }

    console.log('1. Navigating to /contact and testing Core UI & Compact Structure...');
    await send('Page.navigate', { url: `${BASE_URL}/contact` });
    await new Promise((r) => setTimeout(r, 1200));

    // A. Title and Canonical
    const title = await evaluate('document.title');
    const canonical = await evaluate('document.querySelector("link[rel=\'canonical\']")?.href');

    console.log(`   - Document Title: "${title}"`);
    assert.strictEqual(title, 'Contact FixMyFile — Get in Touch');
    console.log(`   - Canonical: "${canonical}"`);
    assert.strictEqual(canonical, 'https://fixmyfile.netlify.app/contact');

    // B. Verify "Get in Touch" eyebrow is completely absent
    const hasEyebrow = await evaluate(`
      (() => {
        const text = document.body.innerText;
        const badge = document.querySelector('.info-badge');
        return text.includes('Get in Touch') || badge !== null;
      })()
    `);
    assert.ok(!hasEyebrow, '"Get in Touch" eyebrow must be completely removed from Contact page');
    console.log('   ✓ "Get in Touch" eyebrow is confirmed ABSENT');

    // C. Verify Heading and Position
    const h1Text = await evaluate('document.querySelector("h1")?.innerText.trim()');
    assert.strictEqual(h1Text, 'Contact FixMyFile');
    const h1Rect = await evaluate(`
      (() => {
        const r = document.querySelector("h1")?.getBoundingClientRect();
        return r ? { top: r.top, bottom: r.bottom } : null;
      })()
    `);
    const boxInfo = await evaluate(`
      (() => {
        const h1 = document.querySelector("h1");
        const hero = document.querySelector(".info-hero");
        const page = document.querySelector(".contact-page");
        const header = document.querySelector(".site-header");
        return {
          h1Margin: window.getComputedStyle(h1).margin,
          heroMargin: window.getComputedStyle(hero).margin,
          pagePadding: window.getComputedStyle(page).padding,
          headerHeight: header ? header.getBoundingClientRect().height : 0
        };
      })()
    `);
    console.log('   DEBUG BOX INFO:', boxInfo);
    console.log(`   ✓ H1 "Contact FixMyFile" top position: ${h1Rect.top}px (compact header offset)`);

    // D. Mail Icon
    const mailIconSvg = await evaluate('document.querySelector(".contact-mail-icon-wrap svg") !== null');
    assert.ok(mailIconSvg, 'Mail icon SVG must be rendered');
    console.log('   ✓ Mail icon rendered');

    // E. Email Address & Copy Button
    const emailLinkText = await evaluate('document.querySelector(".contact-email-link")?.innerText.trim()');
    const emailLinkHref = await evaluate('document.querySelector(".contact-email-link")?.href');
    const copyBtnTextBefore = await evaluate('document.querySelector(".contact-copy-btn")?.innerText.trim()');
    const copyBtnAriaBefore = await evaluate('document.querySelector(".contact-copy-btn")?.getAttribute("aria-label")');

    assert.strictEqual(emailLinkText, 'garammasala365@gmail.com');
    assert.strictEqual(emailLinkHref, 'mailto:garammasala365@gmail.com');
    assert.strictEqual(copyBtnTextBefore, 'Copy');
    assert.strictEqual(copyBtnAriaBefore, 'Copy email address');
    console.log('   ✓ Email address and initial Copy button state ("Copy", aria-label="Copy email address") verified');

    // F. Test Clicking Copy Button
    console.log('\n2. Testing Copy Button Interaction & State Feedback...');
    const clickSuccess = await evaluate(`
      (() => {
        const btn = document.querySelector(".contact-copy-btn");
        if (!btn) return false;
        btn.click();
        return true;
      })()
    `);
    assert.ok(clickSuccess, 'Copy button must be clicked successfully');
    await new Promise((r) => setTimeout(r, 200));

    const copyBtnTextAfter = await evaluate('document.querySelector(".contact-copy-btn")?.innerText.trim()');
    const copyBtnAriaAfter = await evaluate('document.querySelector(".contact-copy-btn")?.getAttribute("aria-label")');
    const hasCopiedClass = await evaluate('document.querySelector(".contact-copy-btn")?.classList.contains("copied")');

    console.log(`   - Copy Button Text after click: "${copyBtnTextAfter}"`);
    console.log(`   - Copy Button aria-label after click: "${copyBtnAriaAfter}"`);
    assert.strictEqual(copyBtnTextAfter, 'Copied', 'Copy button text should transition to "Copied"');
    assert.strictEqual(copyBtnAriaAfter, 'Email address copied', 'aria-label should transition to "Email address copied"');
    assert.ok(hasCopiedClass, 'Copy button should have .copied class');
    console.log('   ✓ Copy button interaction feedback ("Copied") verified');

    // G. Verify Email Us CTA
    const ctaText = await evaluate('document.querySelector(".btn-email-primary")?.innerText.trim()');
    const ctaHref = await evaluate('document.querySelector(".btn-email-primary")?.href');
    assert.strictEqual(ctaText, 'Email Us');
    assert.strictEqual(ctaHref, 'mailto:garammasala365@gmail.com');
    console.log('   ✓ Email Us CTA confirmed: text="Email Us", href="mailto:garammasala365@gmail.com"');

    // H. Viewport Height Check on 1280x800
    console.log('\n3. Testing Compact Height on 1280x800 Viewport...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 300));

    const cardBottom = await evaluate(`
      (() => {
        const card = document.querySelector(".contact-main-card");
        return card ? card.getBoundingClientRect().bottom : 9999;
      })()
    `);
    console.log(`   - Contact Card bottom on 1280x800: ${cardBottom}px (viewport height: 800px)`);
    assert.ok(
      cardBottom <= 800,
      `Contact card must fit within 800px viewport without scrolling! Got bottom=${cardBottom}px`
    );
    console.log('   ✓ Primary contact card fits 100% within the 1280x800 viewport without scrolling!');

    // 4. Responsive Viewports & Horizontal Overflow Audits
    console.log('\n4. Testing Responsive Viewports & Horizontal Overflow...');
    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768,
      });
      await new Promise((r) => setTimeout(r, 350));

      const overflow = await evaluate(`
        ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth
        })
      `);

      assert.ok(
        !overflow.hasOverflow,
        `Viewport ${vp.name} suffered horizontal overflow! scrollWidth=${overflow.scrollWidth}, innerWidth=${overflow.innerWidth}`
      );
      console.log(`   ✓ ${vp.name}: No horizontal overflow (scrollWidth=${overflow.scrollWidth}px, innerWidth=${overflow.innerWidth}px)`);
    }

    // 5. Console Error Verification
    console.log('\n5. Checking Console Errors...');
    assert.strictEqual(consoleErrors.length, 0, `Encountered console errors: ${consoleErrors.join(', ')}`);
    console.log('   ✓ 0 console errors detected throughout execution');

    console.log('\n🎉 ALL REAL CHROME CDP CONTACT PAGE COMPACT POLISH TESTS PASSED!');
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error('\n❌ Chrome CDP Verification Failed:', err);
  process.exit(1);
});
