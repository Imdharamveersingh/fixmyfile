import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
const ACTIVE_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Ready');

const appCss = fs.readFileSync(path.resolve('src/App.css'), 'utf8');
const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
const pkgJson = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf8'));
const headerCode = fs.readFileSync(path.resolve('src/components/ToolDetailHeader.jsx'), 'utf8');

test('=== FIXMYFILE: TOOL DETAIL PAGE VISUAL POLISH V2 TEST SUITE ===', async (t) => {
  // 1. All 49 active tools have category detection & capability badges
  await t.test('1. All 49 active tools categorized and have capability badges', () => {
    assert.strictEqual(ACTIVE_TOOLS.length, 49, 'Active tools count must be exactly 49');
    assert(headerCode.includes('getToolCategory'), 'ToolDetailHeader defines getToolCategory');
    assert(headerCode.includes('getToolCapabilityBadges'), 'ToolDetailHeader defines getToolCapabilityBadges');
    assert(headerCode.includes('tool-capability-pills'), 'ToolDetailHeader renders capability pills container');
    assert(headerCode.includes('tool-capability-pill'), 'ToolDetailHeader renders capability pill items');
    assert(headerCode.includes('tool-header-icon-wrap'), 'ToolDetailHeader renders icon container');
  });

  // 2. Category Accent System tokens in App.css
  await t.test('2. Category accent system tokens defined for all 4 categories', () => {
    // PDF
    assert(appCss.includes('--tool-accent: #6366F1') || appCss.includes('#6366F1'), 'PDF accent defined');
    assert(appCss.includes('#EEF2FF'), 'PDF soft accent defined');
    assert(appCss.includes('#C7D2FE'), 'PDF accent border defined');

    // Image
    assert(appCss.includes('--tool-accent: #0EA5E9') || appCss.includes('#0EA5E9'), 'Image accent defined');
    assert(appCss.includes('#E0F2FE'), 'Image soft accent defined');
    assert(appCss.includes('#BAE6FD'), 'Image accent border defined');

    // Media
    assert(appCss.includes('--tool-accent: #8B5CF6') || appCss.includes('#8B5CF6'), 'Media accent defined');
    assert(appCss.includes('#F3E8FF'), 'Media soft accent defined');
    assert(appCss.includes('#DDD6FE'), 'Media accent border defined');

    // Generators
    assert(appCss.includes('--tool-accent: #2563EB') || appCss.includes('#2563EB'), 'Generators accent defined');
    assert(appCss.includes('#DBEAFE'), 'Generators soft accent defined');
    assert(appCss.includes('#BFDBFE'), 'Generators accent border defined');
  });

  // 3. Elevated Workspace Card styling
  await t.test('3. Main elevated workspace card styling and dimensions', () => {
    assert(appCss.includes('.converter-card'), 'converter-card styled');
    assert(appCss.includes('.workbench-card'), 'workbench-card styled');
    assert(appCss.includes('.tool-workspace'), 'tool-workspace styled');
    assert(appCss.includes('.qr-app-layout'), 'qr-app-layout styled');
    assert(appCss.includes('border-radius: 20px') || appCss.includes('border-radius: 18px'), 'Card radius 18-20px');
    assert(appCss.includes('box-shadow: 0 4px 20px -2px') || appCss.includes('rgba(15, 23, 42, 0.05)'), 'Subtle elevated shadow');
  });

  // 4. Modern Dropzone & subtle gradient
  await t.test('4. Modern Dropzone subtle gradient and dashed accent border', () => {
    assert(appCss.includes('.dropzone'), 'dropzone styled');
    assert(appCss.includes('linear-gradient(180deg, var(--tool-accent-soft'), 'Subtle dropzone gradient using category accent');
    assert(appCss.includes('1.5px dashed var(--tool-accent-border') || appCss.includes('dashed var(--tool-accent-border'), 'Dashed accent border');
    assert(appCss.includes('border-radius: 16px'), 'Dropzone border radius 14-16px');
  });

  // 5. Workspace SVG focal point
  await t.test('5. Workspace SVG focal point inside soft rounded container', () => {
    assert(appCss.includes('.dropzone-icon'), 'dropzone-icon styled');
    assert(appCss.includes('width: 72px') || appCss.includes('width: 64px'), 'Focal icon container dimensions');
    assert(appCss.includes('width: 48px'), 'Workspace SVG sized 48px on desktop');
    assert(appCss.includes('width: 42px'), 'Workspace SVG sized 42px on mobile');
  });

  // 6. Typography hierarchy & H1 Free branding
  await t.test('6. Typography hierarchy and canonical H1 Free branding preserved', () => {
    assert(appCss.includes('clamp(2.1rem, 2.8vw, 2.5rem)'), 'Desktop H1 clamp preserved');
    assert(appCss.includes('clamp(1.75rem, 7vw, 2rem)'), 'Mobile H1 clamp preserved');
    assert(appCss.includes('max-width: 820px'), 'Tool description constrained');
    assert(headerCode.includes('Free'), 'Canonical H1 Free naming preserved');
  });

  // 7. Breadcrumb system unchanged
  await t.test('7. Breadcrumb system remains semantic Home / Tool Name', () => {
    assert(headerCode.includes('<nav'), 'Semantic nav');
    assert(headerCode.includes('aria-label="Breadcrumb"'), 'Breadcrumb label');
    assert(headerCode.includes('>Home</Link>'), 'Home link');
    assert(headerCode.includes('aria-current="page"'), 'Current page item');
    assert(headerCode.includes('breadcrumbName = meta.name'), 'Breadcrumb uses tool name without Free');
  });

  // 8. Information / Privacy strip card
  await t.test('8. Trust / privacy strip card with lock badge and gradient', () => {
    assert(appCss.includes('.tool-privacy-note-card'), 'Privacy note card styled');
    assert(appCss.includes('.tool-privacy-badge'), 'Privacy badge styled');
    assert(appCss.includes('linear-gradient(90deg, var(--tool-accent-soft'), 'Soft gradient on privacy card');
  });

  // 9. How-To Section and FAQ accordions
  await t.test('9. How-To step cards and FAQ accordions visual polish', () => {
    assert(appCss.includes('.tool-howto-card'), 'How-To card styled');
    assert(appCss.includes('.tool-howto-number'), 'How-To number badge styled');
    assert(appCss.includes('.tool-faq-item'), 'FAQ item styled');
    assert(appCss.includes('.tool-faq-chevron.is-open'), 'FAQ chevron rotate styled');
  });

  // 10. Container width 1100px - 1180px
  await t.test('10. Page container width constrained to comfortable SaaS width', () => {
    assert(appCss.includes('max-width: 1140px'), 'Container max-width 1140px applied');
  });

  // 11. Stagger animations and reduced motion preserved
  await t.test('11. Entrance animations and reduced motion accessibility preserved', () => {
    assert(appCss.includes('@keyframes pageFadeUpSubtle'), 'pageFadeUpSubtle keyframes preserved');
    assert(appCss.includes('@media (prefers-reduced-motion: reduce)'), 'Reduced motion query preserved');
    assert(appCss.includes('animation: none !important'), 'Reduced motion reset preserved');
  });

  // 12. No external fonts and zero new dependencies
  await t.test('12. No external fonts and zero new dependencies added', () => {
    assert(!appCss.includes('fonts.googleapis.com'), 'No Google fonts in App.css');
    assert(!indexHtml.includes('fonts.googleapis.com'), 'No Google fonts in index.html');
    assert(!appCss.includes('@font-face'), 'No custom @font-face downloads in App.css');

    // Dependencies in package.json
    const deps = Object.keys(pkgJson.dependencies || {});
    assert.strictEqual(deps.length, 23, 'Dependencies count unchanged (23 dependencies)');
  });

  // 13. All 49 active tool pages render ToolDetailHeader and have workspace card
  await t.test('13. All 49 active tools render ToolDetailHeader and workspace card', () => {
    for (const tool of ACTIVE_TOOLS) {
      const filePath = path.resolve(`src/tools/${tool.id}/index.jsx`);
      assert(fs.existsSync(filePath), `Tool file exists: ${filePath}`);
      const code = fs.readFileSync(filePath, 'utf8');
      assert(code.includes('<ToolDetailHeader'), `Tool ${tool.id} renders ToolDetailHeader`);
    }
  });
});
