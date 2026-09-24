import { useState, useRef, useEffect, useCallback } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';

// Human-readable file size formatter
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate sanitized download filename
function getUpscaledDownloadName(originalName, scale = 2, outputExt = 'png') {
  if (!originalName) return `image-upscaled-${scale}x.${outputExt}`;
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-upscaled-${scale}x.${outputExt}`;
}

// Validate supported image formats
function isSupportedImage(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp'
  ];
  return (
    validMimes.includes(type) ||
    validExtensions.some((ext) => name.endsWith(ext))
  );
}

// Browser Canvas safe dimension and pixel limits
const MAX_SAFE_CANVAS_DIMENSION = 16384; // 16K max edge
const MAX_SAFE_OUTPUT_PIXELS = 40000000; // 40 megapixels

export default function ImageUpscalerTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceImg, setSourceImg] = useState(null);
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState(null);
  const [sourceDimensions, setSourceDimensions] = useState(null);

  const [scale, setScale] = useState(2); // 2 or 4
  const [outputFormat, setOutputFormat] = useState('png'); // 'png' | 'jpeg' | 'webp'
  const [isSharpenEnabled, setIsSharpenEnabled] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [upscaledResult, setUpscaledResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const resultRef = useRef(upscaledResult);
  const sourcePreviewUrlRef = useRef(sourcePreviewUrl);

  useEffect(() => {
    document.title = 'Image Upscaler Online — High-Quality Bicubic Image Upscaling | FixMyFile';
  }, []);

  useEffect(() => {
    resultRef.current = upscaledResult;
  }, [upscaledResult]);

  useEffect(() => {
    sourcePreviewUrlRef.current = sourcePreviewUrl;
  }, [sourcePreviewUrl]);

  // Clean up Object URLs on component unmount
  useEffect(() => {
    return () => {
      if (sourcePreviewUrlRef.current) URL.revokeObjectURL(sourcePreviewUrlRef.current);
      if (resultRef.current?.url) URL.revokeObjectURL(resultRef.current.url);
    };
  }, []);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Reset entire state
  const resetAll = useCallback(() => {
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    if (upscaledResult?.url) URL.revokeObjectURL(upscaledResult.url);

    setSelectedFile(null);
    setSourceImg(null);
    setSourcePreviewUrl(null);
    setSourceDimensions(null);
    setScale(2);
    setOutputFormat('png');
    setIsSharpenEnabled(true);
    setIsProcessing(false);
    setUpscaledResult(null);
    setErrorMessage(null);
  }, [sourcePreviewUrl, upscaledResult]);

  // Load image file
  const handleFile = (file) => {
    setErrorMessage(null);
    if (!file) return;

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes). Please upload a valid image.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('The image exceeds the 50 MB file size limit.');
      return;
    }

    if (!isSupportedImage(file)) {
      setErrorMessage('Unsupported format. Please upload a valid JPG, PNG, WebP, GIF, or BMP image.');
      return;
    }

    // Clean up previous image if exists
    if (sourcePreviewUrl) URL.revokeObjectURL(sourcePreviewUrl);
    if (upscaledResult?.url) URL.revokeObjectURL(upscaledResult.url);
    setUpscaledResult(null);

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;

      if (w > MAX_SAFE_CANVAS_DIMENSION || h > MAX_SAFE_CANVAS_DIMENSION) {
        URL.revokeObjectURL(objectUrl);
        setErrorMessage(`Image dimension (${w}x${h}) exceeds maximum safe limit of ${MAX_SAFE_CANVAS_DIMENSION}px.`);
        return;
      }

      setSelectedFile(file);
      setSourceImg(img);
      setSourcePreviewUrl(objectUrl);
      setSourceDimensions({ width: w, height: h });

      // Detect initial default format from source file
      const name = file.name.toLowerCase();
      if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
        setOutputFormat('jpeg');
      } else if (name.endsWith('.webp')) {
        setOutputFormat('webp');
      } else {
        setOutputFormat('png');
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      setErrorMessage('Failed to decode the image file. Ensure it is a valid, uncorrupted image.');
    };

    img.src = objectUrl;
  };

  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Calculate estimated dimensions
  const targetWidth = sourceDimensions ? sourceDimensions.width * scale : 0;
  const targetHeight = sourceDimensions ? sourceDimensions.height * scale : 0;
  const totalTargetPixels = targetWidth * targetHeight;
  const isScaleUnsafe =
    targetWidth > MAX_SAFE_CANVAS_DIMENSION ||
    targetHeight > MAX_SAFE_CANVAS_DIMENSION ||
    totalTargetPixels > MAX_SAFE_OUTPUT_PIXELS;

  // High-Quality In-Browser Resampling & Upscaling Engine
  const processUpscale = async () => {
    if (!sourceImg || !sourceDimensions) {
      setErrorMessage('Please upload an image first.');
      return;
    }

    if (isScaleUnsafe) {
      setErrorMessage(
        `Output dimensions (${targetWidth}×${targetHeight}) would exceed browser memory limits. Please select a smaller scale.`
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Give the UI thread a moment to paint the spinner
    await new Promise((r) => setTimeout(r, 60));

    try {
      // Step-wise multi-pass canvas scaling produces significantly cleaner interpolation than a single giant jump
      let currentCanvas = document.createElement('canvas');
      currentCanvas.width = sourceDimensions.width;
      currentCanvas.height = sourceDimensions.height;
      let currentCtx = currentCanvas.getContext('2d');
      currentCtx.imageSmoothingEnabled = true;
      currentCtx.imageSmoothingQuality = 'high';
      currentCtx.drawImage(sourceImg, 0, 0);

      // Perform progressive scaling if scaling up to 4x (e.g. 1x -> 2x -> 4x)
      let currentW = sourceDimensions.width;
      let currentH = sourceDimensions.height;

      while (currentW < targetWidth || currentH < targetHeight) {
        let nextW = Math.min(targetWidth, Math.round(currentW * 2));
        let nextH = Math.min(targetHeight, Math.round(currentH * 2));

        const nextCanvas = document.createElement('canvas');
        nextCanvas.width = nextW;
        nextCanvas.height = nextH;
        const nextCtx = nextCanvas.getContext('2d');
        nextCtx.imageSmoothingEnabled = true;
        nextCtx.imageSmoothingQuality = 'high';

        // For JPEG output with potential transparent source, fill white background
        if (outputFormat === 'jpeg') {
          nextCtx.fillStyle = '#ffffff';
          nextCtx.fillRect(0, 0, nextW, nextH);
        }

        nextCtx.drawImage(currentCanvas, 0, 0, nextW, nextH);

        currentCanvas = nextCanvas;
        currentCtx = nextCtx;
        currentW = nextW;
        currentH = nextH;
      }

      // Optional subtle unsharp mask filter to restore edge acuity post-bicubic upsampling
      if (isSharpenEnabled && currentW <= 4096 && currentH <= 4096) {
        try {
          const imgData = currentCtx.getImageData(0, 0, currentW, currentH);
          const data = imgData.data;
          const copy = new Uint8ClampedArray(data);
          const w = currentW;
          const h = currentH;
          const weight = 0.25; // Subtle sharpening amount

          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = (y * w + x) * 4;
              for (let c = 0; c < 3; c++) {
                const center = copy[idx + c];
                const top = copy[((y - 1) * w + x) * 4 + c];
                const bottom = copy[((y + 1) * w + x) * 4 + c];
                const left = copy[(y * w + (x - 1)) * 4 + c];
                const right = copy[(y * w + (x + 1)) * 4 + c];
                const laplacian = 4 * center - (top + bottom + left + right);
                const val = center + laplacian * weight;
                data[idx + c] = Math.max(0, Math.min(255, val));
              }
            }
          }
          currentCtx.putImageData(imgData, 0, 0);
        } catch {
          // If ImageData fails (e.g. security or memory), gracefully continue with standard bicubic canvas
        }
      }

      // Determine MIME type and quality
      let mimeType = 'image/png';
      let quality = 0.95;
      if (outputFormat === 'jpeg') mimeType = 'image/jpeg';
      else if (outputFormat === 'webp') mimeType = 'image/webp';

      const blob = await new Promise((resolve) => {
        currentCanvas.toBlob(resolve, mimeType, quality);
      });

      if (!blob) {
        throw new Error('Failed to generate upscaled image blob from canvas.');
      }

      if (upscaledResult?.url) {
        URL.revokeObjectURL(upscaledResult.url);
      }

      const upscaledUrl = URL.createObjectURL(blob);
      setUpscaledResult({
        url: upscaledUrl,
        blob,
        width: targetWidth,
        height: targetHeight,
        size: blob.size,
        scale,
        format: outputFormat
      });
    } catch (err) {
      setErrorMessage(`Upscaling error: ${err.message || 'Failed to process image.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFilename = getUpscaledDownloadName(selectedFile?.name, scale, outputFormat);

  return (
    <div className="tool-view-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="image-upscaler"
        title="Image Upscaler"
        description="Enlarge and upscale your images with client-side progressive bicubic resampling and edge enhancement. Zero server uploads, 100% private."
      />

      {/* Main Tool Area */}
      <div className="tool-card">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          id="image-upscaler-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.bmp,image/jpeg,image/png,image/webp,image/gif,image/bmp"
          onChange={onFileInputChange}
          style={{ display: 'none' }}
        />

        {/* Empty State: Dropzone */}
        {!selectedFile && (
          <div
            id="image-upscaler-dropzone"
            className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openFilePicker();
            }}
          >
            <div className="dropzone-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </div>
            <p className="dropzone-title">Click or drag an image here to upscale</p>
            <p className="dropzone-hint">
              Supports JPG, PNG, WebP, GIF, BMP • Up to 4x enlargement • Max 50 MB
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-box error" role="alert" style={{ marginTop: '16px' }}>
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Active Tool Layout */}
        {selectedFile && sourceDimensions && (
          <div>
            {/* Top Bar with File Meta and Reset */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderRadius: '8px',
                background: 'var(--color-surface, #1e293b)',
                border: '1px solid var(--color-border, #334155)',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '10px'
              }}
            >
              <div>
                <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>
                  {selectedFile.name}
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                  Source: <strong>{sourceDimensions.width} × {sourceDimensions.height} px</strong> • Size: {formatBytes(selectedFile.size)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={openFilePicker}
                >
                  Change Image
                </button>
                <button
                  id="image-upscaler-reset-btn"
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={resetAll}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Controls & Options Bar */}
            <div
              style={{
                padding: '18px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--color-border, #334155)',
                marginBottom: '24px'
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '16px',
                  alignItems: 'end'
                }}
              >
                {/* Scale Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text, #f8fafc)', marginBottom: '8px' }}>
                    Upscale Factor
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      id="image-upscaler-scale-2x"
                      type="button"
                      className={`btn btn-sm ${scale === 2 ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setScale(2)}
                      style={{ flex: 1, padding: '8px 12px' }}
                    >
                      2x Enlarge
                    </button>
                    <button
                      id="image-upscaler-scale-4x"
                      type="button"
                      className={`btn btn-sm ${scale === 4 ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setScale(4)}
                      style={{ flex: 1, padding: '8px 12px' }}
                    >
                      4x Enlarge
                    </button>
                  </div>
                </div>

                {/* Output Format */}
                <div>
                  <label htmlFor="image-upscaler-format" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text, #f8fafc)', marginBottom: '8px' }}>
                    Output Format
                  </label>
                  <select
                    id="image-upscaler-format"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border, #334155)',
                      background: 'var(--color-surface, #1e293b)',
                      color: 'var(--color-text, #f8fafc)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="png">PNG (Lossless & Alpha)</option>
                    <option value="jpeg">JPG (Standard)</option>
                    <option value="webp">WebP (Optimized)</option>
                  </select>
                </div>

                {/* Edge Acuity Enhancement */}
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text, #f8fafc)', padding: '8px 0' }}>
                    <input
                      type="checkbox"
                      checked={isSharpenEnabled}
                      onChange={(e) => setIsSharpenEnabled(e.target.checked)}
                      style={{ accentColor: 'var(--color-primary, #3b82f6)' }}
                    />
                    <span>Edge Acuity Filter</span>
                  </label>
                </div>

                {/* Target Dimension Pill */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--color-surface, #1e293b)',
                    border: '1px solid var(--color-border, #334155)',
                    textAlign: 'center'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)', display: 'block' }}>
                    Target Resolution
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: isScaleUnsafe ? '#ef4444' : 'var(--color-primary, #3b82f6)' }}>
                    {targetWidth} × {targetHeight} px
                  </span>
                </div>
              </div>

              {isScaleUnsafe && (
                <p style={{ margin: '12px 0 0 0', fontSize: '0.8rem', color: '#ef4444' }}>
                  ⚠️ Warning: Target dimensions exceed safe browser canvas capacity ({MAX_SAFE_CANVAS_DIMENSION}px). Please choose 2x instead.
                </p>
              )}
            </div>

            {/* Execute Upscale Button */}
            <div style={{ marginBottom: '24px' }}>
              <button
                id="image-upscaler-btn"
                type="button"
                className="btn btn-primary"
                disabled={isProcessing || isScaleUnsafe}
                onClick={processUpscale}
                style={{ minWidth: '180px' }}
              >
                {isProcessing ? 'Upscaling Image...' : `Upscale to ${targetWidth} × ${targetHeight}`}
              </button>
            </div>

            {/* Preview Areas: Side by Side Source vs Result */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px'
              }}
            >
              {/* Original Preview */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'var(--color-surface, #1e293b)',
                  border: '1px solid var(--color-border, #334155)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Original</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                    {sourceDimensions.width} × {sourceDimensions.height} px
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '6px',
                    padding: '12px',
                    minHeight: '220px',
                    maxHeight: '360px',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={sourcePreviewUrl}
                    alt="Original"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '340px',
                      objectFit: 'contain',
                      borderRadius: '4px'
                    }}
                  />
                </div>
              </div>

              {/* Upscaled Preview / Result */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'var(--color-surface, #1e293b)',
                  border: '1px solid var(--color-border, #334155)',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {upscaledResult ? `Upscaled (${upscaledResult.scale}x)` : 'Upscaled Preview'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                    {upscaledResult ? `${upscaledResult.width} × ${upscaledResult.height} px` : `${targetWidth} × ${targetHeight} px (Ready)`}
                  </span>
                </div>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderRadius: '6px',
                    padding: '12px',
                    minHeight: '220px',
                    maxHeight: '360px',
                    overflow: 'hidden'
                  }}
                >
                  {upscaledResult ? (
                    <img
                      src={upscaledResult.url}
                      alt="Upscaled"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '340px',
                        objectFit: 'contain',
                        borderRadius: '4px'
                      }}
                    />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted, #94a3b8)', padding: '20px' }}>
                      <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔍</span>
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>
                        Click &quot;Upscale to {targetWidth} × {targetHeight}&quot; to generate preview.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Download & Success Section */}
            {upscaledResult && (
              <div
                id="image-upscaler-result"
                style={{
                  padding: '20px',
                  borderRadius: '8px',
                  background: 'rgba(34, 197, 94, 0.08)',
                  border: '1px solid rgba(34, 197, 94, 0.25)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ color: '#22c55e', fontSize: '1.25rem' }}>✓</span>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                        Upscaling Complete ({upscaledResult.scale}x)
                      </h3>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                      Dimensions: <strong>{upscaledResult.width} × {upscaledResult.height} px</strong> • Size: {formatBytes(upscaledResult.size)} • Format: {upscaledResult.format.toUpperCase()}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <a
                      id="image-upscaler-download-btn"
                      href={upscaledResult.url}
                      download={downloadFilename}
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download Upscaled Image
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="image-upscaler" />
    </div>
  );
}
