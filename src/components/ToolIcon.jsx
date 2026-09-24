import React from 'react';
import { TOOL_SVG_MAP } from './toolSvgMap.js';
import { TOOL_ICON_DEFS } from './toolIconDefs.js';

export { TOOL_SVG_MAP, TOOL_ICON_DEFS };

/**
 * ToolIcon Component
 * Renders the supplied SVG asset for tool cards, or falls back to
 * centralized vector definitions for non-tool icons (mail, copy, check, default).
 *
 * @param {string} icon - The icon identifier or tool id
 * @param {number} size - Pixel size (default: 32)
 * @param {string} className - Optional extra CSS class
 */
export default function ToolIcon({ icon, size = 32, className = '' }) {
  const svgSrc = TOOL_SVG_MAP[icon];

  if (svgSrc) {
    return (
      <img
        src={svgSrc}
        alt=""
        aria-hidden="true"
        focusable="false"
        width={size}
        height={size}
        className={`tool-icon-svg ${className}`.trim()}
      />
    );
  }

  const elements = TOOL_ICON_DEFS[icon] || TOOL_ICON_DEFS.default;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`tool-icon-svg ${className}`.trim()}
    >
      {elements.map((el, i) =>
        React.createElement(el.tag, { key: i, ...el.attrs })
      )}
    </svg>
  );
}
