/**
 * FixMyFile Supplied Category SVG Assets Mapping
 * Maps the 4 public homepage categories to their supplied SVG asset files
 * located in src/assets/
 */

export const CATEGORY_SVG_MAP = {
  'pdf-tools': new URL('../assets/pdf-tool.svg', import.meta.url).href,
  'image-tools': new URL('../assets/image-tool.svg', import.meta.url).href,
  'media-tools': new URL('../assets/media-tool.svg', import.meta.url).href,
  'generators': new URL('../assets/generator-tool.svg', import.meta.url).href,
  // Key aliases
  'pdf': new URL('../assets/pdf-tool.svg', import.meta.url).href,
  'image': new URL('../assets/image-tool.svg', import.meta.url).href,
  'media': new URL('../assets/media-tool.svg', import.meta.url).href
};

/**
 * Returns the SVG asset URL for a given category ID or key.
 * @param {string} categoryId
 * @returns {string|null}
 */
export function getCategorySvg(categoryId) {
  return CATEGORY_SVG_MAP[categoryId] || null;
}
