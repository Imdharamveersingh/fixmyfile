/**
 * Automated Test Suite for Password Generator (Phase 3.5)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  CHARSETS,
  AMBIGUOUS_CHARS,
  SIMILAR_CHARS,
  PRESETS,
  generatePassword,
  calculateStrength
} from './src/tools/password-generator/passwordEngine.js';

const registrySource = fs.readFileSync(path.resolve('src/tools/toolsRegistry.js'), 'utf8');
const appJsxSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
const headerSource = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
const footerSource = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf8');
const engineSource = fs.readFileSync(path.resolve('src/tools/password-generator/passwordEngine.js'), 'utf8');
const componentSource = fs.readFileSync(path.resolve('src/tools/password-generator/index.jsx'), 'utf8');
const appCssSource = fs.readFileSync(path.resolve('src/App.css'), 'utf8');

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

console.log('=== Password Generator Automated Test Suite ===\n');

// 1. Registry & Routes
console.log('1. Checking Tool Registry & Route Registration...');
runTest('Route /password-generator registered in toolsRegistry.js', () => {
  assert.match(registrySource, /id:\s*'password-generator'/);
  assert.match(registrySource, /path:\s*'\/password-generator'/);
});

runTest('Route /password-generator registered in App.jsx', () => {
  assert.match(appJsxSource, /path="password-generator"/);
  assert.match(appJsxSource, /PasswordGeneratorTool/);
});

runTest('Header.jsx includes Password Generator in Generators menu', () => {
  assert.match(headerSource, /to="\/password-generator"/);
});

runTest('Footer.jsx includes Password Generator in Phase 3 links', () => {
  assert.match(footerSource, /to="\/password-generator"/);
});

// 2. Cryptographic Security Standards
console.log('\n2. Verifying Cryptographic Security Standards...');
runTest('Engine uses crypto.getRandomValues()', () => {
  assert.match(engineSource, /crypto\.getRandomValues/);
});

runTest('Engine strictly does NOT use Math.random()', () => {
  assert.doesNotMatch(engineSource, /Math\.random/);
});

// 3. Length Constraints & Generation
console.log('\n3. Testing Password Length Constraints & Generation...');
runTest('Generates exact default length (16)', () => {
  const { password } = generatePassword({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  assert.strictEqual(password.length, 16);
});

runTest('Enforces minimum length of 8 chars', () => {
  const { password } = generatePassword({
    length: 4,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  assert.strictEqual(password.length, 8);
});

runTest('Enforces maximum length of 128 chars', () => {
  const { password } = generatePassword({
    length: 250,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true
  });
  assert.strictEqual(password.length, 128);
});

// 4. Character Set Filtering
console.log('\n4. Testing Character Set Selection & Filtering...');
runTest('Only uppercase characters', () => {
  const { password } = generatePassword({
    length: 30,
    uppercase: true,
    lowercase: false,
    numbers: false,
    symbols: false
  });
  assert.strictEqual(password.length, 30);
  assert.ok(/^[A-Z]+$/.test(password), 'Must contain only uppercase');
});

runTest('Only lowercase characters', () => {
  const { password } = generatePassword({
    length: 30,
    uppercase: false,
    lowercase: true,
    numbers: false,
    symbols: false
  });
  assert.strictEqual(password.length, 30);
  assert.ok(/^[a-z]+$/.test(password), 'Must contain only lowercase');
});

runTest('Only numbers', () => {
  const { password } = generatePassword({
    length: 30,
    uppercase: false,
    lowercase: false,
    numbers: true,
    symbols: false
  });
  assert.strictEqual(password.length, 30);
  assert.ok(/^[0-9]+$/.test(password), 'Must contain only numbers');
});

runTest('Only symbols', () => {
  const { password } = generatePassword({
    length: 30,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: true
  });
  assert.strictEqual(password.length, 30);
  for (const ch of password) {
    assert.ok(CHARSETS.symbols.includes(ch), `Symbol ${ch} must be in symbol charset`);
  }
});

runTest('All character sets disabled returns validation error', () => {
  const res = generatePassword({
    length: 16,
    uppercase: false,
    lowercase: false,
    numbers: false,
    symbols: false
  });
  assert.strictEqual(res.password, '');
  assert.ok(res.error);
  assert.match(res.error, /select at least one character set/i);
});

// 5. Exclusion Options
console.log('\n5. Testing Ambiguous & Similar Character Exclusions...');
runTest('Excludes ambiguous characters (O, 0, I, 1, l, etc.)', () => {
  for (let trial = 0; trial < 10; trial++) {
    const { password } = generatePassword({
      length: 64,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeAmbiguous: true
    });
    for (const ch of password) {
      assert.strictEqual(AMBIGUOUS_CHARS.has(ch), false, `Ambiguous character '${ch}' must not be present`);
    }
  }
});

runTest('Excludes similar delimiter characters (brackets, slashes)', () => {
  for (let trial = 0; trial < 10; trial++) {
    const { password } = generatePassword({
      length: 64,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeSimilar: true
    });
    for (const ch of password) {
      assert.strictEqual(SIMILAR_CHARS.has(ch), false, `Similar character '${ch}' must not be present`);
    }
  }
});

// 6. Non-determinism & Randomness
console.log('\n6. Testing Non-determinism & Regeneration...');
runTest('Consecutive generations produce different passwords', () => {
  const passwords = new Set();
  for (let i = 0; i < 20; i++) {
    const { password } = generatePassword({
      length: 16,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true
    });
    passwords.add(password);
  }
  assert.strictEqual(passwords.size, 20, 'All 20 generated passwords must be distinct');
});

// 7. Presets & Strength
console.log('\n7. Testing Presets & Strength Meter...');
runTest('All 3 standard presets defined', () => {
  assert.strictEqual(PRESETS.length, 3);
  const ids = PRESETS.map((p) => p.id);
  assert.ok(ids.includes('simple'));
  assert.ok(ids.includes('strong'));
  assert.ok(ids.includes('very-strong'));
});

runTest('Strength calculator rates short passwords as Weak', () => {
  const strength = calculateStrength('abc', 26);
  assert.strictEqual(strength.label, 'Weak');
});

runTest('Strength calculator rates long complex passwords as Strong or Very Strong', () => {
  const strength = calculateStrength('aB3$kL9#mP1!zX7&qW4*tY8^', 70);
  assert.ok(strength.score >= 4);
});

// 8. Component & CSS Elements
console.log('\n8. Checking Component & CSS Design Elements...');
runTest('Component exports default function', () => {
  assert.match(componentSource, /export default function PasswordGeneratorTool/);
});

runTest('Component contains required UI and accessibility elements', () => {
  assert.match(componentSource, /id="password-tool-title"/);
  assert.match(componentSource, /id="generated-password-display"/);
  assert.match(componentSource, /id="regenerate-password-btn"/);
  assert.match(componentSource, /id="copy-password-btn"/);
  assert.match(componentSource, /id="password-length-slider"/);
  assert.match(componentSource, /id="chk-uppercase"/);
  assert.match(componentSource, /id="chk-lowercase"/);
  assert.match(componentSource, /id="chk-numbers"/);
  assert.match(componentSource, /id="chk-symbols"/);
  assert.match(componentSource, /id="chk-exclude-ambiguous"/);
  assert.match(componentSource, /id="chk-exclude-similar"/);
  assert.match(componentSource, /id="reset-password-btn"/);
});

runTest('App.css contains password layout styles and responsive rules', () => {
  assert.match(appCssSource, /\.password-app-layout/);
  assert.match(appCssSource, /\.password-card/);
  assert.match(appCssSource, /\.password-output-box/);
  assert.match(appCssSource, /\.password-strength-container/);
  assert.match(appCssSource, /@media \(max-width: 650px\)/);
});

console.log(`\n=== Password Generator Suite Completed: ${passed} Passed, 0 Failed ===\n`);
