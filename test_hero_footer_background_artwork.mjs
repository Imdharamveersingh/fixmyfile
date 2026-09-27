import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';
import { CATEGORY_SVG_MAP } from './src/components/categorySvgMap.js';

test('=== FIXMYFILE: HERO & FOOTER BACKGROUND ARTWORK & FLOATING SVG TEST SUITE ===', async (t) => {
  const homeJsx = fs.readFileSync('src/pages/HomePage.jsx', 'utf8');
  const footerJsx = fs.readFileSync('src/components/Footer.jsx', 'utf8');
  const appCss = fs.readFileSync('src/App.css', 'utf8');
  const bgArtPath = 'src/assets/hero-bg-abstract.svg';

  // 1. Hero background artwork exists
  await t.test('1. Hero background artwork exists', () => {
    assert.ok(fs.existsSync(bgArtPath), 'hero-bg-abstract.svg exists on disk');
    const svgContent = fs.readFileSync(bgArtPath, 'utf8');
    assert.ok(svgContent.includes('<svg'), 'Asset is a valid SVG');
    assert.ok(svgContent.includes('centerWhiteGlow'), 'Artwork contains soft white central area glow');
    assert.ok(svgContent.includes('blueGradSoft'), 'Artwork contains light blue gradients');
    assert.ok(svgContent.includes('purpleGradSoft'), 'Artwork contains lavender/purple gradients');
    assert.ok(svgContent.includes('abstract-shapes'), 'Artwork contains large flowing abstract shapes');
    assert.ok(svgContent.includes('subtle-circles'), 'Artwork contains subtle circles');
    assert.ok(svgContent.includes('dotted-patterns'), 'Artwork contains dotted decorative patterns');
    assert.ok(svgContent.includes('thin-curved-lines'), 'Artwork contains thin curved lines');
  });

  // 2. Hero background layer exists
  await t.test('2. Hero background layer exists', () => {
    assert.ok(homeJsx.includes('className="hero-background-art"'), 'HomePage.jsx renders hero-background-art div');
    assert.ok(homeJsx.includes('aria-hidden="true"'), 'hero-background-art is aria-hidden');
    assert.match(appCss, /\.hero-background-art\s*\{[^}]*position:\s*absolute/, 'App.css positions hero-background-art absolutely');
    assert.match(appCss, /\.hero-background-art\s*\{[^}]*inset:\s*0/, 'App.css sets inset: 0 on hero-background-art');
    assert.match(appCss, /\.hero-background-art\s*\{[^}]*background-image:\s*url\(/, 'App.css sets background-image');
    assert.match(appCss, /\.hero-background-art\s*\{[^}]*pointer-events:\s*none/, 'App.css sets pointer-events: none');
  });

  // 3. Footer background artwork exists
  await t.test('3. Footer background artwork exists', () => {
    assert.ok(footerJsx.includes('className="footer-background-art"'), 'Footer.jsx renders footer-background-art div');
    assert.match(appCss, /\.footer-background-art\s*\{[^}]*position:\s*absolute/, 'App.css positions footer-background-art absolutely');
    assert.match(appCss, /\.footer-background-art\s*\{[^}]*background-image:\s*url\(/, 'App.css sets background-image on footer');
    assert.match(appCss, /\.footer-background-art\s*\{[^}]*opacity:\s*0\.08/, 'App.css sets subtle opacity on footer artwork');
    assert.match(appCss, /\.footer-background-art\s*\{[^}]*pointer-events:\s*none/, 'App.css sets pointer-events: none on footer artwork');
  });

  // 4. Floating SVG layer exists
  await t.test('4. Floating SVG layer exists', () => {
    assert.ok(homeJsx.includes('className="hero-floating-icons"'), 'HomePage.jsx renders hero-floating-icons container');
    assert.match(appCss, /\.hero-floating-icons\s*\{[^}]*position:\s*absolute/, 'hero-floating-icons positioned absolutely');
    assert.match(appCss, /\.hero-floating-icons\s*\{[^}]*pointer-events:\s*none/, 'hero-floating-icons pointer-events: none');
    assert.match(appCss, /\.hero-floating-icon\s*\{[^}]*animation:\s*heroIconFloat/, 'hero-floating-icon uses CSS keyframe float');
  });

  // 5. Only the intended number of floating icons is rendered for desktop
  await t.test('5. Only the intended number of floating icons is rendered for desktop (8-10 icons)', () => {
    const iconMatches = homeJsx.match(/id:\s*'[a-z0-9-]+'/g);
    // Find icons inside FLOATING_HERO_ICONS array
    const floatingIconsMatch = homeJsx.match(/const FLOATING_HERO_ICONS = \[(.*?)\];/s);
    assert.ok(floatingIconsMatch, 'FLOATING_HERO_ICONS array defined in HomePage.jsx');
    const idsInArray = floatingIconsMatch[1].match(/id:\s*'([a-z0-9-]+)'/g);
    assert.ok(idsInArray.length >= 8 && idsInArray.length <= 10, `Floating icons count (${idsInArray.length}) must be between 8 and 10`);
    assert.equal(idsInArray.length, 9, 'Exactly 9 carefully selected icons used for desktop');
  });

  // 6. Floating SVGs reference real existing FixMyFile assets
  await t.test('6. Floating SVGs reference real existing FixMyFile assets', () => {
    const floatingIconsMatch = homeJsx.match(/const FLOATING_HERO_ICONS = \[(.*?)\];/s);
    const idMatches = [...floatingIconsMatch[1].matchAll(/id:\s*'([a-z0-9-]+)'/g)].map((m) => m[1]);

    const expectedTools = [
      'merge-pdf',
      'pdf-to-word',
      'jpg-to-pdf',
      'image-compressor',
      'image-converter',
      'image-cropper',
      'video-compressor',
      'gif-maker',
      'qr-code-generator'
    ];

    for (const toolId of expectedTools) {
      assert.ok(idMatches.includes(toolId), `Floating icons must include representative tool: ${toolId}`);
      assert.ok(TOOL_SVG_MAP[toolId], `TOOL_SVG_MAP must contain entry for ${toolId}`);
    }

    // Verify all 9 icons point to real files on disk
    for (const toolId of idMatches) {
      const toolEntry = ALL_TOOLS.find((t) => t.id === toolId);
      assert.ok(toolEntry, `Tool ${toolId} must exist in ALL_TOOLS`);
      const svgUrl = TOOL_SVG_MAP[toolId];
      assert.ok(svgUrl, `TOOL_SVG_MAP must map ${toolId}`);
      // Check file exists in src/assets/fixmyfile-49-svg-icons/
      const files = fs.readdirSync('src/assets/fixmyfile-49-svg-icons');
      const matchesDisk = files.some((f) => f.includes(toolId));
      assert.ok(matchesDisk, `SVG file for ${toolId} must exist on disk`);
    }
  });

  // 7. Floating SVGs have aria-hidden="true"
  await t.test('7. Floating SVGs have aria-hidden="true"', () => {
    assert.ok(homeJsx.includes('hero-floating-icons" aria-hidden="true"'), 'hero-floating-icons has aria-hidden="true"');
    assert.ok(homeJsx.includes('alt=""'), 'Floating <img> elements have empty alt=""');
  });

  // 8. Floating SVGs are not keyboard focusable
  await t.test('8. Floating SVGs are not keyboard focusable', () => {
    assert.ok(homeJsx.includes('focusable="false"'), 'Floating <img> elements have focusable="false"');
    assert.ok(!homeJsx.includes('<a className="hero-floating-icon"'), 'Floating icons must NOT be links');
    assert.ok(!homeJsx.includes('<button className="hero-floating-icon"'), 'Floating icons must NOT be buttons');
    assert.match(appCss, /\.hero-floating-icon\s*\{[^}]*pointer-events:\s*none/, 'CSS enforces pointer-events: none on icons');
  });

  // 9. Reduced-motion CSS exists
  await t.test('9. Reduced-motion CSS exists', () => {
    assert.match(appCss, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)[^{]*\{[\s\S]*?\.hero-floating-icon[\s\S]*?animation:\s*none\s*!important/);
  });

  // 10. Existing Hero H1 remains unchanged
  await t.test('10. Existing Hero H1 remains unchanged', () => {
    assert.ok(homeJsx.includes('Simple tools for <span className="text-gradient">everyday files</span>.'), 'H1 title preserved verbatim');
    assert.ok(homeJsx.includes('A focused collection of browser-based tools for PDFs, images, generators, and media.'), 'Description preserved verbatim');
  });

  // 11. Existing CTA destinations remain unchanged
  await t.test('11. Existing CTA destinations remain unchanged', () => {
    assert.ok(homeJsx.includes('href="#pdf-tools"'), 'Explore All Tools links to #pdf-tools');
    assert.ok(homeJsx.includes('href="#categories"'), 'Browse Categories links to #categories');
  });

  // 12. Existing 49 tool cards remain unchanged
  await t.test('12. Existing 49 tool cards remain unchanged', () => {
    assert.equal(ALL_TOOLS.length, 49, 'Exactly 49 tools in ALL_TOOLS registry');
  });

  // 13. Existing 4 category cards remain unchanged
  await t.test('13. Existing 4 category cards remain unchanged', () => {
    const categoryMatches = homeJsx.match(/id:\s*'(pdf-tools|image-tools|media-tools|generators)'/g);
    assert.equal(categoryMatches.length, 4, 'Must have exactly 4 category cards');
  });

  // 14. Existing collection heading SVGs remain unchanged
  await t.test('14. Existing collection heading SVGs remain unchanged', () => {
    assert.ok(CATEGORY_SVG_MAP['pdf-tools'], 'PDF category SVG mapped');
    assert.ok(CATEGORY_SVG_MAP['image-tools'], 'Image category SVG mapped');
    assert.ok(CATEGORY_SVG_MAP['media-tools'], 'Media category SVG mapped');
    assert.ok(CATEGORY_SVG_MAP['generators'], 'Generators category SVG mapped');
  });

  // 15. No external image URL is introduced
  await t.test('15. No external image URL is introduced', () => {
    const bgUrlMatch = appCss.match(/\.hero-background-art\s*\{[^}]*background-image:\s*url\(([^)]+)\)/);
    assert.ok(bgUrlMatch, 'hero-background-art background-image found');
    assert.ok(!bgUrlMatch[1].startsWith('http://') && !bgUrlMatch[1].startsWith('https://'), 'Background image must be local');

    const footerBgMatch = appCss.match(/\.footer-background-art\s*\{[^}]*background-image:\s*url\(([^)]+)\)/);
    assert.ok(footerBgMatch, 'footer-background-art background-image found');
    assert.ok(!footerBgMatch[1].startsWith('http://') && !footerBgMatch[1].startsWith('https://'), 'Footer background image must be local');

    assert.ok(!homeJsx.includes('src="http://') && !homeJsx.includes('src="https://'), 'No external image in HomePage.jsx');
    assert.ok(!footerJsx.includes('src="http://') && !footerJsx.includes('src="https://'), 'No external image in Footer.jsx');
  });
});
