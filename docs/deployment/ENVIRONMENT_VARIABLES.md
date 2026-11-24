# ASCEND — Environment Variables Reference

## 1. Frontend (Cloudflare Pages Build Environment)

| Variable | Required | Example / Production Value | Purpose |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | **Yes** | `https://ascend-api.onrender.com/api/v1` | Target FastAPI v1 base URL baked into Vite bundle at build time. |

> **Security Rule:** Never define `GEMINI_API_KEY`, `SECRET_KEY`, or `DATABASE_URL` in Cloudflare Pages environment variables.

---

## 2. Backend (Render Web Service Environment)

| Variable | Required | Default | Production Value / Notes |
| :--- | :--- | :--- | :--- |
| `ENVIRONMENT` | **Yes** | `development` | Must be `production`. |
| `DEBUG` | **Yes** | `True` | Must be `False` (enforced by startup validator when `ENVIRONMENT=production`). |
| `SECRET_KEY` | **Yes** | *(insecure dev)* | Auto-generated 256-bit secret (`>= 32` chars). |
| `DATABASE_URL` | **Yes** | `None` | Neon pooled URI (`postgresql://...pooler...?sslmode=require`). Query SSL params are auto-converted for `asyncpg`. |
| `BACKEND_CORS_ORIGINS` | **Yes** | `["http://localhost:3000"]` | Exact JSON array of frontend origin, e.g. `["https://ascend-app.pages.dev"]`. |
| `DATABASE_POOL_SIZE` | Recommended | `10` | Set to `5` for free-tier Render/Neon. |
| `DATABASE_MAX_OVERFLOW` | Recommended | `20` | Set to `5` for free-tier Render/Neon. |
| `DATABASE_POOL_PRE_PING` | Recommended | `True` | Keeps connections healthy across Neon idle suspends. |
| `DATABASE_POOL_RECYCLE` | Recommended | `300` | Recycles connections every 5 minutes. |
| `DATABASE_CONNECT_TIMEOUT` | Recommended | `10.0` | Allows Neon cold-wake latency (~0.5–3s). |
| `DATABASE_COMMAND_TIMEOUT` | Recommended | `15.0` | Statement timeout in seconds. |
| `RATE_LIMIT_ENABLED` | Recommended | `True` | Enables sliding-window rate limiter. |
| `MAX_REQUEST_BODY_BYTES` | Recommended | `1048576` | 1 MiB payload cap. |
| `GEMINI_API_KEY` | Optional | `None` | Google Gemini API key; if omitted or quota-exhausted, local heuristic fallback activates automatically. |
| `GEMINI_MODEL` | Optional | `gemini-2.5-flash` | Gemini Developer API model identifier. |
| `AI_REQUEST_TIMEOUT_SECONDS` | Optional | `10.0` | HTTP timeout for Gemini API calls. |
