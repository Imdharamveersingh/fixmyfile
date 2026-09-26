import React from 'react';
import { getCategorySvg } from './categorySvgMap';

/**
 * CategorySectionHeading Component
 * Renders an inline decorative category SVG icon preceding the collection H2 title,
 * with the collection description underneath.
 *
 * @param {string|object} category - Category ID string or category object
 * @param {string} [title] - Optional title override
 * @param {string} [description] - Optional description override
 * @param {string} [subtitle] - Optional subtitle alias
 */
export default function CategorySectionHeading({ category, title, description, subtitle }) {
  const catId = typeof category === 'string' ? category : category?.id;
  const headingTitle = title || (typeof category === 'object' ? category?.title : '');
  const headingDesc = description || subtitle || (typeof category === 'object' ? category?.subtitle : '');
  const svgSrc = getCategorySvg(catId);

  return (
    <div className="section-header-content">
      <div className="tool-section-title-row">
        {svgSrc && (
          <img
            src={svgSrc}
            alt=""
            aria-hidden="true"
            focusable="false"
            width={32}
            height={32}
            className="tool-section-category-icon"
          />
        )}
        <h2 className="section-title">{headingTitle}</h2>
      </div>
      {headingDesc && <p className="section-subtitle">{headingDesc}</p>}
    </div>
  );
}
