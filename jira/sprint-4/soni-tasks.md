# Soni — Sprint 4 Tasks

**Sprint:** April 4–11, 2026
**Role:** Senior Developer — Backend / Game Engine
**Total tasks:** 3

Read the [Sprint Brief](./SPRINT-BRIEF.md) first.

---

## S12 — Dockerize Server + Web

**Priority:** High (blocks deployment)
**Branch:** `feat/dockerize`
**Deadline:** April 5

### Requirements

1. **Create `apps/server/Dockerfile`:**
   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
   COPY apps/server/package.json apps/server/
   COPY packages/shared/package.json packages/shared/
   RUN corepack enable && pnpm install --frozen-lockfile

   COPY packages/shared/ packages/shared/
   COPY apps/server/ apps/server/
   RUN pnpm --filter @wpc/shared build
   RUN pnpm --filter server build

   FROM node:22-alpine
   WORKDIR /app
   COPY --from=builder /app/apps/server/dist ./dist
   COPY --from=builder /app/node_modules ./node_modules
   COPY --from=builder /app/apps/server/package.json ./
   EXPOSE 5174
   CMD ["node", "dist/app.js"]
   ```
   Adjust paths based on your actual build output. The key: multi-stage build, small final image, no dev dependencies.

2. **Create `apps/web/Dockerfile`:**
   ```dockerfile
   FROM node:22-alpine AS builder
   WORKDIR /app
   COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
   COPY apps/web/package.json apps/web/
   COPY packages/shared/package.json packages/shared/
   RUN corepack enable && pnpm install --frozen-lockfile

   COPY packages/shared/ packages/shared/
   COPY apps/web/ apps/web/
   RUN pnpm --filter @wpc/shared build
   RUN pnpm --filter web build

   FROM nginx:alpine
   COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
   COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
   EXPOSE 80
   ```

3. **Create `apps/web/nginx.conf`** for the web container:
   ```nginx
   server {
     listen 80;
     root /usr/share/nginx/html;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```
   This handles SPA routing (React Router).

4. **Add `.dockerignore`** at repo root:
   ```
   node_modules
   .git
   *.md
   assets/screenshots
   jira/
   docs/
   recordings/
   ```

5. **Test locally:**
   ```bash
   docker-compose -f docker-compose.production.yml build
   docker-compose -f docker-compose.production.yml up
   ```
   Game should work at `http://localhost` (port 80 via Nginx).

### Deliverables

- [ ] `apps/server/Dockerfile` builds successfully
- [ ] `apps/web/Dockerfile` builds successfully
- [ ] `.dockerignore` excludes unnecessary files
- [ ] `docker-compose.production.yml up` runs the full stack locally
- [ ] Game accessible at `http://localhost` via Nginx

**Estimated effort:** 1 day

---

## S13 — Environment Config + Redis Migration

**Priority:** High
**Branch:** `feat/redis-state-migration`
**Deadline:** April 7

### Requirements

1. **Environment config** — Create a config module that reads from env vars with defaults:
   ```typescript
   // apps/server/src/config.ts
   export const config = {
     port: parseInt(process.env.PORT ?? '5174'),
     databaseUrl: process.env.DATABASE_URL ?? 'postgres://wpc:wpc_dev_pass@localhost:5432/world_poker_cup',
     redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
     jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
     nodeEnv: process.env.NODE_ENV ?? 'development',
   }
   ```
   Replace all hardcoded connection strings with `config.*`.

2. **Redis migration** — Move the 3 in-memory Maps to Redis:

   **`activeBettingStates`** (Map<roundId, BettingState>):
   - Key: `betting:{roundId}`
   - Value: JSON.stringify(BettingState)
   - TTL: 2 hours (auto-cleanup of abandoned games)
   - On read: `JSON.parse(await redis.get('betting:' + roundId))`
   - On write: `await redis.set('betting:' + roundId, JSON.stringify(state), 'EX', 7200)`

   **`roundBlindCache`** (Map<roundId, BlindInfo>):
   - Key: `blinds:{roundId}`
   - Same pattern as above

   **`roundPhaseMap`** (Map<tableId, RoundPhaseState>):
   - Key: `phase:{tableId}`
   - Same pattern

3. **Create `apps/server/src/lib/redis.ts`:**
   ```typescript
   import { createClient } from 'redis'
   import { config } from '../config'

   export const redis = createClient({ url: config.redisUrl })

   export async function connectRedis() {
     await redis.connect()
     console.log('Redis connected')
   }
   ```
   Call `connectRedis()` in `app.ts` startup.

4. **Graceful degradation** — If Redis is unavailable, fall back to in-memory Maps (for local dev without Redis). Log a warning.

5. **Test:** Restart the server mid-round. Reconnect. The game should resume from where it was (betting state preserved in Redis).

### Deliverables

- [ ] Config module reads all connection strings from env vars
- [ ] All 3 Maps migrated to Redis with TTL
- [ ] Redis client module with connect/disconnect
- [ ] Fallback to in-memory if Redis unavailable
- [ ] Game survives server restart (state preserved in Redis)
- [ ] All 42 tests still pass (mock Redis in tests)

**Estimated effort:** 2 days

---

## S14 — Database Migrations + Production Seeding

**Priority:** High
**Branch:** `feat/production-db-setup`
**Deadline:** April 7

### Requirements

1. **Switch from `drizzle-kit push` to versioned migrations:**
   - Run `pnpm drizzle-kit generate` to create migration SQL files
   - Migrations go to `apps/server/src/db/migrations/`
   - Add a `pnpm db:migrate` script that runs `drizzle-kit migrate`
   - This runs on every deploy (idempotent — only applies new migrations)

2. **Seeding script for production:**
   - `pnpm db:seed` seeds the 32 World Cup teams (already exists)
   - Make it idempotent: check if teams exist before inserting
   - The CD pipeline runs `db:migrate` then `db:seed` on every deploy

3. **Add a reset script for Mark's QA:**
   - `pnpm db:reset` — drops all tables, re-runs migrations, re-seeds
   - Only available in development/test environment
   - Mark runs this after each QA session to clean test data

### Deliverables

- [ ] Versioned migration files generated
- [ ] `pnpm db:migrate` runs migrations idempotently
- [ ] `pnpm db:seed` is idempotent (safe to run multiple times)
- [ ] `pnpm db:reset` available for QA cleanup (dev only)
- [ ] CD pipeline runs migrate + seed on deploy

**Estimated effort:** 1 day

---

## Delivery Log

### S12 — Dockerize
**Status:** COMPLETE (Apr 2)

**Files created:**
- `apps/server/Dockerfile` — multi-stage build: node:22-alpine builder → tsc → prod image with node_modules (prod only) + dist
- `apps/web/Dockerfile` — multi-stage build: node:22-alpine builder → vite build → nginx:alpine with static files
- `apps/web/nginx.conf` — SPA routing (try_files → /index.html)
- `nginx.conf` (root) — reverse proxy: `/` → web, `/api/` → server, `/socket.io/` → server (WebSocket upgrade)
- `docker-compose.production.yml` — 5 services: postgres, redis, server, web, nginx (port 80)
- `.dockerignore` — excludes node_modules, .git, docs, jira, screenshots, dist dirs
- `.env.production.template` — DB_PASSWORD, JWT_SECRET, NODE_ENV

**Key fix:** Updated `packages/shared/package.json` exports to use conditional exports (`types` → `.ts` for dev, `import` → `dist/*.js` for production). This lets `tsc` build output resolve `@wpc/shared` at runtime via pnpm workspace symlink → shared's compiled `dist/`.

**Verified:**
- `docker build` succeeds for both images
- `docker compose -f docker-compose.production.yml up` — all 5 containers healthy
- `curl localhost/api/health` → `{"success":true}`
- `curl localhost/` → 200 (React SPA served via nginx)
- Server logs: clean startup in production mode on port 5174
- All 43 tests still pass

### S13 — Redis Migration
**Status:** COMPLETE (Apr 2)

**Files created:**
- `apps/server/src/config.ts` — centralized env config (port, databaseUrl, redisUrl, jwtSecret, nodeEnv, corsOrigins) with local defaults
- `apps/server/src/lib/redis.ts` — Redis client with connect/disconnect, error handling, graceful degradation
- `apps/server/src/lib/game-state-store.ts` — abstraction over Redis: `stateGet<T>`, `stateSet<T>`, `stateDel` with 2h TTL, in-memory Map fallback

**Files modified:**
- `apps/server/src/app.ts` — uses `config` for port/cors/env, calls `connectRedis()` on startup, async `start()` function
- `apps/server/src/db/index.ts` — uses `config.databaseUrl` instead of raw `process.env`
- `apps/server/src/modules/game/betting.service.ts` — `activeBettingStates` Map → Redis (`betting:{roundId}`). `getBettingState`, `initBettingRound`, `clearBettingState` now async
- `apps/server/src/modules/game/game.service.ts` — `roundBlindCache` → Redis (`blinds:{roundId}`), `roundPhaseMap` → Redis (`phase:{tableId}`), `roundFixtureDataCache` → Redis (`fixture-data:{roundId}`, Maps serialized to plain objects). All phase functions async
- `apps/server/src/modules/game/bot.service.ts` — async `getBettingState` call
- `apps/server/src/modules/game/game.socket.ts` — async `getBettingState` and `getRoundPhaseState`
- `apps/server/src/modules/test/test.service.ts` — async `getBettingState`, `cancelRoundTimers`
- Both test files — async `initBettingRound`, `clearBettingState`

**What stayed in-memory:**
- `activeTimers` — timer abort controllers (can't serialize)
- `betTimers` — setTimeout IDs (can't serialize)

**Graceful degradation:** If Redis is unavailable, `game-state-store.ts` automatically falls back to in-memory Maps with a warning log. Tests run without Redis and all 43 pass.

**Verified:**
- Server starts with Redis connected: `Redis - connected { url: 'redis://localhost:6379' }`
- All 43 tests pass (in-memory fallback)
- Server typecheck clean
- Devsi handoff doc created: `jira/sprint-4/shared/devsi-dockerize-handoff.md`

### S14 — DB Migrations
**Status:** Not started
