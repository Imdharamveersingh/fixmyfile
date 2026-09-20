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
function getWebpDownloadName(originalName) {
  if (!originalName) return 'image-converted.webp';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-converted.webp`;
}

// Validate JPG/JPEG input
function isJpgFile(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg');
}

// Convert JPG file to WebP Blob via Canvas
function convertJpgToWebp(file, quality) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null. The image could not be encoded to WebP.'));
            return;
          }
          resolve({ blob, width: img.naturalWidth, height: img.naturalHeight });
        },
        'image/webp',
        quality / 100
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode JPG image. The file may be corrupted or unsupported.'));
    };
    img.src = url;
  });
}

export default function JpgToWebpTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Conversion options
  const [quality, setQuality] = useState(85);
  const [losslessMode, setLosslessMode] = useState(false);

  // Processing & Status
  const [processingState, setProcessingState] = useState('IDLE');
  const [errorMessage, setErrorMessage] = useState(null);

  // Result
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [convertedSize, setConvertedSize] = useState(null);
  const [convertedDimensions, setConvertedDimensions] = useState(null);
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

  const processFile = useCallback(
    async (file) => {
      if (!file) return;

      revokeOriginalUrl();
      revokeConvertedUrl();
      setConvertedUrl(null);
      setConvertedSize(null);
      setConvertedDimensions(null);
      setOriginalDimensions(null);
      setErrorMessage(null);
      setConversionTime(null);

      if (!isJpgFile(file)) {
        setErrorMessage('Invalid format. Please upload a valid .jpg or .jpeg image file.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size === 0) {
        setErrorMessage('The selected file is empty (0 bytes). Please select a valid JPEG image.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File too large. Maximum supported file size is 50 MB.');
        setProcessingState('ERROR');
        return;
      }

      setSelectedFile(file);

      const origUrl = URL.createObjectURL(file);
      activeOriginalUrlRef.current = origUrl;
      setOriginalPreviewUrl(origUrl);

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
        // Lossless mode uses quality=1.0 in the Canvas API (maximum fidelity)
        const effectiveQuality = losslessMode ? 100 : quality;
        const { blob, width, height } = await convertJpgToWebp(file, effectiveQuality);
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        setConversionTime(elapsed);

        setProcessingState('VALIDATING');
        // Verify output is a genuine WebP (RIFF....WEBP signature)
        const arrBuf = await blob.arrayBuffer();
        const bytes = new Uint8Array(arrBuf);
        // RIFF at 0..3, WEBP at 8..11
        const isRiff =
          bytes[0] === 0x52 &&
          bytes[1] === 0x49 &&
          bytes[2] === 0x46 &&
          bytes[3] === 0x46;
        const isWebp =
          bytes[8] === 0x57 &&
          bytes[9] === 0x45 &&
          bytes[10] === 0x42 &&
          bytes[11] === 0x50;
        if (!isRiff || !isWebp) {
          throw new Error(
            'Output validation failed: result does not have a valid WebP (RIFF....WEBP) signature. Your browser may not support WebP encoding.'
          );
        }

        const outUrl = URL.createObjectURL(blob);
        activeConvertedUrlRef.current = outUrl;
        setConvertedUrl(outUrl);
        setConvertedSize(blob.size);
        setConvertedDimensions({ width, height });
        setProcessingState('SUCCESS');
      } catch (err) {
        setErrorMessage(err.message || 'Conversion failed. Please try another JPEG file.');
        setProcessingState('ERROR');
      }
    },
    [quality, losslessMode, revokeOriginalUrl, revokeConvertedUrl]
  );

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
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
    a.download = getWebpDownloadName(selectedFile.name);
    a.click();
  };

  const reductionPct =
    selectedFile && convertedSize
      ? Math.round((1 - convertedSize / selectedFile.size) * 100)
      : null;

  return (
    <main className="tool-page" id="jpg-to-webp-tool">
      <title>JPG to WebP Converter — FixMyFile</title>

      {/* Header */}
      <div className="tool-header">
        <div className="tool-breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep">›</span>
          <span>JPG to WebP</span>
        </div>
        <h1 className="tool-title">JPG to WebP</h1>
        <p className="tool-subtitle">
          Convert JPEG images to modern WebP format for smaller file sizes and faster page loads.
          100% client‑side — your images are never uploaded to any server.
        </p>
      </div>

      {/* Upload Zone — IDLE / ERROR */}
      {(processingState === 'IDLE' || processingState === 'ERROR') && (
        <div className="tool-section">
          <div
            id="jpg-to-webp-dropzone"
            className={`upload-area${isDragOver ? ' drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload JPG or JPEG image"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div className="upload-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="upload-title">Drop your JPG image here</p>
            <p className="upload-subtitle">or click to browse — .jpg / .jpeg files only</p>
            <button
              type="button"
              id="jpg-to-webp-browse-btn"
              className="btn btn-primary"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Choose JPG File
            </button>
            <input
              ref={fileInputRef}
              id="jpg-to-webp-file-input"
              type="file"
              accept="image/jpeg,.jpg,.jpeg"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>

          {processingState === 'ERROR' && (
            <div className="alert alert-error" role="alert" id="jpg-to-webp-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMessage}
            </div>
          )}

          {/* Options */}
          <div className="tool-section" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-label">Conversion Options</h3>

            {/* Lossless toggle */}
            <div className="option-row" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label htmlFor="jpg-to-webp-lossless" className="option-label" style={{ margin: 0 }}>
                Lossless WebP
              </label>
              <button
                type="button"
                id="jpg-to-webp-lossless"
                role="switch"
                aria-checked={losslessMode}
                className={`btn btn-sm${losslessMode ? ' btn-primary' : ' btn-secondary'}`}
                onClick={() => setLosslessMode((prev) => !prev)}
              >
                {losslessMode ? 'On' : 'Off'}
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #888)' }}>
                {losslessMode ? 'Lossless — perfect quality, larger file' : 'Lossy — smaller file, excellent quality'}
              </span>
            </div>

            {/* Quality slider (only when lossy) */}
            {!losslessMode && (
              <div className="option-row">
                <label htmlFor="jpg-to-webp-quality-slider" className="option-label">
                  WebP Quality: <strong>{quality}%</strong>
                </label>
                <input
                  id="jpg-to-webp-quality-slider"
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
            )}
          </div>
        </div>
      )}

      {/* Processing */}
      {(processingState === 'LOADING' || processingState === 'CONVERTING' || processingState === 'VALIDATING') && (
        <div className="tool-section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
          <p className="processing-label">
            {processingState === 'LOADING' && 'Loading image…'}
            {processingState === 'CONVERTING' && 'Converting JPG to WebP…'}
            {processingState === 'VALIDATING' && 'Validating WebP output…'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>All processing happens in your browser</p>
        </div>
      )}

      {/* Success */}
      {processingState === 'SUCCESS' && convertedUrl && selectedFile && (
        <div className="tool-section">
          <div className="result-banner" id="jpg-to-webp-result">
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
              <button type="button" id="jpg-to-webp-download-btn" className="btn btn-primary" onClick={handleDownload}>
                Download WebP
              </button>
              <button type="button" id="jpg-to-webp-reset-btn" className="btn btn-secondary" onClick={handleReset}>
                Convert Another
              </button>
            </div>
          </div>

          {/* Side-by-side preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
            <div className="preview-panel">
              <div className="preview-label-row">
                <span className="preview-label">Original JPG</span>
                <span className="preview-badge" style={{ background: 'var(--accent-blue, #3b82f6)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px' }}>
                  {formatBytes(selectedFile.size)}
                </span>
              </div>
              <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={originalPreviewUrl} alt="Original JPG" style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }} />
              </div>
            </div>
            <div className="preview-panel">
              <div className="preview-label-row">
                <span className="preview-label">Converted WebP</span>
                <span className="preview-badge" style={{ background: 'var(--accent-green, #22c55e)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px' }}>
                  {formatBytes(convertedSize)}
                </span>
              </div>
              <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={convertedUrl} alt="Converted WebP" style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }} />
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Format In', value: 'JPEG' },
              { label: 'Format Out', value: losslessMode ? 'WebP (Lossless)' : 'WebP (Lossy)' },
              { label: 'Dimensions', value: convertedDimensions ? `${convertedDimensions.width} × ${convertedDimensions.height}` : '—' },
              { label: 'Quality', value: losslessMode ? 'Lossless' : `${quality}%` },
              { label: 'Original Size', value: formatBytes(selectedFile.size) },
              { label: 'Converted Size', value: formatBytes(convertedSize) },
              { label: 'Time', value: conversionTime ? `${conversionTime}s` : '—' },
              { label: 'Processing', value: 'In-Browser' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #888)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="tool-info-section" style={{ marginTop: '3rem' }}>
        <h2 className="tool-info-title">About JPG to WebP Conversion</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {[
            { title: '100% Private', body: 'All processing runs entirely inside your browser using the Canvas API. No files ever leave your device.' },
            { title: 'Smaller Files', body: 'WebP typically achieves 25–35% smaller file sizes than JPEG at equivalent visual quality, improving page load speed.' },
            { title: 'Lossy or Lossless', body: 'Choose lossy WebP for web publishing or lossless WebP for perfect quality preservation with full detail.' },
            { title: 'Universal Browser Support', body: 'WebP is supported natively in Chrome, Safari 14+, Firefox, and Edge — covering 97%+ of modern browsers.' },
          ].map(({ title, body }) => (
            <div key={title} style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted, #aaa)', margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
