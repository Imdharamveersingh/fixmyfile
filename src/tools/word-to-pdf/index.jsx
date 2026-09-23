import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { renderAsync } from 'docx-preview';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { formatBytes } from '../../utils/helpers';

export default function WordToPdfTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null);
  const [convertedPdfSize, setConvertedPdfSize] = useState(null);
  const [convertedPageCount, setConvertedPageCount] = useState(0);
  const [pdfFilename, setPdfFilename] = useState('document.pdf');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const hiddenContainerRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedPdfUrl) {
        URL.revokeObjectURL(convertedPdfUrl);
      }
    };
  }, [convertedPdfUrl]);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Process selected file
  const processFile = (file) => {
    setErrorMessage(null);

    if (!file) return;

    const fileNameLower = file.name.toLowerCase();

    // Specifically catch legacy binary .doc files
    if (fileNameLower.endsWith('.doc')) {
      setErrorMessage(
        'Unsupported format: Older binary Word documents (.doc) are not supported. Please open the file in Microsoft Word, Google Docs, or LibreOffice and save as modern .docx format before converting.'
      );
      return;
    }

    const isDocx =
      fileNameLower.endsWith('.docx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    if (!isDocx) {
      setErrorMessage(
        'Unsupported file format. Please select a valid Microsoft Word (.docx) document.'
      );
      return;
    }

    // Clean up previous result if any
    if (convertedPdfUrl) {
      URL.revokeObjectURL(convertedPdfUrl);
      setConvertedPdfUrl(null);
      setConvertedPdfSize(null);
      setConvertedPageCount(0);
    }

    setSelectedFile(file);

    // Formulate a sanitized output PDF filename
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim() || 'document';
    setPdfFilename(`${cleanBaseName}.pdf`);
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
    if (convertedPdfUrl) {
      URL.revokeObjectURL(convertedPdfUrl);
    }
    if (hiddenContainerRef.current) {
      hiddenContainerRef.current.innerHTML = '';
    }
    setSelectedFile(null);
    setConvertedPdfUrl(null);
    setConvertedPdfSize(null);
    setConvertedPageCount(0);
    setErrorMessage(null);
    setIsConverting(false);
    setConversionProgress(0);
    setStatusMessage('');
  };

  // Convert Word DOCX to PDF
  const convertWordToPdf = async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a Word (.docx) file to convert.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(5);
    setErrorMessage(null);
    setStatusMessage('Reading Word document...');

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();

      setStatusMessage('Parsing and rendering document layout...');
      setConversionProgress(20);

      const container = hiddenContainerRef.current;
      if (!container) {
        throw new Error('Render staging container is not available.');
      }
      container.innerHTML = '';

      // Render Word document into offscreen staging element
      await renderAsync(arrayBuffer, container, null, {
        inWrapper: true,
        breakPages: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreLastRenderedPageBreak: false,
        renderHeaders: true,
        renderFooters: true,
        renderFootnotes: true,
        renderEndnotes: true
      });

      // Extract rendered page sections
      let pageElements = Array.from(container.querySelectorAll('.docx-wrapper > section'));
      if (pageElements.length === 0) {
        pageElements = Array.from(container.querySelectorAll('section.docx'));
      }
      if (pageElements.length === 0) {
        pageElements = Array.from(container.querySelectorAll('.docx'));
      }
      if (pageElements.length === 0) {
        pageElements = [container];
      }

      const totalSections = pageElements.length;
      let pdfDoc = null;
      let totalRenderedPages = 0;

      // Helper to scan for clean blank row between lines/paragraphs to avoid cutting text glyphs
      const findBestCutY = (fullCanvas, startY, targetY, pageH) => {
        if (targetY >= fullCanvas.height) {
          return fullCanvas.height;
        }

        // Search upward within a window above targetY (up to 12% of page height, max 200px)
        const maxSearch = Math.min(Math.round(pageH * 0.12), targetY - startY - 80);
        if (maxSearch <= 0) {
          return targetY;
        }

        const ctx = fullCanvas.getContext('2d', { willReadFrequently: true });
        const scanY = targetY - maxSearch;
        const imgData = ctx.getImageData(0, scanY, fullCanvas.width, maxSearch);
        const data = imgData.data;

        // Ignore margins where background is always white
        const startX = Math.round(fullCanvas.width * 0.08);
        const endX = Math.round(fullCanvas.width * 0.92);
        const stepX = 4; // Sample every 4th pixel for high speed

        let bestY = targetY;
        let minDarkPixels = Infinity;

        // Scan from targetY upwards looking for a whitespace row
        for (let row = maxSearch - 1; row >= 0; row--) {
          let darkPixels = 0;
          const rowOffset = row * fullCanvas.width * 4;

          for (let x = startX; x < endX; x += stepX) {
            const idx = rowOffset + x * 4;
            // Check if pixel is darker than off-white
            if (data[idx] < 235 || data[idx + 1] < 235 || data[idx + 2] < 235) {
              darkPixels++;
            }
          }

          // Found clean blank line between paragraphs or text lines
          if (darkPixels === 0) {
            return scanY + row;
          }

          if (darkPixels < minDarkPixels) {
            minDarkPixels = darkPixels;
            bestY = scanY + row;
          }
        }

        // If a very low-density row was found (e.g. table border or spacing)
        if (minDarkPixels <= 3) {
          return bestY;
        }

        return targetY;
      };

      for (let sIdx = 0; sIdx < totalSections; sIdx++) {
        setStatusMessage(`Rendering document section ${sIdx + 1} of ${totalSections}...`);
        setConversionProgress(25 + Math.round(((sIdx + 1) / totalSections) * 65));

        const pageEl = pageElements[sIdx];

        // Clean any shadow or outer margin from docx-preview wrapper
        pageEl.style.boxShadow = 'none';
        pageEl.style.margin = '0 auto';

        // Capture page DOM element with html2canvas
        const canvas = await html2canvas(pageEl, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        });

        // Parse document's natural page dimensions from docx-preview styling
        let naturalRatio = 297 / 210; // Default A4 portrait
        const styleW = parseFloat(pageEl.style.width) || 0;
        const styleH = parseFloat(pageEl.style.minHeight) || parseFloat(pageEl.style.height) || 0;

        if (styleW > 0 && styleH > 0) {
          naturalRatio = styleH / styleW;
        }

        const isLandscape = naturalRatio < 1.0;
        const orientation = isLandscape ? 'landscape' : 'portrait';
        const pageWidth = isLandscape ? 297 : 210;
        const pageHeight = isLandscape ? 210 : 297;

        // Calculate single-page height on the canvas matching the document's natural page boundary
        const canvasPageHeight = Math.round(canvas.width * naturalRatio);

        // Calculate render dimensions on standardized A4 page
        let renderWidth = pageWidth;
        let renderHeight = Math.min(pageHeight, pageWidth * naturalRatio);
        if (renderHeight > pageHeight) {
          renderHeight = pageHeight;
          renderWidth = pageHeight / naturalRatio;
        }
        const posX = (pageWidth - renderWidth) / 2;
        const posY = (pageHeight - renderHeight) / 2;

        // Parse margins from docx-preview styling (scale 1.5 to match html2canvas scale)
        const compStyle = window.getComputedStyle(pageEl);
        const topMarginPx = Math.round((parseFloat(compStyle.paddingTop) || 0) * 1.5);
        const effectiveTopMargin = topMarginPx > 0 ? topMarginPx : Math.round(canvasPageHeight * 0.08);

        if (canvas.height <= canvasPageHeight * 1.05) {
          // Section fits cleanly on a single page
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = canvasPageHeight;
          const sliceCtx = sliceCanvas.getContext('2d');
          sliceCtx.fillStyle = '#ffffff';
          sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          sliceCtx.drawImage(
            canvas,
            0, 0, canvas.width, canvas.height,
            0, 0, canvas.width, canvas.height
          );

          const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);

          if (!pdfDoc) {
            pdfDoc = new jsPDF({
              orientation,
              unit: 'mm',
              format: 'a4',
              compress: true
            });
          } else {
            pdfDoc.addPage('a4', orientation);
          }

          pdfDoc.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
          totalRenderedPages++;

          sliceCanvas.width = 0;
          sliceCanvas.height = 0;
        } else {
          // Section spans multiple pages: slice vertically at natural page height
          let currentY = 0;
          let sliceIdx = 0;

          while (currentY < canvas.height - 20) {
            const remainingHeight = canvas.height - currentY;
            const isFirstSlice = sliceIdx === 0;
            const destY = isFirstSlice ? 0 : effectiveTopMargin;
            const targetPageCapacity = isFirstSlice
              ? canvasPageHeight
              : (canvasPageHeight - effectiveTopMargin);

            let sliceH;
            let nextY;

            if (remainingHeight <= targetPageCapacity * 1.05) {
              sliceH = remainingHeight;
              nextY = canvas.height;
            } else {
              const nominalCutY = currentY + targetPageCapacity;
              const cutY = findBestCutY(canvas, currentY, nominalCutY, canvasPageHeight);
              sliceH = cutY - currentY;
              nextY = cutY;
            }

            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = canvasPageHeight;
            const sliceCtx = sliceCanvas.getContext('2d');
            sliceCtx.fillStyle = '#ffffff';
            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);

            // Draw content slice with top margin preserved for continuation pages
            sliceCtx.drawImage(
              canvas,
              0, currentY, canvas.width, sliceH,
              0, destY, canvas.width, sliceH
            );

            const imgData = sliceCanvas.toDataURL('image/jpeg', 0.92);

            if (!pdfDoc) {
              pdfDoc = new jsPDF({
                orientation,
                unit: 'mm',
                format: 'a4',
                compress: true
              });
            } else {
              pdfDoc.addPage('a4', orientation);
            }

            pdfDoc.addImage(imgData, 'JPEG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
            totalRenderedPages++;
            sliceIdx++;

            sliceCanvas.width = 0;
            sliceCanvas.height = 0;

            currentY = nextY;
          }
        }

        // Free full section canvas
        canvas.width = 0;
        canvas.height = 0;
      }

      setStatusMessage('Finalizing PDF document...');
      setConversionProgress(95);

      const pdfBlob = pdfDoc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      // Clean offscreen DOM
      container.innerHTML = '';

      setConvertedPdfUrl(pdfUrl);
      setConvertedPdfSize(pdfBlob.size);
      setConvertedPageCount(totalRenderedPages);
      setConversionProgress(100);
      setStatusMessage('Conversion complete!');
    } catch (err) {
      console.error('Word to PDF conversion error:', err);
      if (hiddenContainerRef.current) {
        hiddenContainerRef.current.innerHTML = '';
      }
      setErrorMessage(`Conversion failed: ${err.message || 'Could not parse or render the Word document.'}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="tool-view-container">
      {/* Hidden offscreen stage for document parsing and rendering */}
      <div
        ref={hiddenContainerRef}
        className="docx-offscreen-stage"
        aria-hidden="true"
      />

      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Word to PDF</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">Word to PDF Converter</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro">
          Convert Microsoft Word (.docx) documents into clean, standardized PDF files directly in your
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

      {/* Main Interactive Tool Area */}
      <section className="converter-card" aria-label="Word to PDF tool interface">
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
            aria-label="Upload Word document by clicking or dragging and dropping"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden-file-input"
              aria-hidden="true"
            />
            <div className="dropzone-icon">📝</div>
            <h2 className="dropzone-title">Drop your Word document here</h2>
            <p className="dropzone-subtext">or click to browse your device for a .docx file</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.DOCX</span>
              <span className="dropzone-badge">Standard A4 PDF</span>
              <span className="dropzone-badge">Multi-Page Support</span>
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
              Choose Word File
            </button>
          </div>
        ) : (
          <div className="files-workbench">
            {/* Workbench Header */}
            <div className="workbench-header">
              <div className="workbench-title-box">
                <h2 className="workbench-title">Selected Word Document</h2>
                <span className="workbench-hint">
                  Verify document details before converting to PDF.
                </span>
              </div>
              <div className="workbench-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
              <div className="docx-icon-badge">DOCX</div>
              <div className="pdf-file-details">
                <div className="pdf-filename" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="pdf-meta-row">
                  <span className="pdf-meta-pill">{formatBytes(selectedFile.size)}</span>
                  <span className="pdf-meta-pill">Microsoft Word (.docx)</span>
                  <span className="pdf-meta-format">Output: Standardized PDF</span>
                </div>
              </div>
            </div>

            {/* Conversion Controls & Feedback */}
            <div className="workbench-footer">
              {!convertedPdfUrl ? (
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
                      onClick={convertWordToPdf}
                    >
                      ⚡ Convert to PDF
                    </button>
                  )}
                </div>
              ) : (
                <div className="conversion-success-card">
                  <div className="success-icon-badge">✓</div>
                  <div className="success-text-box">
                    <h3 className="success-title">Your PDF is Ready!</h3>
                    <p className="success-subtext">
                      Successfully generated <strong>{pdfFilename}</strong> ({formatBytes(convertedPdfSize)},{' '}
                      {convertedPageCount} {convertedPageCount === 1 ? 'page' : 'pages'}).
                    </p>
                  </div>
                  <div className="success-actions">
                    <a
                      href={convertedPdfUrl}
                      download={pdfFilename}
                      className="btn-primary btn-lg download-btn"
                    >
                      📥 Download PDF
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
          <h2 className="info-heading">How to Convert Word to PDF Online</h2>
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3 className="step-title">Select Your Word Document</h3>
              <p className="step-desc">
                Click "Choose Word File" or drag and drop your <code>.docx</code> document into the upload area.
                The document is loaded securely inside your web browser.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3 className="step-title">Render & Convert</h3>
              <p className="step-desc">
                Click "Convert to PDF". The tool parses paragraphs, headings, and formatting locally,
                generating standardized high-fidelity PDF pages.
              </p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3 className="step-title">Download PDF File</h3>
              <p className="step-desc">
                Click "Download PDF" to save your clean, ready-to-share document instantly.
                Universally readable across all devices and operating systems.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="info-block">
          <h2 className="info-heading">Key Features of FixMyFile Word to PDF</h2>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <h3 className="feature-title">100% Client-Side Privacy</h3>
              <p className="feature-desc">
                Your Word documents are parsed and converted entirely on your computer or mobile device.
                Confidential business or personal files never touch any third-party servers.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📄</span>
              <h3 className="feature-title">Standardized A4 Output</h3>
              <p className="feature-desc">
                Generates universally formatted A4 PDF pages with consistent typography, margins,
                and layout preserved from your Word source.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📑</span>
              <h3 className="feature-title">Multi-Page Document Support</h3>
              <p className="feature-desc">
                Seamlessly renders multi-page Word files, keeping page breaks in order and structuring
                multi-page documents accurately.
              </p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <h3 className="feature-title">Instant & Free</h3>
              <p className="feature-desc">
                No software installation, account signups, subscriptions, or file watermarks.
                Convert unlimited Word documents right when you need them.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="info-block">
          <h2 className="info-heading">Frequently Asked Questions</h2>
          <div className="faq-list">
            <div className="faq-item">
              <h3 className="faq-question">Are my Word files uploaded to your servers?</h3>
              <p className="faq-answer">
                No. FixMyFile executes all document parsing and PDF rendering directly in your browser
                using client-side JavaScript. Your documents never leave your machine.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Can I convert older .doc files?</h3>
              <p className="faq-answer">
                This tool is optimized for modern Office Open XML format (<code>.docx</code>). If you have an older
                binary <code>.doc</code> file, simply open it in Word, Google Docs, or LibreOffice and save it as <code>.docx</code> first.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Does the converted PDF retain formatting?</h3>
              <p className="faq-answer">
                Yes. Standard formatting including headings, paragraph spacing, bold/italic text styles, and page breaks
                are preserved during client-side rendering.
              </p>
            </div>
            <div className="faq-item">
              <h3 className="faq-question">Is there a limit on file size or page count?</h3>
              <p className="faq-answer">
                Because processing occurs locally in your browser memory, standard multi-page documents convert
                swiftly without artificial upload caps or server queue delays.
              </p>
            </div>
          </div>
        </div>

        {/* Related Tools */}
        <div className="info-block">
          <h2 className="info-heading">Explore Other FixMyFile Tools</h2>
          <div className="related-tools-grid">
            <Link to="/pdf-to-word" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">PDF to Word</h3>
              <p className="related-desc">Convert PDF documents into editable Word DOCX files.</p>
            </Link>
            <Link to="/jpg-to-pdf" className="related-tool-card">
              <span className="related-badge">PDF Tool</span>
              <h3 className="related-title">JPG to PDF</h3>
              <p className="related-desc">Convert JPG images into clean, formatted PDF documents.</p>
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
              <p className="related-desc">Reduce PDF file size while preserving optimal visual quality.</p>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
