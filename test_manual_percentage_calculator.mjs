/**
 * Real Google Chrome automated browser test suite for Phase 3.4 Percentage Calculator
 * Tests via Chrome DevTools Protocol (CDP) on dedicated port 9338.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Percentage Calculator Validation ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9338',
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
          http.get('http://127.0.0.1:9338/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9338 within 6 seconds');
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
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
        consoleLogs.push({ type: msg.params.type, text });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        pageErrors.push(msg.params.exceptionDetails);
      }
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) {
          reject(new Error(JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };

    await send('Page.enable');
    await send('DOM.enable');
    await send('Runtime.enable');

    // 1. Navigation & Page Load
    console.log('1. Navigating to /percentage-calculator...');
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('a[href="/percentage-calculator"]')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    await send('Runtime.evaluate', {
      expression: `document.querySelector('a[href="/percentage-calculator"]').click();`
    });

    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.percentage-app-layout')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        url: window.location.pathname,
        title: document.title,
        heading: document.querySelector('#percentage-tool-title')?.textContent,
        badge: document.querySelector('.tool-badge')?.textContent,
        hasTabs: !!document.querySelector('#percentage-mode-tabs')
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.strictEqual(pageInfo.result.value.url, '/percentage-calculator');
    assert.match(pageInfo.result.value.title, /Percentage Calculator/i);
    assert.strictEqual(pageInfo.result.value.heading, 'Percentage Calculator Online');
    assert.strictEqual(pageInfo.result.value.badge, 'Phase 3 · Calculator');
    assert.strictEqual(pageInfo.result.value.hasTabs, true);
    console.log('  ✓ 1. Navigation & Page Load passed!\n');

    // Clipboard stub
    await send('Runtime.evaluate', {
      expression: `
        window.__lastCopied = '';
        if (!navigator.clipboard) navigator.clipboard = {};
        navigator.clipboard.writeText = async (text) => { window.__lastCopied = text; return true; };
      `
    });

    async function setInputs(x, y) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const inputX = document.querySelector('#percentage-input-x');
          const setterX = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setterX.call(inputX, ${JSON.stringify(x)});
          inputX.dispatchEvent(new Event('input', { bubbles: true }));

          const inputY = document.querySelector('#percentage-input-y');
          const setterY = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setterY.call(inputY, ${JSON.stringify(y)});
          inputY.dispatchEvent(new Event('input', { bubbles: true }));
        })()`
      });
      await new Promise((r) => setTimeout(r, 100));
    }

    // 2. Mode 1: What is X% of Y? (20% of 500 = 100)
    console.log('2. Testing Mode 1: What is 20% of 500?');
    const mode1Result = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        number: document.querySelector('.result-number')?.textContent?.trim(),
        formula: document.querySelector('.result-formula-text')?.textContent?.trim(),
        stepsCount: document.querySelectorAll('.breakdown-step').length
      })`
    });
    console.log('  Mode 1 Result:', mode1Result.result.value);
    assert.strictEqual(mode1Result.result.value.number, '100');
    assert.strictEqual(mode1Result.result.value.formula, '20% of 500');
    assert.strictEqual(mode1Result.result.value.stepsCount, 2);
    console.log('  ✓ 2. Mode 1 passed!\n');

    // 3. Mode 2: X is what % of Y? (100 of 500 = 20%)
    console.log('3. Testing Mode 2: 100 is what % of 500?');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#tab-x-is-what-p-of-y').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const mode2Result = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        number: document.querySelector('.result-number')?.textContent?.trim(),
        formula: document.querySelector('.result-formula-text')?.textContent?.trim()
      })`
    });
    console.log('  Mode 2 Result:', mode2Result.result.value);
    assert.strictEqual(mode2Result.result.value.number, '20%');
    assert.strictEqual(mode2Result.result.value.formula, '100 ÷ 500 × 100%');
    console.log('  ✓ 3. Mode 2 passed!\n');

    // Division by zero in Mode 2
    console.log('4. Testing Mode 2 division by zero error...');
    await setInputs('50', '0');
    const divZero = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasError: !!document.querySelector('#percentage-error'),
        errorText: document.querySelector('#percentage-error')?.textContent
      })`
    });
    console.log('  Division by zero state:', divZero.result.value);
    assert.strictEqual(divZero.result.value.hasError, true);
    assert.match(divZero.result.value.errorText, /cannot be zero/i);
    console.log('  ✓ 4. Division by zero passed!\n');

    // 5. Mode 3: Percentage Increase / Decrease (500 to 600 = +20%)
    console.log('5. Testing Mode 3: Percentage Change (500 to 600)...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#tab-percentage-change').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const mode3Result = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        number: document.querySelector('.result-number')?.textContent?.trim()
      })`
    });
    console.log('  Mode 3 Result:', mode3Result.result.value);
    assert.strictEqual(mode3Result.result.value.number, '+20%');
    console.log('  ✓ 5. Mode 3 passed!\n');

    // 6. Mode 4: Add percentage (500 + 20% = 600)
    console.log('6. Testing Mode 4: Add 20% to 500...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#tab-add-percentage').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const mode4Result = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        number: document.querySelector('.result-number')?.textContent?.trim()
      })`
    });
    console.log('  Mode 4 Result:', mode4Result.result.value);
    assert.strictEqual(mode4Result.result.value.number, '600');
    console.log('  ✓ 6. Mode 4 passed!\n');

    // 7. Mode 5: Subtract percentage (500 - 20% = 400)
    console.log('7. Testing Mode 5: Subtract 20% from 500...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#tab-subtract-percentage').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const mode5Result = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        number: document.querySelector('.result-number')?.textContent?.trim()
      })`
    });
    console.log('  Mode 5 Result:', mode5Result.result.value);
    assert.strictEqual(mode5Result.result.value.number, '400');
    console.log('  ✓ 7. Mode 5 passed!\n');

    // 8. Copy result
    console.log('8. Testing Copy Result action...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#copy-percentage-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const copyCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        copied: window.__lastCopied,
        btnText: document.querySelector('#copy-percentage-btn')?.textContent
      })`
    });
    console.log('  Copy Check:', copyCheck.result.value);
    assert.match(copyCheck.result.value.copied, /400/);
    assert.match(copyCheck.result.value.btnText, /Copied!/i);
    console.log('  ✓ 8. Copy action passed!\n');

    // 9. Reset button
    console.log('9. Testing Reset action...');
    await setInputs('99', '999');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#reset-percentage-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const resetCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        x: document.querySelector('#percentage-input-x')?.value,
        y: document.querySelector('#percentage-input-y')?.value
      })`
    });
    console.log('  Reset Check:', resetCheck.result.value);
    assert.strictEqual(resetCheck.result.value.x, '20');
    assert.strictEqual(resetCheck.result.value.y, '500');
    console.log('  ✓ 9. Reset action passed!\n');

    // 10. Mobile viewport (375x812)
    console.log('10. Testing mobile responsive viewport...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 300));

    const mobileCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        hasCard: !!document.querySelector('.percentage-card')
      })`
    });
    console.log('  Mobile Check:', mobileCheck.result.value);
    assert.strictEqual(mobileCheck.result.value.hasHorizontalOverflow, false);
    assert.strictEqual(mobileCheck.result.value.hasCard, true);
    console.log('  ✓ 10. Mobile viewport passed!\n');

    await send('Emulation.clearDeviceMetricsOverride');

    // 11. Zero console errors
    console.log('11. Checking for zero console errors and exceptions...');
    const criticalErrors = pageErrors.concat(
      consoleLogs.filter((l) => l.type === 'error' && !l.text.includes('favicon'))
    );
    console.log(`  Captured errors: ${criticalErrors.length}`);
    assert.strictEqual(criticalErrors.length, 0, 'Zero console errors expected');
    console.log('  ✓ 11. Zero console errors passed!\n');

    console.log('=== REAL CHROME PERCENTAGE CALCULATOR TEST: ALL PASS ===');
  } finally {
    try { chrome.kill('SIGKILL'); } catch {}
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n*** CHROME TEST FAILED ***\n', err);
  process.exit(1);
});
