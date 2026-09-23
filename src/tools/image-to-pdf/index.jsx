import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';

// Human-readable file size formatter
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate sanitized output filename
function getPdfDownloadName(images) {
  if (!images || images.length === 0) return 'images-converted.pdf';
  const first = images[0].file?.name || 'images';
  const lastDot = first.lastIndexOf('.');
  const baseName = lastDot !== -1 ? first.substring(0, lastDot) : first;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'images';
  return `${cleanBase}-converted.pdf`;
}

// Validate supported image formats
function isSupportedImage(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.bmp'];
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'image/bmp'
  ];
  return (
    validMimes.includes(type) ||
    validExtensions.some((ext) => name.endsWith(ext))
  );
}

// Standard page dimensions in mm
const PAGE_DIMENSIONS = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 }
};

export default function ImageToPdfTool() {
  const [imageList, setImageList] = useState([]);
  const [pageSize, setPageSize] = useState('a4'); // 'a4' | 'letter' | 'auto'
  const [orientation, setOrientation] = useState('auto'); // 'auto' | 'portrait' | 'landscape'
  const [margin, setMargin] = useState(10); // in mm: 0, 5, 10, 20
  const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'fill'
  const [bgColor, setBgColor] = useState('#ffffff'); // background fill for transparency

  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null);
  const [convertedPdfSize, setConvertedPdfSize] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);
  const imageListRef = useRef(imageList);
  const convertedPdfUrlRef = useRef(convertedPdfUrl);

  useEffect(() => {
    document.title = 'Image to PDF Converter Online — Convert JPG, PNG, WebP to PDF | FixMyFile';
  }, []);

  useEffect(() => {
    imageListRef.current = imageList;
  }, [imageList]);

  useEffect(() => {
    convertedPdfUrlRef.current = convertedPdfUrl;
  }, [convertedPdfUrl]);

  // Clean up object URLs on component unmount
  useEffect(() => {
    return () => {
      imageListRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      if (convertedPdfUrlRef.current) {
        URL.revokeObjectURL(convertedPdfUrlRef.current);
      }
    };
  }, []);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Helper to load image bitmap and dimensions
  const loadImageData = (file) => {
    return new Promise((resolve, reject) => {
      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({
          file,
          previewUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
          name: file.name,
          size: file.size,
          type: file.type || 'image/unknown'
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(previewUrl);
        reject(new Error(`Failed to decode ${file.name}. Ensure it is a valid image.`));
      };
      img.src = previewUrl;
    });
  };

  // Process incoming files
  const handleFiles = async (rawFiles) => {
    setErrorMessage(null);
    const validFiles = [];
    const errors = [];

    for (const file of rawFiles) {
      if (file.size === 0) {
        errors.push(`"${file.name}" is empty (0 bytes).`);
        continue;
      }
      if (file.size > 50 * 1024 * 1024) {
        errors.push(`"${file.name}" exceeds the 50 MB limit.`);
        continue;
      }
      if (!isSupportedImage(file)) {
        errors.push(`"${file.name}" is not a supported image format (JPG, PNG, WebP, GIF, SVG, BMP).`);
        continue;
      }
      validFiles.push(file);
    }

    if (errors.length > 0) {
      setErrorMessage(errors.join(' '));
    }

    if (validFiles.length === 0) return;

    try {
      const loadedItems = await Promise.all(validFiles.map((f) => loadImageData(f)));
      setImageList((prev) => [...prev, ...loadedItems]);
      // If we already had a converted PDF, clear it since input changed
      if (convertedPdfUrl) {
        URL.revokeObjectURL(convertedPdfUrl);
        setConvertedPdfUrl(null);
        setConvertedPdfSize(null);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error processing selected images.');
    }
  };

  const onFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
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
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Reordering handlers
  const moveImage = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= imageList.length) return;
    const updated = [...imageList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImageList(updated);
    if (convertedPdfUrl) {
      URL.revokeObjectURL(convertedPdfUrl);
      setConvertedPdfUrl(null);
      setConvertedPdfSize(null);
    }
  };

  const removeImage = (index) => {
    const item = imageList[index];
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    const updated = imageList.filter((_, i) => i !== index);
    setImageList(updated);
    if (convertedPdfUrl) {
      URL.revokeObjectURL(convertedPdfUrl);
      setConvertedPdfUrl(null);
      setConvertedPdfSize(null);
    }
  };

  const clearAll = () => {
    imageList.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    if (convertedPdfUrl) {
      URL.revokeObjectURL(convertedPdfUrl);
    }
    setImageList([]);
    setConvertedPdfUrl(null);
    setConvertedPdfSize(null);
    setErrorMessage(null);
    setStatusMessage('');
  };

  // Convert all images to a single PDF
  const convertToPdf = async () => {
    if (imageList.length === 0) {
      setErrorMessage('Please upload at least one image to convert.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);
    setErrorMessage(null);
    setStatusMessage('Preparing image pipeline...');

    try {
      let doc = null;

      for (let i = 0; i < imageList.length; i++) {
        const item = imageList[i];
        setStatusMessage(`Rendering page ${i + 1} of ${imageList.length}...`);
        setConversionProgress(Math.round(((i + 1) / imageList.length) * 90));

        // Load image bitmap into an offscreen image element
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error(`Failed to render ${item.name}`));
          img.src = item.previewUrl;
        });

        const imgWidth = img.naturalWidth || item.width || 800;
        const imgHeight = img.naturalHeight || item.height || 600;

        // Render onto an in-memory canvas to handle background flattening & standardizing
        const canvas = document.createElement('canvas');
        canvas.width = imgWidth;
        canvas.height = imgHeight;
        const ctx = canvas.getContext('2d');

        // Fill background if specified (default white prevents black transparent artifacts in PDF)
        if (bgColor) {
          ctx.fillStyle = bgColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, imgWidth, imgHeight);

        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.92);

        // Determine page orientation and dimensions (in mm)
        let pageW = 210;
        let pageH = 297;
        let pageOrientation = 'portrait';

        if (pageSize === 'auto') {
          // 1px = 0.264583 mm (approx 96 DPI)
          const pxToMm = 0.264583;
          pageW = Math.max(20, Math.round(imgWidth * pxToMm + margin * 2));
          pageH = Math.max(20, Math.round(imgHeight * pxToMm + margin * 2));
          pageOrientation = pageW >= pageH ? 'landscape' : 'portrait';
        } else {
          const dims = PAGE_DIMENSIONS[pageSize] || PAGE_DIMENSIONS.a4;
          if (orientation === 'auto') {
            pageOrientation = imgWidth > imgHeight ? 'landscape' : 'portrait';
          } else {
            pageOrientation = orientation;
          }
          pageW = pageOrientation === 'landscape' ? Math.max(dims.width, dims.height) : Math.min(dims.width, dims.height);
          pageH = pageOrientation === 'landscape' ? Math.min(dims.width, dims.height) : Math.max(dims.width, dims.height);
        }

        // Available area inside margins
        const maxW = Math.max(1, pageW - margin * 2);
        const maxH = Math.max(1, pageH - margin * 2);

        let renderW = maxW;
        let renderH = maxH;
        let posX = margin;
        let posY = margin;

        if (fitMode === 'contain' || pageSize === 'auto') {
          const scale = Math.min(maxW / imgWidth, maxH / imgHeight);
          renderW = imgWidth * scale;
          renderH = imgHeight * scale;
          // Center inside printable margin area
          posX = margin + (maxW - renderW) / 2;
          posY = margin + (maxH - renderH) / 2;
        } else {
          // Fill page margin area
          renderW = maxW;
          renderH = maxH;
        }

        if (i === 0) {
          doc = new jsPDF({
            orientation: pageOrientation,
            unit: 'mm',
            format: pageSize === 'auto' ? [pageW, pageH] : pageSize,
            compress: true
          });
        } else {
          doc.addPage(pageSize === 'auto' ? [pageW, pageH] : pageSize, pageOrientation);
        }

        doc.addImage(imgDataUrl, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
      }

      setStatusMessage('Finalizing PDF structure...');
      setConversionProgress(98);

      const pdfBlob = doc.output('blob');

      // Verify PDF magic bytes '%PDF' (0x25, 0x50, 0x44, 0x46)
      const buffer = await pdfBlob.slice(0, 4).arrayBuffer();
      const headerBytes = new Uint8Array(buffer);
      const isPdf =
        headerBytes[0] === 0x25 &&
        headerBytes[1] === 0x50 &&
        headerBytes[2] === 0x44 &&
        headerBytes[3] === 0x46;

      if (!isPdf) {
        throw new Error('Generated file failed PDF signature validation.');
      }

      if (convertedPdfUrl) {
        URL.revokeObjectURL(convertedPdfUrl);
      }

      const newPdfUrl = URL.createObjectURL(pdfBlob);
      setConvertedPdfUrl(newPdfUrl);
      setConvertedPdfSize(pdfBlob.size);
      setStatusMessage('PDF successfully created!');
      setConversionProgress(100);
    } catch (err) {
      setErrorMessage(`PDF creation error: ${err.message || 'Failed to generate PDF.'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const downloadFilename = getPdfDownloadName(imageList);

  return (
    <div className="tool-view-container">
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="breadcrumb-separator">/</span>
        <span className="breadcrumb-current">Image to PDF</span>
      </nav>

      {/* Tool Header */}
      <header className="tool-header">
        <div className="tool-title-row">
          <h1 className="tool-h1">Image to PDF Converter</h1>
          <span className="tool-badge-primary">Free · In-Browser</span>
        </div>
        <p className="tool-description">
          Convert JPG, PNG, WebP, GIF, and SVG images into a single clean PDF document. Reorder pages, adjust margins, and select page sizing directly in your browser.
        </p>
      </header>

      {/* Main Tool Area */}
      <div className="tool-card">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          id="image-to-pdf-file-input"
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif,.svg,.bmp,image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/bmp"
          multiple
          onChange={onFileInputChange}
          style={{ display: 'none' }}
        />

        {/* Drag-and-Drop Zone */}
        <div
          id="image-to-pdf-dropzone"
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
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p className="dropzone-title">Click or drag images here to convert to PDF</p>
          <p className="dropzone-hint">
            Supports JPG, PNG, WebP, GIF, SVG • Multiple files allowed • Max 50 MB per file
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="alert-box error" role="alert" style={{ marginTop: '16px' }}>
            <span className="alert-icon">⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Selected Images List & Controls */}
        {imageList.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                Uploaded Images ({imageList.length} {imageList.length === 1 ? 'page' : 'pages'})
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={openFilePicker}
                >
                  + Add More
                </button>
                <button
                  id="image-to-pdf-clear-btn"
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={clearAll}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* List / Grid of Images */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                maxHeight: '360px',
                overflowY: 'auto',
                paddingRight: '4px',
                marginBottom: '20px'
              }}
            >
              {imageList.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--color-surface, #1e293b)',
                    border: '1px solid var(--color-border, #334155)',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '180px' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--color-primary, #3b82f6)',
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {index + 1}
                    </span>
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      style={{
                        width: '44px',
                        height: '44px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border, #334155)'
                      }}
                    />
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          maxWidth: '220px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                        {item.width} × {item.height} px • {formatBytes(item.size)}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Move Up"
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Move Down"
                      disabled={index === imageList.length - 1}
                      onClick={() => moveImage(index, 1)}
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      title="Remove"
                      onClick={() => removeImage(index)}
                      style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444' }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Document Configuration Settings */}
            <div
              style={{
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--color-border, #334155)',
                marginBottom: '20px'
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.925rem', fontWeight: 600 }}>
                PDF Document Settings
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '12px'
                }}
              >
                <div>
                  <label htmlFor="image-to-pdf-page-size" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>
                    Page Size
                  </label>
                  <select
                    id="image-to-pdf-page-size"
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border, #334155)',
                      background: 'var(--color-surface, #1e293b)',
                      color: 'var(--color-text, #f8fafc)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="a4">A4 (210 × 297 mm)</option>
                    <option value="letter">US Letter</option>
                    <option value="auto">Auto (Match Image)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="image-to-pdf-orientation" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>
                    Orientation
                  </label>
                  <select
                    id="image-to-pdf-orientation"
                    value={orientation}
                    disabled={pageSize === 'auto'}
                    onChange={(e) => setOrientation(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border, #334155)',
                      background: 'var(--color-surface, #1e293b)',
                      color: 'var(--color-text, #f8fafc)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="auto">Auto (Match Image)</option>
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="image-to-pdf-margin" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>
                    Page Margin
                  </label>
                  <select
                    id="image-to-pdf-margin"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border, #334155)',
                      background: 'var(--color-surface, #1e293b)',
                      color: 'var(--color-text, #f8fafc)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value={0}>No Margin (0 mm)</option>
                    <option value={5}>Small (5 mm)</option>
                    <option value={10}>Normal (10 mm)</option>
                    <option value={20}>Large (20 mm)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="image-to-pdf-fit" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>
                    Image Fit
                  </label>
                  <select
                    id="image-to-pdf-fit"
                    value={fitMode}
                    onChange={(e) => setFitMode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border, #334155)',
                      background: 'var(--color-surface, #1e293b)',
                      color: 'var(--color-text, #f8fafc)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="contain">Fit Page (Preserve Ratio)</option>
                    <option value="fill">Fill Printable Area</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="image-to-pdf-bg" style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted, #94a3b8)', marginBottom: '4px' }}>
                    Background Fill
                  </label>
                  <select
                    id="image-to-pdf-bg"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-border, #334155)',
                      background: 'var(--color-surface, #1e293b)',
                      color: 'var(--color-text, #f8fafc)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="#ffffff">White (Standard)</option>
                    <option value="#f8fafc">Off-White</option>
                    <option value="#0f172a">Dark / Black</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                id="image-to-pdf-convert-btn"
                type="button"
                className="btn btn-primary"
                disabled={isConverting}
                onClick={convertToPdf}
                style={{ minWidth: '160px' }}
              >
                {isConverting ? `Converting (${conversionProgress}%)...` : 'Convert to PDF'}
              </button>
            </div>
          </div>
        )}

        {/* Progress and Status Message */}
        {isConverting && (
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--color-border, #334155)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '8px'
              }}
            >
              <div
                style={{
                  width: `${conversionProgress}%`,
                  height: '100%',
                  background: 'var(--color-primary, #3b82f6)',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted, #94a3b8)' }}>
              {statusMessage}
            </p>
          </div>
        )}

        {/* Result & Download Section */}
        {convertedPdfUrl && !isConverting && (
          <div
            id="image-to-pdf-result"
            style={{
              marginTop: '24px',
              padding: '20px',
              borderRadius: '8px',
              background: 'rgba(34, 197, 94, 0.08)',
              border: '1px solid rgba(34, 197, 94, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#22c55e', fontSize: '1.25rem' }}>✓</span>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc' }}>
                    PDF Ready for Download
                  </h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted, #94a3b8)' }}>
                  File: <strong>{downloadFilename}</strong> • Size: {formatBytes(convertedPdfSize)} • Pages: {imageList.length}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a
                  id="image-to-pdf-download-btn"
                  href={convertedPdfUrl}
                  download={downloadFilename}
                  className="btn btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </a>
                <button
                  id="image-to-pdf-reset-btn"
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearAll}
                >
                  Convert Another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feature & FAQ Section */}
      <section className="tool-info-section" style={{ marginTop: '40px' }}>
        <h2 className="info-title">How to Convert Images to PDF in FixMyFile</h2>
        <div className="info-grid">
          <div className="info-card">
            <span className="info-card-icon">📁</span>
            <h3 className="info-card-title">1. Upload Any Image</h3>
            <p className="info-card-text">
              Add single or multiple JPG, PNG, WebP, GIF, or SVG images. Everything is processed directly in your browser.
            </p>
          </div>
          <div className="info-card">
            <span className="info-card-icon">🔀</span>
            <h3 className="info-card-title">2. Order & Customize</h3>
            <p className="info-card-text">
              Reorder pages with simple up/down controls, configure page dimensions (A4, Letter, or Auto), and set custom margins.
            </p>
          </div>
          <div className="info-card">
            <span className="info-card-icon">⚡</span>
            <h3 className="info-card-title">3. Instant Download</h3>
            <p className="info-card-text">
              Click Convert to generate an authentic PDF document with perfectly preserved aspect ratio and clean margins.
            </p>
          </div>
        </div>

        <div className="faq-section" style={{ marginTop: '32px' }}>
          <h3 className="info-title">Frequently Asked Questions</h3>
          <div className="faq-item">
            <h4 className="faq-question">Are my images uploaded to any server?</h4>
            <p className="faq-answer">
              No. FixMyFile uses a strict browser-first architecture. All PDF generation executes locally inside your web browser using HTML5 Canvas and jsPDF.
            </p>
          </div>
          <div className="faq-item">
            <h4 className="faq-question">How does Image to PDF handle transparent PNG or WebP graphics?</h4>
            <p className="faq-answer">
              Transparent backgrounds are composited over a clean white background to prevent dark or inverted color artifacts commonly seen in basic PDF viewers.
            </p>
          </div>
          <div className="faq-item">
            <h4 className="faq-question">What is the difference between A4, Letter, and Auto page sizing?</h4>
            <p className="faq-answer">
              A4 and Letter produce standardized document pages suitable for printing, scaling your images to fit the page. Auto calculates individual page sizes based on each image's native pixel dimensions.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
