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

## 5. Active Tool Categories (49 Unique Tools)

FixMyFile features **49 unique active tools** organized across 7 internal phases:

1. **PDF Tools (Phase 1 & Phase 4 — 16 tools):**
   - Core conversions (`/jpg-to-pdf`, `/pdf-to-word`, `/pdf-to-jpg`, `/word-to-pdf`)
   - Organization (`/merge-pdf`, `/compress-pdf`, `/split-pdf`, `/rotate-pdf`, `/extract-pdf-pages`, `/delete-pdf-pages`, `/reorder-pdf-pages`)
   - Security (`/protect-pdf`, `/unlock-pdf`)
   - Office conversions (`/pdf-to-excel`, `/pdf-to-powerpoint`, `/pdf-to-text`)
2. **Image Tools (Phase 2, Phase 5 & Phase 7.7 — 16 tools):**
   - Core editing & optimization (`/background-remover`, `/image-compressor`, `/image-resizer`, `/image-converter`, `/jpg-to-png`, `/png-to-jpg`)
   - Extended formats & transforms (`/heic-to-jpg`, `/webp-to-jpg`, `/jpg-to-webp`, `/webp-to-png`, `/image-rotate-flip`, `/image-watermark`, `/image-to-pdf`, `/image-upscaler`, `/image-to-base64`)
   - Phase 7.7 Canvas Studio (`/image-cropper`)
3. **Calculators & Generators (Phase 3 — 7 tools):**
   - High-utility generation (`/qr-code-generator`, `/barcode-generator`, `/password-generator`)
   - Calculation & analytics (`/currency-converter`, `/percentage-calculator`, `/word-counter`, `/emi-calculator`)
4. **Media Tools (Phase 6 — 4 active tools):**
   - Audio & video processing (`/mp4-to-mp3`, `/video-compressor`, `/video-to-gif`, `/gif-maker`)
   - Note: 6 Phase 6 tools (Audio Converter, M4A to MP3, WAV to MP3, MP3 Cutter, Video Trimmer, Video to MP4) are deferred for future release.
5. **OCR / Text / Advanced File Tools (Phase 7 — 7 tools):**
   - In-browser text recognition (`/image-to-text`, `/pdf-ocr`, `/jpg-to-text`, `/png-to-text`, `/screenshot-to-text`, `/extract-text-from-pdf`, `/image-cropper`)

---

## 6. Client-Side Processing Architecture

> **Privacy Guarantee:** There is **NO** backend server, database, API service, or tracking layer. 100% of processing occurs in the user's browser.

- **WebAssembly & Web Workers:** CPU-intensive tasks (FFmpeg video encoding, Tesseract neural OCR, ONNX background removal) execute inside dedicated Web Workers with local WASM binaries (`public/vendor/`).
- **Performance Budget:** Initial homepage footprint is ~313 KB uncompressed (~94 KB gzip). Heavy assets are loaded solely on route access.
- **Production Deployment:** Hosted on Netlify at `https://fixmyfile.netlify.app`.
