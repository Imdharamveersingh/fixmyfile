import { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';

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
function getJpgDownloadName(originalName) {
  if (!originalName) return 'image-converted.jpg';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-converted.jpg`;
}

// Validate PNG input strictly
function isPngFile(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/png' || name.endsWith('.png');
}

export default function PngToJpgTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Conversion options
  const [quality, setQuality] = useState(80); // Default: 80%
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
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

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'PNG to JPG Converter Online — Convert PNG to JPG Free | FixMyFile';

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
      'Convert PNG images to JPG online for free. Choose a background color for transparent areas and convert images directly in your browser.'
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

  // Validate and load selected PNG file
  const processSelectedFile = (file) => {
    setErrorMessage(null);
    if (!file) return;

    if (!isPngFile(file)) {
      setErrorMessage('Please upload a PNG image.');
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
      setErrorMessage('Could not load image dimensions. The PNG file may be corrupted.');
      setProcessingState('ERROR');
      setSelectedFile(null);
      setOriginalPreviewUrl(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Background color selection
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

  // Execute client-side PNG to JPG conversion
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
      setErrorMessage('This image is too large to process safely in your browser.');
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
        img.onerror = () => reject(new Error('Failed to decode PNG image. The file may be damaged or invalid.'));
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

      // JPG does not support transparency: fill with selected background color
      ctx.fillStyle = backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Draw source PNG on top
      ctx.drawImage(img, 0, 0, width, height);

      // Encode canvas to JPEG Blob with selected quality
      const qFactor = Math.max(0.05, Math.min(1.0, quality / 100));
      const resultBlob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to encode image to JPG.'));
          },
          'image/jpeg',
          qFactor
        );
      });

      if (!resultBlob || resultBlob.size === 0) {
        throw new Error('Conversion produced an empty result.');
      }

      // Transition to VALIDATING state
      setProcessingState('VALIDATING');

      if (!resultBlob.type.includes('jpeg')) {
        throw new Error('Generated output is not a valid JPEG image.');
      }

      // Decode the generated output blob and verify natural dimensions
      const outUrl = URL.createObjectURL(resultBlob);
      const testImg = new Image();

      await new Promise((resolve, reject) => {
        testImg.onload = () => resolve();
        testImg.onerror = () => reject(new Error('Conversion failed. Please try another image.'));
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
      console.error('PNG to JPG conversion error:', err);
      setErrorMessage(err.message || 'Image conversion failed. Please try another image.');
      setProcessingState('ERROR');
    }
  };

  // Download converted JPG image
  const handleDownload = () => {
    if (!convertedBlob || !selectedFile) return;

    const downloadName = getJpgDownloadName(selectedFile.name);
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
    setOriginalPreviewUrl(null);
    setOriginalDimensions(null);
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

  return (
    <div className="tool-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="png-to-jpg"
        title="PNG to JPG Converter Online"
        description="Convert PNG images to high-quality JPG format online for free. Choose your background color for transparent regions, adjust compression quality, and preserve exact image dimensions."
      />

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
      <section className="converter-card" aria-label="PNG to JPG Converter tool interface">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/png,.png"
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
            aria-label="Upload a PNG image by clicking or dragging and dropping"
          >
            <div className="dropzone-icon">🖼️</div>
            <h2 className="dropzone-title">Drop your PNG image here</h2>
            <p className="dropzone-subtext">or click to browse your device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.PNG Only</span>
              <span className="dropzone-badge">Custom Background Color</span>
              <span className="dropzone-badge">Adjustable Quality</span>
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
              Choose PNG Image
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
                    ? 'Conversion verified! Inspect the preview and download your JPG file.'
                    : 'Choose your background color for transparent regions and click "Convert to JPG".'}
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
                  PNG
                </span>
                <div className="compress-file-meta">
                  <span className="compress-file-name" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <div className="compress-file-details">
                    <span>{formatBytes(selectedFile.size)}</span>
                    <span className="compress-page-badge">Format: PNG</span>
                    {originalDimensions && (
                      <span className="compress-page-badge">
                        Dimensions: {originalDimensions.width} × {originalDimensions.height} px
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Settings Box */}
            <div className="converter-settings-card">
              {/* Transparency Warning & Background Color Picker */}
              <div className="converter-bg-picker-box">
                <div className="setting-label-row">
                  <span className="setting-title">Background for Transparent Areas</span>
                </div>
                <p className="bg-picker-explanation">
                  JPG does not support transparency. Choose a background color for transparent areas.
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

              {/* Quality Range Slider */}
              <div className="converter-setting-item">
                <div className="setting-label-row">
                  <label htmlFor="png-to-jpg-quality-slider" className="setting-title">
                    JPG Quality: <strong>{quality}%</strong>
                  </label>
                  <span className="setting-hint">Balanced size vs. visual fidelity</span>
                </div>
                <input
                  id="png-to-jpg-quality-slider"
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
            </div>

            {/* Side-by-Side Preview Section */}
            <div className="bg-previews-container">
              {/* Original Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Original (PNG)</span>
                    {originalDimensions && (
                      <span className="bg-preview-sub">
                        {originalDimensions.width} × {originalDimensions.height} px · {formatBytes(selectedFile.size)}
                      </span>
                    )}
                  </div>
                  {/* Backdrop Toggles */}
                  <div className="bg-backdrop-toggles" role="group" aria-label="Original preview backdrop">
                    <button
                      type="button"
                      className={`backdrop-btn ${previewBackdrop === 'checkerboard' ? 'active' : ''}`}
                      onClick={() => setPreviewBackdrop('checkerboard')}
                      title="Preview against checkerboard"
                      aria-pressed={previewBackdrop === 'checkerboard'}
                    >
                      🏁 Checker
                    </button>
                    <button
                      type="button"
                      className={`backdrop-btn ${previewBackdrop === 'white' ? 'active' : ''}`}
                      onClick={() => setPreviewBackdrop('white')}
                      title="Preview against white"
                      aria-pressed={previewBackdrop === 'white'}
                    >
                      ⬜ White
                    </button>
                    <button
                      type="button"
                      className={`backdrop-btn ${previewBackdrop === 'black' ? 'active' : ''}`}
                      onClick={() => setPreviewBackdrop('black')}
                      title="Preview against black"
                      aria-pressed={previewBackdrop === 'black'}
                    >
                      ⬛ Black
                    </button>
                  </div>
                </div>
                <div
                  className={`bg-preview-viewport ${
                    previewBackdrop === 'checkerboard'
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
                    <span className="bg-preview-title">Converted (JPG)</span>
                    {convertedDimensions && (
                      <span className="bg-preview-sub">
                        {convertedDimensions.width} × {convertedDimensions.height} px · {formatBytes(convertedSize)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="bg-preview-viewport backdrop-white">
                  {convertedUrl ? (
                    <img
                      src={convertedUrl}
                      alt={`Converted JPG preview of ${selectedFile.name}`}
                      className="bg-preview-img"
                    />
                  ) : (
                    <div className="bg-preview-empty-state">
                      <span className="bg-empty-icon">🖼️</span>
                      <p className="bg-empty-text">
                        Select background color above and click "Convert to JPG" to generate preview
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
                      {processingState === 'CONVERTING' ? 'Converting PNG to JPG...' : 'Checking JPG...'}
                    </span>
                  </div>
                  <div className="indeterminate-progress-bar">
                    <div className="indeterminate-progress-fill"></div>
                  </div>
                </div>
                <p className="compress-subhint">
                  {processingState === 'CONVERTING'
                    ? 'Applying background color and encoding to JPG directly in your browser.'
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
                      Format: PNG → JPG
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
                      ? 'Converting PNG to JPG...'
                      : 'Checking JPG...'
                    : '🔄 Convert to JPG'}
                </button>
              ) : (
                <div className="bg-action-group">
                  <button
                    type="button"
                    className="btn-primary btn-lg"
                    onClick={handleDownload}
                  >
                    ⬇️ Download JPG Image
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
      <section className="features-grid" aria-label="PNG to JPG Converter features">
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3 className="feature-title">100% Local & Private</h3>
          <p className="feature-desc">
            Your images are converted directly inside your browser. No files are ever uploaded to any server or cloud API.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🎨</div>
          <h3 className="feature-title">Custom Background Fills</h3>
          <p className="feature-desc">
            Choose white, black, or any custom color to fill transparent areas seamlessly when converting to JPG.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📐</div>
          <h3 className="feature-title">1:1 Exact Dimensions</h3>
          <p className="feature-desc">
            Converting formats maintains 100% of your source dimensions without downscaling, stretching, or cropping.
          </p>
        </div>
      </section>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="png-to-jpg" />
    </div>
  );
}
