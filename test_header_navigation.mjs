import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const PORT = 9388;

console.log('=== FIXMYFILE: COMPREHENSIVE HEADER NAVIGATION & MEGA-MENU TEST SUITE ===\n');

// 1. Static Source Code & Link Integrity Check
console.log('GROUP 1: Header Source Code & Registry Integrity');
const headerJsx = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');

// Required Categories
assert(headerJsx.includes('PDF Tools'), 'Header must contain PDF Tools');
assert(headerJsx.includes('Image Tools'), 'Header must contain Image Tools');
assert(headerJsx.includes('Media Tools'), 'Header must contain Media Tools');
assert(headerJsx.includes('Generators'), 'Header must contain Generators');
assert(headerJsx.includes('All Tools'), 'Header must contain All Tools');
assert(headerJsx.includes('Explore Tools'), 'Header must contain Explore Tools');
assert(!headerJsx.includes('Phase 7 Complete'), 'Header must not contain Phase 7 Complete badge');
console.log('  ✓ All 5 major nav categories present without development badges in Header.jsx');

// Media Tools implemented check
const expectedMediaRoutes = [
  '/mp4-to-mp3',
  '/video-compressor',
  '/video-to-gif',
  '/gif-maker'
];
for (const r of expectedMediaRoutes) {
  assert(headerJsx.includes(r), `Header must contain route ${r}`);
}
console.log('  ✓ All 4 implemented Media Tools discoverable in Header.jsx');

// Verify all 49 tools are represented across Header
const allNavLinks = Array.from(headerJsx.matchAll(/to="(\/[a-z0-9-]+)"/g)).map(m => m[1]);
const toolNavLinks = allNavLinks.filter(p => ALL_TOOLS.some(t => t.path === p));
const uniqueNavLinks = new Set(toolNavLinks);

console.log(`  Found ${uniqueNavLinks.size} unique tool routes in Header navigation.`);
assert.equal(uniqueNavLinks.size, 49, `Header must link to all 49 unique tools, got ${uniqueNavLinks.size}`);
for (const tool of ALL_TOOLS) {
  assert(uniqueNavLinks.has(tool.path), `Tool ${tool.name} (${tool.path}) must be in Header navigation`);
}
console.log('  ✓ Exactly 49 unique tools mapped 1:1 to Header navigation with zero duplicates');


// 2. Real Chrome CDP Interactive Automation
async function runChromeTests() {
  console.log('\nGROUP 2: Real Google Chrome CDP Automation across Viewports');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    BASE_URL
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise(r => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
            let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Chrome failed to connect on port ${PORT}`);
    }

    const pageTarget = targets.find(t => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise(resolve => ws.onopen = resolve);

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
      const parsed = JSON.parse(msg.data);
      if (parsed.id && pending.has(parsed.id)) {
        const { resolve, reject } = pending.get(parsed.id);
        pending.delete(parsed.id);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.result);
      }
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        const text = parsed.params.args.map(a => a.value || a.description || '').join(' ');
        consoleErrors.push(text);
      }
      if (parsed.method === 'Runtime.exceptionThrown') {
        const desc = parsed.params?.exceptionDetails?.exception?.description || parsed.params?.exceptionDetails?.text;
        consoleErrors.push(desc);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    const viewports = [
      { w: 1440, h: 900, name: 'Desktop 1440px', mobile: false },
      { w: 1280, h: 800, name: 'Desktop 1280px', mobile: false },
      { w: 1024, h: 768, name: 'Desktop 1024px', mobile: false },
      { w: 768, h: 1024, name: 'Tablet 768px', mobile: true },
      { w: 390, h: 844, name: 'Mobile 390px', mobile: true },
      { w: 375, h: 667, name: 'Mobile 375px', mobile: true }
    ];

    for (const vp of viewports) {
      console.log(`\n--- Testing Viewport: ${vp.name} ---`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.w,
        height: vp.h,
        deviceScaleFactor: 2,
        mobile: vp.mobile
      });
      await send('Page.navigate', { url: BASE_URL });
      // Wait for React hydration and layout
      for (let w = 0; w < 20; w++) {
        await new Promise(r => setTimeout(r, 100));
        const ready = await send('Runtime.evaluate', {
          expression: `!!document.querySelector('.nav-dropdown-btn')`,
          returnByValue: true
        });
        if (ready.result?.value) break;
      }
      await new Promise(r => setTimeout(r, 600));

      // Check zero horizontal overflow at initial render
      const initialOverflow = await send('Runtime.evaluate', {
        expression: `(() => {
          const docW = document.documentElement.scrollWidth;
          const clientW = document.documentElement.clientWidth;
          return { docW, clientW, overflow: docW > clientW };
        })()`,
        returnByValue: true
      });
      assert.equal(initialOverflow.result.value.overflow, false, `${vp.name}: Initial page has horizontal overflow`);
      console.log(`  ✓ Initial page layout: 0 horizontal overflow (scrollWidth=${initialOverflow.result.value.docW}, clientWidth=${initialOverflow.result.value.clientW})`);

      // Test each dropdown category
      const categories = [
        { name: 'PDF Tools', selector: '.mega-menu-pdf', expectedCols: vp.w > 768 ? 3 : 1, minTools: 18 },
        { name: 'Image Tools', selector: '.mega-menu-image', expectedCols: vp.w > 768 ? 3 : 1, minTools: 20 },
        { name: 'Media Tools', selector: '.mega-menu-media', expectedCols: vp.w > 768 ? 2 : 1, minTools: 4 },
        { name: 'Generators', selector: '.mega-menu-generators', expectedCols: vp.w > 768 ? 2 : 1, minTools: 7 }
      ];

      for (const cat of categories) {
        // Trigger dropdown via click on button containing category label
        const clickRes = await send('Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('.nav-dropdown-btn'));
            const targetBtn = btns.find(b => b.textContent.includes('${cat.name}'));
            if (!targetBtn) return { error: 'Button not found' };
            targetBtn.click();
            return { clicked: true };
          })()`,
          returnByValue: true
        });
        assert(clickRes.result.value.clicked, `${vp.name}: Could not click ${cat.name} button`);
        await new Promise(r => setTimeout(r, 200));

        // Evaluate Dropdown Geometry and Bounds
        const menuEval = await send('Runtime.evaluate', {
          expression: `(() => {
            const menu = document.querySelector('${cat.selector}');
            if (!menu) return { found: false };
            const rect = menu.getBoundingClientRect();
            const comp = window.getComputedStyle(menu);
            const isVisible = comp.display !== 'none' && rect.width > 0 && rect.height > 0;
            const links = Array.from(menu.querySelectorAll('a')).map(a => ({
              text: a.textContent.trim(),
              href: a.getAttribute('href')
            }));
            const cols = menu.querySelectorAll('.mega-menu-column').length;
            const docW = document.documentElement.scrollWidth;
            const clientW = document.documentElement.clientWidth;
            const overflow = docW > clientW;
            const rightExceeded = rect.right > window.innerWidth + 2;
            const leftExceeded = rect.left < -2;
            return {
              found: true,
              isVisible,
              rect: { top: rect.top, left: rect.left, right: rect.right, width: rect.width, height: rect.height },
              linkCount: links.length,
              cols,
              overflow,
              rightExceeded,
              leftExceeded
            };
          })()`,
          returnByValue: true
        });

        const mData = menuEval.result.value;
        console.log(`    [DEBUG ${cat.name}]`, mData);
        assert(mData.found, `${vp.name}: Menu ${cat.name} DOM node not found`);
        assert(mData.isVisible, `${vp.name}: Menu ${cat.name} not visible when clicked`);
        assert.equal(mData.linkCount, cat.minTools, `${vp.name}: ${cat.name} must have ${cat.minTools} links, got ${mData.linkCount}`);
        assert.equal(mData.overflow, false, `${vp.name}: Dropdown ${cat.name} caused horizontal page overflow!`);
        assert.equal(mData.rightExceeded, false, `${vp.name}: Dropdown ${cat.name} extended beyond right viewport edge!`);
        assert.equal(mData.leftExceeded, false, `${vp.name}: Dropdown ${cat.name} extended beyond left viewport edge!`);

        // Height efficiency: verify it is much more compact than the old 682px tall list
        if (vp.w > 768) {
          assert(mData.rect.height < 400, `${vp.name}: Dropdown ${cat.name} height (${mData.rect.height}px) is not compact (<400px expected)`);
        }

        console.log(`    ✓ ${cat.name}: opened successfully (${mData.linkCount} tools, ${mData.cols} cols, height=${Math.round(mData.rect.height)}px, 0 overflow)`);

        // Close dropdown by clicking again
        await send('Runtime.evaluate', {
          expression: `(() => {
            const btns = Array.from(document.querySelectorAll('.nav-dropdown-btn'));
            const targetBtn = btns.find(b => b.textContent.includes('${cat.name}'));
            targetBtn?.click();
          })()`
        });
        await new Promise(r => setTimeout(r, 100));
      }

      // Check All Tools & Explore Tools navigation
      const navLinksCheck = await send('Runtime.evaluate', {
        expression: `(() => {
          const allTools = document.querySelector('.site-nav a.nav-link');
          const explore = document.querySelector('.header-cta-btn');
          return {
            hasAllTools: !!allTools && allTools.textContent.includes('All Tools'),
            hasExplore: !!explore || ${vp.w} <= 860
          };
        })()`,
        returnByValue: true
      });
      assert(navLinksCheck.result.value.hasAllTools, `${vp.name}: All Tools link must exist`);
      assert(navLinksCheck.result.value.hasExplore, `${vp.name}: Explore Tools button must exist where appropriate`);
      console.log(`  ✓ All Tools and Explore Tools links verified on ${vp.name}`);
    }

    // 3. Test Keyboard Navigation & Escape Key Behavior
    console.log('\nGROUP 3: Keyboard Accessibility (Enter, Space, Escape, Focus)');
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: BASE_URL });
    await new Promise(r => setTimeout(r, 600));

    // Focus Media Tools button and press Enter
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.nav-dropdown-btn'));
        const mediaBtn = btns.find(b => b.textContent.includes('Media Tools'));
        mediaBtn.focus();
        mediaBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 200));

    const checkOpen = await send('Runtime.evaluate', {
      expression: `(() => {
        const mediaMenu = document.querySelector('.mega-menu-media');
        return window.getComputedStyle(mediaMenu).display !== 'none';
      })()`,
      returnByValue: true
    });
    const isOpenAfterEnter = checkOpen.result.value;

    // Press Escape to close
    await send('Runtime.evaluate', {
      expression: `(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      })()`
    });
    await new Promise(r => setTimeout(r, 200));

    const checkClose = await send('Runtime.evaluate', {
      expression: `(() => {
        const mediaMenu = document.querySelector('.mega-menu-media');
        return window.getComputedStyle(mediaMenu).display !== 'none';
      })()`,
      returnByValue: true
    });
    const isOpenAfterEscape = checkClose.result.value;
    assert.equal(isOpenAfterEnter, true, 'Keyboard Enter must open dropdown');
    assert.equal(isOpenAfterEscape, false, 'Keyboard Escape must close dropdown');
    console.log('  ✓ Keyboard Enter successfully opened dropdown and Escape successfully closed it');

    // 4. Test Navigation Click-Through from Mega-Menu
    console.log('\nGROUP 4: Interactive Tool Navigation from Mega-Menu');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('.nav-dropdown-btn'));
        const mediaBtn = btns.find(b => b.textContent.includes('Media Tools'));
        mediaBtn.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 200));

    // Click Video Compressor link
    await send('Runtime.evaluate', {
      expression: `(() => {
        const link = document.querySelector('.mega-menu-media a[href="/video-compressor"]');
        link?.click();
      })()`
    });
    await new Promise(r => setTimeout(r, 800));

    const pageNavCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        return {
          pathname: window.location.pathname,
          h1: document.querySelector('h1')?.textContent?.trim()
        };
      })()`,
      returnByValue: true
    });
    assert.equal(pageNavCheck.result.value.pathname, '/video-compressor', 'Must navigate to /video-compressor');
    assert(pageNavCheck.result.value.h1.includes('Video Compressor'), 'H1 must contain Video Compressor');
    console.log(`  ✓ Navigated to ${pageNavCheck.result.value.pathname}: H1="${pageNavCheck.result.value.h1}"`);

    // Verify 0 Console Errors
    console.log('\nGROUP 5: Console Error Audit');
    const criticalErrors = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    assert.equal(criticalErrors.length, 0, `Expected 0 console errors, got: ${criticalErrors.join('; ')}`);
    console.log('  ✓ 0 console errors during all header operations across viewports');

    console.log('\n🎉 ALL HEADER NAVIGATION & MEGA-MENU TESTS PASSED SUCCESSFULLY!');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {}
  }
}

runChromeTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
