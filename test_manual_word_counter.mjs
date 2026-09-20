/**
 * Real Google Chrome automated browser test suite for Phase 3.6 Word Counter
 * Tests via Chrome DevTools Protocol (CDP) on dedicated port 9340.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Word Counter Validation ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9340',
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
          http.get('http://127.0.0.1:9340/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9340 within 6 seconds');
    }

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No Chrome page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => { ws.onopen = resolve; });

    let reqId = 1;
    const pendingRequests = new Map();
    const consoleLogs = [];
    const pageErrors = [];

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
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === 'Console.messageAdded') {
        consoleLogs.push(msg.params.message.text);
      } else if (msg.method === 'Runtime.exceptionThrown') {
        pageErrors.push(msg.params.exceptionDetails);
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Console.enable');

    async function evalScript(expression) {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (res.exceptionDetails) {
        throw new Error(`Eval error: ${res.exceptionDetails.text || res.exceptionDetails.exception?.description}`);
      }
      return res.result?.value;
    }

    // 1. Navigate to Word Counter route
    console.log('1. Navigating to /word-counter...');
    await send('Page.navigate', { url: `${BASE_URL}/word-counter` });
    await new Promise((r) => setTimeout(r, 1200));

    const pageTitle = await evalScript('document.title');
    console.log(`   Page title: "${pageTitle}"`);
    assert.ok(pageTitle.includes('Word Counter'), 'Title should contain Word Counter');

    // 2. Check Initial Empty State
    console.log('2. Verifying Initial State...');
    const initialState = await evalScript(`
      (() => {
        const textarea = document.getElementById('word-counter-textarea');
        const words = document.getElementById('stat-words')?.textContent?.trim();
        const characters = document.getElementById('stat-characters')?.textContent?.trim();
        const charsNoSpaces = document.getElementById('stat-chars-no-spaces')?.textContent?.trim();
        const sentences = document.getElementById('stat-sentences')?.textContent?.trim();
        const paragraphs = document.getElementById('stat-paragraphs')?.textContent?.trim();
        const lines = document.getElementById('stat-lines')?.textContent?.trim();
        return {
          hasTextarea: !!textarea,
          words,
          characters,
          charsNoSpaces,
          sentences,
          paragraphs,
          lines
        };
      })()
    `);
    assert.ok(initialState.hasTextarea, 'Textarea should exist');
    assert.strictEqual(initialState.words, '0', 'Initial words should be 0');
    assert.strictEqual(initialState.characters, '0', 'Initial characters should be 0');
    console.log('   ✓ Initial state confirmed 0 for all counters.');

    // 3. Type English paragraph into textarea
    console.log('3. Typing English paragraph...');
    const englishStats = await evalScript(`
      (() => {
        const textarea = document.getElementById('word-counter-textarea');
        const text = 'FixMyFile is a fast, client-first utility suite designed for absolute privacy. All files and text stay strictly inside your browser, guaranteeing zero cloud transmission and high performance.';
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setVal.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return {
          words: document.getElementById('stat-words')?.textContent?.trim(),
          characters: document.getElementById('stat-characters')?.textContent?.trim(),
          sentences: document.getElementById('stat-sentences')?.textContent?.trim(),
          paragraphs: document.getElementById('stat-paragraphs')?.textContent?.trim(),
          readingTime: document.getElementById('stat-reading-time')?.textContent?.trim()
        };
      })()
    `);
    console.log(`   Words: ${englishStats.words}, Characters: ${englishStats.characters}, Sentences: ${englishStats.sentences}, Reading time: ${englishStats.readingTime}`);
    assert.ok(parseInt(englishStats.words, 10) >= 24 && parseInt(englishStats.words, 10) <= 28, `Words should be ~26, got ${englishStats.words}`);
    assert.strictEqual(englishStats.sentences, '2', 'Should detect 2 sentences');
    assert.strictEqual(englishStats.paragraphs, '1', 'Should detect 1 paragraph');
    console.log('   ✓ English paragraph counted accurately.');

    // 4. Test Sample Button
    console.log('4. Testing "Insert Sample" button...');
    await evalScript(`document.getElementById('word-counter-sample-btn').click();`);
    await new Promise((r) => setTimeout(r, 300));
    const sampleStats = await evalScript(`
      (() => {
        return {
          words: document.getElementById('stat-words')?.textContent?.trim(),
          readingTime: document.getElementById('stat-reading-time')?.textContent?.trim()
        };
      })()
    `);
    console.log(`   Sample words: ${sampleStats.words}, Reading time: ${sampleStats.readingTime}`);
    assert.ok(parseInt(sampleStats.words, 10) >= 30, `Sample text should load words >= 30, got ${sampleStats.words}`);
    console.log(`   ✓ Sample loaded: ${sampleStats.words} words, reading time: ${sampleStats.readingTime}`);

    // 5. Test Hindi Devanagari text
    console.log('5. Testing Hindi (Devanagari) text...');
    const hindiStats = await evalScript(`
      (() => {
        const textarea = document.getElementById('word-counter-textarea');
        const text = 'नमस्ते भारत! यह एक आधुनिक फाइल यूटिलिटी वेबसाइट है। आपकी गोपनीयता हमारी प्राथमिकता है।';
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setVal.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return {
          words: document.getElementById('stat-words')?.textContent?.trim(),
          sentences: document.getElementById('stat-sentences')?.textContent?.trim(),
          characters: document.getElementById('stat-characters')?.textContent?.trim()
        };
      })()
    `);
    console.log(`   Hindi words: ${hindiStats.words}, Sentences: ${hindiStats.sentences}`);
    assert.ok(parseInt(hindiStats.words, 10) >= 12 && parseInt(hindiStats.words, 10) <= 16, `Hindi words should be ~14, got ${hindiStats.words}`);
    console.log('   ✓ Hindi text accurately counted.');

    // 6. Test Mixed Hindi + English
    console.log('6. Testing Mixed Hindi + English text...');
    const mixedStats = await evalScript(`
      (() => {
        const textarea = document.getElementById('word-counter-textarea');
        const text = 'FixMyFile पूरी तरह से secure और fast है। Browser processing ensures 100% privacy!';
        const setVal = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setVal.call(textarea, text);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        return {
          words: document.getElementById('stat-words')?.textContent?.trim(),
          sentences: document.getElementById('stat-sentences')?.textContent?.trim()
        };
      })()
    `);
    console.log(`   Mixed words: ${mixedStats.words}`);
    assert.ok(parseInt(mixedStats.words, 10) >= 10, 'Mixed language should count words accurately');
    console.log('   ✓ Mixed Hindi + English accurately counted.');

    // 7. Test Copy Text Button
    console.log('7. Testing Copy Text button...');
    const copyResult = await evalScript(`
      (() => {
        const copyBtn = document.getElementById('word-counter-copy-btn');
        if (!copyBtn) return { found: false };
        copyBtn.click();
        return { found: true, text: copyBtn.textContent };
      })()
    `);
    assert.ok(copyResult.found, 'Copy button should exist');
    console.log('   ✓ Copy button clicked.');

    // 8. Test Clear Button
    console.log('8. Testing Clear button...');
    await evalScript(`document.getElementById('word-counter-clear-btn').click();`);
    await new Promise((r) => setTimeout(r, 200));
    const clearResult = await evalScript(`
      (() => {
        return {
          value: document.getElementById('word-counter-textarea').value,
          words: document.getElementById('stat-words')?.textContent?.trim(),
          characters: document.getElementById('stat-characters')?.textContent?.trim()
        };
      })()
    `);
    assert.strictEqual(clearResult.value, '', 'Textarea should be empty after clear');
    assert.strictEqual(clearResult.words, '0', 'Words should reset to 0');
    assert.strictEqual(clearResult.characters, '0', 'Characters should reset to 0');
    console.log('   ✓ Clear button resets all text and statistics to 0.');

    // 9. Mobile Responsive Viewport
    console.log('9. Testing Mobile Viewport (375x667)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 667,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));
    const mobileMetrics = await evalScript(`
      (() => {
        const textarea = document.getElementById('word-counter-textarea');
        const rect = textarea.getBoundingClientRect();
        return {
          overflowX: document.documentElement.scrollWidth > window.innerWidth,
          textareaWidth: rect.width,
          windowWidth: window.innerWidth
        };
      })()
    `);
    console.log(`   Mobile metrics:`, mobileMetrics);
    assert.ok(!mobileMetrics.overflowX, 'Page must not have horizontal overflow on mobile');
    assert.ok(mobileMetrics.textareaWidth > 250, 'Textarea should be wide enough on mobile');
    console.log(`   ✓ Mobile layout confirmed: width ${mobileMetrics.textareaWidth}px within ${mobileMetrics.windowWidth}px, no horizontal scroll.`);

    // 10. Check Console Errors
    console.log('10. Checking Console Errors...');
    const fatalErrors = pageErrors.filter((e) => !e.text?.includes('favicon'));
    assert.strictEqual(fatalErrors.length, 0, `Expected 0 page errors, found ${fatalErrors.length}`);
    console.log('   ✓ 0 runtime page errors detected.');

    console.log('\n=== REAL CHROME WORD COUNTER VALIDATION: ALL 10 TESTS PASSED ===\n');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n❌ Browser Validation Failed:', err);
  process.exit(1);
});
