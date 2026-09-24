import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ALL_TOOLS,
  PHASE_1_TOOLS,
  PHASE_2_TOOLS,
  PHASE_3_TOOLS,
  PHASE_4_TOOLS,
  PHASE_5_TOOLS,
  PHASE_6_TOOLS,
  PHASE_7_TOOLS,
  TOTAL_STRATEGY_TOOLS
} from './src/tools/toolsRegistry.js';
import { TOOL_ICON_DEFS } from './src/components/toolIconDefs.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';

test('=== FIXMYFILE: TOOL CARD UI POLISH V2 TEST SUITE ===', async (t) => {
  const toolCardSrc = fs.readFileSync('src/components/ToolCard.jsx', 'utf-8');
  const toolIconSrc = fs.readFileSync('src/components/ToolIcon.jsx', 'utf-8');
  const appCssSrc = fs.readFileSync('src/App.css', 'utf-8');
  const blogPageSrc = fs.readFileSync('src/pages/BlogArticlePage.jsx', 'utf-8');

  // Requirement 1 & 9: Registry integrity and icon mappings for all 49 tools
  await t.test('1. All 49 active tools have an icon mapping in ToolIcon and toolsRegistry', () => {
    assert.equal(ALL_TOOLS.length, 49, 'ALL_TOOLS must contain exactly 49 active tools');
    assert.equal(TOTAL_STRATEGY_TOOLS, 55, 'TOTAL_STRATEGY_TOOLS must be 55');

    // Verify non-tool UI icons remain in TOOL_ICON_DEFS
    assert.ok(TOOL_ICON_DEFS.default, 'TOOL_ICON_DEFS must retain default icon');
    assert.ok(TOOL_ICON_DEFS.mail, 'TOOL_ICON_DEFS must retain mail icon');
    assert.ok(TOOL_ICON_DEFS.copy, 'TOOL_ICON_DEFS must retain copy icon');
    assert.ok(TOOL_ICON_DEFS.check, 'TOOL_ICON_DEFS must retain check icon');

    const ids = new Set();
    const paths = new Set();

    for (const tool of ALL_TOOLS) {
      assert.ok(tool.id, `Tool must have an id: ${JSON.stringify(tool)}`);
      assert.ok(tool.name, `Tool ${tool.id} must have a name`);
      assert.ok(tool.path, `Tool ${tool.id} must have a path`);
      assert.ok(tool.icon, `Tool ${tool.id} must have an icon defined in registry`);

      // Verify icon exists in TOOL_SVG_MAP
      assert.ok(
        TOOL_SVG_MAP[tool.icon],
        `Tool ${tool.id} icon '${tool.icon}' must exist in TOOL_SVG_MAP dictionary`
      );

      // Verify uniqueness
      assert.ok(!ids.has(tool.id), `Duplicate tool id detected: ${tool.id}`);
      assert.ok(!paths.has(tool.path), `Duplicate tool path detected: ${tool.path}`);
      ids.add(tool.id);
      paths.add(tool.path);
    }

    assert.equal(ids.size, 49, 'Must have 49 unique tool IDs');
    assert.equal(paths.size, 49, 'Must have 49 unique tool paths');
  });

  // Requirement 2: No active tool card renders the old category badge
  await t.test('2. No active tool card renders the old category badge', () => {
    assert(
      !toolCardSrc.includes('tool-category-badge'),
      'ToolCard.jsx must not contain tool-category-badge'
    );
    assert(
      !toolCardSrc.includes('{category}'),
      'ToolCard.jsx must not render visible category string'
    );
    assert(
      appCssSrc.includes('.tool-category-badge') &&
      appCssSrc.includes('display: none !important'),
      'App.css must hide legacy tool-category-badge with display: none !important'
    );
  });

  // Requirement 3: No tool card renders the old arrow CTA
  await t.test('3. No tool card renders the old arrow CTA', () => {
    assert(
      !toolCardSrc.includes('tool-card-arrow'),
      'ToolCard.jsx must not render tool-card-arrow'
    );
    assert(
      !toolCardSrc.includes('→'),
      'ToolCard.jsx must not contain right arrow character'
    );
    assert(
      !toolCardSrc.includes('chevron'),
      'ToolCard.jsx must not render chevron decoration'
    );
    assert(
      !blogPageSrc.includes('Open Tool →'),
      'BlogArticlePage.jsx related tools must not contain arrow decoration'
    );
  });

  // Requirement 4: Tool card hrefs remain correct
  await t.test('4. Tool card hrefs and Link wrapper remain correct', () => {
    assert(
      toolCardSrc.includes('<Link to={path} className="tool-card"'),
      'ToolCard.jsx must wrap the card in <Link to={path} className="tool-card"'
    );
  });

  // Requirement 5: Tool names remain present
  await t.test('5. Tool names and descriptions remain present', () => {
    assert(
      toolCardSrc.includes('className="tool-card-title">{name}</h3>'),
      'ToolCard.jsx must render tool name in tool-card-title'
    );
    assert(
      toolCardSrc.includes('className="tool-card-description">{description}</p>'),
      'ToolCard.jsx must render tool description in tool-card-description'
    );
  });

  // Requirement 6: Decorative SVG icons use aria-hidden where appropriate
  await t.test('6. Decorative SVG icons use aria-hidden="true"', () => {
    assert(
      toolIconSrc.includes('aria-hidden="true"'),
      'ToolIcon.jsx SVGs must specify aria-hidden="true"'
    );
    assert(
      toolIconSrc.includes('focusable="false"'),
      'ToolIcon.jsx SVGs should specify focusable="false" for SVG accessibility'
    );
    assert(
      toolCardSrc.includes('aria-label={`Open ${name} tool`}'),
      'ToolCard.jsx must provide accessible aria-label on the card link'
    );
  });

  // Requirement 7: No deferred Phase 6 tool accidentally appears
  await t.test('7. No deferred Phase 6 tool accidentally appears', () => {
    assert.equal(PHASE_6_TOOLS.length, 4, 'PHASE_6_TOOLS must contain exactly 4 active tools');
    const phase6Ids = PHASE_6_TOOLS.map((t) => t.id);
    assert.deepEqual(
      phase6Ids,
      ['mp4-to-mp3', 'video-compressor', 'video-to-gif', 'gif-maker'],
      'Only 4 verified Phase 6 tools may be active; remaining 6 stay deferred'
    );
  });

  // Requirement 8: Image Cropper appears once (Phase 7.7)
  await t.test('8. Image Cropper appears exactly once with Phase 7.7', () => {
    const cropperTools = ALL_TOOLS.filter((t) => t.id === 'image-cropper');
    assert.equal(cropperTools.length, 1, 'image-cropper must appear exactly once');
    assert.equal(cropperTools[0].phase, 'Phase 7.7', 'image-cropper phase must be Phase 7.7');
    assert.equal(cropperTools[0].path, '/image-cropper', 'image-cropper path must be /image-cropper');
  });

  // Requirement 9: No duplicate tool registry entries
  await t.test('9. No duplicate tool registry entries across phases', () => {
    const sumPhaseCounts =
      PHASE_1_TOOLS.length +
      PHASE_2_TOOLS.length +
      PHASE_3_TOOLS.length +
      PHASE_4_TOOLS.length +
      PHASE_5_TOOLS.length +
      PHASE_6_TOOLS.length +
      PHASE_7_TOOLS.length;
    assert.equal(sumPhaseCounts, 49, 'Sum of all individual phase tools must equal 49');
    assert.equal(ALL_TOOLS.length, 49, 'ALL_TOOLS must equal 49');
  });

  // Requirement 10: CSS & Floating / elevated transition architecture
  await t.test('10. CSS card elevation, hover transitions, and reduced motion', () => {
    assert(
      appCssSrc.includes('transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;'),
      'App.css must define smooth 160ms transition on tool-card'
    );
    assert(
      appCssSrc.includes('transform: translateY(-3px);'),
      'App.css must apply subtle floating hover transform on tool-card'
    );
    assert(
      appCssSrc.includes('.tool-card-icon-wrap'),
      'App.css must style tool-card-icon-wrap'
    );
    assert(
      appCssSrc.includes('@media (prefers-reduced-motion: reduce)'),
      'App.css must respect prefers-reduced-motion'
    );
  });
});
