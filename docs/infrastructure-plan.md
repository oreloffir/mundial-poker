# Infrastructure Plan — Mundial Poker June Launch

**Author:** Devsi
**Date:** April 2, 2026
**Sprint:** 3
**Status:** Draft — awaiting Orel sign-off
**Blocking:** Soni's Sprint 4 architecture decisions

---

## TL;DR for Soni

**Yes, migrate in-memory state to Redis.** Single-server for launch. Redis is already installed
and your codebase already has `@socket.io/redis-adapter` and `redis` as dependencies. The
migration cost is low; the crash recovery risk is too high to skip.

---

## 1. Deployment Target

**Recommendation: Fly.io**

| Option           | Pros                                                                                           | Cons                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Fly.io**       | Free tier generous, persistent volumes, global edge, WebSocket support built-in, easy rollback | Slightly more complex than Railway                                       |
| Railway          | Simplest DX, free tier                                                                         | WebSocket support less reliable at scale, limited persistent volumes     |
| Render           | Solid free tier                                                                                | Cold starts on free plan, WebSocket reconnects on deploy                 |
| VPS/DigitalOcean | Full control, cheap                                                                            | We have to manage SSL, uptime, restarts — too much ops burden for launch |
| Kubernetes/ECS   | Enterprise scaling                                                                             | Overkill for June launch — weeks of setup, ongoing ops cost              |

**Fly.io** gives us:

- Managed PostgreSQL (Fly Postgres) or easy external DB connection
- Persistent volumes for Redis
- WebSocket-native support (important for Socket.io)
- Zero-downtime deploys out of the box
- ~$20–40/month for our scale (see load estimate below)

**Budget estimate for launch: $30–50/month**

- 1x shared-cpu-1x (256MB) for the Node.js server: ~$5/month
- 1x Fly Postgres (shared): ~$7/month
- 1x Redis (Upstash free tier → $0 at our scale): ~$0
- Total: ~$12–20/month with room to scale

---

## 2. Scaling Model

**Recommendation: Single Node.js process for launch**

Here's why:

- World Cup runs 64 matches over 30 days. Peak is group stage (4 matches/day).
- At MAX_PLAYERS = 5 per table, even 100 concurrent tables = 500 WebSocket connections.
- A single Node.js process handles 10,000+ WebSocket connections comfortably.
- Our actual load (see section 7) peaks at ~200–500 connections — well within single-process range.

**What this means for Soni:**

- No Redis adapter for Socket.io needed at launch
- Still: **migrate in-memory state to Redis** (see section 3 — this is about crash recovery, not scaling)
- If we ever scale to multi-instance, the Redis adapter is already a dep (`@socket.io/redis-adapter`)

**Decision:** Single process. Auto-restart via `fly machine restart` policy = `on-failure`. That's
our "horizontal scaling" fallback — if the process dies, Fly restarts it in ~5 seconds, and Redis
has the state.

---

## 3. Redis Plan

**Recommendation: Yes — migrate all three in-memory Maps to Redis**

### The Risk (Soni's flagged issue)

Three module-level Maps in the server process hold live game state:

| Map                   | File                    | What it holds                          | Crash consequence         |
| --------------------- | ----------------------- | -------------------------------------- | ------------------------- |
| `activeBettingStates` | `betting.service.ts:26` | Live betting state per round           | Pots evaporate mid-hand   |
| `roundBlindCache`     | `game.service.ts:97`    | Blind amounts per round                | Bet sizing corrupted      |
| `roundPhaseMap`       | `game.service.ts:63`    | Phase (pre-flop, flop, etc.) per table | Round stuck, unresolvable |

A crash mid-hand with real money at stake is unacceptable. All three Maps must be persisted.

### Migration approach

```
Redis key schema:
  betting:state:{roundId}     → serialized BettingState (TTL: 2h)
  game:blinds:{roundId}       → serialized RoundBlindInfo (TTL: 2h)
  game:phase:{tableId}        → serialized RoundPhaseState (TTL: 2h)
```

Use `redis.set(key, JSON.stringify(value), { EX: 7200 })` for all three. TTL of 2 hours is
generous — rounds shouldn't exceed 30 minutes, but gives recovery window.

### Session storage

Not needed for launch. We're using JWT (stateless). If we move to server-side sessions later,
Redis is ready.

### Latency cost

Local Redis: <1ms. Fly.io internal network Redis: 1–3ms. Acceptable for game state operations
that already involve DB queries (10–50ms). The latency trade-off is worth it — reliability
over microseconds.

### Redis provider

**Upstash** (serverless Redis):

- Free tier: 10,000 commands/day, 256MB — covers launch
- Pay-as-you-go after: ~$0.2/100K commands
- Fly.io extension available, or standalone

Alternative: Fly.io Redis (Upstash-backed anyway).

---

## 4. Database

**Recommendation: Supabase (managed PostgreSQL)**

| Option       | Cost          | Pros                                                | Cons                                     |
| ------------ | ------------- | --------------------------------------------------- | ---------------------------------------- |
| **Supabase** | Free → $25/mo | Generous free tier, PG 15, built-in pooler, backups | US-east only on free                     |
| Neon         | Free → $19/mo | Serverless scaling, branching                       | Cold starts on free tier                 |
| Fly Postgres | ~$7/mo        | Co-located with app                                 | Self-managed backups, no built-in pooler |
| RDS          | $15+/mo       | AWS-grade reliability                               | Overkill, expensive for our scale        |

**Supabase free tier covers us for launch:**

- 500MB storage (our schema is tiny)
- 2GB bandwidth
- Daily backups
- PgBouncer connection pooler built in

### Backup strategy

- Supabase: automatic daily backups with 7-day retention (free tier)
- Manual: `pg_dump` weekly to S3/Backblaze B2 — script this in CD pipeline

### Connection pooling

Supabase has PgBouncer at `db.xxx.supabase.co:6543`. Use this URL in production, not the
direct connection. Our Drizzle ORM config just needs the pooled connection string.

### Migration strategy

Currently using `drizzle-kit push` (schema push, no versioned migrations). **This must change
before launch.**

**Plan:**

1. Switch to `drizzle-kit generate` + `drizzle-kit migrate` before Sprint 5
2. Commit migration files to `apps/server/src/db/migrations/`
3. Run migrations in CD pipeline before server starts
4. Never use `drizzle-kit push` in production

This is out of scope for D1 but flagged — Soni and I need to coordinate on this in Sprint 4.

---

## 5. Graceful Restart

**Recommendation: Rolling restart with drain signal**

### The problem

If we restart mid-hand, active rounds are in-flight. With Redis persistence (section 3), state
survives the restart — but we still want to avoid disconnecting players mid-bet if possible.

### Approach

1. **SIGTERM handler** in the Node.js process:
   - Stop accepting new table joins
   - Emit `server:restarting` event to all connected sockets
   - Wait up to 60 seconds for active rounds to complete
   - Force shutdown after timeout

2. **Fly.io rolling deploy** (default behavior):
   - Fly sends SIGTERM to old machine
   - New machine starts and passes health check (`GET /api/health`)
   - Old machine gets SIGKILL after grace period

3. **Health check enhancement** (for Sprint 4):
   - `GET /api/health` should return active game count
   - Fly load balancer waits for health check before routing traffic

```typescript
// Enhancement for Soni — not blocking, Sprint 4 scope
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      activeGames: gameService.getActiveGameCount(), // new metric
    },
  })
})
```

**For launch:** Fly's default 30-second SIGTERM grace period + Redis state persistence = good
enough. Players get a brief disconnect, reconnect, and state is restored from Redis.

---

## 6. Monitoring

**Recommendation: Sentry (errors) + Fly.io metrics (infra) + structured logs**

### Error tracking

**Sentry** — free tier covers us:

- 5,000 errors/month free
- Node.js SDK is 2 lines to install
- Captures unhandled exceptions and `console.error` calls
- Source maps for stack traces from built JS

```bash
pnpm add @sentry/node --filter server
```

### Infrastructure metrics (built-in via Fly.io)

Fly.io dashboard gives us for free:

- CPU usage, memory usage
- HTTP request counts and latency
- WebSocket connection count (via socket.io metrics)

### Health check

`GET /api/health` already exists. Wire it to Fly.io health check config in `fly.toml`:

```toml
[[services.http_checks]]
  path = "/api/health"
  interval = "10s"
  timeout = "2s"
  grace_period = "5s"
```

### Log aggregation

Fly.io ships logs to `fly logs` by default. For launch:

- `fly logs --app wpc-server` is enough for debugging
- If we need search/alerting: ship to **Logtail** (free tier: 1GB/month) via `fly log-shipper`

### Key metrics to watch

| Metric                    | Source           | Alert threshold |
| ------------------------- | ---------------- | --------------- |
| HTTP 5xx rate             | Fly.io dashboard | > 1% over 5min  |
| WebSocket disconnect rate | Socket.io        | > 20% in 1min   |
| Memory usage              | Fly.io           | > 80%           |
| Active betting states     | Redis key count  | Anomalous spike |
| DB connection errors      | Sentry           | Any             |

### Game-specific observability (Sprint 4 scope)

Soni should instrument:

- Active table count
- Active round count
- Average hand duration
- Bet timer expirations (timeout vs player action ratio)

---

## 7. Load Estimate

### World Cup schedule

- 64 total matches over 30 days (June 11 – July 11, 2026)
- Group stage: ~6 matches/day for first 12 days (busiest)
- Knockout stage: 2–4 matches/day

### Table capacity model

- MAX_PLAYERS = 5 per table (from `table.service.ts:8`)
- Assume 1 table per active match (conservative) → up to 6 concurrent tables during group stage
- Assume 10x multiplier for spectators/observers joining tables → 60 concurrent tables peak
- 60 tables × 5 players = **300 concurrent WebSocket connections** at peak

### Aggressive estimate (viral scenario)

- If the game gets traction: assume 20–30 tables per match
- Group stage peak: 6 matches × 25 tables = 150 tables × 5 players = **750 connections**

### Server capacity

- A single Node.js process: handles 10,000+ WebSocket connections comfortably
- Our peak estimate (750) is 7.5% of that capacity
- **Single server is sufficient for launch + growth headroom**

### Database load

- Peak: ~750 concurrent users → ~50–100 concurrent DB queries (game events are async/batched)
- Supabase free tier handles 60 concurrent connections via PgBouncer → fine for launch
- If we grow: upgrade to Supabase Pro ($25/mo) for 200 connections

### Bandwidth estimate

- Socket.io payload per event: ~1–5KB
- Events per minute per table: ~30 (betting actions, phase changes)
- Peak: 60 tables × 30 events × 3KB = 5.4MB/min = **~8GB/month**
- Fly.io free tier: 160GB outbound → well within limits

---

## Recommendation Summary

| Decision          | Answer                                                   |
| ----------------- | -------------------------------------------------------- |
| Deployment target | Fly.io                                                   |
| Scaling model     | Single process (auto-restart on failure)                 |
| Redis             | Yes — migrate all 3 Maps, use Upstash free tier          |
| PostgreSQL        | Supabase managed (free tier at launch)                   |
| Graceful restart  | Fly rolling deploy + SIGTERM handler (60s drain)         |
| Monitoring        | Sentry (errors) + Fly.io metrics + structured logs       |
| Peak load         | ~300–750 WebSocket connections, single server handles it |

---

## Timeline

| Task                               | Owner        | Sprint     | Notes                 |
| ---------------------------------- | ------------ | ---------- | --------------------- |
| Redis state migration (3 Maps)     | Soni         | Sprint 4   | Unblocked by this doc |
| SIGTERM drain handler              | Soni / Devsi | Sprint 4   | 1-2 day task          |
| `fly.toml` + Fly.io setup          | Devsi        | Sprint 4   | 2 days                |
| Supabase prod DB setup             | Devsi        | Sprint 4   | 0.5 days              |
| Sentry integration                 | Devsi        | Sprint 4   | 0.5 days              |
| Migrate to versioned DB migrations | Soni + Devsi | Sprint 4–5 | Coordinate            |
| SSL / custom domain                | Devsi        | Sprint 5   | Fly.io built-in       |
| Load testing                       | Devsi        | Sprint 5   | Before launch         |

**Infrastructure can be production-ready by end of Sprint 4** if Soni starts Redis migration
in parallel.

---

## Open Questions for Orel

1. **Budget confirmed?** $30–50/month estimate — does this fit the budget?
2. **Custom domain?** Need to know the domain name for SSL config.
3. **Payment processing?** Out of scope for this doc but will drive separate infra decisions.
4. **Region?** Fly.io default is US-east (`iad`). If we expect European World Cup traffic, we may
   want `cdg` (Paris) or `ams` (Amsterdam) as primary region.
