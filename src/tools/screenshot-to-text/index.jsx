import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { runOcr, terminateOcrWorker } from '../../services/ocr/ocrEngine';
import {
  validateImageFile,
  calculateTextStats,
  formatBytes,
  downloadTextAsFile,
  MAX_IMAGE_FILE_SIZE
} from '../../services/ocr/ocrUtils';

export default function ScreenshotToTextTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageMeta, setImageMeta] = useState(null);

  // Settings
  const [enhanceContrast, setEnhanceContrast] = useState(true);
  const [grayscale, setGrayscale] = useState(true);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [clipboardNotice, setClipboardNotice] = useState(null);

  // Result state
  const [extractedText, setExtractedText] = useState(null);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = 'Screenshot to Text (OCR) Online Free — Paste or Upload Screenshots | FixMyFile';
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      terminateOcrWorker();
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(async (file) => {
    if (!file) return;

    setErrorMessage(null);
    setClipboardNotice(null);
    setExtractedText(null);
    setOcrConfidence(null);
    setCopied(false);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    try {
      await validateImageFile(file);

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setSelectedFile(file);

      const img = new Image();
      img.onload = () => {
        setImageMeta({
          name: file.name || 'Pasted_Screenshot.png',
          size: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = () => {
        setImageMeta({
          name: file.name || 'Pasted_Screenshot.png',
          size: file.size,
          width: null,
          height: null
        });
      };
      img.src = objectUrl;
    } catch (err) {
      setErrorMessage(err.message || 'Failed to read screenshot.');
      setSelectedFile(null);
      setImageMeta(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    }
  }, [previewUrl]);

  // Global paste handler (Ctrl+V anywhere on page)
  useEffect(() => {
    const handlePaste = (e) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            const filename = `screenshot-${Date.now()}.${blob.type.includes('png') ? 'png' : 'jpg'}`;
            const file = new File([blob], filename, { type: blob.type });
            handleFileSelect(file);
            setClipboardNotice('Screenshot pasted from clipboard successfully!');
            setTimeout(() => setClipboardNotice(null), 3000);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isProcessing, handleFileSelect]);

  // Explicit Clipboard Paste Button
  const handlePasteFromClipboard = async () => {
    setErrorMessage(null);
    setClipboardNotice(null);

    if (!navigator.clipboard || !navigator.clipboard.read) {
      setClipboardNotice("Direct clipboard button isn't supported in this browser. Press Ctrl+V (or Cmd+V) to paste, or upload an image.");
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const ext = imageType.includes('png') ? 'png' : 'jpg';
          const file = new File([blob], `screenshot-${Date.now()}.${ext}`, { type: imageType });
          await handleFileSelect(file);
          setClipboardNotice('Screenshot loaded from clipboard!');
          setTimeout(() => setClipboardNotice(null), 3000);
          return;
        }
      }
      setClipboardNotice('No image found in clipboard. Please copy a screenshot first or press Ctrl+V.');
    } catch {
      setClipboardNotice("Could not access clipboard directly. Please press Ctrl+V to paste your screenshot, or use Choose File.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
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

  const handleExtractText = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressStatus('Initializing OCR engine...');
    setProgressPercent(5);

    try {
      const result = await runOcr(selectedFile, {
        preprocess: enhanceContrast || grayscale,
        preprocessOptions: {
          enhanceContrast,
          grayscale
        },
        onProgress: (m) => {
          if (m.status === 'recognizing text') {
            setProgressStatus('Recognizing text...');
            setProgressPercent(Math.round((m.progress || 0) * 100));
          } else if (m.status === 'loading tesseract core') {
            setProgressStatus('Loading OCR engine...');
            setProgressPercent(20);
          } else if (m.status === 'loading language traineddata') {
            setProgressStatus('Loading English language model...');
            setProgressPercent(40);
          } else if (m.status === 'initializing api') {
            setProgressStatus('Preparing scanner...');
            setProgressPercent(50);
          }
        }
      });

      setExtractedText(result.text || '');
      setOcrConfidence(result.confidence);
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during text extraction.');
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
      setProgressPercent(0);
    }
  };

  const handleCopy = async () => {
    if (!extractedText) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = extractedText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadTxt = () => {
    if (!extractedText) return;
    const baseName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'screenshot_text';
    downloadTextAsFile(extractedText, `${baseName}-ocr.txt`);
  };

  const handleReset = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedFile(null);
    setImageMeta(null);
    setExtractedText(null);
    setOcrConfidence(null);
    setErrorMessage(null);
    setClipboardNotice(null);
    setCopied(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const textStats = calculateTextStats(extractedText || '');

  return (
    <div className="tool-page-container">
      {/* Breadcrumb Navigation */}
      <nav className="tool-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Screenshot to Text</span>
      </nav>

      {/* Header */}
      <header className="tool-header">
        <div className="tool-badge-wrap">
          <span className="tool-phase-badge">Phase 7 • OCR & Text Tools</span>
          <span className="tool-privacy-badge">🔒 100% Client-Side • Private</span>
        </div>
        <h1 className="tool-title">Screenshot to Text (OCR)</h1>
        <p className="tool-subtitle">
          Extract text instantly from screenshots and clipboard screen captures. Paste with Ctrl+V or upload your image. 100% private, zero cloud uploads.
        </p>
      </header>

      {/* Main Workspace */}
      <main className="tool-workspace">
        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-error" role="alert" id="screenshot-to-text-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Clipboard Info / Fallback Notice */}
        {clipboardNotice && (
          <div className="alert-info" role="status" id="screenshot-clipboard-notice" style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '10px',
            padding: '12px 16px',
            marginBottom: '16px',
            color: '#3b82f6',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>{clipboardNotice}</span>
          </div>
        )}

        {/* Dropzone with Paste Support */}
        {!selectedFile && !extractedText && (
          <div
            id="screenshot-to-text-dropzone"
            className={`dropzone-card ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop screenshot here, click to select, or press Ctrl+V to paste"
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          >
            <input
              ref={fileInputRef}
              id="screenshot-to-text-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h2 className="dropzone-title">Press Ctrl+V to paste or drop screenshot here</h2>
            <p className="dropzone-desc">
              Supports clipboard paste (Ctrl+V / Cmd+V), PNG, JPG, and WebP (up to {formatBytes(MAX_IMAGE_FILE_SIZE)})
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                id="btn-paste-clipboard"
                className="btn-primary-action"
                style={{ minWidth: '180px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePasteFromClipboard();
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
                <span>Paste from Clipboard</span>
              </button>

              <button
                type="button"
                className="btn-select-file"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose Image File
              </button>
            </div>

            <p className="dropzone-guarantee">
              Your screenshots are processed 100% locally in your browser. Clipboard contents are never uploaded anywhere.
            </p>
          </div>
        )}

        {/* Active File Card (before OCR execution) */}
        {selectedFile && !extractedText && (
          <div className="file-active-card" id="screenshot-to-text-active-card">
            <div className="file-info-header">
              <div className="file-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <div className="file-meta-content">
                <span className="file-name">{imageMeta?.name || selectedFile.name}</span>
                <div className="file-submeta">
                  <span>{formatBytes(imageMeta?.size || selectedFile.size)}</span>
                  {imageMeta?.width && imageMeta?.height && (
                    <>
                      <span className="meta-dot">•</span>
                      <span>{imageMeta.width} × {imageMeta.height} px</span>
                    </>
                  )}
                  <span className="meta-dot">•</span>
                  <span className="badge-local">Client-Side OCR</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                aria-label="Remove screenshot"
                title="Remove screenshot"
                disabled={isProcessing}
                onClick={handleReset}
              >
                ✕
              </button>
            </div>

            {/* Preview image */}
            {previewUrl && (
              <div className="ocr-preview-container">
                <img
                  id="screenshot-to-text-preview"
                  src={previewUrl}
                  alt="Screenshot preview for text recognition"
                  className="ocr-preview-img"
                />
              </div>
            )}

            {/* OCR Options */}
            <div className="ocr-options-grid">
              <label className="ocr-option-checkbox">
                <input
                  type="checkbox"
                  checked={enhanceContrast}
                  disabled={isProcessing}
                  onChange={(e) => setEnhanceContrast(e.target.checked)}
                />
                <span>Contrast enhancement (recommended for UI captures & dialogues)</span>
              </label>

              <label className="ocr-option-checkbox">
                <input
                  type="checkbox"
                  checked={grayscale}
                  disabled={isProcessing}
                  onChange={(e) => setGrayscale(e.target.checked)}
                />
                <span>Grayscale optimization</span>
              </label>
            </div>

            {/* Action buttons */}
            <div className="action-buttons-wrap" style={{ marginTop: '20px' }}>
              <button
                type="button"
                id="btn-extract-text"
                className="btn-primary-action"
                disabled={isProcessing}
                onClick={handleExtractText}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-inline" />
                    <span>{progressStatus || 'Extracting Text...'} {progressPercent > 0 ? `(${progressPercent}%)` : ''}</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Extract Text from Screenshot</span>
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

        {/* Result Card (Text Recognized) */}
        {extractedText !== null && (
          <div className="result-card" id="screenshot-to-text-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Text Extracted Successfully!</h2>
            <p className="result-subtitle">
              Your screenshot text has been recognized directly in your browser.
            </p>

            {/* Textarea for recognized text */}
            <div className="ocr-result-wrap">
              <label htmlFor="ocr-extracted-textarea" className="ocr-result-label">
                Recognized Text:
              </label>
              <textarea
                id="ocr-extracted-textarea"
                className="ocr-extracted-textarea"
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                placeholder="No text recognized in this screenshot."
                rows={10}
              />
            </div>

            {/* Stats Comparison */}
            <div className="stats-comparison">
              <div className="stat-box">
                <span className="stat-label">Characters:</span>
                <span className="stat-val">{textStats.charCount}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Words:</span>
                <span className="stat-val">{textStats.wordCount}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Lines:</span>
                <span className="stat-val">{textStats.lineCount}</span>
              </div>
              {ocrConfidence !== null && (
                <div className="stat-box">
                  <span className="stat-label">Confidence:</span>
                  <span className="stat-val highlight">{ocrConfidence}%</span>
                </div>
              )}
            </div>

            {/* Result Action Buttons */}
            <div className="result-actions">
              <button
                type="button"
                id="btn-copy-text"
                className="btn-download"
                onClick={handleCopy}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
              </button>

              <button
                type="button"
                id="btn-download-txt"
                className="btn-secondary-action"
                onClick={handleDownloadTxt}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                </svg>
                <span>Download as .TXT</span>
              </button>

              <button
                type="button"
                id="btn-extract-another"
                className="btn-reset"
                onClick={handleReset}
              >
                Extract Another Screenshot
              </button>
            </div>
          </div>
        )}
      </main>

      {/* SEO / Info Section */}
      <section className="tool-info-section">
        <div className="info-grid">
          <div className="info-card">
            <h3>🔒 Complete Client-Side Security</h3>
            <p>
              Your screenshots and clipboard data never leave your browser. Optical character recognition executes
              locally using WebAssembly and Web Workers.
            </p>
          </div>
          <div className="info-card">
            <h3>📋 Instant Paste Workflow</h3>
            <p>
              Take a screenshot with PrintScreen or Snipping Tool, press `Ctrl+V` on this page, and extract text immediately
              without saving image files to disk first.
            </p>
          </div>
          <div className="info-card">
            <h3>⚡ Neural Network Accuracy</h3>
            <p>
              Trained on diverse digital fonts, dialogue boxes, system notifications, error screens, and web browser views.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-item">
            <h4>Can I paste directly from my clipboard?</h4>
            <p>
              Yes. Simply press Ctrl+V (or Cmd+V on macOS) anywhere on this page, or click "Paste from Clipboard".
              Your clipboard image will be processed immediately.
            </p>
          </div>
          <div className="faq-item">
            <h4>What happens if my browser restricts clipboard access?</h4>
            <p>
              FixMyFile provides a graceful fallback: you can always use the "Choose Image File" button or drag and drop
              any saved screenshot file.
            </p>
          </div>
          <div className="faq-item">
            <h4>Are pasted screenshots uploaded to an AI server?</h4>
            <p>
              No. Zero bytes of your screenshots are ever uploaded. All OCR recognition runs inside your local browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
