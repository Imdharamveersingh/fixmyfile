import { getToolByPath } from '../tools/toolsRegistry.js';
import { getArticleBySlug } from '../data/blogArticles.js';

/**
 * SEO & Domain Configuration for FixMyFile
 *
 * Configurable Base URL for canonical URLs, sitemaps, and social share tags.
 * Overridable via VITE_SITE_URL in production environments.
 * Default production fallback is 'https://fixmyfile.netlify.app'.
 */
const envUrl =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL
    ? import.meta.env.VITE_SITE_URL
    : typeof process !== 'undefined' && process.env?.VITE_SITE_URL
      ? process.env.VITE_SITE_URL
      : null;

export const SITE_URL = (envUrl || 'https://fixmyfile.netlify.app').replace(/\/$/, '');

export const DEFAULT_SITE_METADATA = {
  title: 'FixMyFile — Free Online File Tools | Privacy-First',
  description:
    'Free, privacy-focused online file utility suite for PDF editing, image conversion, OCR text extraction, media processing, and code generation client-side.',
  siteName: 'FixMyFile',
  ogType: 'website',
  twitterCard: 'summary',
  image: `${SITE_URL}/logo.png`,
  robots: 'index, follow'
};

/**
 * Formats a clean, professional page title avoiding awkward repetition.
 */
export function formatToolTitle(toolName) {
  if (!toolName) return DEFAULT_SITE_METADATA.title;

  const lower = toolName.toLowerCase();

  // Natural suffix mappings
  if (lower.includes('converter')) {
    return `${toolName} Online — Free File Converter | FixMyFile`;
  }
  if (lower.includes('compressor')) {
    return `${toolName} Online — Reduce File Size Free | FixMyFile`;
  }
  if (lower.includes('resizer')) {
    return `${toolName} Online — Resize Images Free | FixMyFile`;
  }
  if (lower.includes('cropper')) {
    return `${toolName} Online — Crop Images Free | FixMyFile`;
  }
  if (lower.includes('generator')) {
    return `${toolName} Online — Free Online Generator | FixMyFile`;
  }
  if (lower.includes('calculator')) {
    return `${toolName} Online — Free Online Calculator | FixMyFile`;
  }
  if (lower.includes('ocr')) {
    return `${toolName} Online — Free PDF & Image OCR | FixMyFile`;
  }
  if (lower.includes('to text')) {
    return `${toolName} (OCR) Online — Free Text Extraction | FixMyFile`;
  }
  if (lower.includes('text from pdf')) {
    return `${toolName} Online — Free Text Harvesting | FixMyFile`;
  }
  if (lower.includes('watermark')) {
    return `${toolName} Online — Add Watermarks Free | FixMyFile`;
  }
  if (lower.includes('upscaler')) {
    return `${toolName} Online — Enlarge Images Free | FixMyFile`;
  }
  if (lower.includes('counter')) {
    return `${toolName} Online — Free Text Analyzer | FixMyFile`;
  }
  if (lower.includes('remover')) {
    return `${toolName} Online — Remove Background Free | FixMyFile`;
  }

  return `${toolName} — Free Online Tool | FixMyFile`;
}

/**
 * Formats an optimal meta description (100 - 160 characters)
 */
export function formatToolDescription(description) {
  if (!description) return DEFAULT_SITE_METADATA.description;

  const trimmed = description.trim();
  if (trimmed.length >= 105 && trimmed.length <= 165) {
    return trimmed;
  }
  if (trimmed.length < 105) {
    // Append client-side privacy context
    return `${trimmed} Processed privately in your browser with FixMyFile.`;
  }
  return trimmed.slice(0, 157).trim() + '...';
}

/**
 * Returns full SEO metadata bundle for any pathname.
 */
export function getPageSEO(pathname) {
  const normalizedPath = pathname ? pathname.replace(/\/$/, '') || '/' : '/';

  if (normalizedPath === '/') {
    return {
      title: DEFAULT_SITE_METADATA.title,
      description: DEFAULT_SITE_METADATA.description,
      canonical: `${SITE_URL}/`,
      ogType: 'website',
      ogTitle: DEFAULT_SITE_METADATA.title,
      ogDescription: DEFAULT_SITE_METADATA.description,
      ogUrl: `${SITE_URL}/`,
      ogImage: DEFAULT_SITE_METADATA.image,
      twitterCard: 'summary',
      twitterTitle: DEFAULT_SITE_METADATA.title,
      twitterDescription: DEFAULT_SITE_METADATA.description,
      twitterImage: DEFAULT_SITE_METADATA.image,
      robots: 'index, follow'
    };
  }

  // Informational Pages
  const INFORMATIONAL_PAGES = {
    '/why-fixmyfile': {
      title: 'Why FixMyFile — Private, In-Browser File Utilities',
      description: 'Learn why FixMyFile uses client-side WebAssembly and Canvas to process PDFs, images, and videos directly in your browser with zero server uploads.'
    },
    '/contact': {
      title: 'Contact FixMyFile — Get in Touch',
      description: 'Contact FixMyFile for questions, feedback, bug reports, suggestions, and partnership inquiries.'
    },
    '/privacy': {
      title: 'Privacy Policy — FixMyFile',
      description: 'FixMyFile privacy policy. Learn how our client-first architecture processes your documents locally without cloud storage or tracking cookies.'
    },
    '/terms': {
      title: 'Terms & Conditions — FixMyFile',
      description: 'Terms of use for FixMyFile online file conversion and editing utilities. Free, client-side, and privacy-respecting tools.'
    },
    '/blog': {
      title: 'Blog & Practical Guides — FixMyFile',
      description: 'Expert guides, tutorials, and deep-dives on PDF compression, local OCR extraction, image conversion, and privacy-first web utilities.'
    }
  };

  if (INFORMATIONAL_PAGES[normalizedPath]) {
    const page = INFORMATIONAL_PAGES[normalizedPath];
    const canonical = `${SITE_URL}${normalizedPath}`;
    return {
      title: page.title,
      description: page.description,
      canonical,
      ogType: 'website',
      ogTitle: page.title,
      ogDescription: page.description,
      ogUrl: canonical,
      ogImage: DEFAULT_SITE_METADATA.image,
      twitterCard: 'summary',
      twitterTitle: page.title,
      twitterDescription: page.description,
      twitterImage: DEFAULT_SITE_METADATA.image,
      robots: 'index, follow'
    };
  }

  // Blog Article Pages (/blog/:slug)
  if (normalizedPath.startsWith('/blog/')) {
    const slug = normalizedPath.replace('/blog/', '');
    const article = getArticleBySlug(slug);

    if (article) {
      const canonical = `${SITE_URL}/blog/${article.slug}`;
      return {
        title: article.seoTitle || `${article.title} — FixMyFile`,
        description: article.seoDescription || article.excerpt,
        canonical,
        ogType: 'article',
        ogTitle: article.seoTitle || article.title,
        ogDescription: article.seoDescription || article.excerpt,
        ogUrl: canonical,
        ogImage: DEFAULT_SITE_METADATA.image,
        twitterCard: 'summary',
        twitterTitle: article.seoTitle || article.title,
        twitterDescription: article.seoDescription || article.excerpt,
        twitterImage: DEFAULT_SITE_METADATA.image,
        robots: 'index, follow',
        articleData: article
      };
    }
  }

  const tool = getToolByPath(normalizedPath);
  if (!tool) {
    // 404 or unknown route
    const notFoundTitle = 'Page Not Found — FixMyFile';
    const notFoundDesc = 'The requested file tool page could not be found on FixMyFile.';
    return {
      title: notFoundTitle,
      description: notFoundDesc,
      canonical: `${SITE_URL}${normalizedPath}`,
      ogType: 'website',
      ogTitle: notFoundTitle,
      ogDescription: notFoundDesc,
      ogUrl: `${SITE_URL}${normalizedPath}`,
      ogImage: DEFAULT_SITE_METADATA.image,
      twitterCard: 'summary',
      twitterTitle: notFoundTitle,
      twitterDescription: notFoundDesc,
      twitterImage: DEFAULT_SITE_METADATA.image,
      robots: 'noindex, follow'
    };
  }

  const title = formatToolTitle(tool.name);
  const description = formatToolDescription(tool.description);
  const canonical = `${SITE_URL}${tool.path}`;

  return {
    title,
    description,
    canonical,
    ogType: 'website',
    ogTitle: title,
    ogDescription: description,
    ogUrl: canonical,
    ogImage: DEFAULT_SITE_METADATA.image,
    twitterCard: 'summary',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: DEFAULT_SITE_METADATA.image,
    robots: 'index, follow',
    tool
  };
}
