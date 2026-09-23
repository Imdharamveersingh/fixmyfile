import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getPageSEO, DEFAULT_SITE_METADATA } from '../config/seoConfig';

function setMetaTag(selector, attribute, attributeValue, content) {
  if (typeof document === 'undefined') return;
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonicalTag(url) {
  if (typeof document === 'undefined') return;
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function setStructuredData(seo) {
  if (typeof document === 'undefined') return;
  let script = document.head.querySelector('script#fixmyfile-structured-data');
  if (!script) {
    script = document.createElement('script');
    script.setAttribute('id', 'fixmyfile-structured-data');
    script.setAttribute('type', 'application/ld+json');
    document.head.appendChild(script);
  }

  const schema = seo.tool
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: seo.tool.name,
        url: seo.canonical,
        description: seo.description,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        }
      }
    : {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'FixMyFile',
        url: seo.canonical,
        description: seo.description
      };

  script.textContent = JSON.stringify(schema);
}

export function updateDocumentSEO(pathname) {
  if (typeof document === 'undefined') return;
  const seo = getPageSEO(pathname);

  // 1. Document Title
  document.title = seo.title;

  // 2. Standard Meta
  setMetaTag('meta[name="description"]', 'name', 'description', seo.description);
  setMetaTag('meta[name="robots"]', 'name', 'robots', seo.robots);
  setCanonicalTag(seo.canonical);

  // 3. Open Graph
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', seo.ogTitle);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', seo.ogDescription);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', seo.ogUrl);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', seo.ogType);
  setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', DEFAULT_SITE_METADATA.siteName);
  if (seo.ogImage) {
    setMetaTag('meta[property="og:image"]', 'property', 'og:image', seo.ogImage);
  }

  // 4. Twitter Card
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', seo.twitterCard);
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', seo.twitterTitle);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', seo.twitterDescription);
  if (seo.twitterImage) {
    setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', seo.twitterImage);
  }

  // 5. Schema.org JSON-LD
  setStructuredData(seo);
}

export default function SEO() {
  const location = useLocation();

  useEffect(() => {
    // Immediate update
    updateDocumentSEO(location.pathname);

    // Microtask/AnimationFrame reinforcement to ensure precedence over any legacy unmount cleanups
    const timer = setTimeout(() => {
      updateDocumentSEO(location.pathname);
    }, 0);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return null;
}
