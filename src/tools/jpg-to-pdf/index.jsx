import React, { useState, useRef, useEffect } from 'react';
import ToolDetailHeader from '../../components/ToolDetailHeader';
import ToolDetailContent from '../../components/ToolDetailContent';
import { jsPDF } from 'jspdf';
import { formatBytes } from '../../utils/helpers';

export default function JpgToPdfTool() {
  const [images, setImages] = useState([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [convertedPdfUrl, setConvertedPdfUrl] = useState(null);
  const [convertedPdfSize, setConvertedPdfSize] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const openFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const imagesRef = useRef(images);
  const convertedPdfUrlRef = useRef(convertedPdfUrl);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    convertedPdfUrlRef.current = convertedPdfUrl;
  }, [convertedPdfUrl]);

  // Clean up object URLs on component unmount ONLY
  useEffect(() => {
    return () => {
      imagesRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      if (convertedPdfUrlRef.current) {
        URL.revokeObjectURL(convertedPdfUrlRef.current);
      }
    };
  }, []);

  // Handle files selection
  const processFiles = (fileList) => {
    setErrorMessage(null);
    if (!fileList || fileList.length === 0) return;

    const newItems = [];
    const rejectedFiles = [];

    Array.from(fileList).forEach((file) => {
      const isJpg =
        file.type === 'image/jpeg' ||
        file.name.toLowerCase().endsWith('.jpg') ||
        file.name.toLowerCase().endsWith('.jpeg');

      if (!isJpg) {
        rejectedFiles.push(file.name);
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        file,
        name: file.name,
        size: file.size,
        previewUrl,
        width: 0,
        height: 0,
        isLoaded: false
      });
    });

    if (rejectedFiles.length > 0) {
      setErrorMessage(
        `Rejected ${rejectedFiles.length} non-JPG file(s): ${rejectedFiles.join(', ')}. Please select only JPG or JPEG images.`
      );
    }

    if (newItems.length === 0) return;

    // Load dimensions for each new image
    newItems.forEach((item) => {
      const img = new Image();
      img.onload = () => {
        setImages((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, width: img.naturalWidth, height: img.naturalHeight, isLoaded: true }
              : it
          )
        );
      };
      img.onerror = () => {
        setErrorMessage(`Could not load ${item.name}. Please make sure it is a valid JPG/JPEG image.`);
        removeImage(item.id);
      };
      img.src = item.previewUrl;
    });

    setImages((prev) => [...prev, ...newItems]);
    // Clear previous conversion result if new files are added
    if (convertedPdfUrl) {
      URL.revokeObjectURL(convertedPdfUrl);
      setConvertedPdfUrl(null);
      setConvertedPdfSize(null);
    }
  };

  const handleFileInputChange = (e) => {
    processFiles(e.target.files);
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
    if (e.dataTransfer && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Reordering controls
  const moveImageUp = (index) => {
    if (index === 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const moveImageDown = (index) => {
    if (index === images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const resetAll = () => {
    images.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    if (convertedPdfUrl) {
      URL.revokeObjectURL(convertedPdfUrl);
    }
    setImages([]);
    setConvertedPdfUrl(null);
    setConvertedPdfSize(null);
    setErrorMessage(null);
    setIsConverting(false);
    setConversionProgress(0);
    setStatusMessage('');
  };

  // Load an image file into an Image element and base64 Data URL
  const loadImageFromFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () => resolve({ img, dataUrl });
        img.onerror = () =>
          reject(
            new Error(`Could not load ${file.name}. Please make sure it is a valid JPG/JPEG image.`)
          );
        img.src = dataUrl;
      };
      reader.onerror = () =>
        reject(
          new Error(`Could not load ${file.name}. Please make sure it is a valid JPG/JPEG image.`)
        );
      reader.readAsDataURL(file);
    });
  };

  // Convert to PDF
  const convertToPdf = async () => {
    if (images.length === 0) {
      setErrorMessage('Please add at least one JPG or JPEG image to convert.');
      return;
    }

    setIsConverting(true);
    setConversionProgress(0);
    setErrorMessage(null);
    setStatusMessage('Preparing images for PDF creation...');

    try {
      let doc = null;
      const margin = 10; // 10mm margins

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setStatusMessage(`Processing page ${i + 1} of ${images.length}...`);
        setConversionProgress(Math.round(((i + 1) / images.length) * 90));

        // Load image bitmap into memory directly from original File object
        const { img: imgElement, dataUrl } = await loadImageFromFile(item.file);

        const imgWidth = imgElement.naturalWidth || item.width || 100;
        const imgHeight = imgElement.naturalHeight || item.height || 100;
        const isLandscape = imgWidth > imgHeight;
        const orientation = isLandscape ? 'landscape' : 'portrait';

        // A4 page dimensions in mm
        const pageWidth = isLandscape ? 297 : 210;
        const pageHeight = isLandscape ? 210 : 297;

        // Calculate maximum available area considering margins
        const maxUsableWidth = pageWidth - margin * 2;
        const maxUsableHeight = pageHeight - margin * 2;

        // Scale preserving exact aspect ratio without distortion
        const scale = Math.min(maxUsableWidth / imgWidth, maxUsableHeight / imgHeight);
        const renderWidth = imgWidth * scale;
        const renderHeight = imgHeight * scale;

        // Center on A4 page
        const posX = margin + (maxUsableWidth - renderWidth) / 2;
        const posY = margin + (maxUsableHeight - renderHeight) / 2;

        // Compress large images onto an in-memory canvas to avoid huge PDF bloat
        const maxCanvasDim = 2400;
        let finalDataUrl = dataUrl;

        if (imgWidth > maxCanvasDim || imgHeight > maxCanvasDim) {
          const canvas = document.createElement('canvas');
          const canvasScale = Math.min(maxCanvasDim / imgWidth, maxCanvasDim / imgHeight);
          canvas.width = Math.round(imgWidth * canvasScale);
          canvas.height = Math.round(imgHeight * canvasScale);
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);
          finalDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        }

        if (i === 0) {
          doc = new jsPDF({
            orientation,
            unit: 'mm',
            format: 'a4',
            compress: true
          });
        } else {
          doc.addPage('a4', orientation);
        }

        doc.addImage(finalDataUrl, 'JPEG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
      }

      setStatusMessage('Finalizing PDF document...');
      setConversionProgress(100);

      if (convertedPdfUrl) {
        URL.revokeObjectURL(convertedPdfUrl);
      }
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);

      setConvertedPdfUrl(pdfUrl);
      setConvertedPdfSize(pdfBlob.size);
      setStatusMessage('Conversion complete!');
    } catch (err) {
      console.error('PDF generation error:', err);
      setErrorMessage(`Conversion error: ${err.message || 'Failed to generate PDF document.'}`);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="tool-view-container jpg-to-pdf-page">
      {/* Normalized Universal Tool Detail Header & Breadcrumb */}
      <ToolDetailHeader
        toolId="jpg-to-pdf"
        title="JPG to PDF Converter"
        description="Convert your JPG and JPEG images into clean, standard A4 PDF documents. Fast, 100% private, and processed entirely inside your browser. No files are ever sent to any server."
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

      {/* Main Interactive Tool Area */}
      <section className="converter-card" aria-label="JPG to PDF tool interface">
        {/* Upload Drop Zone (Shown when no files or for adding more) */}
        {images.length === 0 ? (
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
            aria-label="Upload JPG or JPEG images by clicking or dragging and dropping"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".jpg,.jpeg,image/jpeg"
              multiple
              className="hidden-file-input"
              aria-hidden="true"
            />
            <div className="dropzone-icon">🖼️</div>
            <h2 className="dropzone-title">Drop your JPG / JPEG images here</h2>
            <p className="dropzone-subtext">or click to browse your computer or mobile device</p>
            <div className="dropzone-badge-list">
              <span className="dropzone-badge">.JPG</span>
              <span className="dropzone-badge">.JPEG</span>
              <span className="dropzone-badge">Multiple Files</span>
              <span className="dropzone-badge">Client-Side Only</span>
            </div>
            <button
              type="button"
              className="btn-primary dropzone-cta"
              onClick={(e) => {
                e.stopPropagation();
                openFilePicker();
              }}
            >
              Choose JPG Images
            </button>
          </div>
        ) : (
          <div className="files-workbench">
            {/* Workbench Header */}
            <div className="workbench-header">
              <div className="workbench-title-box">
                <h2 className="workbench-title">
                  {images.length} {images.length === 1 ? 'Image' : 'Images'} Selected
                </h2>
                <span className="workbench-hint">
                  Reorder pages using Up/Down buttons before conversion.
                </span>
              </div>
              <div className="workbench-actions">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".jpg,.jpeg,image/jpeg"
                  multiple
                  className="hidden-file-input"
                  aria-hidden="true"
                />
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={openFilePicker}
                  disabled={isConverting}
                >
                  + Add More
                </button>
                <button
                  type="button"
                  className="btn-text-danger btn-sm"
                  onClick={resetAll}
                  disabled={isConverting}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Images Grid */}
            <div className="images-list" role="list" aria-label="Selected images for conversion">
              {images.map((item, index) => (
                <div key={item.id} className="image-item-card" role="listitem">
                  <div className="image-page-badge" title={`PDF Page ${index + 1}`}>
                    Page {index + 1}
                  </div>
                  <div className="image-preview-container">
                    <img src={item.previewUrl} alt={item.name} className="image-thumbnail" />
                  </div>
                  <div className="image-item-details">
                    <div className="image-name" title={item.name}>
                      {item.name}
                    </div>
                    <div className="image-meta">
                      <span>{formatBytes(item.size)}</span>
                      {item.width > 0 && (
                        <span>
                          • {item.width} × {item.height} px
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="image-item-controls">
                    <button
                      type="button"
                      className="order-btn"
                      onClick={() => moveImageUp(index)}
                      disabled={index === 0 || isConverting}
                      title="Move page up"
                      aria-label={`Move ${item.name} up`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="order-btn"
                      onClick={() => moveImageDown(index)}
                      disabled={index === images.length - 1 || isConverting}
                      title="Move page down"
                      aria-label={`Move ${item.name} down`}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      className="remove-btn"
                      onClick={() => removeImage(item.id)}
                      disabled={isConverting}
                      title="Remove image"
                      aria-label={`Remove ${item.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Conversion Controls & Feedback */}
            <div className="workbench-footer">
              {!convertedPdfUrl ? (
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
                      onClick={convertToPdf}
                    >
                      ⚡ Convert {images.length} {images.length === 1 ? 'Image' : 'Images'} to PDF
                    </button>
                  )}
                </div>
              ) : (
                <div className="conversion-success-card">
                  <div className="success-icon-badge">✓</div>
                  <div className="success-text-box">
                    <h3 className="success-title">Your PDF is Ready!</h3>
                    <p className="success-subtext">
                      Created 1 PDF with {images.length} {images.length === 1 ? 'page' : 'pages'}{' '}
                      ({formatBytes(convertedPdfSize)}).
                    </p>
                  </div>
                  <div className="success-actions">
                    <a
                      href={convertedPdfUrl}
                      download="jpg-to-pdf.pdf"
                      className="btn-primary btn-lg download-btn"
                    >
                      📥 Download PDF
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
      <ToolDetailContent toolId="jpg-to-pdf" />
    </div>
  );
}
