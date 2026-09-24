import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

test('=== FIXMYFILE: EXPERIMENTAL LIGHTWEIGHT PAGE ANIMATIONS TEST SUITE ===', async (t) => {
  const appCss = fs.readFileSync('src/App.css', 'utf8');
  const indexCss = fs.readFileSync('src/index.css', 'utf8');
  const jpgToPdfJsx = fs.readFileSync('src/tools/jpg-to-pdf/index.jsx', 'utf8');

  // 1. CSS Keyframes definition
  await t.test('1. Lightweight CSS Keyframes definition', () => {
    assert.match(appCss, /@keyframes\s+pageFadeUpSubtle/, 'App.css must define @keyframes pageFadeUpSubtle');
    assert.match(appCss, /opacity:\s*0;/, 'Keyframes start with opacity 0');
    assert.match(appCss, /transform:\s*translateY\(10px\);/, 'Keyframes start with subtle 10px translateY');
    assert.match(appCss, /opacity:\s*1;/, 'Keyframes end with opacity 1');
    assert.match(appCss, /transform:\s*translateY\(0\);/, 'Keyframes end with translateY 0');

    // Confirm no expensive layout properties are animated
    const keyframeMatch = appCss.match(/@keyframes\s+pageFadeUpSubtle\s*\{[\s\S]*?\n\}/);
    assert.ok(keyframeMatch, 'Keyframe block found');
    const kfBody = keyframeMatch[0];
    assert.ok(!kfBody.includes('width:'), 'Keyframes must not animate width');
    assert.ok(!kfBody.includes('height:'), 'Keyframes must not animate height');
    assert.ok(!kfBody.includes('margin:'), 'Keyframes must not animate margin');
    assert.ok(!kfBody.includes('padding:'), 'Keyframes must not animate padding');
    assert.ok(!kfBody.includes('top:'), 'Keyframes must not animate top');
    assert.ok(!kfBody.includes('left:'), 'Keyframes must not animate left');
  });

  // 2. Homepage visual sections staggered animation
  await t.test('2. Homepage hero & category sections animation and stagger', () => {
    assert.match(appCss, /\.home-page\s+\.hero-eyebrow\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero eyebrow animated');
    assert.match(appCss, /\.home-page\s+\.hero-title\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero title animated');
    assert.match(appCss, /\.home-page\s+\.hero-description\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero description animated');
    assert.match(appCss, /\.home-page\s+\.hero-actions\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero actions animated');
    assert.match(appCss, /\.home-page\s+\.tools-section\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Tools sections animated');

    // Check delays <= 200ms
    assert.match(appCss, /\.home-page\s+\.hero-eyebrow\s*\{[^}]*animation-delay:\s*0ms;/, 'Hero eyebrow delay 0ms');
    assert.match(appCss, /\.home-page\s+\.hero-title\s*\{[^}]*animation-delay:\s*40ms;/, 'Hero title delay 40ms');
    assert.match(appCss, /\.home-page\s+\.hero-description\s*\{[^}]*animation-delay:\s*80ms;/, 'Hero desc delay 80ms');
    assert.match(appCss, /\.home-page\s+\.hero-actions\s*\{[^}]*animation-delay:\s*120ms;/, 'Hero actions delay 120ms');
    assert.match(appCss, /\.home-page\s+\.tools-section\s*\{[^}]*animation-delay:\s*160ms;/, 'Tools section delay 160ms');
  });

  // 3. Representative Tool Page (/jpg-to-pdf) Animation
  await t.test('3. Scoped /jpg-to-pdf tool page animation sequence', () => {
    assert.match(jpgToPdfJsx, /className="tool-view-container jpg-to-pdf-page"/, 'jpg-to-pdf contains jpg-to-pdf-page class');
    assert.match(appCss, /\.jpg-to-pdf-page\s+\.tool-breadcrumb-nav\s*\{[^}]*animation-delay:\s*0ms;/, 'Breadcrumb delay 0ms');
    assert.match(appCss, /\.jpg-to-pdf-page\s+\.tool-detail-h1\s*\{[^}]*animation-delay:\s*50ms;/, 'H1 delay 50ms');
    assert.match(appCss, /\.jpg-to-pdf-page\s+\.tool-detail-description\s*\{[^}]*animation-delay:\s*100ms;/, 'Description delay 100ms');
    assert.match(appCss, /\.jpg-to-pdf-page\s+\.converter-card\s*\{[^}]*animation-delay:\s*150ms;/, 'Converter card delay 150ms');
  });

  // 4. Reduced-motion accessibility
  await t.test('4. Full prefers-reduced-motion accessibility coverage', () => {
    assert.match(indexCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'index.css has global reduced motion');
    assert.match(appCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.jpg-to-pdf-page[\s\S]*?animation:\s*none\s*!important;/, 'App.css explicitly resets animations on reduced motion');
  });

  // 5. Zero other tool pages modified
  await t.test('5. Zero other tool pages modified for animations', () => {
    const wordToPdfJsx = fs.readFileSync('src/tools/word-to-pdf/index.jsx', 'utf8');
    assert.ok(!wordToPdfJsx.includes('jpg-to-pdf-page'), 'word-to-pdf does not have experimental class');
    assert.ok(!appCss.includes('.word-to-pdf-page'), 'App.css does not animate other tools yet');
  });
});
