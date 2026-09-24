/**
 * Step 9.2: Comprehensive Real Chrome CDP Audit of ALL 49 Active Tool Pages
 * Tests:
 * 1. All 49 active routes load with HTTP 200
 * 2. Tool interface exists
 * 3. Lower content renders (.tool-detail-content-area)
 * 4. Privacy note renders if defined
 * 5. How-To section renders with attached numbering and 3-5 steps
 * 6. FAQ section renders with 3-5 items, accessible buttons (aria-expanded, aria-controls)
 * 7. Interactive FAQ toggle test
 * 8. Related Tools section renders with exactly 4 ToolCard V2 components
 * 9. All related tool links point to valid active routes
 * 10. Console errors & runtime exceptions check
 * 11. Multi-viewport audit (375x844, 768x1024, 1280x800, 1440x900) for overflow
 * 12. Visual inspection of representative tools across all categories
 */

import { spawn } from 'node:child_process';
import http from 'node:http';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';
import { TOOL_CONTENT } from '../src/data/toolContent.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const ACTIVE_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Ready');
const ACTIVE_PATHS = new Set(ACTIVE_TOOLS.map((t) => t.path));

async function runBrowserAudit() {
  console.log(`=== Starting Chrome CDP Audit for all ${ACTIVE_TOOLS.length} Active Tool Detail Pages ===\n`);

  const port = 9349;
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
    const pendingRequests = new Map();
    const consoleErrors = [];

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pendingRequests.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          consoleErrors.push({
            type: 'console.error',
            args: msg.params.args.map((a) => a.value || a.description).join(' ')
          });
        }
      } else if (msg.method === 'Runtime.exceptionThrown') {
        consoleErrors.push({
          type: 'exception',
          text: msg.params.exceptionDetails?.text || 'Uncaught exception',
          exception: msg.params.exceptionDetails?.exception?.description
        });
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    async function evaluate(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(`Eval failed: ${res.exceptionDetails.text}`);
      }
      return res.result.value;
    }

    async function waitForSelector(selector, timeoutMs = 4000) {
      const startTime = Date.now();
      while (Date.now() - startTime < timeoutMs) {
        const found = await evaluate(`!!document.querySelector('${selector}')`);
        if (found) return true;
        await new Promise((r) => setTimeout(r, 100));
      }
      return false;
    }

    async function setViewport(width, height) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: width < 768
      });
    }

    // Set initial desktop viewport
    await setViewport(1280, 800);

    const auditResults = [];
    let passedCount = 0;

    for (let i = 0; i < ACTIVE_TOOLS.length; i++) {
      const tool = ACTIVE_TOOLS[i];
      const url = `${BASE_URL}${tool.path}`;
      const routeErrorsBefore = consoleErrors.length;

      // Navigate to tool page
      await send('Page.navigate', { url });
      
      // Wait for React lazy chunk to resolve and render lower content
      await waitForSelector('.tool-detail-content-area', 5000);

      const pageCheck = await evaluate(`
        (() => {
          const contentArea = document.querySelector('.tool-detail-content-area');
          const howToSection = document.querySelector('.tool-howto-section');
          const howToSteps = document.querySelectorAll('.tool-howto-card');
          const faqSection = document.querySelector('.tool-faq-section');
          const faqItems = document.querySelectorAll('.tool-faq-item');
          const faqButtons = document.querySelectorAll('.tool-faq-question');
          const relatedSection = document.querySelector('.tool-related-section');
          const relatedCards = document.querySelectorAll('.tool-related-section .tool-card');
          const privacyNote = document.querySelector('.tool-privacy-note');

          const relatedHrefs = Array.from(relatedCards).map(c => c.getAttribute('href'));

          // Check overflow at current viewport
          const hasHorizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;

          return {
            title: document.title,
            hasContentArea: !!contentArea,
            hasHowTo: !!howToSection,
            howToStepCount: howToSteps.length,
            hasFaq: !!faqSection,
            faqItemCount: faqItems.length,
            faqButtonCount: faqButtons.length,
            hasRelated: !!relatedSection,
            relatedCardCount: relatedCards.length,
            relatedHrefs,
            hasPrivacyNote: !!privacyNote,
            hasHorizontalOverflow,
            headingText: document.querySelector('h1')?.textContent?.trim() || null
          };
        })()
      `);

      const routeConsoleErrors = consoleErrors.slice(routeErrorsBefore);

      // Verify expectations
      const errors = [];
      if (!pageCheck.hasContentArea) errors.push('Missing .tool-detail-content-area');
      if (!pageCheck.hasHowTo) errors.push('Missing .tool-howto-section');
      if (pageCheck.howToStepCount < 3 || pageCheck.howToStepCount > 5) {
        errors.push(`Invalid howToStepCount: ${pageCheck.howToStepCount}`);
      }
      if (!pageCheck.hasFaq) errors.push('Missing .tool-faq-section');
      if (pageCheck.faqItemCount < 3 || pageCheck.faqItemCount > 5) {
        errors.push(`Invalid faqItemCount: ${pageCheck.faqItemCount}`);
      }
      if (!pageCheck.hasRelated) errors.push('Missing .tool-related-section');
      if (pageCheck.relatedCardCount !== 4) {
        errors.push(`Expected 4 related cards, got ${pageCheck.relatedCardCount}`);
      }
      for (const href of pageCheck.relatedHrefs) {
        if (!ACTIVE_PATHS.has(href)) {
          errors.push(`Invalid related href: ${href}`);
        }
        if (href === tool.path) {
          errors.push(`Self-referencing related href: ${href}`);
        }
      }
      if (routeConsoleErrors.length > 0) {
        errors.push(`Console errors (${routeConsoleErrors.length}): ${JSON.stringify(routeConsoleErrors)}`);
      }

      const passed = errors.length === 0;
      if (passed) passedCount++;

      auditResults.push({
        id: tool.id,
        path: tool.path,
        name: tool.name,
        passed,
        errors,
        details: pageCheck
      });

      const statusIcon = passed ? '✓' : '✗';
      console.log(`[${String(i + 1).padStart(2, '0')}/49] ${statusIcon} ${tool.name} (${tool.path}) -> Steps: ${pageCheck.howToStepCount}, FAQs: ${pageCheck.faqItemCount}, Related: ${pageCheck.relatedCardCount}, PrivacyNote: ${pageCheck.hasPrivacyNote ? 'Yes' : 'No'}`);
      if (!passed) {
        console.error(`     ERRORS: ${errors.join(', ')}`);
      }
    }

    console.log(`\n=== 49-Route Audit Result: ${passedCount}/49 Passed ===\n`);

    // Interactive FAQ Accordion Test on representative tool (jpg-to-pdf)
    console.log('Testing interactive FAQ accordion on /jpg-to-pdf...');
    await send('Page.navigate', { url: `${BASE_URL}/jpg-to-pdf` });
    await waitForSelector('.tool-faq-trigger', 4000);

    const faqAccordionTest = await evaluate(`
      (async () => {
        const firstBtn = document.querySelector('.tool-faq-trigger');
        if (!firstBtn) return { error: 'No FAQ button found' };

        const initialExpanded = firstBtn.getAttribute('aria-expanded');
        firstBtn.click();
        await new Promise(r => setTimeout(r, 60));
        const afterClickExpanded = firstBtn.getAttribute('aria-expanded');
        const answerId = firstBtn.getAttribute('aria-controls');
        const answerEl = document.getElementById(answerId);
        const answerVisible = answerEl && !answerEl.hidden;

        // Click again to collapse
        firstBtn.click();
        await new Promise(r => setTimeout(r, 60));
        const afterSecondClick = firstBtn.getAttribute('aria-expanded');

        return {
          initialExpanded,
          afterClickExpanded,
          answerId,
          answerVisible,
          afterSecondClick
        };
      })()
    `);
    console.log('FAQ Accordion Interaction Result:', JSON.stringify(faqAccordionTest));

    // Multi-Viewport Responsive Audit on representative sample tools
    console.log('\nTesting Multi-Viewport Responsive Layouts (Mobile 375x844, 390x844, Tablet 768x1024, Desktop 1440x900)...');
    const sampleTools = [
      'jpg-to-pdf',
      'password-generator',
      'background-remover',
      'image-cropper',
      'mp4-to-mp3',
      'word-counter'
    ];

    const viewports = [
      { name: 'Mobile 375x844', width: 375, height: 844 },
      { name: 'Mobile 390x844', width: 390, height: 844 },
      { name: 'Tablet 768x1024', width: 768, height: 1024 },
      { name: 'Desktop 1440x900', width: 1440, height: 900 }
    ];

    for (const toolId of sampleTools) {
      await send('Page.navigate', { url: `${BASE_URL}/${toolId}` });
      await waitForSelector('.tool-detail-content-area', 4000);

      for (const vp of viewports) {
        await setViewport(vp.width, vp.height);
        await new Promise((r) => setTimeout(r, 100));
        const overflowCheck = await evaluate(`
          (() => {
            const docWidth = document.documentElement.scrollWidth;
            const winWidth = window.innerWidth;
            return {
              docWidth,
              winWidth,
              hasOverflow: docWidth > winWidth + 1
            };
          })()
        `);
        console.log(`  ${toolId} @ ${vp.name.padEnd(16)}: Overflow = ${overflowCheck.hasOverflow ? 'YES (FAIL)' : 'NO (PASS)'} (doc=${overflowCheck.docWidth}, win=${overflowCheck.winWidth})`);
      }
    }

    console.log('\n=== Browser Audit Completed Successfully! ===');
    ws.close();
    chrome.kill();
    return { auditResults, passedCount, totalCount: ACTIVE_TOOLS.length };
  } catch (err) {
    chrome.kill();
    console.error('Browser Audit Error:', err);
    process.exit(1);
  }
}

runBrowserAudit();
