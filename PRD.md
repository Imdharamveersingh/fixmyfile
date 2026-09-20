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
4. **Phase 4 — PDF Expansion:** 10 tools (Planned / Not Started)
5. **Phase 5 — Image Expansion:** 10 tools (Planned / Not Started)
6. **Phase 6 — Media Tools:** 10 tools (Planned / Not Started)
7. **Phase 7 — OCR / Text / Advanced File Tools:** 6 tools (Planned / Not Started)

**Master Counts:**
- **Currently Implemented & Active:** 19 tools (Phases 1–3)
- **Future Planned:** 36 tools (Phases 4–7)
- **Total Planned Roadmap:** 55 tools

> **Authoritative Scope Reference:** `tool-build-strategy.md` serves as the authoritative source of truth for the complete 55-tool list, phase assignments, and sequential build order. No tools outside this strategy may be invented or added.

---

## 4. Current vs. Planned vs. Future Scope

### Current Scope (19 Implemented & Active Tools)
- **Application Foundation:** Vite 8 + React 19 + React Router v7 application shell.
- **Design System:** Responsive Vanilla CSS design tokens with dark/light themes and fluid typography.
- **Platform Shell:** Persistent `Header`, `Footer`, and container `Layout`.
- **Home Directory:** Landing view (`/`) displaying active tools and phase directory with responsive grids.
- **Phase 1 (PDF Foundation — 6/6 Complete):**
  - `/jpg-to-pdf`: JPG to PDF Converter
  - `/pdf-to-word`: PDF to Word Converter
  - `/pdf-to-jpg`: PDF to JPG Converter
  - `/word-to-pdf`: Word to PDF Converter
  - `/merge-pdf`: Lossless PDF Merger
  - `/compress-pdf`: Lossless PDF Compressor
- **Phase 2 (Image Foundation — 6/6 Complete):**
  - `/remove-background`: AI Background Remover
  - `/compress-image`: Client-Side Image Compressor
  - `/resize-image`: Image Resizer
  - `/convert-image`: Multi-Format Image Converter
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
- **Quality Gates:** 0 lint errors (`oxlint`), clean production build (`npm run build`).

### Future Planned Scope (36 Tools Across Phases 4–7)
All future tools are documented in `tool-build-strategy.md` and are **PLANNED / NOT STARTED**. No routes or placeholder pages are prematurely invented:
- **Phase 4 — PDF Expansion (10 tools):** Split PDF, PDF to Excel, PDF to PowerPoint, Rotate PDF, Protect PDF, Unlock PDF, PDF to Text, Extract PDF Pages, Delete PDF Pages, Reorder PDF Pages.
- **Phase 5 — Image Expansion (10 tools):** HEIC to JPG, WebP to JPG, JPG to WebP, WebP to PNG, Image Cropper, Image Rotate / Flip, Image Watermark, Image to PDF, Image Upscaler, Image to Base64.
- **Phase 6 — Media Tools (10 tools):** MP4 to MP3, Video Compressor, Video to GIF, GIF Maker, Audio Converter, M4A to MP3, WAV to MP3, MP3 Cutter, Video Trimmer, Video to MP4.
- **Phase 7 — OCR / Text / Advanced File Tools (6 tools):** Image to Text, PDF OCR, JPG to Text, PNG to Text, Screenshot to Text, Extract Text from PDF.

---

## 5. User Experience (UX) Goals

1. **Simplicity & Clarity:** Every tool must have a clear, distraction-free interface focused on its single primary action.
2. **Speed:** Instant page loads, minimal script bundles, and zero lag when switching tools.
3. **Transparency:** Never simulate or fake tool operations. If a tool is in development, clearly state its status. When functional, show genuine progress indicators and file metrics.
4. **Responsiveness:** Flawless layout and interaction across mobile, tablet, and desktop screens.

---

## 6. Functional Requirements (Platform Level)

- **FR-1 Path-Based URLs:** Each tool must reside on its own permanent, human-readable canonical path (e.g., `/jpg-to-pdf`). Deep-linking must render the tool immediately without redirect cascades.
- **FR-2 Reusable Layout:** All pages must render inside the global layout containing site navigation, brand identity, and contextual footer links.
- **FR-3 Modular Tool Encapsulation:** Each tool must be isolated in its own folder under `src/tools/<tool-id>/` to prevent cross-tool regression.
- **FR-4 Centralized Registry:** Tool metadata (name, path, category, description, status, phase) must be managed centrally in `src/tools/toolsRegistry.js`.
- **FR-5 Honest Status Handling:** Until a tool's functional engine is tested and complete, it must display the explicit placeholder component informing the user that implementation is coming next.

---

## 7. Non-Functional Requirements

- **NFR-1 Code Quality:** Zero linter warnings or errors (`oxlint`) across the repository.
- **NFR-2 Build Reliability:** Production bundles (`npm run build`) must build cleanly at all times.
- **NFR-3 Minimal Dependencies:** Rely on vanilla JavaScript, React, and targeted web APIs. No bloated third-party UI component libraries.
- **NFR-4 Performance:** Initial page load under 1.5s on standard connections; Lighthouse performance score target > 90.
- **NFR-5 Accessibility:** Semantic HTML5 landmarks, readable contrast ratios across themes, and keyboard navigation support.

---

## 8. Privacy & Client-First Processing Direction

- **Client-Side Preference:** Where practical and technologically feasible, file transformations should occur locally within the user's browser using modern Web APIs and WebAssembly.
- **Zero Data Retention:** User documents should not be stored, cached, or transmitted unless explicitly required by a future architectural tier.
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
- No custom domain configuration or production hosting infrastructure (postponed).
