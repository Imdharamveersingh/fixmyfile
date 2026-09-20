/**
 * Real Google Chrome automated browser test suite for Phase 3.3 Currency Converter
 * Tests via Chrome DevTools Protocol (CDP) on dedicated port 9337.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Currency Converter Validation ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9337',
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
          http.get('http://127.0.0.1:9337/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9337 within 6 seconds');
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
    console.log('1. Verifying homepage card and navigating to /currency-converter...');
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('a[href="/currency-converter"]')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    await send('Runtime.evaluate', {
      expression: `document.querySelector('a[href="/currency-converter"]').click();`
    });

    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.currency-app-layout')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        url: window.location.pathname,
        title: document.title,
        heading: document.querySelector('#currency-tool-title')?.textContent,
        badge: document.querySelector('.tool-badge')?.textContent,
        hasLayout: !!document.querySelector('.currency-app-layout')
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.strictEqual(pageInfo.result.value.url, '/currency-converter');
    assert.match(pageInfo.result.value.title, /Currency Converter/i);
    assert.strictEqual(pageInfo.result.value.heading, 'Currency Converter Online');
    assert.strictEqual(pageInfo.result.value.badge, 'Phase 3 · Calculator');
    assert.strictEqual(pageInfo.result.value.hasLayout, true);
    console.log('  ✓ 1. Navigation & Page Load passed!\n');

    // Clipboard stub
    await send('Runtime.evaluate', {
      expression: `
        window.__lastCopied = '';
        if (!navigator.clipboard) navigator.clipboard = {};
        navigator.clipboard.writeText = async (text) => { window.__lastCopied = text; return true; };
      `
    });

    // 2. Default conversion: 100 USD -> INR
    console.log('2. Testing default conversion (100 USD to INR)...');
    // Wait for rates to resolve
    await new Promise((r) => setTimeout(r, 800));

    const defaultConversion = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        amount: document.querySelector('#currency-amount-input')?.value,
        from: document.querySelector('#currency-from-select')?.value,
        to: document.querySelector('#currency-to-select')?.value,
        resultNumber: document.querySelector('.result-number')?.textContent,
        resultSymbol: document.querySelector('.result-symbol')?.textContent,
        resultCode: document.querySelector('.result-code')?.textContent,
        unitRate: document.querySelector('#currency-unit-rate')?.textContent,
        rateSource: document.querySelector('#currency-rate-source')?.textContent
      })`
    });
    console.log('  Default Conversion:', defaultConversion.result.value);
    assert.strictEqual(defaultConversion.result.value.amount, '100');
    assert.strictEqual(defaultConversion.result.value.from, 'USD');
    assert.strictEqual(defaultConversion.result.value.to, 'INR');
    assert.ok(defaultConversion.result.value.resultNumber, 'Result number must exist');
    assert.strictEqual(defaultConversion.result.value.resultSymbol, '₹');
    assert.strictEqual(defaultConversion.result.value.resultCode, 'INR');
    assert.match(defaultConversion.result.value.unitRate, /1 USD = .* INR/);
    console.log('  ✓ 2. Default conversion passed!\n');

    // Helper to set input value
    async function setAmount(val) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const input = document.querySelector('#currency-amount-input');
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, ${JSON.stringify(val)});
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()`
      });
      await new Promise((r) => setTimeout(r, 100));
    }

    // 3. Decimal conversion: 49.99 USD
    console.log('3. Testing decimal input (49.99)...');
    await setAmount('49.99');
    const decimalState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        resultNumber: document.querySelector('.result-number')?.textContent
      })`
    });
    console.log('  Decimal Result:', decimalState.result.value);
    assert.ok(decimalState.result.value.resultNumber);
    console.log('  ✓ 3. Decimal input passed!\n');

    // 4. Currency change: EUR to GBP
    console.log('4. Testing currency selection change (EUR -> GBP)...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const fromSel = document.querySelector('#currency-from-select');
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(fromSel, 'EUR');
        fromSel.dispatchEvent(new Event('change', { bubbles: true }));

        const toSel = document.querySelector('#currency-to-select');
        Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(toSel, 'GBP');
        toSel.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 100));

    const eurToGbp = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        from: document.querySelector('#currency-from-select')?.value,
        to: document.querySelector('#currency-to-select')?.value,
        resultSymbol: document.querySelector('.result-symbol')?.textContent,
        resultCode: document.querySelector('.result-code')?.textContent,
        unitRate: document.querySelector('#currency-unit-rate')?.textContent
      })`
    });
    console.log('  EUR -> GBP State:', eurToGbp.result.value);
    assert.strictEqual(eurToGbp.result.value.from, 'EUR');
    assert.strictEqual(eurToGbp.result.value.to, 'GBP');
    assert.strictEqual(eurToGbp.result.value.resultSymbol, '£');
    assert.strictEqual(eurToGbp.result.value.resultCode, 'GBP');
    assert.match(eurToGbp.result.value.unitRate, /1 EUR = .* GBP/);
    console.log('  ✓ 4. Currency change passed!\n');

    // 5. Swap button (GBP becomes From, EUR becomes To)
    console.log('5. Testing currency swap button...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#currency-swap-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const swapped = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        from: document.querySelector('#currency-from-select')?.value,
        to: document.querySelector('#currency-to-select')?.value,
        resultSymbol: document.querySelector('.result-symbol')?.textContent,
        resultCode: document.querySelector('.result-code')?.textContent
      })`
    });
    console.log('  Swapped State:', swapped.result.value);
    assert.strictEqual(swapped.result.value.from, 'GBP');
    assert.strictEqual(swapped.result.value.to, 'EUR');
    assert.strictEqual(swapped.result.value.resultSymbol, '€');
    assert.strictEqual(swapped.result.value.resultCode, 'EUR');
    console.log('  ✓ 5. Swap button passed!\n');

    // 6. Validation error: Negative input
    console.log('6. Testing validation on invalid negative input (-100)...');
    await setAmount('-100');
    const negativeState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasError: !!document.querySelector('#currency-validation-error'),
        errorText: document.querySelector('#currency-validation-error')?.textContent,
        hasResult: !!document.querySelector('.result-number')
      })`
    });
    console.log('  Negative Input State:', negativeState.result.value);
    assert.strictEqual(negativeState.result.value.hasError, true);
    assert.match(negativeState.result.value.errorText, /cannot be negative/i);
    assert.strictEqual(negativeState.result.value.hasResult, false);
    console.log('  ✓ 6. Negative input validation passed!\n');

    // 7. Empty input: Placeholder shown
    console.log('7. Testing empty input state...');
    await setAmount('');
    const emptyState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasPlaceholder: !!document.querySelector('.result-empty-placeholder'),
        placeholderText: document.querySelector('.empty-hint')?.textContent,
        copyDisabled: document.querySelector('#copy-result-btn')?.disabled
      })`
    });
    console.log('  Empty Input State:', emptyState.result.value);
    assert.strictEqual(emptyState.result.value.hasPlaceholder, true);
    assert.match(emptyState.result.value.placeholderText, /Enter an amount/i);
    assert.strictEqual(emptyState.result.value.copyDisabled, true);
    console.log('  ✓ 7. Empty input passed!\n');

    // 8. Copy result
    console.log('8. Testing Copy Result...');
    await setAmount('250');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#copy-result-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const copyCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        copiedText: window.__lastCopied,
        btnText: document.querySelector('#copy-result-btn')?.textContent
      })`
    });
    console.log('  Copy Check:', copyCheck.result.value);
    assert.match(copyCheck.result.value.copiedText, /250 GBP = .* EUR/);
    assert.match(copyCheck.result.value.btnText, /Copied!/i);
    console.log('  ✓ 8. Copy result passed!\n');

    // 9. Reset button
    console.log('9. Testing Reset button...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#currency-reset-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const resetCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        amount: document.querySelector('#currency-amount-input')?.value,
        from: document.querySelector('#currency-from-select')?.value,
        to: document.querySelector('#currency-to-select')?.value,
        resultSymbol: document.querySelector('.result-symbol')?.textContent,
        resultCode: document.querySelector('.result-code')?.textContent
      })`
    });
    console.log('  Reset State:', resetCheck.result.value);
    assert.strictEqual(resetCheck.result.value.amount, '100');
    assert.strictEqual(resetCheck.result.value.from, 'USD');
    assert.strictEqual(resetCheck.result.value.to, 'INR');
    assert.strictEqual(resetCheck.result.value.resultSymbol, '₹');
    assert.strictEqual(resetCheck.result.value.resultCode, 'INR');
    console.log('  ✓ 9. Reset button passed!\n');

    // 10. Mobile viewport (375x812)
    console.log('10. Testing mobile responsiveness (375x812)...');
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
        hasCard: !!document.querySelector('.currency-card')
      })`
    });
    console.log('  Mobile Check:', mobileCheck.result.value);
    assert.strictEqual(mobileCheck.result.value.hasHorizontalOverflow, false, 'No horizontal overflow on mobile');
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

    console.log('=== REAL CHROME CURRENCY CONVERTER TEST: ALL PASS ===');
  } finally {
    try { chrome.kill('SIGKILL'); } catch {}
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n*** CHROME TEST FAILED ***\n', err);
  process.exit(1);
});
