# Technical Debt Register & Script Inventory

Last Updated: October 10, 2026
Status: Maintained

---

## 1. Root `.mjs` Scripts Inventory & Migration Roadmap

The repository currently maintains 139 standalone `.mjs` scripts in the root directory. To preserve backward compatibility with existing documentation (`CHANGELOG.md`, `MASTER_AUDIT_REPORT.md`), relative paths, and developer workflows, these scripts remain in place while being systematically cataloged below for a phased directory migration.

### Target Directory Structure
```text
fixmyfile/
├── tests/
│   ├── unit/            # Fast pure logic / DOM assertions
│   ├── integration/     # Pipeline and multi-component tests
│   ├── architecture/    # Tool registry, routes, and SEO guardrails
│   └── browser/         # Puppeteer / CDP and manual browser verification
├── scripts/             # Production build scripts and dev generators
└── test-fixtures/       # Consolidated sample assets
```

### Script Classification Summary (139 Files)

| Category | Count | Description | Proposed Target Path |
| :--- | :--- | :--- | :--- |
| **Active Test Suite (`npm test`)** | 14 | Executed directly by `npm test` pipeline; tests UI, branding, navigation, and guardrails. | `tests/unit/` & `tests/architecture/` |
| **Difficult File Processing Tests** | 24 | Stress-testing tools with edge-case and malformed inputs (`test_difficult_*`). | `tests/integration/` |
| **Manual Browser Verification Scripts** | 41 | Interactive browser verification scripts (`test_manual_*`). | `tests/browser/manual/` |
| **Browser CDP Headless Tests** | 16 | Chrome DevTools Protocol automation scripts (`test_cdp_*`). | `tests/browser/cdp/` |
| **Tool-Specific Logic Tests** | 34 | Headless pipeline tests for specific tools (`test_pdf_to_word_pipeline`, etc.). | `tests/integration/` |
| **Automated Unit Tests (Stand-alone)** | 8 | Standalone unit tests (`test_accessibility_architecture`, `test_split_pdf`, etc.). | `tests/unit/` |
| **Browser Verification Utilities** | 2 | Visual verification runners (`manual_browser_test.mjs`, `verify_browser_test.mjs`). | `tests/browser/` |

---

## 2. Test Fixture Consolidation & Production Hygiene

- **Status:** **Resolved (October 10, 2026)**
- **Consolidation:** Three previously fragmented fixture directories (`fixtures/`, `test_fixtures/`, and `test-fixtures/`) were consolidated into the single canonical directory: `test-fixtures/`.
- **Public Directory Cleanup:** Test DOCX files (`fixmyfile-difficult-word-test.docx`, `test-simple-1page.docx`) and test PDF files were moved out of `public/` into `test-fixtures/`. As verified by Vite build output, `dist/` now ships zero test assets to production users.
- **Reference Resolution:** All 15 affected test runners were updated to resolve assets from `test-fixtures/`.

---

## 3. CSS Duplicate Selector Resolution

- **Status:** **Resolved (October 10, 2026)**
- **File:** `src/App.css`
- **Findings & Actions:**
  - **Legacy Footer Elimination:** Lines 1669–1812 contained an obsolete footer declaration completely overridden by the active 5-column footer at line 7105+. The duplicate block was cleanly removed. The nested mobile breakpoint `@media (max-width: 560px) { .tools-grid { grid-template-columns: 1fr; } }` was relocated directly under `.tools-grid` for clear encapsulation.
  - **Legacy Related Tools Elimination:** Lines 2254–2311 contained duplicate `.related-tools-grid` and `.related-tool-card` styles superseded by `BlogArticlePage` styles at line 9817+. This dead block was safely removed.
  - **Additive Selectors Retained:** `.category-anchor` is declared at lines 825 and 1221. This is deliberate additive styling (legacy jump positioning vs modern `scroll-margin-top`) and has been preserved.

---

## 4. Linter Optimization & Remaining Warnings Backlog

- **Status:** **Optimized (October 10, 2026)**
- **Vendor Code Exclusion:** Added `"ignorePatterns": ["public/vendor/**", "dist/**"]` to `.oxlintrc.json`.
- **Warning Reduction:** Warnings dropped from **3,980** to **42** (a 98.9% reduction) while linting runtime decreased from 12.8s to ~500ms.
- **Remaining 42 Warnings Backlog (First-Party & Tests):**
  - **Unused imports/variables in test scripts (28 warnings):** Unused identifiers in standalone test scripts (e.g. `formatBytes`, `calculateTextStats` in `test_png_to_text.mjs`). Safe to clean in subsequent test maintenance pass.
  - **React Fast Refresh exports (8 warnings):** Utilities co-exported with components (e.g. `getToolCategory` in `ToolCard.jsx`, `updateDocumentSEO` in `SEO.jsx`).
  - **React `setState` in `useEffect` (6 warnings):** Immediate input debounce resets on mount in `Header.jsx`, `qr-code-generator/index.jsx`, and `barcode-generator/index.jsx`.

---

## 5. Deferred Tool Candidates (Phase 6)

The canonical registry currently implements 49 active tools across 4 categories:
- **PDF Tools:** 18
- **Image Tools:** 20
- **Media Tools:** 4
- **Calculators & Generators:** 7

The following 6 tools remain documented as planned/deferred in `ARCHITECTURE.md` and are intentionally omitted from `ALL_TOOLS`:
1. `pdf-to-pdfa` (PDF/A Archival Converter)
2. `sign-pdf` (Digital & Visual PDF Signatures)
3. `flatten-pdf` (Form & Annotation Flattener)
4. `repair-pdf` (Corrupt PDF Repair)
5. `ocr-searchable-pdf` (Searchable OCR PDF Creator)
6. `compare-pdf` (Visual & Textual PDF Diff)
