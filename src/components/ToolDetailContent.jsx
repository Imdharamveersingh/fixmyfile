import React from 'react';
import { getToolContent } from '../data/toolContent';
import ToolHowTo from './ToolHowTo';
import ToolFAQ from './ToolFAQ';
import RelatedTools from './RelatedTools';

/**
 * Universal ToolDetailContent Component
 * Renders standardized lower-page experience:
 * 1. Privacy/Processing Note (if applicable)
 * 2. How-to Guide (with attached numbering)
 * 3. Frequently Asked Questions (accessible accordion)
 * 4. Explore Related Tools (reusing ToolCard V2)
 *
 * @param {string} toolId - The active tool identifier
 */
export default function ToolDetailContent({ toolId }) {
  const content = getToolContent(toolId);
  if (!content) return null;

  return (
    <div className="tool-detail-content-area" aria-label="Tool documentation and related utilities">
      {/* 1. Processing & Privacy Note */}
      {content.privacyNote && (
        <div className="tool-privacy-note-card" role="note" aria-label="Privacy and processing architecture">
          <div className="tool-privacy-badge">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Client-Side Processing</span>
          </div>
          <p className="tool-privacy-text">{content.privacyNote}</p>
        </div>
      )}

      {/* 2. How-to Section */}
      {content.howTo && (
        <ToolHowTo title={content.howTo.title} steps={content.howTo.steps} />
      )}

      {/* 3. FAQ Section */}
      {content.faqs && content.faqs.length > 0 && (
        <ToolFAQ faqs={content.faqs} toolId={toolId} />
      )}

      {/* 4. Related Tools Section */}
      {content.relatedTools && content.relatedTools.length > 0 && (
        <RelatedTools relatedToolIds={content.relatedTools} />
      )}
    </div>
  );
}
