import React from 'react';

/**
 * ToolHowTo Component
 * Renders normalized step-by-step instructions with unified numbering.
 *
 * @param {string} title - Section title (e.g. "How to Convert JPG to PDF Online")
 * @param {Array<{ title: string, description: string }>} steps - List of steps
 */
export default function ToolHowTo({ title, steps = [] }) {
  if (!steps || steps.length === 0) return null;

  return (
    <section className="tool-howto-section" aria-label="Step-by-step guide">
      <h2 className="tool-content-heading">{title || 'How to Use This Tool'}</h2>
      <div className="tool-howto-grid">
        {steps.map((step, idx) => (
          <div key={idx} className="tool-howto-card">
            <div className="tool-howto-header">
              <span className="tool-howto-number" aria-hidden="true">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <h3 className="tool-howto-title">{step.title}</h3>
            </div>
            <p className="tool-howto-desc">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
