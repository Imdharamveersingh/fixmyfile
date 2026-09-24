import { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import { runOcr, terminateOcrWorker } from '../../services/ocr/ocrEngine';
import {
  validateImageFile,
  calculateTextStats,
  formatBytes,
  downloadTextAsFile,
  MAX_IMAGE_FILE_SIZE
} from '../../services/ocr/ocrUtils';

export default function ImageToTextTool() {
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

  // Result state
  const [extractedText, setExtractedText] = useState(null);
  const [ocrConfidence, setOcrConfidence] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = 'Image to Text (OCR) Online Free — Extract Text from Images | FixMyFile';
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

  const handleFileSelect = async (file) => {
    if (!file) return;

    setErrorMessage(null);
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

      // Probe image dimensions
      const img = new Image();
      img.onload = () => {
        setImageMeta({
          name: file.name,
          size: file.size,
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      };
      img.onerror = () => {
        setImageMeta({
          name: file.name,
          size: file.size,
          width: null,
          height: null
        });
      };
      img.src = objectUrl;
    } catch (err) {
      setErrorMessage(err.message || 'Failed to read image file.');
      setSelectedFile(null);
      setImageMeta(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
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
      // Fallback
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
    const baseName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'extracted_text';
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
    setCopied(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const textStats = calculateTextStats(extractedText || '');

  return (
    <div className="tool-page-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="image-to-text"
        title="Image to Text (OCR)"
        description="Extract text from photos, scans, and documents directly in your browser. Fast, accurate, and zero cloud uploads."
      />

      {/* Main Workspace */}
      <div className="tool-workspace">
        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-error" role="alert" id="image-to-text-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dropzone (when no file selected and no result) */}
        {!selectedFile && !extractedText && (
          <div
            id="image-to-text-dropzone"
            className={`dropzone-card ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop image here or click to select"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              id="image-to-text-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon" aria-hidden="true">
            <ToolIcon icon="image-to-text" size={48} />
          </div>
            <h2 className="dropzone-title">Drop your image here</h2>
            <p className="dropzone-desc">
              or browse from your device. Supported formats: JPG, PNG, WebP (up to {formatBytes(MAX_IMAGE_FILE_SIZE)})
            </p>
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
            <p className="dropzone-guarantee">
              Your images are processed 100% locally in your browser. They are never sent to any server.
            </p>
          </div>
        )}

        {/* Active File Card (before OCR execution) */}
        {selectedFile && !extractedText && (
          <div className="file-active-card" id="image-to-text-active-card">
            <div className="file-info-header">
              <div className="file-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
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
                aria-label="Remove image"
                title="Remove image"
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
                  id="image-to-text-preview"
                  src={previewUrl}
                  alt="Source for OCR extraction"
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
                <span>Auto-enhance contrast (improves text recognition)</span>
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
                    <span>Extract Text from Image</span>
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
          <div className="result-card" id="image-to-text-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Text Extracted Successfully!</h2>
            <p className="result-subtitle">
              Your image has been recognized directly in your browser.
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
                placeholder="No text recognized in this image."
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download as .TXT</span>
              </button>

              <button
                type="button"
                id="btn-extract-another"
                className="btn-reset"
                onClick={handleReset}
              >
                Extract Another Image
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="image-to-text" />
    </div>
  );
}
