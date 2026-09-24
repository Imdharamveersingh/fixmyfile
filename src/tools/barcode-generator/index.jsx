import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import {
  BARCODE_FORMATS,
  generateBarcodeSvg,
  generateBarcodePng,
  calculateContrast,
  sanitizeFilename,
  getFormatById
} from './barcodeEngine';

/* ── Color Presets ───────────────────────────────────────────────── */

const FG_PRESETS = [
  { name: 'Classic Black', hex: '#000000' },
  { name: 'Slate Gray', hex: '#1e293b' },
  { name: 'Navy Blue', hex: '#1e3a8a' },
  { name: 'Deep Indigo', hex: '#4338ca' },
  { name: 'Forest Green', hex: '#065f46' },
  { name: 'Burgundy', hex: '#881337' }
];

const BG_PRESETS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Warm White', hex: '#fafaf9' },
  { name: 'Soft Ice', hex: '#f0f9ff' },
  { name: 'Cream', hex: '#fefce8' },
  { name: 'Midnight', hex: '#0f172a' }
];

/* ── Component ───────────────────────────────────────────────────── */

export default function BarcodeGeneratorTool() {
  // SEO
  useEffect(() => {
    document.title = 'Barcode Generator - Free Online Barcode Maker | FixMyFile';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Create customizable barcodes online with support for CODE 128, CODE 39, EAN-13, EAN-8, UPC-A, ITF-14, ITF, and Codabar. Generate and download barcodes as PNG or SVG directly in your browser.'
      );
    }
  }, []);

  // Core state
  const [barcodeFormat, setBarcodeFormat] = useState('CODE128');
  const [inputValue, setInputValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  // Appearance
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [barWidth, setBarWidth] = useState(2);
  const [barHeight, setBarHeight] = useState(100);
  const [margin, setMargin] = useState(10);
  const [displayValue, setDisplayValue] = useState(true);
  const [fontSize, setFontSize] = useState(20);
  const [textPosition, setTextPosition] = useState('bottom');

  // UI state
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [copyValueSuccess, setCopyValueSuccess] = useState(false);
  const [copySvgSuccess, setCopySvgSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Debounce (immediate when empty)
  useEffect(() => {
    if (!inputValue || inputValue.trim() === '') {
      setDebouncedValue('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue && inputValue.trim() !== '' ? inputValue : '');
    }, 120);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Format info
  const currentFormat = useMemo(() => getFormatById(barcodeFormat), [barcodeFormat]);

  // Validation
  const validationError = useMemo(() => {
    if (!debouncedValue) return null;
    if (!currentFormat) return 'Unknown barcode format.';
    return currentFormat.validate(debouncedValue);
  }, [debouncedValue, currentFormat]);

  const hasContent = debouncedValue.trim().length > 0;
  const isValid = hasContent && !validationError;

  // Contrast
  const contrastInfo = useMemo(() => calculateContrast(fgColor, bgColor), [fgColor, bgColor]);
  const isLowContrast = contrastInfo.ratio < 3;

  // SVG string
  const svgString = useMemo(() => {
    if (!isValid) return null;
    try {
      return generateBarcodeSvg({
        value: debouncedValue,
        format: currentFormat.jsbFormat,
        lineColor: fgColor,
        background: bgColor,
        width: barWidth,
        height: barHeight,
        margin,
        displayValue,
        fontSize,
        textPosition
      });
    } catch {
      return null;
    }
  }, [isValid, debouncedValue, currentFormat, fgColor, bgColor, barWidth, barHeight, margin, displayValue, fontSize, textPosition]);

  // Download SVG
  const handleDownloadSvg = useCallback(() => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sanitizeFilename(debouncedValue)}-barcode.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [svgString, debouncedValue]);

  // Download PNG
  const handleDownloadPng = useCallback(async () => {
    if (!isValid) return;
    setIsGeneratingPng(true);
    try {
      const pngBlob = await generateBarcodePng({
        value: debouncedValue,
        format: currentFormat.jsbFormat,
        lineColor: fgColor,
        background: bgColor,
        width: barWidth,
        height: barHeight,
        margin,
        displayValue,
        fontSize,
        textPosition,
        scaleFactor: 2
      });
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeFilename(debouncedValue)}-barcode.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(`PNG download failed: ${err.message}`);
    } finally {
      setIsGeneratingPng(false);
    }
  }, [isValid, debouncedValue, currentFormat, fgColor, bgColor, barWidth, barHeight, margin, displayValue, fontSize, textPosition]);

  // Copy Value
  const handleCopyValue = useCallback(async () => {
    if (!debouncedValue) return;
    try {
      await navigator.clipboard.writeText(debouncedValue);
      setCopyValueSuccess(true);
      setTimeout(() => setCopyValueSuccess(false), 2000);
    } catch {
      setErrorMessage('Clipboard access unavailable. Try copying manually.');
    }
  }, [debouncedValue]);

  // Copy SVG
  const handleCopySvg = useCallback(async () => {
    if (!svgString) return;
    try {
      await navigator.clipboard.writeText(svgString);
      setCopySvgSuccess(true);
      setTimeout(() => setCopySvgSuccess(false), 2000);
    } catch {
      setErrorMessage('Clipboard access unavailable. Try copying manually.');
    }
  }, [svgString]);

  // Reset
  const handleReset = () => {
    setInputValue('');
    setDebouncedValue('');
    setBarcodeFormat('CODE128');
    setFgColor('#000000');
    setBgColor('#ffffff');
    setBarWidth(2);
    setBarHeight(100);
    setMargin(10);
    setDisplayValue(true);
    setFontSize(20);
    setTextPosition('bottom');
    setErrorMessage(null);
  };

  return (
    <div className="tool-page barcode-tool-page">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="barcode-generator"
        title="Barcode Generator Online"
        description="Create real, machine-readable 1D barcodes in your browser. Supports CODE 128, CODE 39, EAN-13, EAN-8, UPC-A, ITF-14, ITF, and Codabar. Download as PNG or SVG."
      />

      <div className="barcode-app-layout">
        {/* ── LEFT: Configuration ────────────────────────────── */}
        <div className="barcode-config-panel">
          <div className="workspace-tool-icon-wrap" aria-hidden="true"><ToolIcon icon="barcode-generator" size={48} /></div>

          {/* Format Selector */}
          <div className="barcode-section">
            <h2 className="barcode-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Barcode Format
            </h2>
            <select
              className="barcode-format-select"
              value={barcodeFormat}
              onChange={(e) => {
                setBarcodeFormat(e.target.value);
                setInputValue('');
                setDebouncedValue('');
                setErrorMessage(null);
              }}
              id="barcode-format-select"
              aria-label="Select barcode format"
            >
              {BARCODE_FORMATS.map((fmt) => (
                <option key={fmt.id} value={fmt.id}>{fmt.name}</option>
              ))}
            </select>
            {currentFormat && (
              <div className="barcode-format-info">
                <span className="format-info-desc">{currentFormat.description}</span>
                <span className="format-info-hint">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  {currentFormat.hint}
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="barcode-section">
            <h2 className="barcode-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>
              Barcode Value
            </h2>
            <input
              type="text"
              className="barcode-value-input"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setErrorMessage(null);
              }}
              placeholder={currentFormat ? currentFormat.hint : 'Enter value...'}
              id="barcode-value-input"
              aria-label="Barcode value input"
              autoComplete="off"
              spellCheck="false"
            />
            {validationError && (
              <div className="barcode-validation-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {validationError}
              </div>
            )}
            {errorMessage && (
              <div className="barcode-validation-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {errorMessage}
              </div>
            )}
          </div>

          {/* Appearance */}
          <div className="barcode-section">
            <h2 className="barcode-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17 2H7a5 5 0 00-5 5v10a5 5 0 005 5h10a5 5 0 005-5V7a5 5 0 00-5-5z"/></svg>
              Appearance
            </h2>

            {/* Colors */}
            <div className="barcode-row-2col">
              <div className="barcode-field-group">
                <label className="barcode-label">Bar Color</label>
                <div className="barcode-color-row">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="barcode-color-picker"
                    id="barcode-fg-color"
                    aria-label="Barcode foreground color"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setFgColor(e.target.value)}
                    className="barcode-hex-input"
                    maxLength={7}
                    aria-label="Foreground hex color"
                  />
                </div>
                <div className="barcode-color-presets">
                  {FG_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      className={`barcode-preset-swatch${fgColor === p.hex ? ' active' : ''}`}
                      style={{ backgroundColor: p.hex }}
                      onClick={() => setFgColor(p.hex)}
                      title={p.name}
                      aria-label={`Set bar color to ${p.name}`}
                    />
                  ))}
                </div>
              </div>

              <div className="barcode-field-group">
                <label className="barcode-label">Background</label>
                <div className="barcode-color-row">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="barcode-color-picker"
                    id="barcode-bg-color"
                    aria-label="Barcode background color"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && setBgColor(e.target.value)}
                    className="barcode-hex-input"
                    maxLength={7}
                    aria-label="Background hex color"
                  />
                </div>
                <div className="barcode-color-presets">
                  {BG_PRESETS.map((p) => (
                    <button
                      key={p.hex}
                      type="button"
                      className={`barcode-preset-swatch${bgColor === p.hex ? ' active' : ''}`}
                      style={{ backgroundColor: p.hex, border: p.hex === '#ffffff' || p.hex === '#fafaf9' ? '1px solid #cbd5e1' : 'none' }}
                      onClick={() => setBgColor(p.hex)}
                      title={p.name}
                      aria-label={`Set background to ${p.name}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Contrast Warning */}
            {isLowContrast && (
              <div className="barcode-contrast-warning" role="alert" id="barcode-contrast-warning">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>Low contrast ({contrastInfo.ratio}:1). Barcode may not scan reliably. Recommended minimum: 3:1.</span>
              </div>
            )}

            {/* Sliders */}
            <div className="barcode-row-2col">
              <div className="barcode-field-group">
                <label className="barcode-label">Bar Width: {barWidth}px</label>
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="0.5"
                  value={barWidth}
                  onChange={(e) => setBarWidth(parseFloat(e.target.value))}
                  className="barcode-slider"
                  id="barcode-bar-width"
                  aria-label="Bar width"
                />
              </div>
              <div className="barcode-field-group">
                <label className="barcode-label">Height: {barHeight}px</label>
                <input
                  type="range"
                  min="40"
                  max="200"
                  step="10"
                  value={barHeight}
                  onChange={(e) => setBarHeight(parseInt(e.target.value))}
                  className="barcode-slider"
                  id="barcode-bar-height"
                  aria-label="Bar height"
                />
              </div>
            </div>

            <div className="barcode-row-2col">
              <div className="barcode-field-group">
                <label className="barcode-label">Margin: {margin}px</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="2"
                  value={margin}
                  onChange={(e) => setMargin(parseInt(e.target.value))}
                  className="barcode-slider"
                  id="barcode-margin"
                  aria-label="Quiet zone margin"
                />
              </div>
              {displayValue && (
                <div className="barcode-field-group">
                  <label className="barcode-label">Font Size: {fontSize}px</label>
                  <input
                    type="range"
                    min="10"
                    max="36"
                    step="2"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    className="barcode-slider"
                    id="barcode-font-size"
                    aria-label="Font size"
                  />
                </div>
              )}
            </div>

            {/* Text controls */}
            <div className="barcode-row-2col">
              <div className="barcode-field-group">
                <label className="barcode-label">Show Value Text</label>
                <div className="barcode-toggle-wrap">
                  <button
                    type="button"
                    className={`barcode-toggle-btn${displayValue ? ' active' : ''}`}
                    onClick={() => setDisplayValue(!displayValue)}
                    id="barcode-display-value-toggle"
                    role="switch"
                    aria-checked={displayValue}
                    aria-label="Toggle human-readable text"
                  >
                    <span className="toggle-track">
                      <span className="toggle-thumb" />
                    </span>
                    <span>{displayValue ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>
              </div>
              {displayValue && (
                <div className="barcode-field-group">
                  <label className="barcode-label">Text Position</label>
                  <div className="barcode-options-row">
                    {['bottom', 'top'].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        className={`barcode-option-btn${textPosition === pos ? ' active' : ''}`}
                        onClick={() => setTextPosition(pos)}
                        aria-label={`Text position ${pos}`}
                      >
                        {pos.charAt(0).toUpperCase() + pos.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Reset */}
          <button
            type="button"
            className="barcode-reset-btn"
            onClick={handleReset}
            id="barcode-reset-btn"
            aria-label="Reset all settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
            Reset All
          </button>
        </div>

        {/* ── RIGHT: Preview ─────────────────────────────────── */}
        <div className="barcode-preview-panel">
          <div className="barcode-preview-header">
            <div className="preview-title-wrap">
              <span className="preview-title">Live Preview</span>
              <span className="preview-sub">{currentFormat ? currentFormat.name : 'CODE 128'}</span>
            </div>
            {isValid && (
              <span className="barcode-generated-badge" id="barcode-generated-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Generated
              </span>
            )}
          </div>

          {/* Barcode Preview Stage */}
          <div className="barcode-preview-stage" id="barcode-preview-stage">
            {isValid && svgString ? (
              <div
                className="barcode-render-container barcode-scanner-effect"
                id="barcode-render-container"
              >
                <div
                  className="barcode-svg-wrap"
                  dangerouslySetInnerHTML={{ __html: svgString }}
                  aria-label="Generated barcode preview"
                />
              </div>
            ) : (
              <div className="barcode-placeholder-container" aria-label="Barcode preview placeholder">
                <div className="barcode-placeholder-graphic">
                  <svg
                    viewBox="0 0 280 140"
                    width="280"
                    height="140"
                    className="barcode-placeholder-svg"
                    aria-hidden="true"
                  >
                    <rect width="280" height="140" rx="10" fill="var(--bg-surface)" />
                    {/* Stylized barcode bars (decorative placeholder) */}
                    <g fill="var(--text-muted)" fillOpacity="0.22">
                      <rect x="24" y="20" width="3" height="80" rx="1" />
                      <rect x="30" y="20" width="2" height="80" rx="1" />
                      <rect x="35" y="20" width="4" height="80" rx="1" />
                      <rect x="42" y="20" width="2" height="80" rx="1" />
                      <rect x="47" y="20" width="3" height="80" rx="1" />
                      <rect x="54" y="20" width="4" height="80" rx="1" />
                      <rect x="61" y="20" width="2" height="80" rx="1" />
                      <rect x="66" y="20" width="3" height="80" rx="1" />
                      <rect x="73" y="20" width="2" height="80" rx="1" />
                      <rect x="78" y="20" width="4" height="80" rx="1" />
                      <rect x="86" y="20" width="2" height="80" rx="1" />
                      <rect x="92" y="20" width="3" height="80" rx="1" />
                      <rect x="99" y="20" width="2" height="80" rx="1" />
                      <rect x="104" y="20" width="4" height="80" rx="1" />
                      <rect x="112" y="20" width="2" height="80" rx="1" />
                      <rect x="117" y="20" width="3" height="80" rx="1" />
                      <rect x="124" y="20" width="4" height="80" rx="1" />
                      <rect x="132" y="20" width="2" height="80" rx="1" />
                      <rect x="137" y="20" width="3" height="80" rx="1" />
                      <rect x="144" y="20" width="2" height="80" rx="1" />
                      <rect x="150" y="20" width="4" height="80" rx="1" />
                      <rect x="158" y="20" width="2" height="80" rx="1" />
                      <rect x="163" y="20" width="3" height="80" rx="1" />
                      <rect x="170" y="20" width="4" height="80" rx="1" />
                      <rect x="178" y="20" width="2" height="80" rx="1" />
                      <rect x="184" y="20" width="3" height="80" rx="1" />
                      <rect x="191" y="20" width="2" height="80" rx="1" />
                      <rect x="196" y="20" width="4" height="80" rx="1" />
                      <rect x="204" y="20" width="2" height="80" rx="1" />
                      <rect x="210" y="20" width="3" height="80" rx="1" />
                      <rect x="217" y="20" width="4" height="80" rx="1" />
                      <rect x="225" y="20" width="2" height="80" rx="1" />
                      <rect x="230" y="20" width="3" height="80" rx="1" />
                      <rect x="237" y="20" width="2" height="80" rx="1" />
                      <rect x="242" y="20" width="4" height="80" rx="1" />
                      <rect x="250" y="20" width="3" height="80" rx="1" />
                    </g>
                    {/* Placeholder text */}
                    <text x="140" y="118" textAnchor="middle" fill="var(--text-muted)" fontSize="11" fontWeight="600" fontFamily="inherit" fillOpacity="0.5">
                      0 0 0 0 0 0 0 0 0 0 0 0
                    </text>
                  </svg>
                </div>
                <div className="barcode-placeholder-hint">
                  <span className="placeholder-hint-text">
                    Enter data to generate your barcode
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Barcode Info Panel */}
          {isValid && (
            <div className="barcode-info-panel" id="barcode-info-panel">
              <div className="barcode-info-row">
                <span className="info-label">Format</span>
                <span className="info-value">{currentFormat.name}</span>
              </div>
              <div className="barcode-info-row">
                <span className="info-label">Encoded</span>
                <code className="info-value info-code" title={debouncedValue}>{debouncedValue}</code>
              </div>
              <div className="barcode-info-row">
                <span className="info-label">Dimensions</span>
                <span className="info-value">{barWidth}px × {barHeight}px (bar × height)</span>
              </div>
              <div className="barcode-info-row">
                <span className="info-label">Text</span>
                <span className="info-value">{displayValue ? `Visible (${textPosition})` : 'Hidden'}</span>
              </div>
              <div className="barcode-info-row">
                <span className="info-label">Contrast</span>
                <span className={`info-value${isLowContrast ? ' info-warn' : ''}`}>{contrastInfo.ratio}:1{contrastInfo.isInverted ? ' (inverted)' : ''}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="barcode-actions-container">
            <div className="barcode-download-btn-group">
              <button
                type="button"
                className="workbench-btn workbench-btn-primary"
                onClick={handleDownloadPng}
                disabled={!isValid || isGeneratingPng}
                id="download-png-btn"
                title="Download raster PNG image"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {isGeneratingPng ? 'Generating PNG...' : 'Download PNG'}
              </button>

              <button
                type="button"
                className="workbench-btn workbench-btn-secondary barcode-svg-download-btn"
                onClick={handleDownloadSvg}
                disabled={!isValid}
                id="download-svg-btn"
                title="Download genuine vector SVG"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l14 9-14 9V3z"/></svg>
                Download Vector SVG
              </button>
            </div>

            <div className="barcode-copy-btn-group">
              <button
                type="button"
                className="workbench-btn workbench-btn-outline"
                onClick={handleCopyValue}
                disabled={!isValid}
                id="copy-value-btn"
                title="Copy encoded value to clipboard"
              >
                {copyValueSuccess ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                )}
                <span>{copyValueSuccess ? 'Copied!' : 'Copy Value'}</span>
              </button>

              <button
                type="button"
                className="workbench-btn workbench-btn-outline"
                onClick={handleCopySvg}
                disabled={!isValid}
                id="copy-svg-btn"
                title="Copy vector SVG source"
              >
                {copySvgSuccess ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                )}
                <span>{copySvgSuccess ? 'Copied SVG!' : 'Copy SVG'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="barcode-generator" />
    </div>
  );
}
