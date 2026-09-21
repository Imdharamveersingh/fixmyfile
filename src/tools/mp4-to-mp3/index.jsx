import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  validateMp4File,
  convertMp4ToMp3,
  formatBytes
} from './mp4ToMp3Engine';

export default function Mp4ToMp3Tool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [bitrate, setBitrate] = useState('192k');
  const [statusMessage, setStatusMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [convertedResult, setConvertedResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const outputUrlRef = useRef(null);

  useEffect(() => {
    document.title = 'MP4 to MP3 Converter Online — Extract Audio Free & Privately | FixMyFile';
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
    setConvertedResult(null);
    cleanupUrl();

    try {
      await validateMp4File(file);

      // Probe duration where practical using a video element
      let durationStr = null;
      try {
        const tempUrl = URL.createObjectURL(file);
        const tempVideo = document.createElement('video');
        tempVideo.preload = 'metadata';
        tempVideo.src = tempUrl;
        await new Promise((resolve) => {
          tempVideo.onloadedmetadata = () => {
            const sec = Math.round(tempVideo.duration);
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            durationStr = `${m}:${s < 10 ? '0' : ''}${s}`;
            URL.revokeObjectURL(tempUrl);
            resolve();
          };
          tempVideo.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            resolve();
          };
          setTimeout(() => {
            URL.revokeObjectURL(tempUrl);
            resolve();
          }, 3000);
        });
      } catch {
        // Optional probe failed, continue
      }

      setSelectedFile(file);
      setFileMetadata({
        name: file.name,
        size: file.size,
        duration: durationStr
      });
    } catch (err) {
      setErrorMessage(err.message || 'The selected file is not a valid MP4 video.');
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
    setStatusMessage('Initializing conversion engine...');

    try {
      const result = await convertMp4ToMp3(selectedFile, {
        bitrate,
        onStatus: (msg) => setStatusMessage(msg)
      });

      const downloadUrl = URL.createObjectURL(result.blob);
      outputUrlRef.current = downloadUrl;

      setConvertedResult({
        blob: result.blob,
        url: downloadUrl,
        filename: result.filename,
        size: result.size
      });
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during MP4 to MP3 extraction.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleReset = () => {
    cleanupUrl();
    setSelectedFile(null);
    setFileMetadata(null);
    setConvertedResult(null);
    setErrorMessage(null);
    setStatusMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="tool-page-container">
      {/* Breadcrumb & Navigation */}
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">MP4 to MP3</span>
      </nav>

      {/* Hero Header */}
      <header className="tool-header">
        <div className="tool-badge-wrap">
          <span className="tool-phase-badge">Phase 6 • Media Tools</span>
          <span className="tool-privacy-badge">🔒 100% Client-Side • Private</span>
        </div>
        <h1 className="tool-title">MP4 to MP3 Converter</h1>
        <p className="tool-subtitle">
          Extract high-fidelity MP3 audio from any MP4 video directly in your web browser. Fast, free, and zero cloud uploads.
        </p>
      </header>

      {/* Main Workspace */}
      <main className="tool-workspace">
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
        {!selectedFile && !convertedResult && (
          <div
            id="mp4-to-mp3-dropzone"
            className={`dropzone-card ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,video/mp4"
              aria-label="Upload MP4 Video"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFile(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <h2 className="dropzone-title">Drop your MP4 video here</h2>
            <p className="dropzone-desc">or browse from your device. Supported format: .mp4 (up to 500 MB)</p>
            <button
              type="button"
              className="btn-select-file"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose MP4 File
            </button>
            <p className="dropzone-guarantee">Your file is processed locally in your browser. It is never uploaded.</p>
          </div>
        )}

        {/* Selected File & Conversion Controls */}
        {selectedFile && !convertedResult && (
          <div className="file-active-card">
            <div className="file-info-header">
              <div className="file-icon-wrapper">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="2" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                </svg>
              </div>
              <div className="file-meta-content">
                <span className="file-name" title={fileMetadata?.name}>
                  {fileMetadata?.name}
                </span>
                <div className="file-submeta">
                  <span>{formatBytes(fileMetadata?.size)}</span>
                  {fileMetadata?.duration && (
                    <>
                      <span className="meta-dot">•</span>
                      <span>{fileMetadata?.duration} duration</span>
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

            {/* Audio Extraction Settings */}
            <div className="options-section">
              <label htmlFor="bitrate-select" className="option-label">
                Audio Bitrate / Quality:
              </label>
              <select
                id="bitrate-select"
                className="control-select"
                value={bitrate}
                disabled={isProcessing}
                onChange={(e) => setBitrate(e.target.value)}
              >
                <option value="128k">128 kbps (Lightweight / Voice)</option>
                <option value="192k">192 kbps (Standard / Music & Podcast)</option>
                <option value="256k">256 kbps (High Quality)</option>
                <option value="320k">320 kbps (Maximum Fidelity)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons-wrap">
              <button
                type="button"
                id="btn-convert-mp4"
                className="btn-primary-action"
                disabled={isProcessing}
                onClick={handleStartConversion}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-inline" />
                    <span>{statusMessage || 'Extracting Audio...'}</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Extract MP3 Audio</span>
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

        {/* Conversion Result State */}
        {convertedResult && (
          <div className="result-card" id="mp4-to-mp3-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Audio Extracted Successfully!</h2>
            <p className="result-subtitle">
              Your genuine MP3 file is ready. Download it immediately to your device.
            </p>

            <div className="stats-comparison">
              <div className="stat-box">
                <span className="stat-label">Original Video:</span>
                <span className="stat-val">{formatBytes(fileMetadata?.size)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Extracted MP3:</span>
                <span className="stat-val highlight">{formatBytes(convertedResult.size)}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Format:</span>
                <span className="stat-val">MPEG Layer-3 (.mp3)</span>
              </div>
            </div>

            <div className="result-actions">
              <a
                id="btn-download-mp3"
                href={convertedResult.url}
                download={convertedResult.filename}
                className="btn-download"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download MP3</span>
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
      </main>

      {/* Informational & SEO Section */}
      <section className="tool-info-section">
        <div className="info-grid">
          <div className="info-card">
            <h3>⚡ Client-Side WebAssembly</h3>
            <p>
              FixMyFile uses a local WebAssembly engine directly in your web browser. Audio extraction occurs at full processor speeds without internet transmission latency.
            </p>
          </div>
          <div className="info-card">
            <h3>🔒 Complete File Privacy</h3>
            <p>
              Your videos never leave your computer or mobile phone. No servers, no logs, and no cloud caching. What happens on your machine stays on your machine.
            </p>
          </div>
          <div className="info-card">
            <h3>🎵 Universal Compatibility</h3>
            <p>
              The output is a standardized MPEG Audio Layer III (.mp3) stream compatible with every car stereo, mobile device, media player, and digital audio workstation.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-item">
            <h4>Does this tool upload my video to a remote server?</h4>
            <p>
              No. Unlike other converter sites, FixMyFile executes 100% of the extraction and MP3 encoding inside your web browser. Your video bytes never leave your machine.
            </p>
          </div>
          <div className="faq-item">
            <h4>What happens if my MP4 has no audio track?</h4>
            <p>
              The tool inspects the video container. If no audio stream is detected, it will inform you gracefully and refuse to generate an invalid empty file.
            </p>
          </div>
          <div className="faq-item">
            <h4>What audio bitrates are available?</h4>
            <p>
              You can choose between 128 kbps (compact voice/speech), 192 kbps (standard music fidelity), 256 kbps, and 320 kbps (studio maximum quality).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
