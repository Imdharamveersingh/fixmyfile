/**
 * Comprehensive Automated Test Suite for Phase 3.7 EMI Calculator
 */
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculateEMI, formatCurrency } from './src/tools/emi-calculator/emiEngine.js';
import { ALL_TOOLS, PHASE_1_TOOLS, PHASE_2_TOOLS, PHASE_3_TOOLS, getToolByPath } from './src/tools/toolsRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('=== EMI Calculator Automated Test Suite ===\n');

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Tool Registry & Integration Checks
console.log('1. Checking Tool Registry & Route Registration...');

runTest('Route /emi-calculator registered in toolsRegistry.js', () => {
  const tool = getToolByPath('/emi-calculator');
  assert.ok(tool, 'Tool must be found in toolsRegistry');
  assert.strictEqual(tool.id, 'emi-calculator');
  assert.strictEqual(tool.category, 'Calculators');
  assert.strictEqual(tool.phase, 'Phase 3');
});

runTest('Phase 3 now contains exactly 7 tools', () => {
  assert.strictEqual(PHASE_3_TOOLS.length, 7, `Expected 7 Phase 3 tools, got ${PHASE_3_TOOLS.length}`);
});

runTest('Total active tools equals 19 (6 + 6 + 7)', () => {
  assert.strictEqual(PHASE_1_TOOLS.length, 6, 'Phase 1 must have 6 tools');
  assert.strictEqual(PHASE_2_TOOLS.length, 6, 'Phase 2 must have 6 tools');
  assert.strictEqual(PHASE_3_TOOLS.length, 7, 'Phase 3 must have 7 tools');
  assert.strictEqual(ALL_TOOLS.length, 19, `Expected 19 total active tools, got ${ALL_TOOLS.length}`);
});

runTest('Route /emi-calculator registered in App.jsx', () => {
  const appSrc = fs.readFileSync(path.join(__dirname, 'src', 'App.jsx'), 'utf-8');
  assert.ok(appSrc.includes('path="emi-calculator"'), 'App.jsx must contain emi-calculator route');
  assert.ok(appSrc.includes('EmiCalculatorTool'), 'App.jsx must import EmiCalculatorTool');
});

runTest('Header.jsx includes EMI Calculator in navigation', () => {
  const headerSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'Header.jsx'), 'utf-8');
  assert.ok(headerSrc.includes('/emi-calculator'), 'Header.jsx must have link to /emi-calculator');
});

runTest('Footer.jsx includes EMI Calculator in Phase 3 links', () => {
  const footerSrc = fs.readFileSync(path.join(__dirname, 'src', 'components', 'Footer.jsx'), 'utf-8');
  assert.ok(footerSrc.includes('/emi-calculator'), 'Footer.jsx must have link to /emi-calculator');
});

// 2. Mathematical Accuracy Tests
console.log('\n2. Testing Mathematical Accuracy & Known Benchmarks...');

runTest('Standard Benchmark: ₹5,00,000 at 10% for 5 years', () => {
  const res = calculateEMI({
    principal: 500000,
    annualRate: 10,
    tenure: 5,
    tenureUnit: 'years'
  });

  assert.strictEqual(res.error, null);
  assert.strictEqual(res.months, 60);
  // Expected EMI is ~10623.52 (within tolerance of 1)
  assert.ok(Math.abs(res.monthlyEmi - 10623.52) < 1, `Expected EMI ~10623.52, got ${res.monthlyEmi}`);
  assert.ok(Math.abs(res.totalPayment - 637411.3) < 10, `Expected total ~637411, got ${res.totalPayment}`);
  assert.ok(Math.abs(res.totalInterest - 137411.3) < 10, `Expected interest ~137411, got ${res.totalInterest}`);
  assert.ok(res.principalRatio > 75 && res.principalRatio < 80);
  assert.ok(res.interestRatio > 20 && res.interestRatio < 25);
});

runTest('0% Interest Rate calculates without division by zero', () => {
  const res = calculateEMI({
    principal: 120000,
    annualRate: 0,
    tenure: 1,
    tenureUnit: 'years'
  });

  assert.strictEqual(res.error, null);
  assert.strictEqual(res.months, 12);
  assert.strictEqual(res.monthlyEmi, 10000);
  assert.strictEqual(res.totalInterest, 0);
  assert.strictEqual(res.totalPayment, 120000);
  assert.strictEqual(res.principalRatio, 100);
  assert.strictEqual(res.interestRatio, 0);
});

runTest('Decimal interest rate: 8.75% for 15 years', () => {
  const res = calculateEMI({
    principal: 2500000,
    annualRate: 8.75,
    tenure: 15,
    tenureUnit: 'years'
  });

  assert.strictEqual(res.error, null);
  assert.strictEqual(res.months, 180);
  // Standard financial formula yields ~24986.22
  assert.ok(Math.abs(res.monthlyEmi - 24986.22) < 1, `Expected EMI ~24986.22, got ${res.monthlyEmi}`);
});

runTest('Monthly tenure mode: 6 months loan', () => {
  const res = calculateEMI({
    principal: 60000,
    annualRate: 12,
    tenure: 6,
    tenureUnit: 'months'
  });

  assert.strictEqual(res.error, null);
  assert.strictEqual(res.months, 6);
  assert.ok(res.monthlyEmi > 10000 && res.monthlyEmi < 10500);
  assert.ok(res.totalInterest > 0 && res.totalInterest < 3000);
});

runTest('Short tenure: 1 month loan', () => {
  const res = calculateEMI({
    principal: 10000,
    annualRate: 12,
    tenure: 1,
    tenureUnit: 'months'
  });

  assert.strictEqual(res.error, null);
  assert.strictEqual(res.months, 1);
  // 1 month at 1% monthly rate = 10100
  assert.strictEqual(res.totalPayment, 10100);
  assert.strictEqual(res.totalInterest, 100);
});

runTest('Large principal loan: 10 Crores (100,000,000) for 20 years', () => {
  const res = calculateEMI({
    principal: 100000000,
    annualRate: 8.5,
    tenure: 20,
    tenureUnit: 'years'
  });

  assert.strictEqual(res.error, null);
  assert.strictEqual(res.months, 240);
  assert.ok(res.monthlyEmi > 800000 && res.monthlyEmi < 900000);
  assert.ok(res.totalPayment > 200000000);
});

// 3. Validation & Edge Cases
console.log('\n3. Testing Validation & Edge Cases...');

runTest('Rejects zero principal', () => {
  const res = calculateEMI({ principal: 0, annualRate: 10, tenure: 5 });
  assert.ok(res.error && res.error.includes('principal'));
});

runTest('Rejects negative principal', () => {
  const res = calculateEMI({ principal: -50000, annualRate: 10, tenure: 5 });
  assert.ok(res.error);
});

runTest('Rejects negative interest rate', () => {
  const res = calculateEMI({ principal: 100000, annualRate: -5, tenure: 2 });
  assert.ok(res.error && res.error.includes('Interest rate'));
});

runTest('Rejects zero or negative tenure', () => {
  const res1 = calculateEMI({ principal: 100000, annualRate: 10, tenure: 0 });
  assert.ok(res1.error);
  const res2 = calculateEMI({ principal: 100000, annualRate: 10, tenure: -1 });
  assert.ok(res2.error);
});

runTest('Handles non-numeric string gracefully', () => {
  const res = calculateEMI({ principal: 'abc', annualRate: 'xyz', tenure: 'test' });
  assert.ok(res.error);
});

// 4. Currency Formatting
console.log('\n4. Testing Currency Formatting...');

runTest('formatCurrency formats INR with symbol correctly', () => {
  const formatted = formatCurrency(500000, '₹');
  assert.ok(formatted.includes('₹'));
  assert.ok(formatted.includes('5,00,000') || formatted.includes('500,000'));
});

runTest('formatCurrency formats USD with symbol correctly', () => {
  const formatted = formatCurrency(12345.67, '$');
  assert.ok(formatted.startsWith('$'));
});

runTest('formatCurrency handles 0 and invalid inputs gracefully', () => {
  assert.strictEqual(formatCurrency(0, '₹'), '₹0');
  assert.strictEqual(formatCurrency(null, '₹'), '₹0');
  assert.strictEqual(formatCurrency(NaN, '₹'), '₹0');
});

// 5. Component Structure & CSS Checks
console.log('\n5. Checking Component & CSS Elements...');

runTest('Component contains all required input and result element IDs', () => {
  const compSrc = fs.readFileSync(path.join(__dirname, 'src', 'tools', 'emi-calculator', 'index.jsx'), 'utf-8');
  assert.ok(compSrc.includes('id="emi-loan-amount"'));
  assert.ok(compSrc.includes('id="emi-interest-rate"'));
  assert.ok(compSrc.includes('id="emi-tenure"'));
  assert.ok(compSrc.includes('id="emi-unit-years"'));
  assert.ok(compSrc.includes('id="emi-unit-months"'));
  assert.ok(compSrc.includes('id="emi-result-monthly"'));
  assert.ok(compSrc.includes('id="emi-result-principal"'));
  assert.ok(compSrc.includes('id="emi-result-interest"'));
  assert.ok(compSrc.includes('id="emi-result-total"'));
  assert.ok(compSrc.includes('id="emi-breakdown-bar"'));
  assert.ok(compSrc.includes('id="emi-reset-btn"'));
  assert.ok(compSrc.includes('id="emi-copy-btn"'));
});

runTest('App.css contains EMI Calculator layout and styles', () => {
  const css = fs.readFileSync(path.join(__dirname, 'src', 'App.css'), 'utf-8');
  assert.ok(css.includes('.emi-calculator-layout'));
  assert.ok(css.includes('.emi-hero-box'));
  assert.ok(css.includes('.emi-ratio-bar-track'));
});

console.log(`\n=== EMI Calculator Suite Completed: ${passed} Passed, ${failed} Failed ===\n`);

if (failed > 0) {
  process.exit(1);
}
