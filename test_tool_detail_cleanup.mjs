import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';

const ACTIVE_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Ready');
const appCss = fs.readFileSync(path.resolve('src/App.css'), 'utf8');
const headerCode = fs.readFileSync(path.resolve('src/components/ToolDetailHeader.jsx'), 'utf8');

const GENERATOR_TOOL_IDS = [
  'qr-code-generator',
  'barcode-generator',
  'password-generator',
  'currency-converter',
  'percentage-calculator',
  'emi-calculator',
  'word-counter'
];

test('=== FIXMYFILE: TOOL DETAIL CLEANUP REGRESSION SUITE ===', async (t) => {
  // A. Tool Count: exactly 49 active tools
  await t.test('F. Exactly 49 active tools preserved', () => {
    assert.strictEqual(ACTIVE_TOOLS.length, 49, 'Active tools count must be exactly 49');
    const pdfToolIds = new Set([
      'jpg-to-pdf', 'pdf-to-word', 'pdf-to-jpg', 'word-to-pdf', 'merge-pdf',
      'compress-pdf', 'split-pdf', 'pdf-to-excel', 'pdf-to-powerpoint', 'rotate-pdf',
      'protect-pdf', 'unlock-pdf', 'pdf-to-text', 'extract-pdf-pages', 'delete-pdf-pages',
      'reorder-pdf-pages', 'pdf-ocr', 'extract-text-from-pdf'
    ]);
    const imageToolIds = new Set([
      'background-remover', 'image-compressor', 'image-resizer', 'image-converter',
      'jpg-to-png', 'png-to-jpg', 'heic-to-jpg', 'webp-to-jpg', 'jpg-to-webp',
      'webp-to-png', 'image-rotate-flip', 'image-watermark', 'image-to-pdf',
      'image-upscaler', 'image-to-base64', 'image-cropper', 'image-to-text',
      'jpg-to-text', 'png-to-text', 'screenshot-to-text'
    ]);
    const mediaToolIds = new Set([
      'mp4-to-mp3', 'video-compressor', 'video-to-gif', 'gif-maker'
    ]);
    const generatorToolIds = new Set(GENERATOR_TOOL_IDS);

    const pdfTools = ACTIVE_TOOLS.filter(t => pdfToolIds.has(t.id));
    const imageTools = ACTIVE_TOOLS.filter(t => imageToolIds.has(t.id));
    const mediaTools = ACTIVE_TOOLS.filter(t => mediaToolIds.has(t.id));
    const generatorTools = ACTIVE_TOOLS.filter(t => generatorToolIds.has(t.id));

    assert.strictEqual(pdfTools.length, 18, 'Exactly 18 PDF tools');
    assert.strictEqual(imageTools.length, 20, 'Exactly 20 Image tools');
    assert.strictEqual(mediaTools.length, 4, 'Exactly 4 Media tools');
    assert.strictEqual(generatorTools.length, 7, 'Exactly 7 Generator tools');
  });

  // B. Header metadata pills removed from visible layer across all 49 tools
  await t.test('A. Header metadata pills: 0 visible pill groups across all 49 tools', () => {
    // 1. Underlying metadata functions preserved for SEO / analytics / logic
    assert(headerCode.includes('getToolCapabilityBadges'), 'Underlying getToolCapabilityBadges is preserved');
    assert(headerCode.includes('tool-capability-pills'), 'ToolDetailHeader structure preserved');

    // 2. Visible presentation layer hidden in App.css
    assert(
      appCss.includes('.tool-capability-pills {\n  display: none !important;') ||
      appCss.includes('.tool-capability-pills { display: none !important; }') ||
      appCss.includes('.tool-capability-pills {\r\n  display: none !important;'),
      '.tool-capability-pills hidden via display: none !important'
    );
    assert(
      appCss.includes('.tool-capability-pill {\n  display: none !important;') ||
      appCss.includes('.tool-capability-pill { display: none !important; }') ||
      appCss.includes('.tool-capability-pill {\r\n  display: none !important;'),
      '.tool-capability-pill hidden via display: none !important'
    );

    // 3. Header ToolIcon beside H1 preserved
    assert(headerCode.includes('tool-header-icon-wrap'), 'ToolDetailHeader maintains icon wrapper beside H1');
    assert(headerCode.includes('ToolIcon'), 'ToolDetailHeader maintains ToolIcon beside H1');
  });

  // C. Workspace metadata pills removed across all 49 tools
  await t.test('B. Workspace metadata pills: 0 visible decorative metadata pill groups', () => {
    // 1. CSS rules hide dropzone-badge-list and dropzone-badge
    assert(appCss.includes('.dropzone-badge-list') && appCss.includes('display: none !important;'), 'dropzone-badge-list hidden');
    assert(appCss.includes('.dropzone-badge') && appCss.includes('display: none !important;'), 'dropzone-badge hidden');

    // 2. The 5 tools with dropzone-tags do NOT contain decorative 100% Private tag
    const tagTools = ['delete-pdf-pages', 'extract-pdf-pages', 'pdf-to-text', 'reorder-pdf-pages', 'unlock-pdf'];
    for (const toolId of tagTools) {
      const toolFile = path.resolve(`src/tools/${toolId}/index.jsx`);
      const content = fs.readFileSync(toolFile, 'utf8');
      assert(!content.includes('100% Private (Client-Side)'), `${toolId} must not contain decorative 100% Private tag`);
      assert(!content.includes('100% Private (No upload)'), `${toolId} must not contain decorative 100% Private tag`);
      assert(content.includes('Max file size:'), `${toolId} must preserve functional file size limit`);
    }
  });

  // D. Generator workspace icon removed
  await t.test('C. Generator workspace icon: 7/7 Generator tools decorative workspace icon absent', () => {
    assert(appCss.includes('.workspace-tool-icon-wrap') && appCss.includes('display: none !important;'), 'workspace-tool-icon-wrap hidden in CSS');

    for (const genId of GENERATOR_TOOL_IDS) {
      const toolFile = path.resolve(`src/tools/${genId}/index.jsx`);
      const content = fs.readFileSync(toolFile, 'utf8');
      assert(!content.includes('workspace-tool-icon-wrap'), `${genId} must not contain workspace-tool-icon-wrap in JSX`);
    }
  });

  // E. Non-generator workspace icon preserved
  await t.test('D. Non-generator workspace icon: PDF, Image, Media workspace icons preserved', () => {
    // Check representative tools
    const nonGenTools = [
      'compress-pdf',
      'pdf-to-powerpoint',
      'image-to-pdf',
      'image-compressor',
      'video-compressor',
      'merge-pdf',
      'mp4-to-mp3'
    ];

    for (const id of nonGenTools) {
      const toolFile = path.resolve(`src/tools/${id}/index.jsx`);
      const content = fs.readFileSync(toolFile, 'utf8');
      const hasWorkspaceIcon =
        content.includes('dropzone-icon') ||
        content.includes('dropzone-icon-wrapper') ||
        content.includes('upload-icon-wrap');
      assert.ok(hasWorkspaceIcon, `${id} must preserve its workspace icon container`);
      assert(content.includes(`icon="${id}"`), `${id} must render ToolIcon with its tool ID`);
    }

    // Verify App.css preserves dropzone-icon styling
    assert(appCss.includes('.dropzone-icon'), 'App.css preserves .dropzone-icon');
    assert(appCss.includes('.dropzone-icon-wrapper'), 'App.css preserves .dropzone-icon-wrapper');
    assert(appCss.includes('.upload-icon-wrap'), 'App.css preserves .upload-icon-wrap');
  });

  // F. Compact Description Typography & Spacing
  await t.test('E. Compact description typography and spacing in App.css', () => {
    assert(appCss.includes('.tool-detail-description'), 'tool-detail-description styled');
    assert(appCss.includes('font-size: 1rem'), 'tool-detail-description font-size compact (16px)');
    assert(appCss.includes('line-height: 1.5'), 'tool-detail-description line-height compact (1.5)');
    assert(appCss.includes('margin: 0 0 12px 0'), 'tool-detail-description margin-bottom compact (12px)');
    assert(appCss.includes('max-width: 820px'), 'tool-detail-description max-width constrained');
    assert(appCss.includes('margin-bottom: 20px'), 'tool-detail-header margin-bottom compact (20px)');
  });

  // G. ToolIcon architecture preserved
  await t.test('G. ToolIcon architecture: shared mapping remains intact with 49 active tool SVGs', () => {
    assert.strictEqual(Object.keys(TOOL_SVG_MAP).length, 49, 'TOOL_SVG_MAP must have exactly 49 SVG mappings');
    for (const tool of ACTIVE_TOOLS) {
      assert.ok(TOOL_SVG_MAP[tool.id], `TOOL_SVG_MAP must contain entry for ${tool.id}`);
      assert.ok(typeof TOOL_SVG_MAP[tool.id] === 'string' && TOOL_SVG_MAP[tool.id].length > 0, `TOOL_SVG_MAP[${tool.id}] must be a valid path/href`);
    }
  });
});
