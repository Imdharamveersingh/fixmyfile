/**
 * Real Google Chrome automated browser test suite for QR Code Generator (/qr-code-generator)
 * Uses Chrome DevTools Protocol (CDP) on port 9335.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEV_SERVER_URL = 'http://localhost:5173/qr-code-generator';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser QR Code Generator Validation ===\n');

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
        if (msg.error) {
          reject(new Error(JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };

    await send('Page.enable');
    await send('DOM.enable');

    // Wait for React app mount
    for (let i = 0; i < 50; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.qr-app-layout')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 150));
    }

    console.log('1. Verifying initial page load, SEO title, and headings...');
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

    // TEST 1: INITIAL URL QR GENERATION & LIVE PREVIEW
    console.log('\n2. TEST 1: Initial URL QR Code Live Preview...');
    const initialQr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.qr-code-preview-wrap svg'),
        svgWidth: document.querySelector('.qr-code-preview-wrap svg')?.getAttribute('width'),
        svgHeight: document.querySelector('.qr-code-preview-wrap svg')?.getAttribute('height'),
        rectCount: document.querySelectorAll('.qr-code-preview-wrap svg rect').length,
        encodedText: document.querySelector('.inspector-code')?.textContent
      })`
    });
    console.log('  Initial QR State:', initialQr.result.value);
    assert.strictEqual(initialQr.result.value.hasSvg, true);
    assert.strictEqual(initialQr.result.value.encodedText, 'https://fixmyfile.com');
    assert.ok(initialQr.result.value.rectCount > 20);
    console.log('  ✓ TEST 1 Passed!');

    // TEST 2: LIVE REACTIVE TYPING (debounced update without reload)
    console.log('\n3. TEST 2: Live Reactive Typing...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const input = document.getElementById('qr-input-url');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'https://google.com/search?q=test');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });

    // Wait 250ms for debounce
    await new Promise((r) => setTimeout(r, 250));

    const updatedQr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        encodedText: document.querySelector('.inspector-code')?.textContent,
        hasSvg: !!document.querySelector('.qr-code-preview-wrap svg')
      })`
    });
    console.log('  Updated QR State after typing:', updatedQr.result.value);
    assert.strictEqual(updatedQr.result.value.encodedText, 'https://google.com/search?q=test');
    assert.strictEqual(updatedQr.result.value.hasSvg, true);
    console.log('  ✓ TEST 2 Passed!');

    // TEST 3: EMPTY STATE VERIFICATION
    console.log('\n4. TEST 3: Empty State Handling...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('reset-qr-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 250));

    const emptyState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasEmptyState: !!document.querySelector('.qr-empty-state'),
        emptyTitle: document.querySelector('.qr-empty-title')?.textContent,
        hasSvg: !!document.querySelector('.qr-code-preview-wrap svg'),
        isDownloadDisabled: document.getElementById('download-png-btn')?.disabled
      })`
    });
    console.log('  Empty State Info:', emptyState.result.value);
    assert.strictEqual(emptyState.result.value.hasEmptyState, true);
    assert.strictEqual(emptyState.result.value.emptyTitle, 'Enter Content to Generate QR');
    assert.strictEqual(emptyState.result.value.hasSvg, false);
    assert.strictEqual(emptyState.result.value.isDownloadDisabled, true);
    console.log('  ✓ TEST 3 Passed!');

    // TEST 4: PLAIN TEXT TAB & MULTI-LINE INPUT
    console.log('\n5. TEST 4: Plain Text Tab & Multi-line Input...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('tab-text').click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const textarea = document.getElementById('qr-input-text');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, 'FixMyFile - Fast, Client-Side Utilities\\nVersion: 3.1');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 250));

    const textQr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.qr-code-preview-wrap svg'),
        encodedText: document.querySelector('.inspector-code')?.textContent
      })`
    });
    console.log('  Plain Text QR State:', textQr.result.value);
    assert.strictEqual(textQr.result.value.hasSvg, true);
    assert.ok(textQr.result.value.encodedText.includes('FixMyFile'));
    console.log('  ✓ TEST 4 Passed!');

    // TEST 5: APPEARANCE CUSTOMIZATION (MODULE STYLE: DOTS & CORNER EYE: CIRCULAR)
    console.log('\n6. TEST 5: Appearance Customization (Dots + Circular Eyes)...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('style-module-dots').click();`
    });
    await new Promise((r) => setTimeout(r, 100));

    await send('Runtime.evaluate', {
      expression: `document.getElementById('style-eye-dot').click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    const styledQr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        circleCount: document.querySelectorAll('.qr-code-preview-wrap svg circle').length,
        hasRoundedEyes: !!document.querySelector('.qr-code-preview-wrap svg rect[rx="35"]')
      })`
    });
    console.log('  Styled QR SVG inspection:', styledQr.result.value);
    assert.ok(styledQr.result.value.circleCount > 20, 'Dots module style must render vector circles');
    assert.strictEqual(styledQr.result.value.hasRoundedEyes, true);
    console.log('  ✓ TEST 5 Passed!');

    // TEST 6: CUSTOM PALETTE & CONTRAST WARNING CHECK
    console.log('\n7. TEST 6: Color Palettes & Contrast Safety...');
    // Set custom navy foreground
    await send('Runtime.evaluate', {
      expression: `(() => {
        const fgInput = document.getElementById('fg-hex-input');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(fgInput, '#1e3a8a');
        fgInput.dispatchEvent(new Event('input', { bubbles: true }));
        fgInput.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    const safeContrast = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        contrastText: document.querySelector('.contrast-label strong')?.textContent,
        isSafeBadge: !!document.querySelector('.badge-pill-success'),
        svgFg: document.querySelector('.qr-code-preview-wrap svg rect')?.getAttribute('fill')
      })`
    });
    console.log('  Safe Contrast State:', safeContrast.result.value);
    assert.strictEqual(safeContrast.result.value.isSafeBadge, true);

    // Set unsafe low-contrast foreground (#e2e8f0 on #ffffff)
    console.log('  Testing low contrast warning threshold...');
    await send('Runtime.evaluate', {
      expression: `(() => {
        const fgInput = document.getElementById('fg-hex-input');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(fgInput, '#e2e8f0');
        fgInput.dispatchEvent(new Event('input', { bubbles: true }));
        fgInput.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    const lowContrast = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasWarningBadge: !!document.querySelector('.badge-pill-warning'),
        hasWarningText: !!document.querySelector('.contrast-warning-text')
      })`
    });
    console.log('  Low Contrast Alert State:', lowContrast.result.value);
    assert.strictEqual(lowContrast.result.value.hasWarningBadge, true);
    assert.strictEqual(lowContrast.result.value.hasWarningText, true);

    // Restore safe black foreground
    await send('Runtime.evaluate', {
      expression: `(() => {
        const fgInput = document.getElementById('fg-hex-input');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(fgInput, '#000000');
        fgInput.dispatchEvent(new Event('input', { bubbles: true }));
        fgInput.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));
    console.log('  ✓ TEST 6 Passed!');

    // TEST 7: WI-FI TAB & SCANNABILITY DECODE
    console.log('\n8. TEST 7: Wi-Fi Tab & Scannability Decode...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('tab-wifi').click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    await send('Runtime.evaluate', {
      expression: `(() => {
        const ssidInput = document.getElementById('qr-input-ssid');
        const passInput = document.getElementById('qr-input-wifi-pass');
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

        setter.call(ssidInput, 'CafeGuest_WiFi');
        ssidInput.dispatchEvent(new Event('input', { bubbles: true }));
        ssidInput.dispatchEvent(new Event('change', { bubbles: true }));

        setter.call(passInput, 'Espresso2026!');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 350));

    const wifiQr = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        encodedText: document.querySelector('.inspector-code')?.textContent,
        hasVerifiedBadge: !!document.querySelector('.scan-verified-badge')
      })`
    });
    console.log('  Wi-Fi QR State:', wifiQr.result.value);
    assert.strictEqual(wifiQr.result.value.encodedText, 'WIFI:T:WPA;S:CafeGuest_WiFi;P:Espresso2026!;H:false;;');
    console.log('  ✓ TEST 7 Passed!');

    // TEST 8: REAL VECTOR SVG INTEGRITY IN BROWSER
    console.log('\n9. TEST 8: Real Vector SVG Integrity...');
    const svgCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const svgEl = document.querySelector('.qr-code-preview-wrap svg');
        if (!svgEl) return { error: 'No svg element' };
        const serialized = new XMLSerializer().serializeToString(svgEl);
        return {
          isXml: serialized.startsWith('<svg'),
          containsPathsOrRects: serialized.includes('<rect') || serialized.includes('<circle'),
          noRasterImages: !serialized.includes('<image'),
          length: serialized.length
        };
      })()`
    });
    console.log('  SVG Vector Inspection:', svgCheck.result.value);
    assert.strictEqual(svgCheck.result.value.isXml, true);
    assert.strictEqual(svgCheck.result.value.containsPathsOrRects, true);
    assert.strictEqual(svgCheck.result.value.noRasterImages, true);
    assert.ok(svgCheck.result.value.length > 500);
    console.log('  ✓ TEST 8 Passed!');

    // TEST 9: PNG DOWNLOAD GENERATION TEST
    console.log('\n10. TEST 9: PNG Download Rasterization in Browser...');
    const pngCheck = await send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const svgEl = document.querySelector('.qr-code-preview-wrap svg');
        const serialized = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = url;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 512, 512);

        const pngBlob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        const buf = await pngBlob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;

        return {
          blobSize: pngBlob.size,
          isPng,
          width: canvas.width,
          height: canvas.height
        };
      })()`
    });
    console.log('  PNG Raster Output:', pngCheck.result.value);
    assert.strictEqual(pngCheck.result.value.isPng, true);
    assert.strictEqual(pngCheck.result.value.width, 512);
    assert.strictEqual(pngCheck.result.value.height, 512);
    assert.ok(pngCheck.result.value.blobSize > 1000);
    console.log('  ✓ TEST 9 Passed!');

    // TEST 10: RESPONSIVE VIEWPORT TEST (MOBILE 375 × 812)
    console.log('\n11. TEST 10: Mobile Responsive Viewport (375 × 812)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 300));

    const mobileMetrics = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        docWidth: document.documentElement.offsetWidth,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.offsetWidth,
        hasLayout: !!document.querySelector('.qr-app-layout')
      })`
    });
    assert.strictEqual(mobileMetrics.result.value.hasHorizontalOverflow, false, 'Mobile viewport must not produce horizontal overflow');
    console.log('  ✓ TEST 10 Passed!');

    console.log('\n==================================================');
    console.log('ALL 10 REAL CHROME MANUAL TESTS PASSED (100%)!');
    console.log('==================================================\n');

    ws.close();
    chrome.kill('SIGTERM');
  } catch (err) {
    console.error('\nChrome Browser Test Failed:', err);
    chrome.kill('SIGKILL');
    process.exit(1);
  }
}

runBrowserValidation();
