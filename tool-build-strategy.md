# FixMyFile — Master Tool Build Strategy & Authoritative Roadmap

> **Authoritative Document Notice:** This document is the single source of truth for the complete tool scope, demand prioritization, and phase-by-phase implementation sequence for **FixMyFile**. No tools outside this strategy may be invented, developed, or added without formal architectural approval.

---

## 1. Executive Summary & Master Count Validation

FixMyFile is designed as a browser-first, privacy-focused, path-based utility tools platform. The master architecture plans for **55 total tools** structured across 7 strategic execution phases.

### Master Mathematical Verification:

| Phase | Category / Domain Focus | Planned Count | Current Status | Implemented |
|---|---|---|---|---|
| **Phase 1** | PDF Foundation | 6 | `COMPLETE` | 6 / 6 |
| **Phase 2** | Image Foundation | 6 | `COMPLETE` | 6 / 6 |
| **Phase 3** | Calculators & Generators | 7 | `COMPLETE` | 7 / 7 |
| **Phase 4** | PDF Expansion | 10 | `NOT STARTED` | 0 / 10 |
| **Phase 5** | Image Expansion | 10 | `NOT STARTED` | 0 / 10 |
| **Phase 6** | Media Tools | 10 | `NOT STARTED` | 0 / 10 |
| **Phase 7** | OCR / Text / Advanced File Tools | 6 | `NOT STARTED` | 0 / 6 |
| **TOTAL** | **Full Strategic Scope** | **55** | **19 COMPLETE / 36 PLANNED** | **19 / 55** |

- **Current Implemented & Active Tools:** **19**
- **Future Planned Tools:** **36**
- **Master Total Planned Tools:** **55**

---

## 2. Core Strategic & Implementation Principles

1. **Client-First / Local-First Preference:** File transformations and computations must execute entirely in the user's web browser whenever technologically practical (using WebAssembly, Canvas, Web Workers, and native Web APIs).
2. **Zero Unnecessary Cloud Transmissions:** Preserve total user privacy. Files and personal data must not be stored, cached, or transmitted to remote servers unless a specific advanced operation strictly demands backend compute.
3. **Dedicated Canonical Routes:** Every tool operates on its own dedicated path-based route (e.g. `/split-pdf`, `/heic-to-jpg`). Modals, query-parameter hacks, and URL-less single-page app views are strictly prohibited.
4. **Phase-by-Phase Sequential Delivery:** Tools must be implemented sequentially within their assigned phase. Never attempt multi-phase bulk development. A phase must be fully verified and tested before advancing to the next.
5. **Never Fake Operations:** Never build mock downloads, dummy progress bars, or simulated operations. A tool is either fully functional and verified or remains unreleased.
6. **Zero UI Bloat:** Standardize on custom Vanilla CSS design tokens. Do not import heavy UI frameworks (Tailwind, Bootstrap, MUI) that inflate bundle sizes.
7. **Strict Quality Gates:** Every completed tool must achieve 0 lint errors (`oxlint`), clean production bundle compilation (`vite build`), comprehensive automated unit tests, and real Google Chrome (CDP) manual verification.

---

## 3. The Official 55-Tool Build Roadmap

### Phase 1 — PDF Foundation
- **Status:** `COMPLETE`
- **Count:** 6 Tools (6 implemented / 6 planned)
- **Domain:** High-demand core PDF transformation utilities.

| # | Tool Name | Path | Implemented Engine | Status |
|---|---|---|---|---|
| 1 | **JPG to PDF** | `/jpg-to-pdf` | `jspdf` + Canvas (orientation/dimension preservation) | `COMPLETE / PASS` |
| 2 | **PDF to Word** | `/pdf-to-word` | `pdfjs-dist` + `docx` (table detection & layout extraction) | `COMPLETE / PASS` |
| 3 | **PDF to JPG** | `/pdf-to-jpg` | `pdfjs-dist` + Canvas renderer (high-res rasterization) | `COMPLETE / PASS` |
| 4 | **Word to PDF** | `/word-to-pdf` | `docx-preview` + Canvas + `jspdf` (exact pagination fidelity) | `COMPLETE / PASS` |
| 5 | **Merge PDF** | `/merge-pdf` | `pdf-lib` (binary page concatenation & reordering) | `COMPLETE / PASS` |
| 6 | **Compress PDF** | `/compress-pdf` | `pdf-lib` (structural stream optimization & object deduplication) | `COMPLETE / PASS` |

---

### Phase 2 — Image Foundation
- **Status:** `COMPLETE`
- **Count:** 6 Tools (6 implemented / 6 planned)
- **Domain:** Browser-based image editing and format conversions.

| # | Tool Name | Path | Implemented Engine | Status |
|---|---|---|---|---|
| 7 | **Background Remover** | `/background-remover` | `@imgly/background-removal` + ONNX runtime WebAssembly | `COMPLETE / PASS` |
| 8 | **Image Compressor** | `/image-compressor` | Canvas + progressive binary search compression | `COMPLETE / PASS` |
| 9 | **Image Resizer** | `/image-resizer` | Canvas bicubic filtering + aspect ratio preservation | `COMPLETE / PASS` |
| 10 | **Image Converter** | `/image-converter` | Canvas + `upng-js` (JPG, PNG, WEBP multi-format) | `COMPLETE / PASS` |
| 11 | **JPG to PNG** | `/jpg-to-png` | Canvas + `upng-js` lossless PNG encoder | `COMPLETE / PASS` |
| 12 | **PNG to JPG** | `/png-to-jpg` | Canvas with alpha background blending | `COMPLETE / PASS` |

---

### Phase 3 — Calculators & Generators
- **Status:** `COMPLETE`
- **Count:** 7 Tools (7 implemented / 7 planned)
- **Domain:** Digital generation utilities and precision computation engines.

| # | Tool Name | Path | Implemented Engine | Status |
|---|---|---|---|---|
| 13 | **QR Code Generator** | `/qr-code-generator` | `qr-code-styling` + custom vector SVG/PNG engine | `COMPLETE / PASS` |
| 14 | **Barcode Generator** | `/barcode-generator` | `jsbarcode` (8 1D formats + GS1 Mod 10 checksums) | `COMPLETE / PASS` |
| 15 | **Currency Converter** | `/currency-converter` | Hybrid live rate fetch + 18-currency offline fallback | `COMPLETE / PASS` |
| 16 | **Percentage Calculator** | `/percentage-calculator` | 5 mathematical modes + division-by-zero protection | `COMPLETE / PASS` |
| 17 | **Password Generator** | `/password-generator` | Web Crypto API `crypto.getRandomValues()` + entropy meter | `COMPLETE / PASS` |
| 18 | **Word Counter** | `/word-counter` | Unicode-aware `Intl.Segmenter` + multilingual analytics | `COMPLETE / PASS` |
| 19 | **EMI Calculator** | `/emi-calculator` | Standard financial loan formula + ratio breakdown | `COMPLETE / PASS` |

---

### Phase 4 — PDF Expansion
- **Status:** `NOT STARTED`
- **Count:** 10 Tools (0 implemented / 10 planned)
- **Domain:** Advanced document manipulation, structure management, and Office conversions.
- **Implementation Note:** Scheduled for Phase 4 kickoff. Routes and engines will be officially created during Phase 4 development.

| # | Tool Name | Target Scope & Capabilities | Status |
|---|---|---|---|
| 20 | **Split PDF** | Extract page ranges or burst PDF into separate single-page documents client-side. | `PLANNED / NOT STARTED` |
| 21 | **PDF to Excel** | Parse tabular data from PDF files into structured XLSX spreadsheets. | `PLANNED / NOT STARTED` |
| 22 | **PDF to PowerPoint** | Convert PDF slide decks and presentations into editable PPTX slide format. | `PLANNED / NOT STARTED` |
| 23 | **Rotate PDF** | Permanently adjust orientation (90°, 180°, 270°) of individual pages or whole documents. | `PLANNED / NOT STARTED` |
| 24 | **Protect PDF** | Encrypt PDF files with standard AES/RC4 passwords and restriction permissions. | `PLANNED / NOT STARTED` |
| 25 | **Unlock PDF** | Decrypt and remove known passwords from secured PDF files client-side. | `PLANNED / NOT STARTED` |
| 26 | **PDF to Text** | Fast extraction of pure unformatted raw text (.txt) from PDF streams. | `PLANNED / NOT STARTED` |
| 27 | **Extract PDF Pages** | Select and export specific page numbers/ranges into a clean new PDF document. | `PLANNED / NOT STARTED` |
| 28 | **Delete PDF Pages** | Remove unwanted pages from a PDF and reassemble the remaining document. | `PLANNED / NOT STARTED` |
| 29 | **Reorder PDF Pages** | Visual drag-and-drop page reorganization with reordered PDF export. | `PLANNED / NOT STARTED` |

---

### Phase 5 — Image Expansion
- **Status:** `NOT STARTED`
- **Count:** 10 Tools (0 implemented / 10 planned)
- **Domain:** Modern photo codecs, editing transforms, and web asset utilities.

| # | Tool Name | Target Scope & Capabilities | Status |
|---|---|---|---|
| 30 | **HEIC to JPG** | Client-side decoding of Apple iPhone HEIC/HEIF images into standard JPG. | `PLANNED / NOT STARTED` |
| 31 | **WebP to JPG** | Decode modern Google WebP images to universal JPG format with background handling. | `PLANNED / NOT STARTED` |
| 32 | **JPG to WebP** | Convert JPG images to high-efficiency lossy/lossless WebP for modern web publishing. | `PLANNED / NOT STARTED` |
| 33 | **WebP to PNG** | Convert WebP graphics to lossless PNG preserving transparency channels. | `PLANNED / NOT STARTED` |
| 34 | **Image Rotate / Flip** | Arbitrary or 90-degree image rotation, horizontal flip, and vertical mirror. | `PLANNED / NOT STARTED` |
| 35 | **Image Watermark** | Stamp customizable text or graphic watermarks with opacity and positioning controls. | `PLANNED / NOT STARTED` |
| 36 | **Image to PDF** | Multi-format image ingestion (PNG, WEBP, GIF, SVG) to formatted PDF documents. | `PLANNED / NOT STARTED` |
| 37 | **Image Upscaler** | Client-side bicubic / super-resolution scaling for enlarged digital graphics. | `PLANNED / NOT STARTED` |
| 38 | **Image to Base64** | Encode image binaries into direct data URI / Base64 strings for web embedding. | `PLANNED / NOT STARTED` |

---

### Phase 6 — Media Tools
- **Status:** `NOT STARTED`
- **Count:** 10 Tools (0 implemented / 10 planned)
- **Domain:** Audio and video processing, trimming, conversion, and compression.

| # | Tool Name | Target Scope & Capabilities | Status |
|---|---|---|---|
| 40 | **MP4 to MP3** | Extract audio track from MP4 video containers into MP3 audio streams. | `PLANNED / NOT STARTED` |
| 41 | **Video Compressor** | Reduce video bitrate and dimensions for messaging and email sharing. | `PLANNED / NOT STARTED` |
| 42 | **Video to GIF** | Render animated GIF loops from short video clips with framerate controls. | `PLANNED / NOT STARTED` |
| 43 | **GIF Maker** | Assemble animated GIF files from multiple sequential image frames. | `PLANNED / NOT STARTED` |
| 44 | **Audio Converter** | Transcode audio streams between common web formats (MP3, WAV, AAC, OGG). | `PLANNED / NOT STARTED` |
| 45 | **M4A to MP3** | Convert voice memos and Apple M4A audio files into universal MP3 format. | `PLANNED / NOT STARTED` |
| 46 | **WAV to MP3** | Compress uncompressed studio WAV audio into lightweight MP3 format. | `PLANNED / NOT STARTED` |
| 47 | **MP3 Cutter** | Trim and slice audio tracks with waveform visualization for ringtones/clips. | `PLANNED / NOT STARTED` |
| 48 | **Video Trimmer** | Cut start and end timestamps from video files without full re-encoding. | `PLANNED / NOT STARTED` |
| 49 | **Video to MP4** | Transcode non-standard video containers (MKV, MOV, AVI) to universal MP4 format. | `PLANNED / NOT STARTED` |

---

### Phase 7 — OCR / Text / Advanced File Tools
- **Status:** `COMPLETE`
- **Count:** 7 Tools (7 implemented / 7 approved)
- **Domain:** Optical character recognition, document text extraction, advanced raster parsing, and image editing.
- **Phase 7 Status Breakdown:**
  - 7.1 Image to Text — `COMPLETE`
  - 7.2 PDF OCR — `COMPLETE`
  - 7.3 JPG to Text — `COMPLETE`
  - 7.4 PNG to Text — `COMPLETE`
  - 7.5 Screenshot to Text — `COMPLETE`
  - 7.6 Extract Text from PDF — `COMPLETE`
  - 7.7 Image Cropper — `COMPLETE`
- **Remaining Phase 7 Tools:** None (All 7 Phase 7 tools complete).

| # | Tool Name | Target Scope & Capabilities | Status |
|---|---|---|---|
| 49 | **Image to Text** | In-browser OCR extraction of text from photos, scans, and signage (`/image-to-text`). | `COMPLETE` |
| 50 | **PDF OCR** | Scan image-only or flat PDF documents and generate searchable text layers (`/pdf-ocr`). | `COMPLETE` |
| 51 | **JPG to Text** | OCR text recognition specifically tailored for JPEG receipts and scanned papers (`/jpg-to-text`). | `COMPLETE` |
| 52 | **PNG to Text** | Extract code, tabular data, and UI text from high-contrast PNG screenshots (`/png-to-text`). | `COMPLETE` |
| 53 | **Screenshot to Text** | Instant clipboard-paste OCR utility for capturing text from screen grabs (`/screenshot-to-text`). | `COMPLETE` |
| 54 | **Extract Text from PDF** | Deep structural text harvesting from complex multi-page PDF documents (`/extract-text-from-pdf`). | `COMPLETE` |
| 55 | **Image Cropper** | Newly approved Phase 7.7 tool (`/image-cropper`). Interactive canvas cropping with custom aspect ratios, rotation, and high-resolution export. | `COMPLETE` |


---

## 4. Phase Delivery & Governance Rules

- **Strict Phasing Sequence:** Phase 4 must reach 100% completion before Phase 5 starts. Phase 5 must reach 100% before Phase 6 starts, and Phase 6 before Phase 7.
- **Documentation Parity:** Any advancement of a tool must update `TOOL_STATUS.md`, `ROADMAP.md`, and `CHANGELOG.md` concurrently.
- **Architectural Guardrails:** Future tool routing will be declared in `src/tools/toolsRegistry.js` only when each tool's active development commences. No empty or decorative route stubs may be registered in advance.
