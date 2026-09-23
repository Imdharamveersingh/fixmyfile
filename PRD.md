# FixMyFile — Product Requirements Document (PRD)

---

## 1. Product Overview

**FixMyFile** is a client-focused, path-based online utility platform designed to solve everyday document and file transformation tasks quickly and privately. The platform provides direct, dedicated browser routes for high-demand digital tools, starting with essential PDF conversion and manipulation utilities.

---

## 2. Product Purpose & Vision

- **Purpose:** Provide accessible, zero-friction, reliable file utilities directly to users without unnecessary signups, intrusive ads, or complex multi-step workflows.
- **Vision:** Become a dependable, fast, privacy-respecting file utility destination on the web, architected to scale across multiple utility categories while maintaining minimal overhead and optimal client-side execution.

---

## 3. Tool Demand Strategy & Scope

The platform's scope is defined by the authoritative **55-Tool Master Roadmap** documented in `tool-build-strategy.md`. The project spans 7 distinct phases covering high-demand digital file utilities:
1. **Phase 1 — PDF Foundation:** 6 tools (Complete)
2. **Phase 2 — Image Foundation:** 6 tools (Complete)
3. **Phase 3 — Calculators & Generators:** 7 tools (Complete)
4. **Phase 4 — PDF Expansion:** 10 tools (Complete)
5. **Phase 5 — Image Expansion:** 9 tools (Complete)
6. **Phase 6 — Media Tools:** 4 active / 6 deferred (4 Complete)
7. **Phase 7 — OCR / Text / Advanced File Tools:** 7 tools (Complete, including Phase 7.7 Image Cropper)

**Master Counts:**
- **Currently Implemented & Active:** 49 unique tools (Phases 1–7)
- **Future Planned / Deferred:** 6 tools (Phase 6 Media Tools)
- **Total Master Roadmap:** 55 tools

> **Authoritative Scope Reference:** `tool-build-strategy.md` serves as the authoritative source of truth for the complete 55-tool list, phase assignments, and build order. Image Cropper is canonicalized as Phase 7.7.

---

## 4. Current vs. Planned vs. Future Scope

### Current Scope (49 Implemented & Active Tools)
- **Application Foundation:** Vite 8 + React 19 + React Router v7 application shell with route-level code splitting (`React.lazy`), `LoadingFallback`, and `ErrorBoundary`.
- **Design System:** Responsive Vanilla CSS design tokens with dark theme, fluid typography, `:focus-visible` styling, and `prefers-reduced-motion` support.
- **Platform Shell:** Persistent `Header` (with compact multi-column dropdowns for PDF, Image, and Media Tools), `Footer`, and container `Layout` with a skip-to-content bypass link (`#main-content`).
- **Home Directory:** Landing view (`/`) displaying all 49 active tools with categorized grids and search filtering (clean presentation with 0 public roadmap phase badges).
- **Production Deployment:** Deployed at `https://fixmyfile.netlify.app` with dynamic canonical URL generation via `VITE_SITE_URL`.
- **Phase 1 (PDF Foundation — 6/6 Complete):**
  - `/jpg-to-pdf`: JPG to PDF Converter
  - `/pdf-to-word`: PDF to Word Converter
  - `/pdf-to-jpg`: PDF to JPG Converter
  - `/word-to-pdf`: Word to PDF Converter
  - `/merge-pdf`: Lossless PDF Merger
  - `/compress-pdf`: Lossless PDF Compressor
- **Phase 2 (Image Foundation — 6/6 Complete):**
  - `/background-remover`: AI Background Remover
  - `/image-compressor`: Client-Side Image Compressor
  - `/image-resizer`: Image Resizer
  - `/image-converter`: Multi-Format Image Converter
  - `/jpg-to-png`: Instant JPG to PNG Converter
  - `/png-to-jpg`: Instant PNG to JPG Converter
- **Phase 3 (Calculators & Generators — 7/7 Complete):**
  - `/qr-code-generator`: Interactive QR Code Generator
  - `/barcode-generator`: 1D Barcode Generator (8 GS1/industrial formats)
  - `/currency-converter`: Live & Offline Currency Converter (18 currencies)
  - `/percentage-calculator`: Multi-Mode Percentage Calculator
  - `/password-generator`: Cryptographically Secure Password Generator
  - `/word-counter`: Real-Time Multilingual Text & Word Counter
  - `/emi-calculator`: Comprehensive Loan EMI Calculator
- **Phase 4 (PDF Expansion — 10/10 Complete):**
  - `/split-pdf`: Split PDF
  - `/pdf-to-excel`: PDF to Excel Converter
  - `/pdf-to-powerpoint`: PDF to PowerPoint Converter
  - `/rotate-pdf`: Rotate PDF Pages
  - `/protect-pdf`: Encrypt PDF (AES-256)
  - `/unlock-pdf`: Unlock PDF
  - `/pdf-to-text`: PDF to Plain Text
  - `/extract-pdf-pages`: Extract PDF Pages
  - `/delete-pdf-pages`: Delete PDF Pages
  - `/reorder-pdf-pages`: Reorder PDF Pages
- **Phase 5 (Image Expansion — 9/9 Complete):**
  - `/heic-to-jpg`: Apple HEIC to JPG Converter
  - `/webp-to-jpg`: WebP to JPG Converter
  - `/jpg-to-webp`: JPG to WebP Converter
  - `/webp-to-png`: WebP to PNG Converter
  - `/image-rotate-flip`: Image Rotate & Flip
  - `/image-watermark`: Image Watermark Studio
  - `/image-to-pdf`: Multi-Image to PDF
  - `/image-upscaler`: Image Upscaler
  - `/image-to-base64`: Image to Base64
- **Phase 6 (Media Tools — 4 Active Complete):**
  - `/mp4-to-mp3`: MP4 to MP3 Audio Extractor
  - `/video-compressor`: Client-Side Video Compressor
  - `/video-to-gif`: Video to Animated GIF
  - `/gif-maker`: Multi-Image GIF Maker
- **Phase 7 (OCR / Text / Advanced File Tools — 7/7 Complete):**
  - `/image-to-text`: In-Browser OCR
  - `/pdf-ocr`: Searchable PDF OCR
  - `/jpg-to-text`: Receipt & Paper OCR
  - `/png-to-text`: Screenshot & Code OCR
  - `/screenshot-to-text`: Direct Clipboard Paste OCR
  - `/extract-text-from-pdf`: Structured PDF Text Extraction
  - `/image-cropper`: Phase 7.7 Canvas Image Cropper
- **Quality Gates:** 0 lint errors (`oxlint`), clean production build (`npm run build`), 55/55 automated test suites passing.

### Future Planned Scope (6 Deferred Media Tools Across Phase 6)
The following 6 Phase 6 media tools are scheduled in `tool-build-strategy.md` and are **PLANNED / DEFERRED** for future release:
- Audio Converter, M4A to MP3, WAV to MP3, MP3 Cutter, Video Trimmer, Video to MP4.

---

## 5. User Experience (UX) Goals

1. **Simplicity & Clarity:** Every tool must have a clear, distraction-free interface focused on its single primary action.
2. **Speed:** Instant page loads via route-level code splitting, minimal initial bundles (~313 KB uncompressed / ~94 KB gzip), and zero lag when switching tools.
3. **Transparency:** Never simulate or fake tool operations. Show genuine progress indicators, canvas previews, and file metrics.
4. **Responsiveness:** Flawless layout and interaction across mobile, tablet, and desktop screens with zero horizontal overflow.
5. **Accessibility:** WCAG-aligned accessibility featuring skip-to-content bypass, single `<main>` landmark, ARIA-enabled dropdowns, keyboard focus restoration, and visible focus indicators.

---

## 6. Functional Requirements (Platform Level)

- **FR-1 Path-Based URLs:** Each tool must reside on its own permanent, human-readable canonical path (e.g., `/jpg-to-pdf`). Deep-linking renders the tool immediately.
- **FR-2 Reusable Layout:** All pages render inside the global layout containing site navigation, brand identity, and contextual footer links.
- **FR-3 Modular Tool Encapsulation:** Each tool is isolated in its own folder under `src/tools/<tool-id>/` to prevent cross-tool regression.
- **FR-4 Centralized Registry:** Tool metadata (name, path, category, description, status, phase) is managed centrally in `src/tools/toolsRegistry.js`.
- **FR-5 Honest Status Handling:** All 49 active tools feature fully functional client-side engines. Deferred tools have no mock routes.

---

## 7. Non-Functional Requirements

- **NFR-1 Code Quality:** Zero linter errors (`oxlint`) across the repository.
- **NFR-2 Build Reliability:** Production bundles (`npm run build`) must build cleanly at all times.
- **NFR-3 Minimal Dependencies:** Rely on vanilla JavaScript, React, and targeted web APIs. No bloated third-party UI component frameworks.
- **NFR-4 Performance:** Initial JS bundle ~313 KB (~94 KB gzip); heavy engines (Tesseract, FFmpeg, ONNX, PDF.js, ExcelJS, docx) are dynamically imported on demand.
- **NFR-5 Accessibility:** Semantic HTML5 landmarks (single `<main>`), WCAG 2.1 AA contrast, keyboard navigation support, and skip-to-content.
- **NFR-6 SEO:** Full per-route metadata synchronization, OpenGraph tags, JSON-LD structured data, clean `sitemap.xml` with 50 URLs, and robots.txt.

---

## 8. Privacy & Client-First Processing Direction

- **Client-Side Preference:** Where practical and technologically feasible, file transformations occur locally within the user's browser using modern Web APIs, Canvas, Web Workers, and WebAssembly.
- **Zero Data Retention:** User documents are never stored, cached, or transmitted to remote servers.
- **Privacy By Design:** The user maintains complete control over their files.

---

## 9. Current Non-Goals (Explicitly Out of Scope)

The following areas are intentionally postponed and must NOT be introduced at this stage:
- No backend server or cloud functions.
- No database or persistent user storage.
- No user authentication or user accounts.
- No payment processing or subscriptions.
- No advertising networks or third-party tracking scripts.
- No analytics platforms.
