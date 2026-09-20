/**
 * Real Google Chrome automated browser test suite for Phase 3.7 EMI Calculator
 * Tests via Chrome DevTools Protocol (CDP) on dedicated port 9341.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser EMI Calculator Validation ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9341',
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
          http.get('http://127.0.0.1:9341/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9341 within 6 seconds');
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

    // 1. Navigate to EMI Calculator route
    console.log('1. Navigating to /emi-calculator...');
    await send('Page.navigate', { url: `${BASE_URL}/emi-calculator` });
    await new Promise((r) => setTimeout(r, 1200));

    const pageTitle = await evalScript('document.title');
    console.log(`   Page title: "${pageTitle}"`);
    assert.ok(pageTitle.includes('EMI Calculator'), 'Title should contain EMI Calculator');

    // Helper to simulate React input event
    const setInputValueScript = `
      function setReactInputValue(input, value) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `;

    // 2. Verify Initial Default Values (₹5,00,000, 10%, 5 years)
    console.log('2. Verifying Default Benchmark (₹5,00,000, 10%, 5 years)...');
    const defaultVals = await evalScript(`
      (() => {
        const monthly = document.getElementById('emi-result-monthly')?.textContent?.trim();
        const principal = document.getElementById('emi-result-principal')?.textContent?.trim();
        const interest = document.getElementById('emi-result-interest')?.textContent?.trim();
        const total = document.getElementById('emi-result-total')?.textContent?.trim();
        return { monthly, principal, interest, total };
      })()
    `);
    console.log(`   Monthly EMI: ${defaultVals.monthly}`);
    console.log(`   Principal: ${defaultVals.principal}`);
    console.log(`   Interest: ${defaultVals.interest}`);
    console.log(`   Total: ${defaultVals.total}`);
    assert.ok(defaultVals.monthly.includes('10,624') || defaultVals.monthly.includes('10,623'), `Expected EMI ~10,624, got ${defaultVals.monthly}`);
    assert.ok(defaultVals.interest.includes('1,37,411') || defaultVals.interest.includes('137,411'), `Expected interest ~1,37,411, got ${defaultVals.interest}`);
    console.log('   ✓ Default benchmark verified with precision.');

    // 3. Test Switching Tenure Unit to Months
    console.log('3. Testing Tenure Unit Switch to Months...');
    await evalScript(`document.getElementById('emi-unit-months').click();`);
    await new Promise((r) => setTimeout(r, 200));
    const monthsSwitch = await evalScript(`
      (() => {
        return {
          monthly: document.getElementById('emi-result-monthly')?.textContent?.trim(),
          isMonthsActive: document.getElementById('emi-unit-months')?.classList?.contains('active')
        };
      })()
    `);
    assert.ok(monthsSwitch.isMonthsActive, 'Months toggle should be active');
    console.log(`   ✓ Switched to months, calculated monthly for 5 months: ${monthsSwitch.monthly}`);

    // Switch back to years
    await evalScript(`document.getElementById('emi-unit-years').click();`);
    await new Promise((r) => setTimeout(r, 200));

    // 4. Test 0% Interest Rate
    console.log('4. Testing 0% Interest Rate...');
    await evalScript(`
      ${setInputValueScript}
      const rateInput = document.getElementById('emi-interest-rate');
      setReactInputValue(rateInput, '0');
    `);
    await new Promise((r) => setTimeout(r, 200));
    const zeroInterestResult = await evalScript(`
      (() => {
        const monthly = document.getElementById('emi-result-monthly')?.textContent?.trim();
        const interest = document.getElementById('emi-result-interest')?.textContent?.trim();
        const total = document.getElementById('emi-result-total')?.textContent?.trim();
        return { monthly, interest, total };
      })()
    `);
    console.log(`   0% Rate - Monthly: ${zeroInterestResult.monthly}, Interest: ${zeroInterestResult.interest}, Total: ${zeroInterestResult.total}`);
    // 500000 / 60 = 8333.33
    assert.ok(zeroInterestResult.monthly.includes('8,333') || zeroInterestResult.monthly.includes('8333'), `Expected ~8333, got ${zeroInterestResult.monthly}`);
    assert.ok(zeroInterestResult.interest.includes('0'), `Expected 0 interest, got ${zeroInterestResult.interest}`);
    console.log('   ✓ 0% Interest Rate handled properly without division by zero.');

    // 5. Test Quick Preset Button
    console.log('5. Testing Quick Preset ("Home Loan")...');
    await evalScript(`
      const buttons = Array.from(document.querySelectorAll('.emi-preset-chip'));
      const homeLoanBtn = buttons.find(b => b.textContent.includes('Home Loan'));
      if (homeLoanBtn) homeLoanBtn.click();
    `);
    await new Promise((r) => setTimeout(r, 300));
    const presetResult = await evalScript(`
      (() => {
        const p = document.getElementById('emi-loan-amount')?.value;
        const r = document.getElementById('emi-interest-rate')?.value;
        const t = document.getElementById('emi-tenure')?.value;
        const monthly = document.getElementById('emi-result-monthly')?.textContent?.trim();
        return { p, r, t, monthly };
      })()
    `);
    console.log(`   Preset Applied -> Amount: ${presetResult.p}, Rate: ${presetResult.r}%, Tenure: ${presetResult.t} yrs, EMI: ${presetResult.monthly}`);
    assert.strictEqual(presetResult.p, '3000000', 'Preset principal should be 3000000');
    assert.strictEqual(presetResult.r, '8.5', 'Preset rate should be 8.5%');
    console.log('   ✓ Preset applied and recalculated successfully.');

    // 6. Test Error Handling (Invalid Principal)
    console.log('6. Testing Invalid Principal Error...');
    await evalScript(`
      ${setInputValueScript}
      const loanInput = document.getElementById('emi-loan-amount');
      setReactInputValue(loanInput, '-5000');
    `);
    await new Promise((r) => setTimeout(r, 200));
    const errorState = await evalScript(`
      (() => {
        const errorAlert = document.getElementById('emi-error-msg')?.textContent?.trim();
        const monthly = document.getElementById('emi-result-monthly')?.textContent?.trim();
        return { errorAlert, monthly };
      })()
    `);
    assert.ok(errorState.errorAlert && errorState.errorAlert.length > 0, 'Error alert should be visible for negative loan amount');
    assert.strictEqual(errorState.monthly, '—', 'Monthly EMI should be dash on error');
    console.log(`   ✓ Error handled: "${errorState.errorAlert}"`);

    // 7. Test Reset Button
    console.log('7. Testing Reset button...');
    await evalScript(`document.getElementById('emi-reset-btn').click();`);
    await new Promise((r) => setTimeout(r, 300));
    const resetState = await evalScript(`
      (() => {
        const p = document.getElementById('emi-loan-amount')?.value;
        const r = document.getElementById('emi-interest-rate')?.value;
        const t = document.getElementById('emi-tenure')?.value;
        const errorMsg = document.getElementById('emi-error-msg');
        return { p, r, t, hasError: !!errorMsg };
      })()
    `);
    assert.strictEqual(resetState.p, '500000', 'Principal reset to 500000');
    assert.strictEqual(resetState.r, '10', 'Rate reset to 10%');
    assert.strictEqual(resetState.t, '5', 'Tenure reset to 5');
    assert.strictEqual(resetState.hasError, false, 'Error message should be cleared');
    console.log('   ✓ Reset button successfully restored defaults.');

    // 8. Test Copy Calculation Summary
    console.log('8. Testing Copy Calculation button...');
    const copyResult = await evalScript(`
      (() => {
        const copyBtn = document.getElementById('emi-copy-btn');
        if (!copyBtn) return { found: false };
        copyBtn.click();
        return { found: true };
      })()
    `);
    assert.ok(copyResult.found, 'Copy button should exist and be clickable');
    console.log('   ✓ Copy button clicked.');

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
        const inputCard = document.querySelector('.emi-input-card');
        const resultsCard = document.querySelector('.emi-results-card');
        return {
          overflowX: document.documentElement.scrollWidth > window.innerWidth,
          inputCardWidth: inputCard?.getBoundingClientRect()?.width,
          resultsCardWidth: resultsCard?.getBoundingClientRect()?.width,
          windowWidth: window.innerWidth
        };
      })()
    `);
    console.log(`   Mobile metrics:`, mobileMetrics);
    assert.ok(!mobileMetrics.overflowX, 'Page must not have horizontal overflow on mobile');
    assert.ok(mobileMetrics.inputCardWidth > 280, 'Input card should fit mobile width');
    console.log(`   ✓ Mobile layout confirmed: width ${mobileMetrics.inputCardWidth}px within ${mobileMetrics.windowWidth}px, no horizontal scroll.`);

    // 10. Check Console Errors
    console.log('10. Checking Console Errors...');
    const fatalErrors = pageErrors.filter((e) => !e.text?.includes('favicon'));
    assert.strictEqual(fatalErrors.length, 0, `Expected 0 page errors, found ${fatalErrors.length}`);
    console.log('   ✓ 0 runtime page errors detected.');

    console.log('\n=== REAL CHROME EMI CALCULATOR VALIDATION: ALL 10 TESTS PASSED ===\n');
    ws.close();
  } finally {
    chrome.kill('SIGTERM');
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n❌ Browser Validation Failed:', err);
  process.exit(1);
});
