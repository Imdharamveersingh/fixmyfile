import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PDFDocument } from 'pdf-lib';
import { formatBytes } from '../../utils/helpers';

export default function MergePdfTool() {
  const [files, setFiles] = useState([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [mergedPdfUrl, setMergedPdfUrl] = useState(null);
  const [mergedPdfSize, setMergedPdfSize] = useState(null);
  const [mergedPageCount, setMergedPageCount] = useState(0);
  const [mergedFilename, setMergedFilename] = useState('merged.pdf');
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
      if (mergedPdfUrl) {
        URL.revokeObjectURL(mergedPdfUrl);
      }
    };
  }, [mergedPdfUrl]);

  // Handle files selection
  const processFiles = async (fileList) => {
    setErrorMessage(null);
    if (!fileList || fileList.length === 0) return;

    const newItems = [];
    const rejectedFiles = [];

    Array.from(fileList).forEach((file) => {
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (!isPdf) {
        rejectedFiles.push(file.name);
        return;
      }

      newItems.push({
        id: `pdf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        pageCount: null,
        isLoading: true,
        error: null
      });
    });

    if (rejectedFiles.length > 0) {
      setErrorMessage(
        `Rejected ${rejectedFiles.length} unsupported file(s): ${rejectedFiles.join(', ')}. Please select only PDF (.pdf) documents.`
      );
    }

    if (newItems.length === 0) return;

    // Clear previous merge results if adding new files
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
      setMergedPdfSize(null);
      setMergedPageCount(0);
    }

    // Append new items to existing files
    setFiles((prev) => [...prev, ...newItems]);

    // Inspect each file in-browser using pdf-lib to obtain page count and validate readability
    for (const item of newItems) {
      try {
        const buffer = await item.file.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
        const count = doc.getPageCount();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, pageCount: count, isLoading: false, error: null } : f
          )
        );
      } catch (err) {
        const errMsg = err?.message?.toLowerCase() || '';
        const isEncrypted = errMsg.includes('encrypted') || errMsg.includes('password');
        const failureReason = isEncrypted
          ? 'Password-protected or encrypted PDF'
          : 'Corrupted or unreadable PDF document';

        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, isLoading: false, error: failureReason } : f
          )
        );

        setErrorMessage(
          `Document "${item.name}" could not be loaded: ${failureReason}. Please remove or replace this file before merging.`
        );
      }
    }
  };

  const handleFileInputChange = (e) => {
    processFiles(e.target.files);
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
    if (e.dataTransfer && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Reordering controls
  const moveFileUp = (index) => {
    if (index === 0) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveFileDown = (index) => {
    if (index === files.length - 1) return;
    setFiles((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const resetAll = () => {
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
    }
    setFiles([]);
    setMergedPdfUrl(null);
    setMergedPdfSize(null);
    setMergedPageCount(0);
    setErrorMessage(null);
    setIsMerging(false);
    setMergeProgress(0);
    setStatusMessage('');
  };

  // Execute PDF Merge
  const mergePdfs = async () => {
    if (files.length === 0) {
      setErrorMessage('Please add at least one PDF document to merge.');
      return;
    }

    const unreadable = files.find((f) => f.error);
    if (unreadable) {
      setErrorMessage(
        `Cannot proceed: "${unreadable.name}" has errors (${unreadable.error}). Remove or replace this document before merging.`
      );
      return;
    }

    const stillLoading = files.find((f) => f.isLoading);
    if (stillLoading) {
      setErrorMessage('Please wait a moment while the selected documents finish loading.');
      return;
    }

    setIsMerging(true);
    setMergeProgress(5);
    setErrorMessage(null);
    setStatusMessage('Initializing browser PDF merger engine...');

    try {
      const mergedPdf = await PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        const stepProgress = Math.round(10 + (i / files.length) * 75);
        setMergeProgress(stepProgress);
        setStatusMessage(
          `Merging "${item.name}" (${i + 1} of ${files.length}${item.pageCount ? ` · ${item.pageCount} pages` : ''})...`
        );

        // Read source document arrayBuffer
        const buffer = await item.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });

        // Copy all pages in current document lossless preserving vector paths, text & images
        const pageIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pageIndices);

        // Add copied pages into merged document in exact sequence
        copiedPages.forEach((page) => {
          mergedPdf.addPage(page);
        });
      }

      setMergeProgress(90);
      setStatusMessage('Finalizing and encoding merged document...');

      // Save merged document to binary Uint8Array
      const mergedBytes = await mergedPdf.save();

      setMergeProgress(98);
      setStatusMessage('Preparing download package...');

      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Create a clean, user-friendly filename derived from the first file name
      const firstName = files[0].name.replace(/\.[^/.]+$/, '');
      const sanitizedName = firstName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'document';
      const outputName = `${sanitizedName}-merged.pdf`;

      setMergedFilename(outputName);
      setMergedPdfUrl(url);
      setMergedPdfSize(blob.size);
      setMergedPageCount(mergedPdf.getPageCount());
      setMergeProgress(100);
      setStatusMessage('Merge complete.');
    } catch (err) {
      console.error('Merge error:', err);
      setErrorMessage(`Failed to merge PDF files: ${err.message || 'An unexpected error occurred during processing.'}`);
    } finally {
      setIsMerging(false);
    }
  };

  // Calculate total pages for preview summary
  const totalLoadedPages = files.reduce((acc, curr) => acc + (curr.pageCount || 0), 0);
  const hasUnresolvedErrors = files.some((f) => f.error !== null);

  return (
    <div className="tool-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb-nav" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">
          Home
        </Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Merge PDF</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">Merge PDF</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro">
          Combine multiple PDF documents into a single organized file in your desired order. Fast, 100% private,
          and processed entirely inside your browser. No files are ever sent to any server.
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
      <section className="converter-card" aria-label="Merge PDF tool interface">
        {files.length === 0 ? (
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
            aria-label="Upload PDF files by clicking or dragging and dropping"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".pdf,application/pdf"
              multiple
              className="hidden-file-input"
              aria-hidden="true"
            />
            <div className="dropzone-icon">📑</div>
            <h2 className="dropzone-title">Drop your PDF files here</h2>
            <p className="dropzone-subtext">or click to browse your computer or mobile device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.PDF</span>
              <span className="dropzone-badge">Multiple Files</span>
              <span className="dropzone-badge">Lossless Quality</span>
              <span className="dropzone-badge">Client-Side Only</span>
            </div>
            <button
              type="button"
              className="btn-primary dropzone-cta"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              Choose PDF Files
            </button>
          </div>
        ) : (
          /* Files Workbench */
          <div className="files-workbench">
            {/* Workbench Header */}
            <div className="workbench-header">
              <div className="workbench-title-box">
                <h2 className="workbench-title">
                  {files.length} {files.length === 1 ? 'PDF Document' : 'PDF Documents'} Selected
                </h2>
                <span className="workbench-hint">
                  Use Up/Down controls to set merge order. Click "Merge PDF" to combine.
                </span>
              </div>
              <div className="workbench-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".pdf,application/pdf"
                  multiple
                  className="hidden-file-input"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={openFilePicker}
                  disabled={isMerging}
                >
                  + Add More
                </button>
                <button
                  type="button"
                  className="btn-text-danger btn-sm"
                  onClick={resetAll}
                  disabled={isMerging}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Ordered File List */}
            <div className="merge-pdf-list" role="list" aria-label="PDF files to merge">
              {files.map((item, index) => (
                <div
                  key={item.id}
                  className={`merge-pdf-item ${item.error ? 'has-error' : ''}`}
                  role="listitem"
                >
                  <div className="pdf-item-left">
                    <span className="pdf-order-badge" title={`Merge sequence #${index + 1}`}>
                      {index + 1}
                    </span>
                    <span className="pdf-icon-badge" aria-hidden="true">
                      PDF
                    </span>
                    <div className="pdf-item-meta">
                      <span className="pdf-filename" title={item.name}>
                        {item.name}
                      </span>
                      <div className="pdf-details">
                        <span>{formatBytes(item.size)}</span>
                        {item.isLoading && (
                          <span className="pdf-pages-badge">Reading pages...</span>
                        )}
                        {!item.isLoading && item.pageCount !== null && (
                          <span className="pdf-pages-badge">
                            {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                          </span>
                        )}
                        {item.error && (
                          <span className="pdf-error-text">⚠️ {item.error}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pdf-item-right">
                    <button
                      type="button"
                      className="order-btn"
                      onClick={() => moveFileUp(index)}
                      disabled={index === 0 || isMerging}
                      aria-label={`Move ${item.name} up in merge order`}
                      title="Move up"
                    >
                      ▲ Up
                    </button>
                    <button
                      type="button"
                      className="order-btn"
                      onClick={() => moveFileDown(index)}
                      disabled={index === files.length - 1 || isMerging}
                      aria-label={`Move ${item.name} down in merge order`}
                      title="Move down"
                    >
                      ▼ Down
                    </button>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeFile(item.id)}
                      disabled={isMerging}
                      aria-label={`Remove ${item.name} from merge list`}
                      title="Remove document"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Pill */}
            <div className="merge-summary-pill">
              <span className="merge-summary-stat">
                Total Documents: <span className="merge-summary-highlight">{files.length}</span>
              </span>
              <span className="merge-summary-stat">
                Combined Pages:{' '}
                <span className="merge-summary-highlight">
                  {totalLoadedPages > 0 ? totalLoadedPages : 'Calculating...'}
                </span>
              </span>
            </div>

            {/* Merge Action / Progress / Success */}
            <div className="workbench-footer">
              {!isMerging && !mergedPdfUrl && (
                <div className="convert-action-box">
                  <button
                    type="button"
                    className="btn-primary btn-lg convert-btn"
                    onClick={mergePdfs}
                    disabled={hasUnresolvedErrors}
                  >
                    Merge {files.length} {files.length === 1 ? 'PDF' : 'PDFs'} Now
                  </button>
                </div>
              )}

              {/* Progress State */}
              {isMerging && (
                <div className="convert-action-box">
                  <div
                    className="conversion-progress-box"
                    role="progressbar"
                    aria-valuenow={mergeProgress}
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-label="PDF merge progress"
                  >
                    <div className="progress-info-row">
                      <span>{statusMessage}</span>
                      <span>{mergeProgress}%</span>
                    </div>
                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${mergeProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Success State */}
              {mergedPdfUrl && (
                <div className="conversion-success-card">
                  <div className="success-icon-badge" aria-hidden="true">
                    ✓
                  </div>
                  <h3 className="success-title">PDFs Merged Successfully!</h3>
                  <p className="success-subtext">
                    All pages have been losslessly combined in your specified order.
                  </p>

                  <div className="merge-output-preview">
                    <span className="merge-output-name">{mergedFilename}</span>
                    <div className="merge-meta-grid">
                      <div className="merge-meta-cell">
                        <span className="merge-meta-label">Files Merged</span>
                        <span className="merge-meta-val">{files.length}</span>
                      </div>
                      <div className="merge-meta-cell">
                        <span className="merge-meta-label">Total Pages</span>
                        <span className="merge-meta-val">{mergedPageCount}</span>
                      </div>
                      <div className="merge-meta-cell">
                        <span className="merge-meta-label">Output Size</span>
                        <span className="merge-meta-val">{formatBytes(mergedPdfSize)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="success-actions">
                    <a
                      href={mergedPdfUrl}
                      download={mergedFilename}
                      className="btn-primary btn-lg download-btn"
                    >
                      📥 Download Merged PDF
                    </a>
                    <button
                      type="button"
                      className="btn-secondary btn-lg"
                      onClick={resetAll}
                    >
                      Merge Another
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Informational & SEO Content */}
      <section className="tool-info-section">
        {/* How-To Steps */}
        <div className="info-block">
          <h2 className="info-heading">How to Merge PDF Files Online</h2>
          <div className="steps-list">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3 className="step-title">Upload Multiple PDFs</h3>
                <p className="step-desc">
                  Select or drag and drop two or more PDF documents into the upload area above. You can easily
                  add more files at any time.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3 className="step-title">Arrange Document Order</h3>
                <p className="step-desc">
                  Review the ordered list and use the <strong>▲ Up</strong> and <strong>▼ Down</strong> controls to
                  arrange your PDF files into your preferred sequence.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3 className="step-title">Combine With One Click</h3>
                <p className="step-desc">
                  Click the <strong>Merge PDF</strong> button. Your browser merges the documents losslessly,
                  preserving all text, fonts, vector paths, and original image resolutions.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h3 className="step-title">Download Merged PDF</h3>
                <p className="step-desc">
                  Instantly save the combined PDF directly to your device with zero waiting queues, watermarks,
                  or registrations.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="info-block">
          <h2 className="info-heading">Key Features of FixMyFile Merge PDF</h2>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <h3 className="feature-title">100% Client-Side Privacy</h3>
              <p className="feature-desc">
                Your PDF documents are never uploaded to any remote server or cloud service. All page merging
                and binary processing happen locally inside your browser.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💎</span>
              <h3 className="feature-title">Lossless Page Preservation</h3>
              <p className="feature-desc">
                Unlike converters that convert pages to images, FixMyFile copies vector paths, text streams,
                page dimensions, and embedded media directly without degradation.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔃</span>
              <h3 className="feature-title">Intuitive Reordering</h3>
              <p className="feature-desc">
                Control the precise order of your combined documents with simple, accessible Up and Down controls,
                previewing file sizes and page counts before merging.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <h3 className="feature-title">Instant & Free</h3>
              <p className="feature-desc">
                No subscription, signup, file count caps, or watermarks. Combine unlimited PDF documents
                instantly on desktop, tablet, or mobile.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="info-block">
          <h2 className="info-heading">Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">How does FixMyFile combine PDFs without uploading them?</h3>
              <p className="faq-answer">
                FixMyFile uses a high-performance in-browser PDF manipulation engine (<code>pdf-lib</code>).
                Your browser reads the binary structure of each PDF file locally in memory, copies the pages
                in your chosen order, and compiles a new PDF directly on your device.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Will text and vector graphics remain sharp and selectable?</h3>
              <p className="faq-answer">
                Yes. Because FixMyFile uses genuine PDF object copying rather than rasterizing pages to images,
                all text remains searchable and selectable, and vector graphics and fonts retain their original
                crispness and fidelity.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I merge documents with different page sizes or orientations?</h3>
              <p className="faq-answer">
                Yes. Portrait, landscape, A4, Letter, and custom page dimensions are each preserved individually.
                Each page retains its original orientation and dimensions in the merged result.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I merge password-protected or encrypted PDFs?</h3>
              <p className="faq-answer">
                Encrypted or password-protected PDF files cannot be merged without first unlocking them. If you
                upload a protected PDF, FixMyFile will flag the document so you can remove it or upload an
                unlocked version.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Is there a limit on file size or the number of PDFs?</h3>
              <p className="faq-answer">
                There are no artificial limits imposed by FixMyFile. Since processing runs in your device's
                browser memory, you can merge dozens of documents seamlessly without upload delays or server queues.
              </p>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="info-block">
          <h2 className="info-heading">Explore Other FixMyFile Tools</h2>
          <div className="related-tools-grid">
            <Link to="/jpg-to-pdf" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">JPG to PDF</h3>
              <p className="related-desc">Convert JPG and JPEG images into clean, formatted PDF documents.</p>
            </Link>
            <Link to="/pdf-to-word" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">PDF to Word</h3>
              <p className="related-desc">Convert PDF documents into editable Microsoft Word DOCX files.</p>
            </Link>
            <Link to="/pdf-to-jpg" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">PDF to JPG</h3>
              <p className="related-desc">Extract pages from PDF files and save them as high-quality JPG images.</p>
            </Link>
            <Link to="/word-to-pdf" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">Word to PDF</h3>
              <p className="related-desc">Convert Word DOCX documents directly into standardized PDF files.</p>
            </Link>
            <Link to="/compress-pdf" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">Compress PDF</h3>
              <p className="related-desc">Reduce PDF file size while preserving optimal visual quality.</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
