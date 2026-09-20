/**
 * Real Google Chrome automated browser test suite for Phase 3.5 Password Generator
 * Tests via Chrome DevTools Protocol (CDP) on dedicated port 9339.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Password Generator Validation ===\n');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9339',
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
          http.get('http://127.0.0.1:9339/json/list', (res) => {
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
      throw new Error('Chrome did not open remote debugging port 9339 within 6 seconds');
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
    console.log('1. Navigating to /password-generator...');
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('a[href="/password-generator"]')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    await send('Runtime.evaluate', {
      expression: `document.querySelector('a[href="/password-generator"]').click();`
    });

    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.password-app-layout')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        url: window.location.pathname,
        title: document.title,
        heading: document.querySelector('#password-tool-title')?.textContent,
        badge: document.querySelector('.tool-badge')?.textContent,
        hasLayout: !!document.querySelector('.password-app-layout')
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.strictEqual(pageInfo.result.value.url, '/password-generator');
    assert.match(pageInfo.result.value.title, /Password Generator/i);
    assert.strictEqual(pageInfo.result.value.heading, 'Password Generator Online');
    assert.strictEqual(pageInfo.result.value.badge, 'Phase 3 · Security');
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

    // 2. Default password generation
    console.log('2. Testing default password generation (16 chars)...');
    const defaultState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        password: document.querySelector('#generated-password-display')?.textContent?.trim(),
        strength: document.querySelector('#password-strength-label')?.textContent?.trim()
      })`
    });
    console.log('  Default Password State:', defaultState.result.value);
    assert.strictEqual(defaultState.result.value.password.length, 16);
    assert.ok(defaultState.result.value.strength, 'Strength label must exist');
    console.log('  ✓ 2. Default generation passed!\n');

    // 3. Length change: slider to 24 chars
    console.log('3. Testing password length change to 24...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const slider = document.querySelector('#password-length-slider');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(slider, '24');
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 100));

    const length24 = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        password: document.querySelector('#generated-password-display')?.textContent?.trim(),
        lengthInput: document.querySelector('#password-length-input')?.value
      })`
    });
    console.log('  Length 24 State:', length24.result.value);
    assert.strictEqual(length24.result.value.password.length, 24);
    assert.strictEqual(length24.result.value.lengthInput, '24');
    console.log('  ✓ 3. Length change passed!\n');

    // 4. Character Set toggles & Error state
    console.log('4. Testing character set toggle off until empty error...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('#chk-uppercase').click();
        document.querySelector('#chk-lowercase').click();
        document.querySelector('#chk-numbers').click();
        document.querySelector('#chk-symbols').click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 100));

    const errorState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasError: !!document.querySelector('#password-error-banner'),
        errorText: document.querySelector('#password-error-banner')?.textContent,
        copyDisabled: document.querySelector('#copy-password-btn')?.disabled
      })`
    });
    console.log('  Error State:', errorState.result.value);
    assert.strictEqual(errorState.result.value.hasError, true);
    assert.match(errorState.result.value.errorText, /select at least one character set/i);
    assert.strictEqual(errorState.result.value.copyDisabled, true);
    console.log('  ✓ 4. Character set empty error passed!\n');

    // 5. Re-enable character sets and test regeneration
    console.log('5. Re-enabling character sets and testing regeneration...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        document.querySelector('#chk-uppercase').click();
        document.querySelector('#chk-lowercase').click();
        document.querySelector('#chk-numbers').click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 100));

    const passBefore = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelector('#generated-password-display')?.textContent?.trim()`
    });

    await send('Runtime.evaluate', {
      expression: `document.querySelector('#regenerate-password-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const passAfter = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `document.querySelector('#generated-password-display')?.textContent?.trim()`
    });
    console.log(`  Pass Before: ${passBefore.result.value}`);
    console.log(`  Pass After:  ${passAfter.result.value}`);
    assert.notStrictEqual(passBefore.result.value, passAfter.result.value, 'Regenerate must produce new value');
    console.log('  ✓ 5. Regeneration passed!\n');

    // 6. Copy password action
    console.log('6. Testing Copy password action...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#copy-password-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const copyCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        copiedText: window.__lastCopied,
        displayedPassword: document.querySelector('#generated-password-display')?.textContent?.trim()
      })`
    });
    console.log('  Copy Check:', copyCheck.result.value);
    assert.strictEqual(copyCheck.result.value.copiedText, copyCheck.result.value.displayedPassword);
    console.log('  ✓ 6. Copy action passed!\n');

    // 7. Reset action
    console.log('7. Testing Reset action...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#reset-password-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const resetCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        length: document.querySelector('#password-length-slider')?.value,
        uppercase: document.querySelector('#chk-uppercase')?.checked,
        symbols: document.querySelector('#chk-symbols')?.checked
      })`
    });
    console.log('  Reset State:', resetCheck.result.value);
    assert.strictEqual(resetCheck.result.value.length, '16');
    assert.strictEqual(resetCheck.result.value.uppercase, true);
    assert.strictEqual(resetCheck.result.value.symbols, true);
    console.log('  ✓ 7. Reset action passed!\n');

    // 8. Mobile viewport (375x812)
    console.log('8. Testing mobile responsive viewport...');
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
        hasCard: !!document.querySelector('.password-card')
      })`
    });
    console.log('  Mobile Check:', mobileCheck.result.value);
    assert.strictEqual(mobileCheck.result.value.hasHorizontalOverflow, false);
    assert.strictEqual(mobileCheck.result.value.hasCard, true);
    console.log('  ✓ 8. Mobile viewport passed!\n');

    await send('Emulation.clearDeviceMetricsOverride');

    // 9. Zero console errors
    console.log('9. Checking for zero console errors and exceptions...');
    const criticalErrors = pageErrors.concat(
      consoleLogs.filter((l) => l.type === 'error' && !l.text.includes('favicon'))
    );
    console.log(`  Captured errors: ${criticalErrors.length}`);
    assert.strictEqual(criticalErrors.length, 0, 'Zero console errors expected');
    console.log('  ✓ 9. Zero console errors passed!\n');

    console.log('=== REAL CHROME PASSWORD GENERATOR TEST: ALL PASS ===');
  } finally {
    try { chrome.kill('SIGKILL'); } catch {}
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n*** CHROME TEST FAILED ***\n', err);
  process.exit(1);
});
