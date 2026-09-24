import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { extractTextFromPdf, createTxtBlob } from './pdfToTextEngine';
import { formatBytes } from '../../utils/helpers';

// Configure PDF.js worker URL for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfToTextTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({ current: 0, total: 0, percent: 0, message: '' });
  const [extractedResult, setExtractedResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // SEO Page Title & Meta Description
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'PDF to Text Online — Extract Text from PDF | FixMyFile';

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
      'Extract selectable text from PDF documents into clean, formatted .txt files online for free. 100% private in-browser extraction with zero server uploads.'
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

    setExtractedResult(null);
    setSelectedFile(file);
    setCopied(false);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);

      // Inspect initial page count
      const task = pdfjsLib.getDocument({
        data: buffer.slice(0),
        isEvalSupported: false,
        useSystemFonts: true
      });
      const pdf = await task.promise;
      setPageCount(pdf.numPages);
    } catch (err) {
      if (err.name === 'PasswordException' || (err.message && err.message.toLowerCase().includes('password'))) {
        setErrorMessage('This PDF is password-protected. Please unlock the document first using the Unlock PDF tool.');
      } else {
        setErrorMessage(`Unable to read PDF: ${err.message || 'Corrupted or unsupported document.'}`);
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
    setSelectedFile(null);
    setFileBuffer(null);
    setPageCount(0);
    setIsProcessing(false);
    setProgressState({ current: 0, total: 0, percent: 0, message: '' });
    setExtractedResult(null);
    setCopied(false);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeExtraction = async () => {
    if (!fileBuffer) {
      setErrorMessage('Please upload a PDF document first.');
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setProgressState({ current: 0, total: pageCount, percent: 5, message: 'Opening PDF document...' });

    try {
      const baseName = selectedFile ? selectedFile.name.replace(/\.pdf$/i, '') : 'document';
      const result = await extractTextFromPdf(fileBuffer, {
        pdfjsLib,
        baseFilename: baseName,
        onProgress: (state) => setProgressState(state)
      });

      setExtractedResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to extract text from PDF document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!extractedResult || !extractedResult.fullText) return;
    const blob = createTxtBlob(extractedResult.fullText);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = extractedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopyText = async () => {
    if (!extractedResult || !extractedResult.fullText) return;
    try {
      await navigator.clipboard.writeText(extractedResult.fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = extractedResult.fullText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="tool-view-container tool-page-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="pdf-to-text"
        title="PDF to Text — Extract Text Online"
        description="Extract clean, selectable text from your PDF documents directly in your browser. Download as a formatted .txt file or copy to clipboard with zero server uploads."
      />

      {/* Main Workbench Card */}
      <div className="converter-card workbench-card">
        {!selectedFile ? (
          <div
            id="pdf-to-text-dropzone"
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
              id="pdf-to-text-file-input"
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
            <div className="dropzone-icon-wrapper">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="dropzone-main-icon"
                aria-hidden="true"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
            </div>
            <h3 className="dropzone-title">Select a PDF to extract text</h3>
            <p className="dropzone-subtitle">
              Drag &amp; drop a PDF here, or click to browse from your device
            </p>
            <div className="dropzone-tags">
              <span className="dropzone-tag">Max file size: 50MB</span>
              <span className="dropzone-tag">100% Private (No upload)</span>
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
                  <div id="pdf-text-file-name" className="file-name-title" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div id="pdf-text-file-size" className="file-size-badge">
                    {formatBytes(selectedFile.size)} · {pageCount} page{pageCount > 1 ? 's' : ''}
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
              <div id="pdf-text-error-banner" className="tool-error-banner" role="alert">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Section (Before Extraction) */}
            {!extractedResult && (
              <div style={{ marginTop: '1.5rem' }}>
                {isProcessing && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748B', marginBottom: '0.4rem' }}>
                      <span>{progressState.message || 'Extracting text...'}</span>
                      <span>{progressState.percent}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressState.percent}%`,
                          height: '100%',
                          background: '#3B82F6',
                          transition: 'width 0.2s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="split-action-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    id="extract-text-action-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={executeExtraction}
                    disabled={isProcessing}
                    style={{ minWidth: '220px' }}
                  >
                    {isProcessing ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-small" /> Extracting Text...
                      </span>
                    ) : (
                      '📄 Extract Text from PDF'
                    )}
                  </button>

                  <button
                    id="reset-pdf-text-btn"
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

            {/* Output State A: No Selectable Text Found (Scanned PDF) */}
            {extractedResult && !extractedResult.hasSelectableText && (
              <div id="no-text-alert-card" style={{ marginTop: '1.5rem', padding: '1.75rem 1.5rem', background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔍</div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: '#92400E', margin: '0 0 0.5rem' }}>
                  No Selectable Text Found
                </h3>
                <p style={{ color: '#B45309', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                  No selectable text was found in this PDF. This document appears to contain scanned images or flattened graphics without embedded text layers. Optical Character Recognition (OCR) is not currently supported by this tool.
                </p>
                <button
                  id="no-text-choose-another-btn"
                  type="button"
                  className="workbench-btn-primary"
                  onClick={resetAll}
                  style={{ maxWidth: '240px', margin: '0 auto' }}
                >
                  Choose Another PDF
                </button>
              </div>
            )}

            {/* Output State B: Selectable Text Successfully Extracted */}
            {extractedResult && extractedResult.hasSelectableText && (
              <div id="extracted-text-success-card" style={{ marginTop: '1.5rem' }}>
                {/* Metrics Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#166534', fontSize: '0.95rem' }}>
                        Text Extracted Successfully!
                      </div>
                      <div id="pdf-text-meta" style={{ fontSize: '0.825rem', color: '#15803D' }}>
                        {extractedResult.totalPages} page{extractedResult.totalPages > 1 ? 's' : ''} • {extractedResult.totalWords.toLocaleString()} words • {extractedResult.totalCharacters.toLocaleString()} characters
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      id="copy-text-btn"
                      type="button"
                      className="workbench-btn-secondary"
                      onClick={handleCopyText}
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                    >
                      {copied ? '✓ Copied!' : '📋 Copy Text'}
                    </button>
                    <button
                      id="download-txt-btn"
                      type="button"
                      className="workbench-btn-primary"
                      onClick={handleDownload}
                      style={{ background: '#16A34A', borderColor: '#16A34A', padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download .txt
                    </button>
                  </div>
                </div>

                {/* Text Preview Box */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label htmlFor="extracted-text-preview" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                      Text Preview ({extractedResult.filename})
                    </label>
                    <span style={{ fontSize: '0.775rem', color: '#64748B' }}>
                      UTF-8 Plain Text
                    </span>
                  </div>
                  <textarea
                    id="extracted-text-preview"
                    readOnly
                    value={extractedResult.fullText}
                    rows={14}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                      fontSize: '0.875rem',
                      lineHeight: '1.6',
                      color: '#1E293B',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    id="extract-another-pdf-btn"
                    type="button"
                    className="workbench-btn-secondary"
                    onClick={resetAll}
                  >
                    Extract Another PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="pdf-to-text" />
    </div>
  );
}
