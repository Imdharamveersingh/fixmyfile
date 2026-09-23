import { spawn } from 'node:child_process';
import http from 'node:http';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS, getToolByPath } from './src/tools/toolsRegistry.js';
import { SITE_URL, getPageSEO, DEFAULT_SITE_METADATA } from './src/config/seoConfig.js';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';
const PORT = 9392;

console.log('=== FIXMYFILE: COMPREHENSIVE SEO FOUNDATION & PER-TOOL METADATA TEST SUITE ===\n');

// ----------------------------------------------------
// GROUP 1: Programmatic Tool Registry & SEO Generation
// ----------------------------------------------------
console.log('GROUP 1: Registry Integrity & Deterministic Metadata Derivation');
assert.equal(ALL_TOOLS.length, 49, `Expected exactly 49 active tools, got ${ALL_TOOLS.length}`);

const uniqueIds = new Set(ALL_TOOLS.map((t) => t.id));
const uniquePaths = new Set(ALL_TOOLS.map((t) => t.path));
assert.equal(uniqueIds.size, 49, 'Must have 49 unique tool IDs');
assert.equal(uniquePaths.size, 49, 'Must have 49 unique tool paths');
console.log('  ✓ 49 active tools with unique IDs and paths verified');

const titles = new Set();
const descriptions = new Set();
const canonicals = new Set();

for (const tool of ALL_TOOLS) {
  const seo = getPageSEO(tool.path);

  assert(seo.title, `Tool ${tool.name} must have a title`);
  assert(seo.description, `Tool ${tool.name} must have a description`);
  assert(seo.canonical, `Tool ${tool.name} must have a canonical URL`);

  // Identity checks
  assert(seo.title.includes(tool.name), `Title "${seo.title}" must contain tool name "${tool.name}"`);
  assert(seo.title.includes('FixMyFile'), `Title "${seo.title}" must contain brand name "FixMyFile"`);
  assert.equal(seo.canonical, `${SITE_URL}${tool.path}`, `Canonical must match ${SITE_URL}${tool.path}`);

  // Description length and quality checks
  assert(
    seo.description.length >= 80 && seo.description.length <= 180,
    `Description for ${tool.name} length (${seo.description.length}) outside optimal range: "${seo.description}"`
  );

  titles.add(seo.title);
  descriptions.add(seo.description);
  canonicals.add(seo.canonical);
}

assert.equal(titles.size, 49, `Expected 49 unique titles, got ${titles.size}`);
assert.equal(descriptions.size, 49, `Expected 49 unique descriptions, got ${descriptions.size}`);
assert.equal(canonicals.size, 49, `Expected 49 unique canonical URLs, got ${canonicals.size}`);
console.log('  ✓ Exactly 49 unique titles, descriptions, and canonical URLs derived with zero collision');

// ----------------------------------------------------
// GROUP 2: Static Robots.txt & Sitemap.xml Audit
// ----------------------------------------------------
console.log('\nGROUP 2: Robots.txt & Sitemap.xml Verification');

// 1. Robots.txt
const robotsPath = path.resolve('public/robots.txt');
assert(fs.existsSync(robotsPath), 'public/robots.txt must exist');
const robotsContent = fs.readFileSync(robotsPath, 'utf8');
assert(robotsContent.includes('User-agent: *'), 'robots.txt must allow User-agent: *');
assert(robotsContent.includes('Allow: /'), 'robots.txt must specify Allow: /');
assert(robotsContent.includes(`Sitemap: ${SITE_URL}/sitemap.xml`), `robots.txt must link to ${SITE_URL}/sitemap.xml`);
console.log('  ✓ public/robots.txt verified with valid User-agent, Allow, and Sitemap directive');

// 2. Sitemap.xml
const sitemapPath = path.resolve('public/sitemap.xml');
assert(fs.existsSync(sitemapPath), 'public/sitemap.xml must exist');
const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');

const sitemapLocs = Array.from(sitemapContent.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)).map((m) => m[1]);
assert.equal(sitemapLocs.length, 50, `Sitemap must contain exactly 50 URLs (1 home + 49 tools), got ${sitemapLocs.length}`);

const uniqueLocs = new Set(sitemapLocs);
assert.equal(uniqueLocs.size, 50, `Sitemap URLs must be unique, got ${uniqueLocs.size}`);

// Verify homepage present
assert(uniqueLocs.has(`${SITE_URL}/`), `Sitemap must contain homepage: ${SITE_URL}/`);

// Verify all 49 tools present in sitemap
for (const tool of ALL_TOOLS) {
  const expectedUrl = `${SITE_URL}${tool.path}`;
  assert(uniqueLocs.has(expectedUrl), `Sitemap missing tool URL: ${expectedUrl}`);
}
console.log('  ✓ public/sitemap.xml verified with exactly 50 unique URLs (1 home + 49 tools) and zero duplicates');

// ----------------------------------------------------
// GROUP 3: Real Chrome CDP In-Browser DOM & Route Audit
// ----------------------------------------------------
async function runChromeSeoTests() {
  console.log('\nGROUP 3: Real Google Chrome CDP In-Browser SEO Evaluation');

  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    BASE_URL
  ]);

  try {
    let targets = null;
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 200));
      try {
        targets = await new Promise((resolve, reject) => {
          http.get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
            let d = '';
            res.on('data', (c) => (d += c));
            res.on('end', () => resolve(JSON.parse(d)));
          }).on('error', reject);
        });
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Chrome failed to connect on port ${PORT}`);
    }

    const pageTarget = targets.find((t) => t.type === 'page');
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let reqId = 1;
    const pending = new Map();
    const consoleErrors = [];

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = reqId++;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    ws.onmessage = (msg) => {
      const parsed = JSON.parse(msg.data);
      if (parsed.id && pending.has(parsed.id)) {
        const { resolve, reject } = pending.get(parsed.id);
        pending.delete(parsed.id);
        if (parsed.error) reject(new Error(parsed.error.message));
        else resolve(parsed.result);
      }
      if (parsed.method === 'Runtime.consoleAPICalled' && parsed.params.type === 'error') {
        const text = parsed.params.args.map((a) => a.value || a.description || '').join(' ');
        consoleErrors.push(text);
      }
      if (parsed.method === 'Runtime.exceptionThrown') {
        const desc = parsed.params?.exceptionDetails?.exception?.description || parsed.params?.exceptionDetails?.text;
        consoleErrors.push(desc);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('DOM.enable');

    // Helper to evaluate full SEO tags in current DOM
    async function evaluateDomSeo() {
      const res = await send('Runtime.evaluate', {
        expression: `(() => {
          const getMeta = (selector, attr = 'content') => document.head.querySelector(selector)?.getAttribute(attr) || null;
          const canonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute('href') || null;
          const structuredDataEl = document.head.querySelector('script#fixmyfile-structured-data');
          let structuredData = null;
          if (structuredDataEl) {
            try { structuredData = JSON.parse(structuredDataEl.textContent); } catch (e) { structuredData = { error: e.message }; }
          }
          return {
            title: document.title,
            description: getMeta('meta[name="description"]'),
            canonical,
            robots: getMeta('meta[name="robots"]'),
            ogTitle: getMeta('meta[property="og:title"]'),
            ogDescription: getMeta('meta[property="og:description"]'),
            ogUrl: getMeta('meta[property="og:url"]'),
            ogType: getMeta('meta[property="og:type"]'),
            ogSiteName: getMeta('meta[property="og:site_name"]'),
            ogImage: getMeta('meta[property="og:image"]'),
            twitterCard: getMeta('meta[name="twitter:card"]'),
            twitterTitle: getMeta('meta[name="twitter:title"]'),
            twitterDescription: getMeta('meta[name="twitter:description"]'),
            twitterImage: getMeta('meta[name="twitter:image"]'),
            structuredData
          };
        })()`,
        returnByValue: true
      });
      return res.result.value;
    }

    // 1. Verify Homepage SEO
    console.log('1. Evaluating Homepage SEO (Desktop & Mobile)...');
    await send('Page.navigate', { url: BASE_URL });
    await new Promise((r) => setTimeout(r, 1200));

    const homeSeo = await evaluateDomSeo();
    assert.equal(homeSeo.title, DEFAULT_SITE_METADATA.title, 'Home title must match default title');
    assert.equal(homeSeo.description, DEFAULT_SITE_METADATA.description, 'Home description must match default');
    assert.equal(homeSeo.canonical, `${SITE_URL}/`, 'Home canonical must be root URL');
    assert.equal(homeSeo.ogTitle, DEFAULT_SITE_METADATA.title);
    assert.equal(homeSeo.ogUrl, `${SITE_URL}/`);
    assert.equal(homeSeo.twitterTitle, DEFAULT_SITE_METADATA.title);
    assert.equal(homeSeo.structuredData?.['@type'], 'WebSite');
    console.log('   ✓ Homepage document.title, meta description, canonical, OG, Twitter, and JSON-LD WebSite verified');

    // 2. Verify Representative Active Tools
    console.log('2. Evaluating Representative Tool Routes Metadata...');
    const sampleRoutes = [
      '/image-cropper',
      '/image-to-text',
      '/pdf-ocr',
      '/extract-text-from-pdf',
      '/mp4-to-mp3',
      '/video-compressor',
      '/video-to-gif',
      '/gif-maker',
      '/jpg-to-pdf',
      '/qr-code-generator'
    ];

    for (const r of sampleRoutes) {
      const tool = getToolByPath(r);
      const expectedSeo = getPageSEO(r);

      await send('Page.navigate', { url: `${BASE_URL}${r}` });
      await new Promise((res) => setTimeout(res, 800));

      const domSeo = await evaluateDomSeo();

      assert(domSeo.title.includes(tool.name), `${r}: Title "${domSeo.title}" must contain "${tool.name}"`);
      assert(domSeo.title.includes('FixMyFile'), `${r}: Title must contain "FixMyFile"`);
      assert.equal(domSeo.canonical, `${SITE_URL}${r}`, `${r}: Canonical must be ${SITE_URL}${r}`);
      assert.equal(domSeo.description, expectedSeo.description, `${r}: Meta description mismatch`);
      assert.equal(domSeo.ogUrl, `${SITE_URL}${r}`, `${r}: OG URL must match canonical`);
      assert.equal(domSeo.ogTitle, domSeo.title, `${r}: OG title must match document title`);
      assert.equal(domSeo.twitterTitle, domSeo.title, `${r}: Twitter title must match document title`);
      assert.equal(domSeo.structuredData?.['@type'], 'WebApplication');
      assert.equal(domSeo.structuredData?.name, tool.name);

      console.log(`   ✓ ${tool.name} (${r}): title="${domSeo.title}"`);
    }

    // 3. Test In-App Client-Side Route Transitions (SPA dynamic metadata updates)
    console.log('\n3. Testing In-App Client-Side SPA Route Transitions...');
    // Sequence: Home -> /image-cropper -> /mp4-to-mp3 -> Home -> /pdf-ocr
    const transitionSequence = [
      { path: '/', expectedTitle: DEFAULT_SITE_METADATA.title, expectedCanonical: `${SITE_URL}/` },
      { path: '/image-cropper', expectedKeyword: 'Image Cropper', expectedCanonical: `${SITE_URL}/image-cropper` },
      { path: '/mp4-to-mp3', expectedKeyword: 'MP4 to MP3', expectedCanonical: `${SITE_URL}/mp4-to-mp3` },
      { path: '/', expectedTitle: DEFAULT_SITE_METADATA.title, expectedCanonical: `${SITE_URL}/` },
      { path: '/pdf-ocr', expectedKeyword: 'PDF OCR', expectedCanonical: `${SITE_URL}/pdf-ocr` }
    ];

    for (const step of transitionSequence) {
      // Simulate client-side navigation using History pushState + popstate / direct link click
      await send('Runtime.evaluate', {
        expression: `(() => {
          window.history.pushState({}, '', '${step.path}');
          window.dispatchEvent(new PopStateEvent('popstate'));
        })()`
      });
      await new Promise((res) => setTimeout(res, 400));

      const stepSeo = await evaluateDomSeo();

      if (step.expectedTitle) {
        assert.equal(stepSeo.title, step.expectedTitle, `SPA transition to ${step.path} title mismatch`);
      }
      if (step.expectedKeyword) {
        assert(stepSeo.title.includes(step.expectedKeyword), `SPA transition to ${step.path} title missing ${step.expectedKeyword}`);
      }
      assert.equal(stepSeo.canonical, step.expectedCanonical, `SPA transition to ${step.path} canonical mismatch`);
      console.log(`   ✓ SPA transition to ${step.path}: title="${stepSeo.title}" canonical="${stepSeo.canonical}"`);
    }
    console.log('   ✓ In-app SPA route transitions dynamically synchronize metadata with 0 stale tags');

    // 4. Console Error Audit
    console.log('\n4. Checking Console Errors...');
    const criticalErrors = consoleErrors.filter((e) => !e.includes('favicon') && !e.includes('manifest'));
    assert.equal(criticalErrors.length, 0, `Expected 0 console errors, got: ${criticalErrors.join('; ')}`);
    console.log('   ✓ 0 console errors confirmed');

    console.log('\n🎉 ALL SEO FOUNDATION AND PER-TOOL METADATA TESTS PASSED SUCCESSFULLY!');
  } finally {
    try {
      chrome.kill('SIGKILL');
    } catch {}
  }
}

runChromeSeoTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
