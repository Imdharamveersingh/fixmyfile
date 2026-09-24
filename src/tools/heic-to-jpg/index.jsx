import { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';
import { validateHeicFile, convertHeicToJpg, getHeicConvertedName } from './heicEngine.js';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export default function HeicToJpgTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [quality, setQuality] = useState(90);
  const [isDragOver, setIsDragOver] = useState(false);

  // Conversion status: IDLE | LOADING_DECODER | DECODING | SUCCESS | ERROR
  const [status, setStatus] = useState('IDLE');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Result state
  const [convertedResult, setConvertedResult] = useState(null);

  const fileInputRef = useRef(null);
  const activeResultUrlRef = useRef(null);

  // Dynamic SEO metadata
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'HEIC to JPG Converter Online — Free & 100% Private | FixMyFile';

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
      'Convert Apple iPhone HEIC and HEIF photos to high-quality JPG directly in your browser. Fast, free, completely client-side with zero cloud uploads or data tracking.'
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
      if (activeResultUrlRef.current) {
        URL.revokeObjectURL(activeResultUrlRef.current);
      }
    };
  }, []);

  // Handle file input
  const handleFile = (file) => {
    try {
      validateHeicFile(file);
      setSelectedFile(file);
      setErrorMessage(null);
      setStatus('IDLE');
      if (activeResultUrlRef.current) {
        URL.revokeObjectURL(activeResultUrlRef.current);
        activeResultUrlRef.current = null;
      }
      setConvertedResult(null);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid HEIC/HEIF file.');
      setStatus('ERROR');
    }
  };

  // Run conversion
  const handleConvert = async () => {
    if (!selectedFile || status === 'LOADING_DECODER' || status === 'DECODING') return;

    setStatus('LOADING_DECODER');
    setStatusMessage('Loading HEIC converter...');
    setErrorMessage(null);

    try {
      const result = await convertHeicToJpg(
        selectedFile,
        { quality: quality / 100 },
        (msg) => {
          setStatus('DECODING');
          setStatusMessage(msg);
        }
      );

      // Measure dimensions of converted JPG image
      const resultUrl = URL.createObjectURL(result.blob);
      activeResultUrlRef.current = resultUrl;

      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Non-blocking if dimension probe fails
        img.src = resultUrl;
      });

      setConvertedResult({
        ...result,
        url: resultUrl,
        width: img.naturalWidth || null,
        height: img.naturalHeight || null,
        downloadName: getHeicConvertedName(selectedFile.name)
      });

      setStatus('SUCCESS');
      setStatusMessage('');
    } catch (err) {
      console.error('HEIC conversion error:', err);
      let userMsg = err.message || 'Failed to convert HEIC image. Please try again.';
      if (userMsg.includes('ERR_LIBHEIF') || userMsg.includes('format not supported')) {
        userMsg = 'This HEIC photo uses an advanced container format or profile not supported by in-browser decoding. Please try standard iPhone HEIC images.';
      }
      setErrorMessage(userMsg);
      setStatus('ERROR');
    }
  };

  // Download converted image
  const handleDownload = () => {
    if (!convertedResult) return;
    const a = document.createElement('a');
    a.href = convertedResult.url;
    a.download = convertedResult.downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Full reset
  const handleReset = () => {
    if (activeResultUrlRef.current) {
      URL.revokeObjectURL(activeResultUrlRef.current);
      activeResultUrlRef.current = null;
    }
    setSelectedFile(null);
    setConvertedResult(null);
    setStatus('IDLE');
    setStatusMessage('');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isBusy = status === 'LOADING_DECODER' || status === 'DECODING';

  return (
    <div className="tool-view-container tool-page-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="heic-to-jpg"
        title="HEIC to JPG Converter"
        description="Convert Apple iPhone HEIC and HEIF photos to high-compatibility JPG format in seconds. Works completely offline in your browser with 100% privacy and zero file uploads."
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="tool-alert tool-alert-error" role="alert" style={{ marginBottom: '20px' }}>
          <span className="material-symbols-outlined" style={{ marginRight: '8px' }}>
            error
          </span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Dropzone */}
      {!selectedFile && (
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
          id="heic-dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".heic,.heif,image/heic,image/heif,image/heic-sequence,image/heif-sequence,application/octet-stream"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            id="heic-file-input"
          />
          <div className="dropzone-icon">
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--primary)' }}>
              photo_camera
            </span>
          </div>
          <h3 className="dropzone-title">Click or Drag & Drop HEIC/HEIF Image Here</h3>
          <p className="dropzone-subtitle">
            Supports Apple iPhone .heic and .heif photos (up to 100MB) · 100% in-browser conversion
          </p>
        </div>
      )}

      {/* Workbench Card when file is selected */}
      {selectedFile && (
        <div className="workbench-card" style={{ padding: '24px', borderRadius: '16px' }} id="heic-workbench">
          {/* File Information Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '18px',
              borderBottom: '1px solid var(--border-subtle)',
              marginBottom: '20px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary-soft)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  image
                </span>
              </div>
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '1rem' }} id="heic-filename">
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Size: {formatBytes(selectedFile.size)} · Format: HEIC/HEIF
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleReset}
              disabled={isBusy}
              style={{ padding: '6px 12px', fontSize: '0.85rem' }}
              id="heic-change-file-btn"
            >
              Change File
            </button>
          </div>

          {/* Quality & Settings */}
          {status !== 'SUCCESS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="heic-quality-slider" style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                    JPEG Output Quality:
                  </label>
                  <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--primary)' }}>
                    {quality}%
                  </span>
                </div>
                <input
                  id="heic-quality-slider"
                  type="range"
                  min="20"
                  max="100"
                  step="1"
                  value={quality}
                  disabled={isBusy}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--primary)' }}
                />
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    marginTop: '4px'
                  }}
                >
                  <span>Smaller size (20%)</span>
                  <span>Recommended (90%)</span>
                  <span>Maximum quality (100%)</span>
                </div>
              </div>

              {/* Progress feedback when converting */}
              {isBusy && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--primary-soft)',
                    color: 'var(--primary)',
                    fontWeight: '600',
                    fontSize: '0.95rem'
                  }}
                  id="heic-progress-indicator"
                >
                  <span className="spinner" style={{ width: '22px', height: '22px' }} />
                  <span>{statusMessage}</span>
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="button"
                className="btn-primary"
                onClick={handleConvert}
                disabled={isBusy}
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
                id="heic-convert-btn"
              >
                <span className="material-symbols-outlined">sync</span>
                Convert to JPG
              </button>
            </div>
          )}

          {/* Success State */}
          {status === 'SUCCESS' && convertedResult && (
            <div
              style={{
                marginTop: '12px',
                padding: '20px',
                borderRadius: '12px',
                border: '1.5px solid rgba(16, 185, 129, 0.4)',
                backgroundColor: 'rgba(16, 185, 129, 0.05)'
              }}
              id="heic-success-banner"
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#10b981',
                  fontWeight: '700',
                  fontSize: '1.1rem',
                  marginBottom: '16px'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                  check_circle
                </span>
                HEIC Photo Converted Successfully!
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '20px',
                  alignItems: 'center'
                }}
              >
                {/* Converted JPG Preview */}
                <div
                  style={{
                    borderRadius: '10px',
                    overflow: 'hidden',
                    maxHeight: '260px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    padding: '8px'
                  }}
                >
                  <img
                    src={convertedResult.url}
                    alt="Converted JPG Preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '240px',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                    id="heic-result-img"
                  />
                </div>

                {/* Conversion Stats and CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: '0.88rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div>
                      <strong>Original Size:</strong> {formatBytes(selectedFile.size)}
                    </div>
                    <div>
                      <strong>Converted Size:</strong> {formatBytes(convertedResult.size)}
                    </div>
                    {convertedResult.width && convertedResult.height && (
                      <div>
                        <strong>Dimensions:</strong> {convertedResult.width} × {convertedResult.height} px
                      </div>
                    )}
                    <div>
                      <strong>Processing Time:</strong> {(convertedResult.totalTime / 1000).toFixed(2)}s
                    </div>
                    <div>
                      <strong>Output Format:</strong> Standard JPEG (.jpg)
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleDownload}
                      style={{
                        flex: 1,
                        padding: '12px 18px',
                        fontSize: '1rem',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      id="heic-download-btn"
                    >
                      <span className="material-symbols-outlined">download</span>
                      Download JPG
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleReset}
                      style={{ padding: '12px 16px', fontSize: '0.95rem' }}
                      id="heic-convert-another-btn"
                    >
                      Convert Another
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="heic-to-jpg" />
    </div>
  );
}
