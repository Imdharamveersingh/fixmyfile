import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { formatBytes } from '../../utils/helpers';

// Configure PDF.js worker URL for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToJpgTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null); // { pageCount: number }
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [convertedPages, setConvertedPages] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);

  const fileInputRef = useRef(null);

  // Clean up generated object URLs on unmount or reset
  useEffect(() => {
    return () => {
      convertedPages.forEach((p) => {
        if (p.url) URL.revokeObjectURL(p.url);
      });
    };
  }, [convertedPages]);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Revoke object URLs in an array of converted pages
  const cleanConvertedPages = (pages) => {
    pages.forEach((p) => {
      if (p.url) URL.revokeObjectURL(p.url);
    });
  };

  // Process selected PDF file
  const processFile = async (file) => {
    setErrorMessage(null);

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Unsupported file format. Please select a valid PDF (.pdf) file.');
      return;
    }

    // Clean up previous results if any
    cleanConvertedPages(convertedPages);
    setConvertedPages([]);

    setSelectedFile(file);

    // Read PDF page count and validate accessibility
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      setPdfMeta({
        pageCount: pdfDoc.numPages
      });
    } catch (err) {
      console.error('Error reading PDF document:', err);
      if (err.name === 'PasswordException') {
        setErrorMessage('This PDF is password-protected. Please provide an unencrypted PDF.');
      } else {
        setErrorMessage(`Could not read PDF: ${err.message || 'Invalid or corrupted document.'}`);
      }
      setSelectedFile(null);
      setPdfMeta(null);
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
    cleanConvertedPages(convertedPages);
    setSelectedFile(null);
    setPdfMeta(null);
    setConvertedPages([]);
    setErrorMessage(null);
    setIsConverting(false);
    setConversionProgress(0);
    setStatusMessage('');
    setIsDownloadingAll(false);
  };

  // Convert PDF pages to JPG images
  const convertPdfToJpg = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a PDF file to convert.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);
    setErrorMessage(null);
    setStatusMessage('Loading PDF document...');

    cleanConvertedPages(convertedPages);
    setConvertedPages([]);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      const numPages = pdfDoc.numPages;

      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'document';

      const results = [];

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setStatusMessage(`Rendering page ${pageNum} of ${numPages}...`);
        setConversionProgress(Math.round(((pageNum - 0.5) / numPages) * 95));

        const page = await pdfDoc.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1.0 });

        // Calculate a crisp rendering scale (target ~150 DPI)
        // Cap max dimension at 2400px to avoid memory overflow on very large blueprints
        const baseMax = Math.max(baseViewport.width, baseViewport.height);
        let scale = 1.75;
        if (baseMax * scale > 2400) {
          scale = Math.max(1.0, 2400 / baseMax);
        }

        const viewport = page.getViewport({ scale });
        const width = Math.floor(viewport.width);
        const height = Math.floor(viewport.height);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fill background with white because JPG has no transparency
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        // Convert canvas to JPG blob with sensible quality (0.88)
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error(`Failed to generate JPG image for page ${pageNum}.`));
            },
            'image/jpeg',
            0.88
          );
        });

        // Release canvas backing store memory
        canvas.width = 0;
        canvas.height = 0;
        if (typeof page.cleanup === 'function') {
          page.cleanup();
        }

        const previewUrl = URL.createObjectURL(blob);
        const filename = `${cleanBaseName}-page-${pageNum}.jpg`;

        results.push({
          pageNum,
          width,
          height,
          size: blob.size,
          url: previewUrl,
          filename
        });
      }

      setConversionProgress(100);
      setStatusMessage('Conversion complete!');
      setConvertedPages(results);
    } catch (err) {
      console.error('PDF to JPG conversion error:', err);
      if (err.name === 'PasswordException') {
        setErrorMessage('This PDF is password-protected. Please provide an unlocked document.');
      } else {
        setErrorMessage(`Conversion failed: ${err.message || 'An unexpected error occurred during rendering.'}`);
      }
    } finally {
      setIsConverting(false);
    }
  };

  // Download all JPG pages sequentially
  const handleDownloadAll = async () => {
    if (convertedPages.length === 0 || isDownloadingAll) return;
    setIsDownloadingAll(true);

    try {
      for (let i = 0; i < convertedPages.length; i++) {
        const page = convertedPages[i];
        const link = document.createElement('a');
        link.href = page.url;
        link.download = page.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        if (i < convertedPages.length - 1) {
          // Delay to prevent browser throttling multi-file downloads
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    } catch (err) {
      console.error('Download all error:', err);
      setErrorMessage('Could not complete multi-file download. You can download each page individually.');
    } finally {
      setIsDownloadingAll(false);
    }
  };

  return (
    <div className="tool-view-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="pdf-to-jpg"
        title="PDF to JPG Converter"
        description="Convert PDF pages into high-quality JPG images directly in your browser. Fast, 100% private, and processed locally on your device without server uploads."
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
      <section className="converter-card" aria-label="PDF to JPG tool interface">
        {!selectedFile ? (
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
            aria-label="Upload PDF document by clicking or dragging and dropping"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,application/pdf"
              className="hidden-file-input"
              aria-hidden="true"
            />
            <div className="dropzone-icon" aria-hidden="true">
            <ToolIcon icon="pdf-to-jpg" size={48} />
          </div>
            <h2 className="dropzone-title">Drop your PDF document here</h2>
            <p className="dropzone-subtext">or click to browse your device for a PDF file</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.PDF</span>
              <span className="dropzone-badge">High Quality JPG</span>
              <span className="dropzone-badge">All Pages Converted</span>
              <span className="dropzone-badge">100% Client-Side</span>
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
          <div className="files-workbench">
            {/* Workbench Header */}
            <div className="workbench-header">
              <div className="workbench-title-box">
                <h2 className="workbench-title">Selected PDF File</h2>
                <span className="workbench-hint">
                  Verify document details before converting pages to JPG images.
                </span>
              </div>
              <div className="workbench-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,application/pdf"
                  className="hidden-file-input"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={openFilePicker}
                  disabled={isConverting}
                >
                  Change File
                </button>
                <button
                  type="button"
                  className="btn-text-danger btn-sm"
                  onClick={resetAll}
                  disabled={isConverting}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Single File Card */}
            <div className="pdf-file-card">
              <div className="pdf-icon-badge">PDF</div>
              <div className="pdf-file-details">
                <div className="pdf-filename" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="pdf-meta-row">
                  <span className="pdf-meta-pill">{formatBytes(selectedFile.size)}</span>
                  {pdfMeta && (
                    <span className="pdf-meta-pill">
                      {pdfMeta.pageCount} {pdfMeta.pageCount === 1 ? 'Page' : 'Pages'}
                    </span>
                  )}
                  <span className="pdf-meta-format">Output: High-Quality JPG Images</span>
                </div>
              </div>
            </div>

            {/* Conversion Controls & Feedback */}
            <div className="workbench-footer">
              {convertedPages.length === 0 ? (
                <div className="convert-action-box">
                  {isConverting ? (
                    <div className="conversion-progress-box">
                      <div className="progress-info-row">
                        <span className="progress-msg">{statusMessage}</span>
                        <span className="progress-pct">{conversionProgress}%</span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${conversionProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary btn-lg convert-btn"
                      onClick={convertPdfToJpg}
                    >
                      ⚡ Convert to JPG
                    </button>
                  )}
                </div>
              ) : (
                <div className="jpg-results-container">
                  {/* Results Header Summary */}
                  <div className="jpg-results-header">
                    <div className="jpg-results-title-box">
                      <div className="jpg-results-badge">✓</div>
                      <div>
                        <h3 className="jpg-results-title">
                          Converted {convertedPages.length}{' '}
                          {convertedPages.length === 1 ? 'Page' : 'Pages'} to JPG
                        </h3>
                        <p className="jpg-results-subtitle">
                          Preview each page below or download all JPGs to your device.
                        </p>
                      </div>
                    </div>
                    <div className="jpg-results-actions">
                      {convertedPages.length > 1 && (
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          onClick={handleDownloadAll}
                          disabled={isDownloadingAll}
                        >
                          {isDownloadingAll ? 'Downloading...' : '📥 Download All JPGs'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={resetAll}
                      >
                        Convert Another PDF
                      </button>
                    </div>
                  </div>

                  {/* Results Grid */}
                  <div
                    className="jpg-results-grid"
                    role="list"
                    aria-label="Converted JPG pages"
                  >
                    {convertedPages.map((page) => (
                      <div
                        key={`page-${page.pageNum}`}
                        className="jpg-page-card"
                        role="listitem"
                      >
                        <div className="jpg-card-header">
                          <span className="jpg-page-badge">Page {page.pageNum}</span>
                          <span className="jpg-file-size">{formatBytes(page.size)}</span>
                        </div>

                        <div className="jpg-preview-container">
                          <img
                            src={page.url}
                            alt={`Converted Page ${page.pageNum}`}
                            className="jpg-preview-image"
                            loading="lazy"
                          />
                        </div>

                        <div className="jpg-card-details">
                          <span className="jpg-dimensions">
                            {page.width} × {page.height} px
                          </span>
                        </div>

                        <a
                          href={page.url}
                          download={page.filename}
                          className="btn-primary btn-sm jpg-download-btn"
                        >
                          📥 Download JPG
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="pdf-to-jpg" />
    </div>
  );
}
