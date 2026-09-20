/**
 * Real Google Chrome automated browser test suite for Phase 3.1 QR Code Generator
 * Incorporates UX Patch: Empty Preview Placeholder & SVG Button Visibility
 * Uses Chrome DevTools Protocol (CDP) on port 9335.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/qr-code-generator';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser QR Code Generator Validation (UX Patch) ===\n');

  // Launch headless Chrome
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9335',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    DEV_SERVER_URL
  ]);

  try {
    await new Promise((r) => setTimeout(r, 2000));

    const targets = await new Promise((resolve, reject) => {
      http.get('http://127.0.0.1:9335/json/list', (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No Chrome page target found');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

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

    // Wait for React app to mount
    for (let i = 0; i < 50; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.qr-app-layout')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log('1. Verifying initial page load, SEO title, and layout...');
    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        title: document.title,
        heading: document.querySelector('.tool-title')?.textContent,
        badge: document.querySelector('.tool-badge')?.textContent,
        badgeFormat: document.querySelector('.tool-badge-format')?.textContent,
        hasLayout: !!document.querySelector('.qr-app-layout')
      })`
    });
    console.log('  Page Info:', pageInfo.result.value);
    assert.ok(pageInfo.result.value.title.includes('QR Code Generator'));
    assert.strictEqual(pageInfo.result.value.heading, 'QR Code Generator Online');
    assert.strictEqual(pageInfo.result.value.badge, 'Phase 3 · Generator');
    assert.strictEqual(pageInfo.result.value.badgeFormat, 'QR · SVG + PNG');
    assert.strictEqual(pageInfo.result.value.hasLayout, true);

    // TEST A: OPEN /qr-code-generator WITH EMPTY CONTENT
    console.log('\n2. TEST A: Open with empty content (Placeholder verification)...');
    const emptyStateInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasPlaceholder: !!document.querySelector('.qr-placeholder-container'),
        hasPlaceholderSvg: !!document.querySelector('.qr-placeholder-svg'),
        instructionText: document.querySelector('.placeholder-hint-text')?.textContent?.trim(),
        centerOverlayText: document.querySelector('.qr-placeholder-svg text')?.textContent?.trim(),
        hasRealSvg: !!document.querySelector('.qr-code-preview-wrap svg'),
        hasScannableBadge: !!document.querySelector('.qr-scan-badge-strip'),
        isPngDisabled: document.getElementById('download-png-btn')?.disabled,
        isSvgDisabled: document.getElementById('download-svg-btn')?.disabled,
        isCopyContentDisabled: document.getElementById('copy-content-btn')?.disabled,
        isCopySvgDisabled: document.getElementById('copy-svg-btn')?.disabled
      })`
    });
    console.log('  TEST A Result:', emptyStateInfo.result.value);
    assert.strictEqual(emptyStateInfo.result.value.hasPlaceholder, true, 'Placeholder container must be visible');
    assert.strictEqual(emptyStateInfo.result.value.hasPlaceholderSvg, true, 'Placeholder SVG graphic must be visible');
    assert.strictEqual(emptyStateInfo.result.value.instructionText, 'Enter content to generate your QR code');
    assert.strictEqual(emptyStateInfo.result.value.centerOverlayText, 'Your QR code will appear here');
    assert.strictEqual(emptyStateInfo.result.value.hasRealSvg, false, 'Real QR code must NOT be present when empty');
    assert.strictEqual(emptyStateInfo.result.value.hasScannableBadge, false, 'Scannability badge must NOT be displayed when empty');
    assert.strictEqual(emptyStateInfo.result.value.isPngDisabled, true, 'PNG download must be disabled when empty');
    assert.strictEqual(emptyStateInfo.result.value.isSvgDisabled, true, 'SVG download must be disabled when empty');
    assert.strictEqual(emptyStateInfo.result.value.isCopyContentDisabled, true, 'Copy content must be disabled when empty');
    assert.strictEqual(emptyStateInfo.result.value.isCopySvgDisabled, true, 'Copy SVG must be disabled when empty');
    console.log('  ✓ TEST A Passed!');

    // TEST B: TYPE "Hello World" -> PLACEHOLDER TRANSITIONS TO REAL QR
    console.log('\n3. TEST B: Type "Hello World" -> Placeholder transitions to real QR...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('tab-text').click();`
    });
    await new Promise((r) => setTimeout(r, 150));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.getElementById('qr-input-text');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, 'Hello World');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });

    // Wait for debounce and asynchronous jsQR camera verification
    for (let i = 0; i < 20; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.scan-verified-badge')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const realQrInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasPlaceholder: !!document.querySelector('.qr-placeholder-container'),
        hasRealSvg: !!document.querySelector('.qr-code-preview-wrap svg'),
        encodedText: document.querySelector('.inspector-code')?.textContent?.trim(),
        hasScannableBadge: !!document.querySelector('.scan-verified-badge'),
        isPngDisabled: document.getElementById('download-png-btn')?.disabled,
        isSvgDisabled: document.getElementById('download-svg-btn')?.disabled,
        isCopyContentDisabled: document.getElementById('copy-content-btn')?.disabled,
        isCopySvgDisabled: document.getElementById('copy-svg-btn')?.disabled
      })`
    });
    console.log('  TEST B Result:', realQrInfo.result.value);
    assert.strictEqual(realQrInfo.result.value.hasPlaceholder, false, 'Placeholder must be removed after typing');
    assert.strictEqual(realQrInfo.result.value.hasRealSvg, true, 'Real QR SVG must be rendered');
    assert.strictEqual(realQrInfo.result.value.encodedText, 'Hello World');
    assert.strictEqual(realQrInfo.result.value.hasScannableBadge, true, 'Scannability badge must appear');
    assert.strictEqual(realQrInfo.result.value.isPngDisabled, false, 'PNG download must be enabled');
    assert.strictEqual(realQrInfo.result.value.isSvgDisabled, false, 'SVG download must be enabled');
    assert.strictEqual(realQrInfo.result.value.isCopyContentDisabled, false, 'Copy content must be enabled');
    assert.strictEqual(realQrInfo.result.value.isCopySvgDisabled, false, 'Copy SVG must be enabled');
    console.log('  ✓ TEST B Passed!');

    // TEST C: SVG BUTTON VISIBILITY & DOWNLOAD
    console.log('\n4. TEST C: SVG Download Button Visibility & Vector SVG Integrity...');
    const svgBtnStyles = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const btn = document.getElementById('download-svg-btn');
        const computed = window.getComputedStyle(btn);
        return {
          text: btn.textContent.trim(),
          color: computed.color,
          backgroundColor: computed.backgroundColor,
          borderWidth: computed.borderWidth || computed.borderTopWidth,
          borderStyle: computed.borderStyle || computed.borderTopStyle,
          borderColor: computed.borderColor || computed.borderTopColor,
          cursor: computed.cursor,
          opacity: computed.opacity,
          isVisible: computed.display !== 'none' && computed.visibility !== 'hidden'
        };
      })()`
    });
    console.log('  SVG Button Computed Styles:', svgBtnStyles.result.value);
    assert.ok(svgBtnStyles.result.value.text.includes('Vector SVG'), 'Label must contain "Vector SVG"');
    assert.strictEqual(svgBtnStyles.result.value.isVisible, true, 'Button must be visible');
    assert.strictEqual(svgBtnStyles.result.value.cursor, 'pointer', 'Enabled button must have pointer cursor');
    assert.strictEqual(svgBtnStyles.result.value.borderStyle, 'solid', 'Button must have solid visible border');

    // Trigger SVG generation and verify clean vector XML
    const vectorSvgCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const svgEl = document.querySelector('.qr-code-preview-wrap svg');
        const serialized = new XMLSerializer().serializeToString(svgEl);
        return {
          isXml: serialized.startsWith('<svg'),
          containsRects: serialized.includes('<rect'),
          hasNoRasterImages: !serialized.includes('<image'),
          length: serialized.length
        };
      })()`
    });
    console.log('  Vector SVG Verification:', vectorSvgCheck.result.value);
    assert.strictEqual(vectorSvgCheck.result.value.isXml, true);
    assert.strictEqual(vectorSvgCheck.result.value.containsRects, true);
    assert.strictEqual(vectorSvgCheck.result.value.hasNoRasterImages, true);
    console.log('  ✓ TEST C Passed!');

    // TEST D: CLEAR THE INPUT -> RETURN TO PLACEHOLDER STATE
    console.log('\n5. TEST D: Clear input -> Return to placeholder state immediately...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.getElementById('qr-input-text');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, '');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });

    await new Promise((r) => setTimeout(r, 100));

    const clearedState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasPlaceholder: !!document.querySelector('.qr-placeholder-container'),
        hasRealSvg: !!document.querySelector('.qr-code-preview-wrap svg'),
        hasScannableBadge: !!document.querySelector('.qr-scan-badge-strip'),
        isPngDisabled: document.getElementById('download-png-btn')?.disabled,
        isSvgDisabled: document.getElementById('download-svg-btn')?.disabled,
        isCopyContentDisabled: document.getElementById('copy-content-btn')?.disabled,
        isCopySvgDisabled: document.getElementById('copy-svg-btn')?.disabled
      })`
    });
    console.log('  TEST D Result (Cleared State):', clearedState.result.value);
    assert.strictEqual(clearedState.result.value.hasPlaceholder, true, 'Placeholder must return when input is cleared');
    assert.strictEqual(clearedState.result.value.hasRealSvg, false, 'Real QR must disappear');
    assert.strictEqual(clearedState.result.value.hasScannableBadge, false, 'Scannability badge must disappear');
    assert.strictEqual(clearedState.result.value.isPngDisabled, true, 'PNG download must be disabled');
    assert.strictEqual(clearedState.result.value.isSvgDisabled, true, 'SVG download must be disabled');
    console.log('  ✓ TEST D Passed!');

    // TEST E: ENTER A DIFFERENT VALUE -> NEW ACTUAL QR GENERATION
    console.log('\n6. TEST E: Enter different value (Wi-Fi) -> New actual QR generated...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('tab-wifi').click();`
    });
    await new Promise((r) => setTimeout(r, 150));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const ssidInput = document.getElementById('qr-input-ssid');
        const passInput = document.getElementById('qr-input-wifi-pass');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        setter.call(ssidInput, 'Office_Mesh_5G');
        ssidInput.dispatchEvent(new Event('input', { bubbles: true }));
        ssidInput.dispatchEvent(new Event('change', { bubbles: true }));

        setter.call(passInput, 'CorporateKey#2026');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });

    for (let i = 0; i < 20; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.scan-verified-badge')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const newQrState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasRealSvg: !!document.querySelector('.qr-code-preview-wrap svg'),
        encodedText: document.querySelector('.inspector-code')?.textContent?.trim(),
        hasVerifiedBadge: !!document.querySelector('.scan-verified-badge'),
        isSvgEnabled: !document.getElementById('download-svg-btn')?.disabled
      })`
    });
    console.log('  TEST E Result (New QR):', newQrState.result.value);
    assert.strictEqual(newQrState.result.value.hasRealSvg, true);
    assert.strictEqual(newQrState.result.value.encodedText, 'WIFI:T:WPA;S:Office_Mesh_5G;P:CorporateKey#2026;H:false;;');
    assert.strictEqual(newQrState.result.value.hasVerifiedBadge, true);
    assert.strictEqual(newQrState.result.value.isSvgEnabled, true);
    console.log('  ✓ TEST E Passed!');

    // TEST 7: APPEARANCE CUSTOMIZATION & PALETTE
    console.log('\n7. Testing appearance customization (Dots & Custom Color)...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('style-module-dots').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    await send('Runtime.evaluate', {
      expression: `document.getElementById('style-eye-circle').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    const dotsEyeQr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        circleCount: document.querySelectorAll('.qr-code-preview-wrap svg circle').length,
        hasSvg: !!document.querySelector('.qr-code-preview-wrap svg')
      })`
    });
    console.log('  Dots & Circle Eye QR:', dotsEyeQr.result.value);
    assert.ok(dotsEyeQr.result.value.circleCount > 20);
    console.log('  ✓ Appearance customization passed!');

    // TEST 8: MOBILE VIEWPORT (375x812 iPhone X)
    console.log('\n8. Checking Mobile Viewport (375x812) for layout & no overflow...');
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
        hasPreview: !!document.querySelector('.qr-preview-stage')
      })`
    });
    console.log('  Mobile Check:', mobileCheck.result.value);
    assert.strictEqual(mobileCheck.result.value.hasHorizontalOverflow, false, 'Must not overflow horizontally on mobile');
    assert.strictEqual(mobileCheck.result.value.hasPreview, true);
    console.log('  ✓ Mobile viewport test passed!');

    // TEST 9: CONSOLE ERRORS
    console.log('\n9. Verifying zero unhandled console errors...');
    const criticalErrors = pageErrors.concat(
      consoleLogs.filter((l) => l.type === 'error' && !l.text.includes('favicon'))
    );
    console.log(`  Critical console errors: ${criticalErrors.length}`);
    assert.strictEqual(criticalErrors.length, 0);
    console.log('  ✓ Zero console errors verified!');

    console.log('\n=== REAL CHROME VALIDATION COMPLETE: ALL PASS ===');
  } finally {
    chrome.kill('SIGKILL');
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n*** BROWSER VALIDATION FAILED ***\n', err);
  process.exit(1);
});
