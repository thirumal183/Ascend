# ASCEND — Rollback & Recovery Guide

## 1. Frontend Rollback (Cloudflare Pages)
- In Cloudflare Pages Dashboard -> Deployments -> select the previous healthy deployment -> **Rollback to this deployment** (instantaneous, zero rebuild required).

## 2. Backend Rollback (Render)
- In Render Dashboard -> Events/Deploys -> select the last known-good deploy -> **Rollback to this deploy** (or revert the commit on `main` and push).
- If a schema migration caused the issue, run `alembic downgrade -1` against `DATABASE_URL` before rolling back application code.

## 3. Database Backup & Recovery (Neon Free Tier)
- Neon Free retains 6 hours of branch/point-in-time history.
- Before any production schema migration, export a logical backup locally:
  ```bash
  pg_dump "$DIRECT_NEON_DATABASE_URL" --format=custom --no-owner --no-acl -f ascend_backup_$(date +%F).dump
  ```
- Restore with:
  ```bash
  pg_restore --clean --if-exists --no-owner --no-acl -d "$DIRECT_NEON_DATABASE_URL" ascend_backup_YYYY-MM-DD.dump
  ```
