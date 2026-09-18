/**
 * Common helper utilities
 */

/**
 * Format string to slug or path
 */
export function formatToolPath(slug) {
  if (!slug) return '/';
  return slug.startsWith('/') ? slug : `/${slug}`;
}
