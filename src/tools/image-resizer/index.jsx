import { useState, useRef, useEffect } from 'react';
import ToolDetailContent from '../../components/ToolDetailContent';
import { Link } from 'react-router-dom';

// Format bytes into readable file size
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0 || bytes === null || bytes === undefined) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate sensible download filename
function getResizedDownloadName(originalName, isPng) {
  if (!originalName) return isPng ? 'image-resized.png' : 'image-resized.jpg';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  const ext = isPng ? 'png' : 'jpg';
  return `${cleanBase}-resized.${ext}`;
}

const POPULAR_PRESETS = [
  { label: '1920 × 1080', width: 1920, height: 1080, name: 'Full HD' },
  { label: '1600 × 1200', width: 1600, height: 1200, name: '4:3 Standard' },
  { label: '1080 × 1080', width: 1080, height: 1080, name: 'Square' },
  { label: '1080 × 1350', width: 1080, height: 1350, name: 'Portrait 4:5' },
  { label: '1080 × 1440', width: 1080, height: 1440, name: 'Portrait 3:4' },
  { label: '1080 × 1920', width: 1080, height: 1920, name: 'Story 9:16' },
  { label: '800 × 800', width: 800, height: 800, name: 'Thumbnail' }
];

export default function ImageResizerTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Resize dimension controls
  const [targetWidth, setTargetWidth] = useState('');
  const [targetHeight, setTargetHeight] = useState('');
  const [isRatioLocked, setIsRatioLocked] = useState(true);
  const [quality, setQuality] = useState(85);
  const [presetNotice, setPresetNotice] = useState(null);

  // Status & processing
  const [processingState, setProcessingState] = useState('IDLE'); // IDLE | RESIZING | SUCCESS | ERROR
  const [errorMessage, setErrorMessage] = useState(null);

  // Output state
  const [resizedBlob, setResizedBlob] = useState(null);
  const [resizedUrl, setResizedUrl] = useState(null);
  const [resizedSize, setResizedSize] = useState(null);
  const [resizedDimensions, setResizedDimensions] = useState(null);
  const [previewBackdrop, setPreviewBackdrop] = useState('checkerboard'); // checkerboard | white | black

  // Active refs for URL cleanup
  const activeOriginalUrlRef = useRef(null);
  const activeResizedUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  const isProcessing = processingState === 'RESIZING';

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Image Resizer Online — Resize Images for Free | FixMyFile';

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
      'Resize JPG and PNG images online for free. Change image dimensions while preserving aspect ratio and image quality directly in your browser.'
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
    activeResizedUrlRef.current = resizedUrl;
  }, [resizedUrl]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (activeOriginalUrlRef.current) {
        URL.revokeObjectURL(activeOriginalUrlRef.current);
      }
      if (activeResizedUrlRef.current) {
        URL.revokeObjectURL(activeResizedUrlRef.current);
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

  // Validate and stage file
  const processSelectedFile = (file) => {
    setErrorMessage(null);
    setPresetNotice(null);
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const isJpg = file.type === 'image/jpeg' || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
    const isPng = file.type === 'image/png' || fileNameLower.endsWith('.png');

    if (!isJpg && !isPng) {
      setErrorMessage('Unsupported file format. Please select a valid JPG, JPEG, or PNG image.');
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
    if (activeResizedUrlRef.current) {
      URL.revokeObjectURL(activeResizedUrlRef.current);
      setResizedUrl(null);
      setResizedBlob(null);
      setResizedSize(null);
      setResizedDimensions(null);
    }

    setProcessingState('IDLE');

    const url = URL.createObjectURL(file);
    setOriginalPreviewUrl(url);
    setSelectedFile(file);

    // Measure original dimensions
    const img = new Image();
    img.onload = () => {
      const origW = img.naturalWidth;
      const origH = img.naturalHeight;
      setOriginalDimensions({ width: origW, height: origH });
      setTargetWidth(origW);
      setTargetHeight(origH);
    };
    img.onerror = () => {
      setErrorMessage('Could not load image dimensions. The image file may be corrupted.');
    };
    img.src = url;
  };

  // Width input change handler
  const handleWidthChange = (valStr) => {
    setErrorMessage(null);
    setPresetNotice(null);
    setTargetWidth(valStr);

    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val > 0 && isRatioLocked && originalDimensions) {
      const ratio = originalDimensions.width / originalDimensions.height;
      const calculatedH = Math.max(1, Math.round(val / ratio));
      setTargetHeight(calculatedH);
    }
  };

  // Height input change handler
  const handleHeightChange = (valStr) => {
    setErrorMessage(null);
    setPresetNotice(null);
    setTargetHeight(valStr);

    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val > 0 && isRatioLocked && originalDimensions) {
      const ratio = originalDimensions.width / originalDimensions.height;
      const calculatedW = Math.max(1, Math.round(val * ratio));
      setTargetWidth(calculatedW);
    }
  };

  // Preset click handler
  const handlePresetSelect = (preset) => {
    setErrorMessage(null);
    if (!originalDimensions) return;

    if (isRatioLocked) {
      // Proportional Fit Inside target bounding box
      const scale = Math.min(preset.width / originalDimensions.width, preset.height / originalDimensions.height);
      const fitW = Math.max(1, Math.round(originalDimensions.width * scale));
      const fitH = Math.max(1, Math.round(originalDimensions.height * scale));
      setTargetWidth(fitW);
      setTargetHeight(fitH);
      setPresetNotice(`Fitted proportionally inside ${preset.width} × ${preset.height} (${preset.name}) without distortion.`);
    } else {
      // Exact dimensions (unlocked)
      setTargetWidth(preset.width);
      setTargetHeight(preset.height);
      setPresetNotice(`Set exact dimensions ${preset.width} × ${preset.height} (${preset.name}).`);
    }
  };

  // Toggle Aspect Ratio Lock
  const handleToggleRatioLock = () => {
    const nextLocked = !isRatioLocked;
    setIsRatioLocked(nextLocked);
    setPresetNotice(null);

    // If re-locking, recalculate height based on current width and original aspect ratio
    if (nextLocked && originalDimensions) {
      const curW = parseInt(targetWidth, 10);
      if (!isNaN(curW) && curW > 0) {
        const ratio = originalDimensions.width / originalDimensions.height;
        const calculatedH = Math.max(1, Math.round(curW / ratio));
        setTargetHeight(calculatedH);
      }
    }
  };

  // Execute client-side resize
  const handleResize = async () => {
    if (!selectedFile || isProcessing) return;

    setErrorMessage(null);

    const finalW = parseInt(targetWidth, 10);
    const finalH = parseInt(targetHeight, 10);

    // Dimensional and pixel safety validation
    if (isNaN(finalW) || isNaN(finalH) || finalW <= 0 || finalH <= 0) {
      setErrorMessage('Please enter valid positive dimensions for both width and height.');
      return;
    }

    const MAX_DIM = 10000;
    const MAX_PIXELS = 40000000; // 40 Megapixels

    if (finalW > MAX_DIM || finalH > MAX_DIM || finalW * finalH > MAX_PIXELS) {
      setErrorMessage('These dimensions are too large for your browser. Try smaller dimensions (under 10,000 px).');
      return;
    }

    setProcessingState('RESIZING');

    // Revoke previous resized output
    if (activeResizedUrlRef.current) {
      URL.revokeObjectURL(activeResizedUrlRef.current);
      setResizedUrl(null);
      setResizedBlob(null);
      setResizedSize(null);
      setResizedDimensions(null);
    }

    try {
      const fileNameLower = selectedFile.name.toLowerCase();
      const isPng = selectedFile.type === 'image/png' || fileNameLower.endsWith('.png');

      const img = new Image();
      const srcUrl = URL.createObjectURL(selectedFile);

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to decode source image.'));
        img.src = srcUrl;
      });

      URL.revokeObjectURL(srcUrl);

      // Create target canvas
      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context could not be created.');
      }

      // High-quality bicubic smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image scaled to target dimensions
      ctx.drawImage(img, 0, 0, finalW, finalH);

      let resultBlob;
      if (isPng) {
        // Preserves full alpha transparency channel
        resultBlob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });
      } else {
        // High quality JPEG with quality factor
        const qFactor = Math.max(0.05, Math.min(1.0, quality / 100));
        resultBlob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', qFactor);
        });
      }

      if (!resultBlob || resultBlob.size === 0) {
        throw new Error('Image resizing produced an empty result.');
      }

      const outUrl = URL.createObjectURL(resultBlob);
      setResizedBlob(resultBlob);
      setResizedUrl(outUrl);
      setResizedSize(resultBlob.size);
      setResizedDimensions({ width: finalW, height: finalH });
      setProcessingState('SUCCESS');
    } catch (err) {
      console.error('Resize error:', err);
      setErrorMessage(err.message || 'Image resizing failed. Please try again.');
      setProcessingState('ERROR');
    }
  };

  const handleDownload = () => {
    if (!resizedBlob || !selectedFile) return;

    const fileNameLower = selectedFile.name.toLowerCase();
    const isPng = selectedFile.type === 'image/png' || fileNameLower.endsWith('.png');
    const downloadName = getResizedDownloadName(selectedFile.name, isPng);

    const link = document.createElement('a');
    link.href = URL.createObjectURL(resizedBlob);
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  const resetAll = () => {
    if (activeOriginalUrlRef.current) {
      URL.revokeObjectURL(activeOriginalUrlRef.current);
    }
    if (activeResizedUrlRef.current) {
      URL.revokeObjectURL(activeResizedUrlRef.current);
    }

    setSelectedFile(null);
    setOriginalPreviewUrl(null);
    setOriginalDimensions(null);
    setTargetWidth('');
    setTargetHeight('');
    setIsRatioLocked(true);
    setPresetNotice(null);
    setResizedBlob(null);
    setResizedUrl(null);
    setResizedSize(null);
    setResizedDimensions(null);
    setProcessingState('IDLE');
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isPngFile =
    selectedFile &&
    (selectedFile.type === 'image/png' || selectedFile.name.toLowerCase().endsWith('.png'));

  // Calculated scale indicator
  const numW = parseInt(targetWidth, 10);
  const scaleRatio =
    originalDimensions && !isNaN(numW) && originalDimensions.width > 0
      ? (numW / originalDimensions.width).toFixed(2)
      : null;

  return (
    <div className="tool-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">
          Home
        </Link>
        <span className="breadcrumb-separator" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb-current">Image Resizer</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">Image Resizer</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro">
          Resize JPG and PNG images online to exact dimensions or social media presets.
          Preserves aspect ratio, image quality, and PNG alpha transparency with 100% client-side privacy.
        </p>
      </header>

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
      <section className="converter-card" aria-label="Image Resizer tool interface">
        {/* Hidden File Input (Always mounted) */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png"
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
            <div className="dropzone-icon">📐</div>
            <h2 className="dropzone-title">Drop your image here</h2>
            <p className="dropzone-subtext">or click to browse your computer or mobile device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.JPG / .JPEG</span>
              <span className="dropzone-badge">.PNG</span>
              <span className="dropzone-badge">Aspect Ratio Lock</span>
              <span className="dropzone-badge">Transparent PNG Preserved</span>
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
                <h2 className="workbench-title">Resize Workbench</h2>
                <span className="workbench-hint">
                  {resizedUrl
                    ? 'Image resized! Check preview and download your file.'
                    : 'Set target dimensions, choose presets, or lock aspect ratio.'}
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
                  {isPngFile ? 'PNG' : 'JPG'}
                </span>
                <div className="compress-file-meta">
                  <span className="compress-file-name" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <div className="compress-file-details">
                    <span>{formatBytes(selectedFile.size)}</span>
                    {originalDimensions && (
                      <span className="compress-page-badge">
                        Original: {originalDimensions.width} × {originalDimensions.height} px
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quality control for JPEG */}
              {!isPngFile && (
                <div className="resizer-quality-wrap">
                  <label htmlFor="resizer-quality" className="quality-label">
                    Quality: <strong>{quality}%</strong>
                  </label>
                  <input
                    id="resizer-quality"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    disabled={isProcessing}
                    className="quality-range-slider"
                    aria-label="JPEG quality slider"
                  />
                </div>
              )}
            </div>

            {/* Resize Dimension Controls Box */}
            <div className="resizer-controls-card">
              <div className="resizer-inputs-row">
                {/* Width Input */}
                <div className="dimension-input-group">
                  <label htmlFor="target-width-input" className="dimension-label">
                    Width (px)
                  </label>
                  <input
                    id="target-width-input"
                    type="number"
                    min="1"
                    max="10000"
                    value={targetWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    disabled={isProcessing}
                    className="dimension-number-input"
                    placeholder="Width"
                  />
                </div>

                {/* Aspect Ratio Lock Button */}
                <div className="ratio-lock-column">
                  <button
                    type="button"
                    className={`ratio-lock-btn ${isRatioLocked ? 'locked' : 'unlocked'}`}
                    onClick={handleToggleRatioLock}
                    disabled={isProcessing}
                    aria-pressed={isRatioLocked}
                    aria-label={isRatioLocked ? 'Aspect ratio locked' : 'Aspect ratio unlocked'}
                    title={isRatioLocked ? 'Aspect ratio is locked' : 'Aspect ratio is unlocked'}
                  >
                    <span className="lock-icon" aria-hidden="true">
                      {isRatioLocked ? '🔒' : '🔓'}
                    </span>
                    <span className="lock-text">{isRatioLocked ? 'Locked' : 'Unlocked'}</span>
                  </button>
                </div>

                {/* Height Input */}
                <div className="dimension-input-group">
                  <label htmlFor="target-height-input" className="dimension-label">
                    Height (px)
                  </label>
                  <input
                    id="target-height-input"
                    type="number"
                    min="1"
                    max="10000"
                    value={targetHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    disabled={isProcessing}
                    className="dimension-number-input"
                    placeholder="Height"
                  />
                </div>

                {/* Scale Multiplier Pill */}
                {scaleRatio && (
                  <div className="scale-indicator-group">
                    <span className="dimension-label">Scale Factor</span>
                    <div className="scale-badge">{scaleRatio}×</div>
                  </div>
                )}
              </div>

              {/* Aspect Ratio Status Hint */}
              <div className="ratio-status-row">
                {isRatioLocked ? (
                  <span className="ratio-hint-badge locked">
                    ✓ Aspect ratio locked: Proportional scaling active (no distortion)
                  </span>
                ) : (
                  <span className="ratio-hint-badge unlocked">
                    ⚠️ Aspect ratio unlocked: Output dimensions are independent and may distort image
                  </span>
                )}
              </div>

              {/* Preset Buttons Grid */}
              <div className="presets-section">
                <span className="presets-label">Popular Presets:</span>
                <div className="presets-grid" role="group" aria-label="Dimension presets">
                  {POPULAR_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="preset-pill-btn"
                      onClick={() => handlePresetSelect(p)}
                      disabled={isProcessing}
                      title={`${p.name} (${p.label})`}
                    >
                      <span className="preset-pill-title">{p.name}</span>
                      <span className="preset-pill-dim">{p.label}</span>
                    </button>
                  ))}
                </div>
                {presetNotice && <p className="preset-notice-text">{presetNotice}</p>}
              </div>
            </div>

            {/* Previews Grid: Original vs Resized */}
            <div className="bg-previews-grid">
              {/* Original Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <span className="bg-preview-title">Original Image</span>
                  {originalDimensions && (
                    <span className="bg-preview-sub">
                      {originalDimensions.width} × {originalDimensions.height} px
                    </span>
                  )}
                </div>
                <div className="bg-preview-viewport backdrop-white">
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

              {/* Resized Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Resized Image</span>
                    {resizedDimensions && (
                      <span className="bg-preview-sub">
                        {resizedDimensions.width} × {resizedDimensions.height} px · {formatBytes(resizedSize)}
                      </span>
                    )}
                  </div>
                  {/* Backdrop Toggle for transparent PNGs */}
                  {isPngFile && resizedUrl && (
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
                    !isPngFile
                      ? 'backdrop-white'
                      : previewBackdrop === 'checkerboard'
                      ? 'checkerboard-bg'
                      : previewBackdrop === 'white'
                      ? 'backdrop-white'
                      : 'backdrop-black'
                  }`}
                >
                  {resizedUrl ? (
                    <img
                      src={resizedUrl}
                      alt={`Resized preview of ${selectedFile.name}`}
                      className="bg-preview-img"
                    />
                  ) : (
                    <div className="bg-preview-empty-state">
                      <span className="bg-empty-icon">📐</span>
                      <p className="bg-empty-text">
                        Set dimensions above and click "Resize Image" to generate preview
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
                      Resizing image...
                    </span>
                  </div>
                  <div className="indeterminate-progress-bar">
                    <div className="indeterminate-progress-fill"></div>
                  </div>
                </div>
                <p className="compress-subhint">
                  Scaling pixels with high-fidelity interpolation directly in your browser.
                </p>
              </div>
            )}

            {/* Success Banner */}
            {resizedUrl && !isProcessing && (
              <div className="compress-success-banner" role="status">
                <span className="success-banner-icon">🎉</span>
                <div className="success-banner-content">
                  <h3 className="success-banner-heading">Image Resized Successfully</h3>
                  <div className="compress-metrics-strip">
                    <span className="metric-pill">
                      Original: {originalDimensions?.width} × {originalDimensions?.height} px
                    </span>
                    <span className="metric-arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="metric-pill highlight">
                      New: {resizedDimensions?.width} × {resizedDimensions?.height} px
                    </span>
                    <span className="metric-badge green">
                      Size: {formatBytes(resizedSize)}
                    </span>
                    <span className="metric-dim-badge">
                      Scale: {scaleRatio}×
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="workbench-cta-bar">
              {!resizedUrl ? (
                <button
                  type="button"
                  className="btn-primary btn-lg"
                  onClick={handleResize}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Resizing Image...' : '📐 Resize Image'}
                </button>
              ) : (
                <div className="bg-action-group">
                  <button
                    type="button"
                    className="btn-primary btn-lg"
                    onClick={handleDownload}
                  >
                    ⬇️ Download Resized {isPngFile ? 'PNG' : 'JPG'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-lg"
                    onClick={openFilePicker}
                  >
                    Resize Another Image
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="image-resizer" />
    </div>
  );
}
