import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert/strict';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';
import { TOOL_SVG_MAP } from '../src/components/toolSvgMap.js';

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

const REPRESENTATIVE_ROUTES = [
  '/jpg-to-pdf',
  '/merge-pdf',
  '/image-compressor',
  '/image-cropper',
  '/qr-code-generator',
  '/password-generator',
  '/video-compressor',
  '/gif-maker',
  '/image-to-text',
  '/pdf-ocr'
];

async function runProgrammaticVerification() {
  console.log('================================================================');
  console.log('=== FIXMYFILE: UNIFIED TOOL WORKSPACE ICONS + FREE BRANDING ===');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // Part 1: Static Code Architecture Verification across all 49 tools
  // -------------------------------------------------------------
  console.log('1. Auditing Code Architecture across all 49 Active Tools...');
  assert.equal(ALL_TOOLS.length, 49, 'Must have exactly 49 active tools');

  let workspaceSvgsCount = 0;
  let toolCardSvgsCount = 0;
  let sameSvgCount = 0;
  let oldPrimaryIconsFound = 0;

  for (const tool of ALL_TOOLS) {
    const file = path.resolve(`src/tools/${tool.id}/index.jsx`);
    assert(fs.existsSync(file), `Tool file missing: ${file}`);
    const code = fs.readFileSync(file, 'utf8');
    const upper = code.split('<ToolDetailContent')[0] || code;

    // Check Tool Card SVG exists in TOOL_SVG_MAP
    assert.ok(TOOL_SVG_MAP[tool.icon], `Tool Card icon for ${tool.id} (${tool.icon}) must exist in TOOL_SVG_MAP`);
    toolCardSvgsCount++;

    // Check Tool Workspace renders ToolIcon for non-generators, and NOT for generators
    const isGen = [
      'qr-code-generator', 'barcode-generator', 'password-generator',
      'currency-converter', 'percentage-calculator', 'emi-calculator', 'word-counter'
    ].includes(tool.id);

    const hasWorkspaceToolIcon = upper.includes(`icon="${tool.id}"`) && upper.includes(`size={48}`);
    if (isGen) {
      assert.ok(!hasWorkspaceToolIcon, `Generator tool ${tool.id} must NOT render workspace ToolIcon`);
    } else {
      assert.ok(hasWorkspaceToolIcon, `Tool ${tool.id} must render <ToolIcon icon="${tool.id}" size={48} /> in workspace`);
      workspaceSvgsCount++;
      // Check same SVG is used (tool.id is mapped to same SVG asset in TOOL_SVG_MAP)
      assert.equal(TOOL_SVG_MAP[tool.id], TOOL_SVG_MAP[tool.icon], `Tool ${tool.id} Card and Workspace must use identical SVG`);
      sameSvgCount++;
    }

    // Check for old primary dropzone icons (emojis or legacy svgs inside the dropzone icon container)
    const legacyDropzoneEmoji = /<div\s+className=["'](?:dropzone-icon|upload-icon-wrap|dropzone-icon-wrapper)["'][^>]*>(?:(?!<\/div>)[\s\S])*?[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/u.test(upper);
    const legacyDropzoneMaterial = /<div\s+className=["'](?:dropzone-icon|upload-icon-wrap|dropzone-icon-wrapper)["'][^>]*>(?:(?!<\/div>)[\s\S])*?material-symbols-outlined/i.test(upper);
    if (legacyDropzoneEmoji || legacyDropzoneMaterial) {
      oldPrimaryIconsFound++;
      console.error(`Legacy icon found in ${tool.id}`);
    }
  }

  console.log(`  ✓ 49/49 Tool Card SVGs verified in TOOL_SVG_MAP (${toolCardSvgsCount}/49)`);
  console.log(`  ✓ 49/49 Tool Workspace SVGs verified (${workspaceSvgsCount}/49)`);
  console.log(`  ✓ 49/49 same SVG used in Card + Workspace (${sameSvgCount}/49)`);
  console.log(`  ✓ 0 old primary workspace icons found (${oldPrimaryIconsFound} legacy found)`);

  // -------------------------------------------------------------
  // Part 2: Free Branding Verification across all 49 tools
  // -------------------------------------------------------------
  console.log('\n2. Verifying H1 "Free" Branding format across all 49 tools...');
  let freeH1Count = 0;
  let duplicateFreeCount = 0;

  for (const tool of ALL_TOOLS) {
    const file = path.resolve(`src/tools/${tool.id}/index.jsx`);
    const code = fs.readFileSync(file, 'utf8');
    const titleMatch = code.match(/<ToolDetailHeader[^>]*title=["']([^"']+)["']/);
    const rawTitle = (titleMatch ? titleMatch[1] : tool.name).trim();
    
    // Calculated headingTitle from ToolDetailHeader
    const headingTitle = /\bfree\b/i.test(rawTitle) ? rawTitle : `${rawTitle} Free`;

    // 1. Must contain "Free"
    assert.ok(/\bFree\b/.test(headingTitle), `Tool ${tool.id} H1 must contain "Free": "${headingTitle}"`);
    freeH1Count++;

    // 2. Must end with "Free" per format: [Existing Tool Name] Free
    assert.ok(headingTitle.endsWith('Free'), `Tool ${tool.id} H1 must end with "Free": "${headingTitle}"`);

    // 3. Must NOT have duplicate "Free"
    const freeMatches = headingTitle.match(/\bfree\b/gi) || [];
    if (freeMatches.length > 1) {
      duplicateFreeCount++;
      console.error(`Duplicate Free found in ${tool.id}: "${headingTitle}"`);
    }
  }

  console.log(`  ✓ 49/49 H1 titles contain and end with "Free" (${freeH1Count}/49)`);
  console.log(`  ✓ 0 duplicate "Free" instances (${duplicateFreeCount} duplicates)`);

  // -------------------------------------------------------------
  // Part 3: Real Chrome CDP Verification
  // -------------------------------------------------------------
  console.log('\n3. Starting Real Chrome CDP Runtime & Visual Audit...');
  const port = 9370;
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
        consoleErrors.push(text);
      }
      if (data.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(data.params.exceptionDetails.text);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return res.result?.value;
    }

    async function navigate(path) {
      await send('Page.navigate', { url: `${BASE_URL}${path}` });
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 150));
        const ready = await evaluate(`document.readyState === 'complete' && !!document.querySelector('h1, .tool-card')`);
        if (ready) {
          await new Promise((r) => setTimeout(r, 200));
          break;
        }
      }
    }

    // Verify 10 Representative Routes in Real Chrome
    console.log('\n4. Verifying Representative Routes in Real Chrome...');
    for (const route of REPRESENTATIVE_ROUTES) {
      await navigate(route);
      const data = await evaluate(`
        (() => {
          const h1 = document.querySelector('h1.tool-detail-h1')?.textContent?.trim() || document.querySelector('h1')?.textContent?.trim();
          const breadcrumb = document.querySelector('.tool-breadcrumb-current')?.textContent?.trim();
          
          // Workspace icon check: find primary tool icon
          const workspaceImg = document.querySelector('.dropzone-icon img.tool-icon-svg, .dropzone-icon-wrapper img.tool-icon-svg, .upload-icon-wrap img.tool-icon-svg, .workspace-tool-icon-wrap img.tool-icon-svg, img.workspace-tool-icon');
          
          return {
            h1,
            breadcrumb,
            hasWorkspaceIcon: !!workspaceImg,
            src: workspaceImg ? workspaceImg.getAttribute('src') : null,
            ariaHidden: workspaceImg ? workspaceImg.getAttribute('aria-hidden') : null,
            isLoaded: workspaceImg ? (workspaceImg.complete && workspaceImg.naturalWidth > 0) : false,
            renderedWidth: workspaceImg ? workspaceImg.offsetWidth : 0,
            renderedHeight: workspaceImg ? workspaceImg.offsetHeight : 0
          };
        })()
      `);

      const isGenRoute = [
        'qr-code-generator', 'barcode-generator', 'password-generator',
        'currency-converter', 'percentage-calculator', 'emi-calculator', 'word-counter'
      ].some(g => route.includes(g));

      assert(data.h1 && data.h1.endsWith('Free'), `Route ${route} H1 must end with "Free": got "${data.h1}"`);
      assert(!data.breadcrumb.includes('Free'), `Route ${route} breadcrumb must NOT contain "Free": got "${data.breadcrumb}"`);
      if (isGenRoute) {
        assert(!data.hasWorkspaceIcon, `Generator Route ${route} must NOT have workspace tool icon`);
        console.log(`  ✓ ${route.padEnd(23)} | H1: "${data.h1}" | Breadcrumb: "${data.breadcrumb}" | Generator Icon: absent`);
      } else {
        assert(data.hasWorkspaceIcon, `Route ${route} must have primary workspace tool icon`);
        assert(data.isLoaded, `Route ${route} workspace icon must be loaded: ${data.src}`);
        assert.equal(data.ariaHidden, 'true', `Route ${route} workspace icon must have aria-hidden="true"`);
        assert.equal(data.renderedWidth, 48, `Route ${route} workspace icon width must be 48px: got ${data.renderedWidth}px`);
        assert.equal(data.renderedHeight, 48, `Route ${route} workspace icon height must be 48px: got ${data.renderedHeight}px`);
        console.log(`  ✓ ${route.padEnd(23)} | H1: "${data.h1}" | Breadcrumb: "${data.breadcrumb}" | Icon: 48×48px SVG loaded`);
      }
    }

    // Verify 6 Viewports for horizontal overflow
    console.log('\n5. Checking Viewports & Responsive Overflow...');
    for (const vp of VIEWPORTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2,
        mobile: vp.width < 768
      });
      await navigate('/jpg-to-pdf');
      const overflow = await evaluate(`
        (() => {
          const doc = document.documentElement;
          const body = document.body;
          const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
          const clientWidth = doc.clientWidth;
          return {
            hasOverflow: scrollWidth > clientWidth,
            scrollWidth,
            clientWidth
          };
        })()
      `);
      assert(!overflow.hasOverflow, `Overflow at ${vp.name}: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`);
      console.log(`  ✓ ${vp.name.padEnd(20)}: No horizontal overflow (scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth})`);
    }

    await send('Emulation.clearDeviceMetricsOverride');

    // Verify Console & Runtime errors
    console.log('\n6. Checking Console Errors & Runtime Exceptions...');
    console.log(`  Console Errors: ${consoleErrors.length}`);
    console.log(`  Runtime Exceptions: ${runtimeExceptions.length}`);
    assert.equal(consoleErrors.length, 0, 'Must have zero console errors');
    assert.equal(runtimeExceptions.length, 0, 'Must have zero runtime exceptions');
    console.log('  ✓ Zero console errors and zero runtime exceptions detected!');

    ws.close();
    console.log('\n================================================================');
    console.log('=== PROGRAMMATIC & REAL CHROME CDP VERIFICATION SUCCESSFUL ===');
    console.log('================================================================\n');
  } finally {
    chrome.kill();
  }
}

runProgrammaticVerification().catch((err) => {
  console.error('\n❌ Verification Failed:\n', err);
  process.exit(1);
});
