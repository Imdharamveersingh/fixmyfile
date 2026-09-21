import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ASPECT_RATIOS,
  SUPPORTED_OUTPUT_FORMATS,
  validateImageFile,
  clampCropCoordinates,
  calculateInitialCrop,
  executeCropOnCanvas,
  getCroppedDownloadName
} from './cropEngine.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function ImageCropperTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [naturalDimensions, setNaturalDimensions] = useState(null);
  const [displayDimensions, setDisplayDimensions] = useState({ width: 0, height: 0 });
  const [isDragOver, setIsDragOver] = useState(false);

  // Crop configuration
  const [aspectRatioId, setAspectRatioId] = useState('free');
  const [cropBox, setCropBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);

  // Output options
  const [outputFormat, setOutputFormat] = useState('auto');
  const [quality, setQuality] = useState(92);
  const [previewBackdrop, setPreviewBackdrop] = useState('checkerboard'); // checkerboard | dark | light

  // Processing & result state
  const [processingState, setProcessingState] = useState('IDLE'); // IDLE | CROPPING | SUCCESS | ERROR
  const [errorMessage, setErrorMessage] = useState(null);
  const [croppedResult, setCroppedResult] = useState(null);

  // References
  const fileInputRef = useRef(null);
  const imageElementRef = useRef(null);
  const containerRef = useRef(null);
  const dragInteractionRef = useRef(null);
  const activeUrlRef = useRef(null);
  const resultUrlRef = useRef(null);

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Image Cropper Online — Crop JPG, PNG, WebP Free | FixMyFile';

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
      'Crop images online for free directly in your browser. Choose custom aspect ratios (1:1, 16:9, 4:3, 9:16), rotate, flip, and export high-resolution cropped photos with zero server upload.'
    );

    return () => {
      document.title = prevTitle;
      if (createdMeta && metaDesc?.parentNode) {
        metaDesc.parentNode.removeChild(metaDesc);
      } else if (metaDesc) {
        metaDesc.setAttribute('content', prevMetaContent);
      }
    };
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  // Calculate natural crop coordinates for display
  const scaleRatio =
    displayDimensions.width > 0 && naturalDimensions?.width > 0
      ? naturalDimensions.width / displayDimensions.width
      : 1;

  const currentNaturalCrop = {
    x: Math.round(cropBox.x * scaleRatio),
    y: Math.round(cropBox.y * scaleRatio),
    width: Math.max(1, Math.round(cropBox.width * scaleRatio)),
    height: Math.max(1, Math.round(cropBox.height * scaleRatio))
  };

  // Recalculate display dimensions when container or window resizes
  const updateDisplayDimensions = useCallback(() => {
    if (!imageElementRef.current || !naturalDimensions) return;
    const img = imageElementRef.current;
    const rect = img.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const prevDisplayW = displayDimensions.width;
      const newDisplayW = rect.width;
      const newDisplayH = rect.height;

      setDisplayDimensions({ width: newDisplayW, height: newDisplayH });

      // Scale cropBox to match new display dimensions if resizing
      if (prevDisplayW > 0 && prevDisplayW !== newDisplayW) {
        const factor = newDisplayW / prevDisplayW;
        setCropBox((prev) => ({
          x: Math.round(prev.x * factor),
          y: Math.round(prev.y * factor),
          width: Math.round(prev.width * factor),
          height: Math.round(prev.height * factor)
        }));
      }
    }
  }, [displayDimensions.width, naturalDimensions]);

  useEffect(() => {
    window.addEventListener('resize', updateDisplayDimensions);
    return () => window.removeEventListener('resize', updateDisplayDimensions);
  }, [updateDisplayDimensions]);

  // Handle file selection
  const handleFile = (file) => {
    try {
      validateImageFile(file);
      setErrorMessage(null);
      setCroppedResult(null);

      if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);

      const url = URL.createObjectURL(file);
      activeUrlRef.current = url;
      setImageSrc(url);
      setSelectedFile(file);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setAspectRatioId('free');
      setProcessingState('IDLE');
    } catch (err) {
      setErrorMessage(err.message || 'Invalid image file.');
      setProcessingState('ERROR');
    }
  };

  // Image load handler
  const handleImageLoaded = (e) => {
    const img = e.target;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    if (!naturalW || !naturalH) {
      setErrorMessage('Could not determine image dimensions.');
      return;
    }

    setNaturalDimensions({ width: naturalW, height: naturalH });

    const rect = img.getBoundingClientRect();
    const displayW = rect.width;
    const displayH = rect.height;
    setDisplayDimensions({ width: displayW, height: displayH });

    // Initial crop: 90% centered box
    const initCrop = calculateInitialCrop(displayW, displayH, 'free');
    setCropBox(initCrop);
  };

  // Handle aspect ratio change
  const handleAspectRatioChange = (ratioId) => {
    setAspectRatioId(ratioId);
    if (!displayDimensions.width || !displayDimensions.height) return;

    const newCrop = calculateInitialCrop(
      displayDimensions.width,
      displayDimensions.height,
      ratioId
    );
    setCropBox(newCrop);
  };

  // Handle reset crop
  const handleResetCrop = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setAspectRatioId('free');
    if (displayDimensions.width && displayDimensions.height) {
      const initCrop = calculateInitialCrop(
        displayDimensions.width,
        displayDimensions.height,
        'free'
      );
      setCropBox(initCrop);
    }
  };

  // Pointer drag and resize handlers
  const handlePointerDown = (e, type, handle = null) => {
    e.preventDefault();
    e.stopPropagation();

    dragInteractionRef.current = {
      type, // 'drag' or 'resize'
      handle, // 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...cropBox }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!dragInteractionRef.current || !displayDimensions.width) return;

    const { type, handle, startX, startY, startCrop } = dragInteractionRef.current;
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;
    const maxW = displayDimensions.width;
    const maxH = displayDimensions.height;
    const minDim = 24;

    const activePreset = ASPECT_RATIOS.find((p) => p.id === aspectRatioId);
    const targetRatio = activePreset?.ratio;

    if (type === 'drag') {
      let newX = startCrop.x + deltaX;
      let newY = startCrop.y + deltaY;

      // Bounds clamping
      newX = Math.max(0, Math.min(newX, maxW - startCrop.width));
      newY = Math.max(0, Math.min(newY, maxH - startCrop.height));

      setCropBox({
        x: Math.round(newX),
        y: Math.round(newY),
        width: startCrop.width,
        height: startCrop.height
      });
      return;
    }

    if (type === 'resize' && handle) {
      let x = startCrop.x;
      let y = startCrop.y;
      let width = startCrop.width;
      let height = startCrop.height;

      // Corner & Edge adjustments
      if (handle.includes('e')) {
        width = Math.max(minDim, Math.min(startCrop.width + deltaX, maxW - x));
      }
      if (handle.includes('s')) {
        height = Math.max(minDim, Math.min(startCrop.height + deltaY, maxH - y));
      }
      if (handle.includes('w')) {
        const potentialW = startCrop.width - deltaX;
        if (potentialW >= minDim) {
          const clampedX = Math.max(0, startCrop.x + deltaX);
          width = startCrop.width + (startCrop.x - clampedX);
          x = clampedX;
        }
      }
      if (handle.includes('n')) {
        const potentialH = startCrop.height - deltaY;
        if (potentialH >= minDim) {
          const clampedY = Math.max(0, startCrop.y + deltaY);
          height = startCrop.height + (startCrop.y - clampedY);
          y = clampedY;
        }
      }

      // Enforce aspect ratio if active
      if (targetRatio) {
        if (handle === 'e' || handle === 'w' || handle === 'se' || handle === 'sw') {
          height = Math.round(width / targetRatio);
          if (y + height > maxH) {
            height = maxH - y;
            width = Math.round(height * targetRatio);
          }
        } else {
          width = Math.round(height * targetRatio);
          if (x + width > maxW) {
            width = maxW - x;
            height = Math.round(width / targetRatio);
          }
        }
      }

      // Final boundary guard
      width = Math.max(minDim, Math.min(width, maxW - x));
      height = Math.max(minDim, Math.min(height, maxH - y));

      setCropBox({
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height)
      });
    }
  };

  const handlePointerUp = () => {
    dragInteractionRef.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  // Perform crop operation
  const handleExecuteCrop = async () => {
    if (!imageElementRef.current || !selectedFile || !naturalDimensions) return;

    setProcessingState('CROPPING');
    setErrorMessage(null);

    try {
      const naturalCrop = clampCropCoordinates(
        currentNaturalCrop,
        naturalDimensions.width,
        naturalDimensions.height
      );

      const result = await executeCropOnCanvas(imageElementRef.current, naturalCrop, {
        format: outputFormat,
        quality: quality / 100,
        rotation,
        flipHorizontal: flipH,
        flipVertical: flipV,
        originalMime: selectedFile.type,
        originalName: selectedFile.name
      });

      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
      const url = URL.createObjectURL(result.blob);
      resultUrlRef.current = url;

      setCroppedResult({
        ...result,
        url,
        downloadName: getCroppedDownloadName(selectedFile.name, result.format)
      });

      setProcessingState('SUCCESS');
    } catch (err) {
      console.error('Crop execution error:', err);
      setErrorMessage(err.message || 'Image cropping failed. Please try again.');
      setProcessingState('ERROR');
    }
  };

  // Download handler
  const handleDownload = () => {
    if (!croppedResult) return;
    const a = document.createElement('a');
    a.href = croppedResult.url;
    a.download = croppedResult.downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Full reset handler
  const handleResetAll = () => {
    if (activeUrlRef.current) URL.revokeObjectURL(activeUrlRef.current);
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    setImageSrc(null);
    setSelectedFile(null);
    setNaturalDimensions(null);
    setDisplayDimensions({ width: 0, height: 0 });
    setCropBox({ x: 0, y: 0, width: 0, height: 0 });
    setCroppedResult(null);
    setErrorMessage(null);
    setProcessingState('IDLE');
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="tool-view-container tool-page-container">
      {/* Breadcrumbs */}
      <nav className="breadcrumb-nav" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">
          Home
        </Link>
        <span className="breadcrumb-separator" aria-hidden="true">
          /
        </span>
        <span className="breadcrumb-current">Image Cropper</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">Image Cropper</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
          <span className="tool-badge-accent">Phase 5</span>
        </div>
        <p className="tool-intro">
          Crop JPG, PNG, WebP, and common images client-side with pixel precision. Select custom aspect ratios,
          rotate, flip, and export high-resolution images with 100% privacy and zero server round-trips.
        </p>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="tool-alert tool-alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>
            error
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Empty State / Upload Dropzone */}
      {!imageSrc && (
        <div
          className={`dropzone-container ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFile(e.dataTransfer.files[0]);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
          id="image-cropper-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/bmp,image/gif,image/svg+xml"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            id="image-cropper-file-input"
          />
          <div className="dropzone-icon">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)' }}>
              crop
            </span>
          </div>
          <h3 className="dropzone-title">Click or Drag & Drop Image Here</h3>
          <p className="dropzone-subtitle">
            Supports JPG, PNG, WebP, BMP, GIF, and SVG (up to 50MB) · 100% client-side
          </p>
        </div>
      )}

      {/* Workbench Card when Image is Selected */}
      {imageSrc && (
        <div className="workbench-card" style={{ padding: '24px', borderRadius: '16px' }}>
          {/* Metadata Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}
          >
            <div>
              <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1.05rem' }}>
                {selectedFile?.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Original: {naturalDimensions ? `${naturalDimensions.width} × ${naturalDimensions.height} px` : 'Loading...'} ·{' '}
                {formatBytes(selectedFile?.size)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary-border)'
                }}
              >
                Crop: {currentNaturalCrop.width} × {currentNaturalCrop.height} px
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResetAll}
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                id="image-cropper-reset-btn"
              >
                Change Image
              </button>
            </div>
          </div>

          {/* Interactive Crop Viewport */}
          <div
            ref={containerRef}
            style={{
              position: 'relative',
              width: '100%',
              minHeight: '340px',
              maxHeight: '520px',
              backgroundColor:
                previewBackdrop === 'dark'
                  ? '#121212'
                  : previewBackdrop === 'light'
                  ? '#f8fafc'
                  : 'rgba(0, 0, 0, 0.05)',
              backgroundImage:
                previewBackdrop === 'checkerboard'
                  ? 'linear-gradient(45deg, #222 25%, transparent 25%), linear-gradient(-45deg, #222 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #222 75%), linear-gradient(-45deg, transparent 75%, #222 75%)'
                  : 'none',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            {/* Displayed Image Wrapper */}
            <div
              style={{
                position: 'relative',
                display: 'inline-block',
                lineHeight: 0
              }}
            >
              <img
                ref={imageElementRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={handleImageLoaded}
                onError={() => {
                  setErrorMessage('Failed to decode image data. The file may be corrupt or not a supported image format.');
                  setProcessingState('ERROR');
                  setImageSrc(null);
                }}
                style={{
                  display: 'block',
                  maxWidth: '100%',
                  maxHeight: '500px',
                  objectFit: 'contain',
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  transition: 'transform 0.2s ease',
                  pointerEvents: 'none'
                }}
                id="image-cropper-preview-img"
              />

              {/* Crop Box Overlay (only active when display dimensions are established) */}
              {displayDimensions.width > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${displayDimensions.width}px`,
                    height: `${displayDimensions.height}px`,
                    pointerEvents: 'none'
                  }}
                >
                  {/* Outer Dimmed Background via SVG Mask */}
                  <svg
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }}
                  >
                    <defs>
                      <mask id="crop-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <rect
                          x={cropBox.x}
                          y={cropBox.y}
                          width={cropBox.width}
                          height={cropBox.height}
                          fill="black"
                        />
                      </mask>
                    </defs>
                    <rect
                      width="100%"
                      height="100%"
                      fill="rgba(0, 0, 0, 0.65)"
                      mask="url(#crop-mask)"
                    />
                  </svg>

                  {/* Active Crop Box with Grid & Handles */}
                  <div
                    onPointerDown={(e) => handlePointerDown(e, 'drag')}
                    style={{
                      position: 'absolute',
                      left: `${cropBox.x}px`,
                      top: `${cropBox.y}px`,
                      width: `${cropBox.width}px`,
                      height: `${cropBox.height}px`,
                      border: '2px solid var(--primary, #3b82f6)',
                      boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.2)',
                      cursor: 'move',
                      pointerEvents: 'auto',
                      boxSizing: 'border-box'
                    }}
                    id="image-cropper-active-box"
                  >
                    {/* Rule of Thirds Grid Lines */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '33.33%',
                        left: 0,
                        right: 0,
                        height: '1px',
                        backgroundColor: 'rgba(255, 255, 255, 0.35)',
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '66.66%',
                        left: 0,
                        right: 0,
                        height: '1px',
                        backgroundColor: 'rgba(255, 255, 255, 0.35)',
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '33.33%',
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: 'rgba(255, 255, 255, 0.35)',
                        pointerEvents: 'none'
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: '66.66%',
                        top: 0,
                        bottom: 0,
                        width: '1px',
                        backgroundColor: 'rgba(255, 255, 255, 0.35)',
                        pointerEvents: 'none'
                      }}
                    />

                    {/* Resize Handles */}
                    {['nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w'].map((handle) => {
                      const isCorner = handle.length === 2;
                      const size = isCorner ? 12 : 8;
                      const style = {
                        position: 'absolute',
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: '#ffffff',
                        border: '2px solid var(--primary, #3b82f6)',
                        borderRadius: isCorner ? '2px' : '4px',
                        cursor: `${handle}-resize`,
                        pointerEvents: 'auto',
                        boxSizing: 'border-box',
                        zIndex: 10
                      };

                      if (handle.includes('n')) style.top = `-${size / 2}px`;
                      if (handle.includes('s')) style.bottom = `-${size / 2}px`;
                      if (handle.includes('w')) style.left = `-${size / 2}px`;
                      if (handle.includes('e')) style.right = `-${size / 2}px`;

                      if (handle === 'n' || handle === 's') {
                        style.left = '50%';
                        style.transform = 'translateX(-50%)';
                        style.width = '24px';
                      }
                      if (handle === 'w' || handle === 'e') {
                        style.top = '50%';
                        style.transform = 'translateY(-50%)';
                        style.height = '24px';
                      }

                      return (
                        <div
                          key={handle}
                          style={style}
                          onPointerDown={(e) => handlePointerDown(e, 'resize', handle)}
                          data-handle={handle}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Control Toolbar */}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Aspect Ratio Presets */}
            <div>
              <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '8px' }}>
                Aspect Ratio Preset:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: '8px'
                }}
              >
                {ASPECT_RATIOS.map((ratio) => {
                  const isActive = aspectRatioId === ratio.id;
                  return (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => handleAspectRatioChange(ratio.id)}
                      style={{
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        border: isActive
                          ? '1.5px solid var(--primary)'
                          : '1px solid var(--border-subtle)',
                        backgroundColor: isActive ? 'var(--primary-soft)' : 'var(--bg-surface)',
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.15s ease'
                      }}
                      id={`crop-ratio-${ratio.id.replace(':', '-')}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                        {ratio.icon}
                      </span>
                      <span>{ratio.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transform Controls (Rotate & Flip & Reset) */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                  style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Rotate Counter-Clockwise"
                  id="image-cropper-rotate-left"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    rotate_left
                  </span>
                  Rotate 90°
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setRotation((prev) => (prev + 90) % 360)}
                  style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  title="Rotate Clockwise"
                  id="image-cropper-rotate-right"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    rotate_right
                  </span>
                  Rotate 90°
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${flipH ? 'active' : ''}`}
                  onClick={() => setFlipH((prev) => !prev)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: flipH ? 'var(--primary)' : undefined,
                    color: flipH ? 'var(--primary)' : undefined
                  }}
                  id="image-cropper-flip-h"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    flip
                  </span>
                  Flip X
                </button>
                <button
                  type="button"
                  className={`btn-secondary ${flipV ? 'active' : ''}`}
                  onClick={() => setFlipV((prev) => !prev)}
                  style={{
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    borderColor: flipV ? 'var(--primary)' : undefined,
                    color: flipV ? 'var(--primary)' : undefined
                  }}
                  id="image-cropper-flip-v"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', transform: 'rotate(90deg)' }}>
                    flip
                  </span>
                  Flip Y
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleResetCrop}
                  style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  id="image-cropper-reset-crop-btn"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                    refresh
                  </span>
                  Reset Crop
                </button>
              </div>

              {/* Backdrop Style Selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>Backdrop:</span>
                {['checkerboard', 'dark', 'light'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPreviewBackdrop(mode)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: previewBackdrop === mode ? 'var(--primary-soft)' : 'transparent',
                      color: previewBackdrop === mode ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Output Format & Quality Settings */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-subtle)'
              }}
            >
              <div>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.85rem', marginBottom: '6px' }}>
                  Output Format:
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem'
                  }}
                  id="image-cropper-format-select"
                >
                  {SUPPORTED_OUTPUT_FORMATS.map((fmt) => (
                    <option key={fmt.id} value={fmt.id}>
                      {fmt.label}
                    </option>
                  ))}
                </select>
              </div>

              {(outputFormat === 'jpeg' || outputFormat === 'webp' || (outputFormat === 'auto' && selectedFile?.type !== 'image/png')) && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontWeight: '600', fontSize: '0.85rem' }}>Image Quality:</label>
                    <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600' }}>
                      {quality}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={quality}
                    onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                    id="image-cropper-quality-slider"
                  />
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <div style={{ marginTop: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={handleExecuteCrop}
                disabled={processingState === 'CROPPING'}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  fontSize: '1.05rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                id="image-cropper-submit-btn"
              >
                {processingState === 'CROPPING' ? (
                  <>
                    <span className="spinner" style={{ width: '20px', height: '20px' }} />
                    Cropping Image...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">crop</span>
                    Crop Image ({currentNaturalCrop.width} × {currentNaturalCrop.height} px)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cropped Success Result Card */}
      {processingState === 'SUCCESS' && croppedResult && (
        <div
          className="workbench-card"
          style={{
            marginTop: '28px',
            padding: '24px',
            borderRadius: '16px',
            border: '1.5px solid rgba(16, 185, 129, 0.4)',
            backgroundColor: 'var(--bg-surface)'
          }}
          id="image-cropper-success-card"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#10b981',
              fontWeight: '700',
              fontSize: '1.15rem',
              marginBottom: '16px'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
              check_circle
            </span>
            Image Cropped Successfully!
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              alignItems: 'center'
            }}
          >
            {/* Cropped Preview Thumbnail */}
            <div
              style={{
                borderRadius: '10px',
                overflow: 'hidden',
                maxHeight: '260px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.05)',
                padding: '12px'
              }}
            >
              <img
                src={croppedResult.url}
                alt="Cropped Output"
                style={{
                  maxWidth: '100%',
                  maxHeight: '230px',
                  objectFit: 'contain',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                id="image-cropper-result-img"
              />
            </div>

            {/* Metadata and Download CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div>
                  <strong>Output Dimensions:</strong> {croppedResult.width} × {croppedResult.height} px
                </div>
                <div>
                  <strong>Output File Size:</strong> {formatBytes(croppedResult.size)}
                </div>
                <div>
                  <strong>Output Format:</strong> {croppedResult.format.toUpperCase()}
                </div>
                <div>
                  <strong>Filename:</strong> {croppedResult.downloadName}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleDownload}
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: '12px 18px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  id="image-cropper-download-btn"
                >
                  <span className="material-symbols-outlined">download</span>
                  Download Cropped Image
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setProcessingState('IDLE')}
                  style={{
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  id="image-cropper-edit-btn"
                >
                  <span className="material-symbols-outlined">edit</span>
                  Crop Again
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleResetAll}
                  style={{
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                  id="image-cropper-new-image-btn"
                >
                  <span className="material-symbols-outlined">restart_alt</span>
                  New Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
