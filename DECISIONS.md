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

