# Architecture & Project Decision Records (ADRs)

This document records the official technical and strategic decisions made for **FixMyFile**.

---

## Decision: FixMyFile Project Name & Brand Identity

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** The initial repository was created under a generic workspace name (`tool-website`) and initially displayed a placeholder title (`ToolHub`).
- **Decision:** Officially establish **FixMyFile** as the permanent brand name across the codebase, header, footer, documentation, and GitHub repository.
- **Reason:** Aligns the project with its core focus on document and file transformation utilities, establishing a memorable, professional identity.
- **Impact:** All brand references in code (`index.html`, `Header.jsx`, `Footer.jsx`, and docs) consistently use FixMyFile.

---

## Decision: Path-Based URL Architecture

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Online utility suites often either use single-page modal-based interfaces or dedicated URLs for each tool.
- **Decision:** Adopt a strict path-based URL architecture where every tool has its own top-level canonical path (e.g., `/jpg-to-pdf`, `/merge-pdf`).
- **Reason:** Essential for user bookmarking, clean browser history, direct deep-linking, and organic search engine discovery (SEO).
- **Impact:** React Router v7 routes each tool to its own path; new tools must register a path rather than using query parameters or UI tabs.

---

## Decision: Phase-by-Phase Development Workflow

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** The full strategic backlog encompasses 36 tools across multiple categories.
- **Decision:** Build and deliver tools strictly phase-by-phase, completing one tool's implementation and testing before starting the next.
- **Reason:** Prevents half-finished features, reduces regression risks, ensures high code quality, and maintains predictable milestone delivery.
- **Impact:** Phase 1 focuses exclusively on the 6 core PDF utilities. Remaining tools will only be built in future phases.

---

## Decision: Demand-Based Tool Selection (36 Tools, 4 Tiers)

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** The utility tool space is vast, with hundreds of possible niche tools of varying utility and traffic potential.
- **Decision:** Restrict platform tool scope to exactly 36 tools filtered strictly across four demand tiers: Very High, High, Medium-High, and Medium demand.
- **Reason:** Maximizes impact and organic utility demand while preventing scope creep and unvalidated feature development.
- **Impact:** No tools outside the 36-tool strategy may be invented or added to the project backlog.

---

## Decision: tool-build-strategy.md as Authoritative Source of Truth

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Need a definitive single source of truth for the complete 36-tool inventory, demand levels, and build order.
- **Decision:** Designate `tool-build-strategy.md` as the authoritative, inviolable source of truth for tool scope and sequencing.
- **Reason:** Ensures consistent, unambiguous scope across all planning documents, roadmaps, and development tasks.
- **Impact:** Developers and agents must not modify or replace `tool-build-strategy.md`; all documentation derives its tool scope from this document.

---

## Decision: Domain Configuration Postponed

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Production deployment, DNS records, and custom domains were evaluated during initial planning.
- **Decision:** Intentionally postpone domain registration, DNS, and hosting deployment configuration until after local foundations and Phase 1 tool development achieve stability.
- **Reason:** Keeps early focus purely on architectural soundness, clean client-side tool performance, and solid documentation.
- **Impact:** Project runs locally via Vite dev server (`http://localhost:5173/`) without external hosting dependencies.

---

## Decision: GitHub Repository Linkage (imdharamveersingh/fixmyfile)

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Local Git repository required a centralized remote checkpoint under the project owner's GitHub account.
- **Decision:** Link `origin` to `https://github.com/imdharamveersingh/fixmyfile.git` on the `master` branch with upstream tracking.
- **Reason:** Matches the official project owner identity (`imdharamveersingh`) and brand name (`fixmyfile`).
- **Impact:** All commits and documentation are version-controlled and backed up on GitHub.

---

## Decision: Client-First Processing Direction

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Many online PDF tools upload files to remote servers, incurring high bandwidth costs, latency, and privacy/GDPR concerns.
- **Decision:** Establish a client-first processing architecture where file operations (conversion, merging, compression) run locally in the user's browser whenever technically practical.
- **Reason:** Protects user privacy, eliminates server compute and storage costs, and delivers instantaneous performance without upload delays.
- **Impact:** Future tool engines will leverage browser APIs, Canvas, Web Workers, and WebAssembly rather than server-side conversion endpoints.

---

## Decision: Client-Side PDF Library Selection (jsPDF)

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Implementing the JPG to PDF converter required a browser-compatible PDF document generation engine without requiring a server backend.
- **Decision:** Adopt `jspdf` as the standard client-side PDF document generation library for FixMyFile.
- **Reason:** `jspdf` is mature, well-maintained, lightweight, runs entirely in the browser, supports multi-page document compilation with dynamic page sizes and orientations, and requires no external binaries or backend services.
- **Impact:** Images are converted and packaged directly in client memory; PDF generation is instant and private.

---

## Decision: Client-Side PDF to Word Engine Selection (pdfjs-dist + docx)

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Implementing a browser-native PDF to Word converter required two distinct capabilities without backend servers: (1) extracting selectable text and page structure from PDF binaries, and (2) packaging extracted content into genuine Microsoft Word (`.docx`) OpenXML files.
- **Decision:** Adopt `pdfjs-dist` (Mozilla PDF.js) for client-side PDF document parsing/text extraction, and `docx` for browser-native OpenXML `.docx` compilation.
- **Reason:** Both libraries are standard, highly mature, open-source, and support zero-backend browser execution with Web Workers. `docx` outputs valid PKZip-packaged `.docx` archives compatible with Microsoft Word and Google Docs.
- **Impact:** Converts text-based PDFs entirely on the user's device. Scanned/image-only PDFs are explicitly recognized as requiring OCR, which is separated into a future dedicated tool.

---

## Decision: Client-Side Word to PDF Engine Selection (docx-preview + html2canvas + jsPDF)

- **Date:** 2026-09-18
- **Status:** Accepted
- **Context:** Implementing browser-native Word (`.docx`) to PDF conversion required parsing OpenXML `.docx` documents, rendering complex typography/tables/headers into visual pages, and compiling those pages into a standard A4 PDF document without server-side compute or LibreOffice/headless Word binaries.
- **Decision:** Adopt `docx-preview` for in-browser OpenXML document layout rendering, paired with `html2canvas` for high-resolution page rasterization, and standard `jsPDF` for multi-page A4 PDF document compilation.
- **Reason:** `docx-preview` runs completely in-browser without server dependencies, faithfully interpreting Word XML into standard HTML/CSS. `html2canvas` and `jsPDF` work in tandem to capture exact visual pagination and assemble downloadable standard PDF files locally.
- **Impact:** Word documents convert directly on user devices with 100% privacy, zero server cost, and preserved multi-page formatting.

---

## Decision: Client-Side Lossless PDF Merging Engine (pdf-lib)

- **Date:** 2026-09-19
- **Status:** Accepted
- **Context:** Implementing the Merge PDF tool required combining pages from multiple distinct PDF documents entirely within the user's browser without backend servers. The merger had to preserve vector paths, fonts, text searchability, images, page dimensions, and orientations (portrait, landscape, custom sizes) without destructive rasterization into intermediate images.
- **Decision:** Adopt `pdf-lib` as the dedicated client-side PDF document manipulation engine for FixMyFile.
- **Reason:** Unlike `pdfjs-dist` (which focuses on rendering and text extraction) or `jspdf` (which focuses on document creation), `pdf-lib` allows native low-level parsing, manipulation, page copying (`copyPages`), and binary serialization of existing PDF documents in browser memory. It performs lossless page merges directly on PDF object trees with zero quality loss and negligible memory overhead.
- **Impact:** Multi-document PDF merging operates entirely in client memory with 100% privacy, preserving full fidelity and selectable text.

---

## Decision: Client-Side Lossless PDF Compression Strategy (Object Stream Packaging via pdf-lib)

- **Date:** 2026-09-19
- **Status:** Accepted
- **Context:** Implementing the Compress PDF tool required reducing PDF file sizes entirely inside the browser without remote servers, lossy image downsampling, or rasterizing pages into images (which would destroy vector quality and selectable text).
- **Decision:** Implement a lossless structural optimization pipeline utilizing `pdf-lib` reachable page copying (`copyPages`) paired with binary object stream compression (`useObjectStreams: true`). The system extracts reachable page object trees into a clean document (stripping orphaned revisions, deleted page remnants, and unreferenced metadata) and packages indirect objects and cross-reference tables into compressed Flate streams.
- **Reason:** Reusing `pdf-lib` requires zero new dependencies, preserves 100% vector sharpness, font integrity, and image fidelity, and honestly achieves substantial size reduction on unoptimized documents (typically 20%–50%+) while transparently protecting already-optimized files from size inflation.
- **Impact:** Delivers real, safe, and private PDF compression without backend costs, lossy artifacts, or fake metrics.

---

## Decision: Client-Side Spatial Table Reconstruction & Paragraph Continuity Strategy (PDF to Word V2)

- **Date:** 2026-09-19
- **Status:** Accepted
- **Context:** FixMyFile PDF to Word V1 extracted text purely as individual 1-line paragraphs and was unable to convert tabular data into editable Word tables, resulting in unstructured lines in Word. Upgrading the tool required an algorithm that reliably converts multi-column tabular data into native Office OpenXML (`<w:tbl>`) tables and groups wrapping lines into continuous paragraphs without incurring false-positive table detections on multi-line text or lists.
- **Decision:** Implement a deterministic spatial clustering and alignment pipeline directly on PDF.js text coordinates:
  1. Extract items with coordinates `(x, y, width, height, fontSize, fontName)`.
  2. Group items into visual lines within `|y1 - y2| <= 3.5pt`.
  3. Merge contiguous words separated by typical word spacing into discrete horizontal segments.
  4. Detect table blocks by analyzing contiguous runs of multi-segment lines, clustering X coordinates across candidate lines to establish column bands. Enforce strict conservative criteria ($C \ge 2$, $R \ge 3$ or $R \ge 2$ for $C \ge 3$, row spacing consistency, and rejection of bullet lists) before emitting native `docx` `Table` elements.
  5. For non-table lines, join consecutive lines with tight vertical spacing ($\le 1.6 \times \text{fontSize}$) into continuous paragraphs with preserved inline formatting (bold, italic, size), separating headings and paragraph breaks cleanly.
  6. Apply `pageBreakBefore` directly on the first element of subsequent source pages to avoid spacer paragraph artifacts.
- **Reason:** Operates 100% client-side without external dependencies, preserves user privacy, eliminates fragmented lines in Word documents, and faithfully converts tabular regions into editable Word tables while avoiding false positives.
- **Impact:** Vastly improves DOCX document editability, pagination, and fidelity for structured enterprise PDFs.

---

## Decision: Client-Side Background Removal Engine Selection (@imgly/background-removal)

- **Date:** 2026-09-20
- **Status:** Accepted
- **Context:** Implementing the Background Remover tool in Phase 2 required genuine foreground/background segmentation without paid cloud APIs, API keys, or uploading user images to remote servers. The engine needed to support people, pets, products, and everyday objects, run locally in standard modern browsers, produce genuine transparent PNGs with preserved original resolution, and avoid bloating initial page load times.
- **Decision:** Adopt `@imgly/background-removal` paired with `onnxruntime-web` for in-browser client-side image segmentation, loaded dynamically via code-splitting (`import()`) on demand.
- **Reason:** `@imgly/background-removal` runs 100% locally via WebAssembly and WebGPU (using quantized ISNet ONNX neural network models), requires zero API keys or backend servers, caches weights in the browser after initial download, and handles full-resolution mask extraction and alpha channel compositing into transparent PNGs. Lazy loading ensures zero impact on Phase 1 tools or initial page loads.
- **Impact:** Delivers instant, private, free, and genuine foreground segmentation entirely on the user's device.

---

## Decision: Official 55-Tool Master Roadmap through Phase 7

- **Date:** 2026-09-20
- **Status:** Accepted
- **Context:** FixMyFile successfully completed Phase 1 (6 PDF tools), Phase 2 (6 Image tools), and Phase 3 (7 Calculators & Generators), bringing the total active tools to 19. A definitive long-term roadmap was needed to establish the full platform lifecycle and tool inventory through Phase 7 without introducing premature implementation or route placeholders.
- **Decision:** Officially establish the **55-Tool Master Roadmap** spanning Phase 1 through Phase 7:
  1. FixMyFile roadmap is officially planned through Phase 7 with a master target of **55 tools**.
  2. Phases 1–3 remain completed historical milestones (19 active tools).
  3. Phases 4–7 represent 36 future planned tools and are strictly marked **PLANNED / NOT STARTED**.
  4. `tool-build-strategy.md` remains the authoritative source of truth for implementation order and sequencing across all 55 tools.
  5. New tools must be implemented strictly phase-by-phase and tool-by-tool rather than randomly.
  6. Existing client-first, local-in-browser processing philosophy remains preferred wherever technically practical.
  7. Future server-side processing should only be introduced when a tool genuinely requires capabilities beyond the browser sandbox.
- **Reason:** Provides transparent architectural clarity, aligns documentation across the entire project, prevents scope creep or unapproved tools, and guarantees rigorous verification standards as the platform expands.
- **Impact:** All documentation (`tool-build-strategy.md`, `ROADMAP.md`, `TOOL_STATUS.md`, `README.md`, `PRD.md`, `BRAIN.md`, `ARCHITECTURE.md`, `CHANGELOG.md`) is synchronized to the 55-tool master roadmap. No placeholder routes or mock components are created for future phases.

