import { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
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
function getPngDownloadName(originalName) {
  if (!originalName) return 'image-converted.png';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-converted.png`;
}

// Validate JPG/JPEG input strictly
function isJpgFile(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
}

export default function JpgToPngTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Processing & Status
  const [processingState, setProcessingState] = useState('IDLE'); // 'IDLE' | 'LOADING' | 'CONVERTING' | 'VALIDATING' | 'SUCCESS' | 'ERROR'
  const [errorMessage, setErrorMessage] = useState(null);

  // Converted result
  const [convertedBlob, setConvertedBlob] = useState(null);
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [convertedSize, setConvertedSize] = useState(null);
  const [convertedDimensions, setConvertedDimensions] = useState(null);
  const [previewBackdrop, setPreviewBackdrop] = useState('white'); // 'white' | 'checkerboard' | 'black'

  // Active refs for object URL revocation
  const activeOriginalUrlRef = useRef(null);
  const activeConvertedUrlRef = useRef(null);
  const fileInputRef = useRef(null);

  const isProcessing = processingState === 'CONVERTING' || processingState === 'VALIDATING';

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'JPG to PNG Converter Online — Convert JPG to PNG Free | FixMyFile';

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
      'Convert JPG and JPEG images to PNG online for free. Preserve image dimensions and convert files directly in your browser.'
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

  // Validate and load selected JPG file
  const processSelectedFile = (file) => {
    setErrorMessage(null);
    if (!file) return;

    if (!isJpgFile(file)) {
      setErrorMessage('Please upload a JPG or JPEG image.');
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
      setErrorMessage('Could not load image dimensions. The JPG file may be corrupted.');
      setProcessingState('ERROR');
      setSelectedFile(null);
      setOriginalPreviewUrl(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // Execute client-side JPG to PNG conversion
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
        img.onerror = () => reject(new Error('Failed to decode JPG image. The file may be damaged or invalid.'));
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

      // Clear canvas and draw source JPG
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Encode canvas to PNG Blob
      const resultBlob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to encode image to PNG.'));
        }, 'image/png');
      });

      if (!resultBlob || resultBlob.size === 0) {
        throw new Error('Conversion produced an empty result.');
      }

      // Transition to VALIDATING state
      setProcessingState('VALIDATING');

      if (!resultBlob.type.includes('png')) {
        throw new Error('Generated output is not a valid PNG image.');
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
      console.error('JPG to PNG conversion error:', err);
      setErrorMessage(err.message || 'Image conversion failed. Please try another image.');
      setProcessingState('ERROR');
    }
  };

  // Download converted PNG image
  const handleDownload = () => {
    if (!convertedBlob || !selectedFile) return;

    const downloadName = getPngDownloadName(selectedFile.name);
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
        toolId="jpg-to-png"
        title="JPG to PNG Converter Online"
        description="Convert JPG and JPEG images to high-fidelity PNG format online for free. Preserves original pixel dimensions with 100% privacy directly in your browser."
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
      <section className="converter-card" aria-label="JPG to PNG Converter tool interface">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/jpeg,image/jpg,.jpg,.jpeg"
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
            aria-label="Upload a JPG image by clicking or dragging and dropping"
          >
            <div className="dropzone-icon" aria-hidden="true">
            <ToolIcon icon="jpg-to-png" size={48} />
          </div>
            <h2 className="dropzone-title">Drop your JPG image here</h2>
            <p className="dropzone-subtext">or click to browse your device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.JPG / .JPEG Only</span>
              <span className="dropzone-badge">Lossless PNG Output</span>
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
              Choose JPG Image
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
                    ? 'Conversion verified! Inspect the preview and download your PNG file.'
                    : 'Click "Convert to PNG" to process your image.'}
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
                  JPG
                </span>
                <div className="compress-file-meta">
                  <span className="compress-file-name" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <div className="compress-file-details">
                    <span>{formatBytes(selectedFile.size)}</span>
                    <span className="compress-page-badge">Format: JPG</span>
                    {originalDimensions && (
                      <span className="compress-page-badge">
                        Dimensions: {originalDimensions.width} × {originalDimensions.height} px
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Details Notice Card */}
            <div className="converter-settings-card">
              <div className="png-info-card">
                <span className="info-icon">💎</span>
                <div className="info-content">
                  <strong>Lossless PNG Output</strong>
                  <p>
                    Your JPG image will be decoded and re-encoded into a high-fidelity, uncompressed PNG image.
                    All original pixel dimensions are preserved 100% without downscaling.
                  </p>
                </div>
              </div>
              <p className="format-footnote">
                Note: Standard JPG images do not contain an alpha transparency channel.
                Converting JPG to PNG converts the container format to lossless PNG without altering the image background.
              </p>
            </div>

            {/* Side-by-Side Preview Section */}
            <div className="bg-previews-container">
              {/* Original Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Original (JPG)</span>
                    {originalDimensions && (
                      <span className="bg-preview-sub">
                        {originalDimensions.width} × {originalDimensions.height} px · {formatBytes(selectedFile.size)}
                      </span>
                    )}
                  </div>
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

              {/* Converted Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Converted (PNG)</span>
                    {convertedDimensions && (
                      <span className="bg-preview-sub">
                        {convertedDimensions.width} × {convertedDimensions.height} px · {formatBytes(convertedSize)}
                      </span>
                    )}
                  </div>

                  {/* Backdrop Toggle */}
                  {convertedUrl && (
                    <div className="bg-backdrop-toggles" role="group" aria-label="Preview backdrop selection">
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
                        className={`backdrop-btn ${previewBackdrop === 'checkerboard' ? 'active' : ''}`}
                        onClick={() => setPreviewBackdrop('checkerboard')}
                        title="Preview against transparency checkerboard"
                        aria-pressed={previewBackdrop === 'checkerboard'}
                      >
                        🏁 Checker
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
                    previewBackdrop === 'checkerboard'
                      ? 'checkerboard-bg'
                      : previewBackdrop === 'black'
                      ? 'backdrop-black'
                      : 'backdrop-white'
                  }`}
                >
                  {convertedUrl ? (
                    <img
                      src={convertedUrl}
                      alt={`Converted PNG preview of ${selectedFile.name}`}
                      className="bg-preview-img"
                    />
                  ) : (
                    <div className="bg-preview-empty-state">
                      <span className="bg-empty-icon">🖼️</span>
                      <p className="bg-empty-text">
                        Click "Convert to PNG" below to generate preview
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
                      {processingState === 'CONVERTING' ? 'Converting JPG to PNG...' : 'Checking PNG...'}
                    </span>
                  </div>
                  <div className="indeterminate-progress-bar">
                    <div className="indeterminate-progress-fill"></div>
                  </div>
                </div>
                <p className="compress-subhint">
                  {processingState === 'CONVERTING'
                    ? 'Encoding image to lossless PNG directly in your browser with exact dimension preservation.'
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
                      Format: JPG → PNG
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
                      ? 'Converting JPG to PNG...'
                      : 'Checking PNG...'
                    : '🔄 Convert to PNG'}
                </button>
              ) : (
                <div className="bg-action-group">
                  <button
                    type="button"
                    className="btn-primary btn-lg"
                    onClick={handleDownload}
                  >
                    ⬇️ Download PNG Image
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
      <section className="features-grid" aria-label="JPG to PNG Converter features">
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h3 className="feature-title">100% Client-Side Privacy</h3>
          <p className="feature-desc">
            Your images are converted locally inside your browser. No files are ever sent to external servers or cloud services.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📐</div>
          <h3 className="feature-title">1:1 Dimension Preservation</h3>
          <p className="feature-desc">
            Converting JPG to PNG maintains every pixel and exact source dimensions. No downscaling, stretching, or cropping.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">💎</div>
          <h3 className="feature-title">Lossless PNG Standard</h3>
          <p className="feature-desc">
            Converts into standard, decodable PNG files compatible with all browsers, operating systems, and image viewers.
          </p>
        </div>
      </section>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="jpg-to-png" />
    </div>
  );
}
