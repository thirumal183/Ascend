# ASCEND — Production Deployment Architecture

## 1. System Topology

```
[ Browser (React 19 + Vite SPA) ]
        |  HTTPS (TLS 1.3, CSP enforced)
        v
[ Cloudflare Pages (Global Anycast CDN) ]
        |  API calls via VITE_API_BASE_URL (CORS allowlist)
        v
[ Render Web Service (FastAPI + Uvicorn, Python 3.13) ]
   ├── In-Memory Sliding-Window Rate Limiter
   ├── Argon2id (asyncio.to_thread) + JWT HS256 Auth
   ├── Gemini 2.5 Flash HTTPS Gateway (x-goog-api-key header) + Local Fallback
   └── SQLAlchemy 2.0 Async + asyncpg (pool_size=5, max_overflow=5, pool_recycle=300)
        |  TLS (ssl="require", PgBouncer -pooler compatible)
        v
[ Neon Serverless PostgreSQL 16+ ]
   └── 16 Relational Tables (15 Phase 3 entities + WorkoutPlan ownership) + v_food_items_with_nutrients
```

## 2. Runtime & Process Configuration
- **Frontend Build:** `npm run build` outputs static assets to `dist/` (`React.lazy` split across 8 chunks).
- **Backend Startup:** `alembic upgrade head && uvicorn app.main:create_application --factory --host 0.0.0.0 --port $PORT`
  - Single Uvicorn worker (`workers=1`) is mandatory on Render Free (256–512 MB RAM) to prevent OOM and keep the in-memory sliding-window rate limiter consistent per instance.
- **Health Checks:** Render polls `GET /api/v1/health` (lightweight liveness); operators verify DB connectivity via `GET /api/v1/health/db` (10s Neon cold-wake timeout).

## 3. Portability
The entire stack is standard Vite static assets + standard ASGI FastAPI + standard PostgreSQL/Alembic. No proprietary Cloudflare Workers, Vercel Edge Functions, or Render-only SDKs are imported in application code, enabling zero-rewrite migration to Fly.io, AWS ECS, or self-hosted Docker.
