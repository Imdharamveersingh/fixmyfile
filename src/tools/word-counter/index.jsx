import React, { useState, useEffect, useMemo } from 'react';
import ToolDetailContent from '../../components/ToolDetailContent';
import { analyzeText } from './wordEngine';

const SAMPLE_TEXT =
  'FixMyFile is a fast, reliable utility tools platform built for modern workflows. All operations happen directly in your web browser with 100% client-side privacy.\n\nनमस्ते भारत! FixMyFile supports multi-lingual text processing seamlessly. Try writing in English, Hindi, or any other language.';

export default function WordCounterTool() {
  // SEO
  useEffect(() => {
    document.title = 'Word Counter - Free Online Word Count & Text Analyzer | FixMyFile';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Free online word counter and text statistics analyzer. Count words, characters, sentences, paragraphs, reading time, and speaking time client-side with full Unicode and multi-lingual support.'
      );
    }
  }, []);

  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => analyzeText(text), [text]);

  const handleClear = () => {
    setText('');
    setCopied(false);
  };

  const handleLoadSample = () => {
    setText(SAMPLE_TEXT);
    setCopied(false);
  };

  const handleCopyText = async () => {
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="tool-page word-counter-page">
      <div className="tool-header-area">
        <div className="tool-header-content">
          <span className="tool-badge">Text Utility</span>
          <h1 className="tool-title" id="word-counter-tool-title">Word Counter Online</h1>
          <p className="tool-subtitle">
            Live text analytics and metric counter. Analyze words, characters, sentences,
            paragraphs, and reading time in real time.
          </p>
          <span className="tool-format-badge">Unicode-Aware Engine</span>
        </div>
      </div>

      <div className="word-counter-app-layout">
        <div className="word-counter-card">
          {/* Top Quick Stats Grid */}
          <div className="counter-stats-grid">
            <div className="counter-stat-box primary-stat">
              <span className="stat-number" id="stat-words">{stats.words}</span>
              <span className="stat-label">Words</span>
            </div>
            <div className="counter-stat-box primary-stat">
              <span className="stat-number" id="stat-characters">{stats.characters}</span>
              <span className="stat-label">Characters</span>
            </div>
            <div className="counter-stat-box">
              <span className="stat-number" id="stat-chars-no-spaces">{stats.charactersNoSpaces}</span>
              <span className="stat-label">Chars (no spaces)</span>
            </div>
            <div className="counter-stat-box">
              <span className="stat-number" id="stat-sentences">{stats.sentences}</span>
              <span className="stat-label">Sentences</span>
            </div>
            <div className="counter-stat-box">
              <span className="stat-number" id="stat-paragraphs">{stats.paragraphs}</span>
              <span className="stat-label">Paragraphs</span>
            </div>
            <div className="counter-stat-box">
              <span className="stat-number" id="stat-lines">{stats.lines}</span>
              <span className="stat-label">Lines</span>
            </div>
          </div>

          {/* Text Area Input */}
          <div className="counter-textarea-wrap">
            <textarea
              id="word-counter-textarea"
              className="counter-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type, paste, or drag your text here..."
              rows={10}
              autoComplete="off"
              spellCheck="true"
            />
          </div>

          {/* Secondary Reading & Average Stats */}
          <div className="counter-secondary-bar">
            <div className="sec-stat-item">
              <span className="sec-stat-label">Reading Time (est.):</span>
              <strong className="sec-stat-val" id="stat-reading-time">{stats.readingTime}</strong>
            </div>
            <div className="sec-stat-item">
              <span className="sec-stat-label">Speaking Time (est.):</span>
              <strong className="sec-stat-val" id="stat-speaking-time">{stats.speakingTime}</strong>
            </div>
            <div className="sec-stat-item">
              <span className="sec-stat-label">Avg. Word Length:</span>
              <strong className="sec-stat-val" id="stat-avg-word-len">{stats.avgWordLength} chars</strong>
            </div>
            <div className="sec-stat-item">
              <span className="sec-stat-label">Avg. Sentence:</span>
              <strong className="sec-stat-val" id="stat-avg-sentence-len">{stats.avgSentenceLength} words</strong>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="counter-actions-bar">
            <div className="counter-action-left">
              <button
                type="button"
                id="word-counter-copy-btn"
                className="workbench-btn workbench-btn-primary"
                onClick={handleCopyText}
                disabled={!text}
              >
                {copied ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="word-counter-sample-btn"
                className="workbench-btn workbench-btn-secondary"
                onClick={handleLoadSample}
              >
                Insert Sample
              </button>
            </div>

            <button
              type="button"
              id="word-counter-clear-btn"
              className="workbench-btn workbench-btn-outline"
              onClick={handleClear}
              disabled={!text}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              <span>Clear</span>
            </button>
          </div>

          {/* Privacy Disclaimer */}
          <div className="counter-privacy-note">
            <span>Your text is processed 100% locally in your browser. Nothing is ever sent to any server or recorded.</span>
          </div>
        </div>
      </div>

      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="word-counter" />
    </div>
  );
}
