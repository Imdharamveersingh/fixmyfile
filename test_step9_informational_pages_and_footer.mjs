import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { BLOG_ARTICLES, BLOG_CATEGORIES, getArticleBySlug } from './src/data/blogArticles.js';
import { getPageSEO, SITE_URL } from './src/config/seoConfig.js';
import { ALL_TOOLS } from './src/tools/toolsRegistry.js';

test('=== FixMyFile Step 9: Informational Pages, Blog Architecture & Footer Redesign ===', async (t) => {
  // A. Informational Routes Verification in App.jsx
  await t.test('A. All 6 new routes registered in App.jsx', () => {
    const appContent = fs.readFileSync('src/App.jsx', 'utf8');
    const expectedRoutes = [
      'why-fixmyfile',
      'contact',
      'privacy',
      'terms',
      'blog',
      'blog/:slug'
    ];
    for (const r of expectedRoutes) {
      assert.match(
        appContent,
        new RegExp(`path="${r}"`),
        `App.jsx must declare route for ${r}`
      );
    }
  });

  // B. Blog Content Architecture & Slugs
  await t.test('B. Blog Content Architecture integrity', () => {
    assert.strictEqual(
      BLOG_ARTICLES.length >= 5 && BLOG_ARTICLES.length <= 8,
      true,
      `Expected 5-8 blog articles, found ${BLOG_ARTICLES.length}`
    );
    assert.strictEqual(BLOG_ARTICLES.length, 7, 'Expected exactly 7 initial blog articles');

    const slugs = new Set();
    for (const article of BLOG_ARTICLES) {
      assert.ok(article.slug, 'Article has slug');
      assert.ok(!slugs.has(article.slug), `Duplicate slug: ${article.slug}`);
      slugs.add(article.slug);

      assert.ok(article.title, `Article ${article.slug} has title`);
      assert.ok(article.category, `Article ${article.slug} has category`);
      assert.ok(BLOG_CATEGORIES.includes(article.category), `Category ${article.category} is in BLOG_CATEGORIES`);
      assert.ok(article.excerpt, `Article ${article.slug} has excerpt`);
      assert.ok(article.publishDate, `Article ${article.slug} has publishDate`);
      assert.ok(article.readTime, `Article ${article.slug} has readTime`);
      assert.ok(article.sections && article.sections.length > 0, `Article ${article.slug} has sections`);

      // Verify related tools actually exist in ALL_TOOLS
      if (article.relatedTools) {
        for (const rt of article.relatedTools) {
          const toolExists = ALL_TOOLS.some((t) => t.path === rt.path);
          assert.ok(toolExists, `Related tool ${rt.path} must exist in ALL_TOOLS`);
        }
      }
    }

    // Slug resolution helper tests
    const firstArticle = BLOG_ARTICLES[0];
    assert.strictEqual(getArticleBySlug(firstArticle.slug)?.title, firstArticle.title);
    assert.strictEqual(getArticleBySlug('non-existent-article-slug'), undefined);
  });

  // C. Footer Structure & Navigation Integrity
  await t.test('C. Redesigned Footer structure and link integrity', () => {
    const footerContent = fs.readFileSync('src/components/Footer.jsx', 'utf8');

    // Brand and Trust Badge
    assert.match(footerContent, /alt="FixMyFile"/);
    assert.match(footerContent, /100% Private & Browser-Based/);
    assert.match(footerContent, /<svg\s+aria-hidden="true"/, 'Trust badge SVG is aria-hidden');

    // Compact Column Headings
    assert.match(footerContent, /<h4 className="footer-heading">Tools<\/h4>/);
    assert.match(footerContent, /<h4 className="footer-heading">Resources<\/h4>/);
    assert.match(footerContent, /<h4 className="footer-heading">Company<\/h4>/);
    assert.match(footerContent, /<h4 className="footer-heading">Legal<\/h4>/);

    // Required Navigation Links
    assert.match(footerContent, /to="\/why-fixmyfile"/);
    assert.match(footerContent, /to="\/contact"/);
    assert.match(footerContent, /to="\/privacy"/);
    assert.match(footerContent, /to="\/terms"/);
    assert.match(footerContent, /to="\/blog"/);

    // No obsolete phase labels, no completion pills
    assert.ok(!footerContent.includes('Phase 1'), 'Footer must not contain Phase 1');
    assert.ok(!footerContent.includes('Phase 7'), 'Footer must not contain Phase 7');
    assert.ok(!footerContent.includes('Phase 6'), 'Footer must not contain Phase 6');
    assert.ok(!footerContent.includes('Complete'), 'Footer must not contain completion badges');

    // No deferred tools
    const deferredTools = [
      'audio-converter',
      'm4a-to-mp3',
      'wav-to-mp3',
      'mp3-cutter',
      'video-trimmer',
      'video-to-mp4'
    ];
    for (const d of deferredTools) {
      assert.ok(!footerContent.includes(d), `Footer must not contain deferred tool ${d}`);
    }

    // No individual 49 tools listed individually (ensure compact footer)
    const linksCount = (footerContent.match(/<Link\s+to=/g) || []).length;
    assert.ok(
      linksCount <= 15,
      `Redesigned footer must be compact (<= 15 total links), got ${linksCount}`
    );
  });

  // D. SEO Metadata & Canonical Integrity
  await t.test('D. Dynamic SEO Metadata for new routes', () => {
    const routesToTest = [
      '/why-fixmyfile',
      '/contact',
      '/privacy',
      '/terms',
      '/blog'
    ];

    for (const route of routesToTest) {
      const seo = getPageSEO(route);
      assert.ok(seo.title && seo.title.length > 10, `${route} has valid SEO title`);
      assert.ok(seo.description && seo.description.length >= 50, `${route} has valid SEO description`);
      assert.strictEqual(seo.canonical, `https://fixmyfile.netlify.app${route}`);
      assert.ok(!seo.canonical.includes('fixmyfile.com'), 'Canonical must never use fixmyfile.com');
      assert.strictEqual(seo.ogType, 'website');
      assert.strictEqual(seo.robots, 'index, follow');
    }

    // Test Blog Article SEO
    for (const article of BLOG_ARTICLES) {
      const articleRoute = `/blog/${article.slug}`;
      const seo = getPageSEO(articleRoute);
      assert.ok(seo.title.includes('FixMyFile'), `Article ${article.slug} title has brand`);
      assert.ok(seo.description.length > 30, `Article ${article.slug} description`);
      assert.strictEqual(
        seo.canonical,
        `https://fixmyfile.netlify.app/blog/${article.slug}`
      );
      assert.strictEqual(seo.ogType, 'article');
      assert.ok(seo.articleData, 'Article SEO includes structured article data');
      assert.strictEqual(seo.articleData.title, article.title);
      assert.strictEqual(seo.articleData.publishDate, article.publishDate);
    }
  });

  // E. Sitemap Integrity (Exactly 62 URLs)
  await t.test('E. Sitemap includes all 62 URLs with Netlify base', () => {
    const sitemapContent = fs.readFileSync('public/sitemap.xml', 'utf8');
    const sitemapLocs = Array.from(
      sitemapContent.matchAll(/<loc>(https?:\/\/[^<]+)<\/loc>/g)
    ).map((m) => m[1]);

    assert.strictEqual(
      sitemapLocs.length,
      62,
      `Expected exactly 62 sitemap URLs (1 home + 49 tools + 5 info + 7 articles), got ${sitemapLocs.length}`
    );

    const uniqueLocs = new Set(sitemapLocs);
    assert.strictEqual(uniqueLocs.size, 62, 'Zero duplicate URLs in sitemap.xml');

    // Confirm all 5 info pages and all 7 articles are in sitemap
    const requiredUrls = [
      `${SITE_URL}/`,
      `${SITE_URL}/why-fixmyfile`,
      `${SITE_URL}/contact`,
      `${SITE_URL}/privacy`,
      `${SITE_URL}/terms`,
      `${SITE_URL}/blog`,
      ...BLOG_ARTICLES.map((a) => `${SITE_URL}/blog/${a.slug}`)
    ];

    for (const u of requiredUrls) {
      assert.ok(uniqueLocs.has(u), `Sitemap missing URL: ${u}`);
    }
  });

  // F. Accessibility Guarantees
  await t.test('F. Single main landmark and semantic tags', () => {
    const pageFiles = [
      'src/pages/WhyFixMyFilePage.jsx',
      'src/pages/ContactPage.jsx',
      'src/pages/PrivacyPolicyPage.jsx',
      'src/pages/TermsPage.jsx',
      'src/pages/BlogListingPage.jsx',
      'src/pages/BlogArticlePage.jsx'
    ];

    for (const pf of pageFiles) {
      const content = fs.readFileSync(pf, 'utf8');
      assert.ok(
        !/<main[\s>]/.test(content),
        `${pf} must NOT contain inner <main> tag (Layout.jsx owns main landmark)`
      );
    }
  });
});
