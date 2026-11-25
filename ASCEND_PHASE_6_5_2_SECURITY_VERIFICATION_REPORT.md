# ASCEND — Phase 6.5.2 Security Verification Report

**Date:** 2026-11-25  
**Scope:** Same-Origin Cookie Hardening, Proxy SSRF/Open-Proxy Controls, CSRF Protection, and Token Storage  
**Final Verdict:** **READY WITH CONDITIONS**

---

## 1. Cookie Security Design (Same-Origin Production)

With all browser API traffic routed through Vercel's same-origin proxy (`https://<vercel-origin>/api/v1/...`), `ascend_refresh_token` is now a **first-party same-origin cookie** across all browsers (including Safari ITP, Firefox ETP Strict, Brave, and Chrome Incognito).

| Attribute | Production (`ENVIRONMENT != "development"`) | Local Dev (`ENVIRONMENT == "development"`) | Verified In |
| --- | --- | --- | --- |
| `HttpOnly` | `True` | `True` | `backend/app/api/v1/endpoints/auth.py` |
| `Secure` | `True` | `False` | `backend/app/api/v1/endpoints/auth.py` |
| `SameSite` | `"lax"` | `"lax"` | `backend/app/api/v1/endpoints/auth.py` |
| `Path` | `"/api/v1/auth"` | `"/api/v1/auth"` | `backend/app/api/v1/endpoints/auth.py` |
| `Domain` | Omitted (host-only) | Omitted (host-only) | `backend/app/api/v1/endpoints/auth.py` |
| Clearing | `_clear_refresh_cookie` uses `_cookie_security_params()` | Identical | `backend/app/api/v1/endpoints/auth.py` |

- Switching production `SameSite` from `none` to `lax` strengthens CSRF protection while eliminating third-party cookie blocking.

---

## 2. Proxy Security Controls (`api/proxy.ts`)

1. **No Arbitrary Upstream / SSRF Prevention:**
   - `resolveValidatedUpstreamOrigin` accepts only the configured `RENDER_BACKEND_URL` with `https:` (or `http://localhost` / `http://127.0.0.1` for local tests), rejecting credentials-in-URL and untrusted `http:` origins.
   - `buildTargetUrl` rejects `..` path traversal, `%2e%2e` encoded traversal, backslashes, non-`/api/` routes, and protocol-relative `//` URLs with `400 INVALID_PROXY_PATH`.
2. **Header & Cookie Hygiene:**
   - Only allowlisted headers (`authorization`, `content-type`, `accept`, `x-requested-with`, `cookie`, `user-agent`, `x-forwarded-for`) are forwarded upstream.
   - Multiple `Set-Cookie` headers are preserved via `getSetCookie()` without collapsing.
   - `RENDER_BACKEND_URL` is server-only and never embedded in Vite client bundles (`resolveApiBaseUrl()` uses relative `/api/v1` in production browser builds).
3. **Zero Secret/Credential Logging:**
   - `api/proxy.ts` performs zero logging of `cookie`, `authorization`, request bodies, or `RENDER_BACKEND_URL` values.

---

## 3. Token & CSRF Verification

- **In-Memory Access Token:** `src/services/api/client.ts` holds `inMemoryAccessToken` exclusively in module memory; `getStoredRefreshToken()` returns `null` in browser runtimes.
- **CSRF Enforcement:** `backend/app/api/v1/endpoints/auth.py` (`_resolve_refresh_token`) requires `X-Requested-With` or `Authorization` whenever authenticating via `ascend_refresh_token` cookie (`403 FORBIDDEN` when absent).
- **Automated Coverage:**
  - `test_production_same_origin_cookie_attributes` (`backend/tests/test_auth.py`) — **PASSED**
  - `test_httponly_refresh_cookie_and_csrf_protection` (`backend/tests/test_auth.py`) — **PASSED**
  - `test_phase6_5_2_vercel_proxy.ts` (13/13 checks) — **PASSED**
  - Batch 8 Security Audit (22/22 checks) — **PASSED**

---

## 4. Remaining Risks & Conditions

1. **Vercel Hobby Non-Commercial Policy:** Free-tier Vercel Hobby (`₹0/month`) forbids commercial/revenue-generating deployments; commercial use requires Vercel Pro.
2. **Phase 8 Browser E2E Pending:** Live-browser verification on the deployed Vercel + Render origins has not been executed yet (deferred to Phase 8 post-deployment).
