import React, { useState, useRef, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { getToolByPath } from '../toolsRegistry';
import { convertPdfToExcel } from './excelEngine';
import { formatBytes } from '../../utils/helpers';

// Configure PDF.js worker URL for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToExcelTool() {
  const toolMeta = getToolByPath('/pdf-to-excel');
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [convertedXlsxUrl, setConvertedXlsxUrl] = useState(null);
  const [convertedXlsxSize, setConvertedXlsxSize] = useState(null);
  const [convertedXlsxFilename, setConvertedXlsxFilename] = useState('converted.xlsx');
  const [extractedStats, setExtractedStats] = useState(null); // { sheetCount, totalRows }
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const fileInputId = useId();

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedXlsxUrl) {
        URL.revokeObjectURL(convertedXlsxUrl);
      }
    };
  }, [convertedXlsxUrl]);

  const openFilePicker = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileSelect = async (file) => {
    setErrorMessage(null);
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setErrorMessage('Please select a valid PDF (.pdf) file.');
      return;
    }

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes). Please upload a valid document.');
      return;
    }

    if (convertedXlsxUrl) {
      URL.revokeObjectURL(convertedXlsxUrl);
      setConvertedXlsxUrl(null);
    }
    setConvertedXlsxSize(null);
    setExtractedStats(null);
    setSelectedFile(file);
    setStatusMessage('Inspecting PDF document...');

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdfDoc = await loadingTask.promise;

      setPdfMeta({
        pageCount: pdfDoc.numPages,
        pdfDoc,
        buffer
      });
      setStatusMessage('');
    } catch (err) {
      setErrorMessage(
        `Unable to read PDF: ${err.message || 'Corrupted or password-protected format.'}`
      );
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

  const resetAll = () => {
    if (convertedXlsxUrl) {
      URL.revokeObjectURL(convertedXlsxUrl);
    }
    setSelectedFile(null);
    setPdfMeta(null);
    setIsConverting(false);
    setConversionProgress(0);
    setStatusMessage('');
    setConvertedXlsxUrl(null);
    setConvertedXlsxSize(null);
    setConvertedXlsxFilename('converted.xlsx');
    setExtractedStats(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeConversion = async () => {
    if (!pdfMeta || !pdfMeta.pdfDoc) {
      setErrorMessage('Please upload a PDF document first.');
      return;
    }

    setErrorMessage(null);
    setIsConverting(true);
    setConversionProgress(5);
    setStatusMessage('Initializing Excel conversion engine...');

    try {
      const baseName = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';

      const result = await convertPdfToExcel(
        pdfMeta.pdfDoc,
        baseName,
        (pct, msg) => {
          setConversionProgress(pct);
          setStatusMessage(msg);
        }
      );

      const url = URL.createObjectURL(result.blob);
      setConvertedXlsxUrl(url);
      setConvertedXlsxSize(result.buffer.byteLength);
      setConvertedXlsxFilename(result.filename);
      setExtractedStats({
        sheetCount: result.sheetCount,
        totalRows: result.totalRows
      });
      setConversionProgress(100);
      setStatusMessage('Conversion completed successfully!');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to convert PDF to Excel.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedXlsxUrl) return;
    const a = document.createElement('a');
    a.href = convertedXlsxUrl;
    a.download = convertedXlsxFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="tool-view-container tool-page-container">
      {/* Breadcrumb / Top Bar */}
      <nav className="breadcrumb-nav tool-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/" className="breadcrumb-link">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <Link to="/#tools-phase4" className="breadcrumb-link">PDF Tools</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">PDF to Excel</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header tool-header-area">
        <div className="tool-title-row">
          <h1 className="tool-h1 tool-main-title">PDF to Excel Converter</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro tool-main-desc">
          Convert PDF tables and spreadsheets into genuine Microsoft Excel (.xlsx) workbooks directly in your browser.
          100% private with spatial column detection.
        </p>
      </header>

      {/* Main Workbench Card */}
      <div className="converter-card workbench-card">
        {!selectedFile ? (
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
            aria-label="Upload PDF to convert to Excel"
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
                <path d="M8 13h8" />
                <path d="M8 17h8" />
                <path d="M10 9h4" />
              </svg>
            </div>
            <h3 className="dropzone-title">Upload your PDF document</h3>
            <p className="dropzone-subtext dropzone-subtitle">Drag & drop your PDF here, or click to browse</p>
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
              <span className="dropzone-badge">Native XLSX</span>
              <span className="dropzone-badge">100% Private</span>
              <span className="dropzone-badge">Browser-based</span>
            </div>
          </div>
        ) : (
          <div className="split-controls-area">
            {/* Selected File Card */}
            <div className="split-file-meta-card">
              <div className="file-info-icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="file-info-details">
                <div className="file-info-name" title={selectedFile.name}>{selectedFile.name}</div>
                <div className="file-info-badges">
                  <span className="split-badge">
                    {pdfMeta ? `${pdfMeta.pageCount} ${pdfMeta.pageCount === 1 ? 'page' : 'pages'}` : 'Loading...'}
                  </span>
                  <span className="split-badge">{formatBytes(selectedFile.size)}</span>
                </div>
              </div>
              <button
                type="button"
                className="split-remove-btn"
                onClick={resetAll}
                title="Remove file"
                aria-label="Remove file"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Error Banner */}
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
            {!convertedXlsxUrl && (
              <div className="split-action-bar">
                <button
                  type="button"
                  id="convert-excel-btn"
                  className="workbench-btn-primary split-main-btn"
                  onClick={executeConversion}
                  disabled={isConverting || !pdfMeta}
                >
                  {isConverting ? 'Extracting & Converting...' : 'Convert to Excel (.xlsx)'}
                </button>
                <button
                  type="button"
                  className="workbench-btn-secondary"
                  onClick={resetAll}
                  disabled={isConverting}
                >
                  Reset
                </button>
              </div>
            )}

            {/* Progress Bar */}
            {isConverting && (
              <div className="split-progress-container">
                <div className="split-progress-bar" style={{ width: `${conversionProgress}%` }} />
                <span className="split-progress-text">{statusMessage || `${conversionProgress}%`}</span>
              </div>
            )}

            {/* Converted Output Card */}
            {convertedXlsxUrl && (
              <div className="split-results-container" id="excel-results">
                <div className="split-results-header">
                  <h3>Conversion Ready</h3>
                  <button
                    type="button"
                    className="split-quick-btn"
                    onClick={resetAll}
                  >
                    Convert Another File
                  </button>
                </div>

                <div className="split-result-item" style={{ marginTop: '10px' }}>
                  <div className="split-result-info">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#107c41' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="16" y2="17" />
                    </svg>
                    <div>
                      <div className="split-result-filename">{convertedXlsxFilename}</div>
                      <div className="split-result-meta">
                        {convertedXlsxSize ? formatBytes(convertedXlsxSize) : ''}
                        {extractedStats ? ` • ${extractedStats.totalRows} rows across ${extractedStats.sheetCount} sheets` : ''}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    id="download-excel-btn"
                    className="workbench-btn-primary split-download-item-btn"
                    onClick={handleDownload}
                  >
                    Download Excel (.xlsx)
                  </button>
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
          <strong>100% Private & Browser-Based:</strong> Your PDF tables are parsed directly in your browser.
          No document data is ever uploaded to a remote server.
        </span>
      </div>

      {/* Guides & FAQ */}
      <div className="tool-guide-section">
        <div className="tool-guide-card">
          <h2 className="tool-guide-heading">How to Convert PDF to Excel</h2>
          <ol className="tool-guide-steps">
            <li><strong>Select your PDF:</strong> Drag & drop your PDF file or browse from your device.</li>
            <li><strong>Automatic Structure Detection:</strong> The engine analyzes coordinates to reconstruct rows, columns, and numbers.</li>
            <li><strong>Convert:</strong> Click "Convert to Excel (.xlsx)" to generate the OpenXML spreadsheet.</li>
            <li><strong>Download:</strong> Save your formatted <code>.xlsx</code> file directly to your computer.</li>
          </ol>
        </div>

        <div className="tool-guide-card">
          <h2 className="tool-guide-heading">Frequently Asked Questions</h2>
          <div className="faq-item">
            <h4>Does this produce a real .xlsx file or just a renamed CSV?</h4>
            <p>FixMyFile generates a genuine OpenXML Microsoft Excel (.xlsx) workbook with real worksheets, styled headers, and numeric cell formatting.</p>
          </div>
          <div className="faq-item">
            <h4>Can it extract scanned PDF documents?</h4>
            <p>Scanned documents consisting only of raster images require optical character recognition (OCR). For best results, use documents with selectable text and tables.</p>
          </div>
          <div className="faq-item">
            <h4>Are numbers and currencies preserved?</h4>
            <p>Yes. Integer, floating point, and percentage values are converted to native spreadsheet numeric types.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
