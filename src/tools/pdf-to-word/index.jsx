import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { convertPdfToDocx } from './converterEngine';
import { formatBytes } from '../../utils/helpers';

// Configure PDF.js worker URL for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToWordTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null); // { pageCount: number }
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [convertedDocxUrl, setConvertedDocxUrl] = useState(null);
  const [convertedDocxSize, setConvertedDocxSize] = useState(null);
  const [detectedTablesCount, setDetectedTablesCount] = useState(0);
  const [docxFilename, setDocxFilename] = useState('pdf-to-word.docx');
  const [errorMessage, setErrorMessage] = useState(null);
  const [warningMessage, setWarningMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedDocxUrl) {
        URL.revokeObjectURL(convertedDocxUrl);
      }
    };
  }, [convertedDocxUrl]);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process selected PDF file
  const processFile = async (file) => {
    setErrorMessage(null);
    setWarningMessage(null);

    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Unsupported file format. Please select a valid PDF (.pdf) file.');
      return;
    }

    // Clean up previous result if any
    if (convertedDocxUrl) {
      URL.revokeObjectURL(convertedDocxUrl);
      setConvertedDocxUrl(null);
      setConvertedDocxSize(null);
    }

    setSelectedFile(file);

    // Formulate a sanitized output docx filename
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'document';
    setDocxFilename(`${cleanBaseName}.docx`);

    // Inspect page count
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;
      setPdfMeta({
        pageCount: pdfDoc.numPages
      });
    } catch (err) {
      console.error('Error pre-reading PDF:', err);
      if (err.name === 'PasswordException') {
        setErrorMessage('This PDF is password-protected. Please provide an unencrypted PDF.');
      } else {
        setErrorMessage(`Could not read PDF: ${err.message || 'Invalid or corrupted file.'}`);
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
    if (convertedDocxUrl) {
      URL.revokeObjectURL(convertedDocxUrl);
    }
    setSelectedFile(null);
    setPdfMeta(null);
    setConvertedDocxUrl(null);
    setConvertedDocxSize(null);
    setDetectedTablesCount(0);
    setErrorMessage(null);
    setWarningMessage(null);
    setIsConverting(false);
    setConversionProgress(0);
    setStatusMessage('');
  };

  // Convert PDF to Word DOCX
  const convertPdfToWord = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a PDF file to convert.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);
    setErrorMessage(null);
    setWarningMessage(null);
    setDetectedTablesCount(0);
    setStatusMessage('Loading PDF document...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdfDoc = await loadingTask.promise;

      const { docxBlob, totalExtractedChars, detectedTables } = await convertPdfToDocx(pdfDoc, {
        title: selectedFile.name,
        onProgress: (pct, msg) => {
          setConversionProgress(pct);
          setStatusMessage(msg);
        }
      });

      // Check for scanned / image-only PDFs with no extractable text
      if (totalExtractedChars < 15) {
        setWarningMessage(
          'Notice: This PDF contains little or no selectable text. It appears to be a scanned or image-only document. Scanned PDFs require OCR (Optical Character Recognition), which will be available in a separate tool.'
        );
      }

      const docxUrl = URL.createObjectURL(docxBlob);

      setConversionProgress(100);
      setStatusMessage('Conversion complete!');
      setConvertedDocxUrl(docxUrl);
      setConvertedDocxSize(docxBlob.size);
      setDetectedTablesCount(detectedTables.length);
    } catch (err) {
      console.error('PDF to Word conversion error:', err);
      if (err.name === 'PasswordException') {
        setErrorMessage('This PDF is password-protected. Please provide an unlocked document.');
      } else {
        setErrorMessage(`Conversion failed: ${err.message || 'An unexpected error occurred during processing.'}`);
      }
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="tool-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">PDF to Word</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">PDF to Word Converter</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro">
          Convert text-based PDF files into editable Microsoft Word (.docx) documents directly in your
          browser. Fast, 100% private, and processed locally on your device without server uploads.
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

      {/* Warning Callout (e.g. for Scanned PDFs) */}
      {warningMessage && (
        <div className="tool-alert tool-alert-warning" role="status">
          <span className="alert-icon">ℹ️</span>
          <div className="alert-message">{warningMessage}</div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setWarningMessage(null)}
            aria-label="Dismiss warning"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Interactive Tool Area */}
      <section className="converter-card" aria-label="PDF to Word tool interface">
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
            <div className="dropzone-icon">📄</div>
            <h2 className="dropzone-title">Drop your PDF document here</h2>
            <p className="dropzone-subtext">or click to browse your device for a PDF file</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.PDF</span>
              <span className="dropzone-badge">Text-Based PDFs</span>
              <span className="dropzone-badge">Direct DOCX Output</span>
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
                  Verify file details before converting to Word.
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
                  <span className="pdf-meta-format">Output: Microsoft Word (.docx)</span>
                </div>
              </div>
            </div>

            {/* Conversion Controls & Feedback */}
            <div className="workbench-footer">
              {!convertedDocxUrl ? (
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
                      onClick={convertPdfToWord}
                    >
                      ⚡ Convert to Word (.docx)
                    </button>
                  )}
                </div>
              ) : (
                <div className="conversion-success-card">
                  <div className="success-icon-badge">✓</div>
                  <div className="success-text-box">
                    <h3 className="success-title">Your Word Document is Ready!</h3>
                    <p className="success-subtext">
                      Successfully generated <strong>{docxFilename}</strong> ({formatBytes(convertedDocxSize)})
                      {detectedTablesCount > 0 ? ` with ${detectedTablesCount} ${detectedTablesCount === 1 ? 'table' : 'tables'} preserved` : ''}.
                    </p>
                  </div>
                  <div className="success-actions">
                    <a
                      href={convertedDocxUrl}
                      download={docxFilename}
                      className="btn-primary btn-lg download-btn"
                    >
                      📥 Download Word Document (.docx)
                    </a>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={resetAll}
                    >
                      Convert Another File
                    </button>
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
          <h2 className="info-heading">How to Convert PDF to Word Online</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Select Your PDF</h3>
              <p className="step-desc">
                Click "Choose PDF File" or drag and drop your document into the box. The tool loads
                your file locally in your browser.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Convert to DOCX</h3>
              <p className="step-desc">
                Click "Convert to Word". The converter extracts selectable text, organizes paragraphs,
                and generates a valid Microsoft Word document.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Download Editable Word File</h3>
              <p className="step-desc">
                Click "Download Word Document" to save your new <code>.docx</code> file instantly.
                You can edit it immediately in Word, Google Docs, or LibreOffice.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="info-block">
          <h2 className="info-heading">Key Features of FixMyFile PDF to Word</h2>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <h3 className="feature-title">100% Client-Side Privacy</h3>
              <p className="feature-desc">
                Your PDF is parsed directly in your browser. Sensitive documents never touch a server,
                ensuring complete confidentiality and compliance.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📝</span>
              <h3 className="feature-title">Real Microsoft Word (.docx)</h3>
              <p className="feature-desc">
                Generates a genuine Office Open XML (.docx) package, fully compatible with Microsoft Word,
                Office 365, Google Docs, and open-source office suites.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📑</span>
              <h3 className="feature-title">Preserved Page Breaks</h3>
              <p className="feature-desc">
                Maintains multi-page structure with clean page breaks separating the original pages of your PDF document.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <h3 className="feature-title">Instant & Unlimited</h3>
              <p className="feature-desc">
                No account required, no file conversion limits, and no watermarks added.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Transparency Note */}
        <div className="info-block">
          <h2 className="info-heading">Important Note on Scanned Documents</h2>
          <div className="transparency-card">
            <div className="transparency-icon">ℹ️</div>
            <div className="transparency-text">
              <h3 className="transparency-title">Designed for Text-Based PDFs</h3>
              <p className="transparency-desc">
                This in-browser converter extracts selectable text and structured typography from digital PDFs.
                If your PDF is a scanned document or photograph without embedded text, extraction will not find selectable characters.
                Optical Character Recognition (OCR) for scanned images will be introduced in a dedicated future tool.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="info-block">
          <h2 className="info-heading">Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">Will my PDF document remain confidential?</h3>
              <p className="faq-answer">
                Yes, completely. FixMyFile executes all PDF parsing and Word generation locally in your browser
                using JavaScript. Your files are never transmitted to any external server or API.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I edit the converted file in Microsoft Word?</h3>
              <p className="faq-answer">
                Yes. The generated file is a standard <code>.docx</code> file that can be opened and edited in
                Microsoft Word, Google Docs, Apple Pages, and LibreOffice.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Why does my scanned PDF have no text in Word?</h3>
              <p className="faq-answer">
                Scanned PDFs consist of raw pictures of pages rather than digital character codes. This tool extracts
                selectable text. Converting image scans requires OCR, which is supported by our PDF OCR tool.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Is there a file size limit?</h3>
              <p className="faq-answer">
                Because processing occurs on your device, standard PDFs of dozens or hundreds of pages convert smoothly.
                Performance depends on your device's available memory.
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
              <p className="related-desc">Convert JPG images into standard PDF files in your browser.</p>
            </Link>
            <Link to="/pdf-to-jpg" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">PDF to JPG</h3>
              <p className="related-desc">Extract pages from PDF files as high-quality JPG images.</p>
            </Link>
            <Link to="/merge-pdf" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">Merge PDF</h3>
              <p className="related-desc">Combine multiple PDF documents into a single organized file.</p>
            </Link>
            <Link to="/compress-pdf" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">Compress PDF</h3>
              <p className="related-desc">Reduce PDF file size while preserving document quality.</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
