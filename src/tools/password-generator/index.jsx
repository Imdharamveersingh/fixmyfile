import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PRESETS,
  generatePassword
} from './passwordEngine';

export default function PasswordGeneratorTool() {
  // SEO
  useEffect(() => {
    document.title = 'Password Generator - Free Secure Random Password Generator | FixMyFile';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Generate strong, cryptographically secure passwords locally in your browser. Fully customizable length, character sets, and exclusion options. 100% private.'
      );
    }
  }, []);

  // Options State
  const [length, setLength] = useState(16);
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [excludeSimilar, setExcludeSimilar] = useState(false);

  // Generation seed to trigger re-generation on demand
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);

  const options = useMemo(
    () => ({
      length,
      uppercase,
      lowercase,
      numbers,
      symbols,
      excludeAmbiguous,
      excludeSimilar
    }),
    [length, uppercase, lowercase, numbers, symbols, excludeAmbiguous, excludeSimilar]
  );

  // Generate password reactively
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const result = useMemo(() => generatePassword(options), [options, seed]);

  const handleRegenerate = useCallback(() => {
    setSeed((s) => s + 1);
    setCopied(false);
  }, []);

  const handleApplyPreset = (preset) => {
    setLength(preset.length);
    setUppercase(preset.uppercase);
    setLowercase(preset.lowercase);
    setNumbers(preset.numbers);
    setSymbols(preset.symbols);
    setExcludeAmbiguous(preset.excludeAmbiguous);
    setExcludeSimilar(preset.excludeSimilar);
    setCopied(false);
  };

  const handleReset = () => {
    const strongPreset = PRESETS[1];
    handleApplyPreset(strongPreset);
  };

  const handleCopy = async () => {
    if (!result.password) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(result.password);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="tool-page password-tool-page">
      <div className="tool-header-area">
        <div className="tool-header-content">
          <span className="tool-badge">Phase 3 · Security</span>
          <h1 className="tool-title" id="password-tool-title">Password Generator Online</h1>
          <p className="tool-subtitle">
            Generate strong, cryptographically secure passwords locally in your browser
            using standard Web Crypto APIs. Zero server transmissions.
          </p>
          <span className="tool-format-badge">Web Crypto API</span>
        </div>
      </div>

      <div className="password-app-layout">
        <div className="password-card">
          {/* Presets Row */}
          <div className="password-presets-row">
            <span className="presets-label">Security Presets:</span>
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                id={`preset-${p.id}`}
                className="preset-pill-btn"
                onClick={() => handleApplyPreset(p)}
              >
                {p.name} ({p.length})
              </button>
            ))}
          </div>

          {/* Password Display Box */}
          <div className="password-output-box">
            <div className="password-display-text" id="generated-password-display">
              {result.password || <span className="empty-password-hint">Select at least one character set</span>}
            </div>
            <div className="password-output-actions">
              <button
                type="button"
                id="regenerate-password-btn"
                className="password-icon-btn"
                onClick={handleRegenerate}
                title="Generate new password"
                aria-label="Generate new password"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                </svg>
              </button>

              <button
                type="button"
                id="copy-password-btn"
                className="password-icon-btn copy-btn"
                onClick={handleCopy}
                disabled={!result.password}
                title="Copy password to clipboard"
                aria-label="Copy password to clipboard"
              >
                {copied ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Strength Meter */}
          {result.strength && (
            <div className="password-strength-container">
              <div className="strength-header">
                <span className="strength-title">Estimated Strength</span>
                <span className="strength-label-text" id="password-strength-label" style={{ color: result.strength.color }}>
                  {result.strength.label}
                </span>
              </div>
              <div className="strength-meter-track">
                <div
                  className="strength-meter-fill"
                  style={{
                    width: `${(result.strength.score / 5) * 100}%`,
                    backgroundColor: result.strength.color
                  }}
                />
              </div>
            </div>
          )}

          {/* Validation Error Banner */}
          {result.error && (
            <div className="password-error-banner" id="password-error-banner" role="alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{result.error}</span>
            </div>
          )}

          {/* Length Slider Control */}
          <div className="password-control-section">
            <div className="control-header-row">
              <label htmlFor="password-length-slider" className="control-label">Password Length</label>
              <div className="length-badge-wrap">
                <input
                  type="number"
                  id="password-length-input"
                  min="8"
                  max="128"
                  className="length-number-input"
                  value={length}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setLength(Math.max(8, Math.min(128, val)));
                  }}
                />
                <span className="length-unit">chars</span>
              </div>
            </div>
            <input
              type="range"
              id="password-length-slider"
              min="8"
              max="128"
              value={length}
              onChange={(e) => setLength(parseInt(e.target.value, 10))}
              className="password-range-slider"
            />
            <div className="slider-range-hints">
              <span>8</span>
              <span>32</span>
              <span>64</span>
              <span>128</span>
            </div>
          </div>

          {/* Character Sets Checklist */}
          <div className="password-options-grid">
            <label className="checkbox-row">
              <input
                type="checkbox"
                id="chk-uppercase"
                checked={uppercase}
                onChange={(e) => setUppercase(e.target.checked)}
              />
              <span className="checkbox-label">Uppercase Letters (A–Z)</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                id="chk-lowercase"
                checked={lowercase}
                onChange={(e) => setLowercase(e.target.checked)}
              />
              <span className="checkbox-label">Lowercase Letters (a–z)</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                id="chk-numbers"
                checked={numbers}
                onChange={(e) => setNumbers(e.target.checked)}
              />
              <span className="checkbox-label">Numbers (0–9)</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                id="chk-symbols"
                checked={symbols}
                onChange={(e) => setSymbols(e.target.checked)}
              />
              <span className="checkbox-label">Symbols (!@#$%^&*)</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                id="chk-exclude-ambiguous"
                checked={excludeAmbiguous}
                onChange={(e) => setExcludeAmbiguous(e.target.checked)}
              />
              <span className="checkbox-label">Avoid Ambiguous Characters (O, 0, I, 1, l)</span>
            </label>

            <label className="checkbox-row">
              <input
                type="checkbox"
                id="chk-exclude-similar"
                checked={excludeSimilar}
                onChange={(e) => setExcludeSimilar(e.target.checked)}
              />
              <span className="checkbox-label">Avoid Similar Delimiters (brackets, slashes)</span>
            </label>
          </div>

          {/* Actions */}
          <div className="password-actions-row">
            <button
              type="button"
              className="workbench-btn workbench-btn-primary"
              id="action-regenerate-btn"
              onClick={handleRegenerate}
              disabled={!result.password}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
              </svg>
              <span>Generate New Password</span>
            </button>

            <button
              type="button"
              className="workbench-btn workbench-btn-outline"
              id="reset-password-btn"
              onClick={handleReset}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              <span>Reset Defaults</span>
            </button>
          </div>

          {/* Security Notice */}
          <div className="password-security-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span>Generated completely on your device using <code>window.crypto.getRandomValues</code>. Passwords are never sent across the internet, logged, or saved.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
