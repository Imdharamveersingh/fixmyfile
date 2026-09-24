import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';
import { formatBytes } from '../../utils/helpers';

export default function BackgroundRemoverTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [imageDimensions, setImageDimensions] = useState(null);
  const [qualityMode, setQualityMode] = useState('isnet_fp16'); // 'isnet_fp16' (High) or 'isnet_quint8' (Fast)
  const [previewBackdrop, setPreviewBackdrop] = useState('checkerboard'); // 'checkerboard', 'white', 'black'

  // Processing States: 'IDLE' | 'LOADING_MODEL' | 'MODEL_READY' | 'ANALYZING' | 'REMOVING_BACKGROUND' | 'GENERATING_OUTPUT' | 'SUCCESS' | 'ERROR'
  const [processingState, setProcessingState] = useState('IDLE');
  const [modelDownloadPercent, setModelDownloadPercent] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [processedUrl, setProcessedUrl] = useState(null);
  const [processedSize, setProcessedSize] = useState(null);
  const [processedDimensions, setProcessedDimensions] = useState(null);
  const [downloadFilename, setDownloadFilename] = useState('image-no-bg.png');

  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const activeOriginalUrlRef = useRef(null);
  const activeProcessedUrlRef = useRef(null);
  const processingPhaseRef = useRef('IDLE');

  const isProcessing =
    processingState === 'LOADING_MODEL' ||
    processingState === 'MODEL_READY' ||
    processingState === 'ANALYZING' ||
    processingState === 'REMOVING_BACKGROUND' ||
    processingState === 'GENERATING_OUTPUT';

  const getButtonText = () => {
    switch (processingState) {
      case 'LOADING_MODEL':
      case 'MODEL_READY':
        return 'Preparing AI Model...';
      case 'ANALYZING':
      case 'REMOVING_BACKGROUND':
        return 'Removing Background...';
      case 'GENERATING_OUTPUT':
        return 'Generating Transparent PNG...';
      default:
        return '🪄 Remove Background';
    }
  };

  // SEO Page Title & Meta Description
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Background Remover Online — Remove Image Background | FixMyFile';

    let metaDesc = document.querySelector('meta[name="description"]');
    let createdMeta = false;
    let prevMetaContent = '';

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
      'Remove image backgrounds online for free with FixMyFile. Create transparent PNG images directly in your browser.'
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
    activeProcessedUrlRef.current = processedUrl;
  }, [processedUrl]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      if (activeOriginalUrlRef.current) {
        URL.revokeObjectURL(activeOriginalUrlRef.current);
      }
      if (activeProcessedUrlRef.current) {
        URL.revokeObjectURL(activeProcessedUrlRef.current);
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

    const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
    if (file.size > MAX_SIZE) {
      setErrorMessage(`File size (${formatBytes(file.size)}) exceeds the 25MB limit. Please choose a smaller image.`);
      return;
    }

    // Clean up previous URLs
    if (activeOriginalUrlRef.current) {
      URL.revokeObjectURL(activeOriginalUrlRef.current);
      setOriginalPreviewUrl(null);
    }
    if (activeProcessedUrlRef.current) {
      URL.revokeObjectURL(activeProcessedUrlRef.current);
      setProcessedUrl(null);
      setProcessedSize(null);
      setProcessedDimensions(null);
    }

    setProcessingState('IDLE');
    processingPhaseRef.current = 'IDLE';
    setModelDownloadPercent(null);
    setStatusMessage('');

    const url = URL.createObjectURL(file);
    setOriginalPreviewUrl(url);
    setSelectedFile(file);

    // Compute base filename for download
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'image';
    setDownloadFilename(`${cleanBaseName}-no-bg.png`);

    // Load dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      setImageDimensions(null);
    };
    img.src = url;
  };

  // Run background removal
  const handleRemoveBackground = async () => {
    if (!selectedFile || isProcessing) return;

    setErrorMessage(null);
    setProcessingState('LOADING_MODEL');
    processingPhaseRef.current = 'LOADING_MODEL';
    setModelDownloadPercent(null);
    setStatusMessage('Preparing AI model...');

    try {
      // Lazy load @imgly/background-removal so it never blocks unrelated routes
      const { removeBackground } = await import('@imgly/background-removal');

      const config = {
        model: qualityMode,
        progress: (key, current, total) => {
          if (typeof key === 'string' && key.startsWith('fetch:')) {
            processingPhaseRef.current = 'LOADING_MODEL';
            setProcessingState('LOADING_MODEL');
            if (total > 0) {
              const pct = Math.min(100, Math.round((current / total) * 100));
              setModelDownloadPercent(pct);
              if (pct < 100) {
                setStatusMessage(`Downloading AI model... ${pct}%`);
              } else {
                processingPhaseRef.current = 'MODEL_READY';
                setProcessingState('MODEL_READY');
                setStatusMessage('AI model ready ✓');
              }
            } else {
              setStatusMessage('Preparing AI model...');
            }
          } else if (key === 'compute:decode') {
            processingPhaseRef.current = 'ANALYZING';
            setProcessingState('ANALYZING');
            setStatusMessage('Analyzing image...');
          } else if (key === 'compute:inference' || key === 'compute:mask') {
            processingPhaseRef.current = 'REMOVING_BACKGROUND';
            setProcessingState('REMOVING_BACKGROUND');
            setStatusMessage('Removing background...');
          } else if (key === 'compute:encode') {
            processingPhaseRef.current = 'GENERATING_OUTPUT';
            setProcessingState('GENERATING_OUTPUT');
            setStatusMessage('Generating transparent PNG...');
          }
        },
        output: {
          format: 'image/png',
          quality: 1.0,
          type: 'foreground'
        }
      };

      const resultBlob = await removeBackground(selectedFile, config);

      if (!resultBlob || !(resultBlob instanceof Blob)) {
        throw new Error('Background removal engine produced an invalid output.');
      }

      const transparentUrl = URL.createObjectURL(resultBlob);

      // Clean up previous processed URL if exists
      if (activeProcessedUrlRef.current) {
        URL.revokeObjectURL(activeProcessedUrlRef.current);
      }

      setProcessedUrl(transparentUrl);
      setProcessedSize(resultBlob.size);

      // Verify result dimensions
      const resImg = new Image();
      resImg.onload = () => {
        setProcessedDimensions({ width: resImg.naturalWidth, height: resImg.naturalHeight });
      };
      resImg.src = transparentUrl;

      processingPhaseRef.current = 'SUCCESS';
      setProcessingState('SUCCESS');
      setStatusMessage('Background removed successfully!');
    } catch (err) {
      console.error('Background removal error:', err);
      setProcessingState('ERROR');
      if (
        processingPhaseRef.current === 'LOADING_MODEL' ||
        processingPhaseRef.current === 'MODEL_READY'
      ) {
        setErrorMessage('Could not load AI model. Please check your connection and try again.');
      } else {
        setErrorMessage('Background removal failed. Please try another image.');
      }
    }
  };

  // Download resulting PNG
  const handleDownload = () => {
    if (!processedUrl) return;
    const link = document.createElement('a');
    link.href = processedUrl;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset entire tool
  const resetAll = () => {
    if (isProcessing) return;

    if (activeOriginalUrlRef.current) {
      URL.revokeObjectURL(activeOriginalUrlRef.current);
    }
    if (activeProcessedUrlRef.current) {
      URL.revokeObjectURL(activeProcessedUrlRef.current);
    }

    setSelectedFile(null);
    setOriginalPreviewUrl(null);
    setImageDimensions(null);
    setProcessedUrl(null);
    setProcessedSize(null);
    setProcessedDimensions(null);
    setErrorMessage(null);
    setProcessingState('IDLE');
    processingPhaseRef.current = 'IDLE';
    setModelDownloadPercent(null);
    setStatusMessage('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="tool-view-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="background-remover"
        title="Background Remover"
        description="Remove backgrounds from JPG and PNG images in seconds. Powered by advanced in-browser AI segmentation with zero server uploads, 100% privacy, and instant transparent PNG export."
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
      <section className="converter-card" aria-label="Background Remover tool interface">
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
            <div className="dropzone-icon">🪄</div>
            <h2 className="dropzone-title">Drop your image here</h2>
            <p className="dropzone-subtext">or click to browse your computer or mobile device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.JPG / .JPEG</span>
              <span className="dropzone-badge">.PNG</span>
              <span className="dropzone-badge">Transparent PNG Output</span>
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
                  {processedUrl
                    ? 'Background removed! Inspect transparency or download your PNG.'
                    : 'Configure segmentation settings and remove background.'}
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
                  IMG
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
              <div className="bg-remover-mode-picker">
                <label htmlFor="quality-mode" className="bg-mode-label">
                  Precision:
                </label>
                <select
                  id="quality-mode"
                  className="bg-mode-select"
                  value={qualityMode}
                  onChange={(e) => setQualityMode(e.target.value)}
                  disabled={isProcessing}
                >
                  <option value="isnet_fp16">High Precision (Default)</option>
                  <option value="isnet_quint8">Fast Mode (Quantized)</option>
                </select>
              </div>
            </div>

            {/* Previews Grid: Original vs Result */}
            <div className="bg-remover-previews-grid">
              {/* Original Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <span className="bg-preview-title">Original Image</span>
                  {imageDimensions && (
                    <span className="bg-preview-sub">
                      {imageDimensions.width} × {imageDimensions.height} px
                    </span>
                  )}
                </div>
                <div className="bg-preview-viewport">
                  {originalPreviewUrl && (
                    <img
                      src={originalPreviewUrl}
                      alt="Original uploaded subject"
                      className="bg-preview-img"
                    />
                  )}
                </div>
              </div>

              {/* Result Preview Card */}
              <div className="bg-preview-card">
                <div className="bg-preview-header">
                  <div className="bg-preview-title-wrap">
                    <span className="bg-preview-title">Transparent Result</span>
                    {processedDimensions && (
                      <span className="bg-preview-sub">
                        {processedDimensions.width} × {processedDimensions.height} px
                      </span>
                    )}
                  </div>
                  {/* Backdrop Toggle */}
                  {processedUrl && (
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
                    previewBackdrop === 'checkerboard'
                      ? 'checkerboard-bg'
                      : previewBackdrop === 'white'
                      ? 'backdrop-white'
                      : 'backdrop-black'
                  }`}
                >
                  {processedUrl ? (
                    <img
                      src={processedUrl}
                      alt="Segmented image with background removed"
                      className="bg-preview-img"
                    />
                  ) : (
                    <div className="bg-preview-empty-state">
                      <span className="bg-empty-icon">✂️</span>
                      <p className="bg-empty-text">Click "Remove Background" below to generate transparent cutout</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Processing State Indicator */}
            {isProcessing && (
              <div className="convert-action-box" aria-live="polite">
                <div
                  className="conversion-progress-box"
                  role="progressbar"
                  aria-valuenow={
                    processingState === 'LOADING_MODEL' && modelDownloadPercent !== null
                      ? modelDownloadPercent
                      : undefined
                  }
                  aria-valuemin={processingState === 'LOADING_MODEL' ? 0 : undefined}
                  aria-valuemax={processingState === 'LOADING_MODEL' ? 100 : undefined}
                  aria-label="Background removal progress"
                >
                  <div className="progress-info-row">
                    <span className="progress-status-label">
                      {processingState === 'MODEL_READY' ? (
                        <span className="progress-ready-badge" aria-hidden="true">
                          ✓
                        </span>
                      ) : (
                        <span className="progress-spinner" aria-hidden="true"></span>
                      )}
                      {statusMessage || 'Processing in-browser background removal...'}
                    </span>
                    {processingState === 'LOADING_MODEL' && modelDownloadPercent !== null && (
                      <span className="progress-pct-label">{modelDownloadPercent}%</span>
                    )}
                  </div>

                  {processingState === 'LOADING_MODEL' && modelDownloadPercent !== null ? (
                    /* Determinate Model Download Bar */
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${modelDownloadPercent}%` }}
                      />
                    </div>
                  ) : (
                    /* Indeterminate Active AI Processing Bar */
                    <div className="indeterminate-progress-bar">
                      <div className="indeterminate-progress-fill"></div>
                    </div>
                  )}
                </div>

                <p className="compress-subhint">
                  {processingState === 'LOADING_MODEL'
                    ? 'First run downloads and caches AI segmentation weights (~40-80MB) locally. Subsequent runs are near-instant!'
                    : 'In-browser neural segmentation in progress. Image data never leaves your device.'}
                </p>
              </div>
            )}

            {/* Success Feedback Strip */}
            {processedUrl && !isProcessing && (
              <div className="compress-success-banner" role="status">
                <span className="success-banner-icon">✨</span>
                <div className="success-banner-content">
                  <h3 className="success-banner-heading">Background Removed Successfully</h3>
                  <p className="success-banner-sub">
                    Output: <strong>{formatBytes(processedSize)}</strong> transparent PNG.
                    Full alpha transparency preserved with original resolution!
                  </p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="workbench-cta-bar">
              {!processedUrl ? (
                <button
                  type="button"
                  className="btn-primary btn-lg"
                  onClick={handleRemoveBackground}
                  disabled={isProcessing}
                >
                  {getButtonText()}
                </button>
              ) : (
                <div className="bg-action-group">
                  <button
                    type="button"
                    className="btn-primary btn-lg"
                    onClick={handleDownload}
                  >
                    ⬇️ Download Transparent PNG
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-lg"
                    onClick={openFilePicker}
                  >
                    Process Another Image
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="background-remover" />
    </div>
  );
}
