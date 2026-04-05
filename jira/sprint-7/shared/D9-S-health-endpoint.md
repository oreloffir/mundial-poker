# Shared Ticket: Enhance /api/health to Check DB + Redis

**Filed by:** Devsi (D9 — Monitoring)
**Assignee:** Soni
**Priority:** High
**Branch:** add to `feat/timer-persistence` or new `fix/health-endpoint`
**Deadline:** April 6

---

## Context

I'm wiring up UptimeRobot to monitor `https://mundialpoker.duckdns.org/api/health`.
The Docker health check for the server container also calls this endpoint.

**Current response:**

```json
{ "success": true, "data": { "status": "ok", "timestamp": "..." } }
```

This only proves the Express process is alive. It doesn't tell us if DB or Redis are reachable.
If postgres crashes, the health endpoint still returns 200. UptimeRobot won't alert.
The Docker healthcheck will also pass while the server is broken.

---

## What I Need

`GET /api/health` should return `200` when healthy:

```json
{ "status": "ok", "db": "connected", "redis": "connected" }
```

And `503` when degraded:

```json
{ "status": "degraded", "db": "error", "redis": "connected" }
```

The check should be fast (< 500ms). Use:

- **DB:** `SELECT 1` via the existing Drizzle/pg connection
- **Redis:** `redis.ping()` via the existing Redis client

Don't create new connections — use the app's existing connection instances.

---

## Files to Modify

- `apps/server/src/app.ts` — update the `/api/health` handler

---

## Deliverable

- `/api/health` checks DB + Redis and reflects real status
- Returns 503 if either is unhealthy (so UptimeRobot and Docker healthcheck both alert)
- No new dependencies

---

## Delivery Log

| Status         | Notes                          |
| -------------- | ------------------------------ |
| ⬜ Not started | Filed by Devsi — April 5, 2026 |
