# FixMyFile

FixMyFile is a fast, clean, path-based online utility tools platform designed to provide essential file, document, and media utilities directly in the browser with a strict privacy-first architecture.

All operations execute client-side whenever technically practical using WebAssembly, Canvas, and Web Workers, ensuring zero cloud retention and instantaneous performance.

---

## Current Status

- **Project Stage:** Production-Ready & Verified · Pre-Launch Audit Complete
- **Active Tools:** **49 Unique Active Tools** across 7 internal phases
  - Phase 1 — PDF Foundation: **6 / 6**
  - Phase 2 — Image Foundation: **6 / 6**
  - Phase 3 — Calculators & Generators: **7 / 7**
  - Phase 4 — PDF Expansion: **10 / 10**
  - Phase 5 — Image Expansion: **9 / 9**
  - Phase 6 — Media Tools: **4 Active** (6 deferred)
  - Phase 7 — OCR / Text / Advanced File Tools: **7 / 7** (including Phase 7.7 Image Cropper)
- **Deferred Future Tools:** **6** (Phase 6 audio/video tools: Audio Converter, M4A to MP3, WAV to MP3, MP3 Cutter, Video Trimmer, Video to MP4)
- **Master Strategy Scope:** **55 Planned Tools** (`tool-build-strategy.md`)
- **Production URL:** [https://fixmyfile.netlify.app](https://fixmyfile.netlify.app)
- **GitHub Repository:** [https://github.com/imdharamveersingh/fixmyfile](https://github.com/imdharamveersingh/fixmyfile)
- **Branch:** `master`
- **Automated Tests:** **55 test suites / 55 passed (100%)**
- **Performance:** Route-level code splitting (`React.lazy`), entry bundle ~313 KB uncompressed (~94 KB gzip)
- **Accessibility:** Skip-to-content bypass, single `<main>` landmark, ARIA-enabled dropdowns, keyboard focus restoration
- **SEO Foundation:** 50 sitemap URLs (1 homepage + 49 tool routes), canonical Netlify domain, per-route OpenGraph and JSON-LD

---

## Tech Stack

- **Core Framework:** React 19 + Vite 8
- **Routing:** React Router v7 (`react-router-dom`) with `React.lazy()` route-level code splitting
- **Styling:** Vanilla CSS (custom design tokens, dark theme, `:focus-visible` styling, reduced-motion support, zero UI framework bloat)
- **Linter:** Oxlint (`oxlint`)
- **Architecture:** Path-based routing with modular tool isolation under `src/tools/`
- **Client Engines:** Tesseract.js WASM, FFmpeg WASM, ONNX Runtime Web, PDF.js, pdf-lib, jsPDF, docx, exceljs, pptxgenjs, HTML5 Canvas

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/imdharamveersingh/fixmyfile.git

# Navigate to project directory
cd fixmyfile

# Install dependencies
npm install
```

### Development & Build Commands

```bash
# Start local development server (default: http://localhost:5173/)
npm run dev

# Run Oxlint for code quality
npm run lint

# Build production bundle with automatic sitemap generation
npm run build

# Preview production build locally
npm run preview
```

---

## Active Route Structure (49 Unique Active Tools)

FixMyFile employs clean, canonical path-based URLs for every tool to optimize usability, direct bookmarking, and SEO:

| Route | View / Tool | Category | Phase | Status |
|---|---|---|---|---|
| `/` | Home / Tool Directory | Directory | Foundation | Active · 49 Tools |
| `/jpg-to-pdf` | JPG to PDF | PDF Conversion | Phase 1 | Complete · In-Browser |
| `/pdf-to-word` | PDF to Word | PDF Conversion | Phase 1 | Complete · In-Browser (V2) |
| `/pdf-to-jpg` | PDF to JPG | PDF Conversion | Phase 1 | Complete · In-Browser |
| `/word-to-pdf` | Word to PDF | PDF Conversion | Phase 1 | Complete · In-Browser |
| `/merge-pdf` | Merge PDF | PDF Organization | Phase 1 | Complete · In-Browser |
| `/compress-pdf` | Compress PDF | PDF Optimization | Phase 1 | Complete · In-Browser |
| `/background-remover` | Background Remover | Image Editing | Phase 2 | Complete · Local AI / ONNX |
| `/image-compressor` | Image Compressor | Image Optimization | Phase 2 | Complete · In-Browser |
| `/image-resizer` | Image Resizer | Image Editing | Phase 2 | Complete · In-Browser |
| `/image-converter` | Image Converter | Image Conversion | Phase 2 | Complete · In-Browser |
| `/jpg-to-png` | JPG to PNG | Image Conversion | Phase 2 | Complete · In-Browser |
| `/png-to-jpg` | PNG to JPG | Image Conversion | Phase 2 | Complete · In-Browser |
| `/qr-code-generator` | QR Code Generator | Generators | Phase 3 | Complete · Vector SVG/PNG |
| `/barcode-generator` | Barcode Generator | Generators | Phase 3 | Complete · 8 1D Formats |
| `/currency-converter` | Currency Converter | Calculators | Phase 3 | Complete · 18 Currencies |
| `/percentage-calculator` | Percentage Calculator | Calculators | Phase 3 | Complete · 5 Modes |
| `/password-generator` | Password Generator | Generators | Phase 3 | Complete · Web Crypto API |
| `/word-counter` | Word Counter | Text Utilities | Phase 3 | Complete · Unicode Engine |
| `/emi-calculator` | EMI Calculator | Calculators | Phase 3 | Complete · Financial Math |
| `/split-pdf` | Split PDF | PDF Organization | Phase 4 | Complete · In-Browser |
| `/pdf-to-excel` | PDF to Excel | PDF Conversion | Phase 4 | Complete · In-Browser |
| `/pdf-to-powerpoint` | PDF to PowerPoint | PDF Conversion | Phase 4 | Complete · In-Browser |
| `/rotate-pdf` | Rotate PDF | PDF Organization | Phase 4 | Complete · In-Browser |
| `/protect-pdf` | Protect PDF | PDF Security | Phase 4 | Complete · AES-256 |
| `/unlock-pdf` | Unlock PDF | PDF Security | Phase 4 | Complete · In-Browser |
| `/pdf-to-text` | PDF to Text | PDF Conversion | Phase 4 | Complete · In-Browser |
| `/extract-pdf-pages` | Extract PDF Pages | PDF Organization | Phase 4 | Complete · In-Browser |
| `/delete-pdf-pages` | Delete PDF Pages | PDF Organization | Phase 4 | Complete · In-Browser |
| `/reorder-pdf-pages` | Reorder PDF Pages | PDF Organization | Phase 4 | Complete · In-Browser |
| `/heic-to-jpg` | HEIC to JPG | Image Conversion | Phase 5 | Complete · In-Browser |
| `/webp-to-jpg` | WebP to JPG | Image Conversion | Phase 5 | Complete · In-Browser |
| `/jpg-to-webp` | JPG to WebP | Image Conversion | Phase 5 | Complete · In-Browser |
| `/webp-to-png` | WebP to PNG | Image Conversion | Phase 5 | Complete · In-Browser |
| `/image-rotate-flip` | Image Rotate & Flip | Image Editing | Phase 5 | Complete · In-Browser |
| `/image-watermark` | Image Watermark | Image Editing | Phase 5 | Complete · In-Browser |
| `/image-to-pdf` | Image to PDF | Image Conversion | Phase 5 | Complete · In-Browser |
| `/image-upscaler` | Image Upscaler | Image Editing | Phase 5 | Complete · In-Browser |
| `/image-to-base64` | Image to Base64 | Image Utilities | Phase 5 | Complete · In-Browser |
| `/mp4-to-mp3` | MP4 to MP3 | Audio Extraction | Phase 6 | Complete · FFmpeg WASM |
| `/video-compressor` | Video Compressor | Video Optimization | Phase 6 | Complete · FFmpeg WASM |
| `/video-to-gif` | Video to GIF | Video Conversion | Phase 6 | Complete · FFmpeg WASM |
| `/gif-maker` | GIF Maker | Media Generation | Phase 6 | Complete · FFmpeg WASM |
| `/image-to-text` | Image to Text (OCR) | OCR & Text | Phase 7 | Complete · Local Tesseract |
| `/pdf-ocr` | PDF OCR | OCR & Text | Phase 7 | Complete · Local Tesseract |
| `/jpg-to-text` | JPG to Text | OCR & Text | Phase 7 | Complete · Local Tesseract |
| `/png-to-text` | PNG to Text | OCR & Text | Phase 7 | Complete · Local Tesseract |
| `/screenshot-to-text` | Screenshot to Text | OCR & Text | Phase 7 | Complete · Clipboard Paste |
| `/extract-text-from-pdf` | Extract Text from PDF | Text Extraction | Phase 7 | Complete · In-Browser |
| `/image-cropper` | Image Cropper | Image Editing | Phase 7.7 | Complete · HTML5 Canvas |

---

## Project Documentation Guide

Detailed planning and technical specifications are maintained across dedicated documentation:

- [`tool-build-strategy.md`](./tool-build-strategy.md) — **Authoritative source of truth** for the complete 55-tool scope, demand tiers, and build priority.
- [`ROADMAP.md`](./ROADMAP.md) — Master phase-by-phase implementation schedule and milestones across Phases 1 through 7.
- [`TOOL_STATUS.md`](./TOOL_STATUS.md) — Detailed 55-tool inventory and verification tracking (49 active, 6 deferred).
- [`PRD.md`](./PRD.md) — Product Requirements Document (vision, scope, user goals, non-goals).
- [`BRAIN.md`](./BRAIN.md) — Permanent engineering rules, constraints, and developer principles.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Technical design, folder structure, and tool integration guide.
- [`DECISIONS.md`](./DECISIONS.md) — Architecture Decision Records (ADRs).
- [`CHANGELOG.md`](./CHANGELOG.md) — Chronological history of completed project milestones.
