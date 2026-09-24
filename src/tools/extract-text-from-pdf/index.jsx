import { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { extractTextFromPdf, createTxtBlob, validatePdfBuffer } from '../pdf-to-text/pdfToTextEngine';
import { formatBytes } from '../../utils/helpers';
import { MAX_PDF_FILE_SIZE } from '../../services/ocr/ocrUtils';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function ExtractTextFromPdfTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null);

  // View options
  const [includePageHeaders, setIncludePageHeaders] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' or page index

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({ current: 0, total: 0, percent: 0, message: '' });
  const [errorMessage, setErrorMessage] = useState(null);

  // Result state
  const [extractedResult, setExtractedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = 'Extract Text from PDF Online Free — PDF Text Extractor | FixMyFile';
  }, []);

  const handleFileSelect = async (file) => {
    if (!file) return;

    setErrorMessage(null);
    setExtractedResult(null);
    setCopied(false);

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes). Please choose a valid PDF file.');
      setSelectedFile(null);
      setFileBuffer(null);
      setPdfMeta(null);
      return;
    }

    if (file.size > MAX_PDF_FILE_SIZE) {
      setErrorMessage(`The selected file exceeds the maximum size limit of ${formatBytes(MAX_PDF_FILE_SIZE)}.`);
      setSelectedFile(null);
      setFileBuffer(null);
      setPdfMeta(null);
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      validatePdfBuffer(buffer);

      // Probe page count with a cloned copy so buffer is not detached
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        isEvalSupported: false,
        useSystemFonts: true,
        stopAtErrors: false
      });
      const pdfDoc = await loadingTask.promise;

      setSelectedFile(file);
      setFileBuffer(buffer);
      setPdfMeta({
        name: file.name,
        size: file.size,
        pageCount: pdfDoc.numPages
      });
    } catch (err) {
      setErrorMessage(err.message || 'Failed to open PDF document. Please verify the file is a valid, uncorrupted PDF.');
      setSelectedFile(null);
      setFileBuffer(null);
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

  const handleExtractText = async () => {
    if (!selectedFile || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setProgressState({ current: 0, total: 1, percent: 5, message: 'Analyzing PDF content...' });

    try {
      const freshBuffer = await selectedFile.arrayBuffer();
      const result = await extractTextFromPdf(freshBuffer, {
        pdfjsLib,
        baseFilename: selectedFile.name || 'document',
        onProgress: (p) => setProgressState(p)
      });

      setExtractedResult(result);
      setActiveTab('all');
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while extracting text from the PDF.');
    } finally {
      setIsProcessing(false);
      setProgressState({ current: 0, total: 0, percent: 0, message: '' });
    }
  };

  const getCurrentText = () => {
    if (!extractedResult) return '';
    if (activeTab === 'all') {
      if (includePageHeaders) {
        return extractedResult.fullText;
      }
      return extractedResult.pages
        .map((p) => p.text)
        .filter(Boolean)
        .join('\n\n\n');
    }
    const page = extractedResult.pages.find((p) => p.pageNum === activeTab);
    return page ? page.text : '';
  };

  const handleCopy = async () => {
    const textToCopy = getCurrentText();
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = textToCopy;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownloadTxt = () => {
    const textToDownload = getCurrentText();
    if (!textToDownload) return;

    const blob = createTxtBlob(textToDownload);
    const cleanName = selectedFile ? selectedFile.name.replace(/\.[^/.]+$/, '') : 'extracted_text';
    const suffix = activeTab === 'all' ? '' : `-page-${activeTab}`;
    downloadBlob(blob, `${cleanName}-extracted${suffix}.txt`);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setPdfMeta(null);
    setExtractedResult(null);
    setErrorMessage(null);
    setCopied(false);
    setActiveTab('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="tool-page-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="extract-text-from-pdf"
        title="Extract Text from PDF"
        description="Extract readable textual content from multi-page PDF documents directly in your browser. Fast, accurate, and completely private."
      />

      {/* Main Workspace */}
      <div className="tool-workspace">
        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-error" role="alert" id="extract-text-from-pdf-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dropzone (when no file selected and no result) */}
        {!selectedFile && !extractedResult && (
          <div
            id="extract-text-from-pdf-dropzone"
            className={`dropzone-card ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Drop PDF here or click to select"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <input
              ref={fileInputRef}
              id="extract-text-from-pdf-input"
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
              }}
            />
            <div className="dropzone-icon" aria-hidden="true">
            <ToolIcon icon="extract-text-from-pdf" size={48} />
          </div>
            <h2 className="dropzone-title">Drop your PDF document here</h2>
            <p className="dropzone-desc">
              or browse from your device. Supported: .pdf documents (up to {formatBytes(MAX_PDF_FILE_SIZE)})
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
              Your PDF documents are processed 100% locally in your browser. Zero bytes are uploaded to any server.
            </p>
          </div>
        )}

        {/* Active File Card (before extraction execution) */}
        {selectedFile && !extractedResult && (
          <div className="file-active-card" id="extract-text-from-pdf-active-card">
            <div className="file-info-header">
              <div className="file-icon-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="file-meta-content">
                <span className="file-name">{pdfMeta?.name || selectedFile.name}</span>
                <div className="file-submeta">
                  <span>{formatBytes(pdfMeta?.size || selectedFile.size)}</span>
                  {pdfMeta?.pageCount && (
                    <>
                      <span className="meta-dot">•</span>
                      <span>{pdfMeta.pageCount} {pdfMeta.pageCount === 1 ? 'page' : 'pages'}</span>
                    </>
                  )}
                  <span className="meta-dot">•</span>
                  <span className="badge-local">Client-Side Parser</span>
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

            {/* Extraction Options */}
            <div className="ocr-options-grid" style={{ marginTop: '16px' }}>
              <label className="ocr-option-checkbox">
                <input
                  type="checkbox"
                  checked={includePageHeaders}
                  disabled={isProcessing}
                  onChange={(e) => setIncludePageHeaders(e.target.checked)}
                />
                <span>Include page boundary markers (e.g. --- Page 1 ---)</span>
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
                    <span>{progressState.message || 'Extracting Text...'} {progressState.percent > 0 ? `(${progressState.percent}%)` : ''}</span>
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="21" y1="10" x2="3" y2="10" />
                      <line x1="21" y1="6" x2="3" y2="6" />
                      <line x1="21" y1="14" x2="3" y2="14" />
                      <line x1="21" y1="18" x2="3" y2="18" />
                    </svg>
                    <span>Extract Text from PDF</span>
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

        {/* Result Card (Text Extracted) */}
        {extractedResult !== null && (
          <div className="result-card" id="extract-text-from-pdf-result">
            <div className="success-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h2 className="result-title">Text Extracted Successfully!</h2>
            <p className="result-subtitle">
              Parsed {extractedResult.totalPages} {extractedResult.totalPages === 1 ? 'page' : 'pages'} locally without sending any data to external servers.
            </p>

            {/* Notice if PDF was image-only / scanned */}
            {!extractedResult.hasSelectableText && (
              <div className="alert-info" style={{
                background: 'rgba(234, 179, 8, 0.1)',
                border: '1px solid rgba(234, 179, 8, 0.3)',
                borderRadius: '10px',
                padding: '14px 18px',
                margin: '16px 0',
                color: '#ca8a04',
                fontSize: '14px',
                lineHeight: '1.5'
              }}>
                <strong>⚠️ No selectable text detected.</strong> This document may be a flat or scanned image PDF.
                To extract text from scanned documents using optical character recognition, try our{' '}
                <Link to="/pdf-ocr" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'underline' }}>
                  PDF OCR tool
                </Link>.
              </div>
            )}

            {/* Page selection tabs if multi-page */}
            {extractedResult.totalPages > 1 && (
              <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '8px',
                marginBottom: '12px',
                maxWidth: '100%'
              }}>
                <button
                  type="button"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: activeTab === 'all' ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                    background: activeTab === 'all' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                    color: activeTab === 'all' ? '#ffffff' : 'inherit'
                  }}
                  onClick={() => setActiveTab('all')}
                >
                  All Pages ({extractedResult.totalPages})
                </button>
                {extractedResult.pages.map((p) => (
                  <button
                    key={p.pageNum}
                    type="button"
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: activeTab === p.pageNum ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                      background: activeTab === p.pageNum ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                      color: activeTab === p.pageNum ? '#ffffff' : 'inherit',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => setActiveTab(p.pageNum)}
                  >
                    Page {p.pageNum}
                  </button>
                ))}
              </div>
            )}

            {/* Textarea for extracted text */}
            <div className="ocr-result-wrap">
              <label htmlFor="extracted-text-textarea" className="ocr-result-label">
                Extracted Content {activeTab !== 'all' ? `(Page ${activeTab})` : ''}:
              </label>
              <textarea
                id="extracted-text-textarea"
                className="ocr-extracted-textarea"
                value={getCurrentText()}
                readOnly
                placeholder="No text found in this PDF."
                rows={12}
              />
            </div>

            {/* Stats Comparison */}
            <div className="stats-comparison">
              <div className="stat-box">
                <span className="stat-label">Characters:</span>
                <span className="stat-val">{extractedResult.totalCharacters.toLocaleString()}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Words:</span>
                <span className="stat-val">{extractedResult.totalWords.toLocaleString()}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Pages:</span>
                <span className="stat-val">{extractedResult.totalPages}</span>
              </div>
              <div className="stat-box">
                <span className="stat-label">Format:</span>
                <span className="stat-val highlight">Plain UTF-8</span>
              </div>
            </div>

            {/* Result Action Buttons */}
            <div className="result-actions">
              <button
                type="button"
                id="btn-copy-text"
                className="btn-download"
                disabled={!extractedResult.hasSelectableText}
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
                disabled={!extractedResult.hasSelectableText}
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
                Extract Another PDF
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="extract-text-from-pdf" />
    </div>
  );
}
