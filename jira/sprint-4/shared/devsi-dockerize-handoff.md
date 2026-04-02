# Devsi — Soni's S12 Dockerize Handoff

**Date:** April 2, 2026
**Branch:** `feat/dockerize` (pushed to origin)
**Status:** Ready for D3 integration

## What's on the branch

| File | Purpose |
|------|---------|
| `apps/server/Dockerfile` | Multi-stage: node:22-alpine builder → tsc → prod image (node:22-alpine + prod deps + dist) |
| `apps/web/Dockerfile` | Multi-stage: node:22-alpine builder → vite build → nginx:alpine (static files only) |
| `apps/web/nginx.conf` | SPA routing inside web container (try_files → /index.html) |
| `nginx.conf` (root) | Reverse proxy for your D3 nginx container: `/` → web:80, `/api/` → server:5174, `/socket.io/` → server:5174 (WebSocket upgrade) |
| `docker-compose.production.yml` | Full 5-service stack: postgres, redis, server, web, nginx |
| `.dockerignore` | Excludes node_modules, .git, docs, jira, screenshots, dist dirs |
| `.env.production.template` | DB_PASSWORD, JWT_SECRET, NODE_ENV |
| `packages/shared/package.json` | Updated exports — conditional: `types` → .ts for dev, `import` → dist/*.js for production |

## How to test locally

```bash
git checkout feat/dockerize
docker compose -f docker-compose.production.yml up --build
# Wait for health checks (~10s)
curl http://localhost/api/health    # → {"success":true,...}
curl http://localhost               # → React SPA (200)
```

## Env vars the server needs

| Variable | Default | Notes |
|----------|---------|-------|
| `PORT` | `5174` | Server listen port (internal to Docker network) |
| `DATABASE_URL` | `postgres://wpc:wpc_dev_pass@localhost:5432/world_poker_cup` | Override with `postgres://wpc:${DB_PASSWORD}@postgres:5432/world_poker_cup` in compose |
| `REDIS_URL` | `redis://localhost:6379` | Override with `redis://redis:6379` in compose |
| `JWT_SECRET` | `dev-secret-change-in-production` | **Must change in production** |
| `NODE_ENV` | `development` | Set to `production` in compose |

## Architecture

```
nginx:80 ─┬─ /          → web:80 (nginx serving static React build)
           ├─ /api/*     → server:5174 (Express REST)
           └─ /socket.io → server:5174 (WebSocket upgrade)

server:5174 ─→ postgres:5432
             ─→ redis:6379
```

## Notes for your D3

- The `docker-compose.production.yml` I created matches your D3 spec almost exactly. Feel free to modify it or create your own — my Dockerfiles are standalone.
- Root `nginx.conf` is your reverse proxy config. The `apps/web/nginx.conf` is only used inside the web container for SPA routing — they don't conflict.
- Server entry point in Docker: `node apps/server/dist/apps/server/src/app.js` (nested because tsc resolves workspace paths from monorepo root).
- `@wpc/shared` resolves at runtime via pnpm workspace symlink → `packages/shared/dist/index.js`.

## Pending

- PR #3 (Sprint 3 merge to main) is blocked on review approval. Once merged, `feat/dockerize` can be rebased onto main. For now, pull `feat/dockerize` directly — it includes all Sprint 3 work.
- S13 (Redis migration) is in progress — will add `apps/server/src/config.ts` and `apps/server/src/lib/redis.ts`. These don't affect your Dockerfiles.
