# Devsi — Sprint 3 Tasks

**Sprint:** April 3–10, 2026
**Role:** DevOps
**Total tasks:** 1

Read the [Sprint Brief](./SPRINT-BRIEF.md) first.

---

## D1 — Infrastructure Plan for June Launch

**Priority:** High (blocks Soni's architecture decisions)
**Deadline:** April 5

### Context

Soni flagged in his mid-term review that he has 3 in-memory Maps holding critical game state (`activeBettingStates`, `roundBlindCache`, `roundPhaseMap`). If the server process crashes mid-round, all game state is lost — pots evaporate, chip stacks corrupt. This is acceptable for demo mode but NOT for real-money launch in June.

Soni needs answers to make architecture decisions for Sprint 3-4. Without these answers, he doesn't know whether to build for single-server or multi-instance.

### Questions to Answer

Write your answers in a doc at `docs/infrastructure-plan.md`:

1. **Deployment target:** Where will the app run in production?
   - Single VPS / Droplet?
   - Container orchestration (Kubernetes, ECS)?
   - PaaS (Railway, Render, Fly.io)?
   - What's the budget?

2. **Scaling model:** Single Node.js process or horizontal scaling?
   - If single: health checks + auto-restart is enough
   - If multi-instance: Socket.io needs Redis adapter (already configured in code), betting state needs Redis persistence

3. **Redis plan:** Currently Redis is in docker-compose but not actively used by the app.
   - Should Soni migrate in-memory betting state to Redis?
   - Should we use Redis for session storage too?
   - What's the latency cost vs reliability trade-off?

4. **Database:** PostgreSQL 16 is in Docker locally.
   - Managed PostgreSQL for production? (RDS, Supabase, Neon)
   - Backup strategy?
   - Connection pooling?

5. **Graceful restart:** What happens during deployment?
   - Blue-green deployment? Rolling restart?
   - How do we drain active game sessions before restarting?
   - Can we signal "no new games" while finishing current rounds?

6. **Monitoring:** What do we monitor in production?
   - Health check endpoint (already exists: `GET /api/health`)
   - Active game count, connected players, memory usage
   - Error tracking (Sentry? Datadog?)
   - Log aggregation

7. **Load estimate:** How many concurrent games do we expect?
   - World Cup has 64 matches over 30 days
   - Estimate concurrent tables during peak (group stage, 4 matches/day)
   - Estimate concurrent WebSocket connections

### Deliverables

- [x] `docs/infrastructure-plan.md` answering all 7 questions
- [x] Recommendation: single-server vs multi-instance for launch
- [x] If multi-instance: migration plan for in-memory state → Redis
- [x] Timeline estimate for production infrastructure setup
- [ ] Share the doc with Soni — he's waiting on this to plan Sprint 4

### Out of scope

- Actually building the infrastructure (that's Sprint 4+)
- Payment processing infrastructure (separate track)
- CDN / static asset hosting (can use Vite build + any CDN)

**Estimated effort:** 1 day (research + document)

---

## Delivery Log

### D1 — Infrastructure Plan

**Status:** Complete — April 2, 2026
**Deliverable:** `docs/infrastructure-plan.md`
**Key decisions:** Fly.io deployment, single process, Redis for all 3 Maps, Supabase PostgreSQL, Sentry monitoring
**Pending:** Share with Soni
