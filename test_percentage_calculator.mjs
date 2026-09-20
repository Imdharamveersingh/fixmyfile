/**
 * Automated Test Suite for Percentage Calculator (Phase 3.4)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  PERCENTAGE_MODES,
  calculatePercentage
} from './src/tools/percentage-calculator/percentageEngine.js';

const registrySource = fs.readFileSync(path.resolve('src/tools/toolsRegistry.js'), 'utf8');
const appJsxSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
const headerSource = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
const footerSource = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf8');
const appCssSource = fs.readFileSync(path.resolve('src/App.css'), 'utf8');
const componentSource = fs.readFileSync(path.resolve('src/tools/percentage-calculator/index.jsx'), 'utf8');

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

console.log('=== Percentage Calculator Automated Test Suite ===\n');

// 1. Registry & Routes
console.log('1. Checking Tool Registry & Route Registration...');
runTest('Route /percentage-calculator registered in toolsRegistry.js', () => {
  assert.match(registrySource, /id:\s*'percentage-calculator'/);
  assert.match(registrySource, /path:\s*'\/percentage-calculator'/);
});

runTest('Route /percentage-calculator registered in App.jsx', () => {
  assert.match(appJsxSource, /path="percentage-calculator"/);
  assert.match(appJsxSource, /PercentageCalculatorTool/);
});

runTest('Header.jsx includes Percentage Calculator in Generators menu', () => {
  assert.match(headerSource, /to="\/percentage-calculator"/);
});

runTest('Footer.jsx includes Percentage Calculator in Phase 3 links', () => {
  assert.match(footerSource, /to="\/percentage-calculator"/);
});

// 2. Mode definitions
console.log('\n2. Verifying Mode Definitions...');
runTest('All 5 standard modes defined', () => {
  assert.strictEqual(PERCENTAGE_MODES.length, 5);
  const ids = PERCENTAGE_MODES.map((m) => m.id);
  assert.ok(ids.includes('what-is-p-of-y'));
  assert.ok(ids.includes('x-is-what-p-of-y'));
  assert.ok(ids.includes('percentage-change'));
  assert.ok(ids.includes('add-percentage'));
  assert.ok(ids.includes('subtract-percentage'));
});

// 3. Mode 1: What is X% of Y?
console.log('\n3. Testing Mode 1 (What is X% of Y?)...');
runTest('20% of 500 = 100', () => {
  const res = calculatePercentage('what-is-p-of-y', '20', '500');
  assert.strictEqual(res.result, 100);
  assert.strictEqual(res.formattedResult, '100');
  assert.strictEqual(res.steps.length, 2);
});

runTest('Decimal percentage: 17.5% of 240 = 42', () => {
  const res = calculatePercentage('what-is-p-of-y', '17.5', '240');
  assert.strictEqual(res.result, 42);
});

runTest('Zero percentage: 0% of 1000 = 0', () => {
  const res = calculatePercentage('what-is-p-of-y', '0', '1000');
  assert.strictEqual(res.result, 0);
});

runTest('Percentage of negative total: 10% of -500 = -50', () => {
  const res = calculatePercentage('what-is-p-of-y', '10', '-500');
  assert.strictEqual(res.result, -50);
});

// 4. Mode 2: X is what percent of Y?
console.log('\n4. Testing Mode 2 (X is what % of Y?)...');
runTest('100 is what % of 500 = 20%', () => {
  const res = calculatePercentage('x-is-what-p-of-y', '100', '500');
  assert.strictEqual(res.result, 20);
  assert.strictEqual(res.formattedResult, '20%');
});

runTest('Decimal result: 25 of 80 = 31.25%', () => {
  const res = calculatePercentage('x-is-what-p-of-y', '25', '80');
  assert.strictEqual(res.result, 31.25);
  assert.strictEqual(res.formattedResult, '31.25%');
});

runTest('Division by zero protection: 50 is what % of 0', () => {
  const res = calculatePercentage('x-is-what-p-of-y', '50', '0');
  assert.ok(res.error);
  assert.match(res.error, /division by zero/i);
});

// 5. Mode 3: Percentage Increase / Decrease
console.log('\n5. Testing Mode 3 (Percentage Change)...');
runTest('Increase: 500 to 600 = +20% increase', () => {
  const res = calculatePercentage('percentage-change', '500', '600');
  assert.strictEqual(res.result, 20);
  assert.strictEqual(res.changeType, 'increase');
  assert.strictEqual(res.formattedResult, '+20%');
});

runTest('Decrease: 500 to 400 = -20% decrease', () => {
  const res = calculatePercentage('percentage-change', '500', '400');
  assert.strictEqual(res.result, -20);
  assert.strictEqual(res.changeType, 'decrease');
  assert.strictEqual(res.formattedResult, '-20%');
});

runTest('No change: 200 to 200 = 0%', () => {
  const res = calculatePercentage('percentage-change', '200', '200');
  assert.strictEqual(res.result, 0);
  assert.strictEqual(res.changeType, 'none');
});

runTest('Zero initial value protection: 0 to 100', () => {
  const res = calculatePercentage('percentage-change', '0', '100');
  assert.ok(res.error);
  assert.match(res.error, /initial value.*cannot be zero/i);
});

// 6. Mode 4: Add percentage
console.log('\n6. Testing Mode 4 (Add X% to Y)...');
runTest('500 + 20% = 600', () => {
  const res = calculatePercentage('add-percentage', '20', '500');
  assert.strictEqual(res.result, 600);
  assert.strictEqual(res.addition, 100);
  assert.strictEqual(res.formattedResult, '600');
});

runTest('Add 8.5% sales tax to 120 = 130.2', () => {
  const res = calculatePercentage('add-percentage', '8.5', '120');
  assert.strictEqual(res.result, 130.2);
});

// 7. Mode 5: Subtract percentage
console.log('\n7. Testing Mode 5 (Subtract X% from Y)...');
runTest('500 - 20% = 400', () => {
  const res = calculatePercentage('subtract-percentage', '20', '500');
  assert.strictEqual(res.result, 400);
  assert.strictEqual(res.subtraction, 100);
  assert.strictEqual(res.formattedResult, '400');
});

runTest('Subtract 30% discount from 79.99', () => {
  const res = calculatePercentage('subtract-percentage', '30', '79.99');
  assert.ok(Math.abs(res.result - 55.993) < 1e-4);
});

// 8. Difficult Test Matrix
console.log('\n8. Difficult Edge-Case Test Matrix...');
runTest('TEST A: Huge numbers (15% of 1,000,000,000)', () => {
  const res = calculatePercentage('what-is-p-of-y', '15', '1000000000');
  assert.strictEqual(res.result, 150000000);
});

runTest('TEST B: Very small fraction (0.001% of 0.002)', () => {
  const res = calculatePercentage('what-is-p-of-y', '0.001', '0.002');
  assert.ok(res.result > 0);
});

runTest('TEST C: Invalid inputs (non-numeric text)', () => {
  const res = calculatePercentage('what-is-p-of-y', 'abc', '100');
  assert.ok(res.error);
});

runTest('TEST D: Empty input strings', () => {
  const res = calculatePercentage('what-is-p-of-y', '', '500');
  assert.ok(res.error);
});

// 9. Component & CSS Checks
console.log('\n9. Checking Component & CSS Elements...');
runTest('Component contains mode tabs and inputs', () => {
  assert.match(componentSource, /id="percentage-mode-tabs"/);
  assert.match(componentSource, /id="percentage-input-x"/);
  assert.match(componentSource, /id="percentage-input-y"/);
  assert.match(componentSource, /id="copy-percentage-btn"/);
  assert.match(componentSource, /id="reset-percentage-btn"/);
});

runTest('App.css contains percentage styles', () => {
  assert.match(appCssSource, /\.percentage-app-layout/);
  assert.match(appCssSource, /\.percentage-card/);
  assert.match(appCssSource, /\.percentage-mode-tabs/);
  assert.match(appCssSource, /\.percentage-result-box/);
});

console.log(`\n=== Percentage Calculator Suite Completed: ${passed} Passed, 0 Failed ===\n`);
