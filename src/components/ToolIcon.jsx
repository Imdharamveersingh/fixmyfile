import React from 'react';
import { TOOL_ICON_DEFS } from './toolIconDefs.js';

export { TOOL_ICON_DEFS };

/**
 * ToolIcon Component
 * Renders a lightweight, crisp SVG icon from centralized definitions.
 *
 * @param {string} icon - The icon identifier or tool id
 * @param {number} size - Pixel size (default: 22)
 * @param {string} className - Optional extra CSS class
 */
export default function ToolIcon({ icon, size = 22, className = '' }) {
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
