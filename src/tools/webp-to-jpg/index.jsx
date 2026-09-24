import { useState, useRef, useEffect, useCallback } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';

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
function getJpgDownloadName(originalName) {
  if (!originalName) return 'image-converted.jpg';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-converted.jpg`;
}

// Validate WebP input
function isWebpFile(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/webp' || name.endsWith('.webp');
}

// Convert WebP file to JPG Blob via Canvas
function convertWebpToJpg(file, quality, bgColor) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      // Fill background (JPEG has no alpha channel)
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null. The image could not be encoded.'));
            return;
          }
          resolve({ blob, width: img.naturalWidth, height: img.naturalHeight });
        },
        'image/jpeg',
        quality / 100
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode WebP image. The file may be corrupted or unsupported.'));
    };
    img.src = url;
  });
}

export default function WebpToJpgTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Conversion options
  const [quality, setQuality] = useState(90);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [customBgColor, setCustomBgColor] = useState('#ffffff');
  const [selectedBgPreset, setSelectedBgPreset] = useState('white');

  // Processing & Status
  const [processingState, setProcessingState] = useState('IDLE');
  const [errorMessage, setErrorMessage] = useState(null);

  // Result
  const [_convertedBlob, setConvertedBlob] = useState(null);
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [convertedSize, setConvertedSize] = useState(null);
  const [convertedDimensions, setConvertedDimensions] = useState(null);
  const [previewBackdrop, setPreviewBackdrop] = useState('white');
  const [conversionTime, setConversionTime] = useState(null);

  const activeOriginalUrlRef = useRef(null);
  const activeConvertedUrlRef = useRef(null);
  const fileInputRef = useRef(null);


  // Cleanup object URLs
  const revokeOriginalUrl = useCallback(() => {
    if (activeOriginalUrlRef.current) {
      URL.revokeObjectURL(activeOriginalUrlRef.current);
      activeOriginalUrlRef.current = null;
    }
  }, []);
  const revokeConvertedUrl = useCallback(() => {
    if (activeConvertedUrlRef.current) {
      URL.revokeObjectURL(activeConvertedUrlRef.current);
      activeConvertedUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeOriginalUrl();
      revokeConvertedUrl();
    };
  }, [revokeOriginalUrl, revokeConvertedUrl]);

  const handleBgPreset = (preset) => {
    setSelectedBgPreset(preset);
    if (preset === 'white') setBackgroundColor('#ffffff');
    else if (preset === 'black') setBackgroundColor('#000000');
    else setBackgroundColor(customBgColor);
  };

  const handleCustomBgChange = (e) => {
    setCustomBgColor(e.target.value);
    if (selectedBgPreset === 'custom') setBackgroundColor(e.target.value);
  };

  const processFile = useCallback(
    async (file) => {
      if (!file) return;

      revokeOriginalUrl();
      revokeConvertedUrl();
      setConvertedBlob(null);
      setConvertedUrl(null);
      setConvertedSize(null);
      setConvertedDimensions(null);
      setOriginalDimensions(null);
      setErrorMessage(null);
      setConversionTime(null);

      if (!isWebpFile(file)) {
        setErrorMessage('Invalid format. Please upload a valid .webp image file.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size === 0) {
        setErrorMessage('The selected file is empty (0 bytes). Please select a valid WebP image.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File too large. Maximum supported file size is 50 MB.');
        setProcessingState('ERROR');
        return;
      }

      setSelectedFile(file);

      // Show original preview
      const origUrl = URL.createObjectURL(file);
      activeOriginalUrlRef.current = origUrl;
      setOriginalPreviewUrl(origUrl);

      // Load original dimensions
      setProcessingState('LOADING');
      await new Promise((res) => {
        const imgEl = new Image();
        imgEl.onload = () => {
          setOriginalDimensions({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
          res();
        };
        imgEl.onerror = res;
        imgEl.src = origUrl;
      });

      setProcessingState('CONVERTING');
      const t0 = performance.now();
      try {
        const { blob, width, height } = await convertWebpToJpg(file, quality, backgroundColor);
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        setConversionTime(elapsed);

        setProcessingState('VALIDATING');
        // Verify the output is a genuine JPEG
        const arrBuf = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrBuf);
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
          throw new Error('Output validation failed: result is not a valid JPEG file.');
        }

        const outUrl = URL.createObjectURL(blob);
        activeConvertedUrlRef.current = outUrl;
        setConvertedBlob(blob);
        setConvertedUrl(outUrl);
        setConvertedSize(blob.size);
        setConvertedDimensions({ width, height });
        setProcessingState('SUCCESS');
      } catch (err) {
        setErrorMessage(err.message || 'Conversion failed. Please try another WebP file.');
        setProcessingState('ERROR');
      }
    },
    [quality, backgroundColor, revokeOriginalUrl, revokeConvertedUrl]
  );

  const handleFileSelect = (file) => {
    processFile(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);

  const handleReset = () => {
    revokeOriginalUrl();
    revokeConvertedUrl();
    setSelectedFile(null);
    setOriginalPreviewUrl(null);
    setOriginalDimensions(null);
    setConvertedBlob(null);
    setConvertedUrl(null);
    setConvertedSize(null);
    setConvertedDimensions(null);
    setErrorMessage(null);
    setProcessingState('IDLE');
    setConversionTime(null);
  };

  const handleDownload = () => {
    if (!convertedUrl || !selectedFile) return;
    const a = document.createElement('a');
    a.href = convertedUrl;
    a.download = getJpgDownloadName(selectedFile.name);
    a.click();
  };

  const reductionPct =
    selectedFile && convertedSize
      ? Math.round((1 - convertedSize / selectedFile.size) * 100)
      : null;

  const backdropStyle = {
    checkerboard:
      'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 20px 20px',
    white: '#fff',
    black: '#222',
  };

  return (
    <div className="tool-page" id="webp-to-jpg-tool">
      <title>WebP to JPG Converter — FixMyFile</title>

      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="webp-to-jpg"
        title="WebP to JPG"
        description="Convert Google WebP images to universal JPEG format. Handles transparency with your chosen background color. 100% client‑side — your files never leave your browser."
      />

      {/* Upload Zone — IDLE / ERROR */}
      {(processingState === 'IDLE' || processingState === 'ERROR') && (
        <div className="tool-section">
          <div
            id="webp-to-jpg-dropzone"
            className={`upload-area${isDragOver ? ' drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload WebP image"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div className="upload-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="upload-title">Drop your WebP image here</p>
            <p className="upload-subtitle">or click to browse — .webp files only</p>
            <button
              type="button"
              id="webp-to-jpg-browse-btn"
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Choose WebP File
            </button>
            <input
              ref={fileInputRef}
              id="webp-to-jpg-file-input"
              type="file"
              accept="image/webp,.webp"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>

          {processingState === 'ERROR' && (
            <div className="alert alert-error" role="alert" id="webp-to-jpg-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMessage}
            </div>
          )}

          {/* Options */}
          <div className="tool-section" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-label">Conversion Options</h3>

            {/* Quality */}
            <div className="option-row" style={{ marginBottom: '1rem' }}>
              <label htmlFor="webp-quality-slider" className="option-label">
                JPEG Quality: <strong>{quality}%</strong>
              </label>
              <input
                id="webp-quality-slider"
                type="range"
                min="10"
                max="100"
                step="1"
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="quality-slider"
                style={{ width: '100%', maxWidth: '400px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: '400px', fontSize: '0.72rem', color: 'var(--text-muted, #888)', marginTop: '2px' }}>
                <span>Smaller file</span><span>Higher quality</span>
              </div>
            </div>

            {/* Background */}
            <div className="option-row">
              <label className="option-label">Transparency Background</label>
              <div className="btn-group" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
                {['white', 'black', 'custom'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    id={`webp-bg-${preset}`}
                    className={`btn btn-sm${selectedBgPreset === preset ? ' btn-primary' : ' btn-secondary'}`}
                    onClick={() => handleBgPreset(preset)}
                  >
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </button>
                ))}
                {selectedBgPreset === 'custom' && (
                  <input
                    id="webp-bg-custom-input"
                    type="color"
                    value={customBgColor}
                    onChange={handleCustomBgChange}
                    style={{ width: '44px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: 0 }}
                    title="Pick custom background color"
                  />
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted, #888)', marginTop: '6px' }}>
                WebP supports transparency. Choose a background color for transparent areas when converting to JPEG.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing */}
      {(processingState === 'LOADING' || processingState === 'CONVERTING' || processingState === 'VALIDATING') && (
        <div className="tool-section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
          <p className="processing-label">
            {processingState === 'LOADING' && 'Loading image…'}
            {processingState === 'CONVERTING' && 'Converting WebP to JPEG…'}
            {processingState === 'VALIDATING' && 'Validating output…'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>All processing happens in your browser</p>
        </div>
      )}

      {/* Success */}
      {processingState === 'SUCCESS' && convertedUrl && selectedFile && (
        <div className="tool-section">
          {/* Result banner */}
          <div className="result-banner" id="webp-to-jpg-result">
            <div className="result-icon success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="result-info">
              <span className="result-title">Conversion complete!</span>
              <span className="result-meta">
                {originalDimensions && `${originalDimensions.width} × ${originalDimensions.height}px`}
                {' · '}
                {formatBytes(selectedFile.size)} → {formatBytes(convertedSize)}
                {reductionPct !== null && reductionPct > 0 && (
                  <span className="badge badge-green" style={{ marginLeft: '6px' }}>−{reductionPct}%</span>
                )}
                {reductionPct !== null && reductionPct < 0 && (
                  <span className="badge badge-yellow" style={{ marginLeft: '6px' }}>+{Math.abs(reductionPct)}%</span>
                )}
                {conversionTime && ` · ${conversionTime}s`}
              </span>
            </div>
            <div className="result-actions">
              <button
                type="button"
                id="webp-to-jpg-download-btn"
                className="btn btn-primary"
                onClick={handleDownload}
              >
                Download JPG
              </button>
              <button
                type="button"
                id="webp-to-jpg-reset-btn"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Convert Another
              </button>
            </div>
          </div>

          {/* Side-by-side preview */}
          <div className="preview-comparison" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            {/* Original */}
            <div className="preview-panel">
              <div className="preview-label-row">
                <span className="preview-label">Original WebP</span>
                <span className="preview-badge" style={{ background: 'var(--accent-blue, #3b82f6)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px' }}>
                  {formatBytes(selectedFile.size)}
                </span>
              </div>
              <div
                className="preview-canvas-wrap"
                style={{ background: backdropStyle[previewBackdrop], borderRadius: '8px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img
                  src={originalPreviewUrl}
                  alt="Original WebP"
                  style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>

            {/* Converted */}
            <div className="preview-panel">
              <div className="preview-label-row">
                <span className="preview-label">Converted JPG</span>
                <span className="preview-badge" style={{ background: 'var(--accent-green, #22c55e)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px' }}>
                  {formatBytes(convertedSize)}
                </span>
              </div>
              <div
                className="preview-canvas-wrap"
                style={{ background: backdropStyle[previewBackdrop], borderRadius: '8px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <img
                  src={convertedUrl}
                  alt="Converted JPG"
                  style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          </div>

          {/* Backdrop toggles */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>Preview backdrop:</span>
            {['checkerboard', 'white', 'black'].map((b) => (
              <button
                key={b}
                type="button"
                id={`webp-backdrop-${b}`}
                className={`btn btn-xs${previewBackdrop === b ? ' btn-primary' : ' btn-secondary'}`}
                onClick={() => setPreviewBackdrop(b)}
              >
                {b.charAt(0).toUpperCase() + b.slice(1)}
              </button>
            ))}
          </div>

          {/* Details */}
          <div className="details-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Format In', value: 'WebP' },
              { label: 'Format Out', value: 'JPEG' },
              { label: 'Dimensions', value: convertedDimensions ? `${convertedDimensions.width} × ${convertedDimensions.height}` : '—' },
              { label: 'Quality', value: `${quality}%` },
              { label: 'Original Size', value: formatBytes(selectedFile.size) },
              { label: 'Converted Size', value: formatBytes(convertedSize) },
              { label: 'Time', value: conversionTime ? `${conversionTime}s` : '—' },
              { label: 'Processing', value: 'In-Browser' },
            ].map(({ label, value }) => (
              <div key={label} className="detail-card" style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #888)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="webp-to-jpg" />
    </div>
  );
}
