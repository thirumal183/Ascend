---
name: ascend-frontend-quality
description: Frontend engineering standards, React 19 / TypeScript 5 guidelines, component composition, performance optimization, and accessibility verification for the ASCEND platform.
license: Proprietary
metadata:
  author: ASCEND Frontend Team
  version: "1.0.0"
---

# ASCEND Frontend Quality & Engineering Standards

This skill guides the implementation, code review, component decomposition, and automated quality checks for the ASCEND frontend application.

## 1. Technology Stack Foundations
- **React**: 19.x with functional components and pure hooks.
- **TypeScript**: Strict type definitions under `src/types/ascend.ts`. No `any` types for nutrition calculations or user accounts.
- **Styling**: Tailwind CSS 4 with `@tailwindcss/vite`.
- **Motion**: `motion/react` with spring damping and `prefers-reduced-motion` compliance.
- **Visuals**: Lucide React icons, Recharts for responsive SVG data visualizations.

## 2. Component Composition & State Architecture
- **Single Source of Truth**: User profile, goals, intake ledger, workouts, and biometrics managed in `src/App.tsx` and persisted via `prototypeSessionStorage` in `src/services/ascendApiService.ts`.
- **Sub-Component Decomposition**: Decompose views larger than 400 lines into focused modular sub-components (e.g., modals, comparison drawers, chart cards).
- **Graceful Fallbacks & Empty States**:
  - Empty search results must offer a clear CTA to clear filters or search aliases.
  - Zero-state meal cards must show quick-add buttons.
  - Simulated network failure states must provide a 1-click retry button.

## 3. Accessibility & Keyboard Navigation
- Interactive controls must have explicit `aria-label` attributes where icon-only buttons are used.
- Form controls must have associated `<label htmlFor="...">` bindings.
- Tab navigation order must follow visual reading hierarchy.
- Focus rings must be visible (`focus:ring-2 focus:ring-sky-500`).

## 4. Automated Verification Standards
Before committing any changes:
1. `npm.cmd run lint` (`tsc --noEmit`) must exit with code `0`.
2. `npm.cmd run build` (`vite build`) must generate bundle assets in `dist/` with exit code `0`.
3. Ensure no local secrets or actual `.env` files are tracked.
