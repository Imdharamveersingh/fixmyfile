import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  validateVideoFile,
  convertVideoToGif,
  formatBytes,
  probeVideoMetadata,
  FPS_PRESETS,
  RESOLUTION_PRESETS
} from './videoToGifEngine';

export default function VideoToGifTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [fps, setFps] = useState(10);
  const [resolution, setResolution] = useState('auto');
  const [maxDuration, setMaxDuration] = useState(10);
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [gifResult, setGifResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const outputUrlRef = useRef(null);

  useEffect(() => {
    document.title = 'Video to GIF Converter Online — Make Animated GIFs Free & Privately | FixMyFile';
  }, []);

  // Cleanup object URLs on unmount or reset
  const cleanupUrl = () => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupUrl();
    };
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    setErrorMessage(null);
    setGifResult(null);
    cleanupUrl();

    try {
      await validateVideoFile(file);

      // Probe metadata (dimensions, duration)
      const meta = await probeVideoMetadata(file);

      setSelectedFile(file);
      setFileMetadata({
        name: file.name,
        size: file.size,
        width: meta?.width || null,
        height: meta?.height || null,
        duration: meta?.durationFormatted || null,
        durationSeconds: meta?.durationSeconds || null
      });
    } catch (err) {
      setErrorMessage(err.message || 'The selected file is not a valid video.');
      setSelectedFile(null);
      setFileMetadata(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
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

  const handleStartConversion = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Initializing GIF generation engine...');

    try {
      const result = await convertVideoToGif(selectedFile, {
        fps: Number(fps),
        resolution,
        maxDuration: Number(maxDuration),
        onStatus: (msg) => setStatusMessage(msg)
      });

      const downloadUrl = URL.createObjectURL(result.blob);
      outputUrlRef.current = downloadUrl;

      setGifResult({
        blob: result.blob,
        url: downloadUrl,
        filename: result.filename,
        size: result.size,
        originalSize: result.originalSize,
        frameCount: result.frameCount,
        dimensions: result.dimensions
      });
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during GIF generation.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleReset = () => {
    cleanupUrl();
    setSelectedFile(null);
    setFileMetadata(null);
    setGifResult(null);
    setErrorMessage(null);
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="tool-page-container">
      {/* Breadcrumb Navigation */}
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Video to GIF</span>
      </nav>

      {/* Hero Header */}
      <header className="tool-header">
        <div className="tool-badge-wrap">
          <span className="tool-privacy-badge">🔒 100% Client-Side • Private</span>
        </div>
        <h1 className="tool-title">Video to GIF Converter</h1>
        <p className="tool-subtitle">
          Transform video clips into vibrant, high-fidelity animated GIF loops with customizable framerate and resolution. Fast, free, and zero cloud uploads.
        </p>
      </header>

      {/* Main Workspace */}
      <div className="tool-workspace">
        {errorMessage && (
          <div className="alert-error" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dropzone State (Empty) */}
        {!selectedFile && !gifResult && (
          <div
            id="video-to-gif-dropzone"
            className={`dropzone-card ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.m4v"
              aria-label="Upload Video"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <path d="M7 10v4h3" />
                <path d="M12 10v4" />
                <path d="M17 10h-3v4h2" />
              </svg>
            </div>
            <h2 className="dropzone-title">Drop your video clip here</h2>
            <p className="dropzone-desc">or browse from your device. Supported formats: MP4, WebM, MOV (up to 500 MB)</p>
            <button
              type="button"
              className="btn-select-file"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose Video File
            </button>
            <p className="dropzone-guarantee">Your video is converted locally in your browser. It is never uploaded.</p>
          </div>
        )}

        {/* Selected File & Conversion Controls */}
        {selectedFile && !gifResult && (
          <div className="file-active-card">
            <div className="file-info-header">
              <div className="file-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </div>
              <div className="file-meta-content">
                <span className="file-name" title={fileMetadata?.name}>
                  {fileMetadata?.name}
                </span>
                <div className="file-submeta">
                  <span>{formatBytes(fileMetadata?.size)}</span>
                  {fileMetadata?.width && fileMetadata?.height && (
                    <>
                      <span className="meta-dot">•</span>
                      <span>{fileMetadata.width} × {fileMetadata.height}</span>
                    </>
                  )}
                  {fileMetadata?.duration && (
                    <>
                      <span className="meta-dot">•</span>
                      <span>{fileMetadata.duration}</span>
                    </>
                  )}
                  <span className="meta-dot">•</span>
                  <span className="badge-local">Local File</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                aria-label="Remove File"
                onClick={handleReset}
                disabled={isProcessing}
              >
                ✕
              </button>
            </div>

            {/* GIF Settings */}
            <div className="options-section">
              <label htmlFor="fps-select" className="option-label">
                Animation Framerate (FPS):
              </label>
              <select
                id="fps-select"
                className="control-select"
                value={fps}
                disabled={isProcessing}
                onChange={(e) => setFps(Number(e.target.value))}
              >
                {FPS_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="options-section" style={{ marginTop: '14px' }}>
              <label htmlFor="resolution-select" className="option-label">
                GIF Max Resolution:
              </label>
              <select
                id="resolution-select"
                className="control-select"
                value={resolution}
                disabled={isProcessing}
                onChange={(e) => setResolution(e.target.value)}
              >
                {RESOLUTION_PRESETS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="options-section" style={{ marginTop: '14px' }}>
              <label htmlFor="duration-select" className="option-label">
                Conversion Duration Limit:
              </label>
              <select
                id="duration-select"
                className="control-select"
                value={maxDuration}
                disabled={isProcessing}
                onChange={(e) => setMaxDuration(Number(e.target.value))}
              >
                <option value={5}>First 5 seconds (Smallest file size)</option>
                <option value={10}>First 10 seconds (Standard GIF loop)</option>
                <option value={15}>First 15 seconds (Extended clip)</option>
                <option value={30}>Up to 30 seconds (Maximum safe duration)</option>
              </select>
              <p className="option-help-text">
                GIFs with high durations or resolutions can grow very large. Limiting duration preserves snappy loading and browser stability.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-wrap">
              <button
                type="button"
                id="btn-convert-gif"
                className="btn-primary-action"
                disabled={isProcessing}
                onClick={handleStartConversion}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-inline" />
                    <span>{statusMessage || 'Generating GIF...'}</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Generate Animated GIF</span>
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-secondary-action"
                disabled={isProcessing}
                onClick={handleReset}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* GIF Result State */}
        {gifResult && (
          <div className="result-card" id="video-to-gif-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Animated GIF Created Successfully!</h2>
            <p className="result-subtitle">
              Your optimized animated GIF loop is ready for preview and download.
            </p>

            {/* Live GIF Preview */}
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <img
                id="gif-preview"
                src={gifResult.url}
                alt="Generated Animated GIF Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '320px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
            </div>

            <div className="stats-comparison">
              <div className="stat-box">
                <span className="stat-label">Original Video:</span>
                <span className="stat-val">{formatBytes(gifResult.originalSize)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">GIF Size:</span>
                <span className="stat-val highlight">{formatBytes(gifResult.size)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Frames:</span>
                <span className="stat-val">{gifResult.frameCount} frames</span>
              </div>
            </div>

            <div className="result-actions">
              <a
                id="btn-download-gif"
                href={gifResult.url}
                download={gifResult.filename}
                className="btn-download"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download GIF</span>
              </a>
              <button
                type="button"
                id="btn-convert-another"
                className="btn-reset"
                onClick={handleReset}
              >
                Convert Another Video
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Informational & SEO Section */}
      <section className="tool-info-section">
        <div className="info-grid">
          <div className="info-card">
            <h3>🎨 Adaptive Palette Optimization</h3>
            <p>
              FixMyFile uses a two-pass palettegen and paletteuse algorithm. It calculates the exact 256-color palette customized for your video frames to avoid color banding and graininess.
            </p>
          </div>
          <div className="info-card">
            <h3>🔒 Complete Client-Side Privacy</h3>
            <p>
              Your videos never leave your computer or smartphone. 100% of the extraction, palette calculation, and GIF rendering happens directly in your browser.
            </p>
          </div>
          <div className="info-card">
            <h3>⚡ Universal GIF Loops</h3>
            <p>
              Generated GIF animations are configured with infinite looping (`-loop 0`) and standard GIF89a encoding, compatible with Discord, Slack, Reddit, Twitter/X, and messaging apps.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-item">
            <h4>Does this tool upload my video to a remote server?</h4>
            <p>
              No. Unlike other GIF converters that upload your footage to cloud servers, FixMyFile processes 100% of the video locally using WebAssembly.
            </p>
          </div>
          <div className="faq-item">
            <h4>What framerate (FPS) should I choose?</h4>
            <p>
              For most meme clips, animations, and reaction loops, <strong>10 FPS</strong> or <strong>15 FPS</strong> offers the best trade-off between smooth animation and lightweight file sizes.
            </p>
          </div>
          <div className="faq-item">
            <h4>Why is my GIF file size larger than the source video?</h4>
            <p>
              Modern MP4 videos use advanced inter-frame video compression (like H.264), whereas the GIF format stores individual 256-color paletted frames with basic LZW compression. Lowering the resolution or choosing a shorter duration limit keeps GIF sizes compact.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
