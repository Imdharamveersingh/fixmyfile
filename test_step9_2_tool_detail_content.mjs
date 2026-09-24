import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { TOOL_CONTENT, getToolContent, getRelatedTools } from './src/data/toolContent.js';

const ACTIVE_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Ready');
const DEFERRED_TOOLS = ALL_TOOLS.filter((t) => t.status === 'Deferred');
const DEFERRED_IDS = new Set(DEFERRED_TOOLS.map((t) => t.id));

test('=== STEP 9.2: UNIVERSAL TOOL DETAIL PAGE CONTENT ARCHITECTURE ===', async (t) => {

  await t.test('1. Content Dictionary: Exactly 49 active tools present with valid entries', () => {
    assert.strictEqual(ACTIVE_TOOLS.length, 49, 'Must have exactly 49 active tools');
    const contentKeys = Object.keys(TOOL_CONTENT);
    assert.strictEqual(contentKeys.length, 49, 'TOOL_CONTENT must have exactly 49 entries');

    for (const tool of ACTIVE_TOOLS) {
      assert(TOOL_CONTENT[tool.id], `Missing TOOL_CONTENT entry for active tool: ${tool.id}`);
      const entry = TOOL_CONTENT[tool.id];
      assert.strictEqual(entry.toolId, tool.id, `toolId must match for ${tool.id}`);
    }
  });

  await t.test('2. How-To Section: Valid title and 3-5 factual steps for each tool', () => {
    for (const tool of ACTIVE_TOOLS) {
      const entry = TOOL_CONTENT[tool.id];
      assert(entry.howTo, `Missing howTo for ${tool.id}`);
      assert(typeof entry.howTo.title === 'string' && entry.howTo.title.length > 5, `howTo.title missing for ${tool.id}`);
      assert(Array.isArray(entry.howTo.steps), `howTo.steps must be array for ${tool.id}`);
      assert(
        entry.howTo.steps.length >= 3 && entry.howTo.steps.length <= 5,
        `howTo.steps must have 3-5 steps for ${tool.id} (got ${entry.howTo.steps.length})`
      );

      entry.howTo.steps.forEach((step, idx) => {
        assert(step.title && step.title.trim().length > 0, `Step ${idx + 1} title missing for ${tool.id}`);
        assert(step.description && step.description.trim().length > 10, `Step ${idx + 1} description missing for ${tool.id}`);
      });
    }
  });

  await t.test('3. FAQ Section: 3-5 genuine, tool-specific Q&A pairs for each tool', () => {
    for (const tool of ACTIVE_TOOLS) {
      const entry = TOOL_CONTENT[tool.id];
      assert(Array.isArray(entry.faqs), `faqs must be array for ${tool.id}`);
      assert(
        entry.faqs.length >= 3 && entry.faqs.length <= 5,
        `faqs must have 3-5 items for ${tool.id} (got ${entry.faqs.length})`
      );

      entry.faqs.forEach((faq, idx) => {
        assert(faq.question && faq.question.endsWith('?'), `FAQ ${idx + 1} question must end with ? for ${tool.id}`);
        assert(faq.answer && faq.answer.length > 15, `FAQ ${idx + 1} answer missing for ${tool.id}`);
      });
    }
  });

  await t.test('4. Related Tools Validation: Exactly 4 valid active tools, zero self, zero deferred, zero dups', () => {
    const activeIds = new Set(ACTIVE_TOOLS.map((t) => t.id));

    for (const tool of ACTIVE_TOOLS) {
      const entry = TOOL_CONTENT[tool.id];
      assert(Array.isArray(entry.relatedTools), `relatedTools must be array for ${tool.id}`);
      assert.strictEqual(
        entry.relatedTools.length,
        4,
        `relatedTools must have exactly 4 items for ${tool.id} (got ${entry.relatedTools.length})`
      );

      const seen = new Set();
      for (const relId of entry.relatedTools) {
        assert(activeIds.has(relId), `related tool "${relId}" in ${tool.id} is not an active tool ID`);
        assert(!DEFERRED_IDS.has(relId), `related tool "${relId}" in ${tool.id} is a deferred tool`);
        assert.notStrictEqual(relId, tool.id, `Tool "${tool.id}" cannot link to itself as related`);
        assert(!seen.has(relId), `Duplicate related tool "${relId}" in ${tool.id}`);
        seen.add(relId);
      }
    }
  });

  await t.test('5. Reusable Component Files Exist and Export Properly', () => {
    const components = [
      'src/components/ToolHowTo.jsx',
      'src/components/ToolFAQ.jsx',
      'src/components/RelatedTools.jsx',
      'src/components/ToolDetailContent.jsx'
    ];

    for (const comp of components) {
      assert(fs.existsSync(path.resolve(comp)), `Missing component file: ${comp}`);
      const code = fs.readFileSync(path.resolve(comp), 'utf8');
      assert(code.includes('export default function'), `${comp} must have export default function`);
    }
  });

  await t.test('6. Tool Detail Components Implementation Rules', () => {
    // ToolHowTo: attached number structure
    const howToCode = fs.readFileSync(path.resolve('src/components/ToolHowTo.jsx'), 'utf8');
    assert(howToCode.includes('tool-howto-number'), 'ToolHowTo must include tool-howto-number class for attached numbering');
    assert(howToCode.includes('tool-howto-header'), 'ToolHowTo must have tool-howto-header combining number and title');

    // ToolFAQ: accessible disclosure / accordion
    const faqCode = fs.readFileSync(path.resolve('src/components/ToolFAQ.jsx'), 'utf8');
    assert(faqCode.includes('aria-expanded'), 'ToolFAQ must use aria-expanded on toggle button');
    assert(faqCode.includes('aria-controls'), 'ToolFAQ must use aria-controls on toggle button');
    assert(faqCode.includes('role="region"'), 'ToolFAQ answer panel must have role="region" or accessible wrapper');

    // RelatedTools: strictly reuses ToolCard V2
    const relatedCode = fs.readFileSync(path.resolve('src/components/RelatedTools.jsx'), 'utf8');
    assert(relatedCode.includes("import ToolCard from './ToolCard'"), 'RelatedTools must import and reuse ToolCard V2');
    assert(relatedCode.includes('<ToolCard'), 'RelatedTools must render ToolCard component');
  });

  await t.test('7. All 49 Tool Pages Import and Render ToolDetailContent', () => {
    for (const tool of ACTIVE_TOOLS) {
      const filePath = path.resolve(`src/tools/${tool.id}/index.jsx`);
      assert(fs.existsSync(filePath), `Tool file missing: ${filePath}`);
      const code = fs.readFileSync(filePath, 'utf8');

      assert(
        code.includes('ToolDetailContent'),
        `Tool ${tool.id} does not import or mention ToolDetailContent`
      );
      assert(
        code.includes(`<ToolDetailContent toolId="${tool.id}"`),
        `Tool ${tool.id} does not render <ToolDetailContent toolId="${tool.id}" />`
      );
    }
  });

  await t.test('8. Regression Protections: 49 active tools, 6 deferred, Image Cropper 7.7', () => {
    assert.strictEqual(ACTIVE_TOOLS.length, 49, 'Active tools count must be exactly 49');
    
    // 6 Phase 6 tools remain deferred (55 total strategy - 49 active)
    const DEFERRED_PHASE_6_IDS = [
      'audio-converter',
      'video-to-mp4',
      'audio-cutter',
      'audio-joiner',
      'screen-recorder',
      'voice-recorder'
    ];
    for (const deferredId of DEFERRED_PHASE_6_IDS) {
      assert(!TOOL_CONTENT[deferredId], `Deferred tool ${deferredId} must not be in TOOL_CONTENT`);
      for (const toolId of Object.keys(TOOL_CONTENT)) {
        assert(
          !TOOL_CONTENT[toolId].relatedTools.includes(deferredId),
          `Tool ${toolId} must not recommend deferred tool ${deferredId}`
        );
      }
    }

    const cropper = ALL_TOOLS.find((t) => t.id === 'image-cropper');
    assert(cropper, 'Image Cropper must exist');
    assert.strictEqual(cropper.phase, 'Phase 7.7', 'Image Cropper must remain Phase 7.7');
    assert.strictEqual(cropper.status, 'Ready', 'Image Cropper must remain Ready');
  });
});
