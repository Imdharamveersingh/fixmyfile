import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';

test('=== FIXMYFILE: FINAL HEADER NAVIGATION & MEGA-MENU POLISH TEST SUITE ===', async (t) => {
  const headerPath = path.resolve('src/components/Header.jsx');
  const cssPath = path.resolve('src/App.css');
  const headerCode = fs.readFileSync(headerPath, 'utf8');
  const cssCode = fs.readFileSync(cssPath, 'utf8');

  // 1. Logo Verification
  await t.test('1. Logo: Exactly 1 brand logo asset imported and rendered without extra text', () => {
    assert(headerCode.includes("import logo from '../assets/logo.png'"), 'Header imports logo.png');
    const logoImgMatches = Array.from(headerCode.matchAll(/<img[^>]+src=\{logo\}[^>]*\/>/g));
    assert.strictEqual(logoImgMatches.length, 1, 'Header contains exactly 1 logo image');
    assert(logoImgMatches[0][0].includes('alt="FixMyFile"'), 'Logo has alt="FixMyFile"');
    // Ensure no separate visible FixMyFile text inside the logo link
    const brandLinkBlock = headerCode.match(/<Link to="\/" className="brand-logo"[^>]*>([\s\S]*?)<\/Link>/);
    assert(brandLinkBlock, 'Brand logo Link exists');
    assert(!brandLinkBlock[1].includes('>FixMyFile<'), 'No separate text beside logo image');
  });

  // 2. Blog Link Removal
  await t.test('2. Blog: 0 visible Header navigation links', () => {
    // Check navigation block does not link to /blog
    const navMatch = headerCode.match(/<nav className="site-nav"[^>]*>([\s\S]*?)<\/nav>/);
    assert(navMatch, 'Main navigation block exists');
    assert(!navMatch[1].includes('to="/blog"'), 'Main nav must not contain link to /blog');
    assert(!navMatch[1].includes('>Blog<'), 'Main nav must not contain visible Blog text');
  });

  // 3. Explore Tools CTA Removal
  await t.test('3. Explore Tools: 0 visible Header CTA buttons', () => {
    assert(!headerCode.includes('Explore Tools'), 'Header must not contain Explore Tools button or text');
    assert(!headerCode.includes('header-cta-btn'), 'Header must not contain header-cta-btn');
  });

  // 4. Main Navigation Structure (Exactly 5 items)
  await t.test('4. Main navigation: Exactly 5 main navigation categories', () => {
    const navMatch = headerCode.match(/<nav className="site-nav"[^>]*>([\s\S]*?)<\/nav>/);
    assert(navMatch, 'Main navigation block exists');
    const navContent = navMatch[1];

    // Item 1: All Tools
    assert(navContent.includes('All Tools'), 'Nav must contain All Tools');
    // Item 2: PDF Tools
    assert(navContent.includes('PDF Tools'), 'Nav must contain PDF Tools');
    // Item 3: Image Tools
    assert(navContent.includes('Image Tools'), 'Nav must contain Image Tools');
    // Item 4: Media Tools
    assert(navContent.includes('Media Tools'), 'Nav must contain Media Tools');
    // Item 5: Generators
    assert(navContent.includes('Generators'), 'Nav must contain Generators');

    // Count dropdown triggers + direct links in site-nav
    const dropdownMatches = Array.from(navContent.matchAll(/className="nav-dropdown\b/g));
    assert.strictEqual(dropdownMatches.length, 4, 'Must have 4 dropdown menus (PDF, Image, Media, Generators)');
    const allToolsMatch = navContent.includes('to="/"');
    assert(allToolsMatch, 'Must have direct link to All Tools (/)');
  });

  // 5. Header Search Control
  await t.test('5. Search: 1 visible Header search control with active tool search interaction', () => {
    assert(headerCode.includes('header-search-container'), 'Header contains search container');
    assert(headerCode.includes('header-search-input'), 'Header contains search input');
    assert(headerCode.includes('placeholder="Search tools, converters..."'), 'Header search has correct placeholder');
    assert(headerCode.includes('searchResults'), 'Header implements search filtering logic');
    assert(headerCode.includes('header-search-dropdown'), 'Header contains search dropdown element');
    assert(headerCode.includes('role="search"') || headerCode.includes('role="listbox"'), 'Header search has accessible roles');
    assert(cssCode.includes('.header-search-box'), 'App.css styles .header-search-box');
  });

  // 6. Header Language Control
  await t.test('6. Language: 1 visible Header language control shell [ 🌐 EN ▼ ]', () => {
    assert(headerCode.includes('header-language-container'), 'Header contains language container');
    assert(headerCode.includes('header-language-btn'), 'Header contains language button');
    assert(headerCode.includes('header-language-globe'), 'Header contains globe icon');
    assert(headerCode.includes('EN'), 'Header displays EN');
    assert(headerCode.includes('header-language-chevron'), 'Header displays chevron');
    assert(cssCode.includes('.header-language-btn'), 'App.css styles .header-language-btn');
  });

  // 7. Mega-Menu Distribution & Total Active Tools (49/49)
  await t.test('7. Mega-menu tool distribution: PDF 18, Image 20, Media 4, Generators 7 (49/49 total)', () => {
    const activeTools = ALL_TOOLS.filter((t) => t.status === 'Ready');
    assert.strictEqual(activeTools.length, 49, 'Expected 49 active tools');

    // PDF Tools: 18
    const pdfBlock = headerCode.split('id="nav-dropdown-menu-pdf"')[1]?.split('id="nav-dropdown-menu-image"')[0] || '';
    const pdfIcons = Array.from(pdfBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(pdfIcons.length, 18, `PDF Tools must contain 18 tools, found ${pdfIcons.length}`);

    // Image Tools: 20
    const imageBlock = headerCode.split('id="nav-dropdown-menu-image"')[1]?.split('id="nav-dropdown-menu-media"')[0] || '';
    const imageIcons = Array.from(imageBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(imageIcons.length, 20, `Image Tools must contain 20 tools, found ${imageIcons.length}`);

    // Media Tools: 4
    const mediaBlock = headerCode.split('id="nav-dropdown-menu-media"')[1]?.split('id="nav-dropdown-menu-generators"')[0] || '';
    const mediaIcons = Array.from(mediaBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(mediaIcons.length, 4, `Media Tools must contain 4 tools, found ${mediaIcons.length}`);

    // Generators: 7
    const genBlock = headerCode.split('id="nav-dropdown-menu-generators"')[1]?.split('</nav>')[0] || '';
    const genIcons = Array.from(genBlock.matchAll(/icon="([^"]+)"/g));
    assert.strictEqual(genIcons.length, 7, `Generators must contain 7 tools, found ${genIcons.length}`);

    // Total in mega menu
    const totalMegaIcons = pdfIcons.length + imageIcons.length + mediaIcons.length + genIcons.length;
    assert.strictEqual(totalMegaIcons, 49, 'Total mega menu tool icons must be 49');
  });

  // 8. ToolIcon Integration & SVG Mappings
  await t.test('8. SVG mappings: All 49 active tools use ToolIcon and exist in toolSvgMap', () => {
    const activeTools = ALL_TOOLS.filter((t) => t.status === 'Ready');
    for (const tool of activeTools) {
      assert(headerCode.includes(`icon="${tool.id}"`), `Header must render ToolIcon for ${tool.id}`);
      assert(TOOL_SVG_MAP[tool.id], `TOOL_SVG_MAP must contain ${tool.id}`);
    }
  });

  // 9. Tool Icon Target Size: 20px
  await t.test('9. Tool icon target size: 20px across all dropdown tool links', () => {
    const megaIconMatches = Array.from(headerCode.matchAll(/<ToolIcon\s+icon="([^"]+)"\s+size=\{([0-9]+)\}\s+className="mega-menu-tool-icon"/g));
    assert.strictEqual(megaIconMatches.length, 49, 'All 49 mega menu tools matched');
    for (const match of megaIconMatches) {
      assert.strictEqual(match[2], '20', `Tool ${match[1]} icon size must be 20`);
    }
    assert(cssCode.includes('width: 20px'), 'App.css must specify width: 20px for .mega-menu-tool-icon');
    assert(cssCode.includes('height: 20px'), 'App.css must specify height: 20px for .mega-menu-tool-icon');
  });

  // 10. Tool Text Styling: 15px-16px, 500-600 font weight
  await t.test('10. Tool text styling: 15px font size and clean line height', () => {
    assert(cssCode.includes('font-size: 15px'), 'App.css must specify font-size: 15px for mega-menu-link/tool-name');
    assert(cssCode.includes('min-height: 38px') || cssCode.includes('min-height: 36px'), 'App.css must specify row min-height');
    assert(cssCode.includes('gap: 10px'), 'App.css must specify gap: 10px between icon and label');
  });

  // 11. Desktop 3-Zone Layout
  await t.test('11. Desktop 3-zone layout: auto 1fr auto grid with centered nav and logo at left', () => {
    assert(cssCode.includes('grid-template-columns: auto 1fr auto'), 'Header container uses auto 1fr auto grid');
    assert(cssCode.includes('justify-self: start'), 'Logo aligned to start of grid');
    assert(cssCode.includes('justify-self: center'), 'Nav centered in grid');
    assert(cssCode.includes('justify-self: end'), 'Right controls aligned to end of grid');
  });

  // 12. Responsive Mobile Architecture
  await t.test('12. Responsive Mobile Architecture: preserved scrollable nav and non-overflowing header', () => {
    assert(cssCode.includes('@media (max-width: 860px)'), 'Mobile header media query exists');
    assert(cssCode.includes('overflow-x: auto'), 'Mobile nav scrolls horizontally without breaking layout');
  });
});
