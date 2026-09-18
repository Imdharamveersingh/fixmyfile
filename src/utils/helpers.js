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

/**
 * Format file size in human-readable format
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
