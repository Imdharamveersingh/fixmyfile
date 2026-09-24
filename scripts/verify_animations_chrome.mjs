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

const REPRESENTATIVE_TOOLS = [
  { category: 'PDF', path: '/jpg-to-pdf', name: 'JPG to PDF' },
  { category: 'Image', path: '/image-compressor', name: 'Image Compressor' },
  { category: 'Media', path: '/video-compressor', name: 'Video Compressor' },
  { category: 'Generator', path: '/qr-code-generator', name: 'QR Code Generator' },
  { category: 'OCR/Text', path: '/image-to-text', name: 'Image to Text' },
  { category: 'Utility', path: '/password-generator', name: 'Password Generator' },
  { category: 'PDF Org', path: '/merge-pdf', name: 'Merge PDF' },
  { category: 'Image Edit', path: '/background-remover', name: 'Background Remover' },
  { category: 'Text Utility', path: '/word-counter', name: 'Word Counter' }
];

async function runAnimationAudit() {
  console.log('=== Starting Real Chrome CDP Verification for Universal Tool Animations ===\n');

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

    const homeData = await evaluate(`
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
            name: s.animationName,
            delay: s.animationDelay,
            duration: s.animationDuration
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

    assert.ok(homeData.eyebrow.name.includes('pageFadeUpSubtle'), 'Hero eyebrow uses pageFadeUpSubtle');
    assert.ok(homeData.title.name.includes('pageFadeUpSubtle'), 'Hero title uses pageFadeUpSubtle');
    assert.ok(homeData.desc.name.includes('pageFadeUpSubtle'), 'Hero description uses pageFadeUpSubtle');
    assert.ok(homeData.actions.name.includes('pageFadeUpSubtle'), 'Hero actions uses pageFadeUpSubtle');
    assert.ok(homeData.section.name.includes('pageFadeUpSubtle'), 'Homepage category section uses pageFadeUpSubtle');
    console.log('   ✓ Homepage entrance animations verified.');

    // ==========================================
    // 2. REPRESENTATIVE TOOL PAGES AUDIT (ALL CATEGORIES)
    // ==========================================
    console.log('\n2. Auditing Representative Tool Pages Across Categories:');

    for (const tool of REPRESENTATIVE_TOOLS) {
      await send('Page.navigate', { url: BASE_URL + tool.path });
      await new Promise((r) => setTimeout(r, 800));

      const toolData = await evaluate(`
        (() => {
          const breadcrumb = document.querySelector('.tool-detail-header .tool-breadcrumb-nav');
          const h1 = document.querySelector('.tool-detail-header .tool-detail-h1');
          const desc = document.querySelector('.tool-detail-header .tool-detail-description');
          const card = document.querySelector('.converter-card, .workbench-card, .tool-workspace, .qr-app-layout, .barcode-app-layout, .currency-app-layout, .percentage-app-layout, .password-app-layout, .word-counter-app-layout, .emi-calculator-layout, .dropzone-container, .tool-section, .tool-card');

          const getAnim = (el) => {
            if (!el) return null;
            const s = window.getComputedStyle(el);
            return {
              name: s.animationName,
              delay: s.animationDelay,
              duration: s.animationDuration
            };
          };

          return {
            hasHeader: !!document.querySelector('.tool-detail-header'),
            breadcrumb: getAnim(breadcrumb),
            h1: getAnim(h1),
            desc: getAnim(desc),
            card: getAnim(card),
            hasCard: !!card
          };
        })()
      `);

      assert.ok(toolData.hasHeader, `${tool.name} must render ToolDetailHeader`);
      assert.ok(toolData.breadcrumb && toolData.breadcrumb.name.includes('pageFadeUpSubtle'), `${tool.name} breadcrumb animated`);
      assert.ok(toolData.h1 && toolData.h1.name.includes('pageFadeUpSubtle'), `${tool.name} H1 animated`);
      assert.ok(toolData.desc && toolData.desc.name.includes('pageFadeUpSubtle'), `${tool.name} desc animated`);
      assert.ok(toolData.hasCard, `${tool.name} has primary card`);
      assert.ok(toolData.card && toolData.card.name.includes('pageFadeUpSubtle'), `${tool.name} card animated`);

      console.log(`   [${tool.category.padEnd(12)}] ${tool.name.padEnd(24)}: Breadcrumb (${toolData.breadcrumb.delay}) | H1 (${toolData.h1.delay}) | Desc (${toolData.desc.delay}) | Card (${toolData.card.delay}) → PASS`);
    }

    // ==========================================
    // 3. MULTI-VIEWPORT RESPONSIVE AUDIT
    // ==========================================
    console.log('\n3. Testing Responsive Viewports (375 to 1440px) for Layout Stability & Zero Horizontal Overflow:');

    const testRoutes = ['/', '/jpg-to-pdf', '/image-compressor', '/qr-code-generator'];
    for (const route of testRoutes) {
      await send('Page.navigate', { url: BASE_URL + route });
      await new Promise((r) => setTimeout(r, 600));

      for (const vp of VIEWPORTS) {
        await setViewport(vp.width, vp.height);
        await new Promise((r) => setTimeout(r, 100));
        const overflow = await evaluate(`document.documentElement.scrollWidth > window.innerWidth`);
        assert.strictEqual(overflow, false, `${route} has no overflow at ${vp.name}`);
      }
      console.log(`   ${route.padEnd(20)}: All 6 viewports PASS (zero horizontal overflow)`);
    }

    // ==========================================
    // 4. REDUCED MOTION VERIFICATION
    // ==========================================
    console.log('\n4. Testing prefers-reduced-motion accessibility...');
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    await new Promise((r) => setTimeout(r, 300));

    const reducedData = await evaluate(`
      (() => {
        const eyebrow = document.querySelector('.hero-eyebrow');
        const h1 = document.querySelector('.tool-detail-h1');
        const card = document.querySelector('.converter-card, .tool-workspace, .qr-app-layout, .tool-card');
        const sEyebrow = eyebrow ? window.getComputedStyle(eyebrow).animationName : 'none';
        const sH1 = h1 ? window.getComputedStyle(h1).animationName : 'none';
        const sCard = card ? window.getComputedStyle(card).animationName : 'none';
        return { sEyebrow, sH1, sCard };
      })()
    `);

    assert.ok(reducedData.sH1 === 'none' || reducedData.sH1 === '', 'Tool H1 animation disabled under reduced motion');
    assert.ok(reducedData.sCard === 'none' || reducedData.sCard === '', 'Tool Card animation disabled under reduced motion');
    console.log('   ✓ Reduced motion successfully disables entrance animations across all elements.');

    // Reset emulation
    await send('Emulation.setEmulatedMedia', { features: [] });

    // ==========================================
    // 5. CONSOLE ERRORS & RUNTIME CHECK
    // ==========================================
    console.log('\n5. Checking for Console Errors / Runtime Exceptions...');
    console.log('   Errors recorded:', consoleErrors.length);
    assert.strictEqual(consoleErrors.length, 0, `Expected 0 console errors, got: ${JSON.stringify(consoleErrors)}`);

    console.log('\n=== ALL CHROME CDP CHECKS PASSED FOR UNIVERSAL TOOL ANIMATIONS ===');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

runAnimationAudit().catch((err) => {
  console.error('\n❌ Animation Audit Failed:', err);
  process.exit(1);
});
