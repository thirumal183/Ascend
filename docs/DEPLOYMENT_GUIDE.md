# ASCEND — Production Deployment Guide

**Locked Deployment Stack (₹0/month target):**
- **Frontend & Same-Origin API Proxy:** Vercel
- **Backend API:** Render (Free Web Service)
- **Database:** Neon (Free Serverless PostgreSQL 16+)
- **AI Gateway:** Google Gemini Developer API (optional; deterministic local fallback built in)

> **Status Distinction:** All configurations below are **locally verified** in source, unit tests, and mock proxy tests. **Live cloud deployment and post-deployment browser verification have not yet been executed** and belong to the deployment phase.

---

## 1. Architecture Overview

```text
[ Browser (React 19 + Vite SPA) ]
        │  HTTPS Same-Origin (/api/v1/*) + HttpOnly Cookie + Bearer JWT
        ▼
[ Vercel (Static Dist + Serverless Function api/proxy.ts) ]
        │  Server-to-Server HTTPS (RENDER_BACKEND_URL)
        ▼
[ Render Free Web Service (FastAPI + Uvicorn, Python 3.13, 1 worker) ]
        │  TLS (ssl="require", PgBouncer -pooler, statement_cache_size=0)
        ▼
[ Neon Free Serverless PostgreSQL 16+ ]
```

Using Vercel's same-origin proxy (`/api/*` -> `/api/proxy.ts`) keeps `ascend_refresh_token` first-party (`SameSite=Lax; Secure; HttpOnly`), avoiding third-party cookie blocking in modern browsers.

---

## 2. Step 1 — Provision Neon PostgreSQL

1. Create a free Neon project (e.g., `ascend-prod`) in the region closest to your Render service.
2. Copy the **Pooled** connection string (`-pooler` hostname ending in `?sslmode=require`) for `DATABASE_URL`.
3. Keep the **Direct** (non-pooler) connection string separately for manual `pg_dump` backups.
4. `backend/app/core/config.py` automatically strips `sslmode` / `channel_binding` from `async_database_uri` for `asyncpg` and sets `ssl="require"` and `statement_cache_size=0` when `-pooler` is detected.

### Pre-Launch Database Note
- The development Neon database currently holds test-generated public `food_items` and `workout_plans` rows from earlier `pytest` runs. Before opening a production instance to end users, seed curated food items and pathway workout templates cleanly and avoid running `pytest` against the production `DATABASE_URL`.

---

## 3. Step 2 — Deploy Backend on Render Free

`render.yaml` at the repository root defines the Render Web Service:
- **Root Directory:** `backend`
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `alembic upgrade head && uvicorn app.main:create_application --factory --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/api/v1/health`

### Required Render Environment Variables

| Variable | Value / Format | Notes |
| :--- | :--- | :--- |
| `ENVIRONMENT` | `production` | Enforces `DEBUG=False`, strong `SECRET_KEY`, and `Secure=True` cookies |
| `DEBUG` | `False` | Disables OpenAPI/Swagger UI and verbose DB error strings |
| `SECRET_KEY` | Random >= 32 chars | Auto-generated via `render.yaml` (`generateValue: true`) |
| `DATABASE_URL` | `postgresql://...-pooler...?sslmode=require` | Neon pooled URI |
| `BACKEND_CORS_ORIGINS` | `["https://<your-app>.vercel.app"]` | Set after Vercel URL is assigned |
| `DATABASE_POOL_SIZE` | `5` | Tuned for Render Free RAM (256–512 MB) & Neon |
| `DATABASE_MAX_OVERFLOW` | `5` | Tuned for Render Free RAM |
| `DATABASE_POOL_RECYCLE` | `300` | Prevents stale connections after Neon idle suspend |
| `DATABASE_CONNECT_TIMEOUT` | `10.0` | Accommodates Neon cold-wake (~0.5–3s) |
| `DATABASE_COMMAND_TIMEOUT` | `15.0` | Statement timeout |
| `RATE_LIMIT_ENABLED` | `True` | In-memory sliding-window limiter (requires 1 Uvicorn worker) |
| `GEMINI_API_KEY` | *(Optional)* | Google Gemini key; local heuristic fallback activates if omitted |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Default Gemini model |

---

## 4. Step 3 — Deploy Frontend & Proxy on Vercel

`vercel.json` and `api/proxy.ts` configure the Vercel project:
- **Framework Preset:** Vite
- **Root Directory:** `.`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Vercel Environment Variables
- **Set `RENDER_BACKEND_URL`** (Server-side only, **do NOT** prefix with `VITE_`):
  - Example: `https://ascend-api.onrender.com` (HTTPS required; no trailing slash or credentials).
- **Do NOT set `VITE_API_BASE_URL`** in production (or set to `/api/v1`) so `resolveApiBaseUrl()` in `src/services/api/client.ts` routes all browser requests to same-origin `/api/v1/...`.

### Proxy Security & Cookie Mechanics (`api/proxy.ts`)
- Strips internal `__ascend_path` while preserving all original query parameters.
- Blocks `..`, `%2e%2e`, `\\`, non-`/api/` paths, and `//` prefixes (`400 INVALID_PROXY_PATH`).
- Ignores client-spoofed `x-forwarded-for` and forwards Vercel's `x-vercel-forwarded-for` (or socket peer IP).
- Preserves multiple `Set-Cookie` headers via `upstreamRes.headers.getSetCookie()`.

---

## 5. Free-Tier Operational Limitations

- **Render Free:** Spins down after 15 minutes of inactivity (~30–60s cold start on first request). Single Uvicorn worker (`workers=1`) keeps RAM within limits and keeps the in-memory rate limiter consistent.
- **Neon Free:** Compute suspends after inactivity (~0.5–3s cold-wake); 6-hour point-in-time history.
- **Vercel Hobby:** Intended for personal/academic/non-commercial projects.

---

## 6. Health Checks, Troubleshooting & Rollback

### Health Checks
- `GET /api/v1/health`: Lightweight liveness probe (Render health check).
- `GET /api/v1/health/db`: Executes `SELECT 1` against Neon (10s timeout).

### Troubleshooting
- **`502 PROXY_CONFIG_ERROR`:** `RENDER_BACKEND_URL` is missing or not `https://` in Vercel.
- **`502 UPSTREAM_UNREACHABLE` / `504 UPSTREAM_TIMEOUT`:** Render Free service is cold-starting or unreachable; retry after ~30–60s and check `/api/v1/health`.
- **`403 FORBIDDEN` on `/api/v1/auth/refresh`:** Missing `X-Requested-With: XMLHttpRequest` CSRF header on cookie-authenticated refresh.
- **`401 UNAUTHORIZED` after reload:** Confirm `ENVIRONMENT=production` on Render (so `Secure=True` matches Vercel HTTPS) and `BACKEND_CORS_ORIGINS` matches the Vercel origin.

### Rollback & Database Backup
- **Vercel / Render:** Roll back to the previous healthy deployment in the Vercel or Render dashboard.
- **Schema Rollback:** Run `alembic downgrade -1` against `DATABASE_URL` before rolling back backend code if a migration caused an issue.
- **Backup (`pg_dump`):**
  ```bash
  pg_dump "$DIRECT_NEON_DATABASE_URL" --format=custom --no-owner --no-acl -f ascend_backup_$(date +%F).dump
  ```
