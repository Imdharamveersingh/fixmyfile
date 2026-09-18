import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">PDF to JPG</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">PDF to JPG Converter</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
          <span className="tool-badge-accent">Phase 1</span>
        </div>
        <p className="tool-intro">
          Convert PDF pages into high-quality JPG images directly in your browser. Fast, 100% private,
          and processed locally on your device without server uploads.
        </p>
      </header>

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
            <div className="dropzone-icon">🖼️</div>
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

      {/* SEO & Informational Content */}
      <section className="seo-content-section">
        {/* How to Convert */}
        <div className="info-block">
          <h2 className="info-heading">How to Convert PDF to JPG Online</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Select Your PDF Document</h3>
              <p className="step-desc">
                Click "Choose PDF File" or drag and drop your document into the upload area. Your file is
                read completely within your web browser.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Render & Convert Pages</h3>
              <p className="step-desc">
                Click "Convert to JPG". The converter processes each page locally at high resolution, preserving
                the natural proportions and typography.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Preview & Download Images</h3>
              <p className="step-desc">
                Review crisp JPG previews for each page. Download individual pages as needed or save all
                pages in one click.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="info-block">
          <h2 className="info-heading">Key Features of FixMyFile PDF to JPG</h2>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <h3 className="feature-title">100% Client-Side Privacy</h3>
              <p className="feature-desc">
                Your PDF files are parsed and rendered exclusively in your browser memory. No documents are
                ever transmitted to external cloud servers.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🖼️</span>
              <h3 className="feature-title">High-Definition Output</h3>
              <p className="feature-desc">
                Every page is rendered with sharp vector rasterization, ensuring legible text, vibrant diagrams,
                and crisp illustrations.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📐</span>
              <h3 className="feature-title">Preserved Aspect Ratios</h3>
              <p className="feature-desc">
                Supports both portrait and landscape pages in the same document without cropping, distortion,
                or unwanted margins.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <h3 className="feature-title">Instant & Unlimited</h3>
              <p className="feature-desc">
                No signups, email registrations, file limits, or watermarks. Convert as many documents as you need
                completely free.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="info-block">
          <h2 className="info-heading">Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">Are my PDF files uploaded to any servers?</h3>
              <p className="faq-answer">
                No. FixMyFile executes the entire PDF rendering and JPG conversion workflow locally inside
                your browser. Your files never leave your device.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">What JPG quality is generated?</h3>
              <p className="faq-answer">
                We balance high clarity with efficient file sizes using calibrated 88% JPEG compression
                and high-DPI canvas rendering.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I download all converted pages at once?</h3>
              <p className="faq-answer">
                Yes! When your PDF has multiple pages, a "Download All JPGs" button appears to trigger sequential
                downloads of all converted pages.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Does this tool support password-protected PDFs?</h3>
              <p className="faq-answer">
                For security reasons, password-protected PDFs must be unlocked before conversion. Unencrypted
                standard PDFs convert immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="info-block">
          <h2 className="info-heading">Explore Other FixMyFile Tools</h2>
          <div className="related-tools-grid">
            <Link to="/jpg-to-pdf" className="related-tool-card">
              <span className="related-badge">Phase 1 · Ready</span>
              <h3 className="related-title">JPG to PDF</h3>
              <p className="related-desc">Convert JPG images into clean, formatted PDF documents.</p>
            </Link>
            <Link to="/pdf-to-word" className="related-tool-card">
              <span className="related-badge">Phase 1 · Ready</span>
              <h3 className="related-title">PDF to Word</h3>
              <p className="related-desc">Convert PDF documents into editable Word DOCX files.</p>
            </Link>
            <Link to="/merge-pdf" className="related-tool-card">
              <span className="related-badge">Phase 1</span>
              <h3 className="related-title">Merge PDF</h3>
              <p className="related-desc">Combine multiple PDF documents into a single organized file.</p>
            </Link>
            <Link to="/compress-pdf" className="related-tool-card">
              <span className="related-badge">Phase 1</span>
              <h3 className="related-title">Compress PDF</h3>
              <p className="related-desc">Reduce PDF file size while preserving optimal visual quality.</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
