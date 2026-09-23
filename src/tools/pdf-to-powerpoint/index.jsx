import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { getToolByPath } from '../toolsRegistry';
import { convertPdfToPowerpoint } from './powerpointEngine';
import { formatBytes } from '../../utils/helpers';

// Configure PDF.js worker URL for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToPowerPointTool() {
  const toolMeta = getToolByPath('/pdf-to-powerpoint');
  const [selectedFile, setSelectedFile] = useState(null);
  const [pdfMeta, setPdfMeta] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [convertedPptxUrl, setConvertedPptxUrl] = useState(null);
  const [convertedPptxSize, setConvertedPptxSize] = useState(null);
  const [convertedPptxFilename, setConvertedPptxFilename] = useState('presentation.pptx');
  const [slideCount, setSlideCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (convertedPptxUrl) {
        URL.revokeObjectURL(convertedPptxUrl);
      }
    };
  }, [convertedPptxUrl]);

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

    if (convertedPptxUrl) {
      URL.revokeObjectURL(convertedPptxUrl);
      setConvertedPptxUrl(null);
    }
    setConvertedPptxSize(null);
    setSlideCount(0);
    setSelectedFile(file);
    setStatusMessage('Inspecting PDF document...');

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
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
    if (convertedPptxUrl) {
      URL.revokeObjectURL(convertedPptxUrl);
    }
    setSelectedFile(null);
    setPdfMeta(null);
    setIsConverting(false);
    setConversionProgress(0);
    setStatusMessage('');
    setConvertedPptxUrl(null);
    setConvertedPptxSize(null);
    setConvertedPptxFilename('presentation.pptx');
    setSlideCount(0);
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
    setStatusMessage('Initializing PowerPoint conversion engine...');

    try {
      const baseName = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'presentation';

      const result = await convertPdfToPowerpoint(pdfMeta.pdfDoc, {
        baseFilename: baseName,
        pdfjsLib,
        onProgress: (pct, msg) => {
          setConversionProgress(pct);
          setStatusMessage(msg);
        }
      });

      const url = URL.createObjectURL(result.blob);
      setConvertedPptxUrl(url);
      setConvertedPptxSize(result.buffer.byteLength);
      setConvertedPptxFilename(result.filename);
      setSlideCount(result.slideCount);
      setConversionProgress(100);
      setStatusMessage('Conversion completed successfully!');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to convert PDF to PowerPoint.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedPptxUrl) return;
    const a = document.createElement('a');
    a.href = convertedPptxUrl;
    a.download = convertedPptxFilename;
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
        <span className="breadcrumb-current">PDF to PowerPoint</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header tool-header-area">
        <div className="tool-title-row">
          <h1 className="tool-h1 tool-main-title">PDF to PowerPoint Converter</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-intro tool-main-desc">
          Convert PDF documents into genuine Microsoft PowerPoint (.pptx) presentations directly in your browser.
          High-definition slide rendering with page notes preserved. 100% private.
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
            aria-label="Upload PDF to convert to PowerPoint"
          >
            <input
              id="file-input-pptx"
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
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className="dropzone-title">Upload your PDF document</h3>
            <p className="dropzone-subtext dropzone-subtitle">Drag & drop your PDF here, or click to browse</p>
            <button
              id="choose-pptx-file-btn"
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
              <span className="dropzone-badge">Genuine .PPTX</span>
              <span className="dropzone-badge">100% Private</span>
              <span className="dropzone-badge">Browser-based</span>
            </div>
          </div>
        ) : (
          <div className="split-controls-area">
            {/* Selected File Card */}
            <div className="split-file-meta-card">
              <div className="split-file-icon" aria-hidden="true">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D9381E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="split-file-info">
                <div className="split-file-name" title={selectedFile.name}>
                  {selectedFile.name}
                </div>
                <div className="split-file-details">
                  <span>{formatBytes(selectedFile.size)}</span>
                  <span className="bullet-dot">•</span>
                  <span id="pptx-page-count">{pdfMeta ? `${pdfMeta.pageCount} ${pdfMeta.pageCount === 1 ? 'slide' : 'slides'}` : 'Analyzing...'}</span>
                </div>
              </div>
              <button
                id="reset-pptx-btn"
                type="button"
                className="split-change-file-btn"
                onClick={resetAll}
                disabled={isConverting}
                title="Change or remove selected file"
              >
                Change File
              </button>
            </div>

            {/* Conversion Details Notice */}
            <div className="split-burst-hint" style={{ marginTop: '1rem', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '0.85rem 1.15rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.25rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1677FF" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                High-Definition Slide Packaging
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                Each page is rendered at 2x resolution to maintain crisp vector-like visuals in PowerPoint. Slide dimensions are dynamically fitted to your PDF's aspect ratio, and selectable text is saved in slide speaker notes.
              </p>
            </div>

            {/* Action Section */}
            <div className="split-action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                id="convert-pptx-btn"
                type="button"
                className="workbench-btn-primary"
                onClick={executeConversion}
                disabled={isConverting || !pdfMeta}
                style={{ minWidth: '220px' }}
              >
                {isConverting ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner-small" /> Converting...
                  </span>
                ) : (
                  'Convert to PowerPoint (.pptx)'
                )}
              </button>

              <button
                id="reset-pptx-action-btn"
                type="button"
                className="workbench-btn-secondary"
                onClick={resetAll}
                disabled={isConverting}
              >
                Reset
              </button>
            </div>

            {/* Live Progress Bar */}
            {isConverting && (
              <div style={{ marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#475569', marginBottom: '0.35rem' }}>
                  <span>{statusMessage || 'Converting PDF slides...'}</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{conversionProgress}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${conversionProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #1677FF 0%, #5B5CF0 100%)',
                      transition: 'width 0.25s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Converted Result Card */}
            {convertedPptxUrl && !isConverting && (
              <div style={{ marginTop: '1.75rem', padding: '1.25rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.95rem' }}>
                        Conversion Complete!
                      </div>
                      <div id="pptx-result-meta" style={{ fontSize: '0.825rem', color: '#15803D' }}>
                        {convertedPptxFilename} • {formatBytes(convertedPptxSize)} • {slideCount} {slideCount === 1 ? 'slide' : 'slides'}
                      </div>
                    </div>
                  </div>

                  <button
                    id="download-pptx-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={handleDownload}
                    style={{ background: '#16A34A', borderColor: '#16A34A' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Presentation (.pptx)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="tool-error-alert" style={{ marginTop: '1rem' }} role="alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Feature & FAQ Content Section */}
      <div className="tool-info-section" style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0F172A', marginBottom: '1.25rem' }}>
          Why Convert PDF to PowerPoint with FixMyFile?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              Genuine OpenXML .PPTX
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Generates compliant Microsoft PowerPoint presentation packages that open cleanly in PowerPoint, Google Slides, Keynote, and LibreOffice.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              High-DPI 2x Rendering
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Each slide is rendered at double density to preserve diagrams, typography, and charts with crystal clear fidelity.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              Zero Server Uploads
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              All processing happens entirely in your local browser using client-side JavaScript. Your confidential pitch decks and documents never touch a remote server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
