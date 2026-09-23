import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Format bytes into human-readable string
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate sanitized download filename
function getDownloadName(originalName, outputExt = 'png') {
  if (!originalName) return `transformed-image.${outputExt}`;
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-transformed.${outputExt}`;
}

// Validate supported image formats
function isSupportedImage(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'];
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml'
  ];
  return (
    validMimes.includes(type) ||
    validExtensions.some((ext) => name.endsWith(ext))
  );
}

// Multiply two 2x2 matrices
function multiplyMatrix(A, B) {
  return [
    [
      A[0][0] * B[0][0] + A[0][1] * B[1][0],
      A[0][0] * B[0][1] + A[0][1] * B[1][1]
    ],
    [
      A[1][0] * B[0][0] + A[1][1] * B[1][0],
      A[1][0] * B[0][1] + A[1][1] * B[1][1]
    ]
  ];
}

const IDENTITY_MATRIX = [
  [1, 0],
  [0, 1]
];

export default function ImageRotateFlipTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imgElement, setImgElement] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // 2D Transformation matrix
  const [matrix, setMatrix] = useState(IDENTITY_MATRIX);

  // Output format options
  const [outputFormat, setOutputFormat] = useState('png'); // 'png', 'jpeg', 'webp'
  const [jpgQuality, setJpgQuality] = useState(92);

  // Status & states
  const [processingState, setProcessingState] = useState('IDLE');
  const [errorMessage, setErrorMessage] = useState(null);

  // Export results
  const [exportedBlob, setExportedBlob] = useState(null);
  const [exportedUrl, setExportedUrl] = useState(null);
  const [exportedSize, setExportedSize] = useState(null);
  const [exportedDimensions, setExportedDimensions] = useState(null);
  const [exportTime, setExportTime] = useState(null);

  const fileInputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const activeExportUrlRef = useRef(null);
  const activeOrigUrlRef = useRef(null);

  // Set document title
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Rotate & Flip Image Online — Free Image Editor | FixMyFile';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Cleanup object URLs
  const revokeExportUrl = useCallback(() => {
    if (activeExportUrlRef.current) {
      URL.revokeObjectURL(activeExportUrlRef.current);
      activeExportUrlRef.current = null;
    }
  }, []);

  const revokeOrigUrl = useCallback(() => {
    if (activeOrigUrlRef.current) {
      URL.revokeObjectURL(activeOrigUrlRef.current);
      activeOrigUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeExportUrl();
      revokeOrigUrl();
    };
  }, [revokeExportUrl, revokeOrigUrl]);

  // Render live preview on canvas using matrix
  const renderPreview = useCallback(() => {
    if (!imgElement || !previewCanvasRef.current) return;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const origW = imgElement.naturalWidth;
    const origH = imgElement.naturalHeight;

    const isSwapped = Math.abs(matrix[0][0]) === 0;
    const currentW = isSwapped ? origH : origW;
    const currentH = isSwapped ? origW : origH;

    canvas.width = currentW;
    canvas.height = currentH;

    ctx.clearRect(0, 0, currentW, currentH);
    ctx.save();
    ctx.translate(currentW / 2, currentH / 2);
    ctx.transform(matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], 0, 0);
    ctx.drawImage(imgElement, -origW / 2, -origH / 2, origW, origH);
    ctx.restore();
  }, [imgElement, matrix]);

  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // Load selected file
  const loadFile = useCallback(
    (file) => {
      if (!file) return;

      revokeExportUrl();
      revokeOrigUrl();
      setExportedBlob(null);
      setExportedUrl(null);
      setExportedSize(null);
      setExportedDimensions(null);
      setErrorMessage(null);
      setMatrix(IDENTITY_MATRIX);

      if (!isSupportedImage(file)) {
        setErrorMessage('Unsupported file format. Please upload JPG, PNG, WebP, GIF, or BMP image.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size === 0) {
        setErrorMessage('The selected file is empty (0 bytes). Please choose a valid image.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 50 MB limit. Please select a smaller file.');
        setProcessingState('ERROR');
        return;
      }

      // Default format based on input
      if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
        setOutputFormat('jpeg');
      } else if (file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp')) {
        setOutputFormat('webp');
      } else {
        setOutputFormat('png');
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      activeOrigUrlRef.current = url;

      const img = new Image();
      img.onload = () => {
        setImgElement(img);
        setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setProcessingState('READY');
      };
      img.onerror = () => {
        setErrorMessage('Failed to decode image. The file may be corrupt or an unreadable codec.');
        setProcessingState('ERROR');
      };
      img.src = url;
    },
    [revokeExportUrl, revokeOrigUrl]
  );

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);

  // Rotation & Flip operations using matrix multiplication
  const rotateClockwise = () => {
    const R_CW = [
      [0, -1],
      [1, 0]
    ];
    setMatrix((prev) => multiplyMatrix(R_CW, prev));
  };

  const rotateCounterClockwise = () => {
    const R_CCW = [
      [0, 1],
      [-1, 0]
    ];
    setMatrix((prev) => multiplyMatrix(R_CCW, prev));
  };

  const rotate180 = () => {
    const R_180 = [
      [-1, 0],
      [0, -1]
    ];
    setMatrix((prev) => multiplyMatrix(R_180, prev));
  };

  const toggleFlipH = () => {
    const F_H = [
      [-1, 0],
      [0, 1]
    ];
    setMatrix((prev) => multiplyMatrix(F_H, prev));
  };

  const toggleFlipV = () => {
    const F_V = [
      [1, 0],
      [0, -1]
    ];
    setMatrix((prev) => multiplyMatrix(F_V, prev));
  };

  const resetTransforms = () => {
    setMatrix(IDENTITY_MATRIX);
    revokeExportUrl();
    setExportedBlob(null);
    setExportedUrl(null);
  };

  const handleClear = () => {
    revokeExportUrl();
    revokeOrigUrl();
    setSelectedFile(null);
    setImgElement(null);
    setOriginalDimensions(null);
    setExportedBlob(null);
    setExportedUrl(null);
    setExportedSize(null);
    setExportedDimensions(null);
    setMatrix(IDENTITY_MATRIX);
    setErrorMessage(null);
    setProcessingState('IDLE');
  };

  // Export transformed image
  const handleExport = async () => {
    if (!imgElement) return;

    setProcessingState('EXPORTING');
    const t0 = performance.now();

    const origW = imgElement.naturalWidth;
    const origH = imgElement.naturalHeight;
    const isSwapped = Math.abs(matrix[0][0]) === 0;
    const exportW = isSwapped ? origH : origW;
    const exportH = isSwapped ? origW : origH;

    const canvas = document.createElement('canvas');
    canvas.width = exportW;
    canvas.height = exportH;
    const ctx = canvas.getContext('2d');

    // Fill white background only if exporting JPEG (no alpha)
    if (outputFormat === 'jpeg') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportW, exportH);
    }

    ctx.save();
    ctx.translate(exportW / 2, exportH / 2);
    ctx.transform(matrix[0][0], matrix[1][0], matrix[0][1], matrix[1][1], 0, 0);
    ctx.drawImage(imgElement, -origW / 2, -origH / 2, origW, origH);
    ctx.restore();

    const mime =
      outputFormat === 'jpeg'
        ? 'image/jpeg'
        : outputFormat === 'webp'
        ? 'image/webp'
        : 'image/png';
    const quality = outputFormat === 'jpeg' ? jpgQuality / 100 : 0.95;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMessage('Canvas export failed. The image could not be encoded.');
          setProcessingState('ERROR');
          return;
        }
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        setExportTime(elapsed);
        revokeExportUrl();

        const url = URL.createObjectURL(blob);
        activeExportUrlRef.current = url;
        setExportedBlob(blob);
        setExportedUrl(url);
        setExportedSize(blob.size);
        setExportedDimensions({ width: exportW, height: exportH });
        setProcessingState('SUCCESS');
      },
      mime,
      quality
    );
  };

  const handleDownload = () => {
    if (!exportedUrl || !selectedFile) return;
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const filename = getDownloadName(selectedFile.name, ext);
    const a = document.createElement('a');
    a.href = exportedUrl;
    a.download = filename;
    a.click();
  };

  const isSwapped = Math.abs(matrix[0][0]) === 0;
  const currentW = originalDimensions ? (isSwapped ? originalDimensions.height : originalDimensions.width) : 0;
  const currentH = originalDimensions ? (isSwapped ? originalDimensions.width : originalDimensions.height) : 0;

  const det = matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0];
  const rotDeg =
    det === 1
      ? (Math.round(Math.atan2(matrix[1][0], matrix[0][0]) * (180 / Math.PI)) % 360 + 360) % 360
      : (Math.round(Math.atan2(-matrix[0][1], matrix[1][1]) * (180 / Math.PI)) % 360 + 360) % 360;
  const isReflected = det < 0;

  const checkerboardStyle = {
    backgroundImage: `linear-gradient(45deg, #252538 25%, transparent 25%),
      linear-gradient(-45deg, #252538 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #252538 75%),
      linear-gradient(-45deg, transparent 75%, #252538 75%)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#191929',
  };

  return (
    <div className="tool-page" id="image-rotate-flip-tool">
      {/* Header */}
      <div className="tool-header">
        <div className="tool-breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Image Rotate & Flip</span>
        </div>
        <h1 className="tool-title">Image Rotate & Flip</h1>
        <p className="tool-subtitle">
          Rotate images 90°, 180°, or 270° and mirror horizontally or vertically.
          Fast, interactive live canvas preview with full client-side privacy.
        </p>
      </div>

      {/* Upload State (IDLE or ERROR without selected image) */}
      {processingState === 'IDLE' && !selectedFile && (
        <div className="tool-section">
          <div
            id="image-rotate-dropzone"
            className={`upload-area${isDragOver ? ' drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload image to rotate and flip"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div className="upload-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <p className="upload-title">Drop your image here</p>
            <p className="upload-subtitle">Supports JPG, PNG, WebP, GIF, and BMP</p>
            <button
              type="button"
              id="image-rotate-browse-btn"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose Image File
            </button>
            <input
              ref={fileInputRef}
              id="image-rotate-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="alert alert-error" role="alert" id="image-rotate-error" style={{ marginBottom: '1.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* Editor & Controls (when image is loaded) */}
      {selectedFile && (
        <div className="tool-section">
          {/* Action Toolbar */}
          <div
            className="action-toolbar"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-2, #1a1a2e)',
              padding: '0.8rem 1rem',
              borderRadius: '10px',
              marginBottom: '1rem',
            }}
          >
            {/* Transform Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                id="image-rotate-90-btn"
                className="btn btn-secondary btn-sm"
                onClick={rotateClockwise}
                title="Rotate 90 degrees clockwise"
              >
                ↷ Rotate 90° CW
              </button>
              <button
                type="button"
                id="image-rotate-270-btn"
                className="btn btn-secondary btn-sm"
                onClick={rotateCounterClockwise}
                title="Rotate 90 degrees counter-clockwise"
              >
                ↶ Rotate 90° CCW
              </button>
              <button
                type="button"
                id="image-rotate-180-btn"
                className="btn btn-secondary btn-sm"
                onClick={rotate180}
                title="Rotate 180 degrees"
              >
                ↻ Rotate 180°
              </button>
              <button
                type="button"
                id="image-rotate-flip-h-btn"
                className="btn btn-secondary btn-sm"
                onClick={toggleFlipH}
                title="Flip horizontally (left-right mirror)"
              >
                ⇄ Flip Horizontal
              </button>
              <button
                type="button"
                id="image-rotate-flip-v-btn"
                className="btn btn-secondary btn-sm"
                onClick={toggleFlipV}
                title="Flip vertically (top-bottom mirror)"
              >
                ⇅ Flip Vertical
              </button>
              <button
                type="button"
                id="image-reset-transform-btn"
                className="btn btn-secondary btn-sm"
                onClick={resetTransforms}
                title="Reset rotation and flip"
              >
                ⟲ Reset Transforms
              </button>
            </div>

            {/* Change Image button */}
            <button
              type="button"
              id="image-rotate-clear-btn"
              className="btn btn-secondary btn-sm"
              onClick={handleClear}
            >
              Choose New Image
            </button>
          </div>

          {/* Current Transformation Status Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              fontSize: '0.82rem',
              color: 'var(--text-muted, #aaa)',
              marginBottom: '1rem',
              padding: '0.4rem 0.5rem',
            }}
          >
            <span>
              Rotation: <strong style={{ color: 'var(--text-color, #fff)' }}>{rotDeg}°</strong>
            </span>
            <span>
              Mirroring:{' '}
              <strong style={{ color: isReflected ? 'var(--accent-blue, #3b82f6)' : 'inherit' }}>
                {isReflected ? 'Mirrored' : 'Standard'}
              </strong>
            </span>
            <span>
              Transformed Dimensions:{' '}
              <strong style={{ color: 'var(--text-color, #fff)' }}>
                {currentW} × {currentH}px
              </strong>
            </span>
          </div>

          {/* Interactive Live Preview Canvas */}
          <div
            className="preview-panel"
            style={{
              ...checkerboardStyle,
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '340px',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
            }}
          >
            <canvas
              ref={previewCanvasRef}
              id="image-preview-canvas"
              style={{
                maxWidth: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
                borderRadius: '6px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                display: 'block',
              }}
            />
          </div>

          {/* Export Settings & Save Row */}
          <div
            style={{
              marginTop: '1.5rem',
              background: 'var(--surface-2, #1a1a2e)',
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.25rem',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="image-rotate-format" className="option-label" style={{ margin: 0 }}>
                  Format:
                </label>
                <select
                  id="image-rotate-format"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="btn btn-secondary btn-sm"
                  style={{ background: 'var(--surface-1, #121220)', color: '#fff', border: '1px solid #444', padding: '0.4rem 0.6rem' }}
                >
                  <option value="png">PNG (Lossless / Alpha)</option>
                  <option value="jpeg">JPG (Universal)</option>
                  <option value="webp">WebP (Modern)</option>
                </select>
              </div>

              {outputFormat === 'jpeg' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="image-rotate-quality" className="option-label" style={{ margin: 0 }}>
                    Quality: {jpgQuality}%
                  </label>
                  <input
                    id="image-rotate-quality"
                    type="range"
                    min="50"
                    max="100"
                    value={jpgQuality}
                    onChange={(e) => setJpgQuality(Number(e.target.value))}
                    style={{ width: '100px' }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              id="image-rotate-apply-btn"
              className="btn btn-primary"
              onClick={handleExport}
              disabled={processingState === 'EXPORTING'}
            >
              {processingState === 'EXPORTING' ? 'Processing…' : 'Apply & Prepare Download'}
            </button>
          </div>

          {/* Result Banner when export ready */}
          {processingState === 'SUCCESS' && exportedBlob && exportedUrl && (
            <div className="result-banner" id="image-rotate-result" style={{ marginTop: '1.5rem' }}>
              <div className="result-icon success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="result-info">
                <span className="result-title">Image transformation ready!</span>
                <span className="result-meta">
                  {exportedDimensions && `${exportedDimensions.width} × ${exportedDimensions.height}px`}
                  {' · '}
                  {formatBytes(exportedSize)}
                  {' · '}
                  {outputFormat.toUpperCase()}
                  {exportTime && ` · ${exportTime}s`}
                </span>
              </div>
              <div className="result-actions">
                <button
                  type="button"
                  id="image-rotate-download-btn"
                  className="btn btn-primary"
                  onClick={handleDownload}
                >
                  Download Image
                </button>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Original Format', value: selectedFile.type || 'Image' },
              { label: 'Output Format', value: outputFormat.toUpperCase() },
              { label: 'Original Size', value: formatBytes(selectedFile.size) },
              { label: 'Original Dimensions', value: originalDimensions ? `${originalDimensions.width} × ${originalDimensions.height}` : '—' },
              { label: 'Final Dimensions', value: `${currentW} × ${currentH}` },
              { label: 'Total Rotation', value: `${rotDeg}°` },
              { label: 'Orientation', value: isReflected ? 'Mirrored' : 'Standard' },
              { label: 'Privacy', value: '100% In-Browser' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #888)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="tool-info-section" style={{ marginTop: '3rem' }}>
        <h2 className="tool-info-title">About Image Rotation and Flipping</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {[
            {
              title: 'Precise 90° / 180° / 270° Rotation',
              body: 'Correct sideways or upside-down smartphone photos in one click with automatic canvas aspect ratio adaptation.'
            },
            {
              title: 'Horizontal & Vertical Mirroring',
              body: 'Mirror selfie portraits horizontally or flip images vertically for creative graphics and symmetry corrections.'
            },
            {
              title: 'Lossless Preview & Multiple Formats',
              body: 'Real-time HTML5 Canvas transformation ensures instant feedback before exporting to PNG, JPG, or WebP.'
            },
            {
              title: 'Complete Client-Side Security',
              body: 'Your photos remain local on your device at all times. Zero server communication or cloud processing.'
            }
          ].map(({ title, body }) => (
            <div key={title} style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted, #aaa)', margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
