import React, { useState } from 'react';

/**
 * ToolFAQ Component
 * Accessible disclosure/accordion FAQ component.
 *
 * @param {Array<{ question: string, answer: string }>} faqs - List of FAQs
 * @param {string} toolId - Unique tool identifier for accessible element IDs
 */
export default function ToolFAQ({ faqs = [], toolId = 'tool' }) {
  const [openIndices, setOpenIndices] = useState(() => new Set([0]));

  if (!faqs || faqs.length === 0) return null;

  const toggleItem = (idx) => {
    setOpenIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  return (
    <section className="tool-faq-section" aria-label="Frequently asked questions">
      <h2 className="tool-content-heading">Frequently Asked Questions</h2>
      <div className="tool-faq-list">
        {faqs.map((faq, idx) => {
          const isOpen = openIndices.has(idx);
          const btnId = `faq-btn-${toolId}-${idx}`;
          const contentId = `faq-panel-${toolId}-${idx}`;

          return (
            <div key={idx} className={`tool-faq-item ${isOpen ? 'is-open' : ''}`}>
              <h3 className="tool-faq-header">
                <button
                  type="button"
                  id={btnId}
                  className="tool-faq-trigger"
                  aria-expanded={isOpen}
                  aria-controls={contentId}
                  onClick={() => toggleItem(idx)}
                >
                  <span className="tool-faq-question">{faq.question}</span>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    focusable="false"
                    className={`tool-faq-chevron ${isOpen ? 'is-open' : ''}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </h3>
              <div
                id={contentId}
                role="region"
                aria-labelledby={btnId}
                hidden={!isOpen}
                className="tool-faq-panel"
              >
                <div className="tool-faq-answer">
                  <p>{faq.answer}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
