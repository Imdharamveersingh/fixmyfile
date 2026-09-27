import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9388;
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { width: 375, height: 844, name: '375x844 (Mobile)' },
  { width: 390, height: 844, name: '390x844 (Mobile)' },
  { width: 768, height: 1024, name: '768x1024 (Tablet)' },
  { width: 1024, height: 768, name: '1024x768 (Small Desktop)' },
  { width: 1280, height: 800, name: '1280x800 (Desktop)' },
  { width: 1440, height: 900, name: '1440x900 (Large Desktop)' }
];

async function run() {
  console.log('=== FIXMYFILE: HERO & FOOTER BACKGROUND REAL CHROME / CDP VERIFICATION ===\n');

  const chrome = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${CDP_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-extensions',
      '--user-data-dir=C:\\temp\\chrome-qa-bg-' + Date.now(),
      'about:blank'
    ],
    { stdio: 'ignore' }
  );

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http
            .get(`http://127.0.0.1:${CDP_PORT}/json/list`, (res) => {
              let d = '';
              res.on('data', (c) => (d += c));
              res.on('end', () => resolve(JSON.parse(d)));
            })
            .on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Chrome CDP not available on port ${CDP_PORT}`);
    }

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let reqId = 1;
    const callbacks = new Map();
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    const consoleErrors = [];
    const runtimeExceptions = [];
    const networkRequests = [];
    const networkResponses = [];
    const failedRequests = [];

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const cb = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) cb.reject(new Error(msg.error.message));
        else cb.resolve(msg.result);
      }

      if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          const txt = msg.params.args.map((a) => a.value || a.description || '').join(' ');
          consoleErrors.push(txt);
        }
      }

      if (msg.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(msg.params.exceptionDetails?.text || 'Unknown exception');
      }

      if (msg.method === 'Network.requestWillBeSent') {
        networkRequests.push({
          url: msg.params.request.url,
          requestId: msg.params.requestId
        });
      }

      if (msg.method === 'Network.responseReceived') {
        networkResponses.push({
          url: msg.params.response.url,
          status: msg.params.response.status,
          mimeType: msg.params.response.mimeType,
          requestId: msg.params.requestId
        });
      }

      if (msg.method === 'Network.loadingFailed') {
        if (!msg.params?.canceled) {
          failedRequests.push({
            requestId: msg.params.requestId,
            errorText: msg.params.errorText
          });
        }
      }
    };

    await send('Network.enable');
    await send('Page.enable');
    await send('Runtime.enable');

    console.log(`[CDP] Navigating to ${BASE_URL}...`);
    await send('Page.navigate', { url: BASE_URL });
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      const res = await send('Runtime.evaluate', {
        expression: '!!document.querySelector(".hero-section")',
        returnByValue: true
      });
      if (res?.result?.value) break;
    }

    // Verify Hero background element
    const heroBgCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const hero = document.querySelector('.hero-section');
        const heroBg = document.querySelector('.hero-background-art');
        const floatingLayer = document.querySelector('.hero-floating-icons');
        const title = document.querySelector('.hero-title');
        const desc = document.querySelector('.hero-description');
        const ctaExplore = document.querySelector('#hero-explore-tools');
        const ctaBrowse = document.querySelector('#hero-browse-categories');
        const footer = document.querySelector('.site-footer');
        const footerBg = document.querySelector('.footer-background-art');

        const heroBgStyle = heroBg ? window.getComputedStyle(heroBg) : null;
        const footerBgStyle = footerBg ? window.getComputedStyle(footerBg) : null;

        return {
          heroExists: !!hero,
          heroBgExists: !!heroBg,
          heroBgImage: heroBgStyle?.backgroundImage,
          heroBgPosition: heroBgStyle?.position,
          heroBgPointerEvents: heroBgStyle?.pointerEvents,
          heroBgZIndex: heroBgStyle?.zIndex,
          floatingLayerExists: !!floatingLayer,
          floatingPointerEvents: floatingLayer ? window.getComputedStyle(floatingLayer).pointerEvents : null,
          titleText: title?.innerText.trim(),
          descText: desc?.innerText.trim(),
          ctaExploreHref: ctaExplore?.getAttribute('href'),
          ctaBrowseHref: ctaBrowse?.getAttribute('href'),
          footerExists: !!footer,
          footerBgExists: !!footerBg,
          footerBgImage: footerBgStyle?.backgroundImage,
          footerBgOpacity: footerBgStyle?.opacity,
          footerBgPointerEvents: footerBgStyle?.pointerEvents
        };
      })()`,
      returnByValue: true
    });

    const val = heroBgCheck.result.value;
    console.log('[Hero Verification]');
    console.log(' - Hero exists:', val.heroExists ? 'PASS' : 'FAIL');
    console.log(' - Hero background art layer exists:', val.heroBgExists ? 'PASS' : 'FAIL');
    console.log(' - Hero background image:', val.heroBgImage);
    console.log(' - Hero background position:', val.heroBgPosition);
    console.log(' - Hero background pointer-events:', val.heroBgPointerEvents);
    console.log(' - Floating icons layer exists:', val.floatingLayerExists ? 'PASS' : 'FAIL');
    console.log(' - Floating layer pointer-events:', val.floatingPointerEvents);
    console.log(' - Hero title:', val.titleText);
    console.log(' - Hero description:', val.descText);
    console.log(' - CTA Explore Tools href:', val.ctaExploreHref);
    console.log(' - CTA Browse Categories href:', val.ctaBrowseHref);

    console.log('\n[Footer Verification]');
    console.log(' - Footer exists:', val.footerExists ? 'PASS' : 'FAIL');
    console.log(' - Footer background art layer exists:', val.footerBgExists ? 'PASS' : 'FAIL');
    console.log(' - Footer background image:', val.footerBgImage);
    console.log(' - Footer background opacity:', val.footerBgOpacity);
    console.log(' - Footer background pointer-events:', val.footerBgPointerEvents);

    assert.ok(val.heroExists, 'Hero section must exist');
    assert.ok(val.heroBgExists, 'Hero background art must exist');
    assert.ok(val.heroBgImage.includes('hero-bg-abstract'), 'Hero background must reference hero-bg-abstract');
    assert.equal(val.heroBgPosition, 'absolute', 'Hero background art must be position: absolute');
    assert.equal(val.heroBgPointerEvents, 'none', 'Hero background art must be pointer-events: none');
    assert.ok(val.floatingLayerExists, 'Floating icons layer must exist');
    assert.equal(val.floatingPointerEvents, 'none', 'Floating icons layer must be pointer-events: none');

    assert.ok(val.footerExists, 'Footer must exist');
    assert.ok(val.footerBgExists, 'Footer background art must exist');
    assert.ok(val.footerBgImage.includes('hero-bg-abstract'), 'Footer background must reference hero-bg-abstract');
    assert.equal(val.footerBgPointerEvents, 'none', 'Footer background art must be pointer-events: none');
    const footerOpacityNum = parseFloat(val.footerBgOpacity);
    assert.ok(footerOpacityNum >= 0.06 && footerOpacityNum <= 0.12, `Footer background opacity (${footerOpacityNum}) must be between 0.06 and 0.12`);

    // Verify 49 tools and 4 categories preserved on page
    const contentCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const categoryCards = document.querySelectorAll('.category-discovery-card');
        const toolCards = document.querySelectorAll('.tool-card');
        const sectionHeadings = document.querySelectorAll('.tool-section-title-row');
        return {
          categoryCardsCount: categoryCards.length,
          toolCardsCount: toolCards.length,
          sectionHeadingsCount: sectionHeadings.length
        };
      })()`,
      returnByValue: true
    });
    console.log('\n[Content Inventory Check]');
    console.log(' - Category cards rendered:', contentCheck.result.value.categoryCardsCount);
    console.log(' - Active tool cards rendered:', contentCheck.result.value.toolCardsCount);
    console.log(' - Section headings rendered:', contentCheck.result.value.sectionHeadingsCount);
    assert.equal(contentCheck.result.value.categoryCardsCount, 4, 'Must render exactly 4 category cards');
    assert.equal(contentCheck.result.value.toolCardsCount, 49, 'Must render exactly 49 tool cards');
    assert.equal(contentCheck.result.value.sectionHeadingsCount, 4, 'Must render exactly 4 category headings');

    // Test responsive behavior across all 6 viewports
    console.log('\n[Responsive Viewports & Overlap QA]');
    let responsivePassedCount = 0;

    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width <= 768
      });
      await new Promise((r) => setTimeout(r, 400));

      const vpResult = await send('Runtime.evaluate', {
        expression: `(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const hasHorizontalOverflow = docWidth > winWidth;

          const title = document.querySelector('.hero-title');
          const desc = document.querySelector('.hero-description');
          const actions = document.querySelector('.hero-actions');

          const titleRect = title ? title.getBoundingClientRect() : null;
          const descRect = desc ? desc.getBoundingClientRect() : null;
          const actionsRect = actions ? actions.getBoundingClientRect() : null;

          const icons = Array.from(document.querySelectorAll('.hero-floating-icon'));
          const visibleIcons = icons.filter((el) => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          });

          // Check for collision between any visible floating icon and important text
          let overlaps = [];
          for (const icon of visibleIcons) {
            const r = icon.getBoundingClientRect();
            function intersect(r1, r2) {
              if (!r1 || !r2) return false;
              return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
            }
            if (intersect(r, titleRect)) overlaps.push({ target: 'title', icon: icon.className });
            if (intersect(r, descRect)) overlaps.push({ target: 'desc', icon: icon.className });
            if (intersect(r, actionsRect)) overlaps.push({ target: 'actions', icon: icon.className });
          }

          return {
            docWidth,
            winWidth,
            hasHorizontalOverflow,
            visibleIconsCount: visibleIcons.length,
            overlapsCount: overlaps.length,
            overlaps
          };
        })()`,
        returnByValue: true
      });

      const vr = vpResult.result.value;
      console.log(` - Viewport ${vp.name}:`);
      console.log(`     Horizontal scroll width: ${vr.docWidth}px vs window: ${vr.winWidth}px (Overflow: ${vr.hasHorizontalOverflow})`);
      console.log(`     Visible floating icons: ${vr.visibleIconsCount}`);
      console.log(`     Text/CTA overlaps: ${vr.overlapsCount}`);
      if (vr.overlapsCount > 0) {
        console.log(`     Overlap details:`, JSON.stringify(vr.overlaps));
      }

      assert.equal(vr.hasHorizontalOverflow, false, `No horizontal overflow at ${vp.name}`);
      assert.equal(vr.overlapsCount, 0, `No text/CTA overlaps at ${vp.name}`);

      if (vp.width >= 1024) {
        assert.equal(vr.visibleIconsCount, 9, `Desktop ${vp.name} should display all 9 icons`);
      } else if (vp.width === 768) {
        assert.equal(vr.visibleIconsCount, 6, `Tablet ${vp.name} should display 6 icons`);
      } else if (vp.width <= 600) {
        assert.equal(vr.visibleIconsCount, 4, `Mobile ${vp.name} should display 4 icons`);
      }

      responsivePassedCount++;
    }

    console.log(`\nResponsive QA: ${responsivePassedCount}/${VIEWPORTS.length} viewports PASS`);

    // Verify Asset loading & Network
    console.log('\n[Network & Asset Verification]');
    const heroBgRequests = networkRequests.filter((r) => r.url.includes('hero-bg-abstract'));
    const heroBgResponses = networkResponses.filter((r) => r.url.includes('hero-bg-abstract'));
    const svgIconResponses = networkResponses.filter((r) => r.url.includes('fixmyfile-49-svg-icons'));
    const externalRequests = networkRequests.filter((r) => !r.url.startsWith('http://localhost') && !r.url.startsWith('http://127.0.0.1'));

    console.log(' - Hero/Footer background asset requests:', heroBgRequests.length);
    console.log(' - Hero/Footer background asset responses:', heroBgResponses.length);
    if (heroBgResponses.length > 0) {
      console.log(' - Background asset response status:', heroBgResponses[0].status);
      assert.equal(heroBgResponses[0].status, 200, 'Background asset must return HTTP 200');
    }
    console.log(' - Floating SVG icon responses count:', svgIconResponses.length);
    console.log(' - External network requests count:', externalRequests.length);
    console.log(' - Broken asset requests count:', failedRequests.length);
    console.log(' - Console errors count:', consoleErrors.length);
    console.log(' - Runtime exceptions count:', runtimeExceptions.length);

    // Capture Screenshots for visual inspection
    const scratchDir = 'C:\\Users\\udte prinde\\.gemini\\antigravity-ide\\brain\\1ed46b49-7ed1-4f15-906e-7796e9d48e7c\\scratch';
    try {
      import('node:fs').then(fsModule => {
        const fs = fsModule.default;
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
      });
    } catch {}

    // Desktop Screenshot
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await new Promise((r) => setTimeout(r, 400));
    const desktopHeroShot = await send('Page.captureScreenshot', { format: 'png' });
    const fs = await import('node:fs');
    fs.default.writeFileSync(`${scratchDir}\\desktop_hero_background.png`, Buffer.from(desktopHeroShot.data, 'base64'));

    // Mobile Screenshot
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await new Promise((r) => setTimeout(r, 400));
    const mobileHeroShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.default.writeFileSync(`${scratchDir}\\mobile_hero_background.png`, Buffer.from(mobileHeroShot.data, 'base64'));

    console.log(' - Saved visual QA screenshots to scratch directory');
    console.log('\n=== REAL CHROME/CDP VERIFICATION COMPLETED: ALL PASS ===\n');
  } finally {
    chrome.kill('SIGKILL');
  }
}

run().catch((err) => {
  console.error('CDP verification failed:', err);
  process.exit(1);
});
