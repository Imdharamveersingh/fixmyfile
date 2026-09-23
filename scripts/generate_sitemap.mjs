import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';
import { SITE_URL } from '../src/config/seoConfig.js';
import { BLOG_ARTICLES } from '../src/data/blogArticles.js';

const sitemapPath = path.resolve('public/sitemap.xml');

const INFORMATIONAL_ROUTES = [
  { path: '/why-fixmyfile', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.5' },
  { path: '/terms', changefreq: 'monthly', priority: '0.5' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' }
];

const urls = [
  {
    loc: `${SITE_URL}/`,
    changefreq: 'daily',
    priority: '1.0'
  },
  ...ALL_TOOLS.map((tool) => ({
    loc: `${SITE_URL}${tool.path}`,
    changefreq: 'weekly',
    priority: '0.8'
  })),
  ...INFORMATIONAL_ROUTES.map((route) => ({
    loc: `${SITE_URL}${route.path}`,
    changefreq: route.changefreq,
    priority: route.priority
  })),
  ...BLOG_ARTICLES.map((article) => ({
    loc: `${SITE_URL}/blog/${article.slug}`,
    changefreq: 'monthly',
    priority: '0.7'
  }))
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

fs.writeFileSync(sitemapPath, xml.trim() + '\n', 'utf8');
console.log(
  `Generated ${sitemapPath} with ${urls.length} URLs (1 homepage + ${ALL_TOOLS.length} active tools + ${INFORMATIONAL_ROUTES.length} informational pages + ${BLOG_ARTICLES.length} blog articles).`
);

const robotsPath = path.resolve('public/robots.txt');
const robotsContent = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
fs.writeFileSync(robotsPath, robotsContent, 'utf8');
console.log(`Updated ${robotsPath} with Sitemap: ${SITE_URL}/sitemap.xml.`);
