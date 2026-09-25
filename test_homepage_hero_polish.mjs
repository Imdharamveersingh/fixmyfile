import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools, getAllHomepageTools } from './src/data/homepageCategories.js';

test('=== FIXMYFILE: HOMEPAGE VISUAL REDESIGN & HERO UX TEST SUITE ===', async (t) => {
  const homeJsx = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
  const appCss = fs.readFileSync('src/App.css', 'utf8');

  // 1. FAST • FREE • PRIVATE pill removed from UI
  await t.test('1. FAST • FREE • PRIVATE pill completely removed from HomePage UI', () => {
    assert.ok(
      !homeJsx.includes('FAST • FREE • PRIVATE'),
      'HomePage.jsx must not contain visible "FAST • FREE • PRIVATE"'
    );
    assert.ok(
      !homeJsx.includes('hero-badge-wrap'),
      'HomePage.jsx must not contain hero-badge-wrap container'
    );
    assert.ok(
      !homeJsx.includes('100% Secure') && !homeJsx.includes('No Signup') && !homeJsx.includes('Unlimited'),
      'HomePage.jsx must not contain fake marketing or trust claims'
    );
  });

  // 2. Hero Heading & Description Preserved & Formatted
  await t.test('2. Hero Heading & Description Preserved with clean branding', () => {
    assert.ok(
      homeJsx.includes('Simple tools for') && homeJsx.includes('everyday files'),
      'Hero title must preserve "Simple tools for everyday files."'
    );
    assert.ok(
      homeJsx.includes('text-gradient'),
      'Hero title uses text-gradient for everyday files'
    );
    assert.ok(
      homeJsx.includes('A focused collection of browser-based tools for PDFs, images, generators, and media.'),
      'Hero description matches approved factual text'
    );
  });

  // 3. CTA Buttons & Zero Duplicate CTA Destination
  await t.test('3. CTA Buttons have distinct destinations and zero duplicate CTA behavior', () => {
    assert.ok(homeJsx.includes('Explore All Tools'), 'Explore All Tools CTA present');
    assert.ok(homeJsx.includes('Browse Categories'), 'Browse Categories CTA present');

    // Extract destinations
    const exploreMatch = homeJsx.match(/href="([^"]+)"[^>]*>\s*Explore All Tools/s);
    const browseMatch = homeJsx.match(/href="([^"]+)"[^>]*>\s*Browse Categories/s);

    assert.ok(exploreMatch, 'Explore All Tools must have href');
    assert.ok(browseMatch, 'Browse Categories must have href');

    const exploreDest = exploreMatch[1];
    const browseDest = browseMatch[1];

    assert.notStrictEqual(
      exploreDest,
      browseDest,
      `Explore All Tools (${exploreDest}) and Browse Categories (${browseDest}) must NOT have duplicate destinations`
    );
    assert.strictEqual(browseDest, '#categories', 'Browse Categories must navigate to #categories');
    assert.strictEqual(exploreDest, '#pdf-tools', 'Explore All Tools navigates to #pdf-tools');
  });

  // 4. Category Cards: Exactly 4 category cards with correct tool counts
  await t.test('4. Category Cards: Exactly 4 cards covering all 49 tools', () => {
    assert.ok(
      homeJsx.includes('category-discovery-section'),
      'HomePage.jsx renders category-discovery-section'
    );
    assert.ok(
      homeJsx.includes('category-discovery-grid'),
      'HomePage.jsx renders category-discovery-grid'
    );

    const pdfCount = getHomepageCategoryTools('pdf-tools').length;
    const imgCount = getHomepageCategoryTools('image-tools').length;
    const mediaCount = getHomepageCategoryTools('media-tools').length;
    const genCount = getHomepageCategoryTools('generators').length;

    assert.strictEqual(pdfCount, 18, 'PDF category has 18 tools');
    assert.strictEqual(imgCount, 20, 'Image category has 20 tools');
    assert.strictEqual(mediaCount, 4, 'Media category has 4 tools');
    assert.strictEqual(genCount, 7, 'Generators category has 7 tools');
    assert.strictEqual(pdfCount + imgCount + mediaCount + genCount, 49, 'Total tools across 4 categories must be 49');
  });

  // 5. Tool Inventory Integrity: Zero duplicates, zero missing
  await t.test('5. Tool Inventory Integrity: 49 active tools, 0 duplicates, 0 missing', () => {
    const allTools = getAllHomepageTools();
    assert.strictEqual(allTools.length, 49, 'Homepage renders exactly 49 active tools');
    const ids = allTools.map((t) => t.id);
    const uniqueIds = new Set(ids);
    assert.strictEqual(uniqueIds.size, 49, '0 duplicate tools across homepage');

    for (const tool of ALL_TOOLS) {
      assert.ok(uniqueIds.has(tool.id), `Tool ${tool.id} must be present in homepage tools`);
    }
  });

  // 6. CSS Architecture: Background depth, Category Card styles, Spacing & Animations
  await t.test('6. CSS Architecture: Background depth, Category Card styles & Animation', () => {
    assert.match(appCss, /\.home-page::before/, 'App.css defines CSS-only background glow');
    assert.match(appCss, /radial-gradient/, 'Hero background uses radial-gradient');
    assert.match(appCss, /\.category-discovery-card/, 'App.css styles .category-discovery-card');
    assert.match(appCss, /\.category-card-pdf/, 'App.css styles PDF accent');
    assert.match(appCss, /\.category-card-image/, 'App.css styles Image accent');
    assert.match(appCss, /\.category-card-media/, 'App.css styles Media accent');
    assert.match(appCss, /\.category-card-generators/, 'App.css styles Generators accent');
    assert.match(appCss, /\.home-page\s+\.category-discovery-section\s*\{[^}]*animation:\s*pageFadeUpSubtle/, 'Category discovery section animated');
  });
});
