# BRAIN.md — Permanent Engineering Rules & Principles

This document defines the permanent rules, engineering constraints, and operational guidelines for **FixMyFile**. Every AI assistant, developer, and contributor must strictly follow these rules.

---

## 1. Core Platform Principles

1. **Project Identity:** The project name is **FixMyFile**.
2. **Phase-by-Phase Development:** Tools are implemented sequentially, phase by phase. Never attempt multi-phase bulk development simultaneously.
3. **Authoritative Scope:** `tool-build-strategy.md` is the single source of truth for tool scope, demand levels, and build priority.
4. **Scope Boundary:** Only the 55 tools defined across Phases 1 through 7 in `tool-build-strategy.md` are in scope.
5. **No Invented Tools:** Never invent, propose, or add unapproved tools outside `tool-build-strategy.md`.
6. **One Tool at a Time:** Build, verify, and complete one tool entirely before moving to the next tool.
7. **Preserve Path-Based Architecture:** Every tool must retain its own clean, canonical route (e.g., `/jpg-to-pdf`). Never collapse tools into a single modal, multi-tab single page, or URL-less interface.
8. **Preserve Reusable Components:** Use existing application components (`Layout`, `Header`, `Footer`, `ToolCard`, `ToolPlaceholder`) rather than duplicating layout structures or boilerplate markup.
9. **Zero Dependency Bloat:** Avoid installing third-party libraries unless genuinely necessary. Never install heavy UI frameworks (e.g., Bootstrap, Material UI, Tailwind) when custom CSS tokens already serve the project.
10. **Client-First Processing:** Prefer local, in-browser file transformation (Canvas, WebAssembly, Web Workers) where technically feasible to maximize privacy, responsiveness, and cost efficiency.
11. **Never Fake Functionality:** Never implement fake progress bars, dummy success messages, or mock downloads. A tool must either perform genuine processing or display its honest placeholder state.
12. **Rigorous Verification:** Test every tool with real test files, edge cases, and client-side error handling before marking it complete.
13. **Quality Gates:** Always execute `npm run lint` and `npm run build` after meaningful code modifications. Zero warnings and zero errors are required.
14. **Git Checkpoints:** Keep Git commits focused, atomic, and synchronized with verified milestones. Maintain clean upstream tracking.
15. **Context Discipline:** Work strictly within the current repository files and prompt instructions. Never import assumptions or configurations from unrelated past projects.
16. **Postponed Areas:** Domain configuration, hosting setup, backend infrastructure, databases, user authentication, ads, analytics, and payment gateways are intentionally out of scope until explicitly prioritized.
17. **Tool Isolation:** When modifying or implementing a specific tool under `src/tools/<tool-id>/`, do not touch or destabilize unrelated tools.

---

## 2. Documentation Update Rules

Whenever a meaningful change occurs, update the relevant documentation files according to this matrix:

| Event | Files to Update | Action Required |
|---|---|---|
| **Tool Implementation** | `TOOL_STATUS.md`, `ROADMAP.md`, `CHANGELOG.md`, `README.md` | Change tool status from `NOT STARTED` to `IN PROGRESS` then `COMPLETE`; record milestone in changelog; update route status table in README. |
| **Architecture Change** | `ARCHITECTURE.md`, `CHANGELOG.md`, `DECISIONS.md` | Document updated component or directory hierarchy; record new architectural decision record (ADR). |
| **Product Requirement Change** | `PRD.md`, `CHANGELOG.md` | Update functional/non-functional requirements or scope definitions; record rationale in changelog. |
| **Phase Completion** | `ROADMAP.md`, `TOOL_STATUS.md`, `CHANGELOG.md`, `README.md` | Mark phase status as `COMPLETE`; advance active phase pointer; record comprehensive milestone entry. |
| **Important Technical Decision** | `DECISIONS.md`, `CHANGELOG.md` | Add standard ADR entry (Status, Context, Decision, Reason, Impact). |

---

## 3. Standard Verification Checklist

Before considering any task complete, verify:
- [ ] `npm run lint` passes with 0 errors and 0 warnings.
- [ ] `npm run build` succeeds cleanly.
- [ ] Local dev server (`http://localhost:5173/`) serves `/` and all tool paths with HTTP 200.
- [ ] Working tree status is inspected and only intended files are modified.
