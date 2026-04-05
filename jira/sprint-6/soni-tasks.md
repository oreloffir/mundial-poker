# Soni — Sprint 6 Tasks

**Sprint:** April 5–12, 2026
**Role:** Senior Developer — Backend
**Total tasks:** 3

Deploy after EVERY task. Update Clodi after EVERY task.

---

## S18 — Merge All Pending PRs to Main

**Priority:** Critical (day 1)
**Deadline:** April 5

### Requirements

1. Merge PR #10 (fix/auto-join-on-socket) to main — the multiplayer join fix
2. Merge PR #6 (ci/activate-ec2-deploy) to main — CD pipeline
3. Cherry-pick or merge Doni's spec commit (`docs/design/game-ux-complete.md`) to main
4. Clean up ALL stale branches (local + remote):
   ```
   git branch -d feat/dockerize feat/dead-code-cleanup docs/architecture
   git branch -d feat/extract-utils fix/type-casts fix/mobile-polish
   git branch -d feat/winner-prize-animation feat/pot-pill-display
   git push origin --delete <each-remote-branch>
   ```
5. Verify main is clean: `pnpm typecheck && pnpm test`
6. Push to main → auto-deploy to EC2
7. Verify: `curl http://52.49.249.190/api/health`

### Deliverables

- [ ] All PRs merged, stale branches deleted
- [ ] Main is clean and deployed
- [ ] Health check passes on EC2

---

## S19 — CORS + Socket Hardening for Production

**Priority:** High
**Branch:** `fix/production-socket`
**Deadline:** April 7

### Requirements

1. **CORS configuration** — make it production-ready:
   - Read allowed origins from `CORS_ORIGINS` env var
   - Support comma-separated list: `CORS_ORIGINS=http://52.49.249.190,https://dev.mundialpoker.com`
   - Fallback to `*` only in development
   - Apply same origins to both Express CORS and Socket.io CORS

2. **Socket reconnection** — verify the auto-join fix (PR #10) handles:
   - Player refreshes mid-game → auto-reseats
   - Player's socket disconnects and reconnects → auto-reseats
   - Two players join simultaneously → no race condition on seat assignment
   - Table is full (5/5) → new joiner gets a clean "table full" error, not a crash

3. **Add socket event logging** (production-safe, not console.log):
   - Log: player joined/left/disconnected with userId + tableId
   - Log: game started with player count
   - Log: round completed with winner
   - Use a simple logger function that's easy to pipe to Sentry later

### Deliverables

- [ ] CORS reads from env var with production-safe defaults
- [ ] Auto-join handles all edge cases
- [ ] Socket event logging for production monitoring
- [ ] All tests pass

---

## S20 — Review Joni's PRs (Ongoing)

**Priority:** High
**Ongoing throughout sprint**

### Requirements

Joni has 7 tasks this sprint. Review each PR as she opens it:

- Quick turnaround (within hours, not days)
- Focus on: does it follow the layer model? Any z-index hacks? Mobile-first?
- Contract review: socket event types still match?
- Approve unless there's a real bug
- Teaching comments where valuable (continue S11 pattern)

### Deliverables

- [ ] Every Joni PR reviewed within hours
- [ ] No blocking on style preferences

---

## Delivery Log

| Task | Status  | Deployed |
| ---- | ------- | -------- |
| S18  | ⬜      |          |
| S19  | ⬜      |          |
| S20  | ongoing |          |
