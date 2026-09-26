/**
 * FixMyFile Deterministic Tool Accent Color Map
 * Maps each of the 49 active tool IDs to its SVG-derived primary accent color,
 * 1px subtle border color (approx. 25-35% opacity), and hover border color.
 *
 * Source: Derived deterministically from the primary color of each SVG in
 * src/assets/fixmyfile-49-svg-icons/
 */

export const TOOL_ACCENT_MAP = {
  'jpg-to-pdf': { primary: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)', hoverBorder: 'rgba(59, 130, 246, 0.65)' },
  'pdf-to-word': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'pdf-to-jpg': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'word-to-pdf': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'merge-pdf': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'compress-pdf': { primary: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)', hoverBorder: 'rgba(59, 130, 246, 0.65)' },
  'background-remover': { primary: '#EC4899', border: 'rgba(236, 72, 153, 0.3)', hoverBorder: 'rgba(236, 72, 153, 0.65)' },
  'image-compressor': { primary: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)', hoverBorder: 'rgba(59, 130, 246, 0.65)' },
  'image-resizer': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'image-converter': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'jpg-to-png': { primary: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)', hoverBorder: 'rgba(59, 130, 246, 0.65)' },
  'png-to-jpg': { primary: '#F97316', border: 'rgba(249, 115, 22, 0.3)', hoverBorder: 'rgba(249, 115, 22, 0.65)' },
  'qr-code-generator': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'barcode-generator': { primary: '#111827', border: 'rgba(17, 24, 39, 0.3)', hoverBorder: 'rgba(17, 24, 39, 0.65)' },
  'currency-converter': { primary: '#10B981', border: 'rgba(16, 185, 129, 0.3)', hoverBorder: 'rgba(16, 185, 129, 0.65)' },
  'percentage-calculator': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'password-generator': { primary: '#DB2777', border: 'rgba(219, 39, 119, 0.3)', hoverBorder: 'rgba(219, 39, 119, 0.65)' },
  'word-counter': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'emi-calculator': { primary: '#F97316', border: 'rgba(249, 115, 22, 0.3)', hoverBorder: 'rgba(249, 115, 22, 0.65)' },
  'split-pdf': { primary: '#10B981', border: 'rgba(16, 185, 129, 0.3)', hoverBorder: 'rgba(16, 185, 129, 0.65)' },
  'pdf-to-excel': { primary: '#10B981', border: 'rgba(16, 185, 129, 0.3)', hoverBorder: 'rgba(16, 185, 129, 0.65)' },
  'pdf-to-powerpoint': { primary: '#F97316', border: 'rgba(249, 115, 22, 0.3)', hoverBorder: 'rgba(249, 115, 22, 0.65)' },
  'rotate-pdf': { primary: '#F97316', border: 'rgba(249, 115, 22, 0.3)', hoverBorder: 'rgba(249, 115, 22, 0.65)' },
  'protect-pdf': { primary: '#DB2777', border: 'rgba(219, 39, 119, 0.3)', hoverBorder: 'rgba(219, 39, 119, 0.65)' },
  'unlock-pdf': { primary: '#7C3AED', border: 'rgba(124, 58, 237, 0.3)', hoverBorder: 'rgba(124, 58, 237, 0.65)' },
  'pdf-to-text': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'extract-pdf-pages': { primary: '#EC4899', border: 'rgba(236, 72, 153, 0.3)', hoverBorder: 'rgba(236, 72, 153, 0.65)' },
  'delete-pdf-pages': { primary: '#DC2626', border: 'rgba(220, 38, 38, 0.3)', hoverBorder: 'rgba(220, 38, 38, 0.65)' },
  'reorder-pdf-pages': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'heic-to-jpg': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'webp-to-jpg': { primary: '#10B981', border: 'rgba(16, 185, 129, 0.3)', hoverBorder: 'rgba(16, 185, 129, 0.65)' },
  'jpg-to-webp': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'webp-to-png': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'image-rotate-flip': { primary: '#F97316', border: 'rgba(249, 115, 22, 0.3)', hoverBorder: 'rgba(249, 115, 22, 0.65)' },
  'image-watermark': { primary: '#0EA5E9', border: 'rgba(14, 165, 233, 0.3)', hoverBorder: 'rgba(14, 165, 233, 0.65)' },
  'image-to-pdf': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'image-upscaler': { primary: '#10B981', border: 'rgba(16, 185, 129, 0.3)', hoverBorder: 'rgba(16, 185, 129, 0.65)' },
  'image-to-base64': { primary: '#2563EB', border: 'rgba(37, 99, 235, 0.3)', hoverBorder: 'rgba(37, 99, 235, 0.65)' },
  'mp4-to-mp3': { primary: '#F97316', border: 'rgba(249, 115, 22, 0.3)', hoverBorder: 'rgba(249, 115, 22, 0.65)' },
  'video-compressor': { primary: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)', hoverBorder: 'rgba(59, 130, 246, 0.65)' },
  'video-to-gif': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'gif-maker': { primary: '#EC4899', border: 'rgba(236, 72, 153, 0.3)', hoverBorder: 'rgba(236, 72, 153, 0.65)' },
  'image-to-text': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'pdf-ocr': { primary: '#10B981', border: 'rgba(16, 185, 129, 0.3)', hoverBorder: 'rgba(16, 185, 129, 0.65)' },
  'jpg-to-text': { primary: '#3B82F6', border: 'rgba(59, 130, 246, 0.3)', hoverBorder: 'rgba(59, 130, 246, 0.65)' },
  'png-to-text': { primary: '#10B981', border: 'rgba(16, 185, 129, 0.3)', hoverBorder: 'rgba(16, 185, 129, 0.65)' },
  'screenshot-to-text': { primary: '#EC4899', border: 'rgba(236, 72, 153, 0.3)', hoverBorder: 'rgba(236, 72, 153, 0.65)' },
  'extract-text-from-pdf': { primary: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)', hoverBorder: 'rgba(139, 92, 246, 0.65)' },
  'image-cropper': { primary: '#F97316', border: 'rgba(249, 115, 22, 0.3)', hoverBorder: 'rgba(249, 115, 22, 0.65)' }
};

/**
 * Returns the accent color configuration for a given tool ID.
 * @param {string} toolId
 * @returns {{ primary: string, border: string, hoverBorder: string }}
 */
export function getToolAccent(toolId) {
  return TOOL_ACCENT_MAP[toolId] || {
    primary: '#2563EB',
    border: 'rgba(37, 99, 235, 0.3)',
    hoverBorder: 'rgba(37, 99, 235, 0.65)'
  };
}

/**
 * Returns the primary accent color for a tool.
 * @param {string} toolId
 * @returns {string} Hex color
 */
export function getToolAccentColor(toolId) {
  return getToolAccent(toolId).primary;
}

/**
 * Returns the subtle border color (approx. 30% opacity) for a tool.
 * @param {string} toolId
 * @returns {string} RGBA color string
 */
export function getToolBorderColor(toolId) {
  return getToolAccent(toolId).border;
}

/**
 * Returns the hover border color (approx. 65% opacity) for a tool.
 * @param {string} toolId
 * @returns {string} RGBA color string
 */
export function getToolHoverBorderColor(toolId) {
  return getToolAccent(toolId).hoverBorder;
}
