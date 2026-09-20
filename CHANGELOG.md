# Changelog

All notable changes to the **FixMyFile** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [2026-09-20] — Phase 2.5: JPG to PNG Converter Tool Implementation

### Added
- Implemented dedicated in-browser **JPG to PNG** tool at `/jpg-to-png`:
  - **Local-First Conversion Engine:** 100% client-side conversion from JPG/JPEG to real lossless PNG using native HTML5 Canvas 2D APIs with zero server uploads, no APIs, and complete privacy.
  - **Strict Format Input:** Dedicated input filter accepting only JPG and JPEG formats (`.jpg`, `.jpeg`, `image/jpeg`). Rejects other formats with clear, actionable user guidance.
  - **1:1 Dimension Preservation:** Zero downscaling, stretching, or cropping. Output dimensions strictly match source image natural dimensions.
  - **Output Verification:** Decodes generated PNG blob in-memory to confirm dimensional integrity before presenting success.
  - **Side-by-Side Comparative Preview:** Displays source JPG and generated PNG with dimensions, format badges, and file sizes. Includes backdrop preview toggles (White, Checkerboard, Black).
  - **Safe Browser Processing:** Guardrails against oversized images (> 10,000 px per side, > 40 MP, > 30 MB).
- Registered `jpg-to-png` in `src/tools/toolsRegistry.js` under `PHASE_2_TOOLS` and configured route in `src/App.jsx`.
- Updated navigation in `Header.jsx`, `Footer.jsx`, and `ROADMAP.md` (5 of 6 Phase 2 tools complete).
- Created automated test suite `test_jpg_to_png.mjs` (43 assertions passing) and real Google Chrome CDP manual validation suite `test_manual_jpg_to_png.mjs` (100% passing across 9 test suites).

---

## [2026-09-20] — Phase 2.4: Image Converter Tool Implementation

### Added
- Implemented in-browser **Image Converter** tool at `/image-converter`:
  - **Local-First Conversion Engine:** 100% client-side raster conversion between JPG, PNG, and WEBP using native HTML5 Canvas 2D APIs (`createImageBitmap` / `HTMLImageElement` + `canvas.toBlob()`), zero server uploads, and no external paid dependencies.
  - **Supported Raster Formats:** Converts between JPG, PNG, and WEBP. Unsupported formats (PDF, SVG, GIF, TIFF, HEIC, AVIF) are gracefully rejected with user-friendly alerts.
  - **1:1 Dimension Preservation:** Strictly maintains original image width and height without unwanted downscaling or distortion. Post-conversion validation checks decoded image natural dimensions against original source dimensions before displaying success.
  - **Alpha Transparency & Background Handling:**
    - Preserves alpha transparency when converting between formats with alpha support (PNG → PNG, PNG → WEBP, WEBP → PNG, WEBP → WEBP).
    - When converting transparent PNG/WEBP images to JPG (which lacks alpha support), provides a background color picker (White default, Black, or Custom hex) and explicit user guidance.
  - **Format-Specific Controls:** Quality slider for lossy JPG and WEBP formats (10% to 100%, default 80%); losslessly encoded PNG images display an informational card without misleading lossy quality controls.
  - **Same-Format Conversion Support:** Allows converting to the same format with clear re-encode notifications.
  - **Browser Compatibility Checks:** Tests canvas WebP encoding capability dynamically and disables unsupported output formats gracefully.
  - **Large Image Safety:** Safeguards against dimensions > 10,000 px or pixel counts > 40MP.
  - **Side-by-Side Preview & File Metrics:** Comparative dual preview with transparency backdrop toggles (Checkerboard, White, Black), format badges, dimensions, and file sizes.
- Registered `image-converter` in `src/tools/toolsRegistry.js` under `PHASE_2_TOOLS` and configured route in `src/App.jsx`.
- Updated navigation in `Header.jsx`, `Footer.jsx`, and `ROADMAP.md` (4 of 6 Phase 2 tools complete).
- Created automated test suite `test_image_converter.mjs` (53 assertions passing) and real Google Chrome CDP manual validation suite `test_manual_converter.mjs` (100% passing across 8 test suites).

---

## [2026-09-20] — Phase 2.3: Image Resizer Tool Implementation

### Added
- Implemented in-browser **Image Resizer** tool at `/image-resizer`:
  - **Local-First Resizing Engine:** Pure client-side Canvas 2D image scaling with high-quality bicubic smoothing (`imageSmoothingQuality = 'high'`), zero external server dependencies, and 100% privacy.
  - **Aspect Ratio Lock:** Ratio locked by default to prevent unintentional distortion. Modifying width dynamically recalculates proportional height, and modifying height recalculates width.
  - **Social Media & Standard Presets:** Pre-configured dimension presets (Full HD 1920×1080, 4:3 Standard 1600×1200, Square 1080×1080, 4:5 Portrait 1080×1350, 3:4 Portrait 1080×1440, 9:16 Story 1080×1920, and Thumbnail 800×800) with non-destructive "Fit Inside" scaling.
  - **Independent Dimension Scaling:** Unlocking aspect ratio allows arbitrary width/height sizing with explicit user warning indication.
  - **Format & Transparency Fidelity:** Preserves PNG 32-bit RGBA alpha transparency without white background clipping; supports JPEG quality control slider.
  - **Dimensional Safety Guards:** Proactively validates target pixel counts (<= 10,000 px and <= 40MP) to prevent browser memory exhaustion.
  - **Side-by-Side Comparison:** Comparative preview grid displaying original vs resized dimensions, scale multiplier, and resulting file sizes.
- Registered `image-resizer` in `src/tools/toolsRegistry.js` under `PHASE_2_TOOLS` and configured route in `src/App.jsx`.
- Updated navigation in `Header.jsx`, `Footer.jsx`, and active tools counter in `HomePage.jsx`.
- Created automated test suite `test_image_resizer.mjs` (42 assertions passing) and real Google Chrome CDP manual validation suite `test_manual_resizer.mjs` (100% passing).

---

## [2026-09-20] — Phase 2.2: Image Compressor Tool Implementation

### Added
- Implemented in-browser **Image Compressor** tool at `/image-compressor`:
  - **Local-First Compression Engine:** Integrated client-side image compression with zero server uploads, 100% privacy, no paid APIs, and no API keys.
  - **Format-Native Processing:** Native HTML5 Canvas API for high-performance JPEG discrete cosine transform quantization, combined with `upng-js` for advanced PNG color palette quantization and Deflate compression.
  - **Dimension Preservation (1:1):** Image dimensions are preserved strictly 1:1 without downscaling (e.g. 1920 × 1080 remains 1920 × 1080).
  - **Transparent PNG Support:** Retains alpha transparency channels for PNG inputs with selectable preview backdrop options (Checkerboard, White, Black).
  - **Honest Metrics & Non-Reducing Handling:** Accurately computes saved bytes and percentage reduction. Clearly flags already-optimized files where compression does not reduce bytes, avoiding fake savings percentages and offering the original file for download.
  - **Interactive Quality Slider:** Accessible quality range control (10% to 100%, default 80%) with quick presets (40%, 60%, 80%, 90%, 100%).
  - **Side-by-Side Visual Comparison:** Side-by-side comparative inspection between original and compressed output.
  - **Memory & Lifecycle Safety:** Automatic blob object URL creation and revocation on image replacement and unmount.
- Registered `image-compressor` in `src/tools/toolsRegistry.js` under `PHASE_2_TOOLS` and configured route in `src/App.jsx`.
- Added automated test suite `test_image_compressor.mjs` (37 assertions passing) and real Google Chrome CDP manual validation suite `test_manual_compressor.mjs` (100% passing).

---

## [2026-09-20] — Phase 2.1: Background Remover Tool Implementation

### Added
- Implemented in-browser **Background Remover** tool at `/background-remover`:
  - **Local-First AI Segmentation:** Integrated client-side background removal engine via `@imgly/background-removal` using in-browser WebAssembly and WebGPU neural network execution (ISNet). 100% private, zero server uploads, no paid APIs, and no API keys required.
  - **Dynamic Lazy Loading:** Library and model weights are dynamically imported on-demand, ensuring main application and Phase 1 routes load instantly without overhead.
  - **Drag & Drop & Validation:** File picker and dropzone accepting JPG, JPEG, and PNG images up to 25MB with client-side format and size checks.
  - **Dual Precision Options:** Provided High Precision (ISNet FP16) and Fast Mode (ISNet Quint8) for balance between fine edge detail and rapid inference.
  - **Interactive Transparent Preview:** Real-time visual comparison with original image and transparent output rendered against selectable checkerboard, solid white, or solid black backdrops.
  - **Full Alpha PNG Export:** Generates genuine transparent PNGs (`<filename>-no-bg.png`) with preserved source dimensions.
  - **Memory & Resource Safety:** Automated object URL lifecycle management revoking blob URLs on reset and unmount.
- Updated `src/tools/toolsRegistry.js` registering `background-remover` under `PHASE_2_TOOLS` and updating global lookups.
- Configured dedicated route `/background-remover` in `src/App.jsx`.
- Updated `Header.jsx`, `Footer.jsx`, and `HomePage.jsx` with Phase 2 Image Tools navigation.
- Created automated test suite `test_background_remover.mjs` verifying routing, validation, filename generation, and engine availability (37 assertions passing).

---

## [2026-09-20] — Phase 1 Completion & Phase 2 Kickoff Preparation

### Completed
- **Phase 1 (Core PDF Utilities) Sign-Off:** All six core PDF utilities have successfully completed development, automated testing, and manual quality assurance:
  1. **JPG to PDF** (`/jpg-to-pdf`) — PASS
  2. **PDF to Word** (`/pdf-to-word`) — PASS
  3. **PDF to JPG** (`/pdf-to-jpg`) — PASS
  4. **Word to PDF** (`/word-to-pdf`) — PASS
  5. **Merge PDF** (`/merge-pdf`) — PASS
  6. **Compress PDF** (`/compress-pdf`) — PASS
- **Comprehensive Validation:** Automated tests completed where applicable; manual validation completed across edge cases; difficult multi-page benchmarks verified; Word to PDF pagination fidelity verified against iLovePDF; Compress PDF verified with significant size reduction on 5-page document. Zero blocking issues remain.
- **Milestone Transition:** Advanced active project milestone to **Phase 2 — Image Drivers** (Background Remover, Image Compressor, Image Resizer, Image Converter, JPG → PNG, PNG → JPG).

---

## [2026-09-19] — Phase 1: Word to PDF Pagination Fidelity Fix

### Fixed
- Fixed critical pagination fidelity bug in Word to PDF converter at `/word-to-pdf` where continuous multi-page content was globally squeezed into fewer pages:
  - **Eliminated Global Scale-to-Fit Downscaling:** Replaced previous whole-section vertical scaling (`renderWidth = pageHeight * imgRatio`) with natural 1:1 scale canvas pagination. Tall sections overflowing a single page are now dynamically paginated into sequential A4 pages without shrinking typography or squashing layout.
  - **Document-Native Page Aspect Ratio Detection:** Calculated single-page canvas height based on the Word document's natural aspect ratio (`styleMinHeight / styleWidth` e.g. Letter 11in/8.5in or A4 297mm/210mm) rather than hardcoded A4 assumption, properly reflecting Word's page boundary thresholds.
  - **Line-Gap Whitespace Snapping:** Implemented intelligent pixel boundary detection (`findBestCutY`) scanning vertical rows near page boundaries to cut cleanly across empty line gaps, preventing text glyphs from being sliced horizontally across pages.
  - **Margin-Aware Continuation Slicing:** Preserved top and bottom page margins across overflowing multi-page sections, ensuring continuation text begins neatly below the top margin rather than colliding with the page edge.
  - **Benchmark Validation:** Verified `fixmyfile-difficult-word-test.docx` converts into exactly 3 pages matching iLovePDF benchmark behavior (Page 1: Heading + formatting + table + special chars + start of long content; Page 2: Continuation of long content; Page 3: Second Page and page-break content).
  - **Offscreen Staging CSS Adjustment:** Updated `.docx-offscreen-stage` in `src/App.css` from fixed `width: 820px` to `width: max-content; min-width: 1200px;`, allowing landscape and wide Word documents to layout naturally without artificial width clamping.
- Created automated regression test suite `test_word_to_pdf.mjs` verifying single-page documents produce exactly 1 PDF page and multi-page difficult documents produce 3 pages with proper dimensions.

---

## [2026-09-19] — Phase 1: JPG to PDF Converter Image Loading Bug Fix

### Fixed
- Fixed critical image-loading failure bug during JPG to PDF conversion (`Conversion error: Failed to load ...`):
  - **Premature Object URL Revocation:** Corrected React `useEffect` cleanup hook in `src/tools/jpg-to-pdf/index.jsx` where `[images, convertedPdfUrl]` dependencies caused preview object URLs to be revoked on every state re-render (such as initial dimension loading or reordering) while images were still active in the DOM. Synchronized cleanup to execute strictly on component unmount via `useRef`.
  - **Robust Image Decoding Pipeline:** Updated conversion image loading to read directly from the underlying `File` object via `FileReader` (`readAsDataURL`) into memory, ensuring independent, self-contained base64 JPEG encoding that is immune to object URL lifecycle issues.
  - **Improved User Guidance:** Enhanced image load failure error messaging from generic technical rejection to actionable guidance: `Could not load [filename]. Please make sure it is a valid JPG/JPEG image.`
- Created automated regression test suite `test_jpg_to_pdf.mjs` verifying single portrait, single landscape, single square, 3-image multi-page creation, and reordering.

---

## [2026-09-19] — Phase 1: PDF to Word Converter V2 Quality Upgrade

### Improved
- Upgraded client-side PDF to Word converter at `/pdf-to-word` to V2 quality:
  - **Conservative Native Table Detection:** Implemented multi-column spatial alignment and row grouping algorithm converting structured PDF data into native editable Microsoft Word (`<w:tbl>`) tables with preserved rows, columns, headers, and cell text without false positives on narrative text.
  - **Natural Paragraph Grouping:** Combined visual line fragments into continuous paragraphs based on vertical line gaps, line heights, and margin alignment, eliminating fragmented 1-line paragraphs in DOCX output.
  - **Heading & Hierarchy Recognition:** Extracted standalone heading lines with larger font size and bold weights into Word heading styles.
  - **Clean Page-Boundary Handling:** Applied `pageBreakBefore` directly to the first paragraph of subsequent source pages (or prepending page breaks before leading tables), preventing content from merging across pages while avoiding extraneous empty spacer paragraphs and trailing blank pages.
  - **Inline Formatting Preservation:** Preserved font weight (bold), style (italics), and size across text runs.
  - **Unicode & Special Character Handling:** Verified and preserved Unicode currency symbols, mathematical operators, and legal indicators without lossy regex character stripping.
  - **Table Metrics Display:** Added user-facing count of preserved tables in conversion success feedback.
- Created dedicated converter engine module `src/tools/pdf-to-word/converterEngine.js`.
- Created comprehensive regression pipeline test suite `test_pdf_to_word_pipeline.mjs` with deterministic difficult 5-page benchmark fixture verifying package validity, page counts, 4 detected tables (6x5, 5x6, 8x2, 10x3), identifiers, paragraphs, and special characters.

---

## [2026-09-19] — Phase 1: Compress PDF Tool Implementation (Phase 1 Complete)

### Added
- Implemented functional client-side Compress PDF tool at `/compress-pdf`:
  - Single-file PDF upload via accessible file picker and drag-and-drop zone supporting `.pdf` and `application/pdf`.
  - In-browser document inspection and page count detection using `pdf-lib`.
  - Detection and user-friendly error handling for encrypted/password-protected PDFs and corrupted documents.
  - Lossless PDF structural optimization using clean document recreation and reachable page copying (`copyPages`), stripping unreferenced historical objects, abandoned incremental revision tables, and dangling resources.
  - Flate object stream compression (`useObjectStreams: true`) repacking indirect objects and cross-reference tables into compact binary streams.
  - Honest byte-level metrics display showing original size, compressed size, and exact reduction percentage (`-XX.X%`).
  - Transparent handling for already-optimized PDFs: never inflates file size; displays clear notice when additional client-side compression is limited.
  - Direct browser download of generated PDF (`<original-name>-compressed.pdf`) with proper `application/pdf` MIME type.
  - Full reset lifecycle revoking object URLs (`URL.revokeObjectURL`) to prevent memory leaks.
  - Educational and SEO content (compression guide, key features, FAQ, and related tools).
- Updated `toolsRegistry.js` marking `compress-pdf` as `Ready`.
- Completed Phase 1 milestone: all 6 core PDF utilities (`/jpg-to-pdf`, `/pdf-to-word`, `/pdf-to-jpg`, `/word-to-pdf`, `/merge-pdf`, `/compress-pdf`) are fully functional in-browser tools.
- Created comprehensive regression test suite `test_compress_pdf.mjs` verifying document compression, valid header structure, page dimension preservation, already-optimized file handling, and corrupted file rejection.

---

## [2026-09-19] — Phase 1: Merge PDF Tool Implementation

### Added
- Implemented functional client-side Merge PDF tool at `/merge-pdf`:
  - Multi-file PDF picker and drag-and-drop upload zone supporting `.pdf` and `application/pdf`.
  - Non-PDF validation rejecting unsupported file formats with clear user feedback.
  - In-browser document inspection and page count detection using `pdf-lib`.
  - Detection and graceful rejection of corrupted or password-protected/encrypted PDFs with specific guidance.
  - Interactive ordered workbench with index badges, PDF icons, filename, file size, and page counts.
  - Intuitive reordering controls (`▲ Up`, `▼ Down`, `Remove`) with accessible ARIA labels.
  - Ability to add additional PDF documents without clearing previously selected files.
  - Lossless client-side PDF merging using `pdf-lib` (`copyPages` and `addPage`), preserving vector graphics, fonts, text searchability, images, and individual page orientations (portrait, landscape, custom sizes) without rasterization.
  - Real-time merge progress indicator with step-by-step status messages and percentage progress bar.
  - Output download card displaying sanitized output filename (`<first-document>-merged.pdf`), total combined files, page count, and file size.
  - Direct browser download of generated PDF with proper `application/pdf` MIME type.
  - Full reset and clear lifecycle with object URL cleanup (`URL.revokeObjectURL`).
  - Educational and SEO content (step-by-step merge guide, key features, FAQ, and related tools).
- Added `pdf-lib` dependency for browser-native lossless PDF document manipulation.
- Updated `toolsRegistry.js` marking `merge-pdf` as `Ready`.
- Created comprehensive regression test suite `test_merge_pdf.mjs` verifying multi-file merge, reordering, page dimension preservation, binary header validation, and corrupted PDF handling.

---

## [2026-09-18] — Phase 1: Word to PDF Converter Implementation

### Added
- Implemented functional client-side Word to PDF converter at `/word-to-pdf`:
  - Single-file DOCX picker and drag-and-drop upload supporting `.docx` format.
  - Dedicated validation rejecting legacy binary `.doc` files with clear guidance to save as `.docx`.
  - In-browser document rendering pipeline using `docx-preview` in a dedicated offscreen staging element.
  - Multi-page capture using `html2canvas` preserving typography, headings, margins, and page breaks.
  - Client-side A4 PDF compilation using `jsPDF` with automatic orientation matching and aspect-ratio preservation.
  - Direct browser download of generated PDF with sanitized source filename (`<original-name>.pdf`).
  - Interactive progress indicator tracking parsing, multi-page rendering, and PDF compilation.
  - Robust client-side error handling for corrupted files, invalid formats, and rendering failures.
  - Resource cleanup revoking object URLs and clearing staging elements to prevent memory leaks.
  - Educational and SEO content (conversion guide, key features, FAQ, and related FixMyFile tools).
- Added `docx-preview` dependency for client-side Word document rendering.
- Updated `toolsRegistry.js` marking `word-to-pdf` as `Ready`.

---

## [2026-09-18] — Phase 1: PDF to JPG Converter Implementation

### Added
- Implemented functional client-side PDF to JPG converter at `/pdf-to-jpg`:
  - Single-file PDF picker and drag-and-drop upload accepting `.pdf` and `application/pdf`.
  - In-browser document inspection and page count detection using `pdfjs-dist`.
  - High-definition per-page canvas rendering with calibrated resolution scale and white background fill.
  - Client-side canvas conversion to JPEG (`image/jpeg`, 0.88 quality) preserving natural aspect ratios without distortion.
  - Responsive results grid displaying rendered JPG previews, page numbers, pixel dimensions, and approximate file sizes.
  - Individual page download buttons with sanitized filenames (`<original-name>-page-<number>.jpg`).
  - Batch sequential "Download All JPGs" option for multi-page documents without external heavy dependencies.
  - Interactive processing state with stage-by-stage messages and animated progress bar.
  - Comprehensive client-side error handling for corrupted files, unsupported formats, and password-protected PDFs (`PasswordException`).
  - Full reset/clear lifecycle with proper `URL.revokeObjectURL` cleanup and memory reclamation.
  - Educational and SEO content (step-by-step conversion guide, key features, FAQ, and related tools).
- Updated `toolsRegistry.js` marking `pdf-to-jpg` as `Ready`.

---

## [2026-09-18] — Phase 1: PDF to Word Converter Implementation

### Added
- Implemented functional client-side PDF to Word converter at `/pdf-to-word`:
  - Single-file PDF upload via accessible file picker and drag-and-drop.
  - In-browser PDF parsing and page count analysis using `pdfjs-dist`.
  - Sequential text extraction preserving page sequence and line/paragraph grouping.
  - Multi-page document structure with clean page breaks separating original PDF pages.
  - Real Microsoft Word `.docx` package compilation using `docx` (`Packer.toBlob`).
  - Direct browser download of generated `.docx` with sanitized source document filename (`<original-name>.docx`).
  - Transparent error handling and detection for scanned/image-only PDFs lacking selectable text, explaining limitation and future OCR roadmap.
  - High-quality on-page educational and SEO content (How-to guide, features, FAQ, scanned PDF transparency note, related tools).
- Added `pdfjs-dist` and `docx` dependencies for client-side PDF parsing and DOCX document authoring.

---

## [2026-09-18] — Phase 1: JPG to PDF Converter Implementation

### Added
- Implemented functional client-side JPG to PDF converter at `/jpg-to-pdf`:
  - Multi-image file picker and drag-and-drop upload supporting `.jpg` and `.jpeg` formats.
  - Image preview list with thumbnails, file names, file sizes, and natural pixel dimensions.
  - Up and Down page reordering controls for organizing multi-page PDF sequence.
  - Client-side A4 PDF compilation using `jsPDF` with automatic orientation matching (portrait/landscape), aspect-ratio preservation, and auto-centering.
  - Direct browser download of generated PDF (`jpg-to-pdf.pdf`) with file size metrics.
  - Clear/Reset functionality with proper object URL revocation to prevent memory leaks.
  - Comprehensive validation and error handling for unsupported formats and corrupted files.
  - High-quality on-page SEO content (How-to guide, feature highlights, FAQ, and related tools).
- Added `jspdf` dependency for browser-side PDF document creation.

---

## [2026-09-18] — Documentation System Initialization

### Added
- Created comprehensive project documentation suite:
  - `README.md` — Developer onboarding and project architecture overview.
  - `PRD.md` — Product Requirements Document (vision, scope, goals, non-goals).
  - `BRAIN.md` — Permanent engineering rules, development constraints, and documentation update matrix.
  - `ARCHITECTURE.md` — Technical layout, component patterns, and new tool integration workflow.
  - `ROADMAP.md` — Phase-by-phase development schedule and milestone tracker.
  - `TOOL_STATUS.md` — Inventory and status tracking table for all strategic tools.
  - `CHANGELOG.md` — Chronological history of project changes.
  - `DECISIONS.md` — Architecture Decision Records (ADRs).

---

## [2026-09-18] — Branding Correction & Synchronization

### Changed
- Corrected visible branding from initial "ToolHub" to official name **FixMyFile** across:
  - Site header (`src/components/Header.jsx`)
  - Global footer title and copyright (`src/components/Footer.jsx`)
  - Document title (`index.html`)

---

## [2026-09-18] — Git & GitHub Repository Checkpoint

### Infrastructure
- Initialized local Git repository at project root.
- Created and tuned `.gitignore` to explicitly ignore dependencies, build artifacts, and environment secrets.
- Created root foundation commit (`79b5170` — *chore: initialize tool website foundation*).
- Created public remote repository on GitHub: `imdharamveersingh/fixmyfile`.
- Configured remote origin (`https://github.com/imdharamveersingh/fixmyfile.git`) and pushed `master` branch with upstream tracking.

---

## [2026-09-18] — Foundation & Routing Setup

### Added
- Installed and configured `react-router-dom` (React Router v7) with path-based canonical routing.
- Created initial route hierarchy:
  - `/` (Home Directory)
  - `/jpg-to-pdf` (JPG to PDF Tool Placeholder)
  - `/pdf-to-word` (PDF to Word Tool Placeholder)
  - `/pdf-to-jpg` (PDF to JPG Tool Placeholder)
  - `/word-to-pdf` (Word to PDF Tool Placeholder)
  - `/merge-pdf` (Merge PDF Tool Placeholder)
  - `/compress-pdf` (Compress PDF Tool Placeholder)
  - `*` (404 Not Found fallback)
- Created reusable UI architecture under `src/components/`:
  - `Layout.jsx` — Core shell with persistent header and footer.
  - `Header.jsx` — Navigation bar with category dropdown.
  - `Footer.jsx` — Responsive platform footer.
  - `ToolCard.jsx` — Standardized tool card component for grids.
  - `ToolPlaceholder.jsx` — Dedicated placeholder component with honest status messaging.
- Created centralized tool registry (`src/tools/toolsRegistry.js`).
- Created modular tool entry points under `src/tools/` for all 6 Phase 1 tools.
- Created homepage (`src/pages/HomePage.jsx`) showcasing platform mission and Phase 1 tool directory.
- Created clean design system tokens in `src/index.css` and component styling in `src/App.css`.
