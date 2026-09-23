import fs from 'node:fs';
import path from 'node:path';
import { ALL_TOOLS } from '../src/tools/toolsRegistry.js';
import { SITE_URL } from '../src/config/seoConfig.js';

const sitemapPath = path.resolve('public/sitemap.xml');

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
console.log(`Generated ${sitemapPath} with ${urls.length} URLs (1 homepage + ${ALL_TOOLS.length} active tools).`);
