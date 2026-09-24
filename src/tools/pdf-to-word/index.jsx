import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
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
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="pdf-to-word"
        title="PDF to Word Converter"
        description="Convert text-based PDF files into editable Microsoft Word (.docx) documents directly in your browser. Fast, 100% private, and processed locally on your device without server uploads."
      />

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
            <div className="dropzone-icon" aria-hidden="true">
            <ToolIcon icon="pdf-to-word" size={48} />
          </div>
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


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="pdf-to-word" />
    </div>
  );
}
