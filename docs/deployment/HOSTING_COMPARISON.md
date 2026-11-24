# ASCEND — Zero-Cost Hosting Comparison (₹0/Month Target)

**Last Verified:** 2026-11-25  
**Target Stack:** React 19 (Vite SPA) + FastAPI (Python 3.13) + Managed PostgreSQL

---

## 1. Frontend Hosting Comparison

| Feature | **Cloudflare Pages (Free)** ✅ | **Vercel (Hobby)** | **Netlify (Free)** |
| :--- | :--- | :--- | :--- |
| **Monthly Cost** | **₹0 / month** | ₹0 / month | ₹0 / month |
| **Commercial Use** | **Allowed** | **Prohibited** (personal/non-commercial only) | Allowed |
| **Bandwidth / Traffic** | **Unlimited** static assets | 100 GB / month | ~15 GB equivalent (300 unified credits/mo) |
| **Build Quota** | 500 builds / month (1 concurrent) | 100 deploys / day (1 concurrent) | ~20 successful builds / month (15 credits/deploy) |
| **Custom Domains & TLS** | Free automatic SSL | Free automatic SSL | Free automatic SSL |
| **Overage Behavior** | Static bandwidth uncapped | Throttling / pause | Site pauses offline until next billing cycle |

**Decision:** **Cloudflare Pages (Free)** — Unlimited static bandwidth, 500 builds/month, commercial-use friendly, and global anycast CDN with zero sleep delay.

---

## 2. Backend Hosting Comparison (Python / FastAPI)

| Feature | **Render (Free Web Service)** ✅ | **Railway (Free Plan)** | **Koyeb (Free / Eco)** |
| :--- | :--- | :--- | :--- |
| **Monthly Cost** | **₹0 / month** | ₹0 / month ($1 credit after 30-day $5 trial) | ₹0 / month |
| **Credit Card Required** | **No** | No (for Free plan) | **Yes** (card verification required) |
| **Compute & RAM** | 256–512 MB RAM / Shared CPU | Up to 0.5 GB RAM / 1 vCPU | 512 MB RAM / 0.1 vCPU |
| **Monthly Allowance** | **750 instance hours / month** | $1 / month non-rolling usage credit | 1 free instance |
| **Idle Sleep Behavior** | Sleeps after **15 minutes** of no inbound HTTP traffic | Sleeps after 5–10 min of no *outbound* traffic | Scales to zero after **1 hour** |
| **Cold Start Latency** | **30–60 seconds** | ~2–5 seconds | Several seconds (throttled by 0.1 vCPU) |
| **Custom Domain & TLS** | Free | Generally requires paid plan | Generally requires paid plan |

**Decision:** **Render (Free Web Service)** — Predictable 750 hours/month with no credit card required, native Python + `alembic` + `uvicorn` support, and free HTTPS custom domain. (Trade-off: 30–60s cold start after 15 min idle.)

---

## 3. Managed PostgreSQL Comparison

| Feature | **Neon (Free Tier)** ✅ | **Supabase (Free Tier)** | **Render (Free PostgreSQL)** |
| :--- | :--- | :--- | :--- |
| **Monthly Cost** | **₹0 / month (Permanent)** | ₹0 / month (Permanent if active) | ₹0 (Expires after 30 days) |
| **Storage Limit** | **1 GB** per project | 500 MB per project | 1 GB |
| **Compute / RAM** | Up to 2 CU (~8 GB burst) | Shared CPU / 500 MB RAM | Shared CPU / 256 MB RAM |
| **Inactivity Behavior** | Scales to zero after 5 min; **auto-wakes in ~300–500ms** on query | **Pauses after 7 days**; requires **manual dashboard unpause** | **Permanently deleted after 30 days** (+14 day grace) |
| **Connection Pooling** | Built-in **PgBouncer** (`-pooler` endpoint) | Supavisor | None (100 max connections) |

**Decision:** **Neon (Free Tier)** — Never expires, auto-wakes on query without manual intervention, provides 1 GB storage (2x Supabase), and includes PgBouncer connection pooling.

---

## 4. Recommended Zero-Cost Architecture & Cost Breakdown

- **Frontend:** Cloudflare Pages Free (`https://<project>.pages.dev`) -> **₹0/month**
- **Backend:** Render Free Web Service (`https://<service>.onrender.com`) -> **₹0/month**
- **Database:** Neon Free Serverless PostgreSQL -> **₹0/month**
- **AI Gateway:** Google Gemini Developer API Free Tier (`gemini-2.5-flash`) with automatic local heuristic fallback -> **₹0/month**
- **Total Recurring Monthly Cost:** **₹0 / month ($0.00)**

### Key Risks of ₹0 Free-Tier Hosting
1. **Cold Starts:** First request after 15 minutes of inactivity takes ~30–60s on Render + ~0.5s on Neon.
2. **In-Memory Rate Limiter:** Resets when Render sleeps/restarts (acceptable for low-traffic MVP; upgrade to Redis if needed at scale).
3. **Gemini Free-Tier Quota:** Rate-limited per minute/day; ASCEND degrades gracefully to its local pathway heuristic engine without failing requests.
4. **No Automated Multi-Day Snapshots on Neon Free:** Neon free tier retains 6-hour history; periodic `pg_dump` exports are documented in `ROLLBACK_AND_RECOVERY.md`.
