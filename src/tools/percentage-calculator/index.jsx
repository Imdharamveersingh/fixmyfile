import React, { useState, useEffect, useMemo } from 'react';
import {
  PERCENTAGE_MODES,
  calculatePercentage
} from './percentageEngine';

export default function PercentageCalculatorTool() {
  // SEO
  useEffect(() => {
    document.title = 'Percentage Calculator - Free Online Percentage Calculator | FixMyFile';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Free online percentage calculator. Calculate percentages, percentage increase or decrease, find percentage of a number, add or subtract percentages easily.'
      );
    }
  }, []);

  // State
  const [activeModeId, setActiveModeId] = useState('what-is-p-of-y');
  const [inputX, setInputX] = useState('20');
  const [inputY, setInputY] = useState('500');
  const [copied, setCopied] = useState(false);

  const activeMode = useMemo(
    () => PERCENTAGE_MODES.find((m) => m.id === activeModeId) || PERCENTAGE_MODES[0],
    [activeModeId]
  );

  // When switching modes, set sensible defaults if empty
  const handleSelectMode = (modeId) => {
    setActiveModeId(modeId);
    const mode = PERCENTAGE_MODES.find((m) => m.id === modeId);
    if (mode) {
      setInputX(mode.placeholderX);
      setInputY(mode.placeholderY);
    }
    setCopied(false);
  };

  // Calculation
  const calculation = useMemo(
    () => calculatePercentage(activeModeId, inputX, inputY),
    [activeModeId, inputX, inputY]
  );

  // Reset
  const handleReset = () => {
    setInputX(activeMode.placeholderX);
    setInputY(activeMode.placeholderY);
    setCopied(false);
  };

  // Copy result
  const handleCopyResult = async () => {
    if (!calculation || calculation.error) return;
    const textToCopy = `${calculation.formula} = ${calculation.formattedResult}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="tool-page percentage-tool-page">
      <div className="tool-header-area">
        <div className="tool-header-content">
          <span className="tool-badge">Calculator</span>
          <h1 className="tool-title" id="percentage-tool-title">Percentage Calculator Online</h1>
          <p className="tool-subtitle">
            Calculate percentage values, percentage changes, additions, and subtractions
            instantly with formula explanations.
          </p>
          <span className="tool-format-badge">5 Calculation Modes</span>
        </div>
      </div>

      <div className="percentage-app-layout">
        <div className="percentage-card">
          {/* Mode Tabs */}
          <div className="percentage-mode-tabs" id="percentage-mode-tabs" role="tablist">
            {PERCENTAGE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                id={`tab-${mode.id}`}
                role="tab"
                aria-selected={activeModeId === mode.id}
                className={`mode-tab-btn ${activeModeId === mode.id ? 'active' : ''}`}
                onClick={() => handleSelectMode(mode.id)}
              >
                {mode.shortTitle}
              </button>
            ))}
          </div>

          {/* Mode Description & Formula Bar */}
          <div className="percentage-mode-header">
            <h2 className="mode-heading">{activeMode.name}</h2>
            <p className="mode-desc">{activeMode.desc}</p>
            <div className="mode-formula-pill">
              <code>{activeMode.formula}</code>
            </div>
          </div>

          {/* Inputs Row */}
          <div className="percentage-inputs-grid">
            <div className="percentage-field">
              <label htmlFor="percentage-input-x" className="percentage-label">
                {activeMode.labelX}
              </label>
              <input
                type="text"
                id="percentage-input-x"
                className="percentage-input"
                value={inputX}
                onChange={(e) => setInputX(e.target.value)}
                placeholder={activeMode.placeholderX}
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            <div className="percentage-field">
              <label htmlFor="percentage-input-y" className="percentage-label">
                {activeMode.labelY}
              </label>
              <input
                type="text"
                id="percentage-input-y"
                className="percentage-input"
                value={inputY}
                onChange={(e) => setInputY(e.target.value)}
                placeholder={activeMode.placeholderY}
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>

          {/* Error Message */}
          {calculation.error && (
            <div className="percentage-error-banner" id="percentage-error" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{calculation.error}</span>
            </div>
          )}

          {/* Result Box */}
          {!calculation.error && (
            <div className="percentage-result-box" id="percentage-result-box">
              <div className="result-caption">Calculation Result</div>
              <div className="result-number">
                {calculation.formattedResult}
              </div>
              <div className="result-formula-text">
                {calculation.formula}
              </div>

              {/* Breakdown Steps */}
              {calculation.steps && calculation.steps.length > 0 && (
                <div className="percentage-breakdown" id="percentage-breakdown">
                  <span className="breakdown-title">Step-by-step breakdown:</span>
                  <ol className="breakdown-list">
                    {calculation.steps.map((step, idx) => (
                      <li key={idx} className="breakdown-step">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="percentage-actions-row">
            <button
              type="button"
              id="copy-percentage-btn"
              className="workbench-btn workbench-btn-primary"
              onClick={handleCopyResult}
              disabled={!calculation || Boolean(calculation.error)}
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
                  <span>Copy Result</span>
                </>
              )}
            </button>

            <button
              type="button"
              id="reset-percentage-btn"
              className="workbench-btn workbench-btn-outline"
              onClick={handleReset}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
