import pptxgen from 'pptxgenjs';

/**
 * PDF to PowerPoint (PPTX) Conversion Engine
 *
 * Renders PDF pages into high-fidelity slide canvases and packages them into
 * a genuine OpenXML presentation (.pptx) using PptxGenJS.
 * Preserves page order, slide aspect ratios, and captures text into slide notes.
 */

/**
 * Validates PDF binary buffer.
 */
export function validatePdfBuffer(pdfBuffer) {
  if (!pdfBuffer || pdfBuffer.byteLength === 0) {
    throw new Error('The selected file is empty. Please select a valid PDF file.');
  }

  const bytes = new Uint8Array(pdfBuffer);
  if (bytes.length < 5) {
    throw new Error('The file is too small to be a valid PDF document.');
  }

  const header = new TextDecoder('ascii').decode(bytes.subarray(0, 5));
  if (!header.startsWith('%PDF-')) {
    throw new Error('Invalid file format. The file is not a valid PDF document (missing %PDF- header).');
  }

  return bytes;
}

/**
 * Converts a PDF document into a genuine PowerPoint (.pptx) presentation.
 *
 * @param {ArrayBuffer|Uint8Array} pdfBuffer - Raw bytes of the PDF file
 * @param {Object} options - Conversion options
 * @param {Function} [options.onProgress] - Progress callback (percent: number, statusText: string)
 * @param {string} [options.baseFilename] - Base name for output file (without extension)
 * @param {number} [options.scale=2.0] - Render scale multiplier for high-DPI slide clarity
 * @param {number} [options.imageQuality=0.92] - JPEG quality for slide images (0.0 to 1.0)
 * @param {Object} [options.pdfjsLib] - Custom PDF.js instance (for Node testing)
 * @param {Function} [options.renderPage] - Custom render function (for headless/Node environments)
 * @returns {Promise<{ blob: Blob, buffer: Uint8Array, filename: string, slideCount: number }>}
 */
export async function convertPdfToPowerpoint(pdfSource, options = {}) {
  const {
    onProgress = () => {},
    baseFilename = 'presentation',
    scale = 2.0,
    imageQuality = 0.92,
    pdfjsLib = null,
    renderPage = null
  } = options;

  let pdfDoc = null;
  let numPages = 0;

  // Check if pdfSource is already a PDF.js PDFDocumentProxy
  if (pdfSource && typeof pdfSource.getPage === 'function' && typeof pdfSource.numPages === 'number') {
    pdfDoc = pdfSource;
    numPages = pdfDoc.numPages;
  } else {
    onProgress(5, 'Validating PDF file structure...');
    const bytes = validatePdfBuffer(pdfSource);

    // Resolve PDF.js library
    let pdfLib = pdfjsLib;
    if (!pdfLib) {
      try {
        pdfLib = await import('pdfjs-dist');
      } catch {
        throw new Error('PDF.js library could not be loaded.');
      }
    }

    onProgress(10, 'Reading PDF document structure...');
    try {
      const loadingTask = pdfLib.getDocument({
        data: bytes,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      });
      pdfDoc = await loadingTask.promise;
      numPages = pdfDoc.numPages;
    } catch (err) {
      if (err.name === 'PasswordException') {
        throw new Error('This PDF is password-protected. Please unlock it before converting.');
      }
      throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupted or invalid structure'}`);
    }
  }
  if (!numPages || numPages < 1) {
    throw new Error('The PDF document contains no pages.');
  }

  onProgress(15, `Initializing PowerPoint presentation (${numPages} ${numPages === 1 ? 'page' : 'pages'})...`);

  // Initialize PptxGenJS instance
  const PptxConstructor = typeof pptxgen === 'function' ? pptxgen : (pptxgen.default || pptxgen);
  const pptx = new PptxConstructor();

  // Inspect first page to determine dimensions and aspect ratio
  const firstPage = await pdfDoc.getPage(1);
  const firstViewport = firstPage.getViewport({ scale: 1.0 });
  const widthPoints = firstViewport.width || 595.28;
  const heightPoints = firstViewport.height || 841.89;

  // Convert PDF points (72 pt/in) to inches
  const widthInches = Math.max(Math.round((widthPoints / 72) * 100) / 100, 4);
  const heightInches = Math.max(Math.round((heightPoints / 72) * 100) / 100, 4);

  // Set presentation slide layout matching page dimensions
  pptx.defineLayout({
    name: 'PDF_MATCHED_LAYOUT',
    width: widthInches,
    height: heightInches
  });
  pptx.layout = 'PDF_MATCHED_LAYOUT';

  // Process each page as a slide
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const pct = Math.round(15 + ((pageNum - 1) / numPages) * 70);
    onProgress(pct, `Rendering slide ${pageNum} of ${numPages}...`);

    const page = pageNum === 1 ? firstPage : await pdfDoc.getPage(pageNum);

    // Extract text content for slide notes
    let notesText = '';
    try {
      const textContent = await page.getTextContent();
      if (textContent && textContent.items && textContent.items.length > 0) {
        notesText = textContent.items
          .map((item) => (item.str !== undefined ? item.str : ''))
          .filter((s) => s.trim().length > 0)
          .join(' ');
      }
    } catch {
      // Non-critical, continue without notes
    }

    let slideImageData = null;

    if (typeof renderPage === 'function') {
      // Use provided renderer (useful for Node testing)
      const res = await renderPage(page, scale, imageQuality);
      slideImageData = res.dataUrl || res;
    } else if (typeof document !== 'undefined') {
      // In-browser canvas rendering
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });

      // Draw white background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: ctx,
        viewport
      }).promise;

      slideImageData = canvas.toDataURL('image/jpeg', imageQuality);

      // Clean up canvas
      canvas.width = 0;
      canvas.height = 0;
    } else {
      throw new Error('Canvas rendering is not supported in this environment without a custom renderPage handler.');
    }

    // Add slide to presentation
    const slide = pptx.addSlide();
    slide.addImage({
      data: slideImageData,
      x: 0,
      y: 0,
      w: '100%',
      h: '100%'
    });

    if (notesText && notesText.trim().length > 0) {
      slide.addNotes(`Extracted text from PDF page ${pageNum}:\n\n${notesText.trim()}`);
    }

    // Allow UI thread to breathe between large slide renders
    await new Promise((r) => setTimeout(r, 0));
  }

  onProgress(88, 'Packaging PowerPoint presentation (.pptx)...');

  // Generate binary PPTX arraybuffer
  const arrayBuffer = await pptx.write({ outputType: 'arraybuffer' });
  const uint8Buffer = new Uint8Array(arrayBuffer);

  const cleanBaseName = baseFilename.replace(/\.pdf$/i, '').trim() || 'converted-presentation';
  const filename = `${cleanBaseName}.pptx`;

  const blob = new Blob([uint8Buffer], {
    type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });

  onProgress(100, `Successfully created ${filename} with ${numPages} slides!`);

  return {
    buffer: uint8Buffer,
    blob,
    filename,
    slideCount: numPages
  };
}
