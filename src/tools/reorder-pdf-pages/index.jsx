import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import { getPdfMetadata, validatePageOrder, reorderPdfPages } from './reorderEngine';
import { formatBytes } from '../../utils/helpers';

export default function ReorderPdfPagesTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [pageOrder, setPageOrder] = useState([]);
  const [orderInput, setOrderInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({ percent: 0, message: '' });
  const [reorderedResult, setReorderedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // SEO Page Title & Meta Description
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Reorder PDF Pages — Rearrange Page Order | FixMyFile';

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
      'Change the page order of any PDF document online for free. Rearrange, reverse, or resequence PDF pages with zero quality loss. 100% private in-browser.'
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

    setReorderedResult(null);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      const meta = await getPdfMetadata(buffer);
      if (meta.pageCount <= 1) {
        setErrorMessage('This PDF contains only 1 page. A document must have at least 2 pages to be reordered.');
        setSelectedFile(null);
        setFileBuffer(null);
        setTotalPages(0);
        return;
      }
      setTotalPages(meta.pageCount);
      const initialOrder = Array.from({ length: meta.pageCount }, (_, i) => i + 1);
      setPageOrder(initialOrder);
      setOrderInput(initialOrder.join(', '));
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

  // Move a page card left in the sequence
  const movePageLeft = (index) => {
    if (index <= 0) return;
    setErrorMessage(null);
    const updated = [...pageOrder];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setPageOrder(updated);
    setOrderInput(updated.join(', '));
  };

  // Move a page card right in the sequence
  const movePageRight = (index) => {
    if (index >= pageOrder.length - 1) return;
    setErrorMessage(null);
    const updated = [...pageOrder];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setPageOrder(updated);
    setOrderInput(updated.join(', '));
  };

  // Preset operations
  const reverseOrder = () => {
    const reversed = [...pageOrder].reverse();
    setPageOrder(reversed);
    setOrderInput(reversed.join(', '));
    setErrorMessage(null);
  };

  const shiftLeft = () => {
    if (pageOrder.length <= 1) return;
    // Move first page to the end
    const shifted = [...pageOrder.slice(1), pageOrder[0]];
    setPageOrder(shifted);
    setOrderInput(shifted.join(', '));
    setErrorMessage(null);
  };

  const shiftRight = () => {
    if (pageOrder.length <= 1) return;
    // Move last page to the beginning
    const shifted = [pageOrder[pageOrder.length - 1], ...pageOrder.slice(0, -1)];
    setPageOrder(shifted);
    setOrderInput(shifted.join(', '));
    setErrorMessage(null);
  };

  const resetToOriginal = () => {
    const orig = Array.from({ length: totalPages }, (_, i) => i + 1);
    setPageOrder(orig);
    setOrderInput(orig.join(', '));
    setErrorMessage(null);
  };

  const handleOrderInputChange = (e) => {
    const val = e.target.value;
    setOrderInput(val);
    setErrorMessage(null);

    try {
      const validated = validatePageOrder(val, totalPages);
      setPageOrder(validated);
    } catch {
      // Allow user to finish editing
    }
  };

  const executeReorder = async () => {
    setErrorMessage(null);

    if (!fileBuffer) {
      setErrorMessage('No PDF loaded. Please upload a PDF document.');
      return;
    }

    let finalOrder;
    try {
      finalOrder = validatePageOrder(orderInput || pageOrder, totalPages);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid page order.');
      return;
    }

    setIsProcessing(true);
    setProgressState({ percent: 10, message: 'Starting reordering...' });

    try {
      const result = await reorderPdfPages(fileBuffer, finalOrder, {
        baseFilename: selectedFile.name,
        onProgress: (p) => setProgressState(p)
      });
      setReorderedResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reorder PDF pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!reorderedResult || !reorderedResult.blob) return;
    const url = URL.createObjectURL(reorderedResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = reorderedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetAll = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setTotalPages(0);
    setPageOrder([]);
    setOrderInput('');
    setReorderedResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
  };

  return (
    <div className="tool-view-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="reorder-pdf-pages"
        title="Reorder PDF Pages — Rearrange Page Order"
        description="Easily rearrange, shuffle, or reverse the page sequence of your PDF document. All pages are preserved with exact layout fidelity. 100% private in-browser."
      />

      {/* Main Workbench Card */}
      <div className="workbench-card">
        {!selectedFile ? (
          /* Initial Dropzone */
          <div
            id="reorder-pdf-dropzone"
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
              id="reorder-pdf-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileInputChange}
              style={{ display: 'none' }}
              aria-label="Upload PDF file"
            />
            <div className="dropzone-icon-wrapper" aria-hidden="true">
            <ToolIcon icon="reorder-pdf-pages" size={48} />
          </div>
            <h3 className="dropzone-title">Select a PDF to reorder pages</h3>
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
                  <path d="M8 13h4" />
                  <path d="M8 17h8" />
                </svg>
                <div className="file-meta-texts">
                  <div id="reorder-file-name" className="file-name-title" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div id="reorder-file-meta" className="file-size-badge">
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
              <div id="reorder-error-banner" className="tool-error-banner" role="alert" style={{ marginTop: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Page Reorder Controls */}
            {!reorderedResult && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label htmlFor="reorder-sequence-input" style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                      Page Order Sequence:
                    </label>
                    <span id="reorder-status-text" style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Current sequence: <code>{pageOrder.join(', ')}</code>
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button id="reverse-order-btn" type="button" className="workbench-btn-secondary" onClick={reverseOrder} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Reverse
                    </button>
                    <button id="shift-left-btn" type="button" className="workbench-btn-secondary" onClick={shiftLeft} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Shift ←
                    </button>
                    <button id="shift-right-btn" type="button" className="workbench-btn-secondary" onClick={shiftRight} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Shift →
                    </button>
                    <button id="reset-order-btn" type="button" className="workbench-btn-secondary" onClick={resetToOriginal} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Reset
                    </button>
                  </div>
                </div>

                {/* Sequence Input Field */}
                <input
                  id="reorder-sequence-input"
                  type="text"
                  className="tool-text-input"
                  value={orderInput}
                  onChange={handleOrderInputChange}
                  placeholder={`e.g. 5, 3, 1, 4, 2`}
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

                {/* Interactive Page Representations Grid */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }}>
                    Use arrows to move pages left or right:
                  </div>
                  <div
                    id="reorder-page-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                      gap: '12px',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      padding: '12px',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px'
                    }}
                  >
                    {pageOrder.map((origPageNum, idx) => (
                      <div
                        key={`${origPageNum}-${idx}`}
                        id={`reorder-page-card-${origPageNum}`}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #CBD5E1',
                          borderRadius: '8px',
                          padding: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563EB', marginBottom: '4px' }}>
                          #{idx + 1} in Output
                        </div>
                        <div style={{ width: '48px', height: '64px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1.15rem', color: '#1D4ED8', marginBottom: '6px' }}>
                          {origPageNum}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: '8px' }}>
                          Orig: Page {origPageNum}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', width: '100%', justifyContent: 'center' }}>
                          <button
                            type="button"
                            id={`move-left-${idx}`}
                            onClick={() => movePageLeft(idx)}
                            disabled={idx === 0}
                            title="Move Page Left"
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: idx === 0 ? '#F1F5F9' : '#FFFFFF',
                              color: idx === 0 ? '#94A3B8' : '#1E293B',
                              cursor: idx === 0 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            id={`move-right-${idx}`}
                            onClick={() => movePageRight(idx)}
                            disabled={idx === pageOrder.length - 1}
                            title="Move Page Right"
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              fontSize: '0.75rem',
                              borderRadius: '4px',
                              border: '1px solid #CBD5E1',
                              background: idx === pageOrder.length - 1 ? '#F1F5F9' : '#FFFFFF',
                              color: idx === pageOrder.length - 1 ? '#94A3B8' : '#1E293B',
                              cursor: idx === pageOrder.length - 1 ? 'not-allowed' : 'pointer'
                            }}
                          >
                            →
                          </button>
                        </div>
                      </div>
                    ))}
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
                          background: '#3B82F6',
                          transition: 'width 0.2s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button
                    id="reorder-action-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={executeReorder}
                    disabled={isProcessing || pageOrder.length === 0}
                    style={{ minWidth: '220px' }}
                  >
                    {isProcessing ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-small" /> Reordering Pages...
                      </span>
                    ) : (
                      'Reorder & Save PDF'
                    )}
                  </button>
                  <button
                    id="reset-reorder-btn"
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

            {/* Reorder Complete Output Card */}
            {reorderedResult && (
              <div id="reorder-success-card" style={{ marginTop: '1.5rem' }}>
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
                        PDF Pages Reordered Successfully!
                      </div>
                      <div id="reorder-result-meta" style={{ fontSize: '0.85rem', color: '#15803D', marginTop: '2px' }}>
                        {reorderedResult.filename} · {reorderedResult.pageCount} pages · Order: {reorderedResult.pageOrder.join(', ')} · ({formatBytes(reorderedResult.bytes.byteLength)})
                      </div>
                    </div>
                  </div>

                  <button
                    id="download-reordered-pdf-btn"
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
                    Download Reordered PDF
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    id="reorder-another-btn"
                    type="button"
                    className="workbench-btn-secondary"
                    onClick={resetAll}
                  >
                    Reorder Another PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="reorder-pdf-pages" />
    </div>
  );
}
