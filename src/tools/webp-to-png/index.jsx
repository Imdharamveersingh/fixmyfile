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
function getPngDownloadName(originalName) {
  if (!originalName) return 'image-converted.png';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-converted.png`;
}

// Validate WebP file extension / MIME
function isWebpFile(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/webp' || name.endsWith('.webp');
}

// Inspect WebP RIFF header
async function validateWebpBuffer(file) {
  const slice = file.slice(0, 16);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 12) return false;
  // 'RIFF' = 0x52, 0x49, 0x46, 0x46
  const isRiff =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  // 'WEBP' = 0x57, 0x45, 0x42, 0x50
  const isWebp =
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return isRiff && isWebp;
}

// Convert WebP file to PNG Blob via Canvas
function convertWebpToPng(file, preserveTransparency = true, customBg = '#ffffff') {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (!preserveTransparency) {
        ctx.fillStyle = customBg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob returned null. The WebP could not be converted to PNG.'));
            return;
          }
          resolve({
            blob,
            width: img.naturalWidth,
            height: img.naturalHeight
          });
        },
        'image/png'
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode WebP image. The file may be corrupted or unsupported.'));
    };
    img.src = url;
  });
}

// Validate PNG signature & extract IHDR info
async function validatePngBlob(blob) {
  const buffer = await blob.slice(0, 33).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 29) {
    throw new Error('PNG header validation failed: output file is too small.');
  }
  // Standard PNG signature: 89 50 4E 47 0D 0A 1A 0A
  const isPngSig =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A;
  if (!isPngSig) {
    throw new Error('Output validation failed: result does not have a valid PNG signature.');
  }

  // Chunk type 'IHDR' at byte 12..15
  const isIhdr =
    bytes[12] === 0x49 &&
    bytes[13] === 0x48 &&
    bytes[14] === 0x44 &&
    bytes[15] === 0x52;
  if (!isIhdr) {
    throw new Error('PNG header validation failed: IHDR chunk missing.');
  }

  // Width (16..19) & Height (20..23) big-endian
  const view = new DataView(buffer);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  const bitDepth = bytes[24];
  const colorType = bytes[25]; // 0=Grayscale, 2=RGB, 3=Palette, 4=Grayscale+Alpha, 6=RGBA

  return { width, height, bitDepth, colorType };
}

export default function WebpToPngTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Conversion options
  const [preserveTransparency, setPreserveTransparency] = useState(true);
  const [bgColor, setBgColor] = useState('#ffffff');

  // Processing & Status
  const [processingState, setProcessingState] = useState('IDLE');
  const [errorMessage, setErrorMessage] = useState(null);

  // Result
  const [convertedUrl, setConvertedUrl] = useState(null);
  const [convertedSize, setConvertedSize] = useState(null);
  const [convertedDimensions, setConvertedDimensions] = useState(null);
  const [pngColorType, setPngColorType] = useState(null);
  const [conversionTime, setConversionTime] = useState(null);

  const activeOriginalUrlRef = useRef(null);
  const activeConvertedUrlRef = useRef(null);
  const fileInputRef = useRef(null);

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
    const prevTitle = document.title;
    document.title = 'WebP to PNG Converter Online — Convert WebP to PNG Free | FixMyFile';
    return () => {
      document.title = prevTitle;
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
      setPngColorType(null);
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

      // Validate WebP RIFF container
      setProcessingState('LOADING');
      try {
        const isValidContainer = await validateWebpBuffer(file);
        if (!isValidContainer) {
          setErrorMessage('Invalid file structure. The uploaded file is missing a genuine WebP (RIFF/WEBP) header.');
          setProcessingState('ERROR');
          return;
        }
      } catch {
        setErrorMessage('Could not read the uploaded file header.');
        setProcessingState('ERROR');
        return;
      }

      const origUrl = URL.createObjectURL(file);
      activeOriginalUrlRef.current = origUrl;
      setOriginalPreviewUrl(origUrl);

      await new Promise((res) => {
        const imgEl = new Image();
        imgEl.onload = () => {
          setOriginalDimensions({ width: imgEl.naturalWidth, height: imgEl.naturalHeight });
          res();
        };
        imgEl.onerror = () => {
          setErrorMessage('Failed to decode WebP image. The file may be corrupted.');
          setProcessingState('ERROR');
          res();
        };
        imgEl.src = origUrl;
      });

      setProcessingState('CONVERTING');
      const t0 = performance.now();
      try {
        const { blob, width, height } = await convertWebpToPng(file, preserveTransparency, bgColor);
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        setConversionTime(elapsed);

        setProcessingState('VALIDATING');
        const headerInfo = await validatePngBlob(blob);

        const outUrl = URL.createObjectURL(blob);
        activeConvertedUrlRef.current = outUrl;
        setConvertedUrl(outUrl);
        setConvertedSize(blob.size);
        setConvertedDimensions({ width, height });
        setPngColorType(headerInfo.colorType);
        setProcessingState('SUCCESS');
      } catch (err) {
        setErrorMessage(err.message || 'Conversion failed. Please try another WebP image.');
        setProcessingState('ERROR');
      }
    },
    [preserveTransparency, bgColor, revokeOriginalUrl, revokeConvertedUrl]
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
    setPngColorType(null);
    setErrorMessage(null);
    setProcessingState('IDLE');
    setConversionTime(null);
  };

  const handleDownload = () => {
    if (!convertedUrl || !selectedFile) return;
    const a = document.createElement('a');
    a.href = convertedUrl;
    a.download = getPngDownloadName(selectedFile.name);
    a.click();
  };

  const checkerboardStyle = {
    backgroundImage: `linear-gradient(45deg, #2a2a3e 25%, transparent 25%),
      linear-gradient(-45deg, #2a2a3e 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #2a2a3e 75%),
      linear-gradient(-45deg, transparent 75%, #2a2a3e 75%)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#1b1b2d',
  };

  return (
    <div className="tool-page" id="webp-to-png-tool">
      <title>WebP to PNG Converter — FixMyFile</title>

      {/* Header */}
      <div className="tool-header">
        <div className="tool-breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep">›</span>
          <span>WebP to PNG</span>
        </div>
        <h1 className="tool-title">WebP to PNG</h1>
        <p className="tool-subtitle">
          Convert Google WebP images to lossless PNG format in your browser.
          Preserves transparency, dimensions, and visual clarity with zero server uploads.
        </p>
      </div>

      {/* Upload Zone */}
      {(processingState === 'IDLE' || processingState === 'ERROR') && (
        <div className="tool-section">
          <div
            id="webp-to-png-dropzone"
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
              id="webp-to-png-browse-btn"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose WebP File
            </button>
            <input
              ref={fileInputRef}
              id="webp-to-png-file-input"
              type="file"
              accept="image/webp,.webp"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>

          {processingState === 'ERROR' && (
            <div className="alert alert-error" role="alert" id="webp-to-png-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {errorMessage}
            </div>
          )}

          {/* Options */}
          <div className="tool-section" style={{ marginTop: '1.5rem' }}>
            <h3 className="section-label">PNG Output Settings</h3>

            {/* Transparency toggle */}
            <div className="option-row" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <label htmlFor="webp-to-png-transparency-toggle" className="option-label" style={{ margin: 0 }}>
                Preserve Transparency
              </label>
              <button
                type="button"
                id="webp-to-png-transparency-toggle"
                role="switch"
                aria-checked={preserveTransparency}
                className={`btn btn-sm${preserveTransparency ? ' btn-primary' : ' btn-secondary'}`}
                onClick={() => setPreserveTransparency((prev) => !prev)}
              >
                {preserveTransparency ? 'Enabled (Alpha)' : 'Flatten Background'}
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #888)' }}>
                {preserveTransparency
                  ? 'Keeps transparent pixels intact in standard 32-bit RGBA PNG'
                  : 'Fills transparent pixels with a solid background color'}
              </span>
            </div>

            {/* Custom background color when transparency is flattened */}
            {!preserveTransparency && (
              <div className="option-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label htmlFor="webp-to-png-bg-color" className="option-label" style={{ margin: 0 }}>
                  Background Fill Color:
                </label>
                <input
                  id="webp-to-png-bg-color"
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  style={{ width: '48px', height: '36px', borderRadius: '6px', border: '1px solid var(--border-color, #444)', cursor: 'pointer', background: 'transparent' }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>{bgColor.toUpperCase()}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Processing State */}
      {(processingState === 'LOADING' || processingState === 'CONVERTING' || processingState === 'VALIDATING') && (
        <div className="tool-section" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1.5rem' }} />
          <p className="processing-label">
            {processingState === 'LOADING' && 'Verifying WebP header & loading image…'}
            {processingState === 'CONVERTING' && 'Converting WebP to lossless PNG…'}
            {processingState === 'VALIDATING' && 'Validating PNG signature & dimensions…'}
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted, #888)' }}>
            Processing 100% locally in your browser
          </p>
        </div>
      )}

      {/* Success State */}
      {processingState === 'SUCCESS' && convertedUrl && selectedFile && (
        <div className="tool-section">
          <div className="result-banner" id="webp-to-png-result">
            <div className="result-icon success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="result-info">
              <span className="result-title">WebP converted to PNG successfully!</span>
              <span className="result-meta">
                {convertedDimensions && `${convertedDimensions.width} × ${convertedDimensions.height}px`}
                {' · '}
                {formatBytes(selectedFile.size)} → {formatBytes(convertedSize)}
                {' · '}
                {pngColorType === 6 ? '32-bit RGBA (Alpha)' : 'Lossless PNG'}
                {conversionTime && ` · ${conversionTime}s`}
              </span>
            </div>
            <div className="result-actions">
              <button
                type="button"
                id="webp-to-png-download-btn"
                className="btn btn-primary"
                onClick={handleDownload}
              >
                Download PNG
              </button>
              <button
                type="button"
                id="webp-to-png-reset-btn"
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Convert Another
              </button>
            </div>
          </div>

          {/* Side-by-Side Preview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
            <div className="preview-panel">
              <div className="preview-label-row">
                <span className="preview-label">Original WebP</span>
                <span className="preview-badge" style={{ background: 'var(--accent-blue, #3b82f6)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px' }}>
                  {originalDimensions ? `${originalDimensions.width} × ${originalDimensions.height} · ` : ''}{formatBytes(selectedFile.size)}
                </span>
              </div>
              <div style={{ ...checkerboardStyle, borderRadius: '8px', overflow: 'hidden', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <img
                  src={originalPreviewUrl}
                  alt="Original WebP"
                  style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>

            <div className="preview-panel">
              <div className="preview-label-row">
                <span className="preview-label">Converted PNG</span>
                <span className="preview-badge" style={{ background: 'var(--accent-green, #22c55e)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '999px' }}>
                  {formatBytes(convertedSize)}
                </span>
              </div>
              <div style={{ ...checkerboardStyle, borderRadius: '8px', overflow: 'hidden', minHeight: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                <img
                  src={convertedUrl}
                  alt="Converted PNG"
                  style={{ maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', display: 'block' }}
                />
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Format In', value: 'Google WebP' },
              { label: 'Format Out', value: 'PNG (Lossless)' },
              { label: 'Dimensions', value: convertedDimensions ? `${convertedDimensions.width} × ${convertedDimensions.height}px` : '—' },
              { label: 'Alpha Channel', value: preserveTransparency ? 'Preserved (RGBA)' : 'Flattened' },
              { label: 'Original Size', value: formatBytes(selectedFile.size) },
              { label: 'PNG Size', value: formatBytes(convertedSize) },
              { label: 'Elapsed Time', value: conversionTime ? `${conversionTime}s` : '—' },
              { label: 'Execution', value: 'In-Browser (Client-side)' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #888)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="tool-info-section" style={{ marginTop: '3rem' }}>
        <h2 className="tool-info-title">Why Convert WebP to PNG?</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {[
            {
              title: '100% Client-Side Privacy',
              body: 'Your images are decoded and encoded right on your machine via HTML5 Canvas. No data is sent over the internet.'
            },
            {
              title: 'Full Alpha Channel Preservation',
              body: 'Transparent backgrounds in WebP are accurately rendered into 32-bit RGBA PNG, perfect for logos, UI graphics, and icons.'
            },
            {
              title: 'Universal Compatibility',
              body: 'PNG is supported by every software application, older browser, graphic design tool (Photoshop, Figma, Illustrator), and printing pipeline.'
            },
            {
              title: 'Pixel-Perfect Fidelity',
              body: 'Canvas PNG export produces lossless output preserving exact source image dimensions without downsampling or artifact generation.'
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
