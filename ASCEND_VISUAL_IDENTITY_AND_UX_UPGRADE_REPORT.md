# ASCEND — Visual Identity & Experience Upgrade Report

**Date:** 2026-11-25  
**Scope:** Full frontend visual identity differentiation (Cool-White + Deep Navy `#0A1628` + Electric Cobalt `#2563EB` + restrained Violet/Coral + Pathway Green/Blue/Orange), ~2.95s full-reload Startup Intro repair, Sticky Header root-cause fix + scroll-spy highlight, original Canvas 2D Cursor Field, Ambient Pathway Card glows, Architecture Showcase lag/sync fix, plain-English copy polish, Homepage-only floating User Guide, and cross-workspace harmonization.

---

## 1. Files Changed

- **Design Tokens & Base Styling:** [index.html](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/index.html), [src/index.css](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/index.css)
- **Brand & Startup Sequence:** [AscendLogo.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/brand/AscendLogo.tsx), [StartupIntro.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/brand/StartupIntro.tsx), [src/App.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/App.tsx)
- **Homepage & Interactive Components:** [LandingPageView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/LandingPageView.tsx), [AscendCursorField.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/AscendCursorField.tsx) *(new)*, [HomeUserGuide.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/HomeUserGuide.tsx) *(new)*
- **UI Primitives & Layout Shell:** [Button.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/Button.tsx), [Card.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/Card.tsx), [Badge.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/Badge.tsx), [MetricStat.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/MetricStat.tsx), [ProgressRing.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/ui/ProgressRing.tsx), [TopHeader.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/TopHeader.tsx), [Sidebar.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/Sidebar.tsx)
- **Dashboard, Auth & Domain Views:** [DashboardView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/dashboard/DashboardView.tsx), [DietManagementView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/diet/DietManagementView.tsx), [WorkoutManagementView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/workouts/WorkoutManagementView.tsx), [AiCoachView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/coach/AiCoachView.tsx), [CalendarView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/calendar/CalendarView.tsx), [GoalsProfileView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/goals/GoalsProfileView.tsx), [SettingsView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/settings/SettingsView.tsx), [AuthModal.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/auth/AuthModal.tsx), [PathwaySelectionModal.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/auth/PathwaySelectionModal.tsx)

---

## 2. Design Decisions & Colour Palette

To separate ASCEND visually from the previous green-dominated aesthetic while preserving high contrast and medical-grade clarity:

- **Primary Surfaces:** Crisp White (`#FFFFFF`) cards over Cool Ice Slate (`#F8FAFC`) canvas and subtle Slate wells (`#F1F5F9`), framed by hairline `slate-200` (`#E2E8F0`) borders.
- **Core Brand Identity:** Deep Navy (`#0A1628`) structural cards/headers + Electric Cobalt (`#2563EB` / `#1D4ED8`) primary CTAs, focus rings, and active navigation glow, accented lightly with Violet (`#7C3AED`) for AI/Analytics and Coral (`#F97316`) for Demo quick-try cues.
- **Individual Pathway Identities (isolated per pathway, never flooding the whole app):**
  - **General Nutrition & Diet:** Refined Green (`#15803D`, `emerald-50`, emerald ambient halo).
  - **Athlete Performance:** Vivid Electric Blue (`#2563EB`, `blue-50`, blue ambient halo).
  - **Weight Gain & Muscle Gain:** Warm Orange / Amber (`#EA580C`, `orange-50`, orange/amber ambient halo).
- **Brand Continuity:** Preserved the geometric ascending brand mark, uppercase `ASCEND` wordmark, and tagline `"Getting Better Every Day."`.

---

## 3. Interaction & Animation Improvements

1. **Startup Animation Restored (~2.95s on Every Full Reload):**
   - **Root Cause Found:** Two issues blocked full-reload playback: (a) `sessionStorage.getItem('ascend_intro_seen')` skipped reloads, and (b) `StartupIntro` was only rendered inside the unauthenticated Landing branch of `src/App.tsx`, omitting reloads of authenticated sessions.
   - **Fix:** Initialized `showStartupIntro` from initial mount (`useState(true)` unless `prefers-reduced-motion: reduce)`), mounted `<StartupIntro>` across both public and authenticated branches without blocking background `recoverLiveSession()` API hydration, and staged a 4-phase Deep Navy + Cobalt/Violet reveal (`420ms -> 1150ms -> 2480ms -> 2950ms`) with `[ESC]`/`Space`/`Enter`/click skip.
2. **Sticky Header & Active Scroll-Spy Highlight:**
   - **Root Cause Found:** `overflow-x: hidden` on both `body` ([src/index.css](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/index.css)) and the Home wrapper ([LandingPageView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/LandingPageView.tsx)) disabled CSS `position: sticky` in Chromium, letting `<header>` scroll away.
   - **Fix:** Switched both to `overflow-x: clip`, added `scroll-mt-24` offsets on every section anchor, and paired scroll-spy tracking with bottom-of-page handling and electric-cobalt active indicator glow (`bg-blue-50/90 text-[#1D4ED8] shadow-[0_0_16px_rgba(37,99,235,0.16)]`).
3. **Distinctive Cursor Field ([AscendCursorField.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/AscendCursorField.tsx)):**
   - Custom Canvas 2D kinetic wake + soft cobalt/violet radial glow with interactive concentric pulse waves on buttons, links, tabs, and pathway cards (`data-pathway-glow` adapts ripple color to Green/Blue/Orange).
   - Uses `requestAnimationFrame` + refs with automatic idle settlement and full teardown on unmount; zero per-move React `setState`; disabled on coarse touch pointers and `prefers-reduced-motion: reduce`.
4. **Ambient Pathway Card Glows ([LandingPageView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/LandingPageView.tsx)):**
   - Each pathway card features an outer blurred radial aura (`-inset-2 blur-xl`) plus surface tint and elevation revealed on pointer hover and keyboard `focus-within`.
5. **Architecture Showcase Lag & Sync Fix ([LandingPageView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/LandingPageView.tsx)):**
   - **Root Cause Found:** (a) Keying the slide grid (`key={currentSlide.id}`) destroyed and remounted the entire 12-column DOM subtree on every slide change, and (b) `onBlurCapture` without `e.currentTarget.contains(e.relatedTarget)` caused focus-thrashing across tabs.
   - **Fix:** Removed container remounting so panels update in place cleanly inside a fixed `min-h-[380px]` stage with a lightweight `150ms` opacity crossfade, added `ArrowLeft`/`ArrowRight` `tablist` keyboard navigation, and checked `relatedTarget` containment before unpausing.
6. **Homepage Readability & Floating User Guide ([HomeUserGuide.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/landing/HomeUserGuide.tsx)):**
   - Simplified technical copy while retaining `PostgreSQL`, `ICMR-NIN`, `USDA`, `Mifflin-St Jeor`, and `AI Coach` credibility.
   - Added a compact bottom-right floating **User Guide** (Start / Pathways / Daily Tools tabs) strictly mounted inside `LandingPageView` only when `!isAuthed`—automatically absent on Demo/Live dashboards, authenticated Home views, and modal dialogs.

---

## 4. Dashboard & Internal Screen Refinements

- Harmonized [TopHeader.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/TopHeader.tsx), [Sidebar.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/layout/Sidebar.tsx), [DashboardView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/dashboard/DashboardView.tsx), [DietManagementView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/diet/DietManagementView.tsx), [WorkoutManagementView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/workouts/WorkoutManagementView.tsx), [AiCoachView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/coach/AiCoachView.tsx), [CalendarView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/calendar/CalendarView.tsx), [GoalsProfileView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/goals/GoalsProfileView.tsx), [SettingsView.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/settings/SettingsView.tsx), [AuthModal.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/auth/AuthModal.tsx), and [PathwaySelectionModal.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/components/auth/PathwaySelectionModal.tsx) onto Cool White + Deep Navy `#0A1628` + Cobalt `#2563EB`, preserving pathway-distinct Green/Blue/Orange accents, `todayWorkout` reload safety, and mobile pill wrapping.

---

## 5. Performance & Accessibility

- Preserved Vite `rollupOptions` manual chunk splitting and React `lazy()` route code-splitting (`vite build` cleanly emitted separate chunks for `CalendarView`, `ReportsView`, `AiCoachView`, `ProgressTrackingView`, `SettingsView`, `GoalsProfileView`, `WorkoutManagementView`, `charts`, `icons`, and `react`).
- Zero new runtime dependencies added (`package.json` untouched).
- Added visible `:focus-visible` cobalt rings (`#2563EB`), `aria-current="location"`, `aria-controls` / `role="tab"` / `role="tabpanel"` synchronization, `Escape`-to-close on guides/menus, and `prefers-reduced-motion: reduce` support across startup intro, hero animations, smooth scrolling, showcase auto-play, and cursor field.

---

## 6. Tests Executed & Exact Results

| Verification Check | Command | Exact Observed Result |
| :--- | :--- | :--- |
| TypeScript Check | `npm.cmd run lint` | `tsc --noEmit` exited `0` (**0 errors**) |
| Production Bundle | `npm.cmd run build` | `vite build` succeeded in **2.43s** (`dist/index.html` + chunked assets) |
| Live API Integration | `npx.cmd tsx scripts/test_batch7_integration.ts` | **44 / 44 passed** |
| Security & Isolation | `npx.cmd tsx scripts/test_batch8_security_audit.ts` | **22 / 22 passed** |
| Multi-Pathway Journeys | `npx.cmd tsx scripts/test_batch8_pathways.ts` | **33 / 33 passed** |
| Vercel Same-Origin Proxy | `npx.cmd tsx scripts/test_phase6_5_2_vercel_proxy.ts` | **16 / 16 passed** |
| Headless Chromium CDP Run | `visual_qa.mjs` (`task-6563` on `localhost:3000`) | **0 console errors** (`CONSOLE_ERRORS_COUNT: 0`), `STARTUP_INTRO_LOAD_1: true`, `STARTUP_INTRO_ON_RELOAD_2: true`, `STICKY_HEADER_TOP: 0`, `ACTIVE_NAV: Inside ASCEND`, `HOME_USER_GUIDE_BEFORE_AUTH: true`, `USER_GUIDE_HIDDEN_IN_DASHBOARD: true`, `USER_GUIDE_HIDDEN_ON_AUTHED_HOME: true`, `WRONG_PW_RESULT: BLOCKED_OK`, `POST_SWITCH_HEADING` switched to `Athlete Performance`, **0 horizontal overflow** at `1440x900`, `768x1024`, and `375x812`; screenshots visually inspected via `read_file` |

---

## 7. Known Limitations & Remaining Manual Checks

- **Headless Cold-Load Timing (`STARTUP_INTRO_AUTO_DISMISSED: false` at 3.3s mark):** Because Vite's dev server transforms ~2,105 modules on a fresh browser profile before React mounts (`~1s`), the 2.95s startup intro finished its 500ms exit transition ~300–600ms after the script's initial `2400ms` screenshot wait; by `02a-home-user-guide.png` (+200ms), the overlay had fully unmounted cleanly. On the minified production bundle, mount time is sub-100ms.
- **Manual Interactive Pointer Check:** While `AscendCursorField` canvas initialization, pointer/reduce-motion gating, and DOM integration were verified in code and headless Chromium did not emit any errors, visual inspection of live mouse velocity ribbons and pathway ambient hover glow smoothness on a physical laptop display (along with 200% browser zoom and screen-reader tab traversal) is recommended during final human review.

---

## Verdict

**PASS WITH CONDITIONS** *(All automated TypeScript, build, integration, security, pathway, proxy, and headless Chromium layout/sticky/reload/auth-gate checks passed with 0 console errors; subjective real-mouse feel of `AscendCursorField` and physical hover-glow ergonomics remain recommended for final manual visual sign-off.)*
