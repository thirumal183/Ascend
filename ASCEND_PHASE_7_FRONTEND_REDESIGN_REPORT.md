# ASCEND — Phase 7 Frontend Redesign Report

**Date:** 2026-11-25  
**Scope:** Aesthetic unification, brand/copy refinement, Home experience, startup reveal, navigation & profile access, Demo vs. Authenticated pathway governance, and live empty/reload resilience.

---

## 1. Visual Design System & Brand Identity

- **Unified Botanical-Athletic Palette ([src/index.css](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/index.css), [index.html](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/index.html)):**
  - Deep Botanical Forest primary surface: `#0B2219` (`--ascend-forest`)
  - Sea-Glass Teal primary accent: `#0F766E` (`--ascend-seaglass`)
  - Mineral Off-White canvas: `#F6F8F5` (`--ascend-mineral-bg`)
  - Sage tinted surface well: `#EDF2EC` (`--ascend-sage-well`)
  - Botanical border hairlines & primary ink: `#D9E4DC` (`--ascend-border`) / `#0F1F18` (`--ascend-ink`)
- **UI Primitive Alignment:**
  - Updated [Button.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/Button.tsx), [Card.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/Card.tsx), [ProgressRing.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/ProgressRing.tsx), and [AscendLogo.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/brand/AscendLogo.tsx) (`dark` `#0B2219`/`#0F766E` and `light` `#FFFFFF`/`#34D399` schemes).
- **Copy & Brand Discipline:**
  - Removed the internal tagline `"ASCEND 2.2 · Scandinavian Health-Tech & Kinetic Vitality"` and retained `"Getting Better Every Day."`.
  - Replaced outdated `"Client-Side Prototype Security"` copy in [AuthModal.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/auth/AuthModal.tsx) with accurate Argon2id password hashing, memory-only access tokens, and rotating `HttpOnly` cookie session details.

---

## 2. Startup Reveal & Navigation Experience

- **Deterministic Unauthenticated Startup Reveal ([StartupIntro.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/brand/StartupIntro.tsx), [src/App.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/App.tsx)):**
  - Redesigned on the `#0B2219` botanical forest backdrop with `[ESC]` and click-to-skip controls plus strict `prefers-reduced-motion` support.
  - Gated by `sessionStorage.getItem('ascend_intro_seen') !== '1'` and `!savedSession?.account?.isAuthenticated && !hasLiveSessionHint()`, preventing startup overlays from blocking returning authenticated users or replaying on view transitions.
- **Home Renaming & Top-Header Profile Menu ([TopHeader.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/TopHeader.tsx), [Sidebar.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/Sidebar.tsx), [PathwaySelectionModal.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/auth/PathwaySelectionModal.tsx)):**
  - Renamed every user-facing `"Landing"` label to `"Home"` / `"Back to Home"`.
  - Added an accessible top-right **Account & Settings** profile menu in [TopHeader.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/TopHeader.tsx) providing 1-click access to Account & Settings, Goals & Profile, Home Overview, and Sign Out.

---

## 3. Home Experience & Interactive Product Showcase

- **Redesigned Home ([LandingPageView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/LandingPageView.tsx)):**
  - Sticky frosted header with scroll-spy active section tracking across `Home`, `Three Pathways`, `Live Architecture`, `Core Capabilities`, and `Evidence-Based`.
  - Auth-aware Home header and hero CTAs replacing `Sign In` / `Get Started` with `Open Dashboard` (`Continue to Dashboard`) and the authenticated Profile Menu when signed in.
  - Interactive 5-slide auto-rotating **Product Showcase** pausing on pointer hover or keyboard focus and respecting `prefers-reduced-motion`.
  - Tightened hero reveal keyframes (`.animate-hero-1`..`4` in [src/index.css](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/index.css)) so primary hero CTA buttons reach full contrast rapidly (`<= 440ms`) without appearing translucent on first paint.

---

## 4. Demo vs. Authenticated Pathway Governance & Workspace Resilience

- **Strict Pathway Isolation ([SettingsView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/settings/SettingsView.tsx), [GoalsProfileView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/goals/GoalsProfileView.tsx), [Sidebar.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/Sidebar.tsx), [TopHeader.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/TopHeader.tsx), [src/App.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/App.tsx)):**
  - **Demo Mode (`isDemoMode`):** Immediate interactive pathway switching across TopHeader, Sidebar, Goals, and Settings.
  - **Authenticated Live Accounts:** Pathway selection in Goals/Sidebar/TopHeader is locked; pathway changes are restricted exclusively to [SettingsView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/settings/SettingsView.tsx) via a **3-step Password-Confirmed Dialog** (`Verify Identity` -> `Choose New Pathway` -> `Confirm Pathway Change`) preserving meals, hydration, workouts, biometric checkpoints, and AI coaching history.
- **Dashboard & Domain View Polish ([DashboardView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/dashboard/DashboardView.tsx), [AiCoachView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/coach/AiCoachView.tsx), [CalendarView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/calendar/CalendarView.tsx), [DietManagementView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/diet/DietManagementView.tsx), [WorkoutManagementView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/workouts/WorkoutManagementView.tsx)):**
  - Made `todayWorkout` optional (`todayWorkout?: WorkoutPlan`) with safe fallbacks across all General Nutrition, Athlete Performance, and Muscle Gain branches in [DashboardView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/dashboard/DashboardView.tsx) so live reload hydration never throws when `workoutPlans` starts empty.
  - Fixed `"Log Fueling"` outline-over-dark contrast on the Athlete hero card (`variant="ghost"` with `bg-white/10 border-white/25 text-white`) and fixed mobile pill wrapping on calorie budget chips.
  - Added a grounded botanical empty-state prompt card in [AiCoachView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/coach/AiCoachView.tsx) for newly registered accounts with zero messages.
  - Added optional `VITE_DEV_PROXY_TARGET` same-origin `/api` proxy support in [vite.config.ts](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/vite.config.ts) (`proxy` runs strictly in Vite dev mode and does not alter `vite build` output).

---

**Phase 7 Frontend Verdict:** **READY FOR FINAL REVIEW**
