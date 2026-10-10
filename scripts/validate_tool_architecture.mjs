/**
 * FixMyFile Future Tool Architecture Validator & Guardrails
 *
 * Enforces strict architectural consistency across all 9 critical layers:
 * 1. Registry & Routes Parity (toolsRegistry.js ↔ App.jsx)
 * 2. Route-Level Code Splitting (React.lazy dynamic loading enforcement)
 * 3. SVG Mappings (toolSvgMap.js ↔ physical SVG files)
 * 4. Deterministic Accent Colors (toolAccentMap.js)
 * 5. Homepage Category Assignment (homepageCategories.js & categorySvgMap.js)
 * 6. Educational & Documentation Content (toolContent.js: howTo, FAQs, privacy)
 * 7. Intent-based Related Tools (zero broken links, zero self-references)
 * 8. Production SEO Consistency (seoConfig.js title, description, canonical, robots)
 * 9. Production Sitemap Generation (sitemap.xml dynamic inclusion)
 *
 * Can be run standalone: `node scripts/validate_tool_architecture.mjs`
 * Or imported programmatically in test suites.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';
import { TOOL_SVG_MAP } from '../src/components/toolSvgMap.js';
import { TOOL_ACCENT_MAP } from '../src/components/toolAccentMap.js';
import { HOMEPAGE_CATEGORIES } from '../src/data/homepageCategories.js';
import { CATEGORY_SVG_MAP } from '../src/components/categorySvgMap.js';
import { TOOL_CONTENT } from '../src/data/toolContent.js';
import {
  SITE_URL,
  formatToolTitle,
  formatToolDescription,
  getPageSEO
} from '../src/config/seoConfig.js';

const KEBAB_CASE_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const RGBA_COLOR_REGEX = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(\.\d+)?|1(\.0+)?)\s*\)$/;

const KNOWN_NON_TOOL_ROUTES = new Set([
  '/',
  'why-fixmyfile',
  'contact',
  'privacy',
  'terms',
  'blog',
  'blog/:slug',
  '*'
]);

/**
 * Strips comments from JavaScript/JSX code.
 */
function stripComments(code) {
  return code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
}

/**
 * 1. Validate Registry and Routes Parity
 */
export function validateRegistryAndRoutes({
  tools = ALL_TOOLS,
  appJsxContent = null,
  toolsDirPath = 'src/tools',
  fsModule = fs
} = {}) {
  const errors = [];
  const appJsx = appJsxContent ?? fsModule.readFileSync('src/App.jsx', 'utf8');

  if (!Array.isArray(tools) || tools.length === 0) {
    errors.push('Tools registry must be a non-empty array.');
    return { valid: false, errors };
  }

  // Parse routes from App.jsx
  const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([A-Za-z0-9_]+)/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(appJsx)) !== null) {
    routes.push({ path: match[1], component: match[2] });
  }

  const registeredIds = new Set();

  for (const tool of tools) {
    // Check ID
    if (!tool.id || !KEBAB_CASE_REGEX.test(tool.id)) {
      errors.push(`Tool ID "${tool.id}" is invalid. Must be non-empty kebab-case.`);
    }
    if (registeredIds.has(tool.id)) {
      errors.push(`Duplicate tool ID detected: "${tool.id}".`);
    }
    registeredIds.add(tool.id);

    // Check Path
    const expectedPath = `/${tool.id}`;
    if (tool.path !== expectedPath) {
      errors.push(`Tool "${tool.id}" path must be "${expectedPath}", got "${tool.path}".`);
    }

    // Check directory on disk
    const toolFolder = path.join(toolsDirPath, tool.id);
    const entryFile = path.join(toolFolder, 'index.jsx');
    if (fsModule.existsSync && !fsModule.existsSync(entryFile)) {
      errors.push(`Missing tool entrypoint for "${tool.id}" at "${entryFile}".`);
    }

    // Check Route in App.jsx
    const cleanPath = tool.path.replace(/^\//, '');
    const matchedRoute = routes.find((r) => r.path === cleanPath);
    if (!matchedRoute) {
      errors.push(`No matching <Route path="${cleanPath}" ...> found in App.jsx for tool "${tool.id}".`);
    }
  }

  // Check for orphan tool routes in App.jsx
  for (const route of routes) {
    if (!KNOWN_NON_TOOL_ROUTES.has(route.path) && !registeredIds.has(route.path)) {
      errors.push(`Orphan route detected in App.jsx: "${route.path}" is not in toolsRegistry.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 2. Validate Route-Level Code Splitting (React.lazy dynamic loading)
 */
export function validateLazyLoading({
  tools = ALL_TOOLS,
  appJsxContent = null,
  fsModule = fs
} = {}) {
  const errors = [];
  const appJsx = appJsxContent ?? fsModule.readFileSync('src/App.jsx', 'utf8');
  const codeWithoutComments = stripComments(appJsx);

  // Check synchronous imports from ./tools/
  const syncImportRegex = /import\s+([A-Za-z0-9_{},\s*]+)\s+from\s+['"]\.\/tools\/([^'"]+)['"]/g;
  let syncMatch;
  while ((syncMatch = syncImportRegex.exec(codeWithoutComments)) !== null) {
    errors.push(`Illegal synchronous tool import detected in App.jsx: "${syncMatch[0]}". All tools must be lazy-loaded.`);
  }

  // Parse lazy declarations: const Component = lazy(() => import('./tools/...'))
  const lazyRegex = /const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)\)/g;
  const lazyImports = new Map();
  let lazyMatch;
  while ((lazyMatch = lazyRegex.exec(appJsx)) !== null) {
    lazyImports.set(lazyMatch[1], lazyMatch[2]);
  }

  // Parse routes
  const routeRegex = /<Route\s+path=["']([^"']+)["']\s+element=\{<([A-Za-z0-9_]+)/g;
  const routes = [];
  let routeMatch;
  while ((routeMatch = routeRegex.exec(appJsx)) !== null) {
    routes.push({ path: routeMatch[1], component: routeMatch[2] });
  }

  for (const tool of tools) {
    const cleanPath = tool.path.replace(/^\//, '');
    const route = routes.find((r) => r.path === cleanPath);
    if (route) {
      const lazyPath = lazyImports.get(route.component);
      if (!lazyPath) {
        errors.push(`Route component "${route.component}" for tool "${tool.id}" is not wrapped in React.lazy().`);
      } else if (!lazyPath.includes(tool.id)) {
        errors.push(`Lazy import for "${route.component}" (${lazyPath}) does not point to tool "${tool.id}".`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 3. Validate SVG Mappings & Assets
 */
export function validateSvgMappings({
  tools = ALL_TOOLS,
  toolSvgMap = TOOL_SVG_MAP,
  assetDir = 'src/assets/fixmyfile-49-svg-icons',
  fsModule = fs
} = {}) {
  const errors = [];

  for (const tool of tools) {
    if (!toolSvgMap[tool.id]) {
      errors.push(`Tool "${tool.id}" is missing from TOOL_SVG_MAP in toolSvgMap.js.`);
      continue;
    }

    const svgUrl = toolSvgMap[tool.id];
    let filePath;
    if (typeof svgUrl === 'string' && svgUrl.startsWith('file://')) {
      filePath = fileURLToPath(svgUrl);
    } else if (typeof svgUrl === 'string') {
      const filename = svgUrl.split('/').pop();
      filePath = path.join(assetDir, filename);
    } else {
      errors.push(`Tool "${tool.id}" SVG URL is invalid: ${String(svgUrl)}.`);
      continue;
    }

    if (fsModule.existsSync) {
      if (!fsModule.existsSync(filePath)) {
        errors.push(`SVG asset for tool "${tool.id}" does not exist on disk: "${filePath}".`);
      } else {
        const content = fsModule.readFileSync(filePath, 'utf8');
        if (!content.includes('<svg') || !content.includes('</svg>')) {
          errors.push(`SVG asset for tool "${tool.id}" is not valid SVG XML: "${filePath}".`);
        }
        if (!content.includes('viewBox')) {
          errors.push(`SVG asset for tool "${tool.id}" is missing required "viewBox" attribute: "${filePath}".`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 4. Validate Accent Mappings
 */
export function validateAccentMappings({
  tools = ALL_TOOLS,
  toolAccentMap = TOOL_ACCENT_MAP
} = {}) {
  const errors = [];

  for (const tool of tools) {
    const accent = toolAccentMap[tool.id];
    if (!accent) {
      errors.push(`Tool "${tool.id}" is missing from TOOL_ACCENT_MAP in toolAccentMap.js.`);
      continue;
    }

    if (!accent.primary || !HEX_COLOR_REGEX.test(accent.primary)) {
      errors.push(`Tool "${tool.id}" has invalid primary accent color: "${accent.primary}". Must be valid hex (e.g. #3B82F6).`);
    }

    if (!accent.border || !RGBA_COLOR_REGEX.test(accent.border)) {
      errors.push(`Tool "${tool.id}" has invalid border color: "${accent.border}". Must be valid rgba string.`);
    }

    if (!accent.hoverBorder || !RGBA_COLOR_REGEX.test(accent.hoverBorder)) {
      errors.push(`Tool "${tool.id}" has invalid hoverBorder color: "${accent.hoverBorder}". Must be valid rgba string.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 5. Validate Homepage Categories Assignment
 */
export function validateHomepageCategories({
  tools = ALL_TOOLS,
  homepageCategories = HOMEPAGE_CATEGORIES,
  categorySvgMap = CATEGORY_SVG_MAP
} = {}) {
  const errors = [];
  const toolCategoryCounts = new Map();
  const validToolIds = new Set(tools.map((t) => t.id));

  for (const cat of homepageCategories) {
    if (!cat.id || typeof cat.id !== 'string') {
      errors.push(`Category missing valid "id".`);
    }
    if (!cat.title || typeof cat.title !== 'string') {
      errors.push(`Category "${cat.id}" missing valid "title".`);
    }
    if (!cat.subtitle || typeof cat.subtitle !== 'string') {
      errors.push(`Category "${cat.id}" missing valid "subtitle".`);
    }
    if (!Array.isArray(cat.toolIds) || cat.toolIds.length === 0) {
      errors.push(`Category "${cat.id}" must contain a non-empty toolIds array.`);
      continue;
    }

    // Verify Category SVG Mapping
    if (!categorySvgMap[cat.id]) {
      errors.push(`Category "${cat.id}" is missing from CATEGORY_SVG_MAP in categorySvgMap.js.`);
    }

    for (const toolId of cat.toolIds) {
      if (!validToolIds.has(toolId)) {
        errors.push(`Category "${cat.id}" contains unknown/phantom toolId: "${toolId}".`);
      }
      const count = (toolCategoryCounts.get(toolId) || 0) + 1;
      toolCategoryCounts.set(toolId, count);
    }
  }

  // Check every registered tool is in exactly 1 category
  for (const tool of tools) {
    const count = toolCategoryCounts.get(tool.id) || 0;
    if (count === 0) {
      errors.push(`Tool "${tool.id}" is orphaned: not assigned to any homepage category.`);
    } else if (count > 1) {
      errors.push(`Tool "${tool.id}" is assigned to multiple (${count}) homepage categories.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 6. Validate Educational & Documentation Content
 */
export function validateToolContent({
  tools = ALL_TOOLS,
  toolContent = TOOL_CONTENT
} = {}) {
  const errors = [];

  for (const tool of tools) {
    const entry = toolContent[tool.id];
    if (!entry) {
      errors.push(`Tool "${tool.id}" is missing from TOOL_CONTENT in toolContent.js.`);
      continue;
    }

    if (entry.toolId !== tool.id) {
      errors.push(`TOOL_CONTENT for "${tool.id}" has mismatched toolId property: "${entry.toolId}".`);
    }

    if (!entry.privacyNote || typeof entry.privacyNote !== 'string' || entry.privacyNote.trim().length < 20) {
      errors.push(`Tool "${tool.id}" missing adequate privacyNote in toolContent.js.`);
    }

    if (!entry.howTo || typeof entry.howTo.title !== 'string' || entry.howTo.title.length < 5) {
      errors.push(`Tool "${tool.id}" missing valid howTo.title in toolContent.js.`);
    }

    if (!Array.isArray(entry.howTo?.steps) || entry.howTo.steps.length < 3 || entry.howTo.steps.length > 5) {
      errors.push(`Tool "${tool.id}" howTo.steps must contain 3 to 5 steps (got ${entry.howTo?.steps?.length}).`);
    } else {
      entry.howTo.steps.forEach((step, idx) => {
        if (!step.title || step.title.trim().length === 0) {
          errors.push(`Tool "${tool.id}" step ${idx + 1} is missing title.`);
        }
        if (!step.description || step.description.trim().length < 10) {
          errors.push(`Tool "${tool.id}" step ${idx + 1} has insufficient description.`);
        }
      });
    }

    if (!Array.isArray(entry.faqs) || entry.faqs.length < 3 || entry.faqs.length > 5) {
      errors.push(`Tool "${tool.id}" faqs must contain 3 to 5 Q&A pairs (got ${entry.faqs?.length}).`);
    } else {
      entry.faqs.forEach((faq, idx) => {
        if (!faq.question || !faq.question.trim().endsWith('?')) {
          errors.push(`Tool "${tool.id}" FAQ ${idx + 1} question must end with a question mark "?".`);
        }
        if (!faq.answer || faq.answer.trim().length < 15) {
          errors.push(`Tool "${tool.id}" FAQ ${idx + 1} has insufficient answer.`);
        }
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 7. Validate Intent-Based Related Tools Cross-References
 */
export function validateRelatedTools({
  tools = ALL_TOOLS,
  toolContent = TOOL_CONTENT
} = {}) {
  const errors = [];
  const validToolIds = new Set(tools.map((t) => t.id));

  for (const tool of tools) {
    const entry = toolContent[tool.id];
    if (!entry) continue; // Already flagged in validateToolContent

    if (!Array.isArray(entry.relatedTools) || entry.relatedTools.length < 3 || entry.relatedTools.length > 4) {
      errors.push(`Tool "${tool.id}" relatedTools must contain 3 to 4 related tools (got ${entry.relatedTools?.length}).`);
      continue;
    }

    const seenRelated = new Set();
    for (const relatedId of entry.relatedTools) {
      if (!validToolIds.has(relatedId)) {
        errors.push(`Tool "${tool.id}" references nonexistent or deferred relatedTool "${relatedId}".`);
      }
      if (relatedId === tool.id) {
        errors.push(`Tool "${tool.id}" cannot reference itself in relatedTools.`);
      }
      if (seenRelated.has(relatedId)) {
        errors.push(`Tool "${tool.id}" has duplicate relatedTool reference "${relatedId}".`);
      }
      seenRelated.add(relatedId);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 8. Validate Production SEO Consistency
 */
export function validateSeoConsistency({
  tools = ALL_TOOLS,
  formatToolTitleFn = formatToolTitle,
  formatToolDescriptionFn = formatToolDescription,
  getPageSEOFn = getPageSEO,
  siteUrl = SITE_URL
} = {}) {
  const errors = [];

  for (const tool of tools) {
    const formattedTitle = formatToolTitleFn(tool.name);
    if (!formattedTitle || !formattedTitle.includes(tool.name) || !formattedTitle.includes('FixMyFile')) {
      errors.push(`Tool "${tool.id}" formatToolTitle output "${formattedTitle}" must include tool name and FixMyFile.`);
    }

    const formattedDesc = formatToolDescriptionFn(tool.description);
    if (!formattedDesc || formattedDesc.length < 100 || formattedDesc.length > 165) {
      errors.push(`Tool "${tool.id}" formatToolDescription length (${formattedDesc.length}) outside optimal range (100-165).`);
    }

    const seo = getPageSEOFn(tool.path);
    if (!seo) {
      errors.push(`getPageSEO("${tool.path}") returned null for tool "${tool.id}".`);
      continue;
    }

    const expectedCanonical = `${siteUrl}${tool.path}`;
    if (seo.canonical !== expectedCanonical) {
      errors.push(`Tool "${tool.id}" SEO canonical mismatch: expected "${expectedCanonical}", got "${seo.canonical}".`);
    }
    if (seo.robots !== 'index, follow') {
      errors.push(`Tool "${tool.id}" SEO robots must be "index, follow", got "${seo.robots}".`);
    }
    if (seo.ogType !== 'website') {
      errors.push(`Tool "${tool.id}" SEO ogType must be "website", got "${seo.ogType}".`);
    }
    if (!seo.tool || seo.tool.id !== tool.id) {
      errors.push(`Tool "${tool.id}" SEO payload missing attached tool object.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 9. Validate Production Sitemap Inclusion
 */
export function validateSitemapConsistency({
  tools = ALL_TOOLS,
  sitemapXmlContent = null,
  siteUrl = SITE_URL,
  sitemapPath = 'public/sitemap.xml',
  fsModule = fs
} = {}) {
  const errors = [];
  const sitemapXml = sitemapXmlContent ?? (fsModule.existsSync(sitemapPath) ? fsModule.readFileSync(sitemapPath, 'utf8') : '');

  if (!sitemapXml || !sitemapXml.includes('<urlset')) {
    errors.push(`Sitemap at "${sitemapPath}" is missing or does not contain <urlset>.`);
    return { valid: false, errors };
  }

  for (const tool of tools) {
    const expectedUrl = `${siteUrl}${tool.path}`;
    const locTag = `<loc>${expectedUrl}</loc>`;
    if (!sitemapXml.includes(locTag)) {
      errors.push(`Sitemap is missing URL for active tool "${tool.id}": ${locTag}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Master Architecture Validation Suite
 * Runs all 9 checks and returns comprehensive report.
 */
export function validateAllToolArchitecture(options = {}) {
  const results = {
    registryAndRoutes: validateRegistryAndRoutes(options),
    lazyLoading: validateLazyLoading(options),
    svgMappings: validateSvgMappings(options),
    accentMappings: validateAccentMappings(options),
    homepageCategories: validateHomepageCategories(options),
    toolContent: validateToolContent(options),
    relatedTools: validateRelatedTools(options),
    seoConsistency: validateSeoConsistency(options),
    sitemapConsistency: validateSitemapConsistency(options)
  };

  const allErrors = Object.entries(results).flatMap(([name, res]) =>
    res.errors.map((err) => `[${name}] ${err}`)
  );

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    results,
    toolCount: (options.tools || ALL_TOOLS).length
  };
}

// CLI Execution Entrypoint
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log('=== FIXMYFILE: FUTURE TOOL ARCHITECTURE GUARDRAILS VALIDATION ===\n');
  const report = validateAllToolArchitecture();

  console.log(`Active Tools Evaluated: ${report.toolCount}`);
  console.log('Guardrail Check Results:');
  console.log(`  1. Registry & Routes Parity:     ${report.results.registryAndRoutes.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  2. Route-Level Code Splitting:   ${report.results.lazyLoading.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  3. SVG Asset Mappings:           ${report.results.svgMappings.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  4. Tool Accent Color Tokens:     ${report.results.accentMappings.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  5. Homepage Category Assignment: ${report.results.homepageCategories.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  6. Tool Educational Content:     ${report.results.toolContent.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  7. Related Tool Cross-Links:     ${report.results.relatedTools.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  8. Production SEO Metadata:      ${report.results.seoConsistency.valid ? 'PASS' : 'FAIL'}`);
  console.log(`  9. Dynamic Sitemap Inclusion:    ${report.results.sitemapConsistency.valid ? 'PASS' : 'FAIL'}\n`);

  if (report.valid) {
    console.log(`ALL ARCHITECTURE GUARDRAILS PASSED (0 errors across ${report.toolCount} active tools).\n`);
    process.exit(0);
  } else {
    console.error(`ARCHITECTURE GUARDRAIL VIOLATIONS FOUND (${report.errors.length} errors):\n`);
    report.errors.forEach((err, idx) => {
      console.error(`  ${idx + 1}. ${err}`);
    });
    console.error('');
    process.exit(1);
  }
}
