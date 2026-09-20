import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Format bytes into human-readable string
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate sanitized download filename
function getConvertedDownloadName(originalName, targetFormat) {
  const ext = targetFormat.toLowerCase() === 'jpeg' || targetFormat.toLowerCase() === 'jpg' 
    ? 'jpg' 
    : targetFormat.toLowerCase() === 'webp' 
    ? 'webp' 
    : 'png';
  if (!originalName) return `image-converted.${ext}`;
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-converted.${ext}`;
}

// Detect input format string
function detectInputFormat(file) {
  if (!file) return 'UNKNOWN';
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'JPG';
  if (type === 'image/png' || name.endsWith('.png')) return 'PNG';
  if (type === 'image/webp' || name.endsWith('.webp')) return 'WEBP';
  return 'UNKNOWN';
}

// Check browser canvas WebP encoding support
function checkBrowserWebpSupport() {
  try {
    if (typeof document === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

export default function ImageConverterTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [inputFormat, setInputFormat] = useState(null); // 'JPG' | 'PNG' | 'WEBP'
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Conversion options
  const [outputFormat, setOutputFormat] = useState('PNG'); // 'JPG' | 'PNG' | 'WEBP'
  const [quality, setQuality] = useState(80); // For JPG and WEBP
  const [backgroundColor, setBackgroundColor] = useState('#ffffff'); // For JPG output when source has transparency
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [selectedBgPreset, setSelectedBgPreset] = useState('white'); // 'white' | 'black' | 'custom'

  // Processing & Status
  const [processingState, setProcessingState] = useState('IDLE'); // 'IDLE' | 'LOADING' | 'CONVERTING' | 'VALIDATING' | 'SUCCESS' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState(null);

  // Converted result
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [convertedSize, setConvertedSize] = useState(null);
  const [convertedDimensions, setConvertedDimensions] = useState(null);
  const [previewBackdrop, setPreviewBackdrop] = useState('checkerboard'); // 'checkerboard' | 'white' | 'black'

  // Active refs for object URL revocation
  const activeOriginalUrlRef = useRef(null);
  const activeConvertedUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  const isProcessing = processingState === 'CONVERTING' || processingState === 'VALIDATING';
  const isWebpSupported = checkBrowserWebpSupport();

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Image Converter Online — Convert JPG, PNG & WEBP Free | FixMyFile';

    let metaDesc = document.querySelector('meta[name="description"]');
    let prevMetaContent = '';
    let createdMeta = false;

    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
      createdMeta = true;
    } else {
      prevMetaContent = metaDesc.getAttribute('content') || '';
    }

    metaDesc.setAttribute(
      'content',
      'Convert JPG, PNG and WEBP images online for free. Change image formats while preserving image dimensions directly in your browser.'
    );

    return () => {
      document.title = prevTitle;
      if (createdMeta && metaDesc.parentNode) {
        metaDesc.parentNode.removeChild(metaDesc);
      } else if (metaDesc) {
        metaDesc.setAttribute('content', prevMetaContent);
      }
    };
  }, []);

  // Synchronize active URL refs for unmount cleanup
  useEffect(() => {
    activeOriginalUrlRef.current = originalPreviewUrl;
  }, [originalPreviewUrl]);

  useEffect(() => {
    activeConvertedUrlRef.current = convertedUrl;
  }, [convertedUrl]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (activeOriginalUrlRef.current) {
        URL.revokeObjectURL(activeOriginalUrlRef.current);
      }
      if (activeConvertedUrlRef.current) {
        URL.revokeObjectURL(activeConvertedUrlRef.current);
      }
    };
  }, []);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Validate and load selected image file
  const processSelectedFile = (file) => {
    setErrorMessage(null);
    if (!file) return;

    const detected = detectInputFormat(file);
    if (detected === 'UNKNOWN') {
      setErrorMessage('Unsupported file format. Please select a valid JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    const MAX_SIZE = 30 * 1024 * 1024; // 30 MB
    if (file.size > MAX_SIZE) {
      setErrorMessage(`File size (${formatBytes(file.size)}) exceeds the 30MB limit. Please choose a smaller image.`);
      return;
    }

    // Clean up previous URLs
    if (activeOriginalUrlRef.current) {
      URL.revokeObjectURL(activeOriginalUrlRef.current);
      setOriginalPreviewUrl(null);
    }
    if (activeConvertedUrlRef.current) {
      URL.revokeObjectURL(activeConvertedUrlRef.current);
      setConvertedUrl(null);
      setConvertedBlob(null);
      setConvertedSize(null);
      setConvertedDimensions(null);
    }

    setProcessingState('LOADING');
    setInputFormat(detected);

    // Pick sensible default target format:
    // If input is PNG -> default to JPG
    // If input is JPG -> default to PNG
    // If input is WEBP -> default to PNG
    if (detected === 'PNG') {
      setOutputFormat('JPG');
    } else if (detected === 'JPG') {
      setOutputFormat('PNG');
    } else if (detected === 'WEBP') {
      setOutputFormat('PNG');
    }

    const url = URL.createObjectURL(file);
    setOriginalPreviewUrl(url);
    setSelectedFile(file);

    // Measure original dimensions
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      setOriginalDimensions({ width: origW, height: origH });
      setProcessingState('IDLE');
    };
    img.onerror = () => {
      setErrorMessage('Could not load image dimensions. The image file may be corrupted.');
      setProcessingState('ERROR');
    };
    img.src = url;
  };

  // Handle format selection
  const handleSelectFormat = (format) => {
    setErrorMessage(null);
    if (format === 'WEBP' && !isWebpSupported) {
      setErrorMessage('This browser cannot convert to WEBP. Please select JPG or PNG.');
      return;
    }
    setOutputFormat(format);
  };

  // Handle Background Color Preset Selection
  const handleBgPresetChange = (preset) => {
    setSelectedBgPreset(preset);
    if (preset === 'white') {
      setBackgroundColor('#ffffff');
    } else if (preset === 'black') {
      setBackgroundColor('#000000');
    } else if (preset === 'custom') {
      setBackgroundColor(customBgColor);
    }
  };

  const handleCustomColorChange = (e) => {
    const val = e.target.value;
    setCustomBgColor(val);
    setSelectedBgPreset('custom');
    setBackgroundColor(val);
  };

  // Execute client-side conversion
  const handleConvert = async () => {
    if (!selectedFile || !originalDimensions || isProcessing) return;

    setErrorMessage(null);

    // Large image safety check
    const MAX_DIM = 10000;
    const MAX_PIXELS = 40000000; // 40 MP

    if (
      originalDimensions.width > MAX_DIM ||
      originalDimensions.height > MAX_DIM ||
      originalDimensions.width * originalDimensions.height > MAX_PIXELS
    ) {
      setErrorMessage('Image is too large for your browser to process safely.');
      return;
    }

    // Check browser capability for WEBP output
    if (outputFormat === 'WEBP' && !isWebpSupported) {
      setErrorMessage('This browser cannot convert to WEBP.');
      return;
    }

    setProcessingState('CONVERTING');

    // Revoke previous converted output
    if (activeConvertedUrlRef.current) {
      URL.revokeObjectURL(activeConvertedUrlRef.current);
      setConvertedUrl(null);
      setConvertedBlob(null);
      setConvertedSize(null);
      setConvertedDimensions(null);
    }

    try {
      const srcUrl = URL.createObjectURL(selectedFile);
      const img = new Image();

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to decode source image.'));
        img.src = srcUrl;
      });

      URL.revokeObjectURL(srcUrl);

      // Create canvas with EXACT original dimensions (no resizing)
      const width = originalDimensions.width;
      const height = originalDimensions.height;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas 2D context could not be created.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Background handling:
      // JPG does not support alpha transparency. If converting to JPG, fill with selected background color.
      if (outputFormat === 'JPG') {
        ctx.fillStyle = backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, width, height);
      } else {
        // PNG and WEBP support transparency: ensure canvas starts completely transparent
        ctx.clearRect(0, 0, width, height);
      }

      // Draw source image onto canvas at 1:1 original dimensions
      ctx.drawImage(img, 0, 0, width, height);

      let targetMime = 'image/jpeg';
      let qFactor = undefined;

      if (outputFormat === 'JPG') {
        targetMime = 'image/jpeg';
        qFactor = Math.max(0.05, Math.min(1.0, quality / 100));
      } else if (outputFormat === 'PNG') {
        targetMime = 'image/png';
      } else if (outputFormat === 'WEBP') {
        targetMime = 'image/webp';
        qFactor = Math.max(0.05, Math.min(1.0, quality / 100));
      }

      // Encode canvas to Blob
      const resultBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error(`Failed to encode image to ${outputFormat}.`));
          },
          targetMime,
          qFactor
        );
      });

      if (!resultBlob || resultBlob.size === 0) {
        throw new Error('Conversion produced an empty result.');
      }

      // Transition to VALIDATING state
      setProcessingState('VALIDATING');

      // Verify MIME type integrity (guard against browser silent fallbacks)
      if (outputFormat === 'WEBP' && !resultBlob.type.includes('webp')) {
        throw new Error('This browser cannot convert to WEBP.');
      }
      if (outputFormat === 'JPG' && !resultBlob.type.includes('jpeg')) {
        throw new Error('This browser cannot convert to JPG.');
      }
      if (outputFormat === 'PNG' && !resultBlob.type.includes('png')) {
        throw new Error('This browser cannot convert to PNG.');
      }

      // Decode the generated output blob and verify natural dimensions
      const outUrl = URL.createObjectURL(resultBlob);
      const testImg = new Image();

      await new Promise((resolve, reject) => {
        testImg.onload = () => resolve();
        testImg.onerror = () => reject(new Error('Conversion failed. Please try another image or format.'));
        testImg.src = outUrl;
      });

      if (testImg.naturalWidth !== width || testImg.naturalHeight !== height) {
        URL.revokeObjectURL(outUrl);
        throw new Error('Conversion failed: generated dimensions do not match source dimensions.');
      }

      // Conversion and validation completely verified
      setConvertedBlob(resultBlob);
      setConvertedUrl(outUrl);
      setConvertedSize(resultBlob.size);
      setConvertedDimensions({ width: testImg.naturalWidth, height: testImg.naturalHeight });
      setProcessingState('SUCCESS');
    } catch (err) {
      console.error('Image conversion error:', err);
      setErrorMessage(err.message || 'Image conversion failed. Please try another image or format.');
      setProcessingState('ERROR');
    }
  };

  // Download converted image
  const handleDownload = () => {
    if (!convertedBlob || !selectedFile) return;

    const downloadName = getConvertedDownloadName(selectedFile.name, outputFormat);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(convertedBlob);
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  // Clear & Reset
  const resetAll = () => {
    if (activeOriginalUrlRef.current) {
      URL.revokeObjectURL(activeOriginalUrlRef.current);
    }
    if (activeConvertedUrlRef.current) {
      URL.revokeObjectURL(activeConvertedUrlRef.current);
    }

    setSelectedFile(null);
    setInputFormat(null);
    setOriginalPreviewUrl(null);
    setOriginalDimensions(null);
    setOutputFormat('PNG');
    setQuality(80);
    setBackgroundColor('#ffffff');
    setSelectedBgPreset('white');
    setCustomBgColor('#ffffff');
    setProcessingState('IDLE');
    setErrorMessage(null);
    setConvertedBlob(null);
    setConvertedUrl(null);
    setConvertedSize(null);
    setConvertedDimensions(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isSameFormat = inputFormat === outputFormat;
  const isSourceTransparencyFormat = inputFormat === 'PNG' || inputFormat === 'WEBP';
  const showJpgBgOptions = outputFormat === 'JPG' && isSourceTransparencyFormat;

  return (
    <div className="tool-container">
      {/* Tool Header */}
      <div className="tool-header">
        <div className="tool-badge-row">
          <span className="tool-badge">Phase 2 · Image Driver</span>
          <span className="tool-badge-tag">Client-Side · 100% Private</span>
          <span className="tool-badge-format">JPG · PNG · WEBP</span>
        </div>
        <h1 className="tool-title">Image Converter Online</h1>
        <p className="tool-description">
          Convert JPG, PNG, and WEBP images online in your browser. Choose your output format,
          preserve alpha transparency or customize background fills, and keep your original dimensions intact.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="tool-alert tool-alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-message">{errorMessage}</div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Interactive Tool Area */}
      <section className="converter-card" aria-label="Image Converter tool interface">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/jpeg,image/png,image/webp,image/jpg,.jpg,.jpeg,.png,.webp"
          className="hidden-file-input"
          aria-hidden="true"
        />

        {!selectedFile ? (
          /* Upload Drop Zone */
          <div
            className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFilePicker();
              }
            }}
            aria-label="Upload an image by clicking or dragging and dropping"
          >
            <div className="dropzone-icon">🔄</div>
            <h2 className="dropzone-title">Drop your image here</h2>
            <p className="dropzone-subtext">or click to browse your device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.JPG / .JPEG</span>
              <span className="dropzone-badge">.PNG</span>
              <span className="dropzone-badge">.WEBP</span>
              <span className="dropzone-badge">Exact Dimensions Preserved</span>
            </div>
            <button
              type="button"
              className="btn-primary dropzone-cta"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              Choose Image
            </button>
          </div>
        ) : (
          /* Selected Image Workbench */
          <div className="files-workbench">
            {/* Workbench Header */}
            <div className="workbench-header">
              <div className="workbench-title-box">
                <h2 className="workbench-title">Conversion Workbench</h2>
                <span className="workbench-hint">
                  {convertedUrl
                    ? 'Conversion verified! Inspect the preview and download your file.'
                    : 'Select your target output format and adjust conversion options.'}
                </span>
              </div>
              <div className="workbench-actions">
                <button
                  type="button"
                  className="btn-text-danger btn-sm"
                  onClick={resetAll}
                  disabled={isProcessing}
                >
                  Clear & Reset
                </button>
              </div>
            </div>

            {/* File Info Strip */}
            <div className="bg-remover-info-strip">
              <div className="bg-remover-info-left">
                <span className="compress-icon-badge" aria-hidden="true">
                  {inputFormat}
                </span>
                <div className="compress-file-meta">
                  <span className="compress-file-name" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <div className="compress-file-details">
                    <span>{formatBytes(selectedFile.size)}</span>
                    <span className="compress-page-badge">Format: {inputFormat}</span>
                    {originalDimensions && (
                      <span className="compress-page-badge">
                        Dimensions: {originalDimensions.width} × {originalDimensions.height} px
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Format Selection & Settings Panel */}
            <div className="converter-settings-card">
              {/* Format Selection Row */}
              <div className="format-selector-section">
                <label className="settings-field-label">Choose Output Format</label>
                <div className="format-pills-row" role="radiogroup" aria-label="Output format selection">
                  {/* JPG Option */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={outputFormat === 'JPG'}
                    className={`format-pill-btn ${outputFormat === 'JPG' ? 'active' : ''}`}
                    onClick={() => handleSelectFormat('JPG')}
                    disabled={isProcessing}
                  >
                    <span className="format-pill-name">JPG</span>
                    <span className="format-pill-desc">Best for photos</span>
                  </button>

                  {/* PNG Option */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={outputFormat === 'PNG'}
                    className={`format-pill-btn ${outputFormat === 'PNG' ? 'active' : ''}`}
                    onClick={() => handleSelectFormat('PNG')}
                    disabled={isProcessing}
                  >
                    <span className="format-pill-name">PNG</span>
                    <span className="format-pill-desc">Lossless & Alpha</span>
                  </button>

                  {/* WEBP Option */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={outputFormat === 'WEBP'}
                    className={`format-pill-btn ${outputFormat === 'WEBP' ? 'active' : ''} ${
                      !isWebpSupported ? 'disabled' : ''
                    }`}
                    onClick={() => handleSelectFormat('WEBP')}
                    disabled={isProcessing || !isWebpSupported}
                    title={!isWebpSupported ? 'WEBP is not supported by your browser' : 'Modern web compression'}
                  >
                    <span className="format-pill-name">WEBP</span>
                    <span className="format-pill-desc">Modern & Compact</span>
                  </button>
                </div>
              </div>

              {/* Same-Format Re-encode Notice */}
              {isSameFormat && (
                <div className="converter-notice-box" role="status">
                  <span className="notice-icon">ℹ️</span>
                  <span className="notice-text">
                    You're converting to the same format ({outputFormat}). The image will be re-encoded.
                  </span>
                </div>
              )}

              {/* Format-Specific Settings */}
              <div className="format-options-section">
                {/* JPG Settings */}
                {outputFormat === 'JPG' && (
                  <div className="format-options-block">
                    {/* Quality Slider */}
                    <div className="converter-setting-item">
                      <div className="setting-label-row">
                        <label htmlFor="jpg-quality-slider" className="setting-title">
                          JPG Quality: <strong>{quality}%</strong>
                        </label>
                        <span className="setting-hint">Balanced size vs. fidelity</span>
                      </div>
                      <input
                        id="jpg-quality-slider"
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        disabled={isProcessing}
                        className="quality-range-slider"
                        aria-label="JPG quality slider"
                      />
                    </div>

                    {/* Transparency Background Selector (shown if input is PNG/WEBP) */}
                    {showJpgBgOptions && (
                      <div className="converter-bg-picker-box">
                        <div className="setting-label-row">
                          <span className="setting-title">Background for Transparent Regions</span>
                        </div>
                        <p className="bg-picker-explanation">
                          JPG does not support transparency. Transparent areas will use the selected background color.
                        </p>
                        <div className="bg-color-options-row" role="radiogroup" aria-label="JPG background color">
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selectedBgPreset === 'white'}
                            className={`bg-color-btn ${selectedBgPreset === 'white' ? 'active' : ''}`}
                            onClick={() => handleBgPresetChange('white')}
                            disabled={isProcessing}
                          >
                            <span className="color-swatch-circle swatch-white" aria-hidden="true"></span>
                            <span>White</span>
                          </button>
                          <button
                            type="button"
                            role="radio"
                            aria-checked={selectedBgPreset === 'black'}
                            className={`bg-color-btn ${selectedBgPreset === 'black' ? 'active' : ''}`}
                            onClick={() => handleBgPresetChange('black')}
                            disabled={isProcessing}
                          >
                            <span className="color-swatch-circle swatch-black" aria-hidden="true"></span>
                            <span>Black</span>
                          </button>
                          <div className={`bg-color-custom-wrap ${selectedBgPreset === 'custom' ? 'active' : ''}`}>
                            <label htmlFor="custom-bg-color-input" className="color-custom-label">
                              <span
                                className="color-swatch-circle"
                                style={{ backgroundColor: customBgColor }}
                                aria-hidden="true"
                              ></span>
                              <span>Custom</span>
                            </label>
                            <input
                              id="custom-bg-color-input"
                              type="color"
                              value={customBgColor}
                              onChange={handleCustomColorChange}
                              disabled={isProcessing}
                              className="color-picker-input"
                              aria-label="Select custom background color"
                            />
                            <span className="color-hex-text">{customBgColor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* PNG Settings */}
                {outputFormat === 'PNG' && (
                  <div className="format-options-block">
                    <div className="png-info-card">
                      <span className="info-icon">💎</span>
                      <div className="info-content">
                        <strong>Lossless PNG Encoding</strong>
                        <p>PNG preserves transparency and uses lossless encoding.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* WEBP Settings */}
                {outputFormat === 'WEBP' && (
                  <div className="format-options-block">
                    <div className="converter-setting-item">
                      <div className="setting-label-row">
                        <label htmlFor="webp-quality-slider" className="setting-title">
                          WEBP Quality: <strong>{quality}%</strong>
                        </label>
                        <span className="setting-hint">Modern compression with alpha transparency</span>
                      </div>
                      <input
                        id="webp-quality-slider"
                        type="range"
                        min="10"
                        max="100"
                        step="5"
                        value={quality}
                        onChange={(e) => setQuality(Number(e.target.value))}
                        disabled={isProcessing}
                        className="quality-range-slider"
                        aria-label="WEBP quality slider"
                      />
                    </div>
                    <p className="format-footnote">
                      WEBP provides modern high compression with transparency support.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Side-by-Side Preview Section */}
            <div className="bg-previews-container">
              {/* Original Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Original ({inputFormat})</span>
                    {originalDimensions && (
                      <span className="bg-preview-sub">
                        {originalDimensions.width} × {originalDimensions.height} px · {formatBytes(selectedFile.size)}
                      </span>
                    )}
                  </div>
                </div>
                <div
                  className={`bg-preview-viewport ${
                    inputFormat !== 'PNG' && inputFormat !== 'WEBP'
                      ? 'backdrop-white'
                      : previewBackdrop === 'checkerboard'
                      ? 'checkerboard-bg'
                      : previewBackdrop === 'white'
                      ? 'backdrop-white'
                      : 'backdrop-black'
                  }`}
                >
                  {originalPreviewUrl ? (
                    <img
                      src={originalPreviewUrl}
                      alt={`Original preview of ${selectedFile.name}`}
                      className="bg-preview-img"
                    />
                  ) : (
                    <div className="bg-preview-empty-state">
                      <p className="bg-empty-text">Loading original preview...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Converted Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Converted ({outputFormat})</span>
                    {convertedDimensions && (
                      <span className="bg-preview-sub">
                        {convertedDimensions.width} × {convertedDimensions.height} px · {formatBytes(convertedSize)}
                      </span>
                    )}
                  </div>

                  {/* Backdrop Toggle for transparent outputs (PNG / WEBP) */}
                  {(outputFormat === 'PNG' || outputFormat === 'WEBP') && convertedUrl && (
                    <div className="bg-backdrop-toggles" role="group" aria-label="Preview backdrop selection">
                      <button
                        type="button"
                        className={`backdrop-btn ${previewBackdrop === 'checkerboard' ? 'active' : ''}`}
                        onClick={() => setPreviewBackdrop('checkerboard')}
                        title="Preview against transparency checkerboard"
                        aria-pressed={previewBackdrop === 'checkerboard'}
                      >
                        🏁 Checker
                      </button>
                      <button
                        type="button"
                        className={`backdrop-btn ${previewBackdrop === 'white' ? 'active' : ''}`}
                        onClick={() => setPreviewBackdrop('white')}
                        title="Preview against white background"
                        aria-pressed={previewBackdrop === 'white'}
                      >
                        ⬜ White
                      </button>
                      <button
                        type="button"
                        className={`backdrop-btn ${previewBackdrop === 'black' ? 'active' : ''}`}
                        onClick={() => setPreviewBackdrop('black')}
                        title="Preview against black background"
                        aria-pressed={previewBackdrop === 'black'}
                      >
                        ⬛ Black
                      </button>
                    </div>
                  )}
                </div>
                <div
                  className={`bg-preview-viewport ${
                    outputFormat === 'JPG'
                      ? 'backdrop-white'
                      : previewBackdrop === 'checkerboard'
                      ? 'checkerboard-bg'
                      : previewBackdrop === 'white'
                      ? 'backdrop-white'
                      : 'backdrop-black'
                  }`}
                >
                  {convertedUrl ? (
                    <img
                      src={convertedUrl}
                      alt={`Converted preview of ${selectedFile.name} as ${outputFormat}`}
                      className="bg-preview-img"
                    />
                  ) : (
                    <div className="bg-preview-empty-state">
                      <span className="bg-empty-icon">🔄</span>
                      <p className="bg-empty-text">
                        Select output format above and click "Convert Image" to generate preview
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="convert-action-box" aria-live="polite">
                <div className="conversion-progress-box" role="status">
                  <div className="progress-info-row">
                    <span className="progress-status-label">
                      <span className="progress-spinner" aria-hidden="true"></span>
                      {processingState === 'CONVERTING' ? 'Converting image...' : 'Checking converted image...'}
                    </span>
                  </div>
                  <div className="indeterminate-progress-bar">
                    <div className="indeterminate-progress-fill"></div>
                  </div>
                </div>
                <p className="compress-subhint">
                  {processingState === 'CONVERTING'
                    ? `Encoding to ${outputFormat} directly in your browser with exact dimension preservation.`
                    : 'Validating decoded output dimensions against source image.'}
                </p>
              </div>
            )}

            {/* Success Banner */}
            {convertedUrl && !isProcessing && (
              <div className="compress-success-banner" role="status">
                <span className="success-banner-icon">🎉</span>
                <div className="success-banner-content">
                  <h3 className="success-banner-heading">Conversion Complete & Verified</h3>
                  <div className="compress-metrics-strip">
                    <span className="metric-pill">
                      Format: {inputFormat} → {outputFormat}
                    </span>
                    <span className="metric-pill highlight">
                      Dimensions: {convertedDimensions?.width} × {convertedDimensions?.height} px (Exact)
                    </span>
                    <span className="metric-badge green">
                      Size: {formatBytes(convertedSize)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="workbench-cta-bar">
              {!convertedUrl ? (
                <button
                  type="button"
                  className="btn-primary btn-lg"
                  onClick={handleConvert}
                  disabled={isProcessing}
                >
                  {isProcessing
                    ? processingState === 'CONVERTING'
                      ? 'Converting Image...'
                      : 'Checking Converted Image...'
                    : `🔄 Convert to ${outputFormat}`}
                </button>
              ) : (
                <div className="bg-action-group">
                  <button
                    type="button"
                    className="btn-primary btn-lg"
                    onClick={handleDownload}
                  >
                    ⬇️ Download {outputFormat} Image
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-lg"
                    onClick={resetAll}
                  >
                    Convert Another Image
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Feature Value Props */}
      <section className="features-grid" aria-label="Image Converter features">
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3 className="feature-title">100% Client-Side Privacy</h3>
          <p className="feature-desc">
            Your images are converted directly in your browser canvas. No files are uploaded to any server or third-party cloud.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📐</div>
          <h3 className="feature-title">Exact Dimensions Preserved</h3>
          <p className="feature-desc">
            Converting formats never resizes or distorts your photos. Every single pixel and original dimension is 100% maintained.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✨</div>
          <h3 className="feature-title">Alpha Transparency Control</h3>
          <p className="feature-desc">
            Preserve PNG and WEBP transparent alpha channels, or choose custom background colors when exporting to JPG.
          </p>
        </div>
      </section>

      {/* Educational & Explanatory Guide Section */}
      <section className="seo-guide-section" aria-label="Image Conversion Guide">
        <div className="guide-card">
          <h2 className="guide-title">How to Convert Images Online with FixMyFile</h2>
          <ol className="guide-steps">
            <li>
              <strong>Upload your image:</strong> Drag and drop your JPG, PNG, or WEBP file into the upload zone or click to select from your device.
            </li>
            <li>
              <strong>Select target format:</strong> Pick JPG, PNG, or WEBP depending on your project needs.
            </li>
            <li>
              <strong>Adjust settings:</strong> For JPG/WEBP, fine-tune the quality slider. If converting transparent PNG/WEBP to JPG, choose your background fill color.
            </li>
            <li>
              <strong>Convert & Download:</strong> Click "Convert", verify the side-by-side preview, and download your newly formatted image instantly.
            </li>
          </ol>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section" aria-label="Frequently Asked Questions">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          <div className="faq-item">
            <h3 className="faq-question">Are my images uploaded to an external server?</h3>
            <p className="faq-answer">
              No. FixMyFile processes all conversions strictly inside your browser using the HTML5 Canvas API. Your photos and images never leave your local machine.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">Does converting image formats change its dimensions?</h3>
            <p className="faq-answer">
              Never. FixMyFile preserves the exact pixel width and height of your source image. If you need to change dimensions, use our dedicated Image Resizer tool.
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">What happens to transparent regions when converting PNG to JPG?</h3>
            <p className="faq-answer">
              Because the JPEG standard does not support alpha transparency channels, transparent areas are filled with your chosen background color (white by default, black, or custom).
            </p>
          </div>
          <div className="faq-item">
            <h3 className="faq-question">Can I convert between the same format?</h3>
            <p className="faq-answer">
              Yes. Converting to the same format allows you to re-encode the image with custom quality parameters or apply explicit background colors.
            </p>
          </div>
        </div>
      </section>

      {/* Related Tools */}
      <section className="related-tools-section" aria-label="Related tools">
        <h2 className="section-title">Related Image Tools</h2>
        <div className="related-tools-grid">
          <Link to="/image-compressor" className="related-tool-card">
            <span className="related-badge">Image Optimization</span>
            <h3 className="related-title">Image Compressor</h3>
            <p className="related-desc">
              Reduce image file sizes while preserving visual clarity and alpha transparency.
            </p>
          </Link>
          <Link to="/image-resizer" className="related-tool-card">
            <span className="related-badge">Image Editing</span>
            <h3 className="related-title">Image Resizer</h3>
            <p className="related-desc">
              Resize JPG and PNG images with aspect ratio lock and social media presets.
            </p>
          </Link>
          <Link to="/background-remover" className="related-tool-card">
            <span className="related-badge">AI Image Editing</span>
            <h3 className="related-title">Background Remover</h3>
            <p className="related-desc">
              Instantly extract subjects from backgrounds with on-device client-side AI.
            </p>
          </Link>
          <Link to="/jpg-to-pdf" className="related-tool-card">
            <span className="related-badge">PDF Conversion</span>
            <h3 className="related-title">JPG to PDF</h3>
            <p className="related-desc">
              Convert one or multiple JPG images into a clean, formatted PDF document.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
