# ASCEND — Phase 6.5.1 Remediation Report

**Date:** 2026-11-25  
**Scope:** Issues investigated and remediated during Phase 6.5.1 verification.

---

## 1. Summary

No application source code changes were required during Phase 6.5.1. All four investigation areas were verified directly against the Phase 6.5 working tree and live test backend:

1. **Swagger / OpenAPI `/docs` 404 Investigation:**
   - **Finding:** `http://127.0.0.1:8000/docs` returns `404 {"detail":"Not Found"}` because FastAPI intentionally mounts Swagger UI at **`/api/v1/docs`** (`f"{settings.API_V1_STR}/docs"`) in `backend/app/main.py:37-39` when `settings.DEBUG` is `True`, and disables docs in production (`DEBUG=False`).
   - **Verification:** Probed live backend on `:8001`: `/api/v1/docs` returned `200` (1041 bytes) and `/api/v1/openapi.json` returned `200` (88302 bytes).
   - **Code Change:** None required.

2. **Local Development Hostname Mismatch (`localhost:3000` vs `127.0.0.1:8000`):**
   - **Finding:** Mixing `localhost` (frontend) and `127.0.0.1` (backend) makes requests cross-site under browser SameSite rules, which blocks `SameSite=Lax; Secure=False` refresh cookies in development.
   - **Guidance:** Run both frontend and backend on `localhost` (`--host 0.0.0.0 --port 8000` or `--host localhost --port 8000`, matching `client.ts` default `http://localhost:8000/api/v1`), or both on `127.0.0.1`.
   - **Code Change:** None required.

3. **Production Cross-Origin Cookie Architecture (`*.pages.dev` + `*.onrender.com`):**
   - **Finding:** `SameSite=None; Secure`, `HttpOnly`, `path=/api/v1/auth`, CORS `allow_credentials=True` with explicit origins, and `X-Requested-With` CSRF validation are all configured consistently. However, separate Public Suffix List domains (`*.pages.dev` + `*.onrender.com`) trigger third-party cookie blocking in Safari ITP, Firefox ETP Strict, Brave, and Chrome Incognito.
   - **Deployment Condition:** Use a same-site custom domain (e.g., `app.<domain>` + `api.<domain>`) or same-origin `/api` proxy for full cross-browser session recovery and silent refresh.
   - **Code Change:** None required in Phase 6.5.1.

4. **Migration & Automated Regression Reruns:**
   - **Finding:** `d4e5f6a7b8c9 (head)` is clean, linear, and has all expected FKs, indexes, and check constraints in PostgreSQL. All automated suites (`56/56` pytest, `44/44` Batch 7, `22/22` Batch 8 Security, `33/33` Batch 8 Pathways, `tsc --noEmit`, `vite build`, `npm audit`) passed on the final working tree.
   - **Code Change:** None required.
