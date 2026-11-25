# ASCEND — Phase 6.5.3 Final Vercel Proxy Audit Report

**Date:** 2026-11-25  
**Scope:** Narrowly scoped final audit of Phase 6.5.2 Vercel Same-Origin API Proxy (`api/proxy.ts`, `vercel.json`, `src/services/api/client.ts`, `backend/app/api/v1/endpoints/auth.py`, `backend/app/api/v1/deps.py`, `backend/app/core/rate_limit.py`)  
**Final Verdict:** **READY WITH CONDITIONS**

---

## 1. Audit Findings by Severity & Exact Fixes

### [MEDIUM] Client-Supplied `X-Forwarded-For` Trust in Proxy (`api/proxy.ts`)
- **Finding:** `api/proxy.ts` previously forwarded raw `req.headers['x-forwarded-for']` directly to the upstream backend. While `backend/app/core/rate_limit.py:68` and `backend/app/api/v1/deps.py:26` read `request.client.host` (Uvicorn's TCP peer IP, not `X-Forwarded-For`), forwarding unverified client `x-forwarded-for` headers is unsafe if upstream proxy-header parsing is ever enabled.
- **Exact Fix (`api/proxy.ts`):** Updated `handleProxyRequest` to prefer Vercel's edge-populated `x-vercel-forwarded-for` (taking the first hop) or `req.socket?.remoteAddress`, ignoring client-supplied `x-forwarded-for`.

### [LOW] Missing `OPTIONS` Body Guard, `://` Path Check & Explicit Upstream Timeout (`api/proxy.ts`)
- **Finding:** `readRequestBody` skipped bodies for `GET`/`HEAD` but not `OPTIONS`; `buildTargetUrl` did not explicitly reject `://` inside `__ascend_path`; `fetchImpl` lacked an explicit `AbortSignal.timeout` returning `504`.
- **Exact Fix (`api/proxy.ts`):**
  - Added `'OPTIONS'` to the body-less method guard in `readRequestBody`.
  - Added `decodedPath.includes('://')` rejection in `buildTargetUrl`.
  - Added `AbortSignal.timeout(timeoutMs)` (default `25_000` ms) returning `504 UPSTREAM_TIMEOUT` on `TimeoutError`/`AbortError`.

### [INFO] Query Preservation & Real Wire `Set-Cookie` Verification (`scripts/test_phase6_5_2_vercel_proxy.ts`)
- **Finding:** Prior Phase 6.5.2 tests used a mocked `ServerResponse` and did not test repeated/empty/encoded query parameters or wire-level `node:http` `Set-Cookie` preservation.
- **Exact Fix (`scripts/test_phase6_5_2_vercel_proxy.ts`):** Added tests for repeated parameters (`tag=a&tag=b`), empty values (`empty=`), encoded characters (`chicken%20%26%20rice`), `OPTIONS`, `504` timeout, spoofed `x-forwarded-for` rejection, and a **real `node:http` server over TCP loopback** verifying multiple `Set-Cookie` headers and all attributes (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/api/v1/auth`, `Max-Age`, `Expires`) remain uncollapsed.

---

## 2. Vercel Hobby Documentation & Plan Limits Verification

Verified against official `vercel.com` documentation:
- **Hobby Plan (\$0 / month):**
  - Strictly limited to **personal, non-commercial use only** (personal academic/portfolio demonstrations are permitted; commercial, monetized, or business usage is prohibited and requires Pro).
  - Fixed monthly allotments (100 GB Fast Data Transfer, 1M function invocations, 4 CPU-hrs); exceeding limits pauses usage until reset.
  - Serverless Functions under Fluid Compute: **`maxDuration` default and maximum is 300 seconds (5 minutes)** on Hobby.
- **Pro Plan (\$20 / month per seat):**
  - Commercial/production use permitted; includes \$20 monthly usage credit with pay-as-you-go overages.
  - `maxDuration` default 300s, configurable up to **800 seconds** (GA) / **1800 seconds** (beta).

---

## 3. Verification Results (Final Working Tree)

*Note: No deployment exists yet; all Vercel proxy checks below were executed against local `node:http` and local Uvicorn (`127.0.0.1:8001`), not deployed Vercel edge infrastructure. Live-browser E2E on deployed Vercel + Render remains deferred to Phase 8.*

| Suite / Check | Exact Command | Result |
| --- | --- | --- |
| Vercel Proxy & Real-HTTP Wire Tests | `npx.cmd tsx scripts/test_phase6_5_2_vercel_proxy.ts` | **16/16 PASSED** |
| Backend Pytest Suite | `Set-Location backend; python -m pytest tests -v` | **57/57 PASSED** |
| Batch 7 Integration | `$env:VITE_API_BASE_URL = 'http://127.0.0.1:8001/api/v1'; npx.cmd tsx scripts/test_batch7_integration.ts` | **44/44 PASSED** |
| Batch 8 Security Audit | `npx.cmd tsx scripts/test_batch8_security_audit.ts` | **22/22 PASSED** |
| Batch 8 Multi-Pathway | `npx.cmd tsx scripts/test_batch8_pathways.ts` | **33/33 PASSED** |
| TypeScript Lint | `npm.cmd run lint` (`tsc --noEmit`) | **0 errors** |
| Frontend Build | `npm.cmd run build` (`vite build`) | **PASSED** (697ms) |
| Dependency Audit | `npm.cmd audit --audit-level=moderate` | **0 vulnerabilities** |
| Alembic Revision | `Set-Location backend; python -m alembic current; python -m alembic heads` | **`d4e5f6a7b8c9 (head)`** |

---

## 4. Unresolved Limitations & Deployment Conditions

1. **Vercel Hobby Non-Commercial Policy:** Valid for personal/academic demonstration at ₹0/month; any commercial launch requires Vercel Pro (\$20/month per seat).
2. **Deployed Edge & Browser Verification Deferred:** Live Vercel rewrite + Render cold-start + real-browser cookie verification has not been run yet (Phase 8 post-deployment).
3. **Render Free-Tier Rate-Limit Bucketing:** Behind Vercel + Render's reverse proxy, `rate_limit.py` currently keys on `request.client.host` (Render's proxy peer IP unless `--proxy-headers` is configured on Uvicorn), which is safe against IP spoofing but means proxied traffic may share a rate-limit bucket on the free tier.
