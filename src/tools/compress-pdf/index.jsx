import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../../utils/helpers';

export default function CompressPdfTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pageCount, setPageCount] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [compressedPdfUrl, setCompressedPdfUrl] = useState(null);
  const [compressedSize, setCompressedSize] = useState(null);
  const [originalSize, setOriginalSize] = useState(null);
  const [reductionPercent, setReductionPercent] = useState(0);
  const [isAlreadyOptimized, setIsAlreadyOptimized] = useState(false);
  const [compressedFilename, setCompressedFilename] = useState('document-compressed.pdf');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Clean up object URLs on unmount or reset
  useEffect(() => {
    return () => {
      if (compressedPdfUrl) {
        URL.revokeObjectURL(compressedPdfUrl);
      }
    };
  }, [compressedPdfUrl]);

  // Handle file selection
  const processFile = async (file) => {
    setErrorMessage(null);
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Unsupported file format. Please select a valid PDF (.pdf) document.');
      return;
    }

    // Reset previous compression results if any
    if (compressedPdfUrl) {
      URL.revokeObjectURL(compressedPdfUrl);
      setCompressedPdfUrl(null);
      setCompressedSize(null);
      setReductionPercent(0);
      setIsAlreadyOptimized(false);
    }

    setSelectedFile(file);
    setOriginalSize(file.size);
    setPageCount(null);

    // Formulate a sanitized output PDF filename
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'document';
    setCompressedFilename(`${cleanBaseName}-compressed.pdf`);

    // Inspect document with pdf-lib to obtain page count and validate readability
    try {
      const buffer = await file.arrayBuffer();
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      setPageCount(doc.getPageCount());
    } catch (err) {
      const errMsg = err?.message?.toLowerCase() || '';
      const isEncrypted = errMsg.includes('encrypted') || errMsg.includes('password');
      const failureReason = isEncrypted
        ? 'This PDF is password-protected or encrypted. Please unlock it before compressing.'
        : 'Could not read PDF document: the file may be corrupted or invalid.';
      setErrorMessage(failureReason);
      setSelectedFile(null);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const resetAll = () => {
    if (compressedPdfUrl) {
      URL.revokeObjectURL(compressedPdfUrl);
    }
    setSelectedFile(null);
    setPageCount(null);
    setCompressedPdfUrl(null);
    setCompressedSize(null);
    setOriginalSize(null);
    setReductionPercent(0);
    setIsAlreadyOptimized(false);
    setErrorMessage(null);
    setIsCompressing(false);
    setCompressProgress(0);
    setStatusMessage('');
  };

  // Perform client-side PDF optimization and compression
  const compressPdf = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a PDF document to compress.');
      return;
    }

    setIsCompressing(true);
    setCompressProgress(15);
    setErrorMessage(null);
    setStatusMessage('Reading PDF data in local memory...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      setCompressProgress(35);
      setStatusMessage('Parsing document structure and objects...');

      const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      const pagesCount = srcDoc.getPageCount();

      setCompressProgress(55);
      setStatusMessage(`Optimizing ${pagesCount} ${pagesCount === 1 ? 'page' : 'pages'} and stripping orphaned revisions...`);

      // Strategy: Copy reachable pages into a clean new document.
      // This drops orphaned metadata, abandoned revision history, deleted page artifacts, and unreferenced fonts.
      const compressedDoc = await PDFDocument.create();
      const copiedPages = await compressedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => compressedDoc.addPage(page));

      setCompressProgress(80);
      setStatusMessage('Encoding compressed binary object streams...');

      // Save with useObjectStreams: true to compress indirect objects and xref tables
      const optimizedBytes = await compressedDoc.save({ useObjectStreams: true });

      setCompressProgress(95);
      setStatusMessage('Analyzing file size reduction...');

      const initialSize = buffer.byteLength;
      const optSize = optimizedBytes.byteLength;

      let finalBlob;
      let finalSize;
      let reduction = 0;
      let alreadyOptimized = false;

      // If the optimized file is smaller, use it. Otherwise, preserve the original file bit-for-bit.
      if (optSize < initialSize) {
        finalBlob = new Blob([optimizedBytes], { type: 'application/pdf' });
        finalSize = optSize;
        reduction = ((initialSize - optSize) / initialSize) * 100;
        alreadyOptimized = reduction < 0.5;
      } else {
        finalBlob = new Blob([buffer], { type: 'application/pdf' });
        finalSize = initialSize;
        reduction = 0;
        alreadyOptimized = true;
      }

      const url = URL.createObjectURL(finalBlob);

      setCompressedPdfUrl(url);
      setCompressedSize(finalSize);
      setReductionPercent(reduction);
      setIsAlreadyOptimized(alreadyOptimized);
      setCompressProgress(100);
      setStatusMessage('Compression complete.');
    } catch (err) {
      console.error('Compression error:', err);
      setErrorMessage(`Failed to compress PDF: ${err.message || 'An unexpected error occurred during processing.'}`);
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="tool-view-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="compress-pdf"
        title="Compress PDF"
        description="Reduce PDF file size while preserving optimal text clarity, vector graphics, and visual quality. Fast, 100% private, and processed directly inside your browser without uploading to any server."
      />

      {/* Error Alert */}
      {errorMessage && (
        <div className="tool-alert tool-alert-error" role="alert">
          <span className="alert-icon">⚠️</span>
          <div className="alert-message">{errorMessage}</div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Interactive Tool Area */}
      <section className="converter-card" aria-label="Compress PDF tool interface">
        {!selectedFile ? (
          /* Upload Drop Zone */
          <div
            className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFilePicker();
              }
            }}
            aria-label="Upload a PDF file by clicking or dragging and dropping"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,application/pdf"
              className="hidden-file-input"
              aria-hidden="true"
            />
            <div className="dropzone-icon">🗜️</div>
            <h2 className="dropzone-title">Drop your PDF file here</h2>
            <p className="dropzone-subtext">or click to browse your computer or mobile device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.PDF</span>
              <span className="dropzone-badge">Lossless Structure</span>
              <span className="dropzone-badge">Client-Side Only</span>
              <span className="dropzone-badge">100% Private</span>
            </div>
            <button
              type="button"
              className="btn-primary dropzone-cta"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              Choose PDF File
            </button>
          </div>
        ) : (
          /* Selected File Workbench */
          <div className="files-workbench">
            {/* Workbench Header */}
            <div className="workbench-header">
              <div className="workbench-title-box">
                <h2 className="workbench-title">Document Selected</h2>
                <span className="workbench-hint">
                  Ready to optimize and compress PDF structure.
                </span>
              </div>
              <div className="workbench-actions">
                <button
                  type="button"
                  className="btn-text-danger btn-sm"
                  onClick={resetAll}
                  disabled={isCompressing}
                >
                  Clear File
                </button>
              </div>
            </div>

            {/* Selected File Card */}
            <div className="compress-file-preview">
              <div className="compress-file-left">
                <span className="compress-icon-badge" aria-hidden="true">
                  PDF
                </span>
                <div className="compress-file-meta">
                  <span className="compress-file-name" title={selectedFile.name}>
                    {selectedFile.name}
                  </span>
                  <div className="compress-file-details">
                    <span>{formatBytes(selectedFile.size)}</span>
                    {pageCount !== null && (
                      <span className="compress-page-badge">
                        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={openFilePicker}
                disabled={isCompressing}
              >
                Change File
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".pdf,application/pdf"
                className="hidden-file-input"
                aria-hidden="true"
              />
            </div>

            {/* Strategy Info Banner */}
            <div className="compress-info-banner">
              <span className="compress-info-icon" aria-hidden="true">
                ℹ️
              </span>
              <div className="compress-info-text">
                <strong>Lossless Object Stream Compression:</strong> Strips redundant revisions and unreferenced
                objects, repacking data into compressed binary object streams without degrading text sharpness or original image quality.
              </div>
            </div>

            {/* Footer Action / Progress / Result */}
            <div className="workbench-footer">
              {!isCompressing && !compressedPdfUrl && (
                <div className="convert-action-box">
                  <button
                    type="button"
                    className="btn-primary btn-lg convert-btn"
                    onClick={compressPdf}
                  >
                    Compress PDF Now
                  </button>
                </div>
              )}

              {/* Progress State */}
              {isCompressing && (
                <div className="convert-action-box">
                  <div
                    className="conversion-progress-box"
                    role="progressbar"
                    aria-valuenow={compressProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="PDF compression progress"
                  >
                    <div className="progress-info-row">
                      <span>{statusMessage}</span>
                      <span>{compressProgress}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${compressProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Result State */}
              {compressedPdfUrl && (
                <div className="conversion-success-card">
                  <div className="success-icon-badge" aria-hidden="true">
                    ✓
                  </div>
                  <h3 className="success-title">
                    {reductionPercent > 0 ? 'PDF Compressed Successfully!' : 'PDF Optimization Complete'}
                  </h3>
                  <p className="success-subtext">
                    Your PDF has been processed and is ready for download.
                  </p>

                  <div className="compress-result-box">
                    <span className="compress-result-filename">{compressedFilename}</span>
                    <div className="compress-stats-grid">
                      <div className="compress-stat-cell">
                        <span className="compress-stat-label">Original Size</span>
                        <span className="compress-stat-val">{formatBytes(originalSize)}</span>
                      </div>
                      <div className="compress-stat-cell">
                        <span className="compress-stat-label">Compressed Size</span>
                        <span className="compress-stat-val">{formatBytes(compressedSize)}</span>
                      </div>
                      <div className="compress-stat-cell">
                        <span className="compress-stat-label">Reduction</span>
                        <span
                          className={`compress-stat-val ${reductionPercent > 0 ? 'compress-savings-badge' : ''}`}
                        >
                          {reductionPercent > 0 ? `-${reductionPercent.toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                    </div>

                    {isAlreadyOptimized && (
                      <div className="compress-notice-card">
                        Your PDF was already optimized, so additional browser-side compression was limited.
                      </div>
                    )}
                  </div>

                  <div className="success-actions">
                    <a
                      href={compressedPdfUrl}
                      download={compressedFilename}
                      className="btn-primary btn-lg download-btn"
                    >
                      📥 Download Compressed PDF
                    </a>
                    <button
                      type="button"
                      className="btn-secondary btn-lg"
                      onClick={resetAll}
                    >
                      Compress Another PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="compress-pdf" />
    </div>
  );
}
