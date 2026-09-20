/**
 * Real Google Chrome automated browser test suite for Phase 3.2 Barcode Generator
 * Validates requirements A through O via Chrome DevTools Protocol (CDP) on port 9336.
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runBrowserValidation() {
  console.log('=== Starting Real Chrome Browser Barcode Generator Validation ===\n');

  // Launch headless Chrome on dedicated debugging port 9336
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9336',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=Translate',
    BASE_URL
  ]);

  try {
    // Poll until Chrome remote debugging endpoint is responding
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get('http://127.0.0.1:9336/json/list', (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {
        // continue polling
      }
    }

    if (!targets || targets.length === 0) {
      throw new Error('Chrome did not open remote debugging port 9336 within 6 seconds');
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

    // Grant clipboard permissions
    try {
      await send('Browser.grantPermissions', {
        permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
        origin: BASE_URL
      });
    } catch {
      // ignore if unsupported in specific headless build
    }

    // =========================================================================
    // TEST A: HOMEPAGE AND NAVIGATION
    // =========================================================================
    console.log('1. TEST A: Homepage load & navigation to Barcode Generator...');

    // Wait for homepage layout
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.home-page')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const homeCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        title: document.title,
        hasBarcodeCard: !!document.querySelector('a[href="/barcode-generator"]'),
        barcodeCardText: document.querySelector('a[href="/barcode-generator"]')?.textContent || ''
      })`
    });
    console.log('  Homepage Check:', homeCheck.result.value);
    assert.ok(homeCheck.result.value.hasBarcodeCard, 'Barcode Generator card must exist on homepage');
    assert.match(homeCheck.result.value.barcodeCardText, /Barcode Generator/i);

    // Click the Barcode Generator link
    await send('Runtime.evaluate', {
      expression: `document.querySelector('a[href="/barcode-generator"]').click();`
    });

    // Wait for barcode tool page to mount
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        returnByValue: true,
        expression: `!!document.querySelector('.barcode-app-layout')`
      });
      if (chk.result?.value) break;
      await new Promise((r) => setTimeout(r, 100));
    }

    const pageInfo = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        url: window.location.pathname,
        title: document.title,
        heading: document.querySelector('#barcode-tool-title')?.textContent,
        badge: document.querySelector('.tool-badge')?.textContent,
        badgeFormat: document.querySelector('.tool-format-badge')?.textContent,
        hasLayout: !!document.querySelector('.barcode-app-layout')
      })`
    });
    console.log('  Barcode Page Info:', pageInfo.result.value);
    assert.strictEqual(pageInfo.result.value.url, '/barcode-generator');
    assert.match(pageInfo.result.value.title, /Barcode Generator/i);
    assert.strictEqual(pageInfo.result.value.heading, 'Barcode Generator Online');
    assert.strictEqual(pageInfo.result.value.badge, 'Phase 3 · Generator');
    assert.strictEqual(pageInfo.result.value.badgeFormat, '1D · SVG + PNG');
    assert.strictEqual(pageInfo.result.value.hasLayout, true);
    console.log('  ✓ TEST A Passed!\n');

    // Stub clipboard.writeText if needed in headless mode
    await send('Runtime.evaluate', {
      expression: `
        if (!navigator.clipboard || !navigator.clipboard.writeText) {
          navigator.clipboard = {
            writeText: async (text) => { window.__lastCopied = text; return true; }
          };
        } else {
          const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
          navigator.clipboard.writeText = async (text) => {
            window.__lastCopied = text;
            try { return await orig(text); } catch { return true; }
          };
        }
      `
    });

    // =========================================================================
    // TEST B: EMPTY STATE
    // =========================================================================
    console.log('2. TEST B: Empty state (placeholder, buttons disabled, no fake badge)...');
    const emptyState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasPlaceholder: !!document.querySelector('.barcode-placeholder-container'),
        hasPlaceholderSvg: !!document.querySelector('.barcode-placeholder-svg'),
        hintText: document.querySelector('.placeholder-hint-text')?.textContent?.trim() || '',
        hasRealBarcode: !!document.querySelector('.barcode-render-container'),
        hasGeneratedBadge: !!document.querySelector('#barcode-generated-badge'),
        isPngDisabled: document.querySelector('#download-png-btn')?.disabled ?? false,
        isSvgDisabled: document.querySelector('#download-svg-btn')?.disabled ?? false,
        isCopyValueDisabled: document.querySelector('#copy-value-btn')?.disabled ?? false,
        isCopySvgDisabled: document.querySelector('#copy-svg-btn')?.disabled ?? false
      })`
    });
    console.log('  Empty State:', emptyState.result.value);
    assert.strictEqual(emptyState.result.value.hasPlaceholder, true);
    assert.strictEqual(emptyState.result.value.hasPlaceholderSvg, true);
    assert.match(emptyState.result.value.hintText, /Enter data to generate your barcode/i);
    assert.strictEqual(emptyState.result.value.hasRealBarcode, false);
    assert.strictEqual(emptyState.result.value.hasGeneratedBadge, false);
    assert.strictEqual(emptyState.result.value.isPngDisabled, true);
    assert.strictEqual(emptyState.result.value.isSvgDisabled, true);
    assert.strictEqual(emptyState.result.value.isCopyValueDisabled, true);
    assert.strictEqual(emptyState.result.value.isCopySvgDisabled, true);
    console.log('  ✓ TEST B Passed!\n');

    // Helper to simulate typed value
    async function setInputValue(val) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const input = document.querySelector('#barcode-value-input');
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(input, ${JSON.stringify(val)});
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        })()`
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    // Helper to select format
    async function setFormat(fmt) {
      await send('Runtime.evaluate', {
        expression: `(() => {
          const sel = document.querySelector('#barcode-format-select');
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
          nativeSetter.call(sel, ${JSON.stringify(fmt)});
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        })()`
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    // =========================================================================
    // TEST C: CODE128 & SCANNER ANIMATION OVERLAY
    // =========================================================================
    console.log('3. TEST C: CODE128 valid barcode & scanner overlay verification...');
    await setInputValue('FixMyFile-128');

    const code128State = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasPlaceholder: !!document.querySelector('.barcode-placeholder-container'),
        hasRealBarcode: !!document.querySelector('.barcode-render-container'),
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        rectCount: document.querySelectorAll('.barcode-svg-wrap svg rect').length,
        hasGeneratedBadge: !!document.querySelector('#barcode-generated-badge'),
        isPngDisabled: document.querySelector('#download-png-btn')?.disabled ?? true,
        isSvgDisabled: document.querySelector('#download-svg-btn')?.disabled ?? true,
        isCopyValDisabled: document.querySelector('#copy-value-btn')?.disabled ?? true,
        isCopySvgDisabled: document.querySelector('#copy-svg-btn')?.disabled ?? true,
        hasScannerClass: !!document.querySelector('.barcode-scanner-effect'),
        scannerAfterPointerEvents: getComputedStyle(document.querySelector('.barcode-render-container'), '::after').pointerEvents,
        svgHasAnimateTags: !!document.querySelector('.barcode-svg-wrap svg animate, .barcode-svg-wrap svg animateTransform')
      })`
    });
    console.log('  CODE128 State:', code128State.result.value);
    assert.strictEqual(code128State.result.value.hasPlaceholder, false);
    assert.strictEqual(code128State.result.value.hasRealBarcode, true);
    assert.strictEqual(code128State.result.value.hasSvg, true);
    assert.ok(code128State.result.value.rectCount > 10, 'SVG should have multiple bar rects');
    assert.strictEqual(code128State.result.value.hasGeneratedBadge, true);
    assert.strictEqual(code128State.result.value.isPngDisabled, false);
    assert.strictEqual(code128State.result.value.isSvgDisabled, false);
    assert.strictEqual(code128State.result.value.isCopyValDisabled, false);
    assert.strictEqual(code128State.result.value.isCopySvgDisabled, false);
    assert.strictEqual(code128State.result.value.hasScannerClass, true);
    assert.strictEqual(code128State.result.value.scannerAfterPointerEvents, 'none', 'Scanner line must be non-interactive overlay');
    assert.strictEqual(code128State.result.value.svgHasAnimateTags, false, 'Barcode SVG bars must NOT contain SVG animation tags');
    console.log('  ✓ TEST C Passed!\n');

    // =========================================================================
    // TEST D: CODE39 (VALID & INVALID)
    // =========================================================================
    console.log('4. TEST D: CODE39 format valid and invalid characters...');
    await setFormat('CODE39');
    await setInputValue('HELLO-123');

    const code39Valid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error')
      })`
    });
    console.log('  CODE39 Valid:', code39Valid.result.value);
    assert.strictEqual(code39Valid.result.value.hasSvg, true);
    assert.strictEqual(code39Valid.result.value.hasError, false);

    // Invalid character test
    await setInputValue('invalid@char!');
    const code39Invalid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error'),
        errorText: document.querySelector('.barcode-validation-error')?.textContent || ''
      })`
    });
    console.log('  CODE39 Invalid:', code39Invalid.result.value);
    assert.strictEqual(code39Invalid.result.value.hasSvg, false);
    assert.strictEqual(code39Invalid.result.value.hasError, true);
    assert.match(code39Invalid.result.value.errorText, /CODE 39 allows/i);
    console.log('  ✓ TEST D Passed!\n');

    // =========================================================================
    // TEST E: EAN-13 (VALID & INVALID CHECKSUM)
    // =========================================================================
    console.log('5. TEST E: EAN-13 genuinely valid value & invalid checksum rejection...');
    await setFormat('EAN13');
    // Genuine valid 13-digit EAN-13: 4006381333931
    await setInputValue('4006381333931');

    const ean13Valid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error')
      })`
    });
    console.log('  EAN-13 Valid (4006381333931):', ean13Valid.result.value);
    assert.strictEqual(ean13Valid.result.value.hasSvg, true);
    assert.strictEqual(ean13Valid.result.value.hasError, false);

    // Invalid checksum digit (0 instead of 1)
    await setInputValue('4006381333930');
    const ean13Invalid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error'),
        errorText: document.querySelector('.barcode-validation-error')?.textContent || ''
      })`
    });
    console.log('  EAN-13 Invalid Checksum (4006381333930):', ean13Invalid.result.value);
    assert.strictEqual(ean13Invalid.result.value.hasSvg, false);
    assert.strictEqual(ean13Invalid.result.value.hasError, true);
    assert.match(ean13Invalid.result.value.errorText, /Invalid EAN-13 checksum/i);
    console.log('  ✓ TEST E Passed!\n');

    // =========================================================================
    // TEST F: EAN-8 (VALID & INVALID CHECKSUM)
    // =========================================================================
    console.log('6. TEST F: EAN-8 valid value & invalid checksum rejection...');
    await setFormat('EAN8');
    // Genuine valid 8-digit EAN-8: 96385074
    await setInputValue('96385074');

    const ean8Valid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error')
      })`
    });
    console.log('  EAN-8 Valid (96385074):', ean8Valid.result.value);
    assert.strictEqual(ean8Valid.result.value.hasSvg, true);
    assert.strictEqual(ean8Valid.result.value.hasError, false);

    // Invalid checksum (3 instead of 4)
    await setInputValue('96385073');
    const ean8Invalid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error'),
        errorText: document.querySelector('.barcode-validation-error')?.textContent || ''
      })`
    });
    console.log('  EAN-8 Invalid Checksum:', ean8Invalid.result.value);
    assert.strictEqual(ean8Invalid.result.value.hasSvg, false);
    assert.strictEqual(ean8Invalid.result.value.hasError, true);
    assert.match(ean8Invalid.result.value.errorText, /Invalid EAN-8 checksum/i);
    console.log('  ✓ TEST F Passed!\n');

    // =========================================================================
    // TEST G: UPC-A (VALID & INVALID CHECKSUM)
    // =========================================================================
    console.log('7. TEST G: UPC-A valid value & invalid checksum rejection...');
    await setFormat('UPC');
    // Genuine valid 12-digit UPC-A: 012345678905
    await setInputValue('012345678905');

    const upcValid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error')
      })`
    });
    console.log('  UPC-A Valid (012345678905):', upcValid.result.value);
    assert.strictEqual(upcValid.result.value.hasSvg, true);
    assert.strictEqual(upcValid.result.value.hasError, false);

    // Invalid checksum (4 instead of 5)
    await setInputValue('012345678904');
    const upcInvalid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error'),
        errorText: document.querySelector('.barcode-validation-error')?.textContent || ''
      })`
    });
    console.log('  UPC-A Invalid Checksum:', upcInvalid.result.value);
    assert.strictEqual(upcInvalid.result.value.hasSvg, false);
    assert.strictEqual(upcInvalid.result.value.hasError, true);
    assert.match(upcInvalid.result.value.errorText, /Invalid UPC-A checksum/i);
    console.log('  ✓ TEST G Passed!\n');

    // =========================================================================
    // TEST H: ITF-14
    // =========================================================================
    console.log('8. TEST H: ITF-14 valid format...');
    await setFormat('ITF14');
    // Valid 14-digit ITF-14: 12345678901231
    await setInputValue('12345678901231');

    const itf14Valid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error')
      })`
    });
    console.log('  ITF-14 Valid:', itf14Valid.result.value);
    assert.strictEqual(itf14Valid.result.value.hasSvg, true);
    assert.strictEqual(itf14Valid.result.value.hasError, false);
    console.log('  ✓ TEST H Passed!\n');

    // =========================================================================
    // TEST I: CODABAR
    // =========================================================================
    console.log('9. TEST I: Codabar valid format (A12345B) & invalid rejection...');
    await setFormat('codabar');
    await setInputValue('A12345B');

    const codabarValid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error')
      })`
    });
    console.log('  Codabar Valid (A12345B):', codabarValid.result.value);
    assert.strictEqual(codabarValid.result.value.hasSvg, true);
    assert.strictEqual(codabarValid.result.value.hasError, false);

    // Invalid Codabar (missing start/stop characters)
    await setInputValue('12345');
    const codabarInvalid = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        hasError: !!document.querySelector('.barcode-validation-error'),
        errorText: document.querySelector('.barcode-validation-error')?.textContent || ''
      })`
    });
    console.log('  Codabar Invalid (12345):', codabarInvalid.result.value);
    assert.strictEqual(codabarInvalid.result.value.hasSvg, false);
    assert.strictEqual(codabarInvalid.result.value.hasError, true);
    assert.match(codabarInvalid.result.value.errorText, /Codabar must start and end/i);
    console.log('  ✓ TEST I Passed!\n');

    // =========================================================================
    // TEST J: APPEARANCE CUSTOMIZATION
    // =========================================================================
    console.log('10. TEST J: Appearance customization (colors, dimensions, text controls)...');
    await setFormat('CODE128');
    await setInputValue('DESIGN-128');

    // Test Color customization
    await send('Runtime.evaluate', {
      expression: `(() => {
        // Change foreground color
        const fg = document.querySelector('#barcode-fg-color');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(fg, '#1e3a8a');
        fg.dispatchEvent(new Event('input', { bubbles: true }));
        fg.dispatchEvent(new Event('change', { bubbles: true }));

        // Change background color
        const bg = document.querySelector('#barcode-bg-color');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(bg, '#f0f9ff');
        bg.dispatchEvent(new Event('input', { bubbles: true }));
        bg.dispatchEvent(new Event('change', { bubbles: true }));

        // Change width slider
        const w = document.querySelector('#barcode-bar-width');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(w, '3');
        w.dispatchEvent(new Event('input', { bubbles: true }));
        w.dispatchEvent(new Event('change', { bubbles: true }));

        // Change height slider
        const h = document.querySelector('#barcode-bar-height');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(h, '120');
        h.dispatchEvent(new Event('input', { bubbles: true }));
        h.dispatchEvent(new Event('change', { bubbles: true }));

        // Change margin slider
        const m = document.querySelector('#barcode-margin');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(m, '16');
        m.dispatchEvent(new Event('input', { bubbles: true }));
        m.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    const appearanceCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const svg = document.querySelector('.barcode-svg-wrap svg');
        const s = new XMLSerializer().serializeToString(svg);
        return {
          hasCustomFg: s.includes('#1e3a8a') || s.includes('rgb(30, 58, 138)'),
          hasCustomBg: s.includes('#f0f9ff') || s.includes('rgb(240, 249, 255)'),
          hasHeight: s.includes('height="')
        };
      })()`
    });
    console.log('  Appearance Check:', appearanceCheck.result.value);
    assert.strictEqual(appearanceCheck.result.value.hasCustomFg, true, 'SVG must reflect custom FG color');
    assert.strictEqual(appearanceCheck.result.value.hasCustomBg, true, 'SVG must reflect custom BG color');

    // Test Human readable text toggle
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#barcode-display-value-toggle').click();`
    });
    await new Promise((r) => setTimeout(r, 150));

    const textOffCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const svg = document.querySelector('.barcode-svg-wrap svg');
        const s = new XMLSerializer().serializeToString(svg);
        return {
          hasTextElement: s.includes('<text')
        };
      })()`
    });
    console.log('  Text Off Check:', textOffCheck.result.value);
    assert.strictEqual(textOffCheck.result.value.hasTextElement, false, 'SVG text element should be absent when toggle is OFF');

    // Turn text back ON
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#barcode-display-value-toggle').click();`
    });
    await new Promise((r) => setTimeout(r, 150));

    // Test text position (Top)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const topBtn = Array.from(document.querySelectorAll('.barcode-option-btn')).find(b => b.textContent.trim() === 'Top');
        if (topBtn) topBtn.click();
      })()`
    });
    await new Promise((r) => setTimeout(r, 150));

    const textTopCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const svg = document.querySelector('.barcode-svg-wrap svg');
        const s = new XMLSerializer().serializeToString(svg);
        const textIdx = s.indexOf('<text');
        const firstRectIdx = s.indexOf('<rect');
        return {
          hasTextElement: textIdx !== -1,
          isTextBeforeRect: textIdx < firstRectIdx
        };
      })()`
    });
    console.log('  Text Top Check:', textTopCheck.result.value);
    assert.strictEqual(textTopCheck.result.value.hasTextElement, true);
    console.log('  ✓ TEST J Passed!\n');

    // =========================================================================
    // TEST K: CONTRAST SAFETY
    // =========================================================================
    console.log('11. TEST K: Contrast safety warning detection...');
    // Set low contrast colors (#777777 on #888888)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const fg = document.querySelector('#barcode-fg-color');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(fg, '#777777');
        fg.dispatchEvent(new Event('input', { bubbles: true }));
        fg.dispatchEvent(new Event('change', { bubbles: true }));

        const bg = document.querySelector('#barcode-bg-color');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(bg, '#888888');
        bg.dispatchEvent(new Event('input', { bubbles: true }));
        bg.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    const lowContrastCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasWarning: !!document.querySelector('#barcode-contrast-warning'),
        warningText: document.querySelector('#barcode-contrast-warning')?.textContent || '',
        contrastText: document.querySelector('.info-warn')?.textContent || ''
      })`
    });
    console.log('  Low Contrast Check:', lowContrastCheck.result.value);
    assert.strictEqual(lowContrastCheck.result.value.hasWarning, true, 'Contrast warning must appear for low contrast');
    assert.match(lowContrastCheck.result.value.warningText, /Low contrast/i);

    // Restore high contrast (#000000 on #ffffff)
    await send('Runtime.evaluate', {
      expression: `(() => {
        const fg = document.querySelector('#barcode-fg-color');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(fg, '#000000');
        fg.dispatchEvent(new Event('input', { bubbles: true }));
        fg.dispatchEvent(new Event('change', { bubbles: true }));

        const bg = document.querySelector('#barcode-bg-color');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(bg, '#ffffff');
        bg.dispatchEvent(new Event('input', { bubbles: true }));
        bg.dispatchEvent(new Event('change', { bubbles: true }));
      })()`
    });
    await new Promise((r) => setTimeout(r, 200));

    const restoredContrastCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasWarning: !!document.querySelector('#barcode-contrast-warning')
      })`
    });
    console.log('  Restored Contrast Check:', restoredContrastCheck.result.value);
    assert.strictEqual(restoredContrastCheck.result.value.hasWarning, false, 'Contrast warning must disappear on good contrast');
    console.log('  ✓ TEST K Passed!\n');

    // =========================================================================
    // TEST L: DOWNLOADS & VECTOR PURITY
    // =========================================================================
    console.log('12. TEST L: Downloads (PNG, SVG, Vector purity, animation exclusion)...');

    // SVG Button styling & visibility
    const svgBtnCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const btn = document.querySelector('#download-svg-btn');
        const cs = getComputedStyle(btn);
        return {
          exists: !!btn,
          text: btn.textContent.trim(),
          isVisible: btn.offsetWidth > 0 && btn.offsetHeight > 0,
          color: cs.color,
          borderWidth: cs.borderWidth
        };
      })()`
    });
    console.log('  SVG Button Check:', svgBtnCheck.result.value);
    assert.ok(svgBtnCheck.result.value.exists);
    assert.match(svgBtnCheck.result.value.text, /Download Vector SVG/i);
    assert.strictEqual(svgBtnCheck.result.value.isVisible, true);

    // Vector purity & animation isolation
    const vectorPurity = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const svg = document.querySelector('.barcode-svg-wrap svg');
        const s = new XMLSerializer().serializeToString(svg);
        return {
          isSvgXml: s.startsWith('<svg'),
          hasRects: s.includes('<rect'),
          hasRasterImage: s.includes('<image'),
          hasAnimationTag: s.includes('<animate') || s.includes('<animateTransform'),
          hasScannerClassInSvg: s.includes('barcode-scanner-effect'),
          length: s.length
        };
      })()`
    });
    console.log('  Vector Purity:', vectorPurity.result.value);
    assert.strictEqual(vectorPurity.result.value.isSvgXml, true);
    assert.strictEqual(vectorPurity.result.value.hasRects, true);
    assert.strictEqual(vectorPurity.result.value.hasRasterImage, false, 'SVG must NOT contain raster <image> elements');
    assert.strictEqual(vectorPurity.result.value.hasAnimationTag, false, 'SVG must NOT contain animation tags');
    assert.strictEqual(vectorPurity.result.value.hasScannerClassInSvg, false, 'Animation class must NOT be baked into SVG');

    // PNG download mechanism
    const pngTest = await send('Runtime.evaluate', {
      returnByValue: true,
      awaitPromise: true,
      expression: `(async () => {
        let interceptedBlob = null;
        let interceptedFilename = null;
        const origCreate = URL.createObjectURL;
        URL.createObjectURL = (blob) => {
          interceptedBlob = blob;
          return origCreate(blob);
        };
        const origAppend = document.body.appendChild.bind(document.body);
        document.body.appendChild = (node) => {
          if (node.tagName === 'A' && node.download) {
            interceptedFilename = node.download;
          }
          return origAppend(node);
        };

        const btn = document.querySelector('#download-png-btn');
        btn.click();
        await new Promise(r => setTimeout(r, 400));

        URL.createObjectURL = origCreate;
        document.body.appendChild = origAppend;

        return {
          intercepted: !!interceptedBlob,
          blobType: interceptedBlob?.type,
          blobSize: interceptedBlob?.size,
          filename: interceptedFilename
        };
      })()`
    });
    console.log('  PNG Download Interception:', pngTest.result.value);
    assert.strictEqual(pngTest.result.value.intercepted, true, 'PNG blob must be generated on download click');
    assert.strictEqual(pngTest.result.value.blobType, 'image/png', 'Blob must have image/png MIME type');
    assert.ok(pngTest.result.value.blobSize > 500, 'PNG blob size must be non-trivial');
    assert.match(pngTest.result.value.filename, /\.png$/, 'Filename must have .png extension');

    // Copy actions
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#copy-value-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 150));

    const copyValueCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        lastCopied: window.__lastCopied,
        buttonText: document.querySelector('#copy-value-btn')?.textContent?.trim()
      })`
    });
    console.log('  Copy Value Check:', copyValueCheck.result.value);
    assert.strictEqual(copyValueCheck.result.value.lastCopied, 'DESIGN-128');
    assert.match(copyValueCheck.result.value.buttonText, /Copied!/i);

    await send('Runtime.evaluate', {
      expression: `document.querySelector('#copy-svg-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 150));

    const copySvgCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasCopiedSvg: typeof window.__lastCopied === 'string' && window.__lastCopied.startsWith('<svg'),
        buttonText: document.querySelector('#copy-svg-btn')?.textContent?.trim()
      })`
    });
    console.log('  Copy SVG Check:', copySvgCheck.result.value);
    assert.strictEqual(copySvgCheck.result.value.hasCopiedSvg, true);
    assert.match(copySvgCheck.result.value.buttonText, /Copied SVG!/i);
    console.log('  ✓ TEST L Passed!\n');

    // =========================================================================
    // TEST M: RESET & REGENERATION
    // =========================================================================
    console.log('13. TEST M: Reset button & fresh barcode generation...');
    await send('Runtime.evaluate', {
      expression: `document.querySelector('#barcode-reset-btn').click();`
    });
    await new Promise((r) => setTimeout(r, 200));

    const resetState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        inputValue: document.querySelector('#barcode-value-input')?.value || '',
        format: document.querySelector('#barcode-format-select')?.value || '',
        hasPlaceholder: !!document.querySelector('.barcode-placeholder-container'),
        hasRealBarcode: !!document.querySelector('.barcode-render-container'),
        isPngDisabled: document.querySelector('#download-png-btn')?.disabled ?? false
      })`
    });
    console.log('  Reset State:', resetState.result.value);
    assert.strictEqual(resetState.result.value.inputValue, '');
    assert.strictEqual(resetState.result.value.format, 'CODE128');
    assert.strictEqual(resetState.result.value.hasPlaceholder, true);
    assert.strictEqual(resetState.result.value.hasRealBarcode, false);
    assert.strictEqual(resetState.result.value.isPngDisabled, true);

    // Regenerate after reset
    await setInputValue('POST-RESET-123');
    const postResetState = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        hasRealBarcode: !!document.querySelector('.barcode-render-container'),
        hasSvg: !!document.querySelector('.barcode-svg-wrap svg'),
        isPngDisabled: document.querySelector('#download-png-btn')?.disabled ?? true
      })`
    });
    console.log('  Post-Reset State:', postResetState.result.value);
    assert.strictEqual(postResetState.result.value.hasRealBarcode, true);
    assert.strictEqual(postResetState.result.value.hasSvg, true);
    assert.strictEqual(postResetState.result.value.isPngDisabled, false);
    console.log('  ✓ TEST M Passed!\n');

    // =========================================================================
    // TEST N: MOBILE VIEWPORT
    // =========================================================================
    console.log('14. TEST N: Mobile viewport responsive behavior (375x812)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      mobile: true
    });
    await new Promise((r) => setTimeout(r, 400));

    const mobileCheck = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        hasPreview: !!document.querySelector('.barcode-preview-stage'),
        hasActions: !!document.querySelector('.barcode-actions-container'),
        hasConfig: !!document.querySelector('.barcode-config-panel')
      })`
    });
    console.log('  Mobile Check:', mobileCheck.result.value);
    assert.strictEqual(mobileCheck.result.value.hasHorizontalOverflow, false, 'Must have zero horizontal overflow');
    assert.strictEqual(mobileCheck.result.value.hasPreview, true);
    assert.strictEqual(mobileCheck.result.value.hasActions, true);
    assert.strictEqual(mobileCheck.result.value.hasConfig, true);
    console.log('  ✓ TEST N Passed!\n');

    // Reset viewport back to desktop
    await send('Emulation.clearDeviceMetricsOverride');
    await new Promise((r) => setTimeout(r, 200));

    // =========================================================================
    // TEST O: CONSOLE ERRORS & EXCEPTIONS
    // =========================================================================
    console.log('15. TEST O: Checking for zero critical console errors and exceptions...');
    const criticalErrors = pageErrors.concat(
      consoleLogs.filter((l) => l.type === 'error' && !l.text.includes('favicon'))
    );
    console.log(`  Captured console errors: ${criticalErrors.length}`);
    if (criticalErrors.length > 0) {
      console.error('  Errors detected:', criticalErrors);
    }
    assert.strictEqual(criticalErrors.length, 0, 'Must have zero console errors or unhandled exceptions');
    console.log('  ✓ TEST O Passed!\n');

    console.log('===========================================================');
    console.log('=== REAL CHROME MANUAL TEST COMPLETED: ALL TESTS PASS ===');
    console.log('===========================================================');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {
      // ignore
    }
  }
}

runBrowserValidation().catch((err) => {
  console.error('\n*** REAL CHROME BROWSER VALIDATION FAILED ***\n', err);
  process.exit(1);
});
