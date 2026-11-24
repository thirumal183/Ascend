# ASCEND — Production Deployment Runbook (Cloudflare Pages + Render + Neon)

## 1. Provision Neon PostgreSQL (₹0/month)
1. Create a free Neon project (`ascend-prod`) in a region close to your Render region (e.g., US East / EU Central).
2. Copy the **Pooled connection string** (`-pooler` hostname, ending in `?sslmode=require`).

## 2. Deploy Backend on Render (₹0/month)
1. Connect GitHub repository `https://github.com/thirumal183/Ascend.git` (`main` branch).
2. Use `render.yaml` Blueprint (or create Web Service with Root Directory `backend`, Build Command `pip install -r requirements.txt`, Start Command `alembic upgrade head && uvicorn app.main:create_application --factory --host 0.0.0.0 --port $PORT`).
3. Set `DATABASE_URL` (Neon pooled string), `GEMINI_API_KEY` (optional), and temporary `BACKEND_CORS_ORIGINS='["http://localhost:3000"]'`.
4. Verify `GET https://<render-service>.onrender.com/api/v1/health` and `/api/v1/health/db` return `200 OK`.

## 3. Deploy Frontend on Cloudflare Pages (₹0/month)
1. Connect the same GitHub repository (`main` branch).
2. Configure Build Command: `npm run build` and Output Directory: `dist`.
3. Add environment variable `VITE_API_BASE_URL=https://<render-service>.onrender.com/api/v1`.
4. Deploy and note the assigned `https://<project>.pages.dev` URL.

## 4. Finalize CORS & Smoke Test
1. Update `BACKEND_CORS_ORIGINS` on Render to `["https://<project>.pages.dev"]` (add custom domain if configured) and redeploy.
2. Verify registration, login, food search, meal logging, workout set logging, progress check-in, and AI Coach fallback/live response on the deployed URL.
