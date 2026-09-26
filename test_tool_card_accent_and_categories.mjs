import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { HOMEPAGE_CATEGORIES, getHomepageCategoryTools } from './src/data/homepageCategories.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';
import { CATEGORY_SVG_MAP, getCategorySvg } from './src/components/categorySvgMap.js';
import {
  TOOL_ACCENT_MAP,
  getToolAccent,
  getToolAccentColor,
  getToolBorderColor,
  getToolHoverBorderColor
} from './src/components/toolAccentMap.js';

test('=== FIXMYFILE: TOOL CARD ACCENTS & HOMEPAGE CATEGORY CARDS TEST SUITE ===', async (t) => {
  const homeJsx = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
  const toolCardJsx = fs.readFileSync('src/components/ToolCard.jsx', 'utf8');
  const appCss = fs.readFileSync('src/App.css', 'utf8');

  // 1. Exactly 4 category cards
  await t.test('1. Exactly 4 category cards defined and rendered', () => {
    assert.ok(homeJsx.includes('CATEGORY_CARDS = ['), 'CATEGORY_CARDS array defined in HomePage.jsx');
    const categoryMatches = homeJsx.match(/id:\s*'(pdf-tools|image-tools|media-tools|generators)'/g);
    assert.equal(categoryMatches.length, 4, 'Must have exactly 4 category definitions');
    assert.ok(homeJsx.includes('category-discovery-grid'), 'Grid container exists');
  });

  // 2. Correct category SVG mapped to each category
  await t.test('2. Correct category SVG mapped to each category', () => {
    assert.ok(CATEGORY_SVG_MAP['pdf-tools'].includes('pdf-tool.svg'), 'PDF tools maps to pdf-tool.svg');
    assert.ok(CATEGORY_SVG_MAP['image-tools'].includes('image-tool.svg'), 'Image tools maps to image-tool.svg');
    assert.ok(CATEGORY_SVG_MAP['media-tools'].includes('media-tool.svg'), 'Media tools maps to media-tool.svg');
    assert.ok(CATEGORY_SVG_MAP['generators'].includes('generator-tool.svg'), 'Generators maps to generator-tool.svg');

    assert.ok(fs.existsSync('src/assets/pdf-tool.svg'), 'pdf-tool.svg exists on disk');
    assert.ok(fs.existsSync('src/assets/image-tool.svg'), 'image-tool.svg exists on disk');
    assert.ok(fs.existsSync('src/assets/media-tool.svg'), 'media-tool.svg exists on disk');
    assert.ok(fs.existsSync('src/assets/generator-tool.svg'), 'generator-tool.svg exists on disk');

    assert.ok(getCategorySvg('pdf-tools'), 'getCategorySvg helper returns SVG for pdf-tools');
    assert.ok(getCategorySvg('image-tools'), 'getCategorySvg helper returns SVG for image-tools');
    assert.ok(getCategorySvg('media-tools'), 'getCategorySvg helper returns SVG for media-tools');
    assert.ok(getCategorySvg('generators'), 'getCategorySvg helper returns SVG for generators');
  });

  // 3. Correct category titles
  await t.test('3. Correct category titles', () => {
    assert.ok(homeJsx.includes("title: 'PDF Tools'"), 'Title "PDF Tools" exact match');
    assert.ok(homeJsx.includes("title: 'Image Tools'"), 'Title "Image Tools" exact match');
    assert.ok(homeJsx.includes("title: 'Media Tools'"), 'Title "Media Tools" exact match');
    assert.ok(homeJsx.includes("title: 'Generators'"), 'Title "Generators" exact match');
  });

  // 4. Correct category subtitles
  await t.test('4. Correct category subtitles', () => {
    assert.ok(
      homeJsx.includes('Convert, merge, compress, protect, and extract PDF files.'),
      'PDF subtitle matches requirement'
    );
    assert.ok(
      homeJsx.includes('Convert, compress, resize, crop, and enhance image files.'),
      'Image subtitle matches requirement'
    );
    assert.ok(
      homeJsx.includes('Convert and optimize video, audio, and animated GIF files.'),
      'Media subtitle matches requirement'
    );
    assert.ok(
      homeJsx.includes('Create QR codes, barcodes, passwords, and useful calculators.'),
      'Generators subtitle matches requirement'
    );
  });

  // 5. Correct counts: 18 / 20 / 4 / 7 (Total 49)
  await t.test('5. Correct counts: 18 / 20 / 4 / 7', () => {
    const pdfTools = getHomepageCategoryTools('pdf-tools');
    const imageTools = getHomepageCategoryTools('image-tools');
    const mediaTools = getHomepageCategoryTools('media-tools');
    const genTools = getHomepageCategoryTools('generators');

    assert.equal(pdfTools.length, 18, 'PDF category has exactly 18 tools');
    assert.equal(imageTools.length, 20, 'Image category has exactly 20 tools');
    assert.equal(mediaTools.length, 4, 'Media category has exactly 4 tools');
    assert.equal(genTools.length, 7, 'Generators category has exactly 7 tools');
    assert.equal(pdfTools.length + imageTools.length + mediaTools.length + genTools.length, 49, 'Sum of categories equals 49');
  });

  // 6. All 49 tool cards still exist
  await t.test('6. All 49 tool cards still exist in registry', () => {
    assert.equal(ALL_TOOLS.length, 49, 'ALL_TOOLS contains exactly 49 active tools');
    const uniqueIds = new Set(ALL_TOOLS.map((t) => t.id));
    assert.equal(uniqueIds.size, 49, 'All 49 active tools are unique');
  });

  // 7. All 49 tool IDs have a deterministic accent mapping
  await t.test('7. All 49 tool IDs have a deterministic accent mapping', () => {
    assert.equal(Object.keys(TOOL_ACCENT_MAP).length, 49, 'TOOL_ACCENT_MAP has exactly 49 entries');

    const svgDir = 'src/assets/fixmyfile-49-svg-icons';
    for (const tool of ALL_TOOLS) {
      const accent = TOOL_ACCENT_MAP[tool.id];
      assert.ok(accent, `Tool ${tool.id} has an accent mapping`);
      assert.ok(accent.primary, `Tool ${tool.id} has primary color`);
      assert.ok(accent.border, `Tool ${tool.id} has subtle border color`);
      assert.ok(accent.hoverBorder, `Tool ${tool.id} has hover border color`);

      // Verify that primary color matches the brand color in the SVG
      const svgFiles = fs.readdirSync(svgDir).filter((f) => f.endsWith('.svg'));
      const svgFile = svgFiles.find((f) => f.includes(tool.id) || f.endsWith(tool.icon + '.svg'));
      assert.ok(svgFile, `Tool ${tool.id} has matching SVG file on disk`);

      const content = fs.readFileSync(path.join(svgDir, svgFile), 'utf8');
      assert.ok(
        content.toUpperCase().includes(accent.primary.toUpperCase()),
        `Tool ${tool.id} primary color ${accent.primary} exists in ${svgFile}`
      );

      // Verify helper functions
      assert.equal(getToolAccent(tool.id).primary, accent.primary);
      assert.equal(getToolAccentColor(tool.id), accent.primary);
      assert.equal(getToolBorderColor(tool.id), accent.border);
      assert.equal(getToolHoverBorderColor(tool.id), accent.hoverBorder);
    }
  });

  // 8. Tool card uses its mapped SVG accent
  await t.test('8. Tool card uses its mapped SVG accent', () => {
    assert.ok(toolCardJsx.includes("import { getToolAccentColor, getToolBorderColor, getToolHoverBorderColor } from './toolAccentMap.js'"), 'ToolCard imports accent helpers');
    assert.ok(toolCardJsx.includes("'--tool-accent-color': accentColor"), 'ToolCard sets --tool-accent-color');
    assert.ok(toolCardJsx.includes("'--tool-border-color': borderColor"), 'ToolCard sets --tool-border-color');
    assert.ok(toolCardJsx.includes("'--tool-hover-border-color': hoverBorderColor"), 'ToolCard sets --tool-hover-border-color');
    assert.ok(appCss.includes('border: 1px solid var(--tool-border-color, var(--border-subtle));'), 'App.css tool-card uses --tool-border-color');
    assert.ok(appCss.includes('border-color: var(--tool-hover-border-color,'), 'App.css tool-card:hover uses --tool-hover-border-color');
  });

  // 9. No missing SVG mapping
  await t.test('9. No missing SVG mapping across all 49 tools and 4 categories', () => {
    for (const tool of ALL_TOOLS) {
      assert.ok(TOOL_SVG_MAP[tool.icon], `No missing SVG mapping for tool ${tool.id} icon ${tool.icon}`);
    }
    for (const cat of HOMEPAGE_CATEGORIES) {
      assert.ok(CATEGORY_SVG_MAP[cat.id], `No missing category SVG mapping for ${cat.id}`);
    }
  });

  // 10. No duplicate SVG mapping
  await t.test('10. No duplicate SVG mapping across active tools', () => {
    const mappedToolIcons = ALL_TOOLS.map((t) => t.icon);
    const uniqueToolIcons = new Set(mappedToolIcons);
    assert.equal(uniqueToolIcons.size, 49, '49 unique tool icon entries in registry');

    const catSvgs = [
      CATEGORY_SVG_MAP['pdf-tools'],
      CATEGORY_SVG_MAP['image-tools'],
      CATEGORY_SVG_MAP['media-tools'],
      CATEGORY_SVG_MAP['generators']
    ];
    const uniqueCatSvgs = new Set(catSvgs);
    assert.equal(uniqueCatSvgs.size, 4, '4 unique category SVG files');
  });

  // 11. Accessibility attributes remain correct
  await t.test('11. Accessibility attributes remain correct', () => {
    assert.ok(homeJsx.includes('aria-label="Browse tools by category"'), 'Category discovery section has semantic aria-label');
    assert.ok(homeJsx.includes('alt=""'), 'Category SVG img has empty alt (decorative)');
    assert.ok(homeJsx.includes('aria-hidden="true"'), 'Category SVG img has aria-hidden="true"');
    assert.ok(homeJsx.includes('focusable="false"'), 'Category SVG img has focusable="false"');
    assert.ok(toolCardJsx.includes('aria-label={`Open ${name} tool`}'), 'ToolCard link has accessible aria-label');
    assert.ok(appCss.includes('.tool-card:focus-visible'), 'ToolCard has focus-visible treatment');
    assert.ok(appCss.includes('@media (prefers-reduced-motion: reduce)'), 'App.css respects prefers-reduced-motion');
  });
});
