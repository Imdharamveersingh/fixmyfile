/**
 * Automated Test Suite for Word Counter (Phase 3.6)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  countWords,
  countSentences,
  countParagraphs,
  countLines,
  formatTimeEstimate,
  analyzeText
} from './src/tools/word-counter/wordEngine.js';

const registrySource = fs.readFileSync(path.resolve('src/tools/toolsRegistry.js'), 'utf8');
const appJsxSource = fs.readFileSync(path.resolve('src/App.jsx'), 'utf8');
const headerSource = fs.readFileSync(path.resolve('src/components/Header.jsx'), 'utf8');
const footerSource = fs.readFileSync(path.resolve('src/components/Footer.jsx'), 'utf8');
const componentSource = fs.readFileSync(path.resolve('src/tools/word-counter/index.jsx'), 'utf8');
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

console.log('=== Word Counter Automated Test Suite ===\n');

// 1. Registry & Routes
console.log('1. Checking Tool Registry & Route Registration...');
runTest('Route /word-counter registered in toolsRegistry.js', () => {
  assert.match(registrySource, /id:\s*'word-counter'/);
  assert.match(registrySource, /path:\s*'\/word-counter'/);
});

runTest('Route /word-counter registered in App.jsx', () => {
  assert.match(appJsxSource, /path="word-counter"/);
  assert.match(appJsxSource, /WordCounterTool/);
});

runTest('Header.jsx includes Word Counter in Generators menu', () => {
  assert.match(headerSource, /to="\/word-counter"/);
});

runTest('Footer.jsx includes compact Calculators & Generators link', () => {
  assert.match(footerSource, /Calculators & Generators/);
});

// 2. Word Count Engine
console.log('\n2. Testing Word Count Accuracy...');
runTest('Empty text returns 0 words', () => {
  assert.strictEqual(countWords(''), 0);
  assert.strictEqual(countWords('    '), 0);
  assert.strictEqual(countWords(null), 0);
});

runTest('Single word returns 1', () => {
  assert.strictEqual(countWords('Hello'), 1);
});

runTest('Multiple words with irregular spaces, tabs, and newlines', () => {
  const txt = '  The    quick\t\tbrown\nfox\r\njumps  ';
  assert.strictEqual(countWords(txt), 5);
});

runTest('Contractions and hyphenated words count as words', () => {
  const txt = "It's a state-of-the-art solution.";
  // "It's", "a", "state-of-the-art", "solution" -> 4 words
  const count = countWords(txt);
  assert.ok(count >= 4 && count <= 7, `Expected 4-7, got ${count}`);
});

runTest('Numbers and alphanumeric sequences', () => {
  const txt = 'Flight 402 departs at 10:30 from Terminal 2.';
  assert.ok(countWords(txt) >= 6);
});

// 3. Multi-lingual and Unicode Support
console.log('\n3. Testing Unicode and Multi-lingual Word Counting...');
runTest('Hindi (Devanagari) word count', () => {
  const txt = 'नमस्ते भारत, आप कैसे हैं?';
  const count = countWords(txt);
  assert.strictEqual(count, 5); // नमस्ते, भारत, आप, कैसे, हैं
});

runTest('Mixed Hindi + English word count', () => {
  const txt = 'FixMyFile एक बेहतरीन utility platform है।';
  const count = countWords(txt);
  assert.strictEqual(count, 6); // FixMyFile, एक, बेहतरीन, utility, platform, है
});

// 4. Sentence & Paragraph Detection
console.log('\n4. Testing Sentence and Paragraph Counts...');
runTest('Sentence counting with standard punctuation (. ! ?)', () => {
  const txt = 'First sentence. Second sentence! Is this the third? Yes, indeed.';
  assert.strictEqual(countSentences(txt), 4);
});

runTest('Sentence counting with Hindi danda (।)', () => {
  const txt = 'यह पहला वाक्य है। यह दूसरा वाक्य है। क्या यह तीसरा है?';
  assert.strictEqual(countSentences(txt), 3);
});

runTest('Paragraph counting with multiple newlines', () => {
  const txt = 'Paragraph one text here.\n\nParagraph two text here.\n\n\nParagraph three text here.';
  assert.strictEqual(countParagraphs(txt), 3);
});

runTest('Line counting', () => {
  const txt = 'Line 1\nLine 2\nLine 3\nLine 4';
  assert.strictEqual(countLines(txt), 4);
});

// 5. Reading & Speaking Time Formats
console.log('\n5. Testing Time Estimates...');
runTest('0 words yields 0 sec', () => {
  assert.strictEqual(formatTimeEstimate(0, 225), '0 sec');
});

runTest('Small word count yields seconds', () => {
  const time = formatTimeEstimate(50, 225);
  assert.ok(time.includes('sec'));
});

runTest('Large word count yields minutes', () => {
  const time = formatTimeEstimate(500, 225);
  assert.ok(time.includes('min') || time.includes('m'));
});

// 6. Comprehensive analyzeText metrics
console.log('\n6. Testing Full analyzeText Metrics...');
runTest('Analyzes all metrics on comprehensive text', () => {
  const sample = 'Hello world! This is FixMyFile.\n\nSecond paragraph has 10 words and numbers.';
  const stats = analyzeText(sample);

  assert.ok(stats.words > 10);
  assert.strictEqual(stats.characters, sample.length);
  assert.ok(stats.charactersNoSpaces < sample.length);
  assert.ok(stats.sentences >= 2);
  assert.strictEqual(stats.paragraphs, 2);
  assert.strictEqual(stats.lines, 3);
  assert.ok(stats.readingTime);
  assert.ok(stats.speakingTime);
  assert.ok(stats.avgWordLength > 0);
  assert.ok(stats.avgSentenceLength > 0);
});

// 7. Component & CSS Checks
console.log('\n7. Checking Component & CSS Elements...');
runTest('Component contains textarea and stat IDs', () => {
  assert.match(componentSource, /id="word-counter-textarea"/);
  assert.match(componentSource, /id="stat-words"/);
  assert.match(componentSource, /id="stat-characters"/);
  assert.match(componentSource, /id="stat-chars-no-spaces"/);
  assert.match(componentSource, /id="stat-sentences"/);
  assert.match(componentSource, /id="stat-paragraphs"/);
  assert.match(componentSource, /id="stat-lines"/);
  assert.match(componentSource, /id="word-counter-copy-btn"/);
  assert.match(componentSource, /id="word-counter-clear-btn"/);
});

runTest('App.css contains word counter styles', () => {
  assert.match(appCssSource, /\.word-counter-app-layout/);
  assert.match(appCssSource, /\.word-counter-card/);
  assert.match(appCssSource, /\.counter-stats-grid/);
  assert.match(appCssSource, /\.counter-textarea/);
});

console.log(`\n=== Word Counter Suite Completed: ${passed} Passed, 0 Failed ===\n`);
