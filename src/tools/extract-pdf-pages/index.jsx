import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolIcon from '../../components/ToolIcon';
import ToolDetailContent from '../../components/ToolDetailContent';
import { getPdfMetadata, parsePageSelection, extractPdfPages } from './extractEngine';
import { formatBytes } from '../../utils/helpers';

export default function ExtractPdfPagesTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileBuffer, setFileBuffer] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPages, setSelectedPages] = useState([]);
  const [rangeInput, setRangeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressState, setProgressState] = useState({ percent: 0, message: '' });
  const [extractedResult, setExtractedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  // SEO Page Title & Meta Description
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Extract PDF Pages — Select & Save PDF Pages | FixMyFile';

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
      'Select and extract specific pages from any PDF document into a new PDF online for free. 100% private in-browser processing with zero server uploads.'
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

    setExtractedResult(null);
    setSelectedFile(file);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);
      const meta = await getPdfMetadata(buffer);
      setTotalPages(meta.pageCount);
      // Default selection: select all pages
      const all = Array.from({ length: meta.pageCount }, (_, i) => i + 1);
      setSelectedPages(all);
      setRangeInput(meta.pageCount === 1 ? '1' : `1-${meta.pageCount}`);
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

  // Toggle single page in visual selection
  const togglePage = (pageNum) => {
    setErrorMessage(null);
    let updated;
    if (selectedPages.includes(pageNum)) {
      updated = selectedPages.filter((p) => p !== pageNum);
    } else {
      updated = [...selectedPages, pageNum].sort((a, b) => a - b);
    }
    setSelectedPages(updated);
    updateRangeInputFromPages(updated);
  };

  // Convert array of page numbers to range string (e.g. [1,2,3,5] -> "1-3, 5")
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

  // Handle manual typing into range text input
  const handleRangeInputChange = (e) => {
    const val = e.target.value;
    setRangeInput(val);
    setErrorMessage(null);

    try {
      if (val.trim() === '') {
        setSelectedPages([]);
        return;
      }
      const parsed = parsePageSelection(val, totalPages);
      setSelectedPages(parsed);
    } catch {
      // Allow user to finish typing without blocking UI immediately
    }
  };

  // Quick selection presets
  const selectAll = () => {
    const all = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(all);
    setRangeInput(`1-${totalPages}`);
    setErrorMessage(null);
  };

  const deselectAll = () => {
    setSelectedPages([]);
    setRangeInput('');
    setErrorMessage(null);
  };

  const selectOdd = () => {
    const odd = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 !== 0);
    setSelectedPages(odd);
    updateRangeInputFromPages(odd);
    setErrorMessage(null);
  };

  const selectEven = () => {
    const even = Array.from({ length: totalPages }, (_, i) => i + 1).filter((p) => p % 2 === 0);
    setSelectedPages(even);
    updateRangeInputFromPages(even);
    setErrorMessage(null);
  };

  const invertSelection = () => {
    const inverted = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
      (p) => !selectedPages.includes(p)
    );
    setSelectedPages(inverted);
    updateRangeInputFromPages(inverted);
    setErrorMessage(null);
  };

  const executeExtraction = async () => {
    setErrorMessage(null);

    if (!fileBuffer) {
      setErrorMessage('No PDF loaded. Please upload a PDF document.');
      return;
    }

    let pagesToExtract;
    try {
      pagesToExtract = parsePageSelection(rangeInput || selectedPages, totalPages);
    } catch (err) {
      setErrorMessage(err.message || 'Invalid page selection.');
      return;
    }

    if (pagesToExtract.length === 0) {
      setErrorMessage('Please select at least one page to extract.');
      return;
    }

    setIsProcessing(true);
    setProgressState({ percent: 10, message: 'Starting extraction...' });

    try {
      const result = await extractPdfPages(fileBuffer, pagesToExtract, {
        baseFilename: selectedFile.name,
        onProgress: (p) => setProgressState(p)
      });
      setExtractedResult(result);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to extract PDF pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!extractedResult || !extractedResult.blob) return;
    const url = URL.createObjectURL(extractedResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = extractedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const resetAll = () => {
    setSelectedFile(null);
    setFileBuffer(null);
    setTotalPages(0);
    setSelectedPages([]);
    setRangeInput('');
    setExtractedResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
  };

  return (
    <div className="tool-view-container">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="extract-pdf-pages"
        title="Extract PDF Pages — Save Specific Pages"
        description="Select specific pages or custom page ranges from your PDF document and create a new, lightweight PDF instantly. 100% private in-browser extraction."
      />

      {/* Main Workbench Card */}
      <div className="workbench-card">
        {!selectedFile ? (
          /* Initial Dropzone */
          <div
            id="extract-pdf-dropzone"
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
              id="extract-pdf-file-input"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileInputChange}
              style={{ display: 'none' }}
              aria-label="Upload PDF file"
            />
            <div className="dropzone-icon-wrapper" aria-hidden="true">
            <ToolIcon icon="extract-pdf-pages" size={48} />
          </div>
            <h3 className="dropzone-title">Select a PDF to extract pages</h3>
            <p className="dropzone-subtitle">
              Drag &amp; drop a PDF here, or click to browse from your device
            </p>
            <div className="dropzone-tags">
              <span className="dropzone-tag">Max file size: 100MB</span>
              <span className="dropzone-tag">100% Private (Client-Side)</span>
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
                  <path d="M8 13h2" />
                  <path d="M8 17h6" />
                </svg>
                <div className="file-meta-texts">
                  <div id="extract-file-name" className="file-name-title" title={selectedFile.name}>
                    {selectedFile.name}
                  </div>
                  <div id="extract-file-meta" className="file-size-badge">
                    {formatBytes(selectedFile.size)} · {totalPages} page{totalPages > 1 ? 's' : ''}
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
              <div id="extract-error-banner" className="tool-error-banner" role="alert" style={{ marginTop: '1rem' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Page Selection Controls */}
            {!extractedResult && (
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div>
                    <label htmlFor="range-selection-input" style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                      Pages to Extract:
                    </label>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Example: <code>1-3, 5, 8</code> (Selected: {selectedPages.length} of {totalPages} pages)
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button id="select-all-btn" type="button" className="workbench-btn-secondary" onClick={selectAll} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      All
                    </button>
                    <button id="select-odd-btn" type="button" className="workbench-btn-secondary" onClick={selectOdd} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Odd
                    </button>
                    <button id="select-even-btn" type="button" className="workbench-btn-secondary" onClick={selectEven} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Even
                    </button>
                    <button id="invert-selection-btn" type="button" className="workbench-btn-secondary" onClick={invertSelection} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Invert
                    </button>
                    <button id="clear-selection-btn" type="button" className="workbench-btn-secondary" onClick={deselectAll} style={{ padding: '6px 10px', fontSize: '0.8rem' }}>
                      Clear
                    </button>
                  </div>
                </div>

                {/* Range Input Field */}
                <input
                  id="range-selection-input"
                  type="text"
                  className="tool-text-input"
                  value={rangeInput}
                  onChange={handleRangeInputChange}
                  placeholder={`e.g. 1-${totalPages}`}
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
                    Click pages to toggle selection:
                  </div>
                  <div
                    id="page-selection-grid"
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
                      const isSelected = selectedPages.includes(pageNum);
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          id={`page-card-${pageNum}`}
                          onClick={() => togglePage(pageNum)}
                          style={{
                            aspectRatio: '3 / 4',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isSelected ? '2px solid #2563EB' : '1px solid #CBD5E1',
                            background: isSelected ? '#EFF6FF' : '#FFFFFF',
                            color: isSelected ? '#1D4ED8' : '#64748B',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            padding: '4px'
                          }}
                        >
                          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                            {pageNum}
                          </span>
                          <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                            {isSelected ? '✓ Selected' : 'Page'}
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
                    id="extract-pages-action-btn"
                    type="button"
                    className="workbench-btn-primary"
                    onClick={executeExtraction}
                    disabled={isProcessing || selectedPages.length === 0}
                    style={{ minWidth: '220px' }}
                  >
                    {isProcessing ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <span className="spinner-small" /> Extracting Pages...
                      </span>
                    ) : (
                      `Extract ${selectedPages.length} Page${selectedPages.length !== 1 ? 's' : ''}`
                    )}
                  </button>
                  <button
                    id="reset-selection-btn"
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

            {/* Extraction Complete Output Card */}
            {extractedResult && (
              <div id="extract-success-card" style={{ marginTop: '1.5rem' }}>
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
                        Pages Extracted Successfully!
                      </div>
                      <div id="extract-result-meta" style={{ fontSize: '0.85rem', color: '#15803D', marginTop: '2px' }}>
                        {extractedResult.filename} · {extractedResult.pageCount} page{extractedResult.pageCount > 1 ? 's' : ''} ({formatBytes(extractedResult.bytes.byteLength)})
                      </div>
                    </div>
                  </div>

                  <button
                    id="download-extracted-pdf-btn"
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
                    Download Extracted PDF
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    id="extract-another-btn"
                    type="button"
                    className="workbench-btn-secondary"
                    onClick={resetAll}
                  >
                    Extract From Another PDF
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="extract-pdf-pages" />
    </div>
  );
}
