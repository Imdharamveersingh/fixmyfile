# FixMyFile

FixMyFile is a fast, clean, path-based online utility tools platform designed to provide essential file and document utilities directly in the browser.

The platform is developed following a strict phase-by-phase approach, prioritizing high-demand document tools while preserving simple, responsive, client-first architecture.

---

## Current Status

- **Project Stage:** Foundation Complete · Documentation Initialized
- **Current Phase:** Phase 1 (Core PDF Utilities)
- **Tool Implementation Status:** In Progress (Tool functional logic is NOT started; all 6 Phase 1 routes are active with dedicated placeholder views).
- **GitHub Repository:** [https://github.com/imdharamveersingh/fixmyfile](https://github.com/imdharamveersingh/fixmyfile)
- **Branch:** `master`

---

## Tech Stack

- **Core Framework:** React 19 + Vite 8
- **Routing:** React Router v7 (`react-router-dom`)
- **Styling:** Vanilla CSS (custom design tokens, dark/light mode, zero external UI framework bloat)
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

## Route Structure

FixMyFile strictly employs clean, canonical path-based URLs for every tool to optimize usability, direct bookmarking, and SEO:

| Route | View / Tool | Status |
|---|---|---|
| `/` | Home / Tool Directory | Active Foundation |
| `/jpg-to-pdf` | JPG to PDF | Complete · Functional In-Browser Converter |
| `/pdf-to-word` | PDF to Word | Route Active · Implementation Coming Next |
| `/pdf-to-jpg` | PDF to JPG | Route Active · Implementation Coming Next |
| `/word-to-pdf` | Word to PDF | Route Active · Implementation Coming Next |
| `/merge-pdf` | Merge PDF | Route Active · Implementation Coming Next |
| `/compress-pdf` | Compress PDF | Route Active · Implementation Coming Next |

> **Note:** `/jpg-to-pdf` is fully functional with client-side processing. The other 5 Phase 1 tools are currently implemented as route-level placeholders with their conversion engines coming next.

---

## Folder Structure

```
tool-website/
├── public/                # Static public assets (icons, favicons)
├── src/
│   ├── assets/            # Static media and graphics
│   ├── components/        # Reusable application components
│   │   ├── Footer.jsx
│   │   ├── Header.jsx
│   │   ├── Layout.jsx
│   │   ├── ToolCard.jsx
│   │   └── ToolPlaceholder.jsx
│   ├── pages/             # Top-level page views
│   │   ├── HomePage.jsx
│   │   └── NotFoundPage.jsx
│   ├── tools/             # Isolated tool modules
│   │   ├── compress-pdf/
│   │   ├── jpg-to-pdf/
│   │   ├── merge-pdf/
│   │   ├── pdf-to-jpg/
│   │   ├── pdf-to-word/
│   │   ├── word-to-pdf/
│   │   └── toolsRegistry.js
│   ├── utils/             # Helper functions and utilities
│   │   └── helpers.js
│   ├── App.css            # Component & layout styles
│   ├── App.jsx            # Router and application root
│   ├── index.css          # Design system variables & resets
│   └── main.jsx           # Vite application entrypoint
├── index.html             # HTML entry point
├── package.json           # Dependencies and scripts
└── vite.config.js         # Vite configuration
```

---

## Project Documentation Guide

The project maintains comprehensive, dedicated documentation files:

- [`PRD.md`](./PRD.md) — Product Requirements Document (vision, scope, goals, non-goals).
- [`BRAIN.md`](./BRAIN.md) — Permanent engineering rules, conventions, and developer guidelines.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — Current technical design, folder structure, and tool integration guide.
- [`ROADMAP.md`](./ROADMAP.md) — Phase-by-phase implementation schedule and milestone tracker.
- [`TOOL_STATUS.md`](./TOOL_STATUS.md) — Detailed inventory and status tracking for all tools.
- [`CHANGELOG.md`](./CHANGELOG.md) — Chronological history of completed project milestones.
- [`DECISIONS.md`](./DECISIONS.md) — Architecture Decision Records (ADRs).
- `tool-build-strategy.md` — Authoritative source of truth for tool scope, demand tiers, and build priority.
