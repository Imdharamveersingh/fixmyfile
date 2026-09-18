# Changelog

All notable changes to the **FixMyFile** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
