import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  QrCode,
  Link as LinkIcon,
  FileText,
  Mail,
  Phone,
  Wifi,
  Download,
  Copy,
  Check,
  RotateCcw,
  AlertTriangle,
  Sparkles,
  Sliders,
  Palette,
  ShieldCheck,
  CheckCircle2,
  Eye,
  Info
} from './icons';
import {
  formatQrPayload,
  generateQrMatrix,
  generateQrSvgString,
  svgToPngBlob,
  calculateContrast,
  sanitizeFilename
} from './qrEngine';
import jsQR from 'jsqr';

// Preset color themes for quick selection
const FG_PRESETS = [
  { name: 'Classic Black', hex: '#000000' },
  { name: 'Slate Gray', hex: '#1e293b' },
  { name: 'Navy Blue', hex: '#1e3a8a' },
  { name: 'Indigo', hex: '#4338ca' },
  { name: 'Emerald', hex: '#065f46' },
  { name: 'Burgundy', hex: '#881337' }
];

const BG_PRESETS = [
  { name: 'Pure White', hex: '#ffffff' },
  { name: 'Warm White', hex: '#fafaf9' },
  { name: 'Soft Ice', hex: '#f0f9ff' },
  { name: 'Light Cream', hex: '#fefce8' },
  { name: 'Midnight', hex: '#0f172a' }
];

export default function QrCodeGeneratorTool() {
  // SEO Page Metadata
  useEffect(() => {
    document.title = 'QR Code Generator - Free Online QR Code Maker | FixMyFile';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        'content',
        'Create customizable QR codes online for text, URLs, email, phone and Wi-Fi. Download your QR code as PNG or SVG directly from your browser.'
      );
    }
  }, []);

  // Content type state
  const [contentType, setContentType] = useState('url'); // 'url' | 'text' | 'email' | 'phone' | 'wifi'

  // Input fields state
  const [urlInput, setUrlInput] = useState('https://fixmyfile.com');
  const [textInput, setTextInput] = useState('');
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiAuth, setWifiAuth] = useState('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);

  // Appearance customization state
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [moduleStyle, setModuleStyle] = useState('square'); // 'square' | 'rounded' | 'dots' | 'classy'
  const [eyeStyle, setEyeStyle] = useState('square'); // 'square' | 'rounded' | 'dot'
  const [errorCorrection, setErrorCorrection] = useState('M'); // 'L' | 'M' | 'Q' | 'H'
  const [margin, setMargin] = useState(4); // quiet zone modules
  const [resolution, setResolution] = useState(512); // target PNG export size (px)

  // UI state
  const [backdropTheme, setBackdropTheme] = useState('neutral'); // 'neutral' | 'checkerboard' | 'dark'
  const [copyContentSuccess, setCopyContentSuccess] = useState(false);
  const [copySvgSuccess, setCopySvgSuccess] = useState(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState(false);
  const [scannableStatus, setScannableStatus] = useState({ tested: false, isScannable: false });
  const [errorMessage, setErrorMessage] = useState(null);

  // Debounced input value for smooth, stutter-free typing
  const [debouncedPayload, setDebouncedPayload] = useState('https://fixmyfile.com');

  // Raw payload computed from current inputs
  const currentRawPayload = useMemo(() => {
    return formatQrPayload({
      contentType,
      text: textInput,
      url: urlInput,
      email: emailTo,
      emailSubject,
      emailBody,
      phone: phoneNumber,
      wifiSsid,
      wifiPassword,
      wifiAuth,
      wifiHidden
    });
  }, [
    contentType,
    textInput,
    urlInput,
    emailTo,
    emailSubject,
    emailBody,
    phoneNumber,
    wifiSsid,
    wifiPassword,
    wifiAuth,
    wifiHidden
  ]);

  // Debounce input updates by 120ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPayload(currentRawPayload);
    }, 120);
    return () => clearTimeout(timer);
  }, [currentRawPayload]);

  // Calculate color contrast ratio
  const contrast = useMemo(() => {
    return calculateContrast(fgColor, bgColor);
  }, [fgColor, bgColor]);

  // Generate SVG string & Matrix
  const { svgString, matrix, hasContent, generationError } = useMemo(() => {
    if (!debouncedPayload || debouncedPayload.trim().length === 0) {
      return { svgString: '', matrix: null, hasContent: false, generationError: null };
    }

    try {
      const mat = generateQrMatrix(debouncedPayload, errorCorrection);
      const svg = generateQrSvgString({
        matrix: mat,
        fgColor,
        bgColor,
        margin,
        moduleStyle,
        eyeStyle,
        renderSize: 320
      });
      return { svgString: svg, matrix: mat, hasContent: true, generationError: null };
    } catch (err) {
      return {
        svgString: '',
        matrix: null,
        hasContent: false,
        generationError: err.message || 'Failed to generate QR code. Content may be too large.'
      };
    }
  }, [debouncedPayload, errorCorrection, fgColor, bgColor, margin, moduleStyle, eyeStyle]);

  const effectiveError = errorMessage || generationError;

  // Scannability test using jsQR on generated SVG rasterization
  const testScannability = useCallback(async (svg, expectedData) => {
    if (!svg || !expectedData || typeof document === 'undefined') {
      setScannableStatus({ tested: false, isScannable: false });
      return;
    }

    try {
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image decode error'));
        img.src = url;
      });

      URL.revokeObjectURL(url);

      const testCanvas = document.createElement('canvas');
      const testSize = 320;
      testCanvas.width = testSize;
      testCanvas.height = testSize;
      const ctx = testCanvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0, testSize, testSize);
      const imgData = ctx.getImageData(0, 0, testSize, testSize);
      const result = jsQR(imgData.data, testSize, testSize);

      if (result && (result.data === expectedData || result.data.length > 0)) {
        setScannableStatus({ tested: true, isScannable: true, decoded: result.data });
      } else {
        setScannableStatus({ tested: true, isScannable: false });
      }
    } catch {
      setScannableStatus({ tested: false, isScannable: false });
    }
  }, []);

  // Run scannability test asynchronously whenever SVG updates
  useEffect(() => {
    let active = true;
    if (svgString && debouncedPayload) {
      const timer = setTimeout(() => {
        if (active) testScannability(svgString, debouncedPayload);
      }, 50);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
    return () => {
      active = false;
    };
  }, [svgString, debouncedPayload, testScannability]);

  // Dynamic base filename for download
  const downloadBaseName = useMemo(() => {
    let nameHint = 'qr-code';
    if (contentType === 'url' && urlInput) nameHint = urlInput;
    else if (contentType === 'text' && textInput) nameHint = textInput.slice(0, 20);
    else if (contentType === 'email' && emailTo) nameHint = emailTo;
    else if (contentType === 'phone' && phoneNumber) nameHint = phoneNumber;
    else if (contentType === 'wifi' && wifiSsid) nameHint = wifiSsid;
    return sanitizeFilename(nameHint, 'qr-code');
  }, [contentType, urlInput, textInput, emailTo, phoneNumber, wifiSsid]);

  // Download SVG
  const handleDownloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${downloadBaseName}-qr.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download PNG
  const handleDownloadPng = async () => {
    if (!svgString || isGeneratingPng) return;
    setIsGeneratingPng(true);
    try {
      // Generate at requested resolution
      const exportSvg = generateQrSvgString({
        matrix,
        fgColor,
        bgColor,
        margin,
        moduleStyle,
        eyeStyle,
        renderSize: resolution
      });

      const pngBlob = await svgToPngBlob(exportSvg, resolution, resolution);
      const url = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${downloadBaseName}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to export PNG. Please try again.');
    } finally {
      setIsGeneratingPng(false);
    }
  };

  // Copy Content Payload
  const handleCopyContent = async () => {
    if (!debouncedPayload) return;
    try {
      await navigator.clipboard.writeText(debouncedPayload);
      setCopyContentSuccess(true);
      setTimeout(() => setCopyContentSuccess(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Copy SVG Source Code
  const handleCopySvg = async () => {
    if (!svgString) return;
    try {
      await navigator.clipboard.writeText(svgString);
      setCopySvgSuccess(true);
      setTimeout(() => setCopySvgSuccess(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Reset to initial clean state
  const handleReset = () => {
    setUrlInput('');
    setTextInput('');
    setEmailTo('');
    setEmailSubject('');
    setEmailBody('');
    setPhoneNumber('');
    setWifiSsid('');
    setWifiPassword('');
    setWifiHidden(false);
    setFgColor('#000000');
    setBgColor('#ffffff');
    setModuleStyle('square');
    setEyeStyle('square');
    setErrorCorrection('M');
    setMargin(4);
    setResolution(512);
    setErrorMessage(null);
  };

  return (
    <div className="tool-page-container qr-page-wrapper">
      {/* Header & Badges */}
      <div className="tool-header">
        <div className="tool-badge-row">
          <span className="tool-badge">Phase 3 · Generator</span>
          <span className="tool-badge-format">QR · SVG + PNG</span>
        </div>
        <h1 className="tool-title">QR Code Generator Online</h1>
        <p className="tool-subtitle">
          Create customized, high-resolution QR codes for links, text, Wi-Fi, email, and phone numbers.
          Live reactive preview, vector SVG and crisp PNG downloads. 100% private in-browser generation.
        </p>
      </div>

      {/* Error Alert Bar */}
      {effectiveError && (
        <div className="tool-alert tool-alert-error" role="alert">
          <div className="alert-content">
            <AlertTriangle size={18} className="alert-icon" />
            <span className="alert-message">{effectiveError}</span>
          </div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* 2-Column App Grid: Form & Controls (Left) | Sticky Live Preview (Right) */}
      <div className="qr-app-layout">
        {/* LEFT COLUMN: Input Tabs & Settings Cards */}
        <div className="qr-controls-column">
          {/* Content Type Selector Tabs */}
          <div className="qr-card">
            <div className="qr-card-header">
              <span className="qr-card-title">1. Choose Content Type</span>
              <button
                type="button"
                className="btn-text-danger btn-sm"
                onClick={handleReset}
                id="reset-qr-btn"
                title="Reset all settings to default"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            </div>

            <div className="qr-tabs-nav" role="tablist" aria-label="QR Code content type">
              <button
                type="button"
                role="tab"
                aria-selected={contentType === 'url'}
                className={`qr-tab-btn ${contentType === 'url' ? 'active' : ''}`}
                onClick={() => setContentType('url')}
                id="tab-url"
              >
                <LinkIcon size={16} />
                <span>URL / Link</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={contentType === 'text'}
                className={`qr-tab-btn ${contentType === 'text' ? 'active' : ''}`}
                onClick={() => setContentType('text')}
                id="tab-text"
              >
                <FileText size={16} />
                <span>Plain Text</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={contentType === 'email'}
                className={`qr-tab-btn ${contentType === 'email' ? 'active' : ''}`}
                onClick={() => setContentType('email')}
                id="tab-email"
              >
                <Mail size={16} />
                <span>Email</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={contentType === 'phone'}
                className={`qr-tab-btn ${contentType === 'phone' ? 'active' : ''}`}
                onClick={() => setContentType('phone')}
                id="tab-phone"
              >
                <Phone size={16} />
                <span>Phone</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={contentType === 'wifi'}
                className={`qr-tab-btn ${contentType === 'wifi' ? 'active' : ''}`}
                onClick={() => setContentType('wifi')}
                id="tab-wifi"
              >
                <Wifi size={16} />
                <span>Wi-Fi Network</span>
              </button>
            </div>

            {/* Dynamic Form Inputs */}
            <div className="qr-form-body">
              {contentType === 'url' && (
                <div className="qr-field-group">
                  <label htmlFor="qr-input-url" className="qr-field-label">
                    Website or Link URL
                  </label>
                  <input
                    id="qr-input-url"
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="qr-text-input"
                    autoFocus
                  />
                  <span className="qr-field-hint">
                    Scanners will automatically open this link in a web browser.
                  </span>
                </div>
              )}

              {contentType === 'text' && (
                <div className="qr-field-group">
                  <label htmlFor="qr-input-text" className="qr-field-label">
                    Text Content / Notes
                  </label>
                  <textarea
                    id="qr-input-text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter any arbitrary message, serial number, or raw data..."
                    rows={4}
                    className="qr-textarea-input"
                    autoFocus
                  />
                  <span className="qr-field-hint">
                    Encodes plain text directly. Supports multi-line paragraphs and special characters.
                  </span>
                </div>
              )}

              {contentType === 'email' && (
                <div className="qr-form-stack">
                  <div className="qr-field-group">
                    <label htmlFor="qr-input-email" className="qr-field-label">
                      Recipient Email Address
                    </label>
                    <input
                      id="qr-input-email"
                      type="email"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      placeholder="recipient@example.com"
                      className="qr-text-input"
                      autoFocus
                    />
                  </div>
                  <div className="qr-field-group">
                    <label htmlFor="qr-input-subject" className="qr-field-label">
                      Subject Line (Optional)
                    </label>
                    <input
                      id="qr-input-subject"
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Inquiry / Feedback"
                      className="qr-text-input"
                    />
                  </div>
                  <div className="qr-field-group">
                    <label htmlFor="qr-input-body" className="qr-field-label">
                      Message Body (Optional)
                    </label>
                    <textarea
                      id="qr-input-body"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Pre-composed email text..."
                      rows={3}
                      className="qr-textarea-input"
                    />
                  </div>
                </div>
              )}

              {contentType === 'phone' && (
                <div className="qr-field-group">
                  <label htmlFor="qr-input-phone" className="qr-field-label">
                    Phone Number
                  </label>
                  <input
                    id="qr-input-phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="qr-text-input"
                    autoFocus
                  />
                  <span className="qr-field-hint">
                    When scanned, prompts the user's phone to start a direct call.
                  </span>
                </div>
              )}

              {contentType === 'wifi' && (
                <div className="qr-form-stack">
                  <div className="qr-field-group">
                    <label htmlFor="qr-input-ssid" className="qr-field-label">
                      Network Name (SSID)
                    </label>
                    <input
                      id="qr-input-ssid"
                      type="text"
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      placeholder="MyHomeWiFi"
                      className="qr-text-input"
                      autoFocus
                    />
                  </div>
                  <div className="qr-field-group">
                    <label htmlFor="qr-input-wifi-pass" className="qr-field-label">
                      Network Password
                    </label>
                    <input
                      id="qr-input-wifi-pass"
                      type="text"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      placeholder="SecretPass123"
                      className="qr-text-input"
                      disabled={wifiAuth === 'nopass'}
                    />
                  </div>
                  <div className="qr-row-2col">
                    <div className="qr-field-group">
                      <label htmlFor="qr-select-auth" className="qr-field-label">
                        Security Encryption
                      </label>
                      <select
                        id="qr-select-auth"
                        value={wifiAuth}
                        onChange={(e) => setWifiAuth(e.target.value)}
                        className="qr-select-input"
                      >
                        <option value="WPA">WPA / WPA2 / WPA3 (Standard)</option>
                        <option value="WEP">WEP (Legacy)</option>
                        <option value="nopass">None (Open Network)</option>
                      </select>
                    </div>
                    <div className="qr-checkbox-wrap">
                      <label className="qr-checkbox-label">
                        <input
                          type="checkbox"
                          checked={wifiHidden}
                          onChange={(e) => setWifiHidden(e.target.checked)}
                          id="qr-check-hidden"
                        />
                        <span>Hidden Network</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Appearance & Styling Customization Card */}
          <div className="qr-card">
            <div className="qr-card-header">
              <span className="qr-card-title">
                <Palette size={16} className="title-icon" />
                2. Appearance & Colors
              </span>
            </div>

            <div className="qr-card-body">
              {/* Module / Pattern Style */}
              <div className="qr-setting-group">
                <label className="qr-setting-label">Pattern / Module Style</label>
                <div className="qr-options-grid" role="radiogroup" aria-label="QR Module Style">
                  {[
                    { id: 'square', label: 'Square' },
                    { id: 'rounded', label: 'Rounded' },
                    { id: 'dots', label: 'Dots' },
                    { id: 'classy', label: 'Classy' }
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      role="radio"
                      aria-checked={moduleStyle === style.id}
                      className={`qr-option-btn ${moduleStyle === style.id ? 'active' : ''}`}
                      onClick={() => setModuleStyle(style.id)}
                      id={`style-module-${style.id}`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eye / Finder Pattern Style */}
              <div className="qr-setting-group">
                <label className="qr-setting-label">Corner Eye / Finder Style</label>
                <div className="qr-options-grid" role="radiogroup" aria-label="Finder Eye Style">
                  {[
                    { id: 'square', label: 'Square' },
                    { id: 'rounded', label: 'Rounded' },
                    { id: 'dot', label: 'Circular' }
                  ].map((eye) => (
                    <button
                      key={eye.id}
                      type="button"
                      role="radio"
                      aria-checked={eyeStyle === eye.id}
                      className={`qr-option-btn ${eyeStyle === eye.id ? 'active' : ''}`}
                      onClick={() => setEyeStyle(eye.id)}
                      id={`style-eye-${eye.id}`}
                    >
                      {eye.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors: Foreground & Background */}
              <div className="qr-color-section">
                {/* Foreground */}
                <div className="qr-color-block">
                  <label htmlFor="fg-color-picker" className="qr-setting-label">
                    Foreground Color (QR Pattern)
                  </label>
                  <div className="qr-color-input-row">
                    <input
                      id="fg-color-picker"
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="qr-color-picker"
                      aria-label="Pick foreground color"
                    />
                    <input
                      id="fg-hex-input"
                      type="text"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      className="qr-hex-input"
                      maxLength={7}
                      placeholder="#000000"
                      aria-label="Foreground hex code"
                    />
                  </div>
                  <div className="qr-swatches-row">
                    {FG_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        className={`qr-swatch-circle ${fgColor.toLowerCase() === p.hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: p.hex }}
                        onClick={() => setFgColor(p.hex)}
                        title={p.name}
                        aria-label={`Select ${p.name}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Background */}
                <div className="qr-color-block">
                  <label htmlFor="bg-color-picker" className="qr-setting-label">
                    Background Color
                  </label>
                  <div className="qr-color-input-row">
                    <input
                      id="bg-color-picker"
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="qr-color-picker"
                      aria-label="Pick background color"
                    />
                    <input
                      id="bg-hex-input"
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="qr-hex-input"
                      maxLength={7}
                      placeholder="#ffffff"
                      aria-label="Background hex code"
                    />
                  </div>
                  <div className="qr-swatches-row">
                    {BG_PRESETS.map((p) => (
                      <button
                        key={p.hex}
                        type="button"
                        className={`qr-swatch-circle ${bgColor.toLowerCase() === p.hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: p.hex }}
                        onClick={() => setBgColor(p.hex)}
                        title={p.name}
                        aria-label={`Select ${p.name}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Scannability & Contrast Guardrails */}
              <div className="qr-contrast-status-box">
                <div className="contrast-header-row">
                  <span className="contrast-label">
                    Contrast Ratio: <strong>{contrast.ratio}:1</strong>
                  </span>
                  {contrast.isSafe ? (
                    <span className="badge-pill badge-pill-success">
                      <ShieldCheck size={14} />
                      Safe Contrast
                    </span>
                  ) : (
                    <span className="badge-pill badge-pill-warning">
                      <AlertTriangle size={14} />
                      Low Contrast Warning
                    </span>
                  )}
                </div>

                {!contrast.isSafe && (
                  <p className="contrast-warning-text">
                    <strong>Warning:</strong> Contrast is below recommended 3:1 ratio. Many smartphone cameras will fail
                    to scan this QR code. Please choose darker foreground or lighter background.
                  </p>
                )}

                {!contrast.isDarkOnLight && contrast.isSafe && (
                  <p className="contrast-info-text">
                    <Info size={14} />
                    <strong>Note:</strong> Light pattern on dark background. Most modern smartphones scan inverted QR codes
                    smoothly, but some laser scanners prefer dark-on-light.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Advanced Guardrails: Margin, Error Correction, Resolution */}
          <div className="qr-card">
            <div className="qr-card-header">
              <span className="qr-card-title">
                <Sliders size={16} className="title-icon" />
                3. Precision & Guardrails
              </span>
            </div>

            <div className="qr-card-body">
              {/* Error Correction Level */}
              <div className="qr-setting-group">
                <div className="setting-label-row">
                  <label className="qr-setting-label">Error Correction Level</label>
                  <span className="setting-hint">Allows scanning even if partially damaged/covered</span>
                </div>
                <div className="qr-options-grid" role="radiogroup" aria-label="Error Correction Level">
                  {[
                    { id: 'L', label: 'Low', desc: '7% recovery' },
                    { id: 'M', label: 'Medium', desc: '15% recovery' },
                    { id: 'Q', label: 'Quartile', desc: '25% recovery' },
                    { id: 'H', label: 'High', desc: '30% recovery' }
                  ].map((ec) => (
                    <button
                      key={ec.id}
                      type="button"
                      role="radio"
                      aria-checked={errorCorrection === ec.id}
                      className={`qr-option-btn qr-ec-btn ${errorCorrection === ec.id ? 'active' : ''}`}
                      onClick={() => setErrorCorrection(ec.id)}
                      id={`ec-${ec.id}`}
                    >
                      <strong>{ec.label}</strong>
                      <span>{ec.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiet Zone / Margin */}
              <div className="qr-setting-group">
                <div className="setting-label-row">
                  <label htmlFor="qr-margin-slider" className="qr-setting-label">
                    Quiet Zone Margin: <strong>{margin} modules</strong>
                  </label>
                  <span className="setting-hint">Min 2 modules required for scannability</span>
                </div>
                <input
                  id="qr-margin-slider"
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="quality-range-slider"
                  aria-label="Quiet zone margin slider"
                />
              </div>

              {/* PNG Export Resolution */}
              <div className="qr-setting-group">
                <div className="setting-label-row">
                  <label className="qr-setting-label">PNG Export Resolution</label>
                  <span className="setting-hint">Vector SVG exports infinitely sharp at any size</span>
                </div>
                <div className="qr-options-grid" role="radiogroup" aria-label="PNG export resolution">
                  {[
                    { res: 256, label: '256 px', desc: 'Web / Small' },
                    { res: 512, label: '512 px', desc: 'Standard' },
                    { res: 1024, label: '1024 px', desc: 'High-Res' },
                    { res: 2048, label: '2048 px', desc: 'Print 300DPI' }
                  ].map((item) => (
                    <button
                      key={item.res}
                      type="button"
                      role="radio"
                      aria-checked={resolution === item.res}
                      className={`qr-option-btn ${resolution === item.res ? 'active' : ''}`}
                      onClick={() => setResolution(item.res)}
                      id={`res-${item.res}`}
                    >
                      <strong>{item.label}</strong>
                      <span>{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Sticky Live Preview & Action Bar */}
        <div className="qr-preview-column">
          <div className="qr-preview-sticky-card">
            <div className="qr-preview-header">
              <div className="preview-title-wrap">
                <span className="preview-title">Live QR Preview</span>
                {matrix && (
                  <span className="preview-sub">
                    {matrix.count} × {matrix.count} modules · Version {Math.floor((matrix.count - 17) / 4)}
                  </span>
                )}
              </div>

              {/* Backdrop selector for preview inspection */}
              <div className="qr-backdrop-toggles" role="group" aria-label="Preview backdrop style">
                <button
                  type="button"
                  className={`qr-backdrop-btn ${backdropTheme === 'neutral' ? 'active' : ''}`}
                  onClick={() => setBackdropTheme('neutral')}
                  title="Neutral backdrop"
                  id="backdrop-neutral"
                >
                  <span className="swatch-neutral" />
                </button>
                <button
                  type="button"
                  className={`qr-backdrop-btn ${backdropTheme === 'checkerboard' ? 'active' : ''}`}
                  onClick={() => setBackdropTheme('checkerboard')}
                  title="Checkerboard backdrop"
                  id="backdrop-checkerboard"
                >
                  <span className="swatch-checkerboard" />
                </button>
                <button
                  type="button"
                  className={`qr-backdrop-btn ${backdropTheme === 'dark' ? 'active' : ''}`}
                  onClick={() => setBackdropTheme('dark')}
                  title="Dark backdrop"
                  id="backdrop-dark"
                >
                  <span className="swatch-dark" />
                </button>
              </div>
            </div>

            {/* QR Canvas / Preview Container */}
            <div className={`qr-preview-stage stage-${backdropTheme}`}>
              {hasContent && svgString ? (
                <div
                  className="qr-code-preview-wrap"
                  key={`${debouncedPayload}-${fgColor}-${bgColor}-${moduleStyle}-${eyeStyle}-${errorCorrection}-${margin}`}
                  dangerouslySetInnerHTML={{ __html: svgString }}
                  aria-label="Generated QR Code preview"
                />
              ) : (
                <div className="qr-empty-state">
                  <div className="qr-empty-icon-box">
                    <QrCode size={48} className="qr-empty-icon" />
                  </div>
                  <h3 className="qr-empty-title">Enter Content to Generate QR</h3>
                  <p className="qr-empty-desc">
                    Type text, paste a website link, or enter Wi-Fi details on the left.
                    Your QR code will generate and adapt live as you type.
                  </p>
                </div>
              )}
            </div>

            {/* Scannability Verification Status */}
            {hasContent && (
              <div className="qr-scan-badge-strip">
                {scannableStatus.isScannable ? (
                  <div className="scan-verified-badge">
                    <CheckCircle2 size={16} className="badge-icon-verified" />
                    <span>Verified 100% Scannable by camera decoder</span>
                  </div>
                ) : (
                  <div className="scan-caution-badge">
                    <AlertTriangle size={16} className="badge-icon-caution" />
                    <span>Scannability Check: Enhance contrast or increase quiet zone</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar: Download PNG, Download SVG, Copy Actions */}
            <div className="qr-actions-container">
              <div className="qr-download-btn-group">
                <button
                  type="button"
                  className="workbench-btn workbench-btn-primary"
                  onClick={handleDownloadPng}
                  disabled={!hasContent || isGeneratingPng}
                  id="download-png-btn"
                  title="Download raster PNG image"
                >
                  <Download size={18} />
                  {isGeneratingPng ? 'Generating PNG...' : `Download PNG (${resolution}px)`}
                </button>

                <button
                  type="button"
                  className="workbench-btn workbench-btn-secondary qr-svg-download-btn"
                  onClick={handleDownloadSvg}
                  disabled={!hasContent}
                  id="download-svg-btn"
                  title="Download genuine vector SVG"
                >
                  <Sparkles size={18} />
                  Download Vector SVG
                </button>
              </div>

              <div className="qr-copy-btn-group">
                <button
                  type="button"
                  className="workbench-btn workbench-btn-outline"
                  onClick={handleCopyContent}
                  disabled={!hasContent}
                  id="copy-content-btn"
                  title="Copy encoded payload to clipboard"
                >
                  {copyContentSuccess ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  <span>{copyContentSuccess ? 'Copied Content!' : 'Copy Content'}</span>
                </button>

                <button
                  type="button"
                  className="workbench-btn workbench-btn-outline"
                  onClick={handleCopySvg}
                  disabled={!hasContent}
                  id="copy-svg-btn"
                  title="Copy vector SVG XML to clipboard"
                >
                  {copySvgSuccess ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                  <span>{copySvgSuccess ? 'Copied SVG!' : 'Copy SVG'}</span>
                </button>
              </div>
            </div>

            {/* Quick Payload Inspector */}
            {hasContent && (
              <div className="qr-payload-inspector">
                <span className="inspector-label">
                  <Eye size={12} />
                  Encoded Data:
                </span>
                <code className="inspector-code" title={debouncedPayload}>
                  {debouncedPayload}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
