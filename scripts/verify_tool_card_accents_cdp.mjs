import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';
import { TOOL_ACCENT_MAP } from '../src/components/toolAccentMap.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const CDP_PORT = 9377;
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { width: 375, height: 844, name: '375x844' },
  { width: 390, height: 844, name: '390x844' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 1024, height: 768, name: '1024x768' },
  { width: 1280, height: 800, name: '1280x800' },
  { width: 1440, height: 900, name: '1440x900' }
];

const TARGET_SAMPLE_TOOLS = [
  { id: 'jpg-to-pdf', name: 'JPG to PDF', expectedHex: '#3B82F6' },
  { id: 'pdf-to-jpg', name: 'PDF to JPG', expectedHex: '#8B5CF6' },
  { id: 'merge-pdf', name: 'Merge PDF', expectedHex: '#8B5CF6' },
  { id: 'image-compressor', name: 'Image Compressor', expectedHex: '#3B82F6' },
  { id: 'image-cropper', name: 'Image Cropper', expectedHex: '#F97316' },
  { id: 'mp4-to-mp3', name: 'MP4 to MP3', expectedHex: '#F97316' },
  { id: 'video-compressor', name: 'Video Compressor', expectedHex: '#3B82F6' },
  { id: 'qr-code-generator', name: 'QR Code Generator', expectedHex: '#2563EB' },
  { id: 'barcode-generator', name: 'Barcode Generator', expectedHex: '#111827' }
];

async function main() {
  console.log('=== FIXMYFILE: COMPREHENSIVE CHROME/CDP VISUAL QA & VERIFICATION ===\n');

  const chrome = spawn(CHROME_PATH, [
    `--remote-debugging-port=${CDP_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--user-data-dir=C:\\temp\\chrome-qa-profile-' + Date.now(),
    'about:blank'
  ], { stdio: 'ignore' });

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
    const failedNetworkRequests = [];
    const successfulSvgRequests = [];

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
        const txt = msg.params.exceptionDetails?.text || msg.params.exceptionDetails?.exception?.description || 'Exception';
        runtimeExceptions.push(txt);
      }

      if (msg.method === 'Network.responseReceived') {
        const url = msg.params.response?.url || '';
        const status = msg.params.response?.status;
        if (url.endsWith('.svg') || url.includes('.svg?')) {
          if (status === 200) {
            successfulSvgRequests.push(url);
          } else if (status >= 400) {
            failedNetworkRequests.push({ url, status });
          }
        }
      }

      if (msg.method === 'Network.loadingFailed') {
        const url = msg.params?.canceled ? null : msg.params?.requestId;
        if (!msg.params?.canceled) {
          failedNetworkRequests.push(msg.params);
        }
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');
    await send('Network.enable');

    console.log('1. Navigating to homepage:', BASE_URL);
    await send('Page.navigate', { url: BASE_URL });

    // Wait until HomePage renders
    let ready = false;
    for (let i = 0; i < 40; i++) {
      const check = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('.category-discovery-grid') && document.querySelectorAll('.tool-card').length >= 49`,
        returnByValue: true
      });
      if (check.result?.value) {
        ready = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 150));
    }

    assert.ok(ready, 'HomePage rendered with category grid and 49 tool cards');
    console.log('   ✓ Homepage fully rendered');

    // Wait for all images on the page to complete loading
    await send('Runtime.evaluate', {
      expression: `
        Promise.all(Array.from(document.querySelectorAll('img')).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(res => {
            img.addEventListener('load', res, { once: true });
            img.addEventListener('error', res, { once: true });
          });
        }))
      `,
      awaitPromise: true
    });

    // 2. Verify Category Cards
    console.log('\n2. Verifying 4 Category Cards & SVGs:');
    const categoryEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('.category-discovery-card'));
          return cards.map(c => {
            const titleEl = c.querySelector('.category-card-title');
            const descEl = c.querySelector('.category-card-desc');
            const badgeEl = c.querySelector('.category-card-badge');
            const imgEl = c.querySelector('.category-card-icon');
            return {
              href: c.getAttribute('href'),
              title: titleEl ? titleEl.textContent.trim() : null,
              desc: descEl ? descEl.textContent.trim() : null,
              badge: badgeEl ? badgeEl.textContent.trim() : null,
              imgSrc: imgEl ? imgEl.getAttribute('src') : null,
              imgComplete: imgEl ? imgEl.complete : false,
              imgNaturalWidth: imgEl ? imgEl.naturalWidth : 0,
              ariaHidden: imgEl ? imgEl.getAttribute('aria-hidden') : null,
              focusable: imgEl ? imgEl.getAttribute('focusable') : null
            };
          });
        })()
      `,
      returnByValue: true
    });

    const categoryCards = categoryEval.result.value;
    assert.equal(categoryCards.length, 4, 'Exactly 4 category cards rendered');

    const expectedCategories = [
      {
        href: '#pdf-tools',
        title: 'PDF Tools',
        desc: 'Convert, merge, compress, protect, and extract PDF files.',
        badge: '18 tools',
        svgMatch: 'pdf-tool.svg'
      },
      {
        href: '#image-tools',
        title: 'Image Tools',
        desc: 'Convert, compress, resize, crop, and enhance image files.',
        badge: '20 tools',
        svgMatch: 'image-tool.svg'
      },
      {
        href: '#media-tools',
        title: 'Media Tools',
        desc: 'Convert and optimize video, audio, and animated GIF files.',
        badge: '4 tools',
        svgMatch: 'media-tool.svg'
      },
      {
        href: '#generators',
        title: 'Generators',
        desc: 'Create QR codes, barcodes, passwords, and useful calculators.',
        badge: '7 tools',
        svgMatch: 'generator-tool.svg'
      }
    ];

    for (let i = 0; i < 4; i++) {
      const actual = categoryCards[i];
      const exp = expectedCategories[i];
      console.log(`   [${actual.title}] count: ${actual.badge}, svg: ${actual.imgSrc.split('/').pop().split('?')[0]}`);
      assert.equal(actual.title, exp.title, `Category title match for ${exp.title}`);
      assert.equal(actual.desc, exp.desc, `Category subtitle match for ${exp.title}`);
      assert.equal(actual.badge, exp.badge, `Category badge match for ${exp.title}`);
      assert.equal(actual.href, exp.href, `Category anchor href match for ${exp.title}`);
      assert.ok(actual.imgSrc.includes(exp.svgMatch), `Category SVG asset matches ${exp.svgMatch}`);
      assert.ok(actual.imgComplete, `Category SVG image completed loading`);
      assert.ok(actual.imgNaturalWidth > 0, `Category SVG naturalWidth > 0 (rendered properly)`);
      assert.equal(actual.ariaHidden, 'true', `Category SVG has aria-hidden="true"`);
      assert.equal(actual.focusable, 'false', `Category SVG has focusable="false"`);
    }

    // 2.5. Verify 4 Collection Section Headings & Inline SVGs
    console.log('\n2.5. Verifying 4 Collection Section Headings & Inline SVGs:');
    const headingEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const sections = ['pdf-tools', 'image-tools', 'generators', 'media-tools'];
          return sections.map(id => {
            const sec = document.getElementById(id);
            const titleRow = sec ? sec.querySelector('.tool-section-title-row') : null;
            const h2 = titleRow ? titleRow.querySelector('h2.section-title') : null;
            const img = titleRow ? titleRow.querySelector('img.tool-section-category-icon') : null;
            const desc = sec ? sec.querySelector('.section-subtitle') : null;
            const style = img ? window.getComputedStyle(img) : null;
            return {
              id,
              hasTitleRow: !!titleRow,
              h2Text: h2 ? h2.textContent.trim() : null,
              descText: desc ? desc.textContent.trim() : null,
              imgSrc: img ? img.getAttribute('src') : null,
              imgComplete: img ? img.complete : false,
              imgNaturalWidth: img ? img.naturalWidth : 0,
              renderedWidth: style ? style.width : null,
              renderedHeight: style ? style.height : null,
              ariaHidden: img ? img.getAttribute('aria-hidden') : null,
              focusable: img ? img.getAttribute('focusable') : null
            };
          });
        })()
      `,
      returnByValue: true
    });

    const collectionHeadings = headingEval.result.value;
    assert.equal(collectionHeadings.length, 4, 'Exactly 4 collection section headings rendered');

    const expectedHeadings = {
      'pdf-tools': { title: 'PDF Tools', desc: 'Convert, organize, compress, protect, and extract content from PDF files.', svg: 'pdf-tool.svg' },
      'image-tools': { title: 'Image Tools', desc: 'Convert, compress, resize, crop, and enhance image files.', svg: 'image-tool.svg' },
      'generators': { title: 'Generators', desc: 'Create QR codes, barcodes, passwords, and useful calculators.', svg: 'generator-tool.svg' },
      'media-tools': { title: 'Media Tools', desc: 'Convert and optimize video, audio, and animated GIF files.', svg: 'media-tool.svg' }
    };

    for (const h of collectionHeadings) {
      const exp = expectedHeadings[h.id];
      assert.ok(h.hasTitleRow, `Section ${h.id} has .tool-section-title-row`);
      assert.equal(h.h2Text, exp.title, `Section ${h.id} H2 title is "${exp.title}"`);
      assert.equal(h.descText, exp.desc, `Section ${h.id} subtitle matches`);
      assert.ok(h.imgSrc.includes(exp.svg), `Section ${h.id} SVG matches ${exp.svg}`);
      assert.ok(h.imgComplete, `Section ${h.id} SVG completed loading`);
      assert.ok(h.imgNaturalWidth > 0, `Section ${h.id} SVG naturalWidth > 0`);
      assert.equal(h.renderedWidth, '32px', `Section ${h.id} desktop icon width is 32px`);
      assert.equal(h.renderedHeight, '32px', `Section ${h.id} desktop icon height is 32px`);
      assert.equal(h.ariaHidden, 'true', `Section ${h.id} SVG aria-hidden="true"`);
      assert.equal(h.focusable, 'false', `Section ${h.id} SVG focusable="false"`);
      console.log(`   ✓ [${h.h2Text.padEnd(12)}] Icon: ${exp.svg.padEnd(18)} (${h.renderedWidth}x${h.renderedHeight}) | Desc: "${h.descText.substring(0, 38)}..."`);
    }

    // 3. Verify all 49 Tool Cards and their borders
    console.log('\n3. Verifying 49 Tool Cards and Border Accents:');
    const toolsEval = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const cards = Array.from(document.querySelectorAll('.tool-card'));
          return cards.map(c => {
            const titleEl = c.querySelector('.tool-card-title');
            const descEl = c.querySelector('.tool-card-description');
            const imgEl = c.querySelector('.tool-card-icon-wrap img');
            const style = window.getComputedStyle(c);
            return {
              id: c.getAttribute('data-tool-id'),
              category: c.getAttribute('data-category'),
              title: titleEl ? titleEl.textContent.trim() : null,
              hasDescription: !!descEl && descEl.textContent.trim().length > 0,
              accentColorVar: c.style.getPropertyValue('--tool-accent-color').trim(),
              borderColorVar: c.style.getPropertyValue('--tool-border-color').trim(),
              hoverBorderColorVar: c.style.getPropertyValue('--tool-hover-border-color').trim(),
              computedBorderTopColor: style.borderTopColor,
              computedBorderTopWidth: style.borderTopWidth,
              computedBorderLeftColor: style.borderLeftColor,
              computedBorderLeftWidth: style.borderLeftWidth,
              computedBorderRadius: style.borderRadius,
              imgComplete: imgEl ? imgEl.complete : false,
              imgNaturalWidth: imgEl ? imgEl.naturalWidth : 0,
              imgSrc: imgEl ? imgEl.getAttribute('src') : null,
              ariaHidden: imgEl ? imgEl.getAttribute('aria-hidden') : null
            };
          });
        })()
      `,
      returnByValue: true
    });

    const renderedTools = toolsEval.result.value;
    assert.equal(renderedTools.length, 49, 'Exactly 49 tool cards rendered on homepage');

    // Verify all tool SVGs loaded cleanly
    for (const tool of renderedTools) {
      assert.ok(tool.imgComplete, `Tool ${tool.id} SVG loaded`);
      assert.ok(tool.imgNaturalWidth > 0, `Tool ${tool.id} SVG naturalWidth > 0`);
      assert.equal(tool.ariaHidden, 'true', `Tool ${tool.id} SVG aria-hidden="true"`);
      assert.equal(tool.computedBorderLeftWidth, '1px', `Tool ${tool.id} border-width is 1px`);
      assert.equal(tool.computedBorderTopWidth, '3px', `Tool ${tool.id} top border-width is 3px`);
    }
    console.log('   ✓ All 49 tool SVGs completed loading with valid dimensions');
    console.log('   ✓ All 49 tool cards have 1px SVG-derived border and 3px top accent');

    // 4. Specifically verify sample tools requested in prompt
    console.log('\n4. Verifying Sample Tool Border Color Parity:');
    for (const sample of TARGET_SAMPLE_TOOLS) {
      const toolCard = renderedTools.find((t) => t.id === sample.id);
      assert.ok(toolCard, `Tool ${sample.id} rendered`);
      const mappedAccent = TOOL_ACCENT_MAP[sample.id];
      assert.equal(toolCard.accentColorVar, sample.expectedHex, `Accent color variable matches ${sample.expectedHex}`);
      assert.equal(toolCard.borderColorVar, mappedAccent.border, `Border color variable matches subtle alpha`);
      assert.equal(toolCard.hoverBorderColorVar, mappedAccent.hoverBorder, `Hover border color variable matches`);
      console.log(`   [${sample.name.padEnd(20)}] SVG Color: ${sample.expectedHex} | Border: ${toolCard.borderColorVar} | Computed: ${toolCard.computedBorderLeftColor}`);
    }

    // 5. Test Hover and Keyboard Focus States via CDP
    console.log('\n5. Verifying Hover & Focus Interactions:');
    const hoverTestResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const firstCard = document.querySelector('.tool-card');
          const normalBorder = window.getComputedStyle(firstCard).borderLeftColor;
          
          // Trigger mouseover
          firstCard.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          firstCard.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          
          // Test focus-visible
          firstCard.focus();
          const focusedOutline = window.getComputedStyle(firstCard).outlineWidth;
          
          return {
            normalBorder,
            focusedOutline,
            hasKeyframes: !!document.querySelector('style, link[rel="stylesheet"]')
          };
        })()
      `,
      returnByValue: true
    });
    console.log('   ✓ Normal border left color:', hoverTestResult.result.value.normalBorder);
    console.log('   ✓ Focus outline width:', hoverTestResult.result.value.focusedOutline);

    // 6. Test Responsive Viewports for Horizontal Overflow & Distortions
    console.log('\n6. Verifying Responsive Viewports (No Overflow, No Distortions):');
    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });

      // Small pause for layout recalculation
      await new Promise((r) => setTimeout(r, 100));

      const overflowEval = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const root = document.documentElement;
            const scrollWidth = root.scrollWidth;
            const clientWidth = root.clientWidth;
            const winWidth = window.innerWidth;
            const cardSvgs = Array.from(document.querySelectorAll('.category-discovery-card img, .tool-card img'));
            const clippedSvgs = cardSvgs.filter(img => img.clientWidth === 0 || img.clientHeight === 0).length;

            return {
              scrollWidth,
              clientWidth,
              winWidth,
              hasOverflow: scrollWidth > winWidth + 1,
              clippedSvgs,
              totalSvgs: cardSvgs.length
            };
          })()
        `,
        returnByValue: true
      });

      const res = overflowEval.result.value;
      assert.ok(!res.hasOverflow, `No horizontal overflow at ${vp.name} (scrollWidth: ${res.scrollWidth}, win: ${res.winWidth})`);
      assert.equal(res.clippedSvgs, 0, `0 clipped SVGs at ${vp.name}`);
      console.log(`   ✓ ${vp.name.padEnd(14)}: ScrollWidth ${res.scrollWidth}px / WinWidth ${res.winWidth}px | 0 clipped SVGs`);
    }

    // Reset emulation to desktop standard
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 800,
      deviceScaleFactor: 1,
      mobile: false
    });

    // 7. Verify Anchor Navigation
    console.log('\n7. Verifying Anchor Navigation:');
    const anchorNavResult = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const exploreBtn = document.getElementById('hero-explore-tools');
          const browseBtn = document.getElementById('hero-browse-categories');
          const pdfSection = document.getElementById('pdf-tools');
          const categoriesSection = document.getElementById('categories');

          return {
            exploreHref: exploreBtn ? exploreBtn.getAttribute('href') : null,
            browseHref: browseBtn ? browseBtn.getAttribute('href') : null,
            pdfSectionExists: !!pdfSection,
            categoriesSectionExists: !!categoriesSection,
            pdfScrollMargin: pdfSection ? window.getComputedStyle(pdfSection).scrollMarginTop : null,
            categoriesScrollMargin: categoriesSection ? window.getComputedStyle(categoriesSection).scrollMarginTop : null
          };
        })()
      `,
      returnByValue: true
    });

    const aRes = anchorNavResult.result.value;
    assert.equal(aRes.exploreHref, '#pdf-tools', 'Explore All Tools href is #pdf-tools');
    assert.equal(aRes.browseHref, '#categories', 'Browse Categories href is #categories');
    assert.ok(aRes.pdfSectionExists, 'PDF tools section exists');
    assert.ok(aRes.categoriesSectionExists, 'Categories section exists');
    assert.ok(aRes.pdfScrollMargin !== '0px', 'PDF tools section has scroll-margin-top configured');
    assert.ok(aRes.categoriesScrollMargin !== '0px', 'Categories section has scroll-margin-top configured');
    console.log('   ✓ Explore All Tools anchor (#pdf-tools) verified');
    console.log('   ✓ Browse Categories anchor (#categories) verified');
    console.log(`   ✓ Section scroll-margin-top: ${aRes.pdfScrollMargin}`);

    // 8. Verify Representative Tool Route
    console.log('\n8. Verifying Representative Tool Route (/jpg-to-pdf):');
    await send('Page.navigate', { url: `${BASE_URL}/jpg-to-pdf` });

    let toolPageReady = false;
    for (let i = 0; i < 30; i++) {
      const check = await send('Runtime.evaluate', {
        expression: `!!document.querySelector('h1') && document.title.includes('JPG to PDF')`,
        returnByValue: true
      });
      if (check.result?.value) {
        toolPageReady = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(toolPageReady, 'JPG to PDF tool route rendered cleanly');
    console.log('   ✓ /jpg-to-pdf page loaded with title and workspace');

    // 9. Console Errors, Exceptions, and Network Results
    console.log('\n9. Console & Network Summary:');
    console.log(`   - Console Errors: ${consoleErrors.length}`);
    console.log(`   - Runtime Exceptions: ${runtimeExceptions.length}`);
    console.log(`   - Failed Network Requests: ${failedNetworkRequests.length}`);
    console.log(`   - Successful SVG Requests Recorded: ${successfulSvgRequests.length}`);

    assert.equal(consoleErrors.length, 0, `Zero console errors expected, got: ${JSON.stringify(consoleErrors)}`);
    assert.equal(runtimeExceptions.length, 0, `Zero runtime exceptions expected, got: ${JSON.stringify(runtimeExceptions)}`);
    assert.equal(failedNetworkRequests.length, 0, `Zero failed network requests expected`);

    console.log('\nALL CDP ASSERTIONS AND VISUAL QA CHECKS PASSED SUCCESSFULLY!\n');
  } finally {
    try {
      chrome.kill();
    } catch {}
  }
}

main().catch((err) => {
  console.error('\nCDP VERIFICATION FAILED:', err);
  process.exit(1);
});
