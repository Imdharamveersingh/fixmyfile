import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  validateVideoFile,
  compressVideo,
  formatBytes,
  probeVideoMetadata,
  COMPRESSION_PRESETS
} from './videoCompressorEngine';

export default function VideoCompressorTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [preset, setPreset] = useState('messaging');
  const [resolution, setResolution] = useState('auto');
  const [muteAudio, setMuteAudio] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [compressedResult, setCompressedResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const outputUrlRef = useRef(null);

  useEffect(() => {
    document.title = 'Video Compressor Online — Reduce Video Size Free & Privately | FixMyFile';
  }, []);

  // Cleanup any created object URLs on unmount or reset
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
    setCompressedResult(null);
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
        duration: meta?.durationFormatted || null
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

  const handleStartCompression = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Initializing video compression engine...');

    try {
      const result = await compressVideo(selectedFile, {
        preset,
        resolution,
        muteAudio,
        onStatus: (msg) => setStatusMessage(msg)
      });

      const downloadUrl = URL.createObjectURL(result.blob);
      outputUrlRef.current = downloadUrl;

      setCompressedResult({
        blob: result.blob,
        url: downloadUrl,
        filename: result.filename,
        size: result.size,
        originalSize: result.originalSize,
        reductionPercent: result.reductionPercent,
        dimensions: result.dimensions
      });
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during video compression.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleReset = () => {
    cleanupUrl();
    setSelectedFile(null);
    setFileMetadata(null);
    setCompressedResult(null);
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
        <span className="breadcrumb-current">Video Compressor</span>
      </nav>

      {/* Hero Header */}
      <header className="tool-header">
        <div className="tool-badge-wrap">
          <span className="tool-privacy-badge">🔒 100% Client-Side • Private</span>
        </div>
        <h1 className="tool-title">Video Compressor</h1>
        <p className="tool-subtitle">
          Reduce video bitrate and dimensions for messaging, WhatsApp, Discord, and email sharing. Fast, high-quality, and zero server uploads.
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
        {!selectedFile && !compressedResult && (
          <div
            id="video-compressor-dropzone"
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
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <line x1="2" y1="7" x2="7" y2="7" />
                <line x1="2" y1="17" x2="7" y2="17" />
                <line x1="17" y1="17" x2="22" y2="17" />
                <line x1="17" y1="7" x2="22" y2="7" />
              </svg>
            </div>
            <h2 className="dropzone-title">Drop your video file here</h2>
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
            <p className="dropzone-guarantee">Your video is compressed locally in your browser. It is never uploaded.</p>
          </div>
        )}

        {/* Selected File & Compression Controls */}
        {selectedFile && !compressedResult && (
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

            {/* Compression Settings */}
            <div className="options-section">
              <label htmlFor="preset-select" className="option-label">
                Compression Level / Quality:
              </label>
              <select
                id="preset-select"
                className="control-select"
                value={preset}
                disabled={isProcessing}
                onChange={(e) => setPreset(e.target.value)}
              >
                <option value="email">
                  {COMPRESSION_PRESETS.email.name} (480p • Smallest file size)
                </option>
                <option value="messaging">
                  {COMPRESSION_PRESETS.messaging.name} (720p • WhatsApp / Discord)
                </option>
                <option value="web">
                  {COMPRESSION_PRESETS.web.name} (1080p • High fidelity)
                </option>
              </select>
              <p className="option-help-text">
                {COMPRESSION_PRESETS[preset]?.description}
              </p>
            </div>

            <div className="options-section" style={{ marginTop: '14px' }}>
              <label htmlFor="resolution-select" className="option-label">
                Target Resolution Constraint:
              </label>
              <select
                id="resolution-select"
                className="control-select"
                value={resolution}
                disabled={isProcessing}
                onChange={(e) => setResolution(e.target.value)}
              >
                <option value="auto">Auto (from selected compression level)</option>
                <option value="original">Keep Original Dimensions (Compress bitrate only)</option>
                <option value="1080p">1080p (Max 1920 × 1080)</option>
                <option value="720p">720p (Max 1280 × 720)</option>
                <option value="480p">480p (Max 854 × 480)</option>
                <option value="360p">360p (Max 640 × 360)</option>
              </select>
            </div>

            <div className="options-section" style={{ marginTop: '14px' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  id="checkbox-mute-audio"
                  checked={muteAudio}
                  disabled={isProcessing}
                  onChange={(e) => setMuteAudio(e.target.checked)}
                />
                <span>Remove audio track (Mute video for additional size reduction)</span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-wrap">
              <button
                type="button"
                id="btn-compress-video"
                className="btn-primary-action"
                disabled={isProcessing}
                onClick={handleStartCompression}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-inline" />
                    <span>{statusMessage || 'Compressing Video...'}</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 14 10 14 10 20" />
                      <polyline points="20 10 14 10 14 4" />
                      <line x1="14" y1="10" x2="21" y2="3" />
                      <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    <span>Compress Video</span>
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

        {/* Compression Result State */}
        {compressedResult && (
          <div className="result-card" id="video-compressor-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Video Compressed Successfully!</h2>
            <p className="result-subtitle">
              Your optimized MP4 video is ready for download.
            </p>

            <div className="stats-comparison">
              <div className="stat-box">
                <span className="stat-label">Original Size:</span>
                <span className="stat-val">{formatBytes(compressedResult.originalSize)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Compressed Size:</span>
                <span className="stat-val highlight">{formatBytes(compressedResult.size)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Size Reduction:</span>
                <span className="stat-val highlight" style={{ color: '#22c55e' }}>
                  {compressedResult.reductionPercent > 0 ? `-${compressedResult.reductionPercent}%` : 'Optimized'}
                </span>
              </div>
            </div>

            <div className="result-actions">
              <a
                id="btn-download-video"
                href={compressedResult.url}
                download={compressedResult.filename}
                className="btn-download"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Compressed Video</span>
              </a>
              <button
                type="button"
                id="btn-compress-another"
                className="btn-reset"
                onClick={handleReset}
              >
                Compress Another Video
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Informational & SEO Section */}
      <section className="tool-info-section">
        <div className="info-grid">
          <div className="info-card">
            <h3>⚡ Client-Side WebAssembly</h3>
            <p>
              FixMyFile uses a high-performance WebAssembly FFmpeg pipeline directly in your web browser. Video compression runs locally at full CPU speed with zero cloud queues.
            </p>
          </div>
          <div className="info-card">
            <h3>🔒 Guaranteed Privacy</h3>
            <p>
              Your videos never leave your device. There are no server uploads, no cloud storage, and no tracking. Everything happens strictly on your machine.
            </p>
          </div>
          <div className="info-card">
            <h3>📱 Perfect for Sharing</h3>
            <p>
              Output files are universal H.264 MP4 videos optimized with FastStart for instant playback on iOS, Android, Discord, WhatsApp, Slack, and email clients.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-item">
            <h4>Does this tool upload my video to an external server?</h4>
            <p>
              No. 100% of the video compression, rescaling, and encoding runs inside your browser using WebAssembly. Your media files are never transmitted anywhere.
            </p>
          </div>
          <div className="faq-item">
            <h4>Which compression preset should I choose?</h4>
            <p>
              For messaging platforms like WhatsApp or Discord, the <strong>Messaging & Social (720p)</strong> preset provides the ideal balance of sharpness and low file size. For email attachments with strict 25 MB limits, choose <strong>Email & Ultra Compact (480p)</strong>.
            </p>
          </div>
          <div className="faq-item">
            <h4>Will compressing my video preserve audio and aspect ratio?</h4>
            <p>
              Yes. The video’s aspect ratio is preserved without stretching, and audio is encoded in universal AAC unless you choose the "Remove audio track" option.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
