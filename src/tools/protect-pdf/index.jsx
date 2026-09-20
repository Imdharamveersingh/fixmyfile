import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { getToolByPath } from '../toolsRegistry';
import { protectPdf } from './protectEngine';
import { formatBytes } from '../../utils/helpers';

// Configure PDF.js worker URL for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function ProtectPdfTool() {
  const toolMeta = getToolByPath('/protect-pdf');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [outputFilename, setOutputFilename] = useState('protected.pdf');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // Clean up object URLs and memory on unmount
  useEffect(() => {
    return () => {
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
      setPassword('');
      setConfirmPassword('');
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
      const loadingTask = pdfjsLib.getDocument({
        data: buffer.slice(0),
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      const pdfDoc = await loadingTask.promise;

      setFileBuffer(buffer);
      setPageCount(pdfDoc.numPages);
    } catch (err) {
      if (err.name === 'PasswordException') {
        setErrorMessage('This PDF is already password-protected. Please provide an unprotected PDF.');
      } else {
        setErrorMessage(
          `Unable to read PDF: ${err.message || 'Corrupted or invalid document.'}`
        );
      }
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

  const resetAll = () => {
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }
    setSelectedFile(null);
    setFileBuffer(null);
    setPageCount(0);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setIsProcessing(false);
    setOutputUrl(null);
    setOutputSize(null);
    setOutputFilename('protected.pdf');
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeProtection = async () => {
    if (!fileBuffer) {
      setErrorMessage('Please upload a PDF document first.');
      return;
    }

    if (!password || password.trim() === '') {
      setErrorMessage('Please enter a password to protect the document.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const baseName = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const result = await protectPdf(fileBuffer, password, {
        confirmPassword,
        baseFilename: baseName,
        algorithm: 'AES-256'
      });

      const url = URL.createObjectURL(result.blob);
      setOutputUrl(url);
      setOutputSize(result.buffer.byteLength);
      setOutputFilename(result.filename);

      // Clear password inputs from memory and state for security
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to encrypt and protect PDF.');
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
        <span className="breadcrumb-current">Protect PDF</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header tool-header-area">
        <div className="tool-title-row">
          <h1 className="tool-h1 tool-main-title">Protect PDF with Password</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
          <span className="tool-badge-accent">{toolMeta?.phase || 'Phase 4'}</span>
        </div>
        <p className="tool-intro tool-main-desc">
          Encrypt your PDF with standard military-grade AES-256 bit encryption directly in your browser.
          100% private with zero server uploads.
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
            aria-label="Upload PDF to protect with password"
          >
            <input
              id="file-input-protect"
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
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="dropzone-title">Upload your PDF document</h3>
            <p className="dropzone-subtext dropzone-subtitle">Drag & drop your PDF here, or click to browse</p>
            <button
              id="choose-protect-file-btn"
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
              <span className="dropzone-badge">AES-256 Encryption</span>
              <span className="dropzone-badge">100% Private</span>
              <span className="dropzone-badge">Zero Server Uploads</span>
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
                  <span id="protect-page-count">{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
                </div>
              </div>
              <button
                id="reset-protect-btn"
                type="button"
                className="split-change-file-btn"
                onClick={resetAll}
                disabled={isProcessing}
                title="Change or remove selected file"
              >
                Change File
              </button>
            </div>

            {/* Password Configuration Section */}
            <div
              style={{
                marginTop: '1.25rem',
                padding: '1.25rem',
                background: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1677FF" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  Set Document Password
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: '#DBEAFE', color: '#1E40AF' }}>
                  Standard AES-256 Bit
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label
                    htmlFor="protect-password-input"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}
                  >
                    Enter Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="protect-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter strong password"
                      autoComplete="new-password"
                      disabled={isProcessing}
                      style={{
                        width: '100%',
                        padding: '9px 40px 9px 12px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        boxSizing: 'border-box'
                      }}
                    />
                    <button
                      id="toggle-password-visibility"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      title={showPassword ? 'Hide password' : 'Show password'}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#64748B',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="protect-confirm-input"
                    style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}
                  >
                    Confirm Password
                  </label>
                  <input
                    id="protect-confirm-input"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    disabled={isProcessing}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: `1px solid ${
                        confirmPassword && confirmPassword !== password ? '#EF4444' : '#CBD5E1'
                      }`,
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      boxSizing: 'border-box'
                    }}
                  />
                  {confirmPassword && confirmPassword !== password && (
                    <div style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '4px' }}>
                      Passwords do not match
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: '0.85rem', fontSize: '0.8rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                Passwords are never stored, logged, or transmitted. Keep your password safe.
              </div>
            </div>

            {/* Action Section */}
            <div className="split-action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                id="protect-pdf-action-btn"
                type="button"
                className="workbench-btn-primary"
                onClick={executeProtection}
                disabled={isProcessing || !password || password !== confirmPassword}
                style={{ minWidth: '220px' }}
              >
                {isProcessing ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <span className="spinner-small" /> Encrypting PDF...
                  </span>
                ) : (
                  'Protect PDF with Password'
                )}
              </button>

              <button
                id="reset-protect-action-btn"
                type="button"
                className="workbench-btn-secondary"
                onClick={resetAll}
                disabled={isProcessing}
              >
                Reset
              </button>
            </div>

            {/* Protected Result Card */}
            {outputUrl && !isProcessing && (
              <div style={{ marginTop: '1.75rem', padding: '1.25rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.95rem' }}>
                        PDF Protected Successfully!
                      </div>
                      <div id="protect-result-meta" style={{ fontSize: '0.825rem', color: '#15803D' }}>
                        {outputFilename} • {formatBytes(outputSize)} • AES-256 Encrypted
                      </div>
                    </div>
                  </div>

                  <button
                    id="download-protected-pdf-btn"
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
                    Download Protected PDF
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
          Why Protect PDF with FixMyFile?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              Genuine AES-256 Encryption
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Protects documents using genuine AES-256 standard encryption. Requires the password to open in Adobe Acrobat, Chrome, Apple Preview, and mobile viewers.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              Zero Server Uploads
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Your file and password never leave your device. Encryption is computed locally in web browser memory with cryptographic randomness.
            </p>
          </div>

          <div style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>
              No Password Storage
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#475569', margin: 0, lineHeight: 1.5 }}>
              Passwords are automatically cleared from state upon encryption or reset, ensuring no traces remain in browser history or session storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
