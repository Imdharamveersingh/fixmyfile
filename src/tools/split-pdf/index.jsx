import React, { useState, useRef, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { getToolByPath } from '../toolsRegistry';
import {
  parsePageRanges,
  getPdfMetadata,
  splitPdfByRanges,
  extractToSinglePdf,
  burstPdf
} from './splitEngine';
import { formatBytes } from '../../utils/helpers';

export default function SplitPdfTool() {
  const toolMeta = getToolByPath('/split-pdf');
  const [file, setFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeInput, setRangeInput] = useState('');
  const [splitMode, setSplitMode] = useState('ranges'); // 'ranges', 'single', 'burst'
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [outputFiles, setOutputFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const fileInputId = useId();
  const rangeInputId = useId();

  // Cleanup object URLs on unmount or reset
  useEffect(() => {
    return () => {
      outputFiles.forEach((item) => {
        if (item.url) URL.revokeObjectURL(item.url);
      });
    };
  }, [outputFiles]);

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileSelect = async (selectedFile) => {
    setErrorMessage(null);
    if (!selectedFile) return;

    const isPdf =
      selectedFile.type === 'application/pdf' ||
      selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Please select a valid PDF (.pdf) file.');
      return;
    }

    if (selectedFile.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes). Please upload a valid document.');
      return;
    }

    // Reset previous outputs
    outputFiles.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setOutputFiles([]);
    setFile(selectedFile);
    setStatusMessage('Reading PDF structure...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const meta = await getPdfMetadata(buffer);
      setFileBuffer(buffer);
      setPageCount(meta.pageCount);
      // Pre-fill sensible range default
      if (meta.pageCount === 1) {
        setRangeInput('1');
      } else if (meta.pageCount <= 3) {
        setRangeInput(`1-${meta.pageCount}`);
      } else {
        setRangeInput(`1-${Math.min(3, meta.pageCount)}, ${meta.pageCount}`);
      }
      setStatusMessage('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to read PDF file.');
      setFile(null);
      setFileBuffer(null);
      setPageCount(0);
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

  const resetAll = () => {
    outputFiles.forEach((item) => {
      if (item.url) URL.revokeObjectURL(item.url);
    });
    setFile(null);
    setFileBuffer(null);
    setPageCount(0);
    setRangeInput('');
    setSplitMode('ranges');
    setOutputFiles([]);
    setErrorMessage(null);
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeSplit = async () => {
    if (!fileBuffer || pageCount === 0) {
      setErrorMessage('Please upload a PDF document first.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgress(15);
    setStatusMessage('Preparing pages...');

    try {
      const baseName = file ? file.name.replace(/\.pdf$/i, '') : 'document';
      let results = [];

      if (splitMode === 'burst') {
        setStatusMessage('Splitting all pages into individual documents...');
        setProgress(40);
        const burstResults = await burstPdf(fileBuffer, baseName);
        setProgress(85);
        results = burstResults.map((item) => ({
          filename: item.filename,
          pageCount: item.pageCount,
          size: item.bytes.byteLength,
          url: URL.createObjectURL(item.blob)
        }));
      } else if (splitMode === 'single') {
        const ranges = parsePageRanges(rangeInput, pageCount);
        // Flatten unique sorted pages
        const pagesSet = new Set();
        ranges.forEach((r) => r.pages.forEach((p) => pagesSet.add(p)));
        const sortedPages = Array.from(pagesSet).sort((a, b) => a - b);

        setStatusMessage(`Extracting ${sortedPages.length} selected pages...`);
        setProgress(50);
        const extracted = await extractToSinglePdf(fileBuffer, sortedPages, baseName);
        setProgress(90);
        results = [
          {
            filename: extracted.filename,
            pageCount: extracted.pageCount,
            size: extracted.bytes.byteLength,
            url: URL.createObjectURL(extracted.blob)
          }
        ];
      } else {
        // 'ranges'
        const ranges = parsePageRanges(rangeInput, pageCount);
        setStatusMessage(`Generating ${ranges.length} split document(s)...`);
        setProgress(40);
        const splitResults = await splitPdfByRanges(fileBuffer, ranges, baseName);
        setProgress(85);
        results = splitResults.map((item) => ({
          filename: item.filename,
          pageCount: item.pageCount,
          size: item.bytes.byteLength,
          url: URL.createObjectURL(item.blob),
          label: item.label
        }));
      }

      setOutputFiles(results);
      setProgress(100);
      setStatusMessage('Split completed successfully!');
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred while splitting the PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = (fileUrl, filename) => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = () => {
    outputFiles.forEach((f, idx) => {
      setTimeout(() => {
        handleDownload(f.url, f.filename);
      }, idx * 250);
    });
  };

  return (
    <div className="tool-view-container tool-page-container">
      {/* Breadcrumb / Top Bar */}
      <nav className="breadcrumb-nav tool-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/#tools-phase4" className="breadcrumb-link">PDF Tools</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Split PDF</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header tool-header-area">
        <div className="tool-title-row">
          <h1 className="tool-h1 tool-main-title">Split PDF</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro tool-main-desc">
          Extract specific pages or split your PDF into multiple separate documents in seconds.
          100% private, processed entirely in your browser.
        </p>
      </header>

      {/* Main Workbench Card */}
      <div className="converter-card workbench-card">
        {/* Upload / Dropzone */}
        {!file ? (
          <div
            className={`dropzone dropzone-container ${isDragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFilePicker();
              }
            }}
            aria-label="Upload PDF to split"
          >
            <input
              id={fileInputId}
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="dropzone-icon" aria-hidden="true">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h3 className="dropzone-title">Upload your PDF file</h3>
            <p className="dropzone-subtext dropzone-subtitle">Drag & drop your document here, or click to browse</p>
            <button
              type="button"
              className="btn btn-primary dropzone-cta workbench-btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              Choose PDF File
            </button>
            <div className="dropzone-badge-list dropzone-badge-row">
              <span className="dropzone-badge">.PDF</span>
              <span className="dropzone-badge">Fast</span>
              <span className="dropzone-badge">100% Private</span>
              <span className="dropzone-badge">Browser-based</span>
            </div>
          </div>
        ) : (
          /* File Loaded Controls */
          <div className="split-controls-area">
            {/* Source Document Card */}
            <div className="split-file-meta-card">
              <div className="file-info-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="file-info-details">
                <div className="file-info-name" title={file.name}>{file.name}</div>
                <div className="file-info-badges">
                  <span className="split-badge">{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                  <span className="split-badge">{formatBytes(file.size)}</span>
                </div>
              </div>
              <button
                type="button"
                className="split-remove-btn"
                onClick={resetAll}
                title="Remove file and choose another"
                aria-label="Remove file"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Split Mode Selector */}
            <div className="split-mode-selector">
              <label className="split-mode-label">Choose Split Mode:</label>
              <div className="split-mode-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={splitMode === 'ranges'}
                  className={`split-tab-btn ${splitMode === 'ranges' ? 'active' : ''}`}
                  onClick={() => setSplitMode('ranges')}
                >
                  Split by Ranges
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={splitMode === 'single'}
                  className={`split-tab-btn ${splitMode === 'single' ? 'active' : ''}`}
                  onClick={() => setSplitMode('single')}
                >
                  Extract into Single PDF
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={splitMode === 'burst'}
                  className={`split-tab-btn ${splitMode === 'burst' ? 'active' : ''}`}
                  onClick={() => setSplitMode('burst')}
                >
                  Extract All Pages (Burst)
                </button>
              </div>
            </div>

            {/* Range Input configuration */}
            {splitMode !== 'burst' && (
              <div className="split-range-config">
                <label htmlFor={rangeInputId} className="split-input-label">
                  {splitMode === 'ranges'
                    ? 'Page Ranges (creates separate PDFs for each range):'
                    : 'Selected Pages (combined into one document):'}
                </label>
                <input
                  id={rangeInputId}
                  type="text"
                  className="split-range-input"
                  value={rangeInput}
                  onChange={(e) => setRangeInput(e.target.value)}
                  placeholder={`e.g. 1-${Math.min(pageCount, 3)}, ${pageCount}`}
                  disabled={isProcessing}
                />
                <p className="split-helper-text">
                  Total pages: <strong>{pageCount}</strong>. Example format: <code>1-3, 5, 8-10</code>
                </p>

                {/* Quick Selection Buttons */}
                {pageCount > 1 && (
                  <div className="split-quick-buttons">
                    <span className="quick-label">Quick select:</span>
                    <button
                      type="button"
                      className="split-quick-btn"
                      onClick={() => setRangeInput(`1-${pageCount}`)}
                    >
                      All ({1}-{pageCount})
                    </button>
                    {pageCount >= 2 && (
                      <button
                        type="button"
                        className="split-quick-btn"
                        onClick={() => {
                          const half = Math.ceil(pageCount / 2);
                          setRangeInput(`1-${half}, ${half + 1}-${pageCount}`);
                        }}
                      >
                        Split in Half
                      </button>
                    )}
                    <button
                      type="button"
                      className="split-quick-btn"
                      onClick={() => {
                        const odds = [];
                        for (let i = 1; i <= pageCount; i += 2) odds.push(i);
                        setRangeInput(odds.join(', '));
                      }}
                    >
                      Odd Pages
                    </button>
                    <button
                      type="button"
                      className="split-quick-btn"
                      onClick={() => {
                        const evens = [];
                        for (let i = 2; i <= pageCount; i += 2) evens.push(i);
                        setRangeInput(evens.join(', '));
                      }}
                    >
                      Even Pages
                    </button>
                  </div>
                )}
              </div>
            )}

            {splitMode === 'burst' && (
              <div className="split-burst-notice">
                <p>
                  Every page in this document ({pageCount} {pageCount === 1 ? 'page' : 'pages'}) will be extracted into its own individual PDF file.
                </p>
              </div>
            )}

            {/* Error banner */}
            {errorMessage && (
              <div className="split-error-banner" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Bar */}
            <div className="split-action-bar">
              <button
                type="button"
                id="split-pdf-btn"
                className="workbench-btn-primary split-main-btn"
                onClick={executeSplit}
                disabled={isProcessing || !fileBuffer}
              >
                {isProcessing ? 'Processing Split...' : 'Split PDF Now'}
              </button>
              <button
                type="button"
                className="workbench-btn-secondary"
                onClick={resetAll}
                disabled={isProcessing}
              >
                Reset
              </button>
            </div>

            {/* Progress / Status */}
            {isProcessing && (
              <div className="split-progress-container">
                <div className="split-progress-bar" style={{ width: `${progress}%` }} />
                <span className="split-progress-text">{statusMessage || `${progress}%`}</span>
              </div>
            )}

            {/* Results Output Area */}
            {outputFiles.length > 0 && (
              <div className="split-results-container" id="split-results">
                <div className="split-results-header">
                  <h3>Generated PDF Files ({outputFiles.length})</h3>
                  {outputFiles.length > 1 && (
                    <button
                      type="button"
                      className="split-download-all-btn"
                      onClick={handleDownloadAll}
                      id="download-all-split-btn"
                    >
                      Download All Files
                    </button>
                  )}
                </div>

                <div className="split-results-list">
                  {outputFiles.map((out, idx) => (
                    <div key={idx} className="split-result-item">
                      <div className="split-result-info">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <div>
                          <div className="split-result-filename">{out.filename}</div>
                          <div className="split-result-meta">
                            {out.pageCount} {out.pageCount === 1 ? 'page' : 'pages'} • {formatBytes(out.size)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="workbench-btn-primary split-download-item-btn"
                        onClick={() => handleDownload(out.url, out.filename)}
                        aria-label={`Download ${out.filename}`}
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Privacy Note */}
      <div className="tool-privacy-note">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span>
          <strong>Privacy Guaranteed:</strong> Your documents never leave your computer.
          Splitting is executed entirely client-side in your web browser.
        </span>
      </div>

      {/* How it works & FAQ */}
      <div className="tool-guide-section">
        <div className="tool-guide-card">
          <h2 className="tool-guide-heading">How to Split a PDF</h2>
          <ol className="tool-guide-steps">
            <li><strong>Upload your PDF:</strong> Drag & drop your PDF file or click "Choose PDF File".</li>
            <li><strong>Select split mode:</strong> Choose "Split by Ranges", "Extract into Single PDF", or "Burst".</li>
            <li><strong>Enter page numbers:</strong> Specify custom page ranges like <code>1-3, 5</code>.</li>
            <li><strong>Download your files:</strong> Click "Split PDF Now" and download your newly created documents.</li>
          </ol>
        </div>

        <div className="tool-guide-card">
          <h2 className="tool-guide-heading">Frequently Asked Questions</h2>
          <div className="faq-item">
            <h4>Can I extract pages from a password-protected PDF?</h4>
            <p>You must first unlock or remove the password before splitting the document.</p>
          </div>
          <div className="faq-item">
            <h4>Is there a file size limit?</h4>
            <p>Because processing occurs in your browser, documents up to several hundred megabytes work smoothly depending on your device memory.</p>
          </div>
          <div className="faq-item">
            <h4>Does splitting alter my original document?</h4>
            <p>No, your original PDF remains completely untouched on your device.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
