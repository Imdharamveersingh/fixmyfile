import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// Format bytes into human-readable string
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Generate sanitized download filename
function getWatermarkedDownloadName(originalName, outputExt = 'png') {
  if (!originalName) return `watermarked-image.${outputExt}`;
  const lastDot = originalName.lastIndexOf('.');
  const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;
  const cleanBase =
    baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'image';
  return `${cleanBase}-watermarked.${outputExt}`;
}

// Validate supported image formats
function isSupportedImage(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'];
  const validMimes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml'
  ];
  return (
    validMimes.includes(type) ||
    validExtensions.some((ext) => name.endsWith(ext))
  );
}

export default function ImageWatermarkTool() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imgElement, setImgElement] = useState(null);
  const [originalDimensions, setOriginalDimensions] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Watermark mode: 'text' or 'image'
  const [watermarkType, setWatermarkType] = useState('text');

  // Text watermark options
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(36);
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [textColor, setTextColor] = useState('#ffffff');
  const [textOpacity, setTextOpacity] = useState(50); // 0 to 100
  const [textRotation, setTextRotation] = useState(-30); // degrees
  const [positionPreset, setPositionPreset] = useState('center'); // top-left, top-center, top-right, center, bottom-left, bottom-center, bottom-right
  const [isTiled, setIsTiled] = useState(false);

  // Image/Logo watermark options
  const [logoElement, setLogoElement] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoScale, setLogoScale] = useState(25); // percentage of width
  const [logoOpacity, setLogoOpacity] = useState(70);

  // Output format options
  const [outputFormat, setOutputFormat] = useState('png'); // png, jpeg, webp
  const [jpgQuality, setJpgQuality] = useState(92);

  // Status & processing
  const [processingState, setProcessingState] = useState('IDLE'); // IDLE, READY, EXPORTING, SUCCESS, ERROR
  const [errorMessage, setErrorMessage] = useState(null);

  // Export results
  const [exportedBlob, setExportedBlob] = useState(null);
  const [exportedUrl, setExportedUrl] = useState(null);
  const [exportedSize, setExportedSize] = useState(null);
  const [exportTime, setExportTime] = useState(null);

  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const activeOrigUrlRef = useRef(null);
  const activeLogoUrlRef = useRef(null);
  const activeExportUrlRef = useRef(null);

  // Set document title
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Add Watermark to Image Online — Free & 100% Private | FixMyFile';
    return () => {
      document.title = prevTitle;
    };
  }, []);

  // Cleanup object URLs
  const revokeOrigUrl = useCallback(() => {
    if (activeOrigUrlRef.current) {
      URL.revokeObjectURL(activeOrigUrlRef.current);
      activeOrigUrlRef.current = null;
    }
  }, []);

  const revokeLogoUrl = useCallback(() => {
    if (activeLogoUrlRef.current) {
      URL.revokeObjectURL(activeLogoUrlRef.current);
      activeLogoUrlRef.current = null;
    }
  }, []);

  const revokeExportUrl = useCallback(() => {
    if (activeExportUrlRef.current) {
      URL.revokeObjectURL(activeExportUrlRef.current);
      activeExportUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      revokeOrigUrl();
      revokeLogoUrl();
      revokeExportUrl();
    };
  }, [revokeOrigUrl, revokeLogoUrl, revokeExportUrl]);

  // Render watermark on canvas
  const drawWatermark = useCallback(
    (canvas, img, isExport = false) => {
      if (!canvas || !img) return;
      const ctx = canvas.getContext('2d');
      const w = img.naturalWidth;
      const h = img.naturalHeight;

      canvas.width = w;
      canvas.height = h;

      // Draw original source image
      ctx.clearRect(0, 0, w, h);
      if (outputFormat === 'jpeg' && isExport) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
      }
      ctx.drawImage(img, 0, 0, w, h);

      const margin = Math.max(16, Math.round(Math.min(w, h) * 0.05));

      if (watermarkType === 'text') {
        if (!watermarkText || watermarkText.trim() === '') return;

        ctx.save();
        ctx.globalAlpha = textOpacity / 100;
        ctx.fillStyle = textColor;
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'middle';

        if (isTiled) {
          // Tiled watermark repeated diagonally across entire canvas
          const textMetrics = ctx.measureText(watermarkText);
          const stepX = Math.max(textMetrics.width + 60, 140);
          const stepY = fontSize + 70;
          const rad = (textRotation * Math.PI) / 180;

          for (let y = -h; y < h * 2; y += stepY) {
            for (let x = -w; x < w * 2; x += stepX) {
              ctx.save();
              ctx.translate(x, y);
              ctx.rotate(rad);
              ctx.textAlign = 'center';
              ctx.fillText(watermarkText, 0, 0);
              ctx.restore();
            }
          }
        } else {
          // Preset position stamp
          let posX = w / 2;
          let posY = h / 2;
          let textAlign = 'center';

          switch (positionPreset) {
            case 'top-left':
              posX = margin;
              posY = margin + fontSize / 2;
              textAlign = 'left';
              break;
            case 'top-center':
              posX = w / 2;
              posY = margin + fontSize / 2;
              textAlign = 'center';
              break;
            case 'top-right':
              posX = w - margin;
              posY = margin + fontSize / 2;
              textAlign = 'right';
              break;
            case 'center':
              posX = w / 2;
              posY = h / 2;
              textAlign = 'center';
              break;
            case 'bottom-left':
              posX = margin;
              posY = h - margin - fontSize / 2;
              textAlign = 'left';
              break;
            case 'bottom-center':
              posX = w / 2;
              posY = h - margin - fontSize / 2;
              textAlign = 'center';
              break;
            case 'bottom-right':
              posX = w - margin;
              posY = h - margin - fontSize / 2;
              textAlign = 'right';
              break;
            default:
              posX = w / 2;
              posY = h / 2;
              textAlign = 'center';
          }

          ctx.save();
          ctx.translate(posX, posY);
          if (textRotation !== 0) {
            ctx.rotate((textRotation * Math.PI) / 180);
          }
          ctx.textAlign = textAlign;
          ctx.fillText(watermarkText, 0, 0);
          ctx.restore();
        }
        ctx.restore();
      } else if (watermarkType === 'image' && logoElement) {
        // Image / Logo Watermark
        ctx.save();
        ctx.globalAlpha = logoOpacity / 100;
        const targetLogoW = Math.round(w * (logoScale / 100));
        const targetLogoH = Math.round((logoElement.naturalHeight / logoElement.naturalWidth) * targetLogoW);

        let posX = (w - targetLogoW) / 2;
        let posY = (h - targetLogoH) / 2;

        switch (positionPreset) {
          case 'top-left':
            posX = margin;
            posY = margin;
            break;
          case 'top-center':
            posX = (w - targetLogoW) / 2;
            posY = margin;
            break;
          case 'top-right':
            posX = w - targetLogoW - margin;
            posY = margin;
            break;
          case 'center':
            posX = (w - targetLogoW) / 2;
            posY = (h - targetLogoH) / 2;
            break;
          case 'bottom-left':
            posX = margin;
            posY = h - targetLogoH - margin;
            break;
          case 'bottom-center':
            posX = (w - targetLogoW) / 2;
            posY = h - targetLogoH - margin;
            break;
          case 'bottom-right':
            posX = w - targetLogoW - margin;
            posY = h - targetLogoH - margin;
            break;
          default:
            posX = (w - targetLogoW) / 2;
            posY = (h - targetLogoH) / 2;
        }

        ctx.drawImage(logoElement, posX, posY, targetLogoW, targetLogoH);
        ctx.restore();
      }
    },
    [
      watermarkType,
      watermarkText,
      fontSize,
      fontFamily,
      textColor,
      textOpacity,
      textRotation,
      positionPreset,
      isTiled,
      logoElement,
      logoScale,
      logoOpacity,
      outputFormat
    ]
  );

  // Live preview effect
  useEffect(() => {
    if (imgElement && previewCanvasRef.current) {
      drawWatermark(previewCanvasRef.current, imgElement, false);
    }
  }, [drawWatermark, imgElement]);

  // Load primary image
  const loadFile = useCallback(
    (file) => {
      if (!file) return;

      revokeOrigUrl();
      revokeExportUrl();
      setExportedBlob(null);
      setExportedUrl(null);
      setExportedSize(null);
      setErrorMessage(null);

      if (!isSupportedImage(file)) {
        setErrorMessage('Unsupported file format. Please upload JPG, PNG, WebP, GIF, or BMP image.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size === 0) {
        setErrorMessage('The selected file is empty (0 bytes). Please choose a valid image.');
        setProcessingState('ERROR');
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 50 MB limit. Please choose a smaller image.');
        setProcessingState('ERROR');
        return;
      }

      // Default output format matches source image
      if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
        setOutputFormat('jpeg');
      } else if (file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp')) {
        setOutputFormat('webp');
      } else {
        setOutputFormat('png');
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      activeOrigUrlRef.current = url;

      const img = new Image();
      img.onload = () => {
        setImgElement(img);
        setOriginalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setProcessingState('READY');
      };
      img.onerror = () => {
        setErrorMessage('Failed to decode image. The file may be corrupt.');
        setProcessingState('ERROR');
      };
      img.src = url;
    },
    [revokeOrigUrl, revokeExportUrl]
  );

  // Load logo file
  const loadLogo = (file) => {
    if (!file) return;
    revokeLogoUrl();

    if (!isSupportedImage(file)) {
      setErrorMessage('Unsupported logo format. Please upload JPG, PNG, or WebP logo.');
      return;
    }

    setLogoFile(file);
    const url = URL.createObjectURL(file);
    activeLogoUrlRef.current = url;

    const img = new Image();
    img.onload = () => {
      setLogoElement(img);
      setWatermarkType('image');
    };
    img.onerror = () => {
      setErrorMessage('Could not load logo image file.');
    };
    img.src = url;
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  };

  const handleLogoInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) loadLogo(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);

  // Reset controls to defaults
  const handleResetControls = () => {
    setWatermarkType('text');
    setWatermarkText('CONFIDENTIAL');
    setFontSize(36);
    setFontFamily('sans-serif');
    setTextColor('#ffffff');
    setTextOpacity(50);
    setTextRotation(-30);
    setPositionPreset('center');
    setIsTiled(false);
    setLogoScale(25);
    setLogoOpacity(70);
    revokeExportUrl();
    setExportedBlob(null);
    setExportedUrl(null);
  };

  const handleClear = () => {
    revokeOrigUrl();
    revokeLogoUrl();
    revokeExportUrl();
    setSelectedFile(null);
    setImgElement(null);
    setOriginalDimensions(null);
    setLogoElement(null);
    setLogoFile(null);
    setExportedBlob(null);
    setExportedUrl(null);
    setExportedSize(null);
    setErrorMessage(null);
    setProcessingState('IDLE');
  };

  // Export watermarked image
  const handleExport = async () => {
    if (!imgElement) return;

    setProcessingState('EXPORTING');
    const t0 = performance.now();

    const canvas = document.createElement('canvas');
    drawWatermark(canvas, imgElement, true);

    const mime =
      outputFormat === 'jpeg'
        ? 'image/jpeg'
        : outputFormat === 'webp'
        ? 'image/webp'
        : 'image/png';
    const quality = outputFormat === 'jpeg' ? jpgQuality / 100 : 0.95;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMessage('Canvas export failed. Could not encode watermarked image.');
          setProcessingState('ERROR');
          return;
        }
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        setExportTime(elapsed);
        revokeExportUrl();

        const url = URL.createObjectURL(blob);
        activeExportUrlRef.current = url;
        setExportedBlob(blob);
        setExportedUrl(url);
        setExportedSize(blob.size);
        setProcessingState('SUCCESS');
      },
      mime,
      quality
    );
  };

  const handleDownload = () => {
    if (!exportedUrl || !selectedFile) return;
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const filename = getWatermarkedDownloadName(selectedFile.name, ext);
    const a = document.createElement('a');
    a.href = exportedUrl;
    a.download = filename;
    a.click();
  };

  const checkerboardStyle = {
    backgroundImage: `linear-gradient(45deg, #252538 25%, transparent 25%),
      linear-gradient(-45deg, #252538 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #252538 75%),
      linear-gradient(-45deg, transparent 75%, #252538 75%)`,
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#191929',
  };

  const positions = [
    { id: 'top-left', label: '↖ Top Left' },
    { id: 'top-center', label: '↑ Top Center' },
    { id: 'top-right', label: '↗ Top Right' },
    { id: 'center', label: '• Center' },
    { id: 'bottom-left', label: '↙ Bottom Left' },
    { id: 'bottom-center', label: '↓ Bottom Center' },
    { id: 'bottom-right', label: '↘ Bottom Right' },
  ];

  return (
    <div className="tool-page" id="image-watermark-tool">
      {/* Header */}
      <div className="tool-header">
        <div className="tool-breadcrumb">
          <Link to="/">Home</Link>
          <span className="breadcrumb-sep">›</span>
          <span>Image Watermark</span>
        </div>
        <h1 className="tool-title">Image Watermark</h1>
        <p className="tool-subtitle">
          Stamp custom text or graphic watermarks with live canvas preview, positioning presets,
          diagonal tiling, and full transparency preservation. 100% in-browser privacy.
        </p>
      </div>

      {/* Upload Zone (IDLE / ERROR) */}
      {processingState === 'IDLE' && !selectedFile && (
        <div className="tool-section">
          <div
            id="image-watermark-dropzone"
            className={`upload-area${isDragOver ? ' drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload image to watermark"
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <div className="upload-icon-wrap">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <p className="upload-title">Drop your image here</p>
            <p className="upload-subtitle">Supports JPG, PNG, WebP, GIF, and BMP</p>
            <button
              type="button"
              id="image-watermark-browse-btn"
              className="btn btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose Image File
            </button>
            <input
              ref={fileInputRef}
              id="image-watermark-file-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="alert alert-error" role="alert" id="image-watermark-error" style={{ marginBottom: '1.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {errorMessage}
        </div>
      )}

      {/* Watermark Workspace */}
      {selectedFile && (
        <div className="tool-section">
          {/* Top Control Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--surface-2, #1a1a2e)',
              padding: '0.8rem 1.2rem',
              borderRadius: '10px',
              marginBottom: '1rem',
            }}
          >
            {/* Watermark Type Selector */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                className={`btn btn-sm ${watermarkType === 'text' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setWatermarkType('text')}
              >
                Text Watermark
              </button>
              <button
                type="button"
                className={`btn btn-sm ${watermarkType === 'image' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setWatermarkType('image');
                  if (!logoElement) logoInputRef.current?.click();
                }}
              >
                Image / Logo Watermark
              </button>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoInputChange}
              />
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                id="watermark-reset-btn"
                className="btn btn-secondary btn-sm"
                onClick={handleResetControls}
              >
                Reset Settings
              </button>
              <button
                type="button"
                id="watermark-clear-btn"
                className="btn btn-secondary btn-sm"
                onClick={handleClear}
              >
                Choose New Image
              </button>
            </div>
          </div>

          {/* Controls Panel */}
          <div
            style={{
              background: 'var(--surface-2, #1a1a2e)',
              padding: '1.25rem',
              borderRadius: '10px',
              marginBottom: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {watermarkType === 'text' ? (
              <>
                {/* Text input */}
                <div>
                  <label htmlFor="watermark-text-input" className="option-label">
                    Watermark Text:
                  </label>
                  <input
                    id="watermark-text-input"
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="e.g. Copyright © 2026"
                    className="btn btn-secondary"
                    style={{
                      width: '100%',
                      background: 'var(--surface-1, #121220)',
                      color: '#fff',
                      textAlign: 'left',
                      border: '1px solid #444',
                    }}
                  />
                </div>

                {/* Font size */}
                <div>
                  <label htmlFor="watermark-font-size-slider" className="option-label">
                    Font Size: <strong>{fontSize}px</strong>
                  </label>
                  <input
                    id="watermark-font-size-slider"
                    type="range"
                    min="14"
                    max="120"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Font Family */}
                <div>
                  <label htmlFor="watermark-font-family" className="option-label">
                    Font Style:
                  </label>
                  <select
                    id="watermark-font-family"
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', background: 'var(--surface-1, #121220)', color: '#fff', border: '1px solid #444' }}
                  >
                    <option value="sans-serif">Sans-Serif (Modern)</option>
                    <option value="serif">Serif (Classic)</option>
                    <option value="monospace">Monospace (Code)</option>
                    <option value="Arial">Arial</option>
                    <option value="Impact">Impact (Bold)</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>

                {/* Color & Opacity */}
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div>
                      <label htmlFor="watermark-color-picker" className="option-label">
                        Color:
                      </label>
                      <input
                        id="watermark-color-picker"
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        style={{ width: '48px', height: '36px', borderRadius: '6px', border: '1px solid #444', background: 'transparent', cursor: 'pointer' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="watermark-opacity-slider" className="option-label">
                        Opacity: <strong>{textOpacity}%</strong>
                      </label>
                      <input
                        id="watermark-opacity-slider"
                        type="range"
                        min="5"
                        max="100"
                        value={textOpacity}
                        onChange={(e) => setTextOpacity(Number(e.target.value))}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label htmlFor="watermark-rotation-slider" className="option-label">
                    Angle / Rotation: <strong>{textRotation}°</strong>
                  </label>
                  <input
                    id="watermark-rotation-slider"
                    type="range"
                    min="-90"
                    max="90"
                    value={textRotation}
                    onChange={(e) => setTextRotation(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Tiled toggle */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label htmlFor="watermark-tiled-toggle" className="option-label">
                    Pattern / Repeat:
                  </label>
                  <button
                    type="button"
                    id="watermark-tiled-toggle"
                    role="switch"
                    aria-checked={isTiled}
                    className={`btn btn-sm ${isTiled ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setIsTiled((prev) => !prev)}
                    style={{ width: 'fit-content' }}
                  >
                    {isTiled ? '✓ Repeated Tile Pattern' : 'Single Stamp'}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Logo Options */}
                <div>
                  <label className="option-label">Watermark Logo:</label>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoFile ? `Change: ${logoFile.name}` : 'Upload Logo PNG/JPG'}
                  </button>
                </div>

                <div>
                  <label htmlFor="watermark-logo-scale" className="option-label">
                    Logo Scale: <strong>{logoScale}%</strong> of image width
                  </label>
                  <input
                    id="watermark-logo-scale"
                    type="range"
                    min="5"
                    max="80"
                    value={logoScale}
                    onChange={(e) => setLogoScale(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label htmlFor="watermark-logo-opacity" className="option-label">
                    Logo Opacity: <strong>{logoOpacity}%</strong>
                  </label>
                  <input
                    id="watermark-logo-opacity"
                    type="range"
                    min="10"
                    max="100"
                    value={logoOpacity}
                    onChange={(e) => setLogoOpacity(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}
          </div>

          {/* Position Presets (only when not tiled) */}
          {!isTiled && (
            <div
              style={{
                background: 'var(--surface-2, #1a1a2e)',
                padding: '0.8rem 1.2rem',
                borderRadius: '10px',
                marginBottom: '1.25rem',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                alignItems: 'center',
              }}
            >
              <span className="option-label" style={{ margin: 0, marginRight: '0.5rem' }}>
                Position Preset:
              </span>
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  id={`watermark-pos-${pos.id}`}
                  className={`btn btn-sm ${positionPreset === pos.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPositionPreset(pos.id)}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          )}

          {/* Live Preview Canvas */}
          <div
            className="preview-panel"
            style={{
              ...checkerboardStyle,
              borderRadius: '12px',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: '340px',
              overflow: 'hidden',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
            }}
          >
            <canvas
              ref={previewCanvasRef}
              id="watermark-preview-canvas"
              style={{
                maxWidth: '100%',
                maxHeight: '480px',
                objectFit: 'contain',
                borderRadius: '6px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                display: 'block',
              }}
            />
          </div>

          {/* Export Action Bar */}
          <div
            style={{
              marginTop: '1.5rem',
              background: 'var(--surface-2, #1a1a2e)',
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1.25rem',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="watermark-format" className="option-label" style={{ margin: 0 }}>
                  Format:
                </label>
                <select
                  id="watermark-format"
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="btn btn-secondary btn-sm"
                  style={{ background: 'var(--surface-1, #121220)', color: '#fff', border: '1px solid #444', padding: '0.4rem 0.6rem' }}
                >
                  <option value="png">PNG (Lossless / Alpha)</option>
                  <option value="jpeg">JPG (Universal)</option>
                  <option value="webp">WebP (Modern)</option>
                </select>
              </div>

              {outputFormat === 'jpeg' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="watermark-quality" className="option-label" style={{ margin: 0 }}>
                    Quality: {jpgQuality}%
                  </label>
                  <input
                    id="watermark-quality"
                    type="range"
                    min="50"
                    max="100"
                    value={jpgQuality}
                    onChange={(e) => setJpgQuality(Number(e.target.value))}
                    style={{ width: '100px' }}
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              id="watermark-apply-btn"
              className="btn btn-primary"
              onClick={handleExport}
              disabled={processingState === 'EXPORTING'}
            >
              {processingState === 'EXPORTING' ? 'Baking Watermark…' : 'Bake Watermark & Prepare Download'}
            </button>
          </div>

          {/* Success Result Banner */}
          {processingState === 'SUCCESS' && exportedBlob && exportedUrl && (
            <div className="result-banner" id="image-watermark-result" style={{ marginTop: '1.5rem' }}>
              <div className="result-icon success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className="result-info">
                <span className="result-title">Watermark baked successfully!</span>
                <span className="result-meta">
                  {originalDimensions && `${originalDimensions.width} × ${originalDimensions.height}px`}
                  {' · '}
                  {formatBytes(exportedSize)}
                  {' · '}
                  {outputFormat.toUpperCase()}
                  {exportTime && ` · ${exportTime}s`}
                </span>
              </div>
              <div className="result-actions">
                <button
                  type="button"
                  id="watermark-download-btn"
                  className="btn btn-primary"
                  onClick={handleDownload}
                >
                  Download Watermarked Image
                </button>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Source Format', value: selectedFile.type || 'Image' },
              { label: 'Source Dimensions', value: originalDimensions ? `${originalDimensions.width} × ${originalDimensions.height}px` : '—' },
              { label: 'Watermark Type', value: watermarkType === 'text' ? 'Text' : 'Image / Logo' },
              { label: 'Placement', value: isTiled ? 'Diagonal Tile Pattern' : positionPreset.replace('-', ' ').toUpperCase() },
              { label: 'Opacity', value: `${watermarkType === 'text' ? textOpacity : logoOpacity}%` },
              { label: 'Output Format', value: outputFormat.toUpperCase() },
              { label: 'Privacy', value: '100% In-Browser' },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '8px', padding: '0.75rem 1rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #888)', display: 'block' }}>{label}</span>
                <span style={{ fontSize: '0.92rem', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="tool-info-section" style={{ marginTop: '3rem' }}>
        <h2 className="tool-info-title">About Image Watermarking</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {[
            {
              title: 'Permanent Pixel Baking',
              body: 'Watermarks are directly rasterized into canvas pixels before export, preventing easy layer separation or removal.'
            },
            {
              title: 'Position Presets & Diagonal Tiling',
              body: 'Place discreet corner logos or protect photos from unauthorized theft with dense diagonal repeat patterns.'
            },
            {
              title: 'Custom Typography & Opacity',
              body: 'Fine-tune font size, color, opacity, and rotation angles to strike the ideal balance between copyright and visibility.'
            },
            {
              title: 'Zero Cloud Uploads',
              body: 'All photo processing is computed client-side in your web browser. Your private photos never touch external servers.'
            }
          ].map(({ title, body }) => (
            <div key={title} style={{ background: 'var(--surface-2, #1a1a2e)', borderRadius: '10px', padding: '1rem 1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>{title}</h3>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted, #aaa)', margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
