# FixMyFile

FixMyFile is a fast, clean, path-based online utility tools platform designed to provide essential file, document, and media utilities directly in the browser with a strict privacy-first architecture.

The platform is developed following a rigorous phase-by-phase engineering approach. All operations execute client-side whenever technically practical, ensuring zero cloud retention and instantaneous performance.

---

## Current Status

- **Project Stage:** Phase 5 In Progress · 31 Active Tools
- **Active Tools:** **31** (Phase 1 PDF: 6, Phase 2 Image: 6, Phase 3 Generators: 7, Phase 4 Expansion: 10, Phase 5 Expansion: 2)
- **Total Master Planned Tools:** **55**
- **Remaining Planned Tools:** **24** (Phases 5 through 7)
- **GitHub Repository:** [https://github.com/imdharamveersingh/fixmyfile](https://github.com/imdharamveersingh/fixmyfile)
- **Branch:** `master`

### Master Roadmap Overview
- **Phase 1 — PDF Foundation:** `COMPLETE (6/6)`
- **Phase 2 — Image Foundation:** `COMPLETE (6/6)`
- **Phase 3 — Calculators & Generators:** `COMPLETE (7/7)`
- **Phase 4 — PDF Expansion:** `COMPLETE (10/10)`
- **Phase 5 — Image Expansion:** `IN PROGRESS (2/10)`
- **Phase 6 — Media Tools:** `PLANNED / NOT STARTED (0/10)`
- **Phase 7 — OCR / Text / Advanced File Tools:** `PLANNED / NOT STARTED (0/6)`

---

## Tech Stack

- **Core Framework:** React 19 + Vite 8
- **Routing:** React Router v7 (`react-router-dom`)
- **Styling:** Vanilla CSS (custom design tokens, dark theme, zero external UI framework bloat)
- **Linter:** Oxlint (`oxlint`)
- **Architecture:** Path-based routing with modular tool isolation under `src/tools/`

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

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## Active Route Structure (31 Implemented Tools)

FixMyFile employs clean, canonical path-based URLs for every tool to optimize usability, direct bookmarking, and SEO:

| Route | View / Tool | Category | Phase | Status |
|---|---|---|---|---|
| `/` | Home / Tool Directory | Directory | Foundation | Active |
| `/jpg-to-pdf` | JPG to PDF | PDF Conversion | Phase 1 | Complete · In-Browser |
| `/pdf-to-word` | PDF to Word | PDF Conversion | Phase 1 | Complete · In-Browser (V2) |
| `/pdf-to-jpg` | PDF to JPG | PDF Conversion | Phase 1 | Complete · In-Browser |
| `/word-to-pdf` | Word to PDF | PDF Conversion | Phase 1 | Complete · In-Browser |
| `/merge-pdf` | Merge PDF | PDF Organization | Phase 1 | Complete · In-Browser |
| `/compress-pdf` | Compress PDF | PDF Optimization | Phase 1 | Complete · In-Browser |
| `/background-remover` | Background Remover | Image Editing | Phase 2 | Complete · Local AI |
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
| `/image-cropper` | Image Cropper | Image Editing | Phase 5 | Complete · In-Browser |
| `/heic-to-jpg` | HEIC to JPG | Image Conversion | Phase 5 | Complete · In-Browser |

---

## Project Documentation Guide

Detailed planning and technical specifications are maintained across dedicated documentation:

- [`tool-build-strategy.md`](./tool-build-strategy.md) — **Authoritative source of truth** for the complete 55-tool scope, demand tiers, and build priority.
- [`ROADMAP.md`](./ROADMAP.md) — Master phase-by-phase implementation schedule and milestones across Phases 1 through 7.
- [`TOOL_STATUS.md`](./TOOL_STATUS.md) — Detailed 55-tool inventory and verification tracking.
- [`PRD.md`](./PRD.md) — Product Requirements Document (vision, scope, user goals, non-goals).
- [`BRAIN.md`](./BRAIN.md) — Permanent engineering rules, constraints, and developer principles.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Technical design, folder structure, and tool integration guide.
- [`DECISIONS.md`](./DECISIONS.md) — Architecture Decision Records (ADRs).
- [`CHANGELOG.md`](./CHANGELOG.md) — Chronological history of completed project milestones.
