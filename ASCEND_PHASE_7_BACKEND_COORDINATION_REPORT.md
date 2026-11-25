# ASCEND — Phase 7 Backend Coordination & Security Enforcement Report

**Date:** 2026-11-25  
**Scope:** Server-side password verification and pathway switch enforcement ensuring authenticated users cannot bypass the Settings password-confirmation workflow, while preserving user history.

---

## 1. Motivation & Threat Model

During Phase 7 UI separation, authenticated live accounts were restricted from casually switching pathways via quick toggles, limiting pathway changes to a password-confirmed flow in `SettingsView`. Relying solely on frontend locks would allow a direct API caller (`PUT /api/v1/users/me/profile` or unauthenticated-password `POST /api/v1/users/me/pathway`) to bypass identity verification. Server-side enforcement closes this gap.

---

## 2. Implemented Backend & Client API Changes

### A. Dedicated Password Verification Endpoint
- **Schemas ([backend/app/schemas/auth.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/schemas/auth.py)):** Added `VerifyPasswordRequest` and `VerifyPasswordResponse`.
- **Endpoint ([backend/app/api/v1/endpoints/auth.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/api/v1/endpoints/auth.py)):** Added `POST /api/v1/auth/verify-password`:
  - Requires valid Bearer JWT (`get_current_user`).
  - Rate-limited (10 requests / 60s window).
  - Verifies the submitted password against the user's Argon2id `hashed_password` via `asyncio.to_thread` without mutating tokens or issuing duplicate credentials.
  - Returns HTTP `401` on wrong password and `{ "verified": true }` on match.

### B. Profile Mutation Guard & Pathway Switch Enforcement
- **Profile Update Lock ([backend/app/api/v1/endpoints/users.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/api/v1/endpoints/users.py)):** `PUT /api/v1/users/me/profile` rejects `pathway` mutations with HTTP `403 FORBIDDEN` (`AccessForbiddenException`).
- **Password-Protected Pathway Switch ([backend/app/schemas/users.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/schemas/users.py), [backend/app/api/v1/endpoints/users.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/app/api/v1/endpoints/users.py)):**
  - `SwitchPathwayRequest` requires `currentPassword: str` (`min_length=1`, `max_length=128`).
  - `POST /api/v1/users/me/pathway` applies rate limiting and Argon2id password verification before recalculating pathway macro/water targets, returning HTTP `401` on invalid credentials and preserving all logged meals, water intake, workout sessions/sets, progress history, and AI conversations.

### C. Frontend API Coordination
- **Auth Client ([src/services/api/authApi.ts](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/services/api/authApi.ts)):** Added `authApi.verifyPassword(password)`.
- **Users Client ([src/services/api/usersApi.ts](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/services/api/usersApi.ts)):** Added `currentPassword` to `SwitchPathwayPayload`.
- **App State ([src/App.tsx](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/src/App.tsx)):** Omitted `pathway` from live `usersApi.updateProfile` payloads and separated Demo-mode `handleChangePathway` from `handleVerifyAccountPassword` + `handleAuthenticatedChangePathway`.

---

## 3. Verification Results

- **Pytest Backend Suite (`Set-Location backend; python -m pytest tests -v`):** **58 / 58 passed** (`10.51s`), including updated `test_users_profile_pathway_and_goals_endpoints` and new `test_pathway_change_password_verification_and_history_preservation` in [backend/tests/test_auth.py](file:///c:/Users/thiru/OneDrive/Desktop/Projects/Ascend%20Project/backend/tests/test_auth.py).
- **Alembic Schema Alignment:** `alembic current` == `d4e5f6a7b8c9 (head)` == `alembic heads` (no new schema migration required for Phase 7).
- **Live TypeScript Full-Stack Integration Suites (`VITE_API_BASE_URL=http://127.0.0.1:8002/api/v1`):**
  - `scripts/test_batch7_integration.ts`: **44 / 44 passed**
  - `scripts/test_batch8_security_audit.ts`: **22 / 22 passed**
  - `scripts/test_batch8_pathways.ts`: **33 / 33 passed**
- **Vercel Proxy & Routing Regression (`scripts/test_phase6_5_2_vercel_proxy.ts`):** **16 / 16 passed**.

---

**Phase 7 Backend Coordination Verdict:** **READY FOR FINAL REVIEW**
