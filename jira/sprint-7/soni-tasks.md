# Soni — Sprint 7 Tasks

**Sprint:** April 5–12, 2026
**Role:** Senior Developer — Backend
**Total tasks:** 3

Two independent tracks: timer recovery (your main task) and mentoring Joni on her first backend endpoint. Plus ongoing PR reviews.

Deploy after EVERY task. Update Clodi after EVERY task.

---

## S21 — Timer State Persistence (Server Restart Recovery)

**Priority:** High
**Branch:** `feat/timer-persistence`
**Deadline:** April 9

If the server restarts mid-round, the turn timer is lost and the round hangs forever. Players have to manually leave and recreate the table. This is a beta blocker.

### Context

Currently, turn timers are in-memory. When the Node process restarts (deploy, crash, OOM), the timer callback is gone. The game state in Redis still shows "it's Player 3's turn" but nothing will ever advance the turn.

### Requirements

1. **Persist timer state to Redis:**
   - When a turn timer starts, write to Redis:
     ```
     Key: timer:{tableId}
     Value: { playerId, startedAt, durationMs, phase }
     TTL: durationMs + 5000 (buffer)
     ```
   - When the timer fires (player times out) or is cancelled (player acts), delete the key.

2. **Recovery on server startup:**
   - On server init (after Redis connection), scan for `timer:*` keys
   - For each active timer:
     - Calculate remaining time: `durationMs - (now - startedAt)`
     - If time remaining > 0: restart the timer with remaining duration
     - If time expired: immediately execute the timeout action (auto-fold or advance)
   - Log each recovered timer: `"Timer recovered: table {tableId}, player {playerId}, {remaining}ms remaining"`

3. **Handle edge cases:**
   - Server was down for longer than the timer duration → auto-fold immediately
   - Multiple tables have active timers → recover all of them
   - Timer key exists but table/game state is gone (stale) → delete the timer key, log warning

4. **Where to implement:**
   - Timer start/cancel: `apps/server/src/modules/game/game.service.ts` (wherever `setTimeout` is called for turn timers)
   - Recovery: new function in `game.service.ts` or a separate `timer-recovery.ts` module, called from `app.ts` on startup
   - Redis operations: use existing `stateGet`/`stateSet` from `game-state-store.ts`

5. **Tests:**
   - Timer state is written to Redis when turn starts
   - Timer state is deleted when player acts
   - Recovery: creates new timer with correct remaining duration
   - Recovery: expired timer triggers auto-fold
   - Recovery: stale timer (no game state) is cleaned up

### Out of Scope
- Don't change the timer duration values
- Don't add WebSocket recovery (reconnect already works from PR #10)
- Don't persist betting round state — just the timer

### Deliverables

- [ ] Timer state persisted to Redis on start/cancel
- [ ] Server startup recovers active timers
- [ ] Expired timers auto-fold on recovery
- [ ] Stale timers cleaned up
- [ ] 5+ tests covering all cases
- [ ] No console.log — use the existing logger
- [ ] PR opened, deployed, tested

### CONTRACT (for Joni)
No frontend changes needed. The timer recovery is invisible to the client — the server picks up where it left off and the existing socket events (`turn:start`, `turn:timeout`) fire normally.

---

## S22 — Mentor Joni on Table Stats Endpoint

**Priority:** Medium
**Deadline:** April 12 (when Joni starts J42)

Joni's first backend task. She's building `GET /api/tables/:tableId/stats`. Your job: answer her questions (through Orel), review her PR, and make sure she follows existing patterns.

### Requirements

1. **Before she starts:** Give Joni (through Orel) a quick orientation:
   - Where routes live and how they're registered
   - How to access game state (Redis keys or in-memory maps)
   - How to get the round count and player chip balances
   - The existing test pattern (Vitest + supertest or whatever you use)

2. **During implementation:** Be available for questions. Joni relays through Orel, you respond.

3. **PR review:** When she opens the PR:
   - Is the route following existing patterns?
   - Are the Redis/state lookups correct?
   - Are the tests meaningful (not just snapshot tests)?
   - Teaching comments where valuable — this is a growth moment

### Deliverables

- [ ] Orientation notes shared (file paths + patterns)
- [ ] Available for questions during J42
- [ ] PR reviewed with teaching comments
- [ ] Endpoint works correctly

---

## S23 — Review All Sprint 7 PRs (Ongoing)

**Priority:** High
**Ongoing throughout sprint**

### Requirements

Review every PR as it opens. Sprint 7 PRs to expect:

| PR | Author | What |
|----|--------|------|
| Mark M14 | Mark | E2E test fixes |
| Joni J37 | Joni | BUG-MP-01 host-only buttons |
| Joni J38 | Joni | Fixture-card visual link |
| Joni J40 | Joni | Match ticket cards |
| Joni J41 | Joni | Sound effects |
| Joni J42 | Joni | Table stats endpoint (backend) |
| Devsi D10 | Devsi | Prettier pre-commit hook |
| Devsi D11 | Devsi | Deploy health check |

**Review standards:**
- Quick turnaround (within hours, not days)
- For Joni's frontend PRs: layer model compliance, no z-index hacks, mobile-first
- For Joni's backend PR (J42): teaching review — explain WHY, not just WHAT
- For Mark's E2E PR: verify test logic is sound, selectors are correct
- For Devsi's PRs: check scripts work, no hardcoded secrets
- Contract check on any PR touching socket events or shared types
- Approve unless there's a real bug — don't block on style preferences

### Deliverables

- [ ] Every PR reviewed within hours
- [ ] Teaching comments on J42
- [ ] No blocking on style preferences

---

## Delivery Log

| Task | Status | PR | Deployed |
|------|--------|-----|----------|
| S21  | ✅ done | feat/timer-persistence | pending |
| S22  | ⬜     |     |          |
| S23  | ongoing |     |          |

### S21 — Timer State Persistence

**Branch:** `feat/timer-persistence`
**Files changed:**
- `apps/server/src/lib/game-state-store.ts` — added `stateKeys(prefix)` + optional `ttlSeconds` param to `stateSet`
- `apps/server/src/modules/game/betting.service.ts` — `TimerState` interface, `TIMER_PREFIX`, persist timer to Redis on start, delete on cancel/cleanup, `startBetTimerWithDuration` for recovery
- `apps/server/src/modules/game/timer-recovery.ts` — NEW: `recoverTimers(io)` — scans Redis for active timers, validates state, restarts or auto-folds
- `apps/server/src/modules/game/game.service.ts` — passes `tableId` to `startBetTimer`/`cancelBetTimer`
- `apps/server/src/app.ts` — calls `recoverTimers(io)` on server startup
- `apps/server/src/__tests__/timer-recovery.test.ts` — NEW: 8 tests (empty state, recover with time remaining, expired auto-fold, expired auto-check, stale no-betting, stale wrong-phase, player mismatch, multi-table)

**Tests:** 51 passing (43 existing + 8 new), all 3 workspaces typecheck clean.

**CONTRACT: no client changes** — timer recovery is server-side only. Existing socket events (`bet:prompt`, `bet:update`) fire normally after recovery. Joni: no frontend work needed.
