import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools, getAllHomepageTools } from './src/data/homepageCategories.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';

test('=== FIXMYFILE: ANCHOR SCROLL & COLORFUL TOOL CARDS TEST SUITE ===', async (t) => {
  const homeJsx = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
  const toolCardJsx = fs.readFileSync('src/components/ToolCard.jsx', 'utf8');
  const appCss = fs.readFileSync('src/App.css', 'utf8');

  // 1. Anchor Navigation: scroll-margin-top configured to prevent sticky header overlap
  await t.test('1. Anchor Navigation: scroll-margin-top configured on anchor targets', () => {
    assert.match(appCss, /--header-scroll-offset:\s*\d+px/, 'App.css defines --header-scroll-offset');
    assert.match(appCss, /#pdf-tools[\s\S]*?scroll-margin-top:\s*var\(--header-scroll-offset/, '#pdf-tools has scroll-margin-top');
    assert.match(appCss, /#categories[\s\S]*?scroll-margin-top:\s*var\(--header-scroll-offset/, '#categories has scroll-margin-top');
    assert.match(appCss, /\.tools-section[\s\S]*?scroll-margin-top:\s*var\(--header-scroll-offset/, '.tools-section has scroll-margin-top');
    assert.match(appCss, /@media\s*\(max-width:\s*640px\)[\s\S]*?--header-scroll-offset/, 'Responsive header scroll offset on mobile');
  });

  // 2. Category Color System defined
  await t.test('2. Category Color System: 4 category palettes defined in CSS', () => {
    // PDF
    assert.match(appCss, /data-category="pdf"[\s\S]*?--cat-accent:\s*#6366F1/, 'PDF accent #6366F1');
    assert.match(appCss, /data-category="pdf"[\s\S]*?--cat-soft:\s*#EEF2FF/, 'PDF soft #EEF2FF');
    assert.match(appCss, /data-category="pdf"[\s\S]*?--cat-border:\s*#C7D2FE/, 'PDF border #C7D2FE');

    // Image
    assert.match(appCss, /data-category="image"[\s\S]*?--cat-accent:\s*#0EA5E9/, 'Image accent #0EA5E9');
    assert.match(appCss, /data-category="image"[\s\S]*?--cat-soft:\s*#E0F2FE/, 'Image soft #E0F2FE');
    assert.match(appCss, /data-category="image"[\s\S]*?--cat-border:\s*#BAE6FD/, 'Image border #BAE6FD');

    // Media
    assert.match(appCss, /data-category="media"[\s\S]*?--cat-accent:\s*#8B5CF6/, 'Media accent #8B5CF6');
    assert.match(appCss, /data-category="media"[\s\S]*?--cat-soft:\s*#F3E8FF/, 'Media soft #F3E8FF');
    assert.match(appCss, /data-category="media"[\s\S]*?--cat-border:\s*#DDD6FE/, 'Media border #DDD6FE');

    // Generators
    assert.match(appCss, /data-category="generators"[\s\S]*?--cat-accent:\s*#2563EB/, 'Generators accent #2563EB');
    assert.match(appCss, /data-category="generators"[\s\S]*?--cat-soft:\s*#DBEAFE/, 'Generators soft #DBEAFE');
    assert.match(appCss, /data-category="generators"[\s\S]*?--cat-border:\s*#BFDBFE/, 'Generators border #BFDBFE');
  });

  // 3. ToolCard Visual Structure: White card, subtle top accent, 48px icon container
  await t.test('3. ToolCard Visual Structure: White card, subtle top accent, 48px icon container', () => {
    assert.match(appCss, /\.tool-card\s*\{[^}]*background-color:\s*#FFFFFF;/, 'ToolCard remains primarily white');
    assert.match(appCss, /\.tool-card\s*\{[^}]*border-top:\s*3px solid/, 'ToolCard has 3px top accent border');
    assert.match(appCss, /\.tool-card\s*\{[^}]*border-radius:\s*18px;/, 'ToolCard has 18px border radius');
    assert.match(appCss, /\.tool-card-icon-wrap\s*\{[^}]*width:\s*48px;/, 'Icon wrap width is 48px');
    assert.match(appCss, /\.tool-card-icon-wrap\s*\{[^}]*height:\s*48px;/, 'Icon wrap height is 48px');
    assert.match(appCss, /\.tool-card-icon-wrap\s*\{[^}]*border-radius:\s*14px;/, 'Icon wrap border-radius is 14px');
  });

  // 4. ToolCard.jsx category mapping for all 49 tools
  await t.test('4. ToolCard.jsx category mapping for all 49 tools', () => {
    assert.ok(toolCardJsx.includes('data-category={cat}'), 'ToolCard renders data-category attribute');
    assert.ok(toolCardJsx.includes('getToolCategory'), 'ToolCard implements getToolCategory helper');

    const pdfTools = getHomepageCategoryTools('pdf-tools');
    const imageTools = getHomepageCategoryTools('image-tools');
    const mediaTools = getHomepageCategoryTools('media-tools');
    const genTools = getHomepageCategoryTools('generators');

    assert.strictEqual(pdfTools.length, 18, 'PDF category has exactly 18 tools');
    assert.strictEqual(imageTools.length, 20, 'Image category has exactly 20 tools');
    assert.strictEqual(mediaTools.length, 4, 'Media category has exactly 4 tools');
    assert.strictEqual(genTools.length, 7, 'Generators category has exactly 7 tools');
    assert.strictEqual(pdfTools.length + imageTools.length + mediaTools.length + genTools.length, 49, 'Total 49 tools');

    for (const tool of ALL_TOOLS) {
      assert.ok(TOOL_SVG_MAP[tool.icon], `Tool ${tool.id} has valid SVG icon mapping: ${tool.icon}`);
    }
  });

  // 5. Accessibility: Focus states and reduced-motion coverage
  await t.test('5. Accessibility: Focus visible outline and reduced-motion preserved', () => {
    assert.match(appCss, /\.tool-card:focus-visible\s*\{[^}]*outline:/, 'ToolCard has visible focus outline');
    assert.match(appCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.tool-card:hover\s*\{[^}]*transform:\s*none;/, 'Reduced motion disables hover transform');
  });
});
