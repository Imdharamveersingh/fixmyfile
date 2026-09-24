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

async function runAnimationAudit() {
  console.log('=== Starting Real Chrome CDP Verification for Page Animations ===\n');

  const port = 9360;
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

    // ==========================================
    // 1. HOMEPAGE AUDIT
    // ==========================================
    console.log('1. Auditing Homepage ("/") Entrance Animations...');
    await setViewport(1280, 800);
    await send('Page.navigate', { url: BASE_URL + '/' });
    await new Promise((r) => setTimeout(r, 1200));

    const homeAnimationData = await evaluate(`
      (() => {
        const eyebrow = document.querySelector('.hero-eyebrow');
        const title = document.querySelector('.hero-title');
        const desc = document.querySelector('.hero-description');
        const actions = document.querySelector('.hero-actions');
        const section = document.querySelector('.tools-section');

        const getAnim = (el) => {
          if (!el) return null;
          const s = window.getComputedStyle(el);
          return {
            animationName: s.animationName,
            animationDuration: s.animationDuration,
            animationDelay: s.animationDelay,
            animationTimingFunction: s.animationTimingFunction,
            animationFillMode: s.animationFillMode,
            opacity: s.opacity,
            transform: s.transform
          };
        };

        return {
          eyebrow: getAnim(eyebrow),
          title: getAnim(title),
          desc: getAnim(desc),
          actions: getAnim(actions),
          section: getAnim(section)
        };
      })()
    `);

    console.log('   Hero Eyebrow Anim:', homeAnimationData.eyebrow?.animationName, 'duration:', homeAnimationData.eyebrow?.animationDuration, 'delay:', homeAnimationData.eyebrow?.animationDelay);
    console.log('   Hero Title Anim:  ', homeAnimationData.title?.animationName, 'duration:', homeAnimationData.title?.animationDuration, 'delay:', homeAnimationData.title?.animationDelay);
    console.log('   Hero Desc Anim:   ', homeAnimationData.desc?.animationName, 'duration:', homeAnimationData.desc?.animationDuration, 'delay:', homeAnimationData.desc?.animationDelay);
    console.log('   Hero Actions Anim:', homeAnimationData.actions?.animationName, 'duration:', homeAnimationData.actions?.animationDuration, 'delay:', homeAnimationData.actions?.animationDelay);
    console.log('   Tools Section Anim:', homeAnimationData.section?.animationName, 'duration:', homeAnimationData.section?.animationDuration, 'delay:', homeAnimationData.section?.animationDelay);

    assert.ok(homeAnimationData.eyebrow.animationName.includes('pageFadeUpSubtle'), 'Hero eyebrow uses pageFadeUpSubtle');
    assert.ok(homeAnimationData.title.animationName.includes('pageFadeUpSubtle'), 'Hero title uses pageFadeUpSubtle');
    assert.ok(homeAnimationData.desc.animationName.includes('pageFadeUpSubtle'), 'Hero description uses pageFadeUpSubtle');
    assert.ok(homeAnimationData.actions.animationName.includes('pageFadeUpSubtle'), 'Hero actions uses pageFadeUpSubtle');
    assert.ok(homeAnimationData.section.animationName.includes('pageFadeUpSubtle'), 'Homepage category section uses pageFadeUpSubtle');

    console.log('   ✓ Homepage animation properties verified.');

    // Multi-viewport check for Homepage
    console.log('   Testing Homepage across 6 viewports for layout stability & zero horizontal overflow:');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await new Promise((r) => setTimeout(r, 150));
      const overflow = await evaluate(`document.documentElement.scrollWidth > window.innerWidth`);
      assert.strictEqual(overflow, false, `Homepage has no overflow at ${vp.name}`);
      console.log(`     - ${vp.name.padEnd(20)} : Overflow = PASS`);
    }

    // ==========================================
    // 2. TOOL PAGE AUDIT (/jpg-to-pdf)
    // ==========================================
    console.log('\n2. Auditing Tool Page ("/jpg-to-pdf") Entrance Animations...');
    await setViewport(1280, 800);
    await send('Page.navigate', { url: BASE_URL + '/jpg-to-pdf' });
    await new Promise((r) => setTimeout(r, 1200));

    const toolAnimationData = await evaluate(`
      (() => {
        const breadcrumb = document.querySelector('.jpg-to-pdf-page .tool-breadcrumb-nav');
        const h1 = document.querySelector('.jpg-to-pdf-page .tool-detail-h1');
        const desc = document.querySelector('.jpg-to-pdf-page .tool-detail-description');
        const card = document.querySelector('.jpg-to-pdf-page .converter-card');

        const getAnim = (el) => {
          if (!el) return null;
          const s = window.getComputedStyle(el);
          return {
            animationName: s.animationName,
            animationDuration: s.animationDuration,
            animationDelay: s.animationDelay,
            animationTimingFunction: s.animationTimingFunction,
            animationFillMode: s.animationFillMode,
            opacity: s.opacity,
            transform: s.transform
          };
        };

        return {
          breadcrumb: getAnim(breadcrumb),
          h1: getAnim(h1),
          desc: getAnim(desc),
          card: getAnim(card),
          hasDropzone: !!document.querySelector('.dropzone')
        };
      })()
    `);

    console.log('   Breadcrumb Anim:', toolAnimationData.breadcrumb?.animationName, 'delay:', toolAnimationData.breadcrumb?.animationDelay);
    console.log('   Tool H1 Anim:   ', toolAnimationData.h1?.animationName, 'delay:', toolAnimationData.h1?.animationDelay);
    console.log('   Tool Desc Anim: ', toolAnimationData.desc?.animationName, 'delay:', toolAnimationData.desc?.animationDelay);
    console.log('   Tool Card Anim: ', toolAnimationData.card?.animationName, 'delay:', toolAnimationData.card?.animationDelay);

    assert.ok(toolAnimationData.breadcrumb.animationName.includes('pageFadeUpSubtle'), 'Breadcrumb uses pageFadeUpSubtle');
    assert.ok(toolAnimationData.h1.animationName.includes('pageFadeUpSubtle'), 'H1 uses pageFadeUpSubtle');
    assert.ok(toolAnimationData.desc.animationName.includes('pageFadeUpSubtle'), 'Description uses pageFadeUpSubtle');
    assert.ok(toolAnimationData.card.animationName.includes('pageFadeUpSubtle'), 'Converter card uses pageFadeUpSubtle');
    assert.strictEqual(toolAnimationData.hasDropzone, true, 'Dropzone exists and is stable');

    console.log('   ✓ /jpg-to-pdf animation sequence verified.');

    // Multi-viewport check for /jpg-to-pdf
    console.log('   Testing /jpg-to-pdf across 6 viewports for layout stability & zero horizontal overflow:');
    for (const vp of VIEWPORTS) {
      await setViewport(vp.width, vp.height);
      await new Promise((r) => setTimeout(r, 150));
      const overflow = await evaluate(`document.documentElement.scrollWidth > window.innerWidth`);
      assert.strictEqual(overflow, false, `/jpg-to-pdf has no overflow at ${vp.name}`);
      console.log(`     - ${vp.name.padEnd(20)} : Overflow = PASS`);
    }

    // ==========================================
    // 3. REDUCED MOTION VERIFICATION
    // ==========================================
    console.log('\n3. Testing prefers-reduced-motion accessibility...');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    await new Promise((r) => setTimeout(r, 300));

    const reducedMotionData = await evaluate(`
      (() => {
        const eyebrow = document.querySelector('.hero-eyebrow');
        const card = document.querySelector('.converter-card');
        const sEyebrow = eyebrow ? window.getComputedStyle(eyebrow).animationName : 'none';
        const sCard = card ? window.getComputedStyle(card).animationName : 'none';
        return { sEyebrow, sCard };
      })()
    `);

    console.log('   Reduced motion eyebrow animationName:', reducedMotionData.sEyebrow);
    console.log('   Reduced motion card animationName:   ', reducedMotionData.sCard);
    assert.ok(reducedMotionData.sCard === 'none' || reducedMotionData.sCard === '', 'Animations disabled under reduced motion');
    console.log('   ✓ Reduced motion successfully disables entrance animations.');

    // Reset emulation
    await send('Emulation.setEmulatedMedia', { features: [] });

    // ==========================================
    // 4. CONSOLE ERRORS & RUNTIME CHECK
    // ==========================================
    console.log('\n4. Checking for Console Errors / Runtime Exceptions...');
    console.log('   Errors recorded:', consoleErrors.length);
    assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, got: ${JSON.stringify(consoleErrors)}`);

    console.log('\n=== ALL CHROME CDP CHECKS PASSED FOR LIGHTWEIGHT ANIMATIONS ===');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

runAnimationAudit().catch((err) => {
  console.error('\n❌ Animation Audit Failed:', err);
  process.exit(1);
});
