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
  console.log('=== Starting Real Chrome CDP Verification for Logo Branding ===\n');

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

    console.log('1. Checking Header & Footer logo image elements, links, and text absence...');
    const auditData = await evaluate(`
      (() => {
        const headerLink = document.querySelector('.site-header .brand-logo');
        const headerImg = headerLink ? headerLink.querySelector('img') : null;
        const headerText = headerLink ? headerLink.innerText.trim() : '';

        const footerLink = document.querySelector('.site-footer .footer-brand');
        const footerImg = footerLink ? footerLink.querySelector('img') : null;
        const footerText = footerLink ? footerLink.innerText.trim() : '';

        // Check image natural dimensions & computed dimensions
        const hRect = headerImg ? headerImg.getBoundingClientRect() : null;
        const fRect = footerImg ? footerImg.getBoundingClientRect() : null;

        return {
          hasHeaderLink: !!headerLink,
          headerHref: headerLink?.getAttribute('href'),
          headerImgSrc: headerImg?.getAttribute('src'),
          headerImgAlt: headerImg?.getAttribute('alt'),
          headerImgNaturalW: headerImg?.naturalWidth,
          headerImgNaturalH: headerImg?.naturalHeight,
          headerImgRenderedW: hRect ? Math.round(hRect.width) : 0,
          headerImgRenderedH: hRect ? Math.round(hRect.height) : 0,
          headerTextBesideLogo: headerText,

          hasFooterLink: !!footerLink,
          footerHref: footerLink?.getAttribute('href'),
          footerImgSrc: footerImg?.getAttribute('src'),
          footerImgAlt: footerImg?.getAttribute('alt'),
          footerImgNaturalW: footerImg?.naturalWidth,
          footerImgNaturalH: footerImg?.naturalHeight,
          footerImgRenderedW: fRect ? Math.round(fRect.width) : 0,
          footerImgRenderedH: fRect ? Math.round(fRect.height) : 0,
          footerTextBesideLogo: footerText
        };
      })()
    `);

    console.log('   Header Logo Src:', auditData.headerImgSrc);
    console.log('   Header Logo Alt:', auditData.headerImgAlt);
    console.log(`   Header Logo Natural: ${auditData.headerImgNaturalW}x${auditData.headerImgNaturalH}`);
    console.log(`   Header Logo Rendered: ${auditData.headerImgRenderedW}x${auditData.headerImgRenderedH}px`);
    console.log('   Header Text Beside Logo:', auditData.headerTextBesideLogo ? `FAIL ("${auditData.headerTextBesideLogo}")` : 'PASS (no separate text)');
    console.log('   Header Link Href:', auditData.headerHref);

    console.log('   Footer Logo Src:', auditData.footerImgSrc);
    console.log('   Footer Logo Alt:', auditData.footerImgAlt);
    console.log(`   Footer Logo Natural: ${auditData.footerImgNaturalW}x${auditData.footerImgNaturalH}`);
    console.log(`   Footer Logo Rendered: ${auditData.footerImgRenderedW}x${auditData.footerImgRenderedH}px`);
    console.log('   Footer Text Beside Logo:', auditData.footerTextBesideLogo ? `FAIL ("${auditData.footerTextBesideLogo}")` : 'PASS (no separate text)');
    console.log('   Footer Link Href:', auditData.footerHref);

    assert.ok(auditData.hasHeaderLink, 'Header logo link must exist');
    assert.strictEqual(auditData.headerHref, '/', 'Header logo must link to /');
    assert.strictEqual(auditData.headerImgAlt, 'FixMyFile', 'Header logo alt must be "FixMyFile"');
    assert.strictEqual(auditData.headerImgNaturalW, 784, 'Header logo must use the 784x318 logo.png asset');
    assert.strictEqual(auditData.headerImgNaturalH, 318, 'Header logo must use the 784x318 logo.png asset');
    assert.strictEqual(auditData.headerTextBesideLogo, '', 'Header must have zero separate text beside logo');

    assert.ok(auditData.hasFooterLink, 'Footer logo link must exist');
    assert.strictEqual(auditData.footerHref, '/', 'Footer logo must link to /');
    assert.strictEqual(auditData.footerImgAlt, 'FixMyFile', 'Footer logo alt must be "FixMyFile"');
    assert.strictEqual(auditData.footerImgNaturalW, 784, 'Footer logo must use the 784x318 logo.png asset');
    assert.strictEqual(auditData.footerImgNaturalH, 318, 'Footer logo must use the 784x318 logo.png asset');
    assert.strictEqual(auditData.footerTextBesideLogo, '', 'Footer must have zero separate text beside logo');

    console.log('   ✓ Logo branding structure verified.\n');

    // 2. Multi-viewport testing
    console.log('2. Testing layout, rendering and horizontal overflow across 6 viewports...');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await new Promise((r) => setTimeout(r, 200));

      const vpMetrics = await evaluate(`
        (() => {
          const docW = document.documentElement.scrollWidth;
          const winW = window.innerWidth;
          const hasOverflow = docW > winW;

          const hImg = document.querySelector('.site-header .brand-logo-img');
          const fImg = document.querySelector('.site-footer .footer-logo-img');
          const hRect = hImg?.getBoundingClientRect();
          const fRect = fImg?.getBoundingClientRect();

          return {
            hasOverflow,
            docW,
            winW,
            hW: hRect ? Math.round(hRect.width) : 0,
            hH: hRect ? Math.round(hRect.height) : 0,
            fW: fRect ? Math.round(fRect.width) : 0,
            fH: fRect ? Math.round(fRect.height) : 0
          };
        })()
      `);

      const status = vpMetrics.hasOverflow ? `FAIL (doc: ${vpMetrics.docW}px, win: ${vpMetrics.winW}px)` : 'PASS';
      console.log(`   ${vp.name.padEnd(20)} : Overflow = ${status} | Header Logo: ${vpMetrics.hW}x${vpMetrics.hH}px | Footer Logo: ${vpMetrics.fW}x${vpMetrics.fH}px`);
      assert.ok(!vpMetrics.hasOverflow, `Horizontal overflow detected at ${vp.name}`);
      assert.ok(vpMetrics.hW >= 95 && vpMetrics.hW <= 130, `Header logo width in expected range: got ${vpMetrics.hW}px`);
      assert.ok(vpMetrics.fW >= 110 && vpMetrics.fW <= 155, `Footer logo width in expected range: got ${vpMetrics.fW}px`);
    }

    console.log('\n3. Checking for Console Errors / Runtime Exceptions...');
    console.log('   Errors recorded:', consoleErrors.length);
    assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, got ${consoleErrors.length}`);

    console.log('\n=== ALL CHROME CDP CHECKS PASSED FOR LOGO BRANDING ===');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

runChromeAudit().catch((err) => {
  console.error('\n❌ Chrome Audit Failed:', err);
  process.exit(1);
});
