import { useState, useRef, useEffect } from 'react';
import ToolDetailContent from '../../components/ToolDetailContent';
import { Link } from 'react-router-dom';
import { processPdfOcr, validatePdfInput } from '../../services/ocr/ocrPdfLayer';
import { terminateOcrWorker } from '../../services/ocr/ocrEngine';
import { formatBytes, MAX_PDF_FILE_SIZE } from '../../services/ocr/ocrUtils';

export default function PdfOcrTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  // Result state
  const [ocrResult, setOcrResult] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = 'PDF OCR Online Free — Make Scanned PDFs Searchable | FixMyFile';
  }, []);

  // Clean up object URLs on unmount or reset
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
      terminateOcrWorker();
    };
  }, [downloadUrl]);

  const handleFileSelect = async (file) => {
    if (!file) return;

    setErrorMessage(null);
    setOcrResult(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    try {
      if (file.size > MAX_PDF_FILE_SIZE) {
        throw new Error(`File exceeds maximum size of ${formatBytes(MAX_PDF_FILE_SIZE)}.`);
      }

      const buffer = await file.arrayBuffer();
      await validatePdfInput(buffer);

      setSelectedFile(file);
      setPdfMeta({
        name: file.name,
        size: file.size
      });
    } catch (err) {
      setErrorMessage(err.message || 'The selected file is not a valid PDF document.');
      setSelectedFile(null);
      setPdfMeta(null);
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

  const handleProcessOcr = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressStatus('Initializing OCR engine...');
    setProgressPercent(5);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const result = await processPdfOcr(buffer, {
        onProgress: (p) => {
          setProgressStatus(p.status);
          setProgressPercent(p.percent);
        }
      });

      const url = URL.createObjectURL(result.searchableBlob);
      setDownloadUrl(url);
      setOcrResult({
        ...result,
        size: result.searchableBlob.size,
        filename: selectedFile.name.replace(/\.[^/.]+$/, '') + '-searchable.pdf'
      });
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during PDF OCR processing.');
    } finally {
      setIsProcessing(false);
      setProgressStatus('');
      setProgressPercent(0);
    }
  };

  const handleReset = () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }
    setSelectedFile(null);
    setPdfMeta(null);
    setOcrResult(null);
    setErrorMessage(null);
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
        <span className="breadcrumb-current">PDF OCR</span>
      </nav>

      {/* Header */}
      <header className="tool-header">
        <div className="tool-badge-wrap">
          <span className="tool-privacy-badge">🔒 100% Client-Side • Private</span>
        </div>
        <h1 className="tool-title">PDF OCR (Make PDF Searchable)</h1>
        <p className="tool-subtitle">
          Add a searchable, selectable text layer to scanned or flat PDF documents directly in your browser.
          Preserve original formatting with zero cloud uploads.
        </p>
      </header>

      {/* Main Workspace */}
      <div className="tool-workspace">
        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-error" role="alert" id="pdf-ocr-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dropzone (when no file selected and no result) */}
        {!selectedFile && !ocrResult && (
          <div
            id="pdf-ocr-dropzone"
            className={`dropzone-card ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop PDF file here or click to select"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              id="pdf-ocr-input"
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <h2 className="dropzone-title">Drop your scanned PDF here</h2>
            <p className="dropzone-desc">
              or browse from your device. Supported format: .pdf (up to {formatBytes(MAX_PDF_FILE_SIZE)})
            </p>
            <button
              type="button"
              className="btn-select-file"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose PDF File
            </button>
            <p className="dropzone-guarantee">
              Your documents are processed 100% locally in your browser. They are never uploaded to any server.
            </p>
          </div>
        )}

        {/* Active File Card (before processing) */}
        {selectedFile && !ocrResult && (
          <div className="file-active-card" id="pdf-ocr-active-card">
            <div className="file-info-header">
              <div className="file-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div className="file-meta-content">
                <span className="file-name">{pdfMeta?.name || selectedFile.name}</span>
                <div className="file-submeta">
                  <span>{formatBytes(pdfMeta?.size || selectedFile.size)}</span>
                  <span className="meta-dot">•</span>
                  <span className="badge-local">Ready for OCR</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-remove-file"
                aria-label="Remove PDF"
                title="Remove PDF"
                disabled={isProcessing}
                onClick={handleReset}
              >
                ✕
              </button>
            </div>

            {/* Action buttons */}
            <div className="action-buttons-wrap" style={{ marginTop: '20px' }}>
              <button
                type="button"
                id="btn-process-pdf-ocr"
                className="btn-primary-action"
                disabled={isProcessing}
                onClick={handleProcessOcr}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner-inline" />
                    <span>{progressStatus || 'Running OCR...'} {progressPercent > 0 ? `(${progressPercent}%)` : ''}</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    <span>Make PDF Searchable (Run OCR)</span>
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

        {/* Result Card (Searchable PDF ready) */}
        {ocrResult && (
          <div className="result-card" id="pdf-ocr-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Searchable PDF Ready!</h2>
            <p className="result-subtitle">
              Your PDF now contains an invisible text layer. You can select text and search using Ctrl+F.
            </p>

            {/* Stats Comparison */}
            <div className="stats-comparison">
              <div className="stat-box">
                <span className="stat-label">Total Pages:</span>
                <span className="stat-val">{ocrResult.totalPages}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Recognized Words:</span>
                <span className="stat-val highlight">{ocrResult.totalWords}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Output Size:</span>
                <span className="stat-val">{formatBytes(ocrResult.size)}</span>
              </div>
            </div>

            {/* Result Action Buttons */}
            <div className="result-actions">
              <a
                id="btn-download-searchable-pdf"
                href={downloadUrl}
                download={ocrResult.filename}
                className="btn-download"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>Download Searchable PDF</span>
              </a>

              <button
                type="button"
                id="btn-ocr-another-pdf"
                className="btn-reset"
                onClick={handleReset}
              >
                OCR Another PDF
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="pdf-ocr" />
    </div>
  );
}
