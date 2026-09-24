import { useState, useRef, useEffect, useCallback } from 'react';
import ToolDetailContent from '../../components/ToolDetailContent';
import { Link } from 'react-router-dom';

// Human-readable file size formatter
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate sanitized download filename for text export
function getBase64DownloadName(originalName) {
  if (!originalName) return 'image-base64.txt';
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-base64.txt`;
}

// Validate supported image formats
function isSupportedImage(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp', '.ico'];
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/bmp',
    'image/x-icon'
  ];
  return (
    validMimes.includes(type) ||
    validExtensions.some((ext) => name.endsWith(ext))
  );
}

export default function ImageToBase64Tool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dataUri, setDataUri] = useState('');
  const [rawBase64, setRawBase64] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [dimensions, setDimensions] = useState(null);

  const [activeTab, setActiveTab] = useState('datauri'); // 'datauri' | 'raw' | 'html' | 'css'
  const [copiedKey, setCopiedKey] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    document.title = 'Image to Base64 Converter Online — Generate Data URI Instantly | FixMyFile';
  }, []);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resetAll = useCallback(() => {
    setSelectedFile(null);
    setDataUri('');
    setRawBase64('');
    setMimeType('');
    setDimensions(null);
    setActiveTab('datauri');
    setCopiedKey(null);
    setErrorMessage(null);
    setIsLoading(false);
  }, []);

  // Process and encode original file bytes directly via FileReader (zero canvas re-rendering)
  const handleFile = (file) => {
    setErrorMessage(null);
    if (!file) return;

    if (file.size === 0) {
      setErrorMessage('The selected file is empty (0 bytes). Please upload a valid image.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('The selected image exceeds the 50 MB file size limit.');
      return;
    }

    if (!isSupportedImage(file)) {
      setErrorMessage('Unsupported format. Please upload a valid JPG, PNG, WebP, GIF, SVG, BMP, or ICO file.');
      return;
    }

    setIsLoading(true);
    setSelectedFile(file);

    const reader = new FileReader();

    reader.onload = (e) => {
      const fullDataUri = e.target.result;
      if (typeof fullDataUri !== 'string') {
        setIsLoading(false);
        setErrorMessage('Failed to read file as Data URI string.');
        return;
      }

      setDataUri(fullDataUri);

      // Extract raw Base64 payload
      const commaIndex = fullDataUri.indexOf(',');
      const rawPayload = commaIndex !== -1 ? fullDataUri.slice(commaIndex + 1) : fullDataUri;
      setRawBase64(rawPayload);

      // Extract MIME type
      const prefix = commaIndex !== -1 ? fullDataUri.slice(0, commaIndex) : '';
      let detectedMime = file.type || '';
      if (prefix.includes('data:') && prefix.includes(';base64')) {
        detectedMime = prefix.slice(5, prefix.indexOf(';base64'));
      }
      setMimeType(detectedMime || 'image/png');

      // Attempt to load dimensions for informational display
      const img = new Image();
      img.onload = () => {
        setDimensions({ width: img.naturalWidth || img.width, height: img.naturalHeight || img.height });
        setIsLoading(false);
      };
      img.onerror = () => {
        // If image preview dimension fails (e.g. complex SVG), still retain Base64
        setDimensions(null);
        setIsLoading(false);
      };
      img.src = fullDataUri;
    };

    reader.onerror = () => {
      setIsLoading(false);
      setErrorMessage('Failed to read the binary file. Ensure the file is not corrupted or locked.');
    };

    // Read the authentic binary bytes directly without altering a single byte
    reader.readAsDataURL(file);
  };

  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
      e.target.value = '';
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

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Copy helper
  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // Fallback for older browsers or restricted environments
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Snippets
  const htmlSnippet = selectedFile ? `<img src="${dataUri}" alt="${selectedFile.name}" />` : '';
  const cssSnippet = `background-image: url('${dataUri}');`;

  // Download text file
  const downloadTextFile = () => {
    if (!dataUri) return;
    const blob = new Blob([dataUri], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getBase64DownloadName(selectedFile?.name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="tool-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Image to Base64</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">Image to Base64 Converter</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-description">
          Convert JPG, PNG, WebP, GIF, and SVG images directly into standard Base64 Data URIs and raw encoded strings for web embedding, CSS, and HTML.
        </p>
      </header>

      {/* Main Tool Area */}
      <div className="tool-card">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          id="image-to-base64-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,.ico,image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/bmp,image/x-icon"
          onChange={onFileInputChange}
          style={{ display: 'none' }}
        />

        {/* Dropzone Area */}
        {!selectedFile && (
          <div
            id="image-to-base64-dropzone"
            className={`dropzone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFilePicker}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openFilePicker();
            }}
          >
            <div className="dropzone-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <p className="dropzone-title">Click or drag an image here to encode to Base64</p>
            <p className="dropzone-hint">
              Supports JPG, PNG, WebP, GIF, SVG, BMP, ICO • Max 50 MB • Pure client-side
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-box error" role="alert" style={{ marginTop: '16px' }}>
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Active Tool View */}
        {selectedFile && dataUri && !isLoading && (
          <div id="image-to-base64-result">
            {/* Top Bar with File Meta & Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderRadius: '8px',
                background: 'var(--color-surface, #1e293b)',
                border: '1px solid var(--color-border, #334155)',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '6px',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--color-border, #334155)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <img
                    src={dataUri}
                    alt={selectedFile.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>
                    {selectedFile.name}
                  </p>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                    {mimeType} • {formatBytes(selectedFile.size)}
                    {dimensions ? ` • ${dimensions.width} × ${dimensions.height} px` : ''}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={openFilePicker}
                >
                  Change Image
                </button>
                <button
                  id="image-to-base64-reset-btn"
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={resetAll}
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border, #334155)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)', display: 'block' }}>MIME Type</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>{mimeType}</span>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border, #334155)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)', display: 'block' }}>File Size</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text, #f8fafc)' }}>{formatBytes(selectedFile.size)}</span>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--color-border, #334155)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)', display: 'block' }}>Base64 Length</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary, #3b82f6)' }}>{rawBase64.length.toLocaleString()} chars</span>
              </div>
            </div>

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border, #334155)', paddingBottom: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'datauri' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('datauri')}
              >
                Data URI
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'raw' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('raw')}
              >
                Raw Base64
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'html' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('html')}
              >
                HTML &lt;img&gt;
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === 'css' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setActiveTab('css')}
              >
                CSS Background
              </button>
            </div>

            {/* Output Display & Copy Actions */}
            <div style={{ marginBottom: '20px' }}>
              {activeTab === 'datauri' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Complete Data URI:</label>
                    <button
                      id="image-to-base64-copy-datauri-btn"
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => copyToClipboard(dataUri, 'datauri')}
                    >
                      {copiedKey === 'datauri' ? '✓ Copied!' : 'Copy Data URI'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={dataUri}
                    rows={6}
                    style={{
                      width: '100%',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8rem',
                      padding: '12px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid var(--color-border, #334155)',
                      color: '#93c5fd',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {activeTab === 'raw' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Raw Base64 Payload:</label>
                    <button
                      id="image-to-base64-copy-raw-btn"
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => copyToClipboard(rawBase64, 'raw')}
                    >
                      {copiedKey === 'raw' ? '✓ Copied!' : 'Copy Raw Base64'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={rawBase64}
                    rows={6}
                    style={{
                      width: '100%',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8rem',
                      padding: '12px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid var(--color-border, #334155)',
                      color: '#93c5fd',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {activeTab === 'html' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>HTML &lt;img&gt; Snippet:</label>
                    <button
                      id="image-to-base64-copy-html-btn"
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => copyToClipboard(htmlSnippet, 'html')}
                    >
                      {copiedKey === 'html' ? '✓ Copied!' : 'Copy HTML'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={htmlSnippet}
                    rows={4}
                    style={{
                      width: '100%',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8rem',
                      padding: '12px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid var(--color-border, #334155)',
                      color: '#a7f3d0',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}

              {activeTab === 'css' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>CSS Background Snippet:</label>
                    <button
                      id="image-to-base64-copy-css-btn"
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => copyToClipboard(cssSnippet, 'css')}
                    >
                      {copiedKey === 'css' ? '✓ Copied!' : 'Copy CSS'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={cssSnippet}
                    rows={4}
                    style={{
                      width: '100%',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '0.8rem',
                      padding: '12px',
                      borderRadius: '6px',
                      background: '#090d16',
                      border: '1px solid var(--color-border, #334155)',
                      color: '#fde68a',
                      resize: 'vertical'
                    }}
                  />
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                id="image-to-base64-download-btn"
                type="button"
                className="btn btn-secondary"
                onClick={downloadTextFile}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download as .txt
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Normalized Universal Tool Detail Content: Privacy Note, How-To, FAQ & Related Tools */}
      <ToolDetailContent toolId="image-to-base64" />
    </div>
  );
}
