# FixMyFile — Technical Architecture

This document describes the technical design, routing structure, component hierarchy, and integration patterns of **FixMyFile**.

---

## 1. Current Architecture

FixMyFile is built as a modular, client-rendered single-page application (SPA) using **React 19**, **Vite 8**, and **React Router v7**.

### Core Principles
- **Canonical Path-Based Routing:** Every tool operates on a dedicated URL path (e.g., `/jpg-to-pdf`, `/image-cropper`), ensuring clean browser history, bookmarking, and search engine discoverability.
- **Route-Level Code Splitting:** Every tool module is loaded on-demand via `React.lazy()` and wrapped in `<Suspense fallback={<LoadingFallback />}>` and `<ErrorBoundary>`. The initial entry bundle is ~313 KB uncompressed (~94 KB gzip).
- **Tool Isolation:** Each tool lives in its own directory under `src/tools/<tool-id>/`. Heavy libraries (Tesseract.js, FFmpeg WASM, ONNX Runtime, PDF.js, ExcelJS, docx, pptxgenjs) are loaded only when their specific tool route is accessed.
- **Shared Layout Shell:** A single `Layout` component wraps all routed views, providing a persistent `Header` with accessible dropdown navigation, a skip-to-content bypass link (`#main-content`), and a global `Footer`.
- **Dynamic SEO Metadata:** Per-route title, description, canonical link, OpenGraph tags, and JSON-LD structured data are managed via `src/components/SEO.jsx` utilizing `VITE_SITE_URL` (production default: `https://fixmyfile.netlify.app`).
- **Centralized Registry:** Tool metadata (name, path, category, description, phase, status) is declared once in `src/tools/toolsRegistry.js` as the internal source of truth.

---

## 2. Directory Hierarchy

```
src/
├── assets/                  # Logos, icons, and static images
├── components/              # Shared, reusable UI components
│   ├── ErrorBoundary.jsx    # React error boundary catching route-level exceptions
│   ├── Footer.jsx           # Global footer with quick tool links & privacy guarantee
│   ├── Header.jsx           # Sticky header with compact multi-column dropdowns & ARIA
│   ├── Layout.jsx           # Top-level shell with skip-link + Header + Outlet + Footer
│   ├── LoadingFallback.jsx  # Accessible, spinner-based suspense loading indicator
│   ├── SEO.jsx              # React Helmet metadata injection and canonical URL management
│   └── ToolCard.jsx         # Card component used in tool listing grids
├── pages/                   # Top-level views
│   ├── HomePage.jsx         # Directory view listing 49 active tools & category sections
│   └── NotFoundPage.jsx     # Accessible 404 fallback page for unmatched URLs
├── services/                # Shared domain engines and processing pipelines
│   └── ocr/                 # Local Tesseract Web Worker OCR & PDF layer engine
├── tools/                   # 49 modular tool implementations (one subfolder per tool)
│   ├── background-remover/  # AI background removal via ONNX Runtime & WebAssembly
│   ├── barcode-generator/   # 1D barcode generator supporting 8 industrial formats
│   ├── compress-pdf/        # Lossless structural PDF stream compression via pdf-lib
│   ├── gif-maker/           # Animated GIF assembly via client-side FFmpeg WASM
│   ├── image-cropper/       # HTML5 Canvas cropping studio with aspect ratio lock (Phase 7.7)
│   ├── mp4-to-mp3/          # Client-side audio extraction via FFmpeg WASM
│   ├── pdf-ocr/             # Searchable PDF OCR layer generator via pdf-lib + Tesseract
│   ├── qr-code-generator/   # Vector SVG/PNG QR code generator
│   ├── toolsRegistry.js     # Internal canonical tool registry (49 active tools)
│   └── ...                  # Remaining active tool implementations
├── utils/                   # Shared utility helpers
│   └── helpers.js           # String formatters and general helper functions
├── App.css                  # Component, layout, and tool view styling
├── App.jsx                  # React Router configuration with React.lazy code splitting
├── index.css                # CSS variables, typography, focus-visible & reduced-motion reset
└── main.jsx                 # Application DOM mount
```

---

## 3. Layout & Routing Architecture

Routing is configured in `src/App.jsx` with route-level code splitting via `React.lazy`:

```jsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import LoadingFallback from './components/LoadingFallback';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded tool components (49 active routes)
const JpgToPdf = lazy(() => import('./tools/jpg-to-pdf'));
const ImageCropper = lazy(() => import('./tools/image-cropper'));
// ... other tool modules

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route
              path="jpg-to-pdf"
              element={
                <Suspense fallback={<LoadingFallback />}>
                  <JpgToPdf />
                </Suspense>
              }
            />
            {/* 48 additional active tool routes */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
```

---

## 4. Reusable Component Approach

- **`Layout`**: Houses global page landmarks. Features a top skip-to-content bypass link targeting `<main id="main-content">`, ensuring full keyboard accessibility.
- **`Header`**: Sticky header with brand logo (optimized 512×512 PNG) and keyboard-navigable dropdown mega-menus for PDF Tools, Image Tools, and Media Tools with full ARIA attributes (`aria-expanded`, `aria-haspopup`, `aria-controls`, `role="menu"`).
- **`SEO`**: Synchronizes document title, description, canonical link, OpenGraph tags, and JSON-LD structured data on every route.
- **`ToolCard`**: Standardized card used on the homepage featuring clean category indicators with zero internal development phase badges.
- **`LoadingFallback`**: Accessible suspense loading indicator with `role="status"` and `aria-live="polite"`.
- **`ErrorBoundary`**: Prevents whole-app crashes by catching isolated chunk-loading or tool runtime failures.

---

## 5. Active Tool Categories & Registry (49 Unique Tools)

FixMyFile provides **49 unique active tools** organized into **4 canonical user-facing categories** (defined in `src/data/homepageCategories.js` and reflected across the navigation header, homepage grids, and sitemap):

### Canonical User-Facing Categories

1. **PDF Tools (18 active tools):**
   - **Conversion (6):** JPG to PDF (`/jpg-to-pdf`), PDF to Word (`/pdf-to-word`), PDF to JPG (`/pdf-to-jpg`), Word to PDF (`/word-to-pdf`), PDF to Excel (`/pdf-to-excel`), PDF to PowerPoint (`/pdf-to-powerpoint`)
   - **Edit & Security (6):** Merge PDF (`/merge-pdf`), Compress PDF (`/compress-pdf`), Split PDF (`/split-pdf`), Rotate PDF (`/rotate-pdf`), Protect PDF (`/protect-pdf`), Unlock PDF (`/unlock-pdf`)
   - **Page Operations, Text & OCR (6):** PDF to Text (`/pdf-to-text`), Extract PDF Pages (`/extract-pdf-pages`), Delete PDF Pages (`/delete-pdf-pages`), Reorder PDF Pages (`/reorder-pdf-pages`), PDF OCR (`/pdf-ocr`), Extract Text from PDF (`/extract-text-from-pdf`)

2. **Image Tools (20 active tools):**
   - **Core Editing & Optimization (6):** Background Remover (`/background-remover`), Image Compressor (`/image-compressor`), Image Resizer (`/image-resizer`), Image Converter (`/image-converter`), JPG to PNG (`/jpg-to-png`), PNG to JPG (`/png-to-jpg`)
   - **Format Conversion & Transform (5):** HEIC to JPG (`/heic-to-jpg`), WebP to JPG (`/webp-to-jpg`), JPG to WebP (`/jpg-to-webp`), WebP to PNG (`/webp-to-png`), Image to Base64 (`/image-to-base64`)
   - **Editing & Studio (5):** Image Rotate & Flip (`/image-rotate-flip`), Image Watermark (`/image-watermark`), Image to PDF (`/image-to-pdf`), Image Upscaler (`/image-upscaler`), Image Cropper (`/image-cropper`)
   - **Image OCR & Extraction (4):** Image to Text (`/image-to-text`), JPG to Text (`/jpg-to-text`), PNG to Text (`/png-to-text`), Screenshot to Text (`/screenshot-to-text`)

3. **Media Tools (4 active tools):**
   - Audio Extraction: MP4 to MP3 (`/mp4-to-mp3`)
   - Video Optimization: Video Compressor (`/video-compressor`)
   - Animation: Video to GIF (`/video-to-gif`), GIF Maker (`/gif-maker`)

4. **Generators & Calculators (7 active tools):**
   - Generation: QR Code Generator (`/qr-code-generator`), Barcode Generator (`/barcode-generator`), Password Generator (`/password-generator`)
   - Calculation: Currency Converter (`/currency-converter`), Percentage Calculator (`/percentage-calculator`), Word Counter (`/word-counter`), EMI Calculator (`/emi-calculator`)

### Internal Implementation Phases (Historical Reference)

- **Phase 1 — PDF Foundation (6 tools):** Core PDF conversions, merge, compress
- **Phase 2 — Image Foundation (6 tools):** Background remover, compressor, resizer, converter, JPG/PNG interchange
- **Phase 3 — Calculators & Generators (7 tools):** QR code, barcode, currency, percentage, password, word counter, EMI
- **Phase 4 — PDF Expansion (10 tools):** Split, Excel, PowerPoint, rotate, protect, unlock, text, page extractions
- **Phase 5 — Image Expansion (9 tools):** HEIC, WebP, rotate/flip, watermark, image-to-PDF, upscaler, Base64
- **Phase 6 — Media Tools (4 active / 6 deferred):** MP4 to MP3, video compressor, video-to-GIF, GIF maker
- **Phase 7 — OCR, Text & Advanced File Tools (7 tools):**
  - OCR & Text Extraction (6): `/image-to-text`, `/pdf-ocr`, `/jpg-to-text`, `/png-to-text`, `/screenshot-to-text`, `/extract-text-from-pdf`
  - Canvas Studio (1): `/image-cropper` (Phase 7.7)

### Deferred Tools (Phase 6 Planned Media Scope — 6 Tools)

The following 6 tools from the master strategy scope (`tool-build-strategy.md`) are **deferred and not active** in the current build:
- Audio Converter (`/audio-converter`)
- M4A to MP3 (`/m4a-to-mp3`)
- WAV to MP3 (`/wav-to-mp3`)
- MP3 Cutter (`/mp3-cutter`)
- Video Trimmer (`/video-trimmer`)
- Video to MP4 (`/video-to-mp4`)

These deferred tools have zero routes in `App.jsx`, zero active entries in `toolsRegistry.js`, zero mega-menu links, and zero sitemap entries.

---

## 6. Client-Side Processing Architecture

> **Privacy Guarantee:** There is **NO** backend server, database, API service, or tracking layer. 100% of processing occurs in the user's browser.

- **WebAssembly & Web Workers:** CPU-intensive tasks (FFmpeg video encoding, Tesseract neural OCR, ONNX background removal) execute inside dedicated Web Workers with local WASM binaries (`public/vendor/`).
- **Performance Budget:** Initial homepage footprint is ~313 KB uncompressed (~94 KB gzip). Heavy assets are loaded solely on route access.
- **Production Deployment:** Hosted on Netlify at `https://fixmyfile.netlify.app`.

---

## 7. Future Tool Architecture & 10-Point Integration Contract (Phase 10)

To ensure the platform remains stable, performant, accessible, and search-optimized as new tools are developed, all future tools must adhere strictly to the **10-Point Architectural Integration Contract**.

This contract is automatically enforced at build and test time by `scripts/validate_tool_architecture.mjs` and `test_tool_architecture_guardrails.mjs`.

### 10-Point Integration Contract

| Step | Layer | File Target | Requirement & Contract Rules |
| :--- | :--- | :--- | :--- |
| **1** | **Tool Component** | `src/tools/<tool-id>/index.jsx` | Implement the tool module inside its isolated folder. Must use client-side browser processing (Canvas, Web Workers, WASM). Must render `ToolDetailHeader` and `ToolDetailContent`. |
| **2** | **Central Registry** | `src/tools/toolsRegistry.js` | Declare tool metadata in `ALL_TOOLS`: `{ id: '<kebab-id>', name: 'Tool Name', path: '/<kebab-id>', icon: '<kebab-id>', category: '<Category>', description: '<100-165 char desc>', status: 'Ready', phase: '<Phase>' }`. |
| **3** | **Route Splitting** | `src/App.jsx` | Add lazy import: `const <Name>Tool = lazy(() => import('./tools/<tool-id>'));` and route `<Route path="<tool-id>" element={<<Name>Tool />} />`. **Never import tool components synchronously.** |
| **4** | **SVG Icon Asset** | `src/components/toolSvgMap.js` | Add entry in `TOOL_SVG_MAP`: `'<tool-id>': new URL('../assets/.../<tool-id>.svg', import.meta.url).href`. The SVG must exist, be valid XML, and include a `viewBox`. |
| **5** | **Accent Tokens** | `src/components/toolAccentMap.js` | Add deterministic color tokens: `{ primary: '#HEX', border: 'rgba(r,g,b,0.3)', hoverBorder: 'rgba(r,g,b,0.65)' }` matching the primary SVG hue. |
| **6** | **Category Grouping**| `src/data/homepageCategories.js`| Add `<tool-id>` to the `toolIds` array of exactly **ONE** category in `HOMEPAGE_CATEGORIES`. Zero orphaned tools, zero duplicate cross-category assignments. |
| **7** | **Documentation** | `src/data/toolContent.js` | Add complete dictionary entry: `toolId`, technical `privacyNote`, `howTo` (title + 3–5 steps with title and description), and `faqs` (3–5 Q&A pairs with question ending in `?`). |
| **8** | **Related Cross-Links**| `src/data/toolContent.js` | In the same entry, define `relatedTools` containing 3–4 valid active tool IDs. Zero self-references, zero broken cross-links to nonexistent or deferred tools. |
| **9** | **SEO & Sitemap** | `scripts/generate_sitemap.mjs` | Regenerate sitemap: `node scripts/generate_sitemap.mjs`. The tool URL is dynamically included in `public/sitemap.xml` with canonical tag verified by `seoConfig.js`. |
| **10**| **Guardrail Check** | Pipeline Execution | Run verification: `node scripts/validate_tool_architecture.mjs && npm test && npm run lint && npm run build`. All automated checks must pass with zero errors. |

### Automated Architecture Guardrails Pipeline

The guardrail suite (`scripts/validate_tool_architecture.mjs`) automatically tests all 10 contract items across every tool in the registry:
1. **Registry & Routes Parity:** Asserts 1:1 bidirectional mapping between `toolsRegistry.js` and `App.jsx`.
2. **Code Splitting Enforcement:** Prevents accidental static tool imports from regressing entry bundle performance.
3. **SVG File Validity:** Confirms physical SVG assets exist on disk with valid dimensions.
4. **Color Token Validation:** Validates hex and rgba color syntax.
5. **Categorical Integrity:** Enforces partition consistency across the 4 canonical categories.
6. **Content Completeness:** Guarantees comprehensive How-To and FAQ coverage for every tool.
7. **Referential Integrity:** Guarantees all related-tool suggestions point to valid active routes.
8. **SEO Compliance:** Checks title and description length thresholds and canonical tags.
9. **Sitemap Synchronization:** Ensures sitemap.xml stays 100% synchronized with active routes.
