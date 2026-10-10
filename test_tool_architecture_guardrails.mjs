import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { ALL_TOOLS } from './src/tools/toolsRegistry.js';
import { TOOL_SVG_MAP } from './src/components/toolSvgMap.js';
import { TOOL_ACCENT_MAP } from './src/components/toolAccentMap.js';
import { HOMEPAGE_CATEGORIES } from './src/data/homepageCategories.js';
import { CATEGORY_SVG_MAP } from './src/components/categorySvgMap.js';
import { TOOL_CONTENT } from './src/data/toolContent.js';
import { SITE_URL, formatToolTitle, formatToolDescription, getPageSEO } from './src/config/seoConfig.js';

import {
  validateRegistryAndRoutes,
  validateLazyLoading,
  validateSvgMappings,
  validateAccentMappings,
  validateHomepageCategories,
  validateToolContent,
  validateRelatedTools,
  validateSeoConsistency,
  validateSitemapConsistency,
  validateAllToolArchitecture
} from './scripts/validate_tool_architecture.mjs';

test('=== PHASE 10: FUTURE TOOL ARCHITECTURE GUARDRAILS TEST SUITE ===', async (t) => {

  // =========================================================================
  // SUITE 1: PRODUCTION ARCHITECTURE VERIFICATION (ALL 49 ACTIVE TOOLS)
  // =========================================================================
  await t.test('1. Production Architecture Guardrails (Live Repository State)', async (prodSuite) => {

    await prodSuite.test('1.1 Registry & Route Parity: Exactly 49 active tools match App.jsx routes', () => {
      const res = validateRegistryAndRoutes();
      assert.equal(res.valid, true, `Registry & Routes check must pass. Errors: ${res.errors.join('; ')}`);
      assert.equal(ALL_TOOLS.length, 49, 'Expected exactly 49 active tools in toolsRegistry.');
    });

    await prodSuite.test('1.2 Route-Level Code Splitting: 100% of tool components use React.lazy()', () => {
      const res = validateLazyLoading();
      assert.equal(res.valid, true, `Lazy loading check must pass. Errors: ${res.errors.join('; ')}`);
    });

    await prodSuite.test('1.3 SVG Mappings Parity: All 49 active tools map to existing, valid SVGs', () => {
      const res = validateSvgMappings();
      assert.equal(res.valid, true, `SVG mappings check must pass. Errors: ${res.errors.join('; ')}`);
      assert.equal(Object.keys(TOOL_SVG_MAP).length, 49, 'Expected exactly 49 SVG mappings.');
    });

    await prodSuite.test('1.4 Accent Color Mappings: All 49 active tools have valid hex/rgba tokens', () => {
      const res = validateAccentMappings();
      assert.equal(res.valid, true, `Accent mappings check must pass. Errors: ${res.errors.join('; ')}`);
      assert.equal(Object.keys(TOOL_ACCENT_MAP).length, 49, 'Expected exactly 49 accent mappings.');
    });

    await prodSuite.test('1.5 Homepage Categories: All 49 active tools assigned to exactly 1 category', () => {
      const res = validateHomepageCategories();
      assert.equal(res.valid, true, `Homepage categories check must pass. Errors: ${res.errors.join('; ')}`);
      assert.equal(HOMEPAGE_CATEGORIES.length, 4, 'Expected exactly 4 homepage categories.');
    });

    await prodSuite.test('1.6 Tool Educational Content: All 49 active tools have howTo, faqs, privacy', () => {
      const res = validateToolContent();
      assert.equal(res.valid, true, `Tool content check must pass. Errors: ${res.errors.join('; ')}`);
      assert.equal(Object.keys(TOOL_CONTENT).length, 49, 'Expected exactly 49 tool content entries.');
    });

    await prodSuite.test('1.7 Related Tools Integrity: All 49 active tools have 3-4 valid active cross-links', () => {
      const res = validateRelatedTools();
      assert.equal(res.valid, true, `Related tools check must pass. Errors: ${res.errors.join('; ')}`);
    });

    await prodSuite.test('1.8 Production SEO Consistency: All 49 active tools produce valid metadata', () => {
      const res = validateSeoConsistency();
      assert.equal(res.valid, true, `SEO consistency check must pass. Errors: ${res.errors.join('; ')}`);
    });

    await prodSuite.test('1.9 Sitemap Integrity: All 49 active tools are included in public/sitemap.xml', () => {
      const res = validateSitemapConsistency();
      assert.equal(res.valid, true, `Sitemap consistency check must pass. Errors: ${res.errors.join('; ')}`);
    });

    await prodSuite.test('1.10 Master Architecture Validator: Full suite execution passes with 0 errors', () => {
      const report = validateAllToolArchitecture();
      assert.equal(report.valid, true, `Master architecture validator must pass. Found ${report.errors.length} errors.`);
      assert.equal(report.errors.length, 0, 'Report must contain zero errors.');
      assert.equal(report.toolCount, 49, 'Report must confirm 49 tools evaluated.');
    });
  });

  // =========================================================================
  // SUITE 2: NEGATIVE FAILURE-CASE TESTING (MOCK / TEMPORARY FIXTURES)
  // Ensures guardrails properly flag any future architecture deviations.
  // =========================================================================
  await t.test('2. Negative Failure-Case Verification (Temporary Mock Fixtures)', async (negSuite) => {

    await negSuite.test('2.1 Catches missing route in App.jsx', () => {
      const mockTools = [
        ...ALL_TOOLS,
        { id: 'future-demo-tool', name: 'Future Demo Tool', path: '/future-demo-tool', category: 'PDF Tools', status: 'Ready' }
      ];
      // Mock App.jsx without future-demo-tool route
      const mockAppJsx = fs.readFileSync('src/App.jsx', 'utf8');
      const res = validateRegistryAndRoutes({ tools: mockTools, appJsxContent: mockAppJsx });
      assert.equal(res.valid, false, 'Must flag missing route.');
      assert.ok(
        res.errors.some((err) => err.includes('future-demo-tool')),
        'Error message must mention the unrouted tool ID.'
      );
    });

    await negSuite.test('2.2 Catches illegal synchronous tool import in App.jsx', () => {
      const mockAppJsx = `
        import React from 'react';
        import SyncTool from './tools/sync-tool';
        export default function App() {}
      `;
      const res = validateLazyLoading({ tools: ALL_TOOLS, appJsxContent: mockAppJsx });
      assert.equal(res.valid, false, 'Must flag synchronous tool import.');
      assert.ok(
        res.errors.some((err) => err.includes('Illegal synchronous tool import')),
        'Error message must cite illegal synchronous tool import.'
      );
    });

    await negSuite.test('2.3 Catches un-lazy route component in App.jsx', () => {
      const mockAppJsx = `
        import React from 'react';
        const JpgToPdfTool = () => null; // not lazy()!
        export default function App() {
          return <Route path="jpg-to-pdf" element={<JpgToPdfTool />} />;
        }
      `;
      const res = validateLazyLoading({
        tools: [{ id: 'jpg-to-pdf', path: '/jpg-to-pdf' }],
        appJsxContent: mockAppJsx
      });
      assert.equal(res.valid, false, 'Must flag component not wrapped in lazy().');
      assert.ok(
        res.errors.some((err) => err.includes('not wrapped in React.lazy()')),
        'Error must state component is not wrapped in React.lazy().'
      );
    });

    await negSuite.test('2.4 Catches missing SVG mapping in toolSvgMap.js', () => {
      const mockSvgMap = { ...TOOL_SVG_MAP };
      delete mockSvgMap['jpg-to-pdf'];
      const res = validateSvgMappings({ tools: ALL_TOOLS, toolSvgMap: mockSvgMap });
      assert.equal(res.valid, false, 'Must flag missing SVG mapping.');
      assert.ok(
        res.errors.some((err) => err.includes('jpg-to-pdf') && err.includes('missing from TOOL_SVG_MAP')),
        'Error message must identify the missing tool SVG mapping.'
      );
    });

    await negSuite.test('2.5 Catches malformed accent color tokens', () => {
      const mockAccentMap = {
        ...TOOL_ACCENT_MAP,
        'jpg-to-pdf': { primary: 'not-a-hex', border: 'rgba(0,0,0,0.3)', hoverBorder: 'rgba(0,0,0,0.6)' }
      };
      const res = validateAccentMappings({ tools: ALL_TOOLS, toolAccentMap: mockAccentMap });
      assert.equal(res.valid, false, 'Must flag malformed primary color.');
      assert.ok(
        res.errors.some((err) => err.includes('jpg-to-pdf') && err.includes('invalid primary accent color')),
        'Error must flag invalid primary hex color.'
      );

      const mockBorderMap = {
        ...TOOL_ACCENT_MAP,
        'jpg-to-pdf': { primary: '#3B82F6', border: 'invalid-border', hoverBorder: 'rgba(0,0,0,0.6)' }
      };
      const borderRes = validateAccentMappings({ tools: ALL_TOOLS, toolAccentMap: mockBorderMap });
      assert.equal(borderRes.valid, false, 'Must flag malformed border color.');
      assert.ok(
        borderRes.errors.some((err) => err.includes('jpg-to-pdf') && err.includes('invalid border color')),
        'Error must flag invalid border rgba.'
      );
    });

    await negSuite.test('2.6 Catches orphaned and duplicated homepage category assignments', () => {
      // 1. Orphaned tool
      const mockCatsWithOrphan = HOMEPAGE_CATEGORIES.map((cat) => ({
        ...cat,
        toolIds: cat.toolIds.filter((id) => id !== 'jpg-to-pdf')
      }));
      const orphanRes = validateHomepageCategories({ tools: ALL_TOOLS, homepageCategories: mockCatsWithOrphan });
      assert.equal(orphanRes.valid, false, 'Must flag orphaned tool.');
      assert.ok(
        orphanRes.errors.some((err) => err.includes('jpg-to-pdf') && err.includes('orphaned')),
        'Error must cite orphaned tool.'
      );

      // 2. Duplicate tool across categories
      const mockCatsWithDupe = HOMEPAGE_CATEGORIES.map((cat, idx) => {
        if (idx === 1) return { ...cat, toolIds: [...cat.toolIds, 'jpg-to-pdf'] };
        return cat;
      });
      const dupeRes = validateHomepageCategories({ tools: ALL_TOOLS, homepageCategories: mockCatsWithDupe });
      assert.equal(dupeRes.valid, false, 'Must flag duplicate category tool.');
      assert.ok(
        dupeRes.errors.some((err) => err.includes('jpg-to-pdf') && err.includes('multiple')),
        'Error must cite duplicate category assignment.'
      );

      // 3. Phantom tool in category
      const mockCatsWithPhantom = HOMEPAGE_CATEGORIES.map((cat, idx) => {
        if (idx === 0) return { ...cat, toolIds: [...cat.toolIds, 'phantom-nonexistent-tool'] };
        return cat;
      });
      const phantomRes = validateHomepageCategories({ tools: ALL_TOOLS, homepageCategories: mockCatsWithPhantom });
      assert.equal(phantomRes.valid, false, 'Must flag phantom tool.');
      assert.ok(
        phantomRes.errors.some((err) => err.includes('phantom-nonexistent-tool')),
        'Error must cite phantom tool ID.'
      );
    });

    await negSuite.test('2.7 Catches missing or incomplete tool content', () => {
      // Missing entry
      const mockContent = { ...TOOL_CONTENT };
      delete mockContent['jpg-to-pdf'];
      const missingRes = validateToolContent({ tools: ALL_TOOLS, toolContent: mockContent });
      assert.equal(missingRes.valid, false, 'Must flag missing tool content.');
      assert.ok(
        missingRes.errors.some((err) => err.includes('jpg-to-pdf') && err.includes('missing from TOOL_CONTENT')),
        'Error must cite missing TOOL_CONTENT.'
      );

      // Insufficient steps
      const mockContentShortSteps = {
        ...TOOL_CONTENT,
        'jpg-to-pdf': {
          ...TOOL_CONTENT['jpg-to-pdf'],
          howTo: { title: 'How to do it', steps: [{ title: 'One', description: 'Just one step' }] }
        }
      };
      const shortStepsRes = validateToolContent({ tools: ALL_TOOLS, toolContent: mockContentShortSteps });
      assert.equal(shortStepsRes.valid, false, 'Must flag insufficient howTo steps.');
      assert.ok(
        shortStepsRes.errors.some((err) => err.includes('must contain 3 to 5 steps')),
        'Error must cite step count constraint.'
      );

      // FAQ not ending in ?
      const mockContentBadFaq = {
        ...TOOL_CONTENT,
        'jpg-to-pdf': {
          ...TOOL_CONTENT['jpg-to-pdf'],
          faqs: [
            { question: 'What is this without question mark', answer: 'Valid answer here with more than 15 chars.' },
            { question: 'Valid FAQ 2?', answer: 'Valid answer 2 here with more than 15 chars.' },
            { question: 'Valid FAQ 3?', answer: 'Valid answer 3 here with more than 15 chars.' }
          ]
        }
      };
      const badFaqRes = validateToolContent({ tools: ALL_TOOLS, toolContent: mockContentBadFaq });
      assert.equal(badFaqRes.valid, false, 'Must flag FAQ without question mark.');
      assert.ok(
        badFaqRes.errors.some((err) => err.includes('must end with a question mark')),
        'Error must cite question mark requirement.'
      );
    });

    await negSuite.test('2.8 Catches invalid related-tool references', () => {
      // 1. Reference to nonexistent tool
      const mockContentBadRef = {
        ...TOOL_CONTENT,
        'jpg-to-pdf': {
          ...TOOL_CONTENT['jpg-to-pdf'],
          relatedTools: ['nonexistent-tool-id', 'png-to-jpg', 'image-to-pdf', 'pdf-to-jpg']
        }
      };
      const badRefRes = validateRelatedTools({ tools: ALL_TOOLS, toolContent: mockContentBadRef });
      assert.equal(badRefRes.valid, false, 'Must flag invalid related tool.');
      assert.ok(
        badRefRes.errors.some((err) => err.includes('nonexistent-tool-id')),
        'Error must cite invalid related tool ID.'
      );

      // 2. Self reference
      const mockContentSelfRef = {
        ...TOOL_CONTENT,
        'jpg-to-pdf': {
          ...TOOL_CONTENT['jpg-to-pdf'],
          relatedTools: ['jpg-to-pdf', 'png-to-jpg', 'image-to-pdf', 'pdf-to-jpg']
        }
      };
      const selfRefRes = validateRelatedTools({ tools: ALL_TOOLS, toolContent: mockContentSelfRef });
      assert.equal(selfRefRes.valid, false, 'Must flag self reference.');
      assert.ok(
        selfRefRes.errors.some((err) => err.includes('cannot reference itself')),
        'Error must cite self reference.'
      );

      // 3. Duplicate related tools
      const mockContentDupeRef = {
        ...TOOL_CONTENT,
        'jpg-to-pdf': {
          ...TOOL_CONTENT['jpg-to-pdf'],
          relatedTools: ['png-to-jpg', 'png-to-jpg', 'image-to-pdf', 'pdf-to-jpg']
        }
      };
      const dupeRefRes = validateRelatedTools({ tools: ALL_TOOLS, toolContent: mockContentDupeRef });
      assert.equal(dupeRefRes.valid, false, 'Must flag duplicate related tool.');
      assert.ok(
        dupeRefRes.errors.some((err) => err.includes('duplicate relatedTool reference')),
        'Error must cite duplicate reference.'
      );
    });

    await negSuite.test('2.9 Catches SEO formatting and canonical violations', () => {
      const mockTools = [{ id: 'jpg-to-pdf', name: 'JPG to PDF', path: '/jpg-to-pdf', description: 'Valid description.' }];
      // Bad title formatter
      const badTitleRes = validateSeoConsistency({
        tools: mockTools,
        formatToolTitleFn: () => 'Invalid Title Missing Branding'
      });
      assert.equal(badTitleRes.valid, false, 'Must flag title missing branding.');
      assert.ok(badTitleRes.errors.some((err) => err.includes('formatToolTitle')));

      // Description too short
      const shortDescRes = validateSeoConsistency({
        tools: mockTools,
        formatToolDescriptionFn: () => 'Too short.'
      });
      assert.equal(shortDescRes.valid, false, 'Must flag short description.');
      assert.ok(shortDescRes.errors.some((err) => err.includes('formatToolDescription length')));

      // Mismatched canonical
      const badCanonicalRes = validateSeoConsistency({
        tools: mockTools,
        getPageSEOFn: () => ({ canonical: 'https://wrong-domain.com/jpg-to-pdf', robots: 'index, follow', ogType: 'website', tool: mockTools[0] })
      });
      assert.equal(badCanonicalRes.valid, false, 'Must flag canonical URL mismatch.');
      assert.ok(badCanonicalRes.errors.some((err) => err.includes('canonical mismatch')));
    });

    await negSuite.test('2.10 Catches tool omitted from sitemap XML', () => {
      const mockSitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset><url><loc>${SITE_URL}/</loc></url></urlset>`;
      const res = validateSitemapConsistency({
        tools: ALL_TOOLS,
        sitemapXmlContent: mockSitemap
      });
      assert.equal(res.valid, false, 'Must flag missing tool URLs in sitemap.');
      assert.ok(
        res.errors.some((err) => err.includes('Sitemap is missing URL')),
        'Error must cite missing sitemap URLs.'
      );
    });
  });
});
