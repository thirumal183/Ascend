---
name: ascend-product-design
description: Product design system and UI/UX architecture guidelines for ASCEND. Governs typography, color palettes, pathway themes, layout grids, elevation shadows, motion standards, and interaction feedback for nutrition and fitness workflows.
license: Proprietary
metadata:
  author: ASCEND Team
  version: "1.0.0"
---

# ASCEND Product Design Guidelines

This skill provides comprehensive product design, visual architecture, and UX standards for the ASCEND AI Nutrition & Fitness Platform (*"Getting Better Every Day"*).

## 1. Brand Essence & Visual Philosophy
- **Identity**: Clean, energetic, trustworthy, and evidence-based. Not a clinical medical tool, but an athletic, motivating companion built on real physiology and adherence.
- **Design Direction**: "Kinetic Vitality / Scandinavian Health-Tech". Deep obsidian dark mode foundations (`#070D18`, `#0B1221`) paired with clean daylight slate surfaces (`#F8FAFC`).
- **Antipatterns to Avoid**:
  - Overly generic AI SaaS designs with purple/pink neon gradient overlays.
  - Decorative icons that serve no navigational or semantic purpose.
  - Excessive nested glassmorphism that impedes data readability.
  - Guilt-inducing failure states (red penalty flashes for missed calorie targets).

## 2. Pathway-Specific Accent System
ASCEND personalizes styling across three core pathways:
1. **General Nutrition & Diet**:
   - Primary: Bio-Emerald (`#10B981`)
   - Accent: Sage Mint (`#34D399`)
   - Surface Tint: `bg-emerald-50/70 border-emerald-200/80`
   - Iconography: `Heart` / `Salad`
2. **Athlete Performance**:
   - Primary: Electric Cobalt (`#0284C7`)
   - Accent: High-Output Cyan (`#38BDF8`)
   - Surface Tint: `bg-sky-50/70 border-sky-200/80`
   - Iconography: `Flame` / `Zap`
3. **Weight Gain & Muscle Gain**:
   - Primary: Solar Amber (`#F59E0B`)
   - Accent: Hypertrophy Tangerine (`#FB923C`)
   - Surface Tint: `bg-amber-50/70 border-amber-200/80`
   - Iconography: `Dumbbell` / `TrendingUp`

## 3. Typography Standards
- **Display Headings (`font-display`)**: Plus Jakarta Sans (`500`, `700`, `800`) for headers, modal titles, and hero statements.
- **Body & Controls (`font-sans`)**: DM Sans (`400`, `500`, `600`) for legible paragraph copy, button labels, and nutrition descriptions.
- **Numeric & Metric Readouts (`font-mono`)**: JetBrains Mono (`400`, `500`, `700`) with `tabular-nums` (`font-variant-numeric: tabular-nums`) applied to eliminate layout shifts during live portion scaling.

## 4. Interaction & Motion Rules
- **Springs over Linear**: Use Framer Motion (`motion/react`) with damped spring physics (`stiffness: 300, damping: 25`) for dropdowns, drawers, and modal sheets.
- **Adherence Safety**:
  - Destructive actions (removing meals, clearing records) require confirmation or a 6-second undo toast window.
  - Portion scaling recalculates instantly with live preview before committing to the food ledger.
- **Accessibility (`prefers-reduced-motion`)**: Respect user operating system preferences; disable spatial transforms and spring animations when active.
