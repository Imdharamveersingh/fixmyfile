/**
 * Automated Test Suite for Currency Converter (Phase 3.3)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  FALLBACK_RATES,
  validateAmount,
  convertCurrency,
  formatCurrencyValue,
  fetchExchangeRates
} from './src/tools/currency-converter/currencyEngine.js';

const registrySource = fs.readFileSync(path.resolve('src/tools/toolsRegistry.js'), 'utf8');
const appJsxSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
const headerSource = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
const footerSource = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf8');
const appCssSource = fs.readFileSync(path.resolve('src/App.css'), 'utf8');
const componentSource = fs.readFileSync(path.resolve('src/tools/currency-converter/index.jsx'), 'utf8');

let passed = 0;
function runTest(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    throw err;
  }
}

console.log('=== Currency Converter Automated Test Suite ===\n');

// 1. Registry & Routes
console.log('1. Checking Tool Registry & Route Registration...');
runTest('Route /currency-converter registered in toolsRegistry.js', () => {
  assert.match(registrySource, /id:\s*'currency-converter'/);
  assert.match(registrySource, /path:\s*'\/currency-converter'/);
});

runTest('Route /currency-converter registered in App.jsx', () => {
  assert.match(appJsxSource, /path="currency-converter"/);
  assert.match(appJsxSource, /CurrencyConverterTool/);
});

runTest('Header.jsx includes Currency Converter in Generators menu', () => {
  assert.match(headerSource, /to="\/currency-converter"/);
});

runTest('Footer.jsx includes compact Calculators & Generators link', () => {
  assert.match(footerSource, /Calculators & Generators/);
});

// 2. Engine Supported Currencies
console.log('\n2. Checking Supported Currencies & Metadata...');
runTest('Includes all 12 required major currencies', () => {
  const codes = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED', 'SAR'];
  for (const c of codes) {
    assert.ok(CURRENCY_MAP.has(c), `Currency ${c} must be supported`);
    const meta = CURRENCY_MAP.get(c);
    assert.ok(meta.name, `Currency ${c} must have a name`);
    assert.ok(meta.symbol, `Currency ${c} must have a symbol`);
  }
});

runTest('Fallback rates table includes all supported currencies', () => {
  for (const c of SUPPORTED_CURRENCIES) {
    assert.ok(FALLBACK_RATES[c.code] !== undefined, `Fallback rate for ${c.code} must exist`);
    assert.ok(FALLBACK_RATES[c.code] > 0, `Fallback rate for ${c.code} must be positive`);
  }
});

// 3. Amount Validation
console.log('\n3. Testing Amount Validation Logic...');
runTest('Valid integer amount', () => {
  const res = validateAmount('100');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.numericValue, 100);
});

runTest('Valid decimal amount', () => {
  const res = validateAmount('49.99');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.numericValue, 49.99);
});

runTest('Valid zero amount', () => {
  const res = validateAmount('0');
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.numericValue, 0);
});

runTest('Rejects empty or whitespace amount', () => {
  assert.strictEqual(validateAmount('').valid, false);
  assert.strictEqual(validateAmount('   ').valid, false);
  assert.strictEqual(validateAmount(null).valid, false);
});

runTest('Rejects negative amount', () => {
  const res = validateAmount('-50');
  assert.strictEqual(res.valid, false);
  assert.match(res.error, /cannot be negative/i);
});

runTest('Rejects non-numeric characters', () => {
  assert.strictEqual(validateAmount('abc').valid, false);
  assert.strictEqual(validateAmount('12a.3').valid, false);
  assert.strictEqual(validateAmount('$100').valid, false);
});

runTest('Rejects excessively large numbers', () => {
  const res = validateAmount('10000000000000000');
  assert.strictEqual(res.valid, false);
  assert.match(res.error, /limit/i);
});

// 4. Currency Conversion Calculations
console.log('\n4. Testing Currency Conversion Calculations...');
runTest('Standard USD to INR conversion with fallback rates', () => {
  const res = convertCurrency(100, 'USD', 'INR', FALLBACK_RATES);
  // 100 USD * 83.5 = 8350 INR
  assert.strictEqual(res.result, 8350);
  assert.strictEqual(res.unitRate, 83.5);
  assert.strictEqual(res.reverseRate, 1 / 83.5);
});

runTest('Cross-currency conversion (EUR to GBP)', () => {
  // 100 EUR = (100 / 0.92) * 0.79 = 85.869565...
  const res = convertCurrency(100, 'EUR', 'GBP', FALLBACK_RATES);
  const expected = (100 / FALLBACK_RATES.EUR) * FALLBACK_RATES.GBP;
  assert.ok(Math.abs(res.result - expected) < 1e-6);
});

runTest('Identity conversion (USD to USD)', () => {
  const res = convertCurrency(250, 'USD', 'USD', FALLBACK_RATES);
  assert.strictEqual(res.result, 250);
  assert.strictEqual(res.unitRate, 1.0);
  assert.strictEqual(res.reverseRate, 1.0);
});

runTest('Zero amount yields zero result', () => {
  const res = convertCurrency(0, 'USD', 'EUR', FALLBACK_RATES);
  assert.strictEqual(res.result, 0);
});

runTest('Throws for unknown currency code', () => {
  assert.throws(() => convertCurrency(100, 'FAKE', 'USD', FALLBACK_RATES), /unavailable/i);
});

// 5. Formatting
console.log('\n5. Testing Value Formatting...');
runTest('Formats standard USD currency value', () => {
  assert.strictEqual(formatCurrencyValue(1234.56, 'USD'), '1,234.56');
});

runTest('Formats zero decimals for JPY', () => {
  assert.strictEqual(formatCurrencyValue(15000, 'JPY'), '15,000');
});

runTest('Formats small fractional values with higher precision', () => {
  const val = formatCurrencyValue(0.0042, 'USD');
  assert.ok(val.includes('0.0042'));
});

// 6. Difficult Test Matrix
console.log('\n6. Difficult Test Matrix...');
runTest('TEST A: Very small fraction (0.0001 USD to INR)', () => {
  const res = convertCurrency(0.0001, 'USD', 'INR', FALLBACK_RATES);
  assert.ok(res.result > 0);
  assert.ok(Math.abs(res.result - 0.00835) < 1e-6);
});

runTest('TEST B: Large conversion (1,000,000,000 JPY to USD)', () => {
  const res = convertCurrency(1000000000, 'JPY', 'USD', FALLBACK_RATES);
  const expected = 1000000000 / FALLBACK_RATES.JPY;
  assert.ok(Math.abs(res.result - expected) < 1e-2);
});

runTest('TEST C: High precision decimals (123.456789 EUR to CAD)', () => {
  const res = convertCurrency(123.456789, 'EUR', 'CAD', FALLBACK_RATES);
  const expected = (123.456789 / FALLBACK_RATES.EUR) * FALLBACK_RATES.CAD;
  assert.ok(Math.abs(res.result - expected) < 1e-4);
});

runTest('TEST D: Mutual inverse integrity ((A->B)->A == A)', () => {
  const amount = 500;
  const toB = convertCurrency(amount, 'USD', 'JPY', FALLBACK_RATES);
  const backToA = convertCurrency(toB.result, 'JPY', 'USD', FALLBACK_RATES);
  assert.ok(Math.abs(backToA.result - amount) < 1e-6);
});

// 7. Rate Fetching & Fallback
console.log('\n7. Testing Rate Fetching & Fallback Integrity...');
await runAsyncTest('fetchExchangeRates returns rates and source metadata', async () => {
  const data = await fetchExchangeRates();
  assert.ok(data.rates, 'rates must exist');
  assert.ok(data.rates.USD === 1, 'USD rate must be 1.0');
  assert.ok(data.rates.INR > 0, 'INR rate must be positive');
  assert.ok(data.source, 'source must be declared');
  assert.ok(data.lastUpdated, 'lastUpdated must be declared');
});

// 8. Component & CSS Checks
console.log('\n8. Checking Component & CSS Design Elements...');
runTest('Component exports default function', () => {
  assert.match(componentSource, /export default function CurrencyConverterTool/);
});

runTest('Component contains required accessibility IDs and selectors', () => {
  assert.match(componentSource, /id="currency-tool-title"/);
  assert.match(componentSource, /id="currency-amount-input"/);
  assert.match(componentSource, /id="currency-from-select"/);
  assert.match(componentSource, /id="currency-to-select"/);
  assert.match(componentSource, /id="currency-swap-btn"/);
  assert.match(componentSource, /id="currency-converted-result"/);
  assert.match(componentSource, /id="copy-result-btn"/);
  assert.match(componentSource, /id="currency-reset-btn"/);
});

runTest('App.css contains currency layout styles and responsive rules', () => {
  assert.match(appCssSource, /\.currency-app-layout/);
  assert.match(appCssSource, /\.currency-card/);
  assert.match(appCssSource, /\.currency-swap-btn/);
  assert.match(appCssSource, /\.currency-result-box/);
  assert.match(appCssSource, /@media \(max-width: 650px\)/);
});

console.log(`\n=== Automated Currency Converter Suite Completed: ${passed} Passed, 0 Failed ===\n`);
