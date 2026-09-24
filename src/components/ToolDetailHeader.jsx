import React from 'react';
import { Link } from 'react-router-dom';
import { getToolById } from '../tools/toolsRegistry.js';

/**
 * ToolDetailHeader Component
 * Provides a standardized, accessible header and breadcrumb across all tool detail pages.
 *
 * Structure:
 * <nav aria-label="Breadcrumb">
 *   <ol className="tool-breadcrumb-list">
 *     <li><Link to="/">Home</Link></li>
 *     <li aria-hidden="true">/</li>
 *     <li aria-current="page">{toolName}</li>
 *   </ol>
 * </nav>
 * <h1>{title}</h1>
 * <p>{description}</p>
 *
 * @param {string} [toolId] - Unique tool identifier from toolsRegistry
 * @param {object} [tool] - Tool metadata object (alternative to toolId)
 * @param {string} [title] - Optional override for canonical H1 title
 * @param {string} [description] - Optional override for user-facing description
 * @param {string} [className] - Optional extra class name for wrapper
 */
export default function ToolDetailHeader({
  toolId,
  tool,
  title,
  description,
  className = ''
}) {
  const meta = tool || (toolId ? getToolById(toolId) : null);
  if (!meta) return null;

  const breadcrumbName = meta.name;
  const headingTitle = title || meta.name;
  const desc = description || meta.description;

  return (
    <header className={`tool-detail-header ${className}`}>
      {/* Semantic Breadcrumb Navigation */}
      <nav
        className="tool-detail-breadcrumb tool-breadcrumb-nav breadcrumb-nav tool-breadcrumbs breadcrumb"
        aria-label="Breadcrumb"
      >
        <ol className="tool-breadcrumb-list breadcrumb-list">
          <li className="tool-breadcrumb-item breadcrumb-item">
            <Link to="/" className="tool-breadcrumb-link breadcrumb-link">
              Home
            </Link>
          </li>
          <li
            className="tool-breadcrumb-separator breadcrumb-separator"
            aria-hidden="true"
          >
            /
          </li>
          <li
            className="tool-breadcrumb-item tool-breadcrumb-current breadcrumb-current"
            aria-current="page"
          >
            {breadcrumbName}
          </li>
        </ol>
      </nav>

      {/* Primary Canonical H1 */}
      <h1 className="tool-detail-h1 tool-h1 tool-title tool-main-title">
        {headingTitle}
      </h1>

      {/* User-Facing Natural Description */}
      {desc && (
        <p className="tool-detail-description tool-intro tool-description tool-subtitle">
          {desc}
        </p>
      )}
    </header>
  );
}
