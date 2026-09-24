import React from 'react';
import ToolCard from './ToolCard';
import { getToolById } from '../tools/toolsRegistry';

/**
 * RelatedTools Component
 * Renders 3-4 intent-based related active tools using ToolCard V2.
 *
 * @param {string[]} relatedToolIds - Array of tool IDs to recommend
 */
export default function RelatedTools({ relatedToolIds = [] }) {
  if (!relatedToolIds || relatedToolIds.length === 0) return null;

  const validTools = relatedToolIds
    .map((id) => getToolById(id))
    .filter(Boolean);

  if (validTools.length === 0) return null;

  return (
    <section className="tool-related-section" aria-label="Explore related tools">
      <h2 className="tool-content-heading">Explore Related Tools</h2>
      <div className="tool-related-grid">
        {validTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}
