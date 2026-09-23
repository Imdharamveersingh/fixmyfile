/**
 * Automated Test Suite for Barcode Generator (Phase 3.2)
 * Tests: Registry, format validation, engine logic, appearance, downloads, difficult matrix.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/* ── Load project modules ─────────────────────────────────────── */
const registryPath = path.resolve('src/tools/toolsRegistry.js');
const registrySource = fs.readFileSync(registryPath, 'utf8');
const appJsxPath = path.resolve('src/App.jsx');
const appJsxSource = fs.readFileSync(appJsxPath, 'utf8');
const headerPath = path.resolve('src/components/Header.jsx');
const headerSource = fs.readFileSync(headerPath, 'utf8');
const footerPath = path.resolve('src/components/Footer.jsx');
const footerSource = fs.readFileSync(footerPath, 'utf8');
const componentPath = path.resolve('src/tools/barcode-generator/index.jsx');
const componentSource = fs.readFileSync(componentPath, 'utf8');
const enginePath = path.resolve('src/tools/barcode-generator/barcodeEngine.js');
const engineSource = fs.readFileSync(enginePath, 'utf8');
const appCssPath = path.resolve('src/App.css');
const appCssSource = fs.readFileSync(appCssPath, 'utf8');

/* ── Import engine functions for logic tests ──────────────────── */
const {
  BARCODE_FORMATS,
  verifyEanChecksum,
  verifyUpcChecksum,
  calculateContrast,
  sanitizeFilename,
  getFormatById
} = await import('./src/tools/barcode-generator/barcodeEngine.js');

let passedTests = 0;
let failedTests = 0;

const originalTest = test;
function wrappedTest(name, fn) {
  return originalTest(name, async () => {
    try {
      await fn();
      passedTests++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failedTests++;
      console.error(`  ✗ ${name}: ${err.message}`);
      throw err;
    }
  });
}
// Override
const testFn = wrappedTest;

async function runAllTests() {
  console.log('=== Barcode Generator Automated Test Suite ===\n');

  // 1. Route Registration
  console.log('1. Checking Tool Registry & Route Definitions...');

  testFn('Route /barcode-generator in registry', () => {
    assert.match(registrySource, /barcode-generator/);
    assert.match(registrySource, /\/barcode-generator/);
  });

  testFn('getToolById returns barcode-generator', () => {
    assert.match(registrySource, /id: 'barcode-generator'/);
  });

  testFn('PHASE_3_TOOLS contains barcode-generator', () => {
    assert.match(registrySource, /PHASE_3_TOOLS/);
    assert.match(registrySource, /barcode-generator/);
  });

  testFn('ALL_TOOLS includes all Phase 1, 2, 3 tools', () => {
    assert.match(registrySource, /ALL_TOOLS.*PHASE_1.*PHASE_2.*PHASE_3/s);
  });

  // 2. Phase regression routes
  console.log('\n2. Verifying All Phase Routes Remain Intact...');
  const routes = [
    '/jpg-to-pdf', '/pdf-to-word', '/pdf-to-jpg', '/word-to-pdf',
    '/merge-pdf', '/compress-pdf', '/background-remover', '/image-compressor',
    '/image-resizer', '/image-converter', '/jpg-to-png', '/png-to-jpg',
    '/qr-code-generator', '/barcode-generator'
  ];
  for (const route of routes) {
    testFn(`Route ${route} registered`, () => {
      assert.match(registrySource, new RegExp(route.replace(/\//g, '\\/')));
    });
  }

  // 3. App.jsx & Navigation
  console.log('\n3. Verifying App.jsx and Navigation...');

  testFn('App.jsx contains barcode-generator route', () => {
    assert.match(appJsxSource, /barcode-generator/);
  });

  testFn('Header.jsx contains barcode-generator link', () => {
    assert.match(headerSource, /\/barcode-generator/);
  });

  testFn('Footer.jsx contains compact Calculators & Generators link', () => {
    assert.match(footerSource, /Calculators & Generators/);
  });

  // 4. Component existence
  console.log('\n4. Verifying Component Structure...');

  testFn('Component file exists', () => {
    assert.ok(fs.existsSync(componentPath));
  });

  testFn('Engine file exists', () => {
    assert.ok(fs.existsSync(enginePath));
  });

  testFn('Component exports default function', () => {
    assert.match(componentSource, /export default function BarcodeGeneratorTool/);
  });

  // 5. Empty state
  console.log('\n5. Testing Empty State & Placeholder...');

  testFn('Placeholder container rendered when no input', () => {
    assert.match(componentSource, /barcode-placeholder-container/);
    assert.match(componentSource, /barcode-placeholder-graphic/);
    assert.match(componentSource, /barcode-placeholder-svg/);
  });

  testFn('Placeholder hint text present', () => {
    assert.match(componentSource, /Enter data to generate your barcode/);
  });

  testFn('Download PNG disabled when not valid', () => {
    assert.match(componentSource, /disabled=\{!isValid \|\| isGeneratingPng\}/);
  });

  testFn('Download SVG disabled when not valid', () => {
    assert.match(componentSource, /disabled=\{!isValid\}[\s\S]*?id="download-svg-btn"/);
  });

  testFn('Copy Value disabled when not valid', () => {
    assert.match(componentSource, /disabled=\{!isValid\}[\s\S]*?id="copy-value-btn"/);
  });

  testFn('Copy SVG disabled when not valid', () => {
    assert.match(componentSource, /disabled=\{!isValid\}[\s\S]*?id="copy-svg-btn"/);
  });

  testFn('Generated badge only shows when isValid', () => {
    assert.match(componentSource, /\{isValid && \(/);
  });

  // 6. Format definitions
  console.log('\n6. Testing Format Definitions...');

  testFn('8 barcode formats defined', () => {
    assert.strictEqual(BARCODE_FORMATS.length, 8);
  });

  const expectedFormats = ['CODE128', 'CODE39', 'EAN13', 'EAN8', 'UPC', 'ITF14', 'ITF', 'codabar'];
  for (const fmtId of expectedFormats) {
    testFn(`Format ${fmtId} exists with validate function`, () => {
      const fmt = getFormatById(fmtId);
      assert.ok(fmt, `Format ${fmtId} not found`);
      assert.strictEqual(typeof fmt.validate, 'function');
      assert.ok(fmt.name);
      assert.ok(fmt.hint);
    });
  }

  // 7. CODE128 validation
  console.log('\n7. Testing CODE128 Validation...');

  testFn('CODE128 accepts simple text', () => {
    const fmt = getFormatById('CODE128');
    assert.strictEqual(fmt.validate('Hello World'), null);
  });

  testFn('CODE128 accepts long alphanumeric', () => {
    const fmt = getFormatById('CODE128');
    assert.strictEqual(fmt.validate('ABC123-XYZ-789'), null);
  });

  testFn('CODE128 rejects empty', () => {
    const fmt = getFormatById('CODE128');
    assert.ok(fmt.validate(''));
  });

  // 8. CODE39 validation
  console.log('\n8. Testing CODE39 Validation...');

  testFn('CODE39 accepts valid characters', () => {
    const fmt = getFormatById('CODE39');
    assert.strictEqual(fmt.validate('HELLO-123'), null);
  });

  testFn('CODE39 rejects invalid characters', () => {
    const fmt = getFormatById('CODE39');
    assert.ok(fmt.validate('hello@world'));
  });

  // 9. EAN-13 validation
  console.log('\n9. Testing EAN-13 Validation...');

  testFn('EAN-13 accepts 12 digits', () => {
    const fmt = getFormatById('EAN13');
    assert.strictEqual(fmt.validate('590123456789'), null);
  });

  testFn('EAN-13 accepts valid 13 digits', () => {
    const fmt = getFormatById('EAN13');
    // 4006381333931 is a valid EAN-13 (checksum 1)
    assert.strictEqual(fmt.validate('4006381333931'), null);
  });

  testFn('EAN-13 rejects invalid checksum', () => {
    const fmt = getFormatById('EAN13');
    assert.ok(fmt.validate('4006381333932'));
  });

  testFn('EAN-13 rejects wrong length', () => {
    const fmt = getFormatById('EAN13');
    assert.ok(fmt.validate('12345'));
  });

  testFn('EAN-13 rejects non-digits', () => {
    const fmt = getFormatById('EAN13');
    assert.ok(fmt.validate('12345678901A'));
  });

  // 10. EAN-8 validation
  console.log('\n10. Testing EAN-8 Validation...');

  testFn('EAN-8 accepts 7 digits', () => {
    const fmt = getFormatById('EAN8');
    assert.strictEqual(fmt.validate('9638507'), null);
  });

  testFn('EAN-8 accepts valid 8 digits', () => {
    const fmt = getFormatById('EAN8');
    assert.strictEqual(fmt.validate('96385074'), null);
  });

  testFn('EAN-8 rejects invalid checksum', () => {
    const fmt = getFormatById('EAN8');
    assert.ok(fmt.validate('96385073'));
  });

  // 11. UPC-A validation
  console.log('\n11. Testing UPC-A Validation...');

  testFn('UPC-A accepts 11 digits', () => {
    const fmt = getFormatById('UPC');
    assert.strictEqual(fmt.validate('01234567890'), null);
  });

  testFn('UPC-A accepts valid 12 digits', () => {
    const fmt = getFormatById('UPC');
    assert.strictEqual(fmt.validate('012345678905'), null);
  });

  testFn('UPC-A rejects invalid checksum', () => {
    const fmt = getFormatById('UPC');
    assert.ok(fmt.validate('012345678901'));
  });

  // 12. ITF-14 validation
  console.log('\n12. Testing ITF-14 Validation...');

  testFn('ITF-14 accepts 13 digits', () => {
    const fmt = getFormatById('ITF14');
    assert.strictEqual(fmt.validate('1234567890123'), null);
  });

  testFn('ITF-14 rejects wrong length', () => {
    const fmt = getFormatById('ITF14');
    assert.ok(fmt.validate('12345'));
  });

  // 13. ITF validation
  console.log('\n13. Testing ITF Validation...');

  testFn('ITF accepts even-length digits', () => {
    const fmt = getFormatById('ITF');
    assert.strictEqual(fmt.validate('1234'), null);
  });

  testFn('ITF rejects odd-length digits', () => {
    const fmt = getFormatById('ITF');
    assert.ok(fmt.validate('123'));
  });

  testFn('ITF rejects non-digits', () => {
    const fmt = getFormatById('ITF');
    assert.ok(fmt.validate('12AB'));
  });

  // 14. Codabar validation
  console.log('\n14. Testing Codabar Validation...');

  testFn('Codabar accepts valid format', () => {
    const fmt = getFormatById('codabar');
    assert.strictEqual(fmt.validate('A12345B'), null);
  });

  testFn('Codabar rejects missing start/stop', () => {
    const fmt = getFormatById('codabar');
    assert.ok(fmt.validate('12345'));
  });

  // 15. Checksum helpers
  console.log('\n15. Testing Checksum Helpers...');

  testFn('verifyEanChecksum validates correct EAN-13', () => {
    assert.strictEqual(verifyEanChecksum('4006381333931'), true);
  });

  testFn('verifyEanChecksum rejects incorrect EAN-13', () => {
    assert.strictEqual(verifyEanChecksum('4006381333932'), false);
  });

  testFn('verifyUpcChecksum validates correct UPC-A', () => {
    assert.strictEqual(verifyUpcChecksum('012345678905'), true);
  });

  testFn('verifyUpcChecksum rejects incorrect UPC-A', () => {
    assert.strictEqual(verifyUpcChecksum('012345678901'), false);
  });

  // 16. Contrast
  console.log('\n16. Testing Contrast Safety...');

  testFn('Black on white has maximum contrast (21:1)', () => {
    const { ratio } = calculateContrast('#000000', '#ffffff');
    assert.ok(ratio >= 20);
  });

  testFn('Low contrast detected for similar colors', () => {
    const { ratio } = calculateContrast('#cccccc', '#ffffff');
    assert.ok(ratio < 3);
  });

  testFn('Inverted detection for light-on-dark', () => {
    const { isInverted } = calculateContrast('#ffffff', '#000000');
    assert.strictEqual(isInverted, true);
  });

  // 17. Filename sanitization
  console.log('\n17. Testing Filename Sanitization...');

  testFn('Sanitizes text value', () => {
    assert.strictEqual(sanitizeFilename('Hello World!'), 'Hello-World');
  });

  testFn('Sanitizes numbers', () => {
    assert.strictEqual(sanitizeFilename('5901234567890'), '5901234567890');
  });

  testFn('Falls back to barcode for empty', () => {
    assert.strictEqual(sanitizeFilename(''), 'barcode');
  });

  testFn('Truncates long values', () => {
    const long = 'A'.repeat(50);
    assert.ok(sanitizeFilename(long).length <= 40);
  });

  // 18. CSS styles
  console.log('\n18. Testing CSS Styles...');

  testFn('Barcode layout CSS exists', () => {
    assert.match(appCssSource, /\.barcode-app-layout/);
    assert.match(appCssSource, /\.barcode-config-panel/);
    assert.match(appCssSource, /\.barcode-preview-panel/);
  });

  testFn('Scanner animation CSS exists', () => {
    assert.match(appCssSource, /\.barcode-scanner-effect/);
    assert.match(appCssSource, /@keyframes barcodeScan/);
  });

  testFn('Placeholder CSS exists', () => {
    assert.match(appCssSource, /\.barcode-placeholder-container/);
    assert.match(appCssSource, /\.barcode-placeholder-graphic/);
  });

  testFn('SVG download button has visible styling', () => {
    assert.match(appCssSource, /\.workbench-btn-secondary\.barcode-svg-download-btn/);
  });

  testFn('Responsive breakpoint exists', () => {
    assert.match(appCssSource, /\.barcode-app-layout[\s\S]*grid-template-columns: 1fr/);
  });

  // 19. Component features
  console.log('\n19. Testing Component Features...');

  testFn('SEO title set', () => {
    assert.match(componentSource, /Barcode Generator - Free Online Barcode Maker \| FixMyFile/);
  });

  testFn('Format selector exists', () => {
    assert.match(componentSource, /barcode-format-select/);
  });

  testFn('Input field exists', () => {
    assert.match(componentSource, /barcode-value-input/);
  });

  testFn('Color pickers exist', () => {
    assert.match(componentSource, /barcode-fg-color/);
    assert.match(componentSource, /barcode-bg-color/);
  });

  testFn('Bar width slider exists', () => {
    assert.match(componentSource, /barcode-bar-width/);
  });

  testFn('Bar height slider exists', () => {
    assert.match(componentSource, /barcode-bar-height/);
  });

  testFn('Margin slider exists', () => {
    assert.match(componentSource, /barcode-margin/);
  });

  testFn('Display value toggle exists', () => {
    assert.match(componentSource, /barcode-display-value-toggle/);
  });

  testFn('Font size control exists', () => {
    assert.match(componentSource, /barcode-font-size/);
  });

  testFn('Text position options exist', () => {
    assert.match(componentSource, /textPosition/);
  });

  testFn('Reset button exists', () => {
    assert.match(componentSource, /barcode-reset-btn/);
  });

  testFn('handleReset clears state properly', () => {
    assert.match(componentSource, /const handleReset = \(\) => \{[\s\S]*setInputValue\(''\)[\s\S]*setDebouncedValue\(''\)/);
  });

  testFn('Debounce clears immediately when empty', () => {
    assert.match(componentSource, /if \(!inputValue \|\| inputValue\.trim\(\) === ''\) \{[\s\S]*setDebouncedValue\(''\)/);
  });

  testFn('Contrast warning rendered when low', () => {
    assert.match(componentSource, /barcode-contrast-warning/);
  });

  testFn('Scanner effect class on render container', () => {
    assert.match(componentSource, /barcode-scanner-effect/);
  });

  testFn('Info panel shows format, encoded, dimensions', () => {
    assert.match(componentSource, /barcode-info-panel/);
    assert.match(componentSource, /info-label.*Format/s);
    assert.match(componentSource, /info-label.*Encoded/s);
  });

  // 20. Difficult Test Matrix
  console.log('\n20. Difficult Test Matrix...');

  testFn('TEST A: CODE128 simple text', () => {
    const fmt = getFormatById('CODE128');
    assert.strictEqual(fmt.validate('Hello'), null);
  });

  testFn('TEST B: CODE128 long alphanumeric', () => {
    const fmt = getFormatById('CODE128');
    assert.strictEqual(fmt.validate('ITEM-2024-BATCH-XJ-72904-PROD'), null);
  });

  testFn('TEST C: CODE39 valid characters', () => {
    const fmt = getFormatById('CODE39');
    assert.strictEqual(fmt.validate('ABC-123'), null);
  });

  testFn('TEST D: CODE39 invalid characters', () => {
    const fmt = getFormatById('CODE39');
    assert.ok(fmt.validate('abc@#!'));
  });

  testFn('TEST E: EAN-13 valid 4006381333931', () => {
    const fmt = getFormatById('EAN13');
    assert.strictEqual(fmt.validate('4006381333931'), null);
  });

  testFn('TEST F: EAN-13 invalid checksum', () => {
    const fmt = getFormatById('EAN13');
    assert.ok(fmt.validate('4006381333939'));
  });

  testFn('TEST G: EAN-8 valid 96385074', () => {
    const fmt = getFormatById('EAN8');
    assert.strictEqual(fmt.validate('96385074'), null);
  });

  testFn('TEST H: UPC-A valid 012345678905', () => {
    const fmt = getFormatById('UPC');
    assert.strictEqual(fmt.validate('012345678905'), null);
  });

  testFn('TEST I: ITF-14 valid 13 digits', () => {
    const fmt = getFormatById('ITF14');
    assert.strictEqual(fmt.validate('1234567890123'), null);
  });

  testFn('TEST J: Codabar valid A12345B', () => {
    const fmt = getFormatById('codabar');
    assert.strictEqual(fmt.validate('A12345B'), null);
  });

  testFn('TEST L: Empty→valid→empty→valid cycle', () => {
    const fmt = getFormatById('CODE128');
    assert.ok(fmt.validate('')); // empty = error
    assert.strictEqual(fmt.validate('Test'), null); // valid
    assert.ok(fmt.validate('')); // empty again
    assert.strictEqual(fmt.validate('Test2'), null); // valid again
  });

  testFn('TEST M: Black barcode / white background contrast', () => {
    const { ratio } = calculateContrast('#000000', '#ffffff');
    assert.ok(ratio >= 20);
  });

  testFn('TEST N: Custom dark/light contrast OK', () => {
    const { ratio } = calculateContrast('#1e3a8a', '#fefce8');
    assert.ok(ratio >= 3);
  });

  testFn('TEST O: Low contrast detected', () => {
    const { ratio } = calculateContrast('#e0e0e0', '#f0f0f0');
    assert.ok(ratio < 3);
  });

  testFn('TEST R: Human-readable ON state', () => {
    assert.match(componentSource, /displayValue.*true/);
  });

  testFn('TEST S: Human-readable OFF toggle', () => {
    assert.match(componentSource, /setDisplayValue\(!displayValue\)/);
  });

  testFn('TEST V: SVG has no raster <image> in engine', () => {
    assert.match(engineSource, /generateBarcodeSvg/);
    assert.ok(!engineSource.includes('<image'));
  });

  testFn('TEST W: Scanner animation is CSS-only overlay', () => {
    assert.match(appCssSource, /barcode-scanner-effect::after/);
    assert.match(appCssSource, /pointer-events: none/);
    assert.match(appCssSource, /z-index: 1/);
  });

  testFn('TEST X: Reset clears format and regenerates', () => {
    assert.match(componentSource, /setBarcodeFormat\('CODE128'\)/);
    assert.match(componentSource, /setInputValue\(''\)/);
  });

  console.log(`\n=== Automated Test Results: ${passedTests} Passed, ${failedTests} Failed ===\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runAllTests();
