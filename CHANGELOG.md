# Changelog

All notable changes to the **FixMyFile** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
