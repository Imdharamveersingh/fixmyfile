import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

import {
  ALL_TOOLS,
  PHASE_1_TOOLS,
  PHASE_2_TOOLS,
  PHASE_3_TOOLS,
  PHASE_4_TOOLS,
  PHASE_5_TOOLS,
  PHASE_6_TOOLS,
  PHASE_7_TOOLS
} from './src/tools/toolsRegistry.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

console.log('=== TEST SUITE: REMOVAL OF PUBLIC-FACING DEVELOPMENT STATUS LABELS ===\n');

// -------------------------------------------------------------
// GROUP 1: Internal Registry Integrity Verification
// -------------------------------------------------------------
console.log('GROUP 1: Internal Registry Integrity & Retention');

assert.equal(ALL_TOOLS.length, 49, `ALL_TOOLS.length must be exactly 49 (got ${ALL_TOOLS.length})`);
console.log('  ✓ ALL_TOOLS.length remains 49');

assert.equal(PHASE_1_TOOLS.length, 6, 'PHASE_1_TOOLS length must be 6');
assert.equal(PHASE_2_TOOLS.length, 6, 'PHASE_2_TOOLS length must be 6');
assert.equal(PHASE_3_TOOLS.length, 7, 'PHASE_3_TOOLS length must be 7');
assert.equal(PHASE_4_TOOLS.length, 10, 'PHASE_4_TOOLS length must be 10');
assert.equal(PHASE_5_TOOLS.length, 9, 'PHASE_5_TOOLS length must be 9');
assert.equal(PHASE_6_TOOLS.length, 4, 'PHASE_6_TOOLS length must be 4');
assert.equal(PHASE_7_TOOLS.length, 7, 'PHASE_7_TOOLS length must be 7');
console.log('  ✓ Tool arrays intact: Phase 1(6), Phase 2(6), Phase 3(7), Phase 4(10), Phase 5(9), Phase 6(4), Phase 7(7)');

const cropper = ALL_TOOLS.find(t => t.id === 'image-cropper');
assert(cropper, 'Image Cropper must exist in ALL_TOOLS');
assert.equal(cropper.phase, 'Phase 7.7', 'Image Cropper must retain internal phase: Phase 7.7');
assert.equal(PHASE_5_TOOLS.some(t => t.id === 'image-cropper'), false, 'Phase 5 must NOT contain Image Cropper');
assert.equal(PHASE_7_TOOLS.some(t => t.id === 'image-cropper'), true, 'Phase 7 must contain Image Cropper');
console.log('  ✓ Image Cropper remains canonical Phase 7.7 internally and absent from Phase 5');

// Verify that EVERY tool still has its internal `phase` field in registry
for (const tool of ALL_TOOLS) {
  assert(tool.phase && typeof tool.phase === 'string' && tool.phase.startsWith('Phase'), `Tool ${tool.id} must retain internal phase field`);
}
console.log('  ✓ All 49 tools in registry retain their internal phase identifiers');

// Verify unique paths and IDs (no tools or routes removed)
const uniquePaths = new Set(ALL_TOOLS.map(t => t.path));
const uniqueIds = new Set(ALL_TOOLS.map(t => t.id));
assert.equal(uniquePaths.size, 49, 'All 49 paths must be unique');
assert.equal(uniqueIds.size, 49, 'All 49 IDs must be unique');
console.log('  ✓ 49 unique paths and 49 unique IDs confirmed (0 routes removed, 0 tools removed)');

// -------------------------------------------------------------
// GROUP 2: Source Code Template Audit (Public UI files)
// -------------------------------------------------------------
console.log('\nGROUP 2: Public UI Source Code Audit');

const homeSrc = fs.readFileSync('src/pages/HomePage.jsx', 'utf-8');
const cleaned = homeSrc.replace(/tools-phase\d/g, '').replace(/PHASE_\d_TOOLS/g, '').replace(/phase3-grid/g, '');
assert(!/Phase\s*\d/i.test(cleaned), 'HomePage.jsx must contain no visible Phase labels');
assert(!homeSrc.includes('tools complete'), 'HomePage.jsx must contain no "tools complete" labels');
assert(!homeSrc.includes('Phase 7 Complete'), 'HomePage.jsx must not contain "Phase 7 Complete" badge');
console.log('  ✓ HomePage.jsx source has 0 public Phase labels, 0 completion indicators, and 0 dev badges');

const toolCardSrc = fs.readFileSync('src/components/ToolCard.jsx', 'utf-8');
assert(!toolCardSrc.includes('tool-phase-badge'), 'ToolCard.jsx must not render tool-phase-badge');
assert(!toolCardSrc.includes('tool-status-tag'), 'ToolCard.jsx must not render tool-status-tag (Ready badge)');
assert(!toolCardSrc.includes('phase'), 'ToolCard.jsx must not display tool.phase');
assert(!toolCardSrc.includes('status'), 'ToolCard.jsx must not display tool.status');
assert(!toolCardSrc.includes('tool-category-badge'), 'ToolCard.jsx must not render tool-category-badge');
console.log('  ✓ ToolCard.jsx source renders with icons; visible category, Phase, and Ready badges are removed');

const headerSrc = fs.readFileSync('src/components/Header.jsx', 'utf-8');
assert(!headerSrc.includes('brandBadgeText'), 'Header.jsx must not calculate brandBadgeText');
assert(!headerSrc.includes('brand-badge'), 'Header.jsx must not render brand-badge');
console.log('  ✓ Header.jsx source does not render brand completion badge');

const footerSrc = fs.readFileSync('src/components/Footer.jsx', 'utf-8');
assert(!footerSrc.includes('Phase 7: OCR & Text'), 'Footer.jsx must not contain "Phase 7" heading');
assert(!footerSrc.includes('Media Tools (Phase 6)'), 'Footer.jsx must not contain "(Phase 6)" heading');
assert(!footerSrc.includes('Phase 7 Complete'), 'Footer.jsx must not contain "Phase 7 Complete" badge');
console.log('  ✓ Footer.jsx source contains 0 Phase labels and 0 completion pills');

// -------------------------------------------------------------
// GROUP 3: Real Chrome CDP In-Browser DOM Verification
// -------------------------------------------------------------
console.log('\nGROUP 3: Real Chrome CDP Browser Verification');

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  '--remote-debugging-port=9377',
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
        http.get('http://127.0.0.1:9377/json/list', res => {
          let d = '';
          res.on('data', c => d += c);
          res.on('end', () => resolve(JSON.parse(d)));
        }).on('error', reject);
      });
      if (targets && targets.length > 0) break;
    } catch {}
  }

  assert(targets && targets.length > 0, 'Chrome remote debugging target must be available');
  const pageTarget = targets.find(t => t.type === 'page');
  assert(pageTarget, 'Page target must exist');

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise(resolve => ws.onopen = resolve);

  let reqId = 1;
  const pendingRequests = new Map();
  const consoleErrors = [];

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = reqId++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = msg => {
    const parsed = JSON.parse(msg.data);
    if (parsed.id && pendingRequests.has(parsed.id)) {
      const { resolve, reject } = pendingRequests.get(parsed.id);
      pendingRequests.delete(parsed.id);
      if (parsed.error) reject(new Error(parsed.error.message));
      else resolve(parsed.result);
    }
    if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
      const errText = parsed.params.args.map(a => a.value || a.description || '').join(' ');
      consoleErrors.push(errText);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('DOM.enable');

  // 1. HOME PAGE VERIFICATION AT MULTIPLE VIEWPORTS
  const viewports = [
    { name: 'Desktop 1440px', width: 1440, height: 900 },
    { name: 'Desktop 1280px', width: 1280, height: 800 },
    { name: 'Desktop 1024px', width: 1024, height: 768 },
    { name: 'Tablet 768px', width: 768, height: 1024 },
    { name: 'Mobile 390px', width: 390, height: 844 },
    { name: 'Mobile 375px', width: 375, height: 667 }
  ];

  for (const vp of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 1,
      mobile: vp.width <= 768
    });
    await send('Page.navigate', { url: BASE_URL });
    await new Promise(r => setTimeout(r, 600));

    // Check horizontal overflow
    const overflowCheck = await send('Runtime.evaluate', {
      expression: `(() => {
        const doc = document.documentElement;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasOverflow: doc.scrollWidth > doc.clientWidth
        };
      })()`,
      returnByValue: true
    });
    const ov = overflowCheck.result.value;
    assert.equal(ov.hasOverflow, false, `Viewport ${vp.name} must have 0 horizontal overflow`);
    console.log(`  ✓ Viewport ${vp.name}: 0 horizontal overflow (scrollWidth=${ov.scrollWidth}, clientWidth=${ov.clientWidth})`);
  }

  // Set back to 1440px desktop
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: BASE_URL });
  await new Promise(r => setTimeout(r, 800));

  // Inspect Home DOM in detail
  const homeDomAudit = await send('Runtime.evaluate', {
    expression: `(() => {
      const bodyText = document.body.innerText;
      const brandBadge = document.querySelector('.brand-badge');
      const heroBadge = document.querySelector('.hero-badge');
      const phaseIndicators = document.querySelectorAll('.phase-indicator');
      const sectionTitles = Array.from(document.querySelectorAll('.section-title')).map(t => t.textContent.trim());
      
      const cards = Array.from(document.querySelectorAll('.tool-card')).map(c => {
        const cat = c.querySelector('.tool-category-badge')?.textContent?.trim();
        const phase = c.querySelector('.tool-phase-badge')?.textContent?.trim();
        const status = c.querySelector('.tool-status-tag')?.textContent?.trim();
        const title = c.querySelector('.tool-card-title')?.textContent?.trim();
        return { cat, phase, status, title };
      });

      // Search all rendered text for "Phase " or "tools complete"
      const phaseMatches = bodyText.match(/Phase\\s*\\d/gi) || [];
      const completeMatches = bodyText.match(/\\d+\\s+tools\\s+complete/gi) || [];

      return {
        brandBadgeExists: !!brandBadge,
        heroBadgeExists: !!heroBadge,
        phaseIndicatorCount: phaseIndicators.length,
        sectionTitles,
        cardCount: cards.length,
        cardsWithPhaseBadge: cards.filter(c => !!c.phase).length,
        cardsWithStatusTag: cards.filter(c => !!c.status).length,
        cardsWithCategoryBadge: cards.filter(c => !!c.cat).length,
        phaseMatches,
        completeMatches
      };
    })()`,
    returnByValue: true
  });

  const hRes = homeDomAudit.result.value;
  console.log('\n  Home DOM Audit Results:');
  console.log('   - brandBadge in Header:', hRes.brandBadgeExists ? 'PRESENT ❌' : 'ABSENT ✓');
  console.log('   - heroBadge in Hero:', hRes.heroBadgeExists ? 'PRESENT ❌' : 'ABSENT ✓');
  console.log('   - .phase-indicator elements:', hRes.phaseIndicatorCount);
  console.log('   - Total Tool Cards on Home:', hRes.cardCount);
  console.log('   - Cards with Phase Badge:', hRes.cardsWithPhaseBadge);
  console.log('   - Cards with Ready Tag:', hRes.cardsWithStatusTag);
  console.log('   - Cards with Category Badge:', hRes.cardsWithCategoryBadge);
  console.log('   - Rendered Section Titles:', hRes.sectionTitles);

  assert.equal(hRes.brandBadgeExists, false, 'Header brand badge must not be rendered');
  assert.equal(hRes.heroBadgeExists, false, 'Hero badge must not be rendered');
  assert.equal(hRes.phaseIndicatorCount, 0, 'No phase indicator badges should exist on Home');
  assert.equal(hRes.cardCount, 49, 'All 49 tool cards must render on Home');
  assert.equal(hRes.cardsWithPhaseBadge, 0, '0 tool cards may have Phase badges');
  assert.equal(hRes.cardsWithStatusTag, 0, '0 tool cards may have Ready status tags');
  assert.equal(hRes.cardsWithCategoryBadge, 0, '0 tool cards may have visible category badges in V2');
  assert.equal(hRes.completeMatches.length, 0, 'No "X tools complete" text in rendered body');

  // Verify section titles don't start with "Phase X:"
  for (const st of hRes.sectionTitles) {
    assert(!/^Phase\s*\d/i.test(st), `Section title "${st}" must not start with Phase numbering`);
  }
  console.log('  ✓ Home page fully verified: 0 phase badges, 0 ready tags, 0 completion indicators');

  // 2. REPRESENTATIVE TOOL DETAIL PAGES VERIFICATION (FROM EVERY PHASE)
  const representativeTools = [
    // Phase 1
    { path: '/merge-pdf', name: 'Merge PDF', phase: 'Phase 1' },
    { path: '/compress-pdf', name: 'Compress PDF', phase: 'Phase 1' },
    { path: '/pdf-to-word', name: 'PDF to Word', phase: 'Phase 1' },
    // Phase 2
    { path: '/background-remover', name: 'Background Remover', phase: 'Phase 2' },
    { path: '/image-converter', name: 'Image Converter', phase: 'Phase 2' },
    // Phase 3
    { path: '/qr-code-generator', name: 'QR Code Generator', phase: 'Phase 3' },
    { path: '/password-generator', name: 'Password Generator', phase: 'Phase 3' },
    // Phase 4
    { path: '/split-pdf', name: 'Split PDF', phase: 'Phase 4' },
    { path: '/protect-pdf', name: 'Protect PDF', phase: 'Phase 4' },
    { path: '/pdf-to-excel', name: 'PDF to Excel', phase: 'Phase 4' },
    // Phase 5
    { path: '/heic-to-jpg', name: 'HEIC to JPG', phase: 'Phase 5' },
    { path: '/image-upscaler', name: 'Image Upscaler', phase: 'Phase 5' },
    // Phase 6
    { path: '/mp4-to-mp3', name: 'MP4 to MP3', phase: 'Phase 6' },
    { path: '/video-compressor', name: 'Video Compressor', phase: 'Phase 6' },
    { path: '/video-to-gif', name: 'Video to GIF', phase: 'Phase 6' },
    // Phase 7
    { path: '/pdf-ocr', name: 'PDF OCR', phase: 'Phase 7' },
    { path: '/image-to-text', name: 'Image to Text', phase: 'Phase 7' },
    { path: '/extract-text-from-pdf', name: 'Extract Text from PDF', phase: 'Phase 7' },
    { path: '/image-cropper', name: 'Image Cropper', phase: 'Phase 7.7' }
  ];

  console.log('\n  Tool Detail Pages In-Browser Evaluation:');
  for (const t of representativeTools) {
    await send('Page.navigate', { url: `${BASE_URL}${t.path}` });
    await new Promise(r => setTimeout(r, 1200));

    const toolDomAudit = await send('Runtime.evaluate', {
      expression: `(() => {
        const h1 = document.querySelector('h1')?.textContent?.trim();
        const header = document.querySelector('.tool-header') || document.querySelector('header');
        const headerText = header?.innerText || '';
        const bodyText = document.body.innerText;
        
        // Find any badge with "Phase"
        const badges = Array.from(document.querySelectorAll('.tool-badge, .tool-badge-accent, .tool-phase-badge, .brand-badge'))
          .map(b => b.textContent.trim());
        const phaseBadges = badges.filter(b => /Phase\\s*\\d/i.test(b));

        return {
          h1,
          headerText,
          badges,
          phaseBadges,
          hasPhaseInHeader: /Phase\\s*\\d/i.test(headerText)
        };
      })()`,
      returnByValue: true
    });

    const res = toolDomAudit.result.value;
    assert(res.h1 && res.h1.length > 0, `Page ${t.path} must have a visible H1 heading`);
    assert.equal(res.phaseBadges.length, 0, `Page ${t.path} must NOT display any Phase badges (found: ${res.phaseBadges.join(', ')})`);
    assert.equal(res.hasPhaseInHeader, false, `Page ${t.path} header must NOT contain any Phase text`);
    console.log(`    ✓ ${t.path} (${t.phase}): H1="${res.h1}" | Badges=[${res.badges.join(', ')}] | 0 Phase badges`);
  }

  // 3. HEADER NAVIGATION FUNCTIONALITY CHECK
  console.log('\n  Header Dropdown Navigation Functionality:');
  await send('Page.navigate', { url: BASE_URL });
  await new Promise(r => setTimeout(r, 600));

  const navCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const dropdowns = Array.from(document.querySelectorAll('.nav-dropdown-toggle')).map(btn => btn.textContent.trim());
      const allLinks = Array.from(document.querySelectorAll('.site-nav a')).map(a => a.getAttribute('href'));
      return { dropdowns, linkCount: allLinks.length };
    })()`,
    returnByValue: true
  });
  const navData = navCheck.result.value;
  console.log(`    ✓ Main navigation items: ${navData.dropdowns.join(', ')}`);
  assert(navData.linkCount > 40, 'Header must contain all tool links');

  // Console error check
  assert.equal(consoleErrors.length, 0, `0 console errors expected, got: ${consoleErrors.join(', ')}`);
  console.log('\n  ✓ 0 browser console errors during testing');

  ws.close();
} finally {
  chrome.kill('SIGTERM');
}

console.log('\n🎉 ALL PUBLIC-FACING DEVELOPMENT STATUS REMOVAL TESTS PASSED!\n');
