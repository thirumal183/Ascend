# ASCEND — Phase 6.5.2 Vercel Same-Origin Proxy Report

**Date:** 2026-11-25  
**Hosting Architecture:** Vercel (Frontend + Same-Origin API Proxy) + Render (FastAPI Backend) + Neon (PostgreSQL)  
**Final Verdict:** **READY WITH CONDITIONS** *(see Section 6 for Vercel Hobby non-commercial restriction and Phase 8 browser verification)*

---

## 1. Architecture & Why a Vercel Function Proxy Was Chosen Over Static Rewrites

### Evaluation of Static `vercel.json` External Rewrites
- `vercel.json` `rewrites` require a static hardcoded destination URL and do **not** support runtime `process.env.RENDER_BACKEND_URL` interpolation.
- Static external rewrites also cannot validate the upstream origin against open-proxy/SSRF inputs, strip unsafe internal parameters, or sanitize upstream network failures into structured JSON error envelopes.

### Implemented Solution: `vercel.json` + `api/proxy.ts`
- **Routing (`vercel.json`):**
  - Rewrites `/api/:path*` internally to `/api/proxy?__ascend_path=:path*` (preserving all original query parameters).
  - Rewrites non-`/api/` paths to `/index.html` for React SPA client-side routing.
  - Configures `"framework": "vite"`, `"buildCommand": "npm run build"`, and `"outputDirectory": "dist"`.
- **Serverless Proxy (`api/proxy.ts`):**
  - Reads `process.env.RENDER_BACKEND_URL` strictly on the server (never exposed to browser bundles or `VITE_*` variables).
  - Validates upstream origin via `resolveValidatedUpstreamOrigin` (HTTPS required in production; HTTP allowed only for `localhost` / `127.0.0.1`; rejects embedded credentials or arbitrary origins with HTTP `502 PROXY_CONFIG_ERROR`).
  - Constructs target URL via `buildTargetUrl`, stripping `__ascend_path`, preserving all other query parameters, and blocking `..`, encoded `%2e%2e`, `\\`, non-`/api/` paths, and protocol-relative `//` prefixes (`400 INVALID_PROXY_PATH`).
  - Forwards HTTP method, body (`Buffer`, `string`, parsed JSON object, or raw stream), and allowlisted headers (`authorization`, `content-type`, `accept`, `x-requested-with`, `cookie`, `user-agent`, `x-forwarded-for`).
  - Preserves multiple `Set-Cookie` headers as an array via `upstreamRes.headers.getSetCookie()` without collapsing, maintaining `HttpOnly`, `Secure`, `SameSite`, `Path`, `Max-Age`, and `Expires` attributes.
  - Returns sanitized JSON (`502 UPSTREAM_UNREACHABLE`) on network failures without logging cookies, authorization headers, or request bodies.

---

## 2. Files Changed & Added in Phase 6.5.2

| File | Role |
| --- | --- |
| `api/proxy.ts` | New Vercel Node.js Serverless Function same-origin API proxy |
| `vercel.json` | New Vercel Vite build + `/api/:path*` proxy rewrite + SPA fallback config |
| `src/services/api/client.ts` | Added `resolveApiBaseUrl()` defaulting to `/api/v1` in production browser builds and `http://localhost:8000/api/v1` in dev/CLI |
| `backend/app/api/v1/endpoints/auth.py` | Updated `_cookie_security_params()` to use `SameSite=Lax` + `Secure=True` + `HttpOnly=True` + `Path=/api/v1/auth` in production |
| `backend/tests/test_auth.py` | Added `test_production_same_origin_cookie_attributes` |
| `scripts/test_phase6_5_2_vercel_proxy.ts` | Added 13 unit & live-HTTP proxy/client/config tests |

---

## 3. Vercel Project & Environment Variable Configuration

### Vercel Dashboard Settings
- **Framework Preset:** Vite
- **Root Directory:** `.` (repository root)
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Required Environment Variables
- **Vercel (Server-side only — do NOT prefix with `VITE_`):**
  - `RENDER_BACKEND_URL` = `https://<your-render-service>.onrender.com`
- **Vercel (Frontend build):**
  - Do **not** set `VITE_API_BASE_URL` in production so `resolveApiBaseUrl()` automatically resolves to same-origin `/api/v1`.
- **Render (`render.yaml` / Dashboard):**
  - `ENVIRONMENT=production`
  - `DEBUG=False`
  - `BACKEND_CORS_ORIGINS=["https://<your-vercel-app>.vercel.app"]`
  - `DATABASE_URL`, `SECRET_KEY`, `GEMINI_API_KEY` (unchanged)

### Local Development vs. Production
- **Local Development:** `npm.cmd run dev` (`http://localhost:3000`) calls `http://localhost:8000/api/v1` directly with `SameSite=Lax; Secure=False` cookies.
- **Production (Vercel):** Browser calls `https://<vercel-origin>/api/v1/...` (same-origin); Vercel `api/proxy.ts` forwards server-to-server to `RENDER_BACKEND_URL`.

---

## 4. Troubleshooting Guide (`401`, `403`, `502`, Cookie Failures)

- **`502 PROXY_CONFIG_ERROR`:** `RENDER_BACKEND_URL` is missing, malformed, or not `https://` in Vercel Environment Variables.
- **`502 UPSTREAM_UNREACHABLE`:** Render service is sleeping (free-tier cold start ~30–50s) or down; verify Render `/api/v1/health`.
- **`403 FORBIDDEN` on `/api/v1/auth/refresh`:** Missing `X-Requested-With: XMLHttpRequest` header on cookie-authenticated refresh.
- **`401 UNAUTHORIZED` on page reload:** Verify `ENVIRONMENT=production` on Render (so `Secure=True` matches Vercel HTTPS) and confirm browser did not receive a stale `Domain` attribute.

---

## 5. Automated Verification Results

| Check | Exact Command | Result |
| --- | --- | --- |
| Vercel Proxy & Client Tests | `npx.cmd tsx scripts/test_phase6_5_2_vercel_proxy.ts` | **13/13 PASSED** |
| Backend Pytest Suite | `Set-Location backend; python -m pytest tests -v` | **57/57 PASSED** |
| Batch 7 Integration | `$env:VITE_API_BASE_URL = 'http://127.0.0.1:8001/api/v1'; npx.cmd tsx scripts/test_batch7_integration.ts` | **44/44 PASSED** |
| Batch 8 Security Audit | `npx.cmd tsx scripts/test_batch8_security_audit.ts` | **22/22 PASSED** |
| Batch 8 Multi-Pathway | `npx.cmd tsx scripts/test_batch8_pathways.ts` | **33/33 PASSED** |
| TypeScript Lint | `npm.cmd run lint` (`tsc --noEmit`) | **0 errors** |
| Production Build | `npm.cmd run build` (`vite build`) | **PASSED** (622ms) |
| Dependency Audit | `npm.cmd audit --audit-level=moderate` | **0 vulnerabilities** |
| Alembic Revision | `Set-Location backend; python -m alembic current; python -m alembic heads` | **`d4e5f6a7b8c9 (head)`** |

---

## 6. Hosting Limitations & Budget Assessment (₹0/month)

- **Vercel Hobby Plan (₹0/month):**
  - Strictly limited to **personal, non-commercial use** per Vercel's Terms of Service. Any monetized, business, or commercial deployment requires upgrading to **Vercel Pro (\$20/month)** (violating the ₹0/month budget if commercialized).
  - Serverless Functions under Fluid Compute support up to 300s duration on Hobby, subject to fair-use bandwidth and invocation quotas.
- **Render Free Plan:** Sleeps after 15 minutes of inactivity (~30–50s cold-start latency on first proxied API request).
- **Browser E2E:** Real-browser testing on the deployed Vercel + Render URLs remains deferred to Phase 8.
