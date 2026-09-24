import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { ALL_TOOLS, TOTAL_STRATEGY_TOOLS } from './src/tools/toolsRegistry.js';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools, getAllHomepageTools } from './src/data/homepageCategories.js';
import { getPageSEO, SITE_URL } from './src/config/seoConfig.js';

test('=== FIXMYFILE STEP 9.4: HOMEPAGE DISCOVERY & BRAND POLISH TEST SUITE ===', async (t) => {
  const homeJsx = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
  const headerJsx = fs.readFileSync('src/components/Header.jsx', 'utf8');
  const footerJsx = fs.readFileSync('src/components/Footer.jsx', 'utf8');
  const appCss = fs.readFileSync('src/App.css', 'utf8');
  const indexHtml = fs.readFileSync('index.html', 'utf8');

  // 1. Architecture Section Absent from Homepage
  await t.test('1. Internal architecture section is absent from HomePage', () => {
    assert.ok(
      !homeJsx.includes('Scalable Path-Based Architecture'),
      'HomePage must not include "Scalable Path-Based Architecture"'
    );
    assert.ok(
      !homeJsx.includes('architecture-section'),
      'HomePage must not render .architecture-section'
    );
    assert.ok(
      !homeJsx.includes('Clean separation of concerns with dedicated modular folders'),
      'HomePage must not render internal architecture description'
    );
    assert.ok(
      !homeJsx.includes('src/tools/'),
      'HomePage must not render src/tools/ path references'
    );
  });

  // 2. Strategy Stats Row Absent from Homepage
  await t.test('2. Internal strategy stats row is absent from HomePage', () => {
    assert.ok(
      !homeJsx.includes('stats-row'),
      'HomePage must not render .stats-row'
    );
    assert.ok(
      !homeJsx.includes('TOTAL_STRATEGY_TOOLS'),
      'HomePage must not import or render TOTAL_STRATEGY_TOOLS'
    );
    assert.ok(
      !homeJsx.includes('Total Strategy Tools'),
      'HomePage must not display "Total Strategy Tools"'
    );
    assert.ok(
      !homeJsx.includes('55 Total Strategy Tools'),
      'HomePage must not display "55 Total Strategy Tools"'
    );
    assert.ok(
      !homeJsx.includes('Client-First Design'),
      'HomePage must not display "Client-First Design" stat card'
    );
  });

  // 3. Exactly Four Public Category Headings
  await t.test('3. Exactly four user-facing discovery categories defined', () => {
    assert.strictEqual(
      HOMEPAGE_CATEGORIES.length,
      4,
      `Expected exactly 4 homepage categories, got ${HOMEPAGE_CATEGORIES.length}`
    );

    const categoryTitles = HOMEPAGE_CATEGORIES.map((c) => c.title);
    assert.deepStrictEqual(categoryTitles, [
      'PDF Tools',
      'Image Tools',
      'Generators',
      'Media Tools'
    ]);
  });

  // 4. Zero Internal Phase Labels Exposed on Homepage
  await t.test('4. No internal phase labels exposed on HomePage', () => {
    assert.ok(!homeJsx.includes('tools-phase1'), 'No tools-phase1 id');
    assert.ok(!homeJsx.includes('tools-phase2'), 'No tools-phase2 id');
    assert.ok(!homeJsx.includes('tools-phase3'), 'No tools-phase3 id');
    assert.ok(!homeJsx.includes('tools-phase4'), 'No tools-phase4 id');
    assert.ok(!homeJsx.includes('tools-phase5'), 'No tools-phase5 id');
    assert.ok(!homeJsx.includes('tools-phase6'), 'No tools-phase6 id');
    assert.ok(!homeJsx.includes('tools-phase7'), 'No tools-phase7 id');
    assert.ok(!homeJsx.includes('Phase 1'), 'No Phase 1 visible text');
    assert.ok(!homeJsx.includes('Phase 2'), 'No Phase 2 visible text');
    assert.ok(!homeJsx.includes('Phase 3'), 'No Phase 3 visible text');
    assert.ok(!homeJsx.includes('Phase 4'), 'No Phase 4 visible text');
    assert.ok(!homeJsx.includes('Phase 5'), 'No Phase 5 visible text');
    assert.ok(!homeJsx.includes('Phase 6'), 'No Phase 6 visible text');
    assert.ok(!homeJsx.includes('Phase 7'), 'No Phase 7 visible text');
  });

  // 5. Tool Inventory: All 49 Active Tools Represented Exactly Once
  await t.test('5. All 49 active tools represented with zero duplicates and zero missing', () => {
    assert.strictEqual(ALL_TOOLS.length, 49, 'toolsRegistry must have 49 active tools');

    const mappedTools = getAllHomepageTools();
    assert.strictEqual(
      mappedTools.length,
      49,
      `Expected exactly 49 mapped tools across categories, got ${mappedTools.length}`
    );

    const uniqueIds = new Set(mappedTools.map((t) => t.id));
    assert.strictEqual(uniqueIds.size, 49, 'Zero duplicate tools across homepage categories');

    for (const tool of ALL_TOOLS) {
      assert.ok(
        uniqueIds.has(tool.id),
        `Active tool ${tool.id} (${tool.name}) must be present in homepage categories`
      );
    }
  });

  // 6. Category-Specific Tool Counts and OCR Classification Rules
  await t.test('6. Category counts and OCR routing rules', () => {
    const pdfTools = getHomepageCategoryTools('pdf-tools');
    const imageTools = getHomepageCategoryTools('image-tools');
    const generators = getHomepageCategoryTools('generators');
    const mediaTools = getHomepageCategoryTools('media-tools');

    assert.strictEqual(pdfTools.length, 18, 'PDF Tools category must have 18 tools');
    assert.strictEqual(imageTools.length, 20, 'Image Tools category must have 20 tools');
    assert.strictEqual(generators.length, 7, 'Generators category must have 7 tools');
    assert.strictEqual(mediaTools.length, 4, 'Media Tools category must have 4 tools');

    // Rule 10: PDF-source OCR in PDF Tools
    assert.ok(pdfTools.some((t) => t.id === 'pdf-ocr'), 'pdf-ocr must be in PDF Tools');
    assert.ok(pdfTools.some((t) => t.id === 'extract-text-from-pdf'), 'extract-text-from-pdf must be in PDF Tools');

    // Rule 10: Image-source OCR in Image Tools
    assert.ok(imageTools.some((t) => t.id === 'image-to-text'), 'image-to-text must be in Image Tools');
    assert.ok(imageTools.some((t) => t.id === 'jpg-to-text'), 'jpg-to-text must be in Image Tools');
    assert.ok(imageTools.some((t) => t.id === 'png-to-text'), 'png-to-text must be in Image Tools');
    assert.ok(imageTools.some((t) => t.id === 'screenshot-to-text'), 'screenshot-to-text must be in Image Tools');
    assert.ok(imageTools.some((t) => t.id === 'image-cropper'), 'image-cropper must be in Image Tools');
  });

  // 7. Zero Deferred Phase 6 Tools Exposed
  await t.test('7. No deferred Phase 6 tools accidentally exposed', () => {
    const deferredTools = [
      'audio-converter',
      'm4a-to-mp3',
      'wav-to-mp3',
      'mp3-cutter',
      'video-trimmer',
      'video-to-mp4'
    ];

    const mappedTools = getAllHomepageTools();
    for (const d of deferredTools) {
      assert.ok(!mappedTools.some((t) => t.id === d), `Deferred tool ${d} must not be in homepage tools`);
      assert.ok(!homeJsx.includes(d), `Deferred tool ${d} must not be referenced in HomePage.jsx`);
    }
  });

  // 8. Logo & Brand Mark Parity with logo.png
  await t.test('8. Brand lockup and logo asset parity across Header and Footer', () => {
    assert.match(headerJsx, /import\s+logo\s+from\s+['"]\.\.\/assets\/logo\.png['"]/, 'Header imports logo.png');
    assert.match(footerJsx, /import\s+logo\s+from\s+['"]\.\.\/assets\/logo\.png['"]/, 'Footer imports logo.png');
    assert.match(headerJsx, /alt="FixMyFile"/, 'Header has alt="FixMyFile"');
    assert.match(footerJsx, /alt="FixMyFile"/, 'Footer has alt="FixMyFile"');
    assert.match(headerJsx, /brand-logo-img/, 'Header has brand-logo-img class');
    assert.match(footerJsx, /footer-logo-img/, 'Footer has footer-logo-img class');

    // No separate visible text branding beside the logo in Header or Footer
    assert.ok(!headerJsx.includes('>FixMyFile<'), 'Header must not render separate visible FixMyFile text');
    assert.ok(!footerJsx.includes('>FixMyFile<'), 'Footer must not render separate visible FixMyFile text');

    // index.html favicon references
    assert.ok(indexHtml.includes('href="/favicon.png"'), 'index.html has favicon.png favicon');
    assert.ok(!indexHtml.includes('/favicon.svg'), 'index.html removes legacy Vite favicon.svg');
  });

  // 9. SEO & Metadata Integrity
  await t.test('9. Homepage SEO metadata preserved', () => {
    const seo = getPageSEO('/');
    assert.ok(seo.title && seo.title.includes('FixMyFile'), 'Homepage title contains FixMyFile');
    assert.ok(seo.description && seo.description.length >= 50, 'Homepage has comprehensive meta description');
    assert.strictEqual(seo.canonical, `${SITE_URL}/`, 'Homepage canonical URL is correct');
  });
});
