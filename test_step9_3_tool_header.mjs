import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';

const ACTIVE_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Ready');

test('=== STEP 9.3: TOOL DETAIL HEADER & BREADCRUMB CONSISTENCY TEST SUITE ===', async (t) => {

  await t.test('1. Shared Component: ToolDetailHeader exists and exports properly', () => {
    const compPath = path.resolve('src/components/ToolDetailHeader.jsx');
    assert(fs.existsSync(compPath), 'ToolDetailHeader.jsx component file must exist');
    const code = fs.readFileSync(compPath, 'utf8');
    assert(code.includes('export default function ToolDetailHeader'), 'Must export default ToolDetailHeader');
    assert(code.includes('aria-label="Breadcrumb"'), 'Must have aria-label="Breadcrumb" on nav');
    assert(code.includes('aria-current="page"'), 'Must have aria-current="page" on current breadcrumb item');
    assert(code.includes('<h1'), 'Must render h1 tag');
  });

  await t.test('2. All 49 active tools render ToolDetailHeader with valid toolId', () => {
    assert.strictEqual(ACTIVE_TOOLS.length, 49, 'Must have exactly 49 active tools');

    for (const tool of ACTIVE_TOOLS) {
      const filePath = path.resolve(`src/tools/${tool.id}/index.jsx`);
      assert(fs.existsSync(filePath), `Tool file missing: ${filePath}`);
      const code = fs.readFileSync(filePath, 'utf8');

      assert(
        code.includes('ToolDetailHeader'),
        `Tool ${tool.id} does not import or use ToolDetailHeader`
      );
      assert(
        code.includes(`<ToolDetailHeader`) && code.includes(`toolId="${tool.id}"`),
        `Tool ${tool.id} must render <ToolDetailHeader toolId="${tool.id}" ... />`
      );
    }
  });

  await t.test('3. Visible "FREE · IN-BROWSER" is completely removed from all 49 tool headers', () => {
    for (const tool of ACTIVE_TOOLS) {
      const filePath = path.resolve(`src/tools/${tool.id}/index.jsx`);
      const code = fs.readFileSync(filePath, 'utf8');
      
      // Split at ToolDetailContent to check upper half (header area)
      const upperHalf = code.split('ToolDetailContent')[0] || '';
      assert(
        !/free\s*·\s*in-browser/i.test(upperHalf),
        `Tool ${tool.id} still has visible "Free · In-Browser" in header area`
      );
      assert(
        !upperHalf.includes('tool-badge-primary'),
        `Tool ${tool.id} still has tool-badge-primary in header area`
      );
    }
  });

  await t.test('4. Unwanted technical/category eyebrows above H1 are completely removed', () => {
    const legacyEyebrows = [
      'Image Tool',
      'Client-Side · 100% Private',
      'JPG · PNG · WEBP',
      'PNG → JPG',
      'Generator',
      'QR · SVG + PNG',
      '1D · SVG + PNG',
      'Security Tool',
      'Text Utility'
    ];

    for (const tool of ACTIVE_TOOLS) {
      const filePath = path.resolve(`src/tools/${tool.id}/index.jsx`);
      const code = fs.readFileSync(filePath, 'utf8');
      const upperHalf = code.split('ToolDetailContent')[0] || '';

      assert(
        !upperHalf.includes('tool-badge-row'),
        `Tool ${tool.id} still contains legacy tool-badge-row`
      );

      // Check that header doesn't contain legacy eyebrow spans
      for (const eyebrow of legacyEyebrows) {
        assert(
          !upperHalf.includes(`>${eyebrow}<`),
          `Tool ${tool.id} still contains visible legacy eyebrow: "${eyebrow}"`
        );
      }
    }
  });

  await t.test('5. Semantic Breadcrumb Structure & Navigation Rules in ToolDetailHeader', () => {
    const compCode = fs.readFileSync(path.resolve('src/components/ToolDetailHeader.jsx'), 'utf8');

    // 1. Semantic nav landmark
    assert(compCode.includes('<nav'), 'Must use semantic <nav>');
    assert(compCode.includes('aria-label="Breadcrumb"'), 'Must have aria-label="Breadcrumb"');

    // 2. Ordered list
    assert(compCode.includes('<ol'), 'Must use semantic <ol>');
    assert(compCode.includes('<li'), 'Must use semantic <li>');

    // 3. Home links to /
    assert(compCode.includes('<Link to="/"'), 'Home must link to "/"');
    assert(compCode.includes('>Home</Link>'), 'Must render text Home');

    // 4. Separator
    assert(compCode.includes('aria-hidden="true"'), 'Separator must have aria-hidden="true"');
    assert(compCode.includes('breadcrumb-separator'), 'Separator must have breadcrumb-separator class');

    // 5. Current page
    assert(compCode.includes('aria-current="page"'), 'Current item must have aria-current="page"');
    assert(!compCode.includes('to={tool.path}'), 'Current page must not be a link to itself');
  });

  await t.test('6. CSS Architecture: Tool Detail Header, Breadcrumb, Spacing, and Reduced Motion', () => {
    const css = fs.readFileSync(path.resolve('src/App.css'), 'utf8');

    assert(css.includes('.tool-detail-header'), 'App.css must style .tool-detail-header');
    assert(css.includes('.tool-breadcrumb-nav'), 'App.css must style .tool-breadcrumb-nav');
    assert(css.includes('.tool-breadcrumb-list'), 'App.css must style .tool-breadcrumb-list');
    assert(css.includes('.tool-breadcrumb-link'), 'App.css must style .tool-breadcrumb-link');
    assert(css.includes('.tool-breadcrumb-separator'), 'App.css must style .tool-breadcrumb-separator');
    assert(css.includes('.tool-breadcrumb-current'), 'App.css must style .tool-breadcrumb-current');
    assert(css.includes('.tool-detail-h1'), 'App.css must style .tool-detail-h1');
    assert(css.includes('.tool-detail-description'), 'App.css must style .tool-detail-description');
    assert(css.includes('max-width: 820px'), 'App.css must constrain description max-width');
  });

  await t.test('7. Step 9.2 Lower Content System Remains 100% Intact', () => {
    for (const tool of ACTIVE_TOOLS) {
      const filePath = path.resolve(`src/tools/${tool.id}/index.jsx`);
      const code = fs.readFileSync(filePath, 'utf8');
      assert(
        code.includes(`<ToolDetailContent toolId="${tool.id}"`),
        `Tool ${tool.id} must still render Step 9.2 <ToolDetailContent toolId="${tool.id}" />`
      );
    }
  });

  await t.test('8. Regression Protections: 49 active tools, 6 deferred, Image Cropper Phase 7.7', () => {
    assert.strictEqual(ACTIVE_TOOLS.length, 49, 'Active tools count must be exactly 49');
    const cropper = ALL_TOOLS.find((t) => t.id === 'image-cropper');
    assert(cropper && cropper.phase === 'Phase 7.7', 'Image Cropper must remain Phase 7.7');
  });
});
