import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { checkPdfStatus, unlockPdf } from './unlockEngine';
import { formatBytes } from '../../utils/helpers';

// Configure PDF.js worker URL for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function UnlockPdfTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [pdfStatus, setPdfStatus] = useState(null); // { isEncrypted, requiresPassword, isOwnerOnly, pageCount }
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({ stage: '', percent: 0, message: '' });
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputSize, setOutputSize] = useState(null);
  const [outputFilename, setOutputFilename] = useState('document-unlocked.pdf');
  const [outputPageCount, setOutputPageCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // SEO Page Title & Meta Description
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Unlock PDF Online — Remove Password & Restrictions | FixMyFile';

    let metaDesc = document.querySelector('meta[name="description"]');
    let createdMeta = false;
    let prevMetaContent = '';

    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
      createdMeta = true;
    } else {
      prevMetaContent = metaDesc.getAttribute('content') || '';
    }

    metaDesc.setAttribute(
      'content',
      'Remove password protection and security restrictions from PDF files online for free. 100% private, client-side decryption with zero server uploads.'
    );

    return () => {
      document.title = prevTitle;
      if (createdMeta && metaDesc.parentNode) {
        metaDesc.parentNode.removeChild(metaDesc);
      } else if (metaDesc) {
        metaDesc.setAttribute('content', prevMetaContent);
      }
    };
  }, []);

  // Clean up object URLs and memory on unmount
  useEffect(() => {
    return () => {
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
      setPassword('');
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
    setOutputPageCount(0);
    setSelectedFile(file);
    setPassword('');
    setPdfStatus(null);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);

      const status = await checkPdfStatus(buffer, pdfjsLib);
      setPdfStatus(status);
    } catch (err) {
      setErrorMessage(`Unable to inspect PDF: ${err.message || 'Corrupted or unsupported document.'}`);
      setSelectedFile(null);
      setFileBuffer(null);
      setPdfStatus(null);
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
    setPdfStatus(null);
    setPassword('');
    setShowPassword(false);
    setIsProcessing(false);
    setProgressState({ stage: '', percent: 0, message: '' });
    setOutputUrl(null);
    setOutputSize(null);
    setOutputFilename('document-unlocked.pdf');
    setOutputPageCount(0);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeUnlock = async () => {
    if (!fileBuffer) {
      setErrorMessage('Please upload a PDF document first.');
      return;
    }

    if (pdfStatus?.requiresPassword && (!password || password.trim() === '')) {
      setErrorMessage('Please enter the password to unlock this document.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressState({ stage: 'starting', percent: 5, message: 'Initializing decryption engine...' });

    try {
      const baseName = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const result = await unlockPdf(fileBuffer, password, {
        pdfjsLib,
        scale: 2.0,
        baseFilename: baseName,
        onProgress: (state) => {
          setProgressState(state);
        }
      });

      const url = URL.createObjectURL(result.blob);
      setOutputUrl(url);
      setOutputSize(result.buffer.byteLength);
      setOutputFilename(result.filename);
      setOutputPageCount(result.pageCount);

      // Wipe password from memory for security
      setPassword('');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to unlock PDF document.');
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
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="unlock-pdf"
        title="Unlock PDF — Remove Password"
        description="Remove password protection and permissions security from your PDF documents completely in your browser. 100% private, client-side processing with zero server uploads."
      />

      {/* Main Workbench Card */}
      <div className="converter-card workbench-card">
        {!selectedFile ? (
          <div
            id="unlock-pdf-dropzone"
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
          >
            <input
              id="unlock-pdf-file-input"
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              aria-label="Upload PDF file"
            />
            <div className="dropzone-icon-wrapper" aria-hidden="true">
            <ToolIcon icon="unlock-pdf" size={48} />
          </div>
            <h3 className="dropzone-title">Select a protected PDF to unlock</h3>
            <p className="dropzone-subtitle">
              Drag &amp; drop a PDF here, or click to browse from your device
            </p>
            <div className="dropzone-tags">
              <span className="dropzone-tag">Max file size: 50MB</span>
            </div>
          </div>
        ) : (
          <div className="tool-workbench-content">
            {/* File Info Bar */}
            <div className="file-info-bar">
              <div className="file-info-details">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="file-pdf-icon"
                  aria-hidden="true"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <path d="M8 13h2" />
                  <path d="M8 17h6" />
                </svg>
                <div className="file-meta-texts">
                  <div id="unlock-file-name" className="file-name-title" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div id="unlock-file-size" className="file-size-badge">
                    {formatBytes(selectedFile.size)}
                    {pdfStatus?.pageCount ? ` · ${pdfStatus.pageCount} page${pdfStatus.pageCount > 1 ? 's' : ''}` : ''}
                  </div>
                </div>
              </div>
              <button
                id="change-file-btn"
                type="button"
                className="btn-change-file"
                onClick={resetAll}
                disabled={isProcessing}
              >
                Change File
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div id="unlock-error-banner" className="tool-error-banner" role="alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Case A: Already Unencrypted PDF */}
            {pdfStatus && !pdfStatus.isEncrypted && !outputUrl && (
              <div id="already-unlocked-panel" style={{ textAlign: 'center', padding: '2rem 1.5rem', background: '#F8FAFC', borderRadius: '10px', marginTop: '1.25rem' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✓</div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#1E293B', marginBottom: '0.5rem' }}>
                  This PDF is not password-protected
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
                  The uploaded document has no open password and no restriction encryption. It can already be opened and modified without any unlock process.
                </p>
                <button
                  id="unlocked-choose-another-btn"
                  type="button"
                  className="workbench-btn-primary"
                  onClick={resetAll}
                  style={{ maxWidth: '240px', margin: '0 auto' }}
                >
                  Choose Another PDF
                </button>
              </div>
            )}

            {/* Case B: Owner-only restricted PDF (No open password needed) */}
            {pdfStatus?.isEncrypted && pdfStatus?.isOwnerOnly && !outputUrl && (
              <div id="owner-restricted-panel" style={{ padding: '1.5rem', background: '#F8FAFC', borderRadius: '10px', marginTop: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.75rem' }}>🔓</span>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#1E293B', margin: 0 }}>
                      Permission Restrictions Detected
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0.2rem 0 0' }}>
                      This document has printing/copying restrictions but does not require an open password. Click Unlock to generate an unrestricted clean copy.
                    </p>
                  </div>
                </div>

                <div className="split-action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    id="unlock-restrictions-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={executeUnlock}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-small" /> Unlocking PDF...
                      </span>
                    ) : (
                      '🔓 Remove PDF Restrictions'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Case C: User Password Protected PDF */}
            {pdfStatus?.isEncrypted && pdfStatus?.requiresPassword && !outputUrl && (
              <div id="password-required-panel" style={{ marginTop: '1.25rem' }}>
                <div style={{ padding: '1.25rem', background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400E', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <span>Password Required to Unlock</span>
                  </div>
                  <p style={{ color: '#B45309', fontSize: '0.875rem', margin: 0, lineHeight: 1.5 }}>
                    This PDF is encrypted with an open password. Enter the document password below to authenticate, decrypt, and save an unrestricted copy.
                  </p>
                </div>

                <div style={{ maxWidth: '440px' }}>
                  <label htmlFor="unlock-password-input" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Document Password
                  </label>
                  <div className="protect-input-wrap">
                    <input
                      id="unlock-password-input"
                      type={showPassword ? 'text' : 'password'}
                      className="protect-input"
                      placeholder="Enter PDF password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          executeUnlock();
                        }
                      }}
                      disabled={isProcessing}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="protect-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress bar during decryption */}
                {isProcessing && (
                  <div style={{ marginTop: '1.25rem', maxWidth: '440px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748B', marginBottom: '0.4rem' }}>
                      <span>{progressState.message || 'Processing document...'}</span>
                      <span>{progressState.percent}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressState.percent}%`,
                          height: '100%',
                          background: '#3B82F6',
                          transition: 'width 0.25s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Section */}
                <div className="split-action-row" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    id="unlock-pdf-action-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={executeUnlock}
                    disabled={isProcessing || !password.trim()}
                    style={{ minWidth: '220px' }}
                  >
                    {isProcessing ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-small" /> Unlocking Document...
                      </span>
                    ) : (
                      '🔓 Unlock PDF Document'
                    )}
                  </button>

                  <button
                    id="reset-unlock-action-btn"
                    type="button"
                    className="workbench-btn-secondary"
                    onClick={resetAll}
                    disabled={isProcessing}
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Output / Success State */}
            {outputUrl && !isProcessing && (
              <div id="unlock-success-card" style={{ marginTop: '1.75rem', padding: '1.25rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '8px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.95rem' }}>
                        PDF Successfully Unlocked!
                      </div>
                      <div id="unlock-result-meta" style={{ fontSize: '0.825rem', color: '#15803D' }}>
                        {outputFilename} • {formatBytes(outputSize)} • {outputPageCount} page{outputPageCount > 1 ? 's' : ''} • Protection Removed
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button
                      id="download-unlocked-pdf-btn"
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
                      Download Unlocked PDF
                    </button>
                    <button
                      id="unlock-another-btn"
                      type="button"
                      className="workbench-btn-secondary"
                      onClick={resetAll}
                    >
                      Unlock Another PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="unlock-pdf" />
    </div>
  );
}
