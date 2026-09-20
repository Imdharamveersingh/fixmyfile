import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getToolByPath } from '../toolsRegistry';
import { getPdfRotationMeta, rotatePdf, normalizeRotation } from './rotateEngine';
import { formatBytes } from '../../utils/helpers';

export default function RotatePdfTool() {
  const toolMeta = getToolByPath('/rotate-pdf');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageRotations, setPageRotations] = useState({}); // { 1: 0, 2: 90, ... }
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [outputFilename, setOutputFilename] = useState('rotated.pdf');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Revoke object URL on unmount or reset
  useEffect(() => {
    return () => {
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
    };
  }, [outputUrl]);

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

    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }
    setOutputSize(null);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      const meta = await getPdfRotationMeta(buffer);
      setFileBuffer(buffer);
      setPageCount(meta.pageCount);

      // Initialize rotation map
      const initialMap = {};
      meta.rotations.forEach((angle, idx) => {
        initialMap[idx + 1] = angle;
      });
      setPageRotations(initialMap);
    } catch (err) {
      setErrorMessage(
        `Unable to read PDF: ${err.message || 'Corrupted or password-protected document.'}`
      );
      setSelectedFile(null);
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

  const rotateSinglePage = (pageNum, delta) => {
    setPageRotations((prev) => {
      const current = prev[pageNum] !== undefined ? prev[pageNum] : 0;
      return {
        ...prev,
        [pageNum]: normalizeRotation(current + delta)
      };
    });
    // Invalidate previously generated output if rotations change
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }
  };

  const rotateAllPages = (delta) => {
    setPageRotations((prev) => {
      const updated = {};
      for (let i = 1; i <= pageCount; i++) {
        const cur = prev[i] !== undefined ? prev[i] : 0;
        updated[i] = normalizeRotation(cur + delta);
      }
      return updated;
    });
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }
  };

  const resetAllRotations = () => {
    const cleared = {};
    for (let i = 1; i <= pageCount; i++) {
      cleared[i] = 0;
    }
    setPageRotations(cleared);
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }
  };

  const resetAll = () => {
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }
    setSelectedFile(null);
    setFileBuffer(null);
    setPageCount(0);
    setPageRotations({});
    setIsProcessing(false);
    setOutputUrl(null);
    setOutputSize(null);
    setOutputFilename('rotated.pdf');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeRotation = async () => {
    if (!fileBuffer) {
      setErrorMessage('Please upload a PDF document first.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const baseName = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const result = await rotatePdf(fileBuffer, pageRotations, { baseFilename: baseName });

      const url = URL.createObjectURL(result.blob);
      setOutputUrl(url);
      setOutputSize(result.buffer.byteLength);
      setOutputFilename(result.filename);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to rotate PDF pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = outputFilename;
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
        <span className="breadcrumb-current">Rotate PDF</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header tool-header-area">
        <div className="tool-title-row">
          <h1 className="tool-h1 tool-main-title">Rotate PDF Pages</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
          <span className="tool-badge-accent">{toolMeta?.phase || 'Phase 4'}</span>
        </div>
        <p className="tool-intro tool-main-desc">
          Rotate individual PDF pages or all pages simultaneously. Permanently align orientations clockwise or counter-clockwise with 100% privacy in your browser.
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
            aria-label="Upload PDF to rotate pages"
          >
            <input
              id="file-input-rotate"
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
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
            </div>
            <h3 className="dropzone-title">Upload your PDF document</h3>
            <p className="dropzone-subtext dropzone-subtitle">Drag & drop your PDF here, or click to browse</p>
            <button
              id="choose-rotate-file-btn"
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
              <span className="dropzone-badge">Per-Page Control</span>
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
                  <span id="rotate-page-count">{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                </div>
              </div>
              <button
                id="reset-rotate-btn"
                type="button"
                className="split-change-file-btn"
                onClick={resetAll}
                disabled={isProcessing}
                title="Change or remove selected file"
              >
                Change File
              </button>
            </div>

            {/* Bulk Rotation Controls Toolbar */}
            <div
              style={{
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                background: '#F8FAFC',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0F172A' }}>
                Batch Actions:
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  id="rotate-all-left-btn"
                  type="button"
                  className="workbench-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.825rem' }}
                  onClick={() => rotateAllPages(-90)}
                  disabled={isProcessing}
                >
                  ↺ Rotate All -90°
                </button>
                <button
                  id="rotate-all-right-btn"
                  type="button"
                  className="workbench-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.825rem' }}
                  onClick={() => rotateAllPages(90)}
                  disabled={isProcessing}
                >
                  ↻ Rotate All +90°
                </button>
                <button
                  id="rotate-all-reset-btn"
                  type="button"
                  className="workbench-btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.825rem' }}
                  onClick={resetAllRotations}
                  disabled={isProcessing}
                >
                  Reset All to 0°
                </button>
              </div>
            </div>

            {/* Interactive Page Thumbnails Grid */}
            <div
              id="rotate-pages-grid"
              style={{
                marginTop: '1.25rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '1rem',
                maxHeight: '440px',
                overflowY: 'auto',
                padding: '0.5rem',
                border: '1px solid #F1F5F9',
                borderRadius: '8px'
              }}
            >
              {Array.from({ length: pageCount }, (_, idx) => {
                const pageNum = idx + 1;
                const angle = pageRotations[pageNum] || 0;

                return (
                  <div
                    key={pageNum}
                    id={`page-card-${pageNum}`}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Visual Page Representation with Rotation Transform */}
                    <div
                      style={{
                        width: '80px',
                        height: '110px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '0.65rem'
                      }}
                    >
                      <div
                        style={{
                          width: '64px',
                          height: '90px',
                          background: '#FFFFFF',
                          border: '1.5px solid #CBD5E1',
                          borderRadius: '4px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transform: `rotate(${angle}deg)`,
                          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative'
                        }}
                      >
                        {/* Top margin bar to visually indicate "up" */}
                        <div
                          style={{
                            width: '80%',
                            height: '4px',
                            background: '#1677FF',
                            borderRadius: '2px',
                            marginBottom: '6px'
                          }}
                        />
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#334155' }}>
                          P. {pageNum}
                        </div>
                      </div>
                    </div>

                    {/* Page Number & Current Angle Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>
                        Page {pageNum}
                      </span>
                      <span
                        className="page-angle-badge"
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '12px',
                          background: angle !== 0 ? '#EFF6FF' : '#F1F5F9',
                          color: angle !== 0 ? '#1677FF' : '#64748B'
                        }}
                      >
                        {angle}°
                      </span>
                    </div>

                    {/* Per-Page Rotation Buttons */}
                    <div style={{ display: 'flex', gap: '0.35rem', width: '100%' }}>
                      <button
                        type="button"
                        id={`rotate-left-p${pageNum}`}
                        title={`Rotate Page ${pageNum} counter-clockwise 90°`}
                        aria-label={`Rotate Page ${pageNum} counter-clockwise 90°`}
                        onClick={() => rotateSinglePage(pageNum, -90)}
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          fontSize: '0.75rem',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#334155'
                        }}
                      >
                        ↺ -90°
                      </button>
                      <button
                        type="button"
                        id={`rotate-right-p${pageNum}`}
                        title={`Rotate Page ${pageNum} clockwise 90°`}
                        aria-label={`Rotate Page ${pageNum} clockwise 90°`}
                        onClick={() => rotateSinglePage(pageNum, 90)}
                        style={{
                          flex: 1,
                          padding: '4px 0',
                          fontSize: '0.75rem',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#334155'
                        }}
                      >
                        ↻ +90°
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Section */}
            <div className="split-action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                id="rotate-pdf-action-btn"
                type="button"
                className="workbench-btn-primary"
                onClick={executeRotation}
                disabled={isProcessing || pageCount === 0}
                style={{ minWidth: '220px' }}
              >
                {isProcessing ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner-small" /> Saving PDF...
                  </span>
                ) : (
                  'Apply & Save Rotated PDF'
                )}
              </button>

              <button
                id="reset-rotate-action-btn"
                type="button"
                className="workbench-btn-secondary"
                onClick={resetAll}
                disabled={isProcessing}
              >
                Reset
              </button>
            </div>

            {/* Rotated Result Card */}
            {outputUrl && !isProcessing && (
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
                        Rotation Applied Successfully!
                      </div>
                      <div id="rotate-result-meta" style={{ fontSize: '0.825rem', color: '#15803D' }}>
                        {outputFilename} • {formatBytes(outputSize)} • {pageCount} {pageCount === 1 ? 'page' : 'pages'}
                      </div>
                    </div>
                  </div>

                  <button
                    id="download-rotated-pdf-btn"
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
                    Download Rotated PDF
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
          Why Rotate PDF Pages with FixMyFile?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              Per-Page & Bulk Control
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Rotate individual pages independently (e.g. Page 1 at 90°, Page 3 at 180°) or rotate the entire document in bulk with one click.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              Lossless Transformation
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Rotates page coordinate viewports without re-rasterizing text or degrading image resolution. Crisp fonts and vector elements stay intact.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              100% Client-Side Privacy
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Processed locally using web standards. No files are transmitted or stored on remote servers, keeping sensitive documents safe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
