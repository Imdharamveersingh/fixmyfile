import { useState, useRef, useCallback, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';
import {
  validateImageFile,
  generateGifFromFrames,
  getGifOutputFilename,
  GIF_FPS_PRESETS,
  GIF_RESOLUTION_PRESETS,
  MAX_FRAME_COUNT,
  MAX_SINGLE_IMAGE_SIZE,
  MAX_TOTAL_INPUT_SIZE
} from './gifMakerEngine.js';

/**
 * Generates a unique string ID for a frame entry.
 */
function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Formats bytes to human-readable string.
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function GifMakerTool() {
  /** Each frame: { id: string, file: File, thumbUrl: string, error?: string } */
  const [frames, setFrames] = useState([]);
  const [fps, setFps] = useState(15);
  const [resolution, setResolution] = useState('360');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [gifResult, setGifResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const outputUrlRef = useRef(null);

  useEffect(() => {
    document.title = 'GIF Maker — Create Animated GIFs from Images Online Free | FixMyFile';
    return () => {
      cleanupOutputUrl();
      // Revoke all thumb URLs on unmount
      setFrames((prev) => {
        prev.forEach((f) => {
          if (f.thumbUrl) URL.revokeObjectURL(f.thumbUrl);
        });
        return [];
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanupOutputUrl = () => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
  };

  // ── File handling ───────────────────────────────────────────────────────────

  const processFileList = useCallback(async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const accepted = [];
    const rejected = [];

    for (const file of incoming) {
      const result = await validateImageFile(file);
      if (result.valid) {
        const thumbUrl = URL.createObjectURL(file);
        accepted.push({ id: makeId(), file, thumbUrl });
      } else {
        rejected.push(result.reason);
      }
    }

    if (accepted.length > 0) {
      setFrames((prev) => {
        const combined = [...prev, ...accepted];
        if (combined.length > MAX_FRAME_COUNT) {
          // Revoke URLs for frames that would be dropped
          combined.slice(MAX_FRAME_COUNT).forEach((f) => URL.revokeObjectURL(f.thumbUrl));
          return combined.slice(0, MAX_FRAME_COUNT);
        }
        return combined;
      });
      setErrorMessage(null);
    }

    if (rejected.length > 0) {
      setErrorMessage(
        rejected.length === 1
          ? rejected[0]
          : `${rejected.length} files were rejected:\n• ${rejected.join('\n• ')}`
      );
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e) => {
      if (e.target.files?.length) {
        processFileList(e.target.files);
        e.target.value = ''; // reset so same files can be re-added
      }
    },
    [processFileList]
  );

  // ── Drag & drop ─────────────────────────────────────────────────────────────

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
    if (e.dataTransfer.files?.length) {
      processFileList(e.dataTransfer.files);
    }
  };

  // ── Frame management ────────────────────────────────────────────────────────

  const removeFrame = useCallback((id) => {
    setFrames((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.thumbUrl) URL.revokeObjectURL(target.thumbUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const moveFrame = useCallback((id, direction) => {
    setFrames((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const next = [...prev];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    cleanupOutputUrl();
    setFrames((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.thumbUrl));
      return [];
    });
    setGifResult(null);
    setErrorMessage(null);
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── GIF generation ──────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (frames.length < 2 || isProcessing) return;

    const totalSize = frames.reduce((sum, f) => sum + f.file.size, 0);
    if (totalSize > MAX_TOTAL_INPUT_SIZE) {
      setErrorMessage(
        `Total input size (${formatBytes(totalSize)}) exceeds the 200 MB limit. Please reduce frame count or use smaller images.`
      );
      return;
    }

    cleanupOutputUrl();
    setGifResult(null);
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Initializing GIF engine...');

    try {
      const result = await generateGifFromFrames(frames, {
        fps: Number(fps),
        resolution,
        onStatus: (msg) => setStatusMessage(msg)
      });

      const downloadUrl = URL.createObjectURL(result.blob);
      outputUrlRef.current = downloadUrl;

      setGifResult({
        blob: result.blob,
        url: downloadUrl,
        filename: result.filename,
        size: result.size,
        frameCount: result.frameCount,
        dimensions: result.dimensions
      });
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during GIF generation.');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ── Derived state ───────────────────────────────────────────────────────────

  const totalInputSize = frames.reduce((sum, f) => sum + f.file.size, 0);
  const canGenerate = frames.length >= 2 && !isProcessing;
  const outputFilename = getGifOutputFilename(frames);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="tool-page-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="gif-maker"
        title="GIF Maker"
        description="Upload multiple images, arrange their order, and generate a genuine animated GIF — entirely in your browser. No uploads. No servers. No tricks."
      />

      {/* Main Workspace */}
      <div className="tool-workspace">

        {/* Error banner */}
        {errorMessage && (
          <div className="alert-error" role="alert" id="gif-maker-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ whiteSpace: 'pre-line' }}>{errorMessage}</span>
          </div>
        )}

        {/* ── Result state ──────────────────────────────────────────────── */}
        {gifResult && (
          <div className="result-card" id="gif-maker-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Animated GIF Created!</h2>
            <p className="result-subtitle">Your animated GIF is ready to preview and download.</p>

            {/* Live GIF preview */}
            <div className="gif-result-preview-wrap">
              <img
                id="gif-maker-preview"
                src={gifResult.url}
                alt="Generated Animated GIF Preview"
                className="gif-result-preview"
              />
            </div>

            <div className="stats-comparison">
              <div className="stat-box">
                <span className="stat-label">Frames:</span>
                <span className="stat-val">{gifResult.frameCount} frames</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Dimensions:</span>
                <span className="stat-val">{gifResult.dimensions?.width} × {gifResult.dimensions?.height}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">File Size:</span>
                <span className="stat-val highlight">{formatBytes(gifResult.size)}</span>
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
                <span>Download {gifResult.filename}</span>
              </a>
              <button
                type="button"
                id="btn-make-another"
                className="btn-reset"
                onClick={handleReset}
              >
                Make Another GIF
              </button>
            </div>
          </div>
        )}

        {/* ── Upload + Frame management (visible when no result) ─────────── */}
        {!gifResult && (
          <>
            {/* Drop zone */}
            <div
              id="gif-maker-dropzone"
              className={`dropzone-card ${isDragOver ? 'drag-over' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Drop images here or click to select"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            >
              <input
                ref={fileInputRef}
                id="gif-frame-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                multiple
                aria-label="Select image files to create an animated GIF"
                style={{ display: 'none' }}
                onChange={handleFileInputChange}
                disabled={isProcessing}
              />
              <div className="dropzone-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h2 className="dropzone-title">
                {frames.length === 0 ? 'Drop images here to start' : 'Drop more images to add frames'}
              </h2>
              <p className="dropzone-desc">
                Supported: JPG, PNG, WebP — up to {MAX_FRAME_COUNT} frames, {formatBytes(MAX_SINGLE_IMAGE_SIZE)} each
              </p>
              <button
                type="button"
                className="btn-select-file"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                disabled={isProcessing}
              >
                {frames.length === 0 ? 'Choose Images' : 'Add More Images'}
              </button>
              <p className="dropzone-guarantee">
                Your images are processed locally in your browser — they are never uploaded.
              </p>
            </div>

            {/* ── Frame strip ─────────────────────────────────────────────── */}
            {frames.length > 0 && (
              <div className="file-active-card" id="gif-frame-list">
                <div className="file-info-header">
                  <div className="file-meta-content">
                    <span className="file-name">
                      {frames.length} frame{frames.length !== 1 ? 's' : ''} selected
                    </span>
                    <div className="file-submeta">
                      <span>Total: {formatBytes(totalInputSize)}</span>
                      <span className="meta-dot">•</span>
                      <span>Output: {outputFilename}</span>
                      <span className="meta-dot">•</span>
                      <span className="badge-local">Local Files</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove-file"
                    aria-label="Clear all frames"
                    onClick={handleReset}
                    disabled={isProcessing}
                    title="Clear all frames"
                  >
                    ✕
                  </button>
                </div>

                {/* Frame thumbnail grid */}
                <div
                  id="gif-frame-grid"
                  className="gif-frame-grid"
                >
                  {frames.map((frame, idx) => (
                    <div
                      key={frame.id}
                      className="gif-frame-card"
                    >
                      {/* Frame number badge */}
                      <div className="gif-frame-badge" aria-label={`Frame ${idx + 1}`}>
                        {idx + 1}
                      </div>

                      {/* Thumbnail */}
                      <img
                        src={frame.thumbUrl}
                        alt={`Frame ${idx + 1}: ${frame.file.name}`}
                        className="gif-frame-thumb"
                      />

                      {/* Filename */}
                      <div className="gif-frame-filename" title={frame.file.name}>
                        {frame.file.name}
                      </div>

                      {/* Reorder / Remove controls */}
                      <div className="gif-frame-controls">
                        <button
                          type="button"
                          aria-label={`Move frame ${idx + 1} left`}
                          disabled={idx === 0 || isProcessing}
                          onClick={() => moveFrame(frame.id, -1)}
                          className="gif-frame-btn"
                          title="Move left"
                        >
                          ‹
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove frame ${idx + 1}`}
                          disabled={isProcessing}
                          onClick={() => removeFrame(frame.id)}
                          className="gif-frame-btn gif-frame-btn--remove"
                          title="Remove frame"
                        >
                          ✕
                        </button>
                        <button
                          type="button"
                          aria-label={`Move frame ${idx + 1} right`}
                          disabled={idx === frames.length - 1 || isProcessing}
                          onClick={() => moveFrame(frame.id, 1)}
                          className="gif-frame-btn"
                          title="Move right"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notice when < 2 frames */}
                {frames.length === 1 && (
                  <p className="gif-frame-warning">
                    Add at least one more image to create an animated GIF.
                  </p>
                )}

                {/* ── Settings ─────────────────────────────────────────── */}
                <div className="options-section" style={{ marginTop: '20px' }}>
                  <label htmlFor="gif-fps-select" className="option-label">
                    Animation Framerate (FPS):
                  </label>
                  <select
                    id="gif-fps-select"
                    className="control-select"
                    value={fps}
                    disabled={isProcessing}
                    onChange={(e) => setFps(Number(e.target.value))}
                  >
                    {GIF_FPS_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <p className="option-help-text">
                    Higher FPS = smoother animation, larger file size.
                    Frame delay: {Math.round(100 / fps) / 100}s per frame.
                  </p>
                </div>

                <div className="options-section" style={{ marginTop: '14px' }}>
                  <label htmlFor="gif-resolution-select" className="option-label">
                    Max Output Resolution:
                  </label>
                  <select
                    id="gif-resolution-select"
                    className="control-select"
                    value={resolution}
                    disabled={isProcessing}
                    onChange={(e) => setResolution(e.target.value)}
                  >
                    {GIF_RESOLUTION_PRESETS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <p className="option-help-text">
                    Images smaller than the selected height are never upscaled.
                    Mixed-aspect frames are letterboxed onto a shared canvas.
                  </p>
                </div>

                {/* ── Action buttons ────────────────────────────────────── */}
                <div className="action-buttons-wrap" style={{ marginTop: '20px' }}>
                  <button
                    type="button"
                    id="btn-generate-gif"
                    className="btn-primary-action"
                    disabled={!canGenerate}
                    onClick={handleGenerate}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner-inline" />
                        <span>{statusMessage || 'Creating GIF...'}</span>
                      </>
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                        <span>Create Animated GIF ({frames.length} frames)</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-action"
                    disabled={isProcessing}
                    onClick={handleReset}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="gif-maker" />
    </div>
  );
}
