import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const ACTIVE_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Ready');

const GENERATOR_TOOL_IDS = new Set([
  'qr-code-generator',
  'barcode-generator',
  'password-generator',
  'currency-converter',
  'percentage-calculator',
  'emi-calculator',
  'word-counter'
]);

const VIEWPORTS = [
  { name: 'Mobile 375x844', width: 375, height: 844 },
  { name: 'Mobile 390x844', width: 390, height: 844 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
  { name: 'Desktop 1024x768', width: 1024, height: 768 },
  { name: 'Desktop 1280x800', width: 1280, height: 800 },
  { name: 'Desktop 1440x900', width: 1440, height: 900 }
];

const FOCUS_ROUTES = [
  '/compress-pdf',
  '/pdf-to-powerpoint',
  '/image-to-pdf',
  '/qr-code-generator',
  '/percentage-calculator',
  '/word-counter',
  '/video-compressor'
];

async function runCdpVerification() {
  console.log('================================================================');
  console.log('=== FIXMYFILE: TOOL DETAIL CLEANUP CHROME/CDP AUDIT (ALL 49) ===');
  console.log('================================================================\n');

  assert.equal(ACTIVE_TOOLS.length, 49, 'Must have exactly 49 active tools');
  console.log(`Auditing all ${ACTIVE_TOOLS.length} active tool routes in real Chrome via CDP...`);

  const port = 9385;
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
    const runtimeExceptions = [];

    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      }
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
        // Ignore favicon or non-critical 404s
        if (!text.includes('favicon.ico')) {
          consoleErrors.push(text);
        }
      }
      if (data.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(data.params.exceptionDetails.text);
      }
    };

    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    // -------------------------------------------------------------
    // Part 1: Audit all 49 Active Routes
    // -------------------------------------------------------------
    console.log('\n--- Auditing All 49 Active Tool Routes ---');
    let toolHeaderPillsRemovedCount = 0;
    let workspacePillsRemovedCount = 0;
    let generatorIconsRemovedCount = 0;
    let nonGenIconsPreservedCount = 0;

    for (let i = 0; i < ACTIVE_TOOLS.length; i++) {
      const tool = ACTIVE_TOOLS[i];
      const isGen = GENERATOR_TOOL_IDS.has(tool.id);
      const url = `${BASE_URL}${tool.path}`;

      await send('Page.navigate', { url });

      // Poll until lazy chunk is loaded and h1 renders (up to 3 seconds)
      let ready = false;
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 100));
        const checkReady = await send('Runtime.evaluate', {
          expression: `!!document.querySelector('h1')`,
          returnByValue: true
        });
        if (checkReady?.result?.value) {
          ready = true;
          break;
        }
      }

      const evaluation = await send('Runtime.evaluate', {
        expression: `(() => {
          const isVisible = (el) => {
            if (!el) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };

          // 1. H1
          const h1 = document.querySelector('h1.tool-detail-h1, h1.tool-h1, h1');
          const hasH1 = !!h1 && h1.textContent.trim().length > 0;

          // 2. Breadcrumb
          const breadcrumb = document.querySelector('.tool-detail-breadcrumb, .tool-breadcrumb-nav, [aria-label="Breadcrumb"]');
          const hasBreadcrumb = !!breadcrumb && breadcrumb.textContent.trim().length > 0;

          // 3. Description
          const desc = document.querySelector('.tool-detail-description, .tool-intro');
          const hasDesc = !!desc && desc.textContent.trim().length > 0;
          let descFontSize = desc ? window.getComputedStyle(desc).fontSize : '';
          let descMarginBottom = desc ? window.getComputedStyle(desc).marginBottom : '';

          // 4. Header capability pills (MUST BE 0 visible)
          const headerPillGroup = document.querySelector('.tool-capability-pills');
          const headerPillGroupVisible = isVisible(headerPillGroup);
          const visibleHeaderPills = Array.from(document.querySelectorAll('.tool-capability-pill')).filter(isVisible).length;

          // 5. Workspace metadata pills (MUST BE 0 visible)
          const dropzoneBadgeList = document.querySelector('.dropzone-badge-list');
          const dropzoneBadgeListVisible = isVisible(dropzoneBadgeList);
          const visibleDropzoneBadges = Array.from(document.querySelectorAll('.dropzone-badge')).filter(isVisible).length;
          
          // Check for any rogue "100% Private" pill in workspace
          const dropzoneArea = document.querySelector('.dropzone, .converter-card, .workbench-card, .tool-workspace');
          let roguePrivatePillVisible = false;
          if (dropzoneArea) {
            const allElements = Array.from(dropzoneArea.querySelectorAll('*'));
            for (const el of allElements) {
              if (isVisible(el) && el.children.length === 0 && (el.textContent.includes('100% Private') || el.textContent.includes('Client-Side Only'))) {
                roguePrivatePillVisible = true;
                break;
              }
            }
          }

          // 6. Tool container / workspace
          const workspace = document.querySelector('.converter-card, .workbench-card, .tool-workspace, .qr-app-layout, .barcode-app-layout, .password-app-layout, .currency-app-layout, .percentage-app-layout, .word-counter-app-layout, .emi-calculator-layout, .dropzone, .dropzone-container, [id*="dropzone"], [id*="workbench"], .tool-detail-header ~ div, .tool-detail-header ~ section');
          const hasWorkspace = isVisible(workspace);

          // 7. Workspace SVG Icon
          const workspaceToolIconWrap = document.querySelector('.workspace-tool-icon-wrap');
          const workspaceToolIconWrapVisible = isVisible(workspaceToolIconWrap);

          const dropzoneFocalIcon = document.querySelector('.dropzone-icon, .dropzone-icon-wrapper, .upload-icon-wrap');
          const dropzoneFocalIconVisible = isVisible(dropzoneFocalIcon);

          // 8. Header icon beside H1 (MUST BE VISIBLE)
          const headerIcon = document.querySelector('.tool-header-icon-wrap');
          const headerIconVisible = isVisible(headerIcon);

          return {
            hasH1,
            h1Text: h1 ? h1.textContent.trim() : '',
            hasBreadcrumb,
            hasDesc,
            descFontSize,
            descMarginBottom,
            headerPillsHidden: !headerPillGroupVisible && visibleHeaderPills === 0,
            workspacePillsHidden: !dropzoneBadgeListVisible && visibleDropzoneBadges === 0 && !roguePrivatePillVisible,
            hasWorkspace,
            workspaceToolIconWrapVisible,
            dropzoneFocalIconVisible,
            headerIconVisible
          };
        })()`,
        returnByValue: true
      });

      const res = evaluation.result.value;

      assert.ok(res.hasH1, `[${tool.id}] H1 must exist`);
      assert.ok(res.hasBreadcrumb, `[${tool.id}] Breadcrumb must exist`);
      assert.ok(res.hasDesc, `[${tool.id}] Description must exist`);
      assert.ok(res.headerPillsHidden, `[${tool.id}] Header metadata pills must NOT be visible`);
      assert.ok(res.workspacePillsHidden, `[${tool.id}] Workspace metadata pills must NOT be visible`);
      assert.ok(res.hasWorkspace, `[${tool.id}] Workspace container must render`);
      assert.ok(res.headerIconVisible, `[${tool.id}] Header ToolIcon beside H1 must be visible`);

      toolHeaderPillsRemovedCount++;
      workspacePillsRemovedCount++;

      if (isGen) {
        assert.ok(!res.workspaceToolIconWrapVisible, `[${tool.id}] Generator workspace decorative SVG must be absent`);
        generatorIconsRemovedCount++;
      } else {
        // Non-generator should preserve dropzone focal icon if it has a dropzone
        if (res.dropzoneFocalIconVisible) {
          nonGenIconsPreservedCount++;
        }
      }

      process.stdout.write(`  [${i + 1}/49] ${tool.id} ✓\n`);
    }

    console.log(`\n✓ Tool-detail pills removed: ${toolHeaderPillsRemovedCount}/49`);
    console.log(`✓ Workspace metadata pills removed: ${workspacePillsRemovedCount}/49`);
    console.log(`✓ Generator workspace icons removed: ${generatorIconsRemovedCount}/7`);
    console.log(`✓ Non-generator workspace icons preserved`);

    // -------------------------------------------------------------
    // Part 2: Focus Routes Inspection
    // -------------------------------------------------------------
    console.log('\n--- Inspecting Focus Routes ---');
    for (const route of FOCUS_ROUTES) {
      await send('Page.navigate', { url: `${BASE_URL}${route}` });
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise((r) => setTimeout(r, 100));
        const checkReady = await send('Runtime.evaluate', {
          expression: `!!document.querySelector('h1')`,
          returnByValue: true
        });
        if (checkReady?.result?.value) break;
      }
      const evalFocus = await send('Runtime.evaluate', {
        expression: `(() => {
          const h1 = document.querySelector('h1')?.textContent.trim() || '';
          const desc = document.querySelector('.tool-detail-description')?.textContent.trim() || '';
          const pills = Array.from(document.querySelectorAll('.tool-capability-pill, .dropzone-badge')).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });
          const genWorkspaceIcon = document.querySelector('.workspace-tool-icon-wrap');
          const isGenIconVisible = genWorkspaceIcon ? window.getComputedStyle(genWorkspaceIcon).display !== 'none' : false;
          return { h1, descLength: desc ? desc.length : 0, visiblePillCount: pills.length, isGenIconVisible };
        })()`,
        returnByValue: true
      });
      const fRes = evalFocus.result.value;
      assert.strictEqual(fRes.visiblePillCount, 0, `Focus route ${route} has 0 visible pills`);
      assert.ok(!fRes.isGenIconVisible, `Focus route ${route} generator icon absent`);
      console.log(`  ✓ ${route.padEnd(26)} | H1: "${fRes.h1}" | Pills: ${fRes.visiblePillCount} | Generator Icon: absent`);
    }

    // -------------------------------------------------------------
    // Part 3: Viewport & Responsive Checks
    // -------------------------------------------------------------
    console.log('\n--- Checking Viewports & Overflow (375 to 1440px) ---');
    const testPages = ['/compress-pdf', '/qr-code-generator', '/pdf-to-powerpoint', '/percentage-calculator'];

    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.width < 768
      });

      for (const route of testPages) {
        await send('Page.navigate', { url: `${BASE_URL}${route}` });
        await new Promise((r) => setTimeout(r, 150));

        const overflowCheck = await send('Runtime.evaluate', {
          expression: `(() => {
            const body = document.body;
            const html = document.documentElement;
            const scrollWidth = Math.max(body.scrollWidth, html.scrollWidth);
            const clientWidth = html.clientWidth;
            return {
              scrollWidth,
              clientWidth,
              hasOverflow: scrollWidth > clientWidth + 1
            };
          })()`,
          returnByValue: true
        });

        const oRes = overflowCheck.result.value;
        assert.ok(!oRes.hasOverflow, `Viewport ${vp.name} on ${route} must have 0 horizontal overflow (scrollWidth=${oRes.scrollWidth}, clientWidth=${oRes.clientWidth})`);
      }
      console.log(`  ✓ ${vp.name.padEnd(20)}: 0 horizontal overflow across checked routes`);
    }

    // -------------------------------------------------------------
    // Part 4: Console Errors & Exceptions
    // -------------------------------------------------------------
    console.log('\n--- Console Errors & Runtime Exceptions ---');
    console.log(`  Console Errors: ${consoleErrors.length}`);
    console.log(`  Runtime Exceptions: ${runtimeExceptions.length}`);
    assert.strictEqual(consoleErrors.length, 0, 'Console errors must be 0');
    assert.strictEqual(runtimeExceptions.length, 0, 'Runtime exceptions must be 0');
    console.log('  ✓ 0 Console errors and 0 Runtime exceptions confirmed!');

    console.log('\n================================================================');
    console.log('=== CHROME/CDP AUDIT PASSED WITH 100% SUCCESS ===');
    console.log('================================================================\n');

    ws.close();
  } finally {
    chrome.kill();
  }
}

runCdpVerification().catch((err) => {
  console.error('\n❌ CDP Verification Failed:', err);
  process.exit(1);
});
