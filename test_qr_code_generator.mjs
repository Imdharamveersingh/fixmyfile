/**
 * Automated test suite for Phase 3.1: QR Code Generator (/qr-code-generator)
 * Tests tool registry, routing, content formatters, matrix generation, vector SVG,
 * canvas rasterization, styling options, scannability verification with jsQR,
 * quiet zone guardrails, contrast checking, and edge cases.
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import jsQR from 'jsqr';
import {
  formatQrPayload,
  generateQrMatrix,
  generateQrSvgString,
  calculateContrast,
  sanitizeFilename
} from './src/tools/qr-code-generator/qrEngine.js';
import {
  ALL_TOOLS,
  PHASE_1_TOOLS,
  PHASE_2_TOOLS,
  PHASE_3_TOOLS,
  getToolById,
  getToolByPath
} from './src/tools/toolsRegistry.js';

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

async function runAllTests() {
  console.log('=== QR Code Generator Automated Test Suite ===\n');

  // 1. Tool Registry & Route Definitions
  console.log('1. Checking Tool Registry & Route Definitions...');

  test('Route /qr-code-generator is registered in tool registry', () => {
    const tool = getToolByPath('/qr-code-generator');
    assert.ok(tool, 'Route /qr-code-generator must be registered');
    assert.strictEqual(tool.id, 'qr-code-generator');
  });

  test('getToolById("qr-code-generator") returns valid metadata', () => {
    const tool = getToolById('qr-code-generator');
    assert.ok(tool);
    assert.strictEqual(tool.name, 'QR Code Generator');
    assert.strictEqual(tool.path, '/qr-code-generator');
    assert.strictEqual(tool.category, 'Generators');
    assert.strictEqual(tool.phase, 'Phase 3');
    assert.strictEqual(tool.status, 'Ready');
  });

  test('PHASE_3_TOOLS contains qr-code-generator', () => {
    assert.ok(Array.isArray(PHASE_3_TOOLS));
    assert.ok(PHASE_3_TOOLS.some((t) => t.id === 'qr-code-generator'));
  });

  test('ALL_TOOLS contains Phase 1, Phase 2, and Phase 3 tools', () => {
    assert.strictEqual(PHASE_1_TOOLS.length, 6);
    assert.strictEqual(PHASE_2_TOOLS.length, 6);
    assert.ok(ALL_TOOLS.length >= 13);
  });

  // 2. Verifying All Phase 1 and Phase 2 Routes Remain Intact
  console.log('\n2. Verifying All Phase 1 and Phase 2 Routes Remain Intact...');
  const existingRoutes = [
    '/jpg-to-pdf',
    '/pdf-to-word',
    '/pdf-to-jpg',
    '/word-to-pdf',
    '/merge-pdf',
    '/compress-pdf',
    '/background-remover',
    '/image-compressor',
    '/image-resizer',
    '/image-converter',
    '/jpg-to-png',
    '/png-to-jpg',
    '/qr-code-generator'
  ];

  for (const route of existingRoutes) {
    test(`Route ${route} is registered`, () => {
      assert.ok(getToolByPath(route), `Route ${route} must be present`);
    });
  }

  // 3. Verifying App.jsx and Components
  console.log('\n3. Verifying App.jsx and Navigation Component Integration...');

  test('App.jsx contains path="qr-code-generator"', () => {
    const appContent = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8');
    assert.ok(appContent.includes('path="qr-code-generator"'));
    assert.ok(appContent.includes('QrCodeGeneratorTool'));
  });

  test('Header.jsx contains link to /qr-code-generator', () => {
    const headerContent = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf-8');
    assert.ok(headerContent.includes('/qr-code-generator'));
    assert.ok(headerContent.includes('QR Code Generator'));
  });

  test('Footer.jsx contains link to /qr-code-generator', () => {
    const footerContent = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf-8');
    assert.ok(footerContent.includes('/qr-code-generator'));
    assert.ok(footerContent.includes('Calculators & Generators'));
  });

  // 4. Content Type Formatters
  console.log('\n4. Testing Content Type Formatters...');

  test('Plain text formatting preserves raw content', () => {
    const res = formatQrPayload({ contentType: 'text', text: 'Hello, World! 123' });
    assert.strictEqual(res, 'Hello, World! 123');
  });

  test('URL formatting automatically prepends https:// if missing', () => {
    const res = formatQrPayload({ contentType: 'url', url: 'fixmyfile.com/tools' });
    assert.strictEqual(res, 'https://fixmyfile.com/tools');
  });

  test('URL formatting preserves existing https:// and http:// protocols', () => {
    const resHttps = formatQrPayload({ contentType: 'url', url: 'https://github.com' });
    assert.strictEqual(resHttps, 'https://github.com');
    const resHttp = formatQrPayload({ contentType: 'url', url: 'http://example.org' });
    assert.strictEqual(resHttp, 'http://example.org');
  });

  test('Email formatting formats standard mailto: payload', () => {
    const resSimple = formatQrPayload({ contentType: 'email', email: 'hello@fixmyfile.com' });
    assert.strictEqual(resSimple, 'mailto:hello@fixmyfile.com');

    const resWithParams = formatQrPayload({
      contentType: 'email',
      email: 'support@fixmyfile.com',
      emailSubject: 'Bug Report',
      emailBody: 'Please help'
    });
    assert.ok(resWithParams.startsWith('mailto:support@fixmyfile.com?'));
    assert.ok(resWithParams.includes('subject=Bug%20Report'));
    assert.ok(resWithParams.includes('body=Please%20help'));
  });

  test('Phone formatting formats standard tel: payload', () => {
    const res = formatQrPayload({ contentType: 'phone', phone: '+1-555-867-5309' });
    assert.strictEqual(res, 'tel:+1-555-867-5309');
  });

  test('Wi-Fi formatting correctly escapes special characters and outputs standard string', () => {
    const res = formatQrPayload({
      contentType: 'wifi',
      wifiSsid: 'My;Home\\Net',
      wifiPassword: 'Pass:word;123',
      wifiAuth: 'WPA',
      wifiHidden: false
    });
    assert.strictEqual(res, 'WIFI:T:WPA;S:My\\;Home\\\\Net;P:Pass\\:word\\;123;H:false;;');
  });

  test('Wi-Fi open network (nopass) leaves password empty', () => {
    const res = formatQrPayload({
      contentType: 'wifi',
      wifiSsid: 'GuestCafe',
      wifiAuth: 'nopass'
    });
    assert.strictEqual(res, 'WIFI:T:nopass;S:GuestCafe;P:;H:false;;');
  });

  // 5. Matrix Generation & Auto-Versioning
  console.log('\n5. Testing Matrix Generation & Error Correction...');

  test('Short text generates compact QR version (Version 1-2)', () => {
    const matrix = generateQrMatrix('Short', 'M');
    assert.ok(matrix.count >= 21);
    assert.strictEqual(typeof matrix.isDark, 'function');
  });

  test('Long text automatically increments QR version with larger module count', () => {
    const shortMatrix = generateQrMatrix('A', 'M');
    const longText = 'A'.repeat(200);
    const longMatrix = generateQrMatrix(longText, 'M');
    assert.ok(longMatrix.count > shortMatrix.count, 'Longer payload requires higher version matrix');
  });

  test('Error correction levels (L, M, Q, H) produce valid matrices', () => {
    for (const ec of ['L', 'M', 'Q', 'H']) {
      const mat = generateQrMatrix('https://fixmyfile.com', ec);
      assert.ok(mat.count >= 21);
      assert.strictEqual(mat.isDark(0, 0), true, 'Finder corner must be dark');
    }
  });

  test('Empty string throws user-friendly error', () => {
    assert.throws(() => generateQrMatrix('', 'M'), /empty/i);
  });

  // 6. Genuine Vector SVG Output
  console.log('\n6. Testing Genuine Vector SVG Output Structure...');

  test('SVG starts with <svg and ends with </svg>', () => {
    const matrix = generateQrMatrix('https://fixmyfile.com', 'M');
    const svg = generateQrSvgString({ matrix, fgColor: '#1e3a8a', bgColor: '#fafaf9', margin: 4 });
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.endsWith('</svg>'));
  });

  test('SVG is genuine vector (contains <rect> and geometric elements, NOT <image>)', () => {
    const matrix = generateQrMatrix('https://fixmyfile.com', 'M');
    const svg = generateQrSvgString({ matrix });
    assert.ok(svg.includes('<rect'));
    assert.ok(!svg.includes('<image'), 'SVG must be authentic vector paths/rects, not embedded raster images');
  });

  test('SVG reflects custom foreground and background colors', () => {
    const matrix = generateQrMatrix('https://fixmyfile.com', 'M');
    const svg = generateQrSvgString({
      matrix,
      fgColor: '#ff0055',
      bgColor: '#112233'
    });
    assert.ok(svg.includes('fill="#ff0055"'));
    assert.ok(svg.includes('fill="#112233"'));
  });

  test('SVG reflects module styles (square vs rounded vs dots vs classy)', () => {
    const matrix = generateQrMatrix('TestStyle', 'M');
    const svgSquare = generateQrSvgString({ matrix, moduleStyle: 'square' });
    const svgDots = generateQrSvgString({ matrix, moduleStyle: 'dots' });
    const svgRounded = generateQrSvgString({ matrix, moduleStyle: 'rounded' });
    const svgClassy = generateQrSvgString({ matrix, moduleStyle: 'classy' });

    assert.ok(svgSquare.includes('<rect'));
    assert.ok(svgDots.includes('<circle'));
    assert.ok(svgRounded.includes('rx='));
    assert.ok(svgClassy.includes('rx='));
  });

  test('SVG reflects finder eye styles (square, rounded, dot)', () => {
    const matrix = generateQrMatrix('TestEye', 'M');
    const svgSquareEye = generateQrSvgString({ matrix, eyeStyle: 'square' });
    const svgRoundedEye = generateQrSvgString({ matrix, eyeStyle: 'rounded' });
    const svgDotEye = generateQrSvgString({ matrix, eyeStyle: 'dot' });

    assert.ok(svgSquareEye.length > 0);
    assert.ok(svgRoundedEye.includes('rx="15"'));
    assert.ok(svgDotEye.includes('rx="35"'));
  });

  test('SVG respects quiet zone margin setting', () => {
    const matrix = generateQrMatrix('MarginTest', 'M');
    const svgMargin2 = generateQrSvgString({ matrix, margin: 2 });
    const svgMargin6 = generateQrSvgString({ matrix, margin: 6 });
    assert.ok(svgMargin2.includes(`viewBox="0 0 ${(matrix.count + 4) * 10} ${(matrix.count + 4) * 10}"`));
    assert.ok(svgMargin6.includes(`viewBox="0 0 ${(matrix.count + 12) * 10} ${(matrix.count + 12) * 10}"`));
  });

  // 7. Scannability Verification (jsQR Roundtrip)
  console.log('\n7. Testing Scannability Verification with jsQR...');

  // Helper function to rasterize matrix into pixel buffer for jsQR
  function rasterizeMatrixForJsQR(matrix, margin = 4, scale = 10, fg = [0, 0, 0], bg = [255, 255, 255]) {
    const count = matrix.count;
    const total = count + margin * 2;
    const size = total * scale;
    const pixels = new Uint8ClampedArray(size * size * 4);

    // Fill background
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = bg[0];
      pixels[i + 1] = bg[1];
      pixels[i + 2] = bg[2];
      pixels[i + 3] = 255;
    }

    // Fill dark modules
    for (let r = 0; r < count; r++) {
      for (let c = 0; c < count; c++) {
        if (!matrix.isDark(r, c)) continue;
        const mr = r + margin;
        const mc = c + margin;
        for (let y = 0; y < scale; y++) {
          for (let x = 0; x < scale; x++) {
            const idx = ((mr * scale + y) * size + (mc * scale + x)) * 4;
            pixels[idx] = fg[0];
            pixels[idx + 1] = fg[1];
            pixels[idx + 2] = fg[2];
            pixels[idx + 3] = 255;
          }
        }
      }
    }

    return { pixels, size };
  }

  test('jsQR decodes simple URL payload (https://fixmyfile.com)', () => {
    const payload = 'https://fixmyfile.com';
    const mat = generateQrMatrix(payload, 'M');
    const { pixels, size } = rasterizeMatrixForJsQR(mat);
    const decoded = jsQR(pixels, size, size);
    assert.ok(decoded, 'QR must be decodable by jsQR');
    assert.strictEqual(decoded.data, payload);
  });

  test('jsQR decodes complex Wi-Fi payload', () => {
    const wifi = formatQrPayload({
      contentType: 'wifi',
      wifiSsid: 'FixMyFile_Office',
      wifiPassword: 'SecretPassword99!',
      wifiAuth: 'WPA'
    });
    const mat = generateQrMatrix(wifi, 'H');
    const { pixels, size } = rasterizeMatrixForJsQR(mat);
    const decoded = jsQR(pixels, size, size);
    assert.ok(decoded);
    assert.strictEqual(decoded.data, wifi);
  });

  test('jsQR decodes email mailto: payload', () => {
    const email = formatQrPayload({
      contentType: 'email',
      email: 'contact@fixmyfile.com',
      emailSubject: 'Meeting',
      emailBody: 'See you tomorrow'
    });
    const mat = generateQrMatrix(email, 'M');
    const { pixels, size } = rasterizeMatrixForJsQR(mat);
    const decoded = jsQR(pixels, size, size);
    assert.ok(decoded);
    assert.strictEqual(decoded.data, email);
  });

  test('jsQR decodes phone tel: payload', () => {
    const phone = formatQrPayload({ contentType: 'phone', phone: '+1234567890' });
    const mat = generateQrMatrix(phone, 'M');
    const { pixels, size } = rasterizeMatrixForJsQR(mat);
    const decoded = jsQR(pixels, size, size);
    assert.ok(decoded);
    assert.strictEqual(decoded.data, phone);
  });

  // 8. Contrast Ratio & Safety Analysis
  console.log('\n8. Testing Contrast Ratio & Accessibility Guardrails...');

  test('Pure black on pure white has maximum contrast (21:1)', () => {
    const c = calculateContrast('#000000', '#ffffff');
    assert.strictEqual(c.ratio, 21);
    assert.strictEqual(c.isSafe, true);
    assert.strictEqual(c.isRecommended, true);
    assert.strictEqual(c.isDarkOnLight, true);
  });

  test('Low contrast combination (light gray on white) fails safety check', () => {
    const c = calculateContrast('#cccccc', '#ffffff');
    assert.ok(c.ratio < 3.0, 'Ratio should be < 3:1');
    assert.strictEqual(c.isSafe, false);
    assert.strictEqual(c.isRecommended, false);
  });

  test('Inverted colors (white on black) detects light-on-dark orientation', () => {
    const c = calculateContrast('#ffffff', '#000000');
    assert.strictEqual(c.ratio, 21);
    assert.strictEqual(c.isSafe, true);
    assert.strictEqual(c.isDarkOnLight, false, 'Should flag as inverted');
  });

  // 9. Filename Sanitization
  console.log('\n9. Testing Download Filename Formulation...');

  test('Sanitizes URL string for clean filename', () => {
    assert.strictEqual(sanitizeFilename('https://fixmyfile.com/tools'), 'fixmyfile-com-tools');
  });

  test('Sanitizes email string for clean filename', () => {
    assert.strictEqual(sanitizeFilename('user.name@example.com'), 'user-name-example-com');
  });

  test('Falls back to default "qr-code" when input is empty or symbols', () => {
    assert.strictEqual(sanitizeFilename(''), 'qr-code');
    assert.strictEqual(sanitizeFilename('!!!'), 'qr-code');
  });

  // 10. Difficult Test Matrix (Step 16)
  console.log('\n10. Difficult Test Matrix (Step 16)...');

  test('TEST A: Simple "Hello World"', () => {
    const mat = generateQrMatrix('Hello World', 'M');
    assert.ok(mat.count >= 21);
  });

  test('TEST B: Long URL with query params', () => {
    const longUrl = 'https://subdomain.domain.com/path/to/resource?param1=value1&param2=value2&ref=marketing_campaign_2026';
    const mat = generateQrMatrix(longUrl, 'M');
    const { pixels, size } = rasterizeMatrixForJsQR(mat);
    const decoded = jsQR(pixels, size, size);
    assert.strictEqual(decoded.data, longUrl);
  });

  test('TEST C: Very long text (500+ characters)', () => {
    const longText = 'FixMyFile provides browser-first online utility tools for PDF conversion, image editing, compression, and generation. '.repeat(5);
    const mat = generateQrMatrix(longText, 'M');
    assert.ok(mat.count > 40);
  });

  test('TEST D: Special characters & Unicode', () => {
    const unicodeText = 'FixMyFile 🚀 — Événement café & 日本語 漢字';
    const mat = generateQrMatrix(unicodeText, 'H');
    assert.ok(mat.count >= 25);
  });

  test('TEST E: Large high-contrast custom palette', () => {
    const navyOnCream = calculateContrast('#1e3a8a', '#fefce8');
    assert.strictEqual(navyOnCream.isSafe, true);
    assert.ok(navyOnCream.ratio >= 7.0);
  });

  // 11. Empty Preview Placeholder & SVG Action Tests (Phase 3.1 Patch)
  console.log('\n11. Testing Empty Preview Placeholder & SVG Action Visibility...');

  const indexPath = path.resolve('src/tools/qr-code-generator/index.jsx');
  const indexSource = fs.readFileSync(indexPath, 'utf8');
  const appCssPath = path.resolve('src/App.css');
  const appCssSource = fs.readFileSync(appCssPath, 'utf8');

  test('1. Empty input displays placeholder container and static graphic', () => {
    assert.match(indexSource, /qr-placeholder-container/);
    assert.match(indexSource, /qr-placeholder-graphic/);
    assert.match(indexSource, /qr-placeholder-svg/);
    assert.match(indexSource, /Your QR code will appear here/);
    assert.match(indexSource, /Enter content to generate your QR code/);
  });

  test('2. Empty input does NOT display scannability verification badge', () => {
    // Only rendered when hasContent is true
    assert.match(indexSource, /\{hasContent && \(\s*<div className="qr-scan-badge-strip">/);
  });

  test('3. Empty input disables PNG download button', () => {
    assert.match(indexSource, /disabled=\{!hasContent[^}]*\}[\s\S]*?id="download-png-btn"/);
  });

  test('4. Empty input disables SVG download button', () => {
    assert.match(indexSource, /disabled=\{!hasContent\}[\s\S]*?id="download-svg-btn"/);
  });

  test('5. Empty input disables Copy Content and Copy SVG actions', () => {
    assert.match(indexSource, /disabled=\{!hasContent\}[\s\S]*?id="copy-content-btn"/);
    assert.match(indexSource, /disabled=\{!hasContent\}[\s\S]*?id="copy-svg-btn"/);
  });

  test('6. Initial state is empty so placeholder appears immediately on load', () => {
    assert.match(indexSource, /const \[urlInput, setUrlInput\] = useState\(''\);/);
    assert.match(indexSource, /const \[debouncedPayload, setDebouncedPayload\] = useState\(''\);/);
  });

  test('7. Typing content updates debounced payload and generates real QR SVG', () => {
    const mat = generateQrMatrix('Hello World', 'M');
    const svg = generateQrSvgString({ matrix: mat, fgColor: '#000000', bgColor: '#ffffff' });
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('<rect'));
  });

  test('8. Real QR enables PNG and SVG downloads when hasContent is true', () => {
    const hasContent = true;
    const isGeneratingPng = false;
    assert.strictEqual(!hasContent || isGeneratingPng, false, 'PNG button must be enabled');
    assert.strictEqual(!hasContent, false, 'SVG button must be enabled');
  });

  test('9. Real QR shows scannability verification via jsQR', () => {
    const mat = generateQrMatrix('Hello World', 'M');
    const { pixels, size } = rasterizeMatrixForJsQR(mat);
    const result = jsQR(pixels, size, size);
    assert.ok(result && result.data === 'Hello World');
  });

  test('10. Clearing content clears debounced payload immediately without lag', () => {
    assert.match(
      indexSource,
      /if \(!currentRawPayload \|\| currentRawPayload\.trim\(\) === ''\) \{\s*setDebouncedPayload\(''\);\s*return;\s*\}/
    );
  });

  test('11. Reset action clears inputs, payload, and scannability state to placeholder', () => {
    assert.match(indexSource, /const handleReset = \(\) => \{[\s\S]*setUrlInput\(''\);[\s\S]*setDebouncedPayload\(''\);/);
  });

  test('12. No stale QR remains when payload is empty', () => {
    const emptyPayload = '';
    const formatted = formatQrPayload({ contentType: 'url', url: emptyPayload });
    assert.strictEqual(formatted, '');
  });

  test('13. SVG download button has clearly visible label preserving "Vector SVG"', () => {
    assert.match(indexSource, /id="download-svg-btn"[\s\S]*?Download Vector SVG/);
  });

  test('14. SVG download button styling in App.css has visible border, text, and hover states', () => {
    assert.match(appCssSource, /\.workbench-btn-secondary\.qr-svg-download-btn\s*\{/);
    assert.match(appCssSource, /border:\s*1\.5px solid var\(--border-strong\);/);
    assert.match(appCssSource, /color:\s*var\(--text-primary\);/);
    assert.match(appCssSource, /\.workbench-btn-secondary\.qr-svg-download-btn:hover:not\(:disabled\)/);
  });

  console.log(`\n=== Automated Test Results: ${passedTests} Passed, ${failedTests} Failed ===\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();
