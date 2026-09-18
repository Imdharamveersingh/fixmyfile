# FixMyFile — Technical Architecture

This document describes the technical design, routing structure, component hierarchy, and integration patterns of **FixMyFile**.

---

## 1. Current Architecture

FixMyFile is built as a modular, client-rendered single-page application (SPA) using **React 19**, **Vite 8**, and **React Router v7**.

### Core Principles
- **Canonical Path-Based Routing:** Every tool operates on a dedicated URL path (e.g., `/jpg-to-pdf`), ensuring clean browser history, bookmarking, and search engine discoverability.
- **Tool Isolation:** Each tool lives in its own directory under `src/tools/<tool-id>/`. Tools do not import or depend on one another.
- **Shared Layout Shell:** A single `Layout` component wraps all routed views, providing a persistent `Header` and `Footer` while mounting page content inside `<Outlet />`.
- **Centralized Registry:** Tool metadata (name, path, category, description, phase, status) is declared once in `src/tools/toolsRegistry.js` and imported by navigation, cards, and tool views.

---

## 2. Directory Hierarchy

```
src/
├── assets/                  # Logos, icons, and static images
├── components/              # Shared, reusable UI components
│   ├── Header.jsx           # Global sticky header with logo and navigation
│   ├── Footer.jsx           # Multi-column global footer with quick tool links
│   ├── Layout.jsx           # Top-level shell rendering Header + Outlet + Footer
│   ├── ToolCard.jsx         # Card component used in tool listing grids
│   └── ToolPlaceholder.jsx  # Reusable status view for tools pending implementation
├── pages/                   # Top-level views
│   ├── HomePage.jsx         # Directory view listing active tools & phase stats
│   └── NotFoundPage.jsx     # 404 fallback page for unmatched URLs
├── tools/                   # Tool modules (one subfolder per tool)
│   ├── compress-pdf/        # Compress PDF tool entrypoint
│   ├── jpg-to-pdf/          # JPG to PDF tool entrypoint
│   ├── merge-pdf/           # Merge PDF tool entrypoint
│   ├── pdf-to-jpg/          # PDF to JPG tool entrypoint
│   ├── pdf-to-word/         # PDF to Word tool entrypoint
│   ├── word-to-pdf/         # Word to PDF tool entrypoint
│   └── toolsRegistry.js     # Single source of truth for tool metadata
├── utils/                   # Shared utility helpers
│   └── helpers.js           # String formatters and general helper functions
├── App.css                  # Component, layout, and tool view styling
├── App.jsx                  # React Router configuration (<Routes>, <Route>)
├── index.css                # CSS variables, typography, and base CSS reset
└── main.jsx                 # Application DOM mount
```

---

## 3. Layout & Routing Architecture

Routing is configured in [`src/App.jsx`](file:///d:/tool-website/src/App.jsx) via `BrowserRouter`:

```jsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Layout />}>
      <Route index element={<HomePage />} />
      <Route path="jpg-to-pdf" element={<JpgToPdfTool />} />
      <Route path="pdf-to-word" element={<PdfToWordTool />} />
      <Route path="pdf-to-jpg" element={<PdfToJpgTool />} />
      <Route path="word-to-pdf" element={<WordToPdfTool />} />
      <Route path="merge-pdf" element={<MergePdfTool />} />
      <Route path="compress-pdf" element={<CompressPdfTool />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
</BrowserRouter>
```

### Active Phase 1 Routes
1. `/` — Home directory and tool grid.
2. `/jpg-to-pdf` — JPG to PDF tool placeholder.
3. `/pdf-to-word` — PDF to Word tool placeholder.
4. `/pdf-to-jpg` — PDF to JPG tool placeholder.
5. `/word-to-pdf` — Word to PDF tool placeholder.
6. `/merge-pdf` — Merge PDF tool placeholder.
7. `/compress-pdf` — Compress PDF tool placeholder.

---

## 4. Reusable Component Approach

- **`Layout`**: Houses the global application structure. Prevents page re-renders of header and footer when navigating between routes.
- **`ToolPlaceholder`**: Renders standard breadcrumbs, tool titles, category badges, route information, and an honest "Tool implementation coming next" panel without simulated operations.
- **`ToolCard`**: Standardized presentation card used on the homepage with hover elevation, category tagging, and path pills.

---

## 5. Adding a New Tool (Standard Workflow)

To add a new tool cleanly without disrupting existing code:

1. **Register Metadata:**
   Add the tool configuration to `PHASE_X_TOOLS` in `src/tools/toolsRegistry.js`:
   ```javascript
   {
     id: 'example-tool',
     name: 'Example Tool',
     path: '/example-tool',
     category: 'Category Name',
     description: 'Short user-facing description.',
     status: 'Implementation Coming Next',
     phase: 'Phase X'
   }
   ```
2. **Create Tool Module:**
   Create a new directory: `src/tools/example-tool/index.jsx`.
   Initially render `ToolPlaceholder` with its registered metadata:
   ```jsx
   import React from 'react';
   import ToolPlaceholder from '../../components/ToolPlaceholder';
   import { getToolById } from '../toolsRegistry';

   export default function ExampleTool() {
     const tool = getToolById('example-tool');
     return <ToolPlaceholder tool={tool} />;
   }
   ```
3. **Add Route:**
   Import the component in `src/App.jsx` and add `<Route path="example-tool" element={<ExampleTool />} />`.
4. **Update Navigation & Footer:**
   Add link references in `src/components/Header.jsx` and `src/components/Footer.jsx` if appropriate for its category.
5. **Implement Logic (When Scheduled):**
   Replace the placeholder inside `src/tools/example-tool/` with the functional processing interface once its phase begins.

---

## 6. Future Architecture (Planned & Postponed)

> **Current State:** There is **NO** backend server, database, API service, or authentication layer. Everything is purely client-side static rendering.

- **Client-Side Processing Engines:** Future phases will introduce specialized, lightweight WebAssembly or Canvas-based processing libraries encapsulated strictly within the relevant tool directory.
- **Web Workers:** CPU-intensive file processing (e.g., PDF compression or image rasterization) will be delegated to background Web Workers to maintain 60 FPS UI responsiveness.
- **Backend / Cloud Services:** Currently out of scope. If heavy operations require server-assisted processing in future phases, they will be introduced behind modular adapter interfaces.
