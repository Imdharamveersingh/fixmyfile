import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import { getPdfMetadata, parsePagesToDelete, deletePdfPages } from './deleteEngine';
import { formatBytes } from '../../utils/helpers';

export default function DeletePdfPagesTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pagesToDelete, setPagesToDelete] = useState([]);
  const [rangeInput, setRangeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({ percent: 0, message: '' });
  const [deletedResult, setDeletedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // SEO Page Title & Meta Description
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Delete PDF Pages — Remove Pages Online | FixMyFile';

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
      'Remove unwanted pages from any PDF document online for free. Select pages to delete and download a clean PDF with remaining pages instantly. 100% private in-browser.'
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
      setErrorMessage('The selected file is empty (0 bytes). Please upload a valid PDF document.');
      return;
    }

    setDeletedResult(null);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      const meta = await getPdfMetadata(buffer);
      if (meta.pageCount <= 1) {
        setErrorMessage('This PDF only contains 1 page. A PDF must have at least 2 pages to delete pages (at least one page must remain).');
        setSelectedFile(null);
        setFileBuffer(null);
        setTotalPages(0);
        return;
      }
      setTotalPages(meta.pageCount);
      setPagesToDelete([]);
      setRangeInput('');
    } catch (err) {
      setErrorMessage(err.message || 'Unable to read PDF document.');
      setSelectedFile(null);
      setFileBuffer(null);
      setTotalPages(0);
    }
  };

  const onFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Toggle page in delete list
  const togglePageToDelete = (pageNum) => {
    setErrorMessage(null);
    let updated;
    if (pagesToDelete.includes(pageNum)) {
      updated = pagesToDelete.filter((p) => p !== pageNum);
    } else {
      updated = [...pagesToDelete, pageNum].sort((a, b) => a - b);
    }

    if (updated.length >= totalPages) {
      setErrorMessage('At least one page must remain in the PDF. You cannot delete all pages.');
      return;
    }

    setPagesToDelete(updated);
    updateRangeInputFromPages(updated);
  };

  const updateRangeInputFromPages = (pages) => {
    if (pages.length === 0) {
      setRangeInput('');
      return;
    }
    const sorted = [...pages].sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`);
        start = sorted[i];
        end = sorted[i];
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    setRangeInput(ranges.join(', '));
  };

  const handleRangeInputChange = (e) => {
    const val = e.target.value;
    setRangeInput(val);
    setErrorMessage(null);

    try {
      if (val.trim() === '') {
        setPagesToDelete([]);
        return;
      }
      const parsed = parsePagesToDelete(val, totalPages);
      setPagesToDelete(parsed.pagesToDelete);
    } catch (err) {
      // If user typed all pages, surface error
      if (err.message.includes('At least one page must remain')) {
        setErrorMessage(err.message);
      }
    }
  };

  const clearSelection = () => {
    setPagesToDelete([]);
    setRangeInput('');
    setErrorMessage(null);
  };

  const selectOddToDelete = () => {
    const odd = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0);
    if (odd.length >= totalPages) {
      setErrorMessage('At least one page must remain in the PDF.');
      return;
    }
    setPagesToDelete(odd);
    updateRangeInputFromPages(odd);
    setErrorMessage(null);
  };

  const selectEvenToDelete = () => {
    const even = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0);
    if (even.length >= totalPages) {
      setErrorMessage('At least one page must remain in the PDF.');
      return;
    }
    setPagesToDelete(even);
    updateRangeInputFromPages(even);
    setErrorMessage(null);
  };

  const executeDeletion = async () => {
    setErrorMessage(null);

    if (!fileBuffer) {
      setErrorMessage('No PDF loaded. Please upload a PDF document.');
      return;
    }

    let parsed;
    try {
      parsed = parsePagesToDelete(rangeInput || pagesToDelete, totalPages);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid page selection.');
      return;
    }

    if (parsed.pagesToDelete.length === 0) {
      setErrorMessage('Please select at least one page to delete.');
      return;
    }

    if (parsed.remainingPages.length === 0) {
      setErrorMessage('At least one page must remain in the PDF. You cannot delete all pages.');
      return;
    }

    setIsProcessing(true);
    setProgressState({ percent: 10, message: 'Starting page removal...' });

    try {
      const result = await deletePdfPages(fileBuffer, parsed.pagesToDelete, {
        baseFilename: selectedFile.name,
        onProgress: (p) => setProgressState(p)
      });
      setDeletedResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove PDF pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!deletedResult || !deletedResult.blob) return;
    const url = URL.createObjectURL(deletedResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = deletedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetAll = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setTotalPages(0);
    setPagesToDelete([]);
    setRangeInput('');
    setDeletedResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
  };

  const remainingCount = totalPages - pagesToDelete.length;

  return (
    <div className="tool-view-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="delete-pdf-pages"
        title="Delete PDF Pages — Remove Pages Online"
        description="Select unwanted pages or custom page ranges to remove from your PDF and create a clean, trimmed document. 100% private in-browser processing."
      />

      {/* Main Workbench Card */}
      <div className="workbench-card">
        {!selectedFile ? (
          /* Initial Dropzone */
          <div
            id="delete-pdf-dropzone"
            className={`dropzone-container ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            aria-label="Upload PDF file"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openFilePicker();
            }}
          >
            <input
              id="delete-pdf-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileInputChange}
              style={{ display: 'none' }}
              aria-label="Upload PDF file"
            />
            <div className="dropzone-icon-wrapper" aria-hidden="true">
            <ToolIcon icon="delete-pdf-pages" size={48} />
          </div>
            <h3 className="dropzone-title">Select a PDF to delete pages</h3>
            <p className="dropzone-subtitle">
              Drag &amp; drop a PDF here, or click to browse from your device
            </p>
            <div className="dropzone-tags">
              <span className="dropzone-tag">Max file size: 100MB</span>
            </div>
          </div>
        ) : (
          /* Workbench Active Area */
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
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                <div className="file-meta-texts">
                  <div id="delete-file-name" className="file-name-title" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div id="delete-file-meta" className="file-size-badge">
                    {formatBytes(selectedFile.size)} · {totalPages} pages
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

            {/* Error Message Banner */}
            {errorMessage && (
              <div id="delete-error-banner" className="tool-error-banner" role="alert" style={{ marginTop: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Page Selection Controls */}
            {!deletedResult && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label htmlFor="delete-range-input" style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                      Pages to Delete:
                    </label>
                    <span id="delete-summary-text" style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Selected to delete: <strong>{pagesToDelete.length}</strong> page{pagesToDelete.length !== 1 ? 's' : ''} · Remaining: <strong>{remainingCount}</strong> page{remainingCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button id="delete-odd-btn" type="button" className="workbench-btn-secondary" onClick={selectOddToDelete} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Delete Odd
                    </button>
                    <button id="delete-even-btn" type="button" className="workbench-btn-secondary" onClick={selectEvenToDelete} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Delete Even
                    </button>
                    <button id="clear-delete-btn" type="button" className="workbench-btn-secondary" onClick={clearSelection} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Clear
                    </button>
                  </div>
                </div>

                {/* Range Input Field */}
                <input
                  id="delete-range-input"
                  type="text"
                  className="tool-text-input"
                  value={rangeInput}
                  onChange={handleRangeInputChange}
                  placeholder={`e.g. 2, 4 or 2-3`}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    marginBottom: '1.25rem',
                    boxSizing: 'border-box'
                  }}
                />

                {/* Interactive Page Thumbnail Grid */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                    Click pages to mark or unmark for deletion:
                  </div>
                  <div
                    id="delete-page-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
                      gap: '8px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      padding: '10px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px'
                    }}
                  >
                    {Array.from({ length: totalPages }, (_, idx) => {
                      const pageNum = idx + 1;
                      const isMarkedForDelete = pagesToDelete.includes(pageNum);
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          id={`delete-page-card-${pageNum}`}
                          onClick={() => togglePageToDelete(pageNum)}
                          style={{
                            aspectRatio: '3 / 4',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isMarkedForDelete ? '2px solid #DC2626' : '1px solid #CBD5E1',
                            background: isMarkedForDelete ? '#FEF2F2' : '#FFFFFF',
                            color: isMarkedForDelete ? '#DC2626' : '#64748B',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            padding: '4px'
                          }}
                        >
                          <span
                            style={{
                              fontSize: '1.1rem',
                              fontWeight: 700,
                              textDecoration: isMarkedForDelete ? 'line-through' : 'none'
                            }}
                          >
                            {pageNum}
                          </span>
                          <span style={{ fontSize: '0.7rem', marginTop: '2px', fontWeight: isMarkedForDelete ? 600 : 400 }}>
                            {isMarkedForDelete ? '🗑️ Delete' : 'Keep'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748B', marginBottom: '0.4rem' }}>
                      <span>{progressState.message || 'Processing...'}</span>
                      <span>{progressState.percent}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${progressState.percent}%`,
                          height: '100%',
                          background: '#DC2626',
                          transition: 'width 0.2s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    id="delete-pages-action-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={executeDeletion}
                    disabled={isProcessing || pagesToDelete.length === 0 || remainingCount <= 0}
                    style={{ minWidth: '240px', background: pagesToDelete.length > 0 ? '#DC2626' : undefined, borderColor: pagesToDelete.length > 0 ? '#DC2626' : undefined }}
                  >
                    {isProcessing ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-small" /> Deleting Pages...
                      </span>
                    ) : pagesToDelete.length === 0 ? (
                      'Select Pages to Delete'
                    ) : remainingCount <= 0 ? (
                      'Cannot Delete All Pages'
                    ) : (
                      `Delete ${pagesToDelete.length} Page${pagesToDelete.length !== 1 ? 's' : ''} (${remainingCount} Left)`
                    )}
                  </button>
                  <button
                    id="reset-delete-btn"
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

            {/* Deletion Complete Output Card */}
            {deletedResult && (
              <div id="delete-success-card" style={{ marginTop: '1.5rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    padding: '1.25rem',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    marginBottom: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.2">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#166534', fontSize: '1rem' }}>
                        Pages Removed Successfully!
                      </div>
                      <div id="delete-result-meta" style={{ fontSize: '0.85rem', color: '#15803D', marginTop: '2px' }}>
                        {deletedResult.filename} · {deletedResult.pageCount} page{deletedResult.pageCount > 1 ? 's' : ''} remaining ({deletedResult.deletedCount} removed) · {formatBytes(deletedResult.bytes.byteLength)}
                      </div>
                    </div>
                  </div>

                  <button
                    id="download-modified-pdf-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={handleDownload}
                    style={{ background: '#16A34A', borderColor: '#16A34A', padding: '10px 20px', fontSize: '0.9rem' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download Modified PDF
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    id="delete-another-btn"
                    type="button"
                    className="workbench-btn-secondary"
                    onClick={resetAll}
                  >
                    Delete Pages from Another PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="delete-pdf-pages" />
    </div>
  );
}
