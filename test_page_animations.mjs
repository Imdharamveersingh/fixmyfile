import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';

test('=== FIXMYFILE: UNIVERSAL TOOL PAGE ANIMATIONS TEST SUITE ===', async (t) => {
  const appCss = fs.readFileSync('src/App.css', 'utf8');
  const indexCss = fs.readFileSync('src/index.css', 'utf8');
  const jpgToPdfJsx = fs.readFileSync('src/tools/jpg-to-pdf/index.jsx', 'utf8');

  // 1. Approved animation keyframe exists
  await t.test('1. Approved animation keyframe exists', () => {
    assert.match(appCss, /@keyframes\s+pageFadeUpSubtle/, 'App.css must define @keyframes pageFadeUpSubtle');
    assert.match(appCss, /opacity:\s*0;/, 'Keyframes start with opacity 0');
    assert.match(appCss, /transform:\s*translateY\(10px\);/, 'Keyframes start with subtle 10px translateY');
    assert.match(appCss, /opacity:\s*1;/, 'Keyframes end with opacity 1');
    assert.match(appCss, /transform:\s*translateY\(0\);/, 'Keyframes end with translateY 0');
  });

  // 2. Homepage animation remains intact
  await t.test('2. Homepage animation remains intact', () => {
    assert.match(appCss, /\.home-page\s+\.hero-eyebrow\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero eyebrow animated');
    assert.match(appCss, /\.home-page\s+\.hero-title\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero title animated');
    assert.match(appCss, /\.home-page\s+\.hero-description\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero description animated');
    assert.match(appCss, /\.home-page\s+\.hero-actions\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Hero actions animated');
    assert.match(appCss, /\.home-page\s+\.tools-section\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Tools sections animated');

    // Homepage delays <= 200ms
    assert.match(appCss, /\.home-page\s+\.hero-eyebrow\s*\{[^}]*animation-delay:\s*0ms;/, 'Hero eyebrow delay 0ms');
    assert.match(appCss, /\.home-page\s+\.hero-title\s*\{[^}]*animation-delay:\s*40ms;/, 'Hero title delay 40ms');
    assert.match(appCss, /\.home-page\s+\.hero-description\s*\{[^}]*animation-delay:\s*80ms;/, 'Hero desc delay 80ms');
    assert.match(appCss, /\.home-page\s+\.hero-actions\s*\{[^}]*animation-delay:\s*120ms;/, 'Hero actions delay 120ms');
    assert.match(appCss, /\.home-page\s+\.tools-section\s*\{[^}]*animation-delay:\s*160ms;/, 'Tools section delay 160ms');
  });

  // 3. /jpg-to-pdf remains intact
  await t.test('3. /jpg-to-pdf remains intact', () => {
    assert.match(jpgToPdfJsx, /className="tool-view-container jpg-to-pdf-page"/, 'jpg-to-pdf contains jpg-to-pdf-page class');
    assert.match(appCss, /jpg-to-pdf-page\s+\.tool-breadcrumb-nav/, 'jpg-to-pdf breadcrumb targeted');
    assert.match(appCss, /jpg-to-pdf-page\s+\.tool-detail-h1/, 'jpg-to-pdf H1 targeted');
    assert.match(appCss, /jpg-to-pdf-page\s+\.tool-detail-description/, 'jpg-to-pdf description targeted');
  });

  // 4. Shared tool-page animation system exists
  await t.test('4. Shared tool-page animation system exists in App.css', () => {
    assert.match(appCss, /\.tool-detail-header\s+\.tool-breadcrumb-nav/, 'Shared breadcrumb animation selector exists');
    assert.match(appCss, /\.tool-detail-header\s+\.tool-detail-h1/, 'Shared H1 animation selector exists');
    assert.match(appCss, /\.tool-detail-header\s+\.tool-detail-description/, 'Shared description animation selector exists');
  });

  // 5. All 49 active tool pages are covered
  await t.test('5. All 49 active tool pages render ToolDetailHeader and have card selectors', () => {
    assert.strictEqual(ALL_TOOLS.length, 49, 'Exact 49 active tools in registry');
    for (const tool of ALL_TOOLS) {
      const filePath = `./src/tools/${tool.id}/index.jsx`;
      assert.ok(fs.existsSync(filePath), `Tool file exists: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('<ToolDetailHeader'), `Tool ${tool.id} renders ToolDetailHeader`);
    }
  });

  // 6. Expected stagger pattern is present
  await t.test('6. Expected stagger pattern is present (0ms, 50ms, 100ms, 150ms)', () => {
    assert.match(appCss, /\.tool-detail-header\s+\.tool-breadcrumb-nav[\s\S]*?animation-delay:\s*0ms;/, 'Breadcrumb delay 0ms');
    assert.match(appCss, /\.tool-detail-header\s+\.tool-detail-h1[\s\S]*?animation-delay:\s*50ms;/, 'H1 delay 50ms');
    assert.match(appCss, /\.tool-detail-header\s+\.tool-detail-description[\s\S]*?animation-delay:\s*100ms;/, 'Description delay 100ms');

    // Main interactive card delay 150ms
    assert.match(appCss, /\.converter-card[\s\S]*?animation-delay:\s*150ms;/, 'Primary tool card delay 150ms');
  });

  // 7. No layout properties are animated
  await t.test('7. No layout properties are animated (pure transform and opacity)', () => {
    const keyframeMatch = appCss.match(/@keyframes\s+pageFadeUpSubtle\s*\{[\s\S]*?\n\}/);
    assert.ok(keyframeMatch, 'Keyframe block found');
    const kfBody = keyframeMatch[0];
    assert.ok(!kfBody.includes('width:'), 'Keyframes must not animate width');
    assert.ok(!kfBody.includes('height:'), 'Keyframes must not animate height');
    assert.ok(!kfBody.includes('margin:'), 'Keyframes must not animate margin');
    assert.ok(!kfBody.includes('padding:'), 'Keyframes must not animate padding');
    assert.ok(!kfBody.includes('top:'), 'Keyframes must not animate top');
    assert.ok(!kfBody.includes('left:'), 'Keyframes must not animate left');
    assert.ok(!kfBody.includes('font-size:'), 'Keyframes must not animate font-size');
  });

  // 8. Reduced-motion rules exist
  await t.test('8. Full prefers-reduced-motion accessibility coverage', () => {
    assert.match(indexCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'index.css has global reduced motion');
    assert.match(appCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.tool-detail-header[\s\S]*?animation:\s*none\s*!important;/, 'App.css resets tool header animations');
    assert.match(appCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.converter-card[\s\S]*?animation:\s*none\s*!important;/, 'App.css resets tool card animations');
  });

  // 9. No inactive/informational pages are accidentally included
  await t.test('9. No inactive/informational pages are accidentally included', () => {
    const staticPages = [
      'ContactPage.jsx',
      'PrivacyPolicyPage.jsx',
      'TermsPage.jsx',
      'WhyFixMyFilePage.jsx',
      'NotFoundPage.jsx',
      'BlogListingPage.jsx',
      'BlogArticlePage.jsx'
    ];
    for (const page of staticPages) {
      const pageContent = fs.readFileSync(`./src/pages/${page}`, 'utf8');
      assert.ok(!pageContent.includes('tool-detail-header'), `${page} must not use tool-detail-header`);
      assert.ok(!pageContent.includes('converter-card'), `${page} must not use converter-card`);
      assert.ok(!pageContent.includes('tool-workspace'), `${page} must not use tool-workspace`);
    }
  });

  // 10. No tool is missing animation coverage
  await t.test('10. No tool is missing animation coverage across all 49 tools', () => {
    const primarySelectors = [
      'converter-card',
      'workbench-card',
      'tool-workspace',
      'tool-section',
      'qr-app-layout',
      'barcode-app-layout',
      'currency-app-layout',
      'percentage-app-layout',
      'password-app-layout',
      'word-counter-app-layout',
      'emi-calculator-layout',
      'dropzone-container',
      'tool-card'
    ];

    for (const tool of ALL_TOOLS) {
      const filePath = `./src/tools/${tool.id}/index.jsx`;
      const content = fs.readFileSync(filePath, 'utf8');
      const hasCard = primarySelectors.some(sel => content.includes(sel));
      assert.ok(hasCard, `Tool ${tool.id} has an animated primary card selector`);
    }
  });
});
