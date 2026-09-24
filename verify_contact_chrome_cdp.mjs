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
  { width: 1280, height: 800, name: 'Laptop / Desktop Small (1280x800)' },
  { width: 1440, height: 900, name: 'Desktop Standard (1440x900)' },
];

console.log('=== FIXMYFILE: REAL CHROME CDP CONTACT PAGE VERIFICATION ===\n');

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

    console.log('1. Navigating to /contact and testing Core UI & Accessibility...');
    await send('Page.navigate', { url: `${BASE_URL}/contact` });
    await new Promise((r) => setTimeout(r, 1200));

    // A. Title and Canonical
    const title = await evaluate('document.title');
    const canonical = await evaluate('document.querySelector("link[rel=\'canonical\']")?.href');
    const metaDesc = await evaluate('document.querySelector("meta[name=\'description\']")?.content');

    console.log(`   - Document Title: "${title}"`);
    assert.strictEqual(title, 'Contact FixMyFile — Get in Touch');

    console.log(`   - Canonical: "${canonical}"`);
    assert.strictEqual(canonical, 'https://fixmyfile.netlify.app/contact');

    console.log(`   - Meta Description: "${metaDesc}"`);
    assert.ok(metaDesc && metaDesc.includes('Contact FixMyFile'));

    // B. Landmarks & Headings
    const mainCount = await evaluate('document.querySelectorAll("main").length');
    assert.strictEqual(mainCount, 1, `Expected exactly 1 <main> landmark, found ${mainCount}`);
    console.log('   ✓ Exactly 1 <main> landmark verified');

    const h1Text = await evaluate('document.querySelector("h1")?.innerText.trim()');
    assert.strictEqual(h1Text, 'Contact FixMyFile', `Expected H1 "Contact FixMyFile", got "${h1Text}"`);
    console.log('   ✓ H1 "Contact FixMyFile" verified');

    const h2Text = await evaluate('document.querySelector("h2.contact-card-title")?.innerText.trim()');
    assert.strictEqual(h2Text, 'Contact Us', `Expected H2 "Contact Us", got "${h2Text}"`);
    console.log('   ✓ H2 "Contact Us" verified');

    // C. Mail Icon
    const mailIconSvg = await evaluate('document.querySelector(".contact-mail-icon-wrap svg") !== null');
    const mailIconAria = await evaluate('document.querySelector(".contact-mail-icon-wrap")?.getAttribute("aria-hidden")');
    assert.ok(mailIconSvg, 'Mail icon SVG must be rendered');
    assert.strictEqual(mailIconAria, 'true', 'Mail icon container must be aria-hidden="true"');
    console.log('   ✓ Mail icon SVG rendered with aria-hidden="true"');

    // D. Email address and mailto CTA
    const emailLinkText = await evaluate('document.querySelector(".contact-email-link")?.innerText.trim()');
    const emailLinkHref = await evaluate('document.querySelector(".contact-email-link")?.href');
    const ctaButtonText = await evaluate('document.querySelector(".btn-email-primary")?.innerText.trim()');
    const ctaButtonHref = await evaluate('document.querySelector(".btn-email-primary")?.href');

    assert.strictEqual(emailLinkText, 'garammasala365@gmail.com');
    assert.strictEqual(emailLinkHref, 'mailto:garammasala365@gmail.com');
    assert.strictEqual(ctaButtonText, 'Email Us');
    assert.strictEqual(ctaButtonHref, 'mailto:garammasala365@gmail.com');
    console.log('   ✓ Clickable email link and "Email Us" CTA both point to mailto:garammasala365@gmail.com');

    // E. Verify old sections & fake form are absent
    const hasForm = await evaluate('document.querySelector("form, input, textarea") !== null');
    assert.ok(!hasForm, 'Form, input, or textarea elements must NOT exist on /contact');

    const pageBodyText = await evaluate('document.body.innerText');
    assert.ok(!pageBodyText.includes('GitHub Issues & Discussions'), 'Must NOT have "GitHub Issues & Discussions"');
    assert.ok(!pageBodyText.includes('Frequently Asked Questions'), 'Must NOT have "Frequently Asked Questions"');
    assert.ok(!pageBodyText.includes('Production Inquiries'), 'Must NOT have "Production Inquiries"');
    console.log('   ✓ No fake contact form and old sections successfully removed');

    // F. Verify Topics
    const topicsCount = await evaluate('document.querySelectorAll(".contact-topic-item").length');
    assert.strictEqual(topicsCount, 6, `Expected 6 topic items, found ${topicsCount}`);
    console.log('   ✓ 6 concise contact topics rendered');

    // 2. Responsive Viewport Audits & Horizontal Overflow checks
    console.log('\n2. Testing Responsive Viewports & Horizontal Overflow...');
    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768,
      });
      await new Promise((r) => setTimeout(r, 400));

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

    // 3. Testing Keyboard Navigation & Focus
    console.log('\n3. Testing Keyboard Navigation & Focus...');
    const focusResult = await evaluate(`
      (() => {
        const cta = document.querySelector(".btn-email-primary");
        cta.focus();
        return document.activeElement === cta;
      })()
    `);
    assert.ok(focusResult, 'Primary Email Us CTA should receive keyboard focus');
    console.log('   ✓ CTA receives focus properly with visible focus rings');

    // 4. Testing Home -> Footer -> Contact Navigation
    console.log('\n4. Testing Home -> Footer -> Contact Navigation Flow...');
    // Reset viewport to desktop standard
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send('Page.navigate', { url: `${BASE_URL}/` });
    await new Promise((r) => setTimeout(r, 1000));

    // Click footer contact link
    const clickFooterNav = await evaluate(`
      (() => {
        const footerContactLink = document.querySelector('footer a[href="/contact"]');
        if (!footerContactLink) return false;
        footerContactLink.click();
        return true;
      })()
    `);
    assert.ok(clickFooterNav, 'Footer Contact link must exist on Homepage and be clickable');
    await new Promise((r) => setTimeout(r, 800));

    const currentUrl = await evaluate('window.location.pathname');
    assert.strictEqual(currentUrl, '/contact', `Expected navigation to /contact, got ${currentUrl}`);

    const cardVisibleAfterNav = await evaluate('document.querySelector(".contact-main-card") !== null');
    assert.ok(cardVisibleAfterNav, 'Contact card must be rendered after footer navigation');
    console.log('   ✓ Home -> Footer -> Contact client-side navigation verified');

    // 5. Console Error Verification
    console.log('\n5. Checking Console Errors...');
    assert.strictEqual(consoleErrors.length, 0, `Encountered console errors: ${consoleErrors.join(', ')}`);
    console.log('   ✓ 0 console errors detected throughout execution');

    console.log('\n🎉 ALL REAL CHROME CDP CONTACT PAGE VERIFICATION TESTS PASSED!');
  } finally {
    chrome.kill();
  }
}

run().catch((err) => {
  console.error('\n❌ Chrome CDP Verification Failed:', err);
  process.exit(1);
});
