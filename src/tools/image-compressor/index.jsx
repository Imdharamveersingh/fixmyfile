import { useState, useRef, useEffect } from 'react';
import ToolDetailContent from '../../components/ToolDetailContent';
import { Link } from 'react-router-dom';
import UPNG from 'upng-js';

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
function getCompressedDownloadName(originalName, isPng) {
  if (!originalName) return isPng ? 'image-compressed.png' : 'image-compressed.jpg';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_') || 'image';
  const ext = isPng ? 'png' : 'jpg';
  return `${cleanBase}-compressed.${ext}`;
}

export default function ImageCompressorTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Compression controls
  const [quality, setQuality] = useState(80);
  const [processingState, setProcessingState] = useState('IDLE'); // IDLE | COMPRESSING | SUCCESS | ERROR
  const [errorMessage, setErrorMessage] = useState(null);

  // Result state
  const [compressedBlob, setCompressedBlob] = useState(null);
  const [compressedUrl, setCompressedUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  const [compressedDimensions, setCompressedDimensions] = useState(null);
  const [previewBackdrop, setPreviewBackdrop] = useState('checkerboard'); // checkerboard | white | black

  // Active refs for URL cleanup
  const activeOriginalUrlRef = useRef(null);
  const activeCompressedUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  const isProcessing = processingState === 'COMPRESSING';

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Image Compressor Online — Compress Images for Free | FixMyFile';

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
      'Compress JPG and PNG images online for free while keeping image dimensions and quality under your control. Images are processed directly in your browser.'
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
    activeCompressedUrlRef.current = compressedUrl;
  }, [compressedUrl]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (activeOriginalUrlRef.current) {
        URL.revokeObjectURL(activeOriginalUrlRef.current);
      }
      if (activeCompressedUrlRef.current) {
        URL.revokeObjectURL(activeCompressedUrlRef.current);
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
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const isJpg = file.type === 'image/jpeg' || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
    const isPng = file.type === 'image/png' || fileNameLower.endsWith('.png');

    if (!isJpg && !isPng) {
      setErrorMessage('Unsupported file format. Please select a valid JPG, JPEG, or PNG image.');
      return;
    }

    const MAX_SIZE = 30 * 1024 * 1024; // 30 MB safe browser limit
    if (file.size > MAX_SIZE) {
      setErrorMessage(`File size (${formatBytes(file.size)}) exceeds the 30MB limit. Please choose a smaller image.`);
      return;
    }

    // Clean up previous URLs
    if (activeOriginalUrlRef.current) {
      URL.revokeObjectURL(activeOriginalUrlRef.current);
      setOriginalPreviewUrl(null);
    }
    if (activeCompressedUrlRef.current) {
      URL.revokeObjectURL(activeCompressedUrlRef.current);
      setCompressedUrl(null);
      setCompressedBlob(null);
      setCompressedSize(null);
      setCompressedDimensions(null);
    }

    setProcessingState('IDLE');

    const url = URL.createObjectURL(file);
    setOriginalPreviewUrl(url);
    setSelectedFile(file);

    // Measure original dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setErrorMessage('Could not load image dimensions. The image file may be corrupted.');
    };
    img.src = url;
  };

  // Perform client-side compression
  const handleCompress = async () => {
    if (!selectedFile || isProcessing) return;

    setProcessingState('COMPRESSING');
    setErrorMessage(null);

    // Clean up previous compressed result
    if (activeCompressedUrlRef.current) {
      URL.revokeObjectURL(activeCompressedUrlRef.current);
      setCompressedUrl(null);
      setCompressedBlob(null);
      setCompressedSize(null);
      setCompressedDimensions(null);
    }

    try {
      const fileNameLower = selectedFile.name.toLowerCase();
      const isPng = selectedFile.type === 'image/png' || fileNameLower.endsWith('.png');

      // Create an offscreen image to draw on canvas
      const img = new Image();
      const srcUrl = URL.createObjectURL(selectedFile);

      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to decode image.'));
        img.src = srcUrl;
      });

      URL.revokeObjectURL(srcUrl);

      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (!width || !height) {
        throw new Error('Invalid image dimensions.');
      }

      // Render onto canvas with 1:1 original dimensions
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context could not be created.');
      }

      // Draw image preserving original colors and transparency
      ctx.drawImage(img, 0, 0, width, height);

      let resultBlob;

      if (isPng) {
        // High-fidelity client-side PNG compression using UPNG.js
        const imageData = ctx.getImageData(0, 0, width, height);
        const upngLib = UPNG.default || UPNG;

        let pngBuffer;
        if (quality === 100) {
          // Lossless PNG compression with Deflate
          pngBuffer = upngLib.encode([imageData.data.buffer], width, height, 0);
        } else {
          // Color quantization (cnum: 16 to 256 colors based on quality slider)
          // 80% default maps to ~205 colors, 90% maps to 230, etc.
          const cnum = Math.max(16, Math.min(256, Math.round(16 + (quality / 100) * 240)));
          pngBuffer = upngLib.encode([imageData.data.buffer], width, height, cnum);
        }

        resultBlob = new Blob([pngBuffer], { type: 'image/png' });
      } else {
        // High-fidelity client-side JPEG compression using Canvas API
        const qFactor = Math.max(0.05, Math.min(1.0, quality / 100));
        resultBlob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', qFactor);
        });
      }

      if (!resultBlob || resultBlob.size === 0) {
        throw new Error('Image compression produced an empty result.');
      }

      const outUrl = URL.createObjectURL(resultBlob);
      setCompressedBlob(resultBlob);
      setCompressedUrl(outUrl);
      setCompressedSize(resultBlob.size);
      setCompressedDimensions({ width, height });
      setProcessingState('SUCCESS');
    } catch (err) {
      console.error('Compression error:', err);
      setErrorMessage(err.message || 'Image compression failed. Please try another image.');
      setProcessingState('ERROR');
    }
  };

  const handleDownload = () => {
    if (!compressedBlob || !selectedFile) return;

    const fileNameLower = selectedFile.name.toLowerCase();
    const isPng = selectedFile.type === 'image/png' || fileNameLower.endsWith('.png');

    // If compressed file is larger than original, offer the original file so user never gets inflated download
    const finalBlobToDownload =
      compressedSize && compressedSize > selectedFile.size ? selectedFile : compressedBlob;

    const downloadName = getCompressedDownloadName(selectedFile.name, isPng);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(finalBlobToDownload);
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
    if (activeCompressedUrlRef.current) {
      URL.revokeObjectURL(activeCompressedUrlRef.current);
    }

    setSelectedFile(null);
    setOriginalPreviewUrl(null);
    setImageDimensions(null);
    setCompressedBlob(null);
    setCompressedUrl(null);
    setCompressedSize(null);
    setCompressedDimensions(null);
    setProcessingState('IDLE');
    setErrorMessage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculations for size reduction
  const originalBytes = selectedFile?.size || 0;
  const isPngFile =
    selectedFile &&
    (selectedFile.type === 'image/png' || selectedFile.name.toLowerCase().endsWith('.png'));

  const savedBytes = compressedSize !== null ? originalBytes - compressedSize : 0;
  const reductionPercent =
    originalBytes > 0 && compressedSize !== null
      ? ((savedBytes / originalBytes) * 100).toFixed(1)
      : '0.0';

  const isReduced = savedBytes > 0;

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
        <span className="breadcrumb-current">Image Compressor</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">Image Compressor</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro">
          Compress JPG and PNG images directly in your browser with fine-tuned quality control.
          Preserves original dimensions and transparent PNG alpha channels with 100% client-side privacy.
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
      <section className="converter-card" aria-label="Image Compressor tool interface">
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
            <div className="dropzone-icon">🗜️</div>
            <h2 className="dropzone-title">Drop your image here</h2>
            <p className="dropzone-subtext">or click to browse your computer or mobile device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.JPG / .JPEG</span>
              <span className="dropzone-badge">.PNG</span>
              <span className="dropzone-badge">Exact Dimensions Preserved</span>
              <span className="dropzone-badge">100% Client-Side Privacy</span>
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
                <h2 className="workbench-title">Image Workbench</h2>
                <span className="workbench-hint">
                  {compressedUrl
                    ? 'Compression complete! Review file size and download your image.'
                    : 'Adjust quality and compress image without altering dimensions.'}
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
                    {imageDimensions && (
                      <span className="compress-page-badge">
                        {imageDimensions.width} × {imageDimensions.height} px
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quality Slider Control */}
              <div className="compressor-quality-control">
                <div className="quality-label-row">
                  <label htmlFor="quality-slider" className="quality-label">
                    Quality: <strong>{quality}%</strong>
                  </label>
                  <span className="quality-hint-text">
                    {quality <= 40
                      ? 'Maximum Compression'
                      : quality <= 70
                      ? 'High Compression'
                      : quality <= 85
                      ? 'Balanced (Recommended)'
                      : quality < 100
                      ? 'High Quality'
                      : 'Maximum Fidelity'}
                  </span>
                </div>
                <div className="quality-slider-wrapper">
                  <input
                    id="quality-slider"
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    disabled={isProcessing}
                    className="quality-range-slider"
                    aria-label="Compression quality percentage"
                  />
                  <div className="quality-presets" role="group" aria-label="Quality presets">
                    <button
                      type="button"
                      className={`preset-btn ${quality === 40 ? 'active' : ''}`}
                      onClick={() => setQuality(40)}
                      disabled={isProcessing}
                    >
                      40%
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${quality === 60 ? 'active' : ''}`}
                      onClick={() => setQuality(60)}
                      disabled={isProcessing}
                    >
                      60%
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${quality === 80 ? 'active' : ''}`}
                      onClick={() => setQuality(80)}
                      disabled={isProcessing}
                    >
                      80%
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${quality === 90 ? 'active' : ''}`}
                      onClick={() => setQuality(90)}
                      disabled={isProcessing}
                    >
                      90%
                    </button>
                    <button
                      type="button"
                      className={`preset-btn ${quality === 100 ? 'active' : ''}`}
                      onClick={() => setQuality(100)}
                      disabled={isProcessing}
                    >
                      100%
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Previews Grid: Original vs Compressed */}
            <div className="bg-previews-grid">
              {/* Original Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <span className="bg-preview-title">Original Image</span>
                  {imageDimensions && (
                    <span className="bg-preview-sub">
                      {imageDimensions.width} × {imageDimensions.height} px · {formatBytes(selectedFile.size)}
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
                      <p className="bg-empty-text">Loading preview...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Compressed Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Compressed Image</span>
                    {compressedDimensions && (
                      <span className="bg-preview-sub">
                        {compressedDimensions.width} × {compressedDimensions.height} px · {formatBytes(compressedSize)}
                      </span>
                    )}
                  </div>
                  {/* Backdrop Toggle for transparent PNGs */}
                  {isPngFile && compressedUrl && (
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
                  {compressedUrl ? (
                    <img
                      src={compressedUrl}
                      alt={`Compressed preview of ${selectedFile.name}`}
                      className="bg-preview-img"
                    />
                  ) : (
                    <div className="bg-preview-empty-state">
                      <span className="bg-empty-icon">🗜️</span>
                      <p className="bg-empty-text">
                        Click "Compress Image" below to encode and optimize
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
                      Compressing image...
                    </span>
                  </div>
                  <div className="indeterminate-progress-bar">
                    <div className="indeterminate-progress-fill"></div>
                  </div>
                </div>
                <p className="compress-subhint">
                  {isPngFile
                    ? 'Optimizing PNG color palette and Deflate compression in-browser. Zero server uploads.'
                    : 'Applying JPEG discrete cosine transform compression in-browser. 100% private.'}
                </p>
              </div>
            )}

            {/* Success Comparison Banner */}
            {compressedUrl && !isProcessing && (
              <div
                className={`compress-success-banner ${!isReduced ? 'banner-neutral' : ''}`}
                role="status"
              >
                <span className="success-banner-icon">{isReduced ? '🎉' : 'ℹ️'}</span>
                <div className="success-banner-content">
                  <h3 className="success-banner-heading">
                    {isReduced ? 'Image Compressed Successfully' : 'Already Optimized Image'}
                  </h3>
                  {isReduced ? (
                    <div className="compress-metrics-strip">
                      <span className="metric-pill">
                        Original: <strong>{formatBytes(originalBytes)}</strong>
                      </span>
                      <span className="metric-arrow" aria-hidden="true">
                        →
                      </span>
                      <span className="metric-pill highlight">
                        Compressed: <strong>{formatBytes(compressedSize)}</strong>
                      </span>
                      <span className="metric-badge green">
                        Saved: {formatBytes(savedBytes)} (-{reductionPercent}%)
                      </span>
                      <span className="metric-dim-badge">
                        Dimensions: {compressedDimensions.width} × {compressedDimensions.height} px (1:1)
                      </span>
                    </div>
                  ) : (
                    <p className="success-banner-sub">
                      Compression did not reduce this file. Original file is already highly optimized.
                      You can still download the optimized output or keep your original file.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="workbench-cta-bar">
              {!compressedUrl ? (
                <button
                  type="button"
                  className="btn-primary btn-lg"
                  onClick={handleCompress}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Compressing Image...' : '🗜️ Compress Image'}
                </button>
              ) : (
                <div className="bg-action-group">
                  <button
                    type="button"
                    className="btn-primary btn-lg"
                    onClick={handleDownload}
                  >
                    ⬇️ Download Compressed {isPngFile ? 'PNG' : 'JPG'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-lg"
                    onClick={openFilePicker}
                  >
                    Compress Another Image
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="image-compressor" />
    </div>
  );
}
