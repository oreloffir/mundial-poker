# QA Workflow — Mundial Poker

**Owner:** Mark (QA Lead)
**Last updated:** April 4, 2026

This document covers how to run QA against both the local dev environment
and the deployed EC2 dev server.

---

## Environments

| Environment | URL | When to use |
|-------------|-----|-------------|
| Local | `http://localhost:5173` | Daily development, pre-commit checks |
| Dev server | `http://<ec2-ip>` (from Devsi) | Post-deploy verification, integration QA |
| Production | TBD | Release verification only |

---

## Before QA

### Local

```bash
# Terminal 1 — server
pnpm dev:server

# Terminal 2 — frontend
pnpm dev:web

# Confirm both are up
curl http://localhost:5174/api/health
curl http://localhost:5173
```

### Dev server (EC2)

```bash
# Confirm the deployed server is alive
curl http://<ec2-ip>/api/health
# Expected: {"success":true,"data":{"status":"ok","timestamp":"..."}}

# Check browser console is clean (no CORS/mixed-content errors)
# Open http://<ec2-ip> in Chrome → DevTools → Console → no red errors
```

---

## Running the E2E Suite

### Against localhost (default)

```bash
cd apps/web
pnpm test:e2e
```

### Against deployed dev server

```bash
cd apps/web
DEV_URL=http://<ec2-ip> pnpm test:e2e
```

The `DEV_URL` env var overrides `baseURL` in `playwright.config.ts`.
When set, all tests target the deployed server — no other changes needed.

### Running a specific spec

```bash
pnpm test:e2e --grep "Flow Audit v2"
pnpm test:e2e --grep "Showdown"
pnpm test:e2e --grep "Betting"
```

### With retries (flake isolation)

```bash
pnpm test:e2e --retries 1
```

---

## First Deploy Smoke Test (8-Point Checklist)

Run this immediately after Devsi confirms a new deploy is live.
Each check must pass before moving to the next.

| # | Check | Command / Steps | Pass condition |
|---|-------|-----------------|----------------|
| 1 | Site loads | `curl http://<ec2-ip>` | Returns HTML (200) |
| 2 | Health endpoint | `curl http://<ec2-ip>/api/health` | `{"success":true}` |
| 3 | Guest login | Open site → navigate to /lobby | Guest session created, lobby renders |
| 4 | WebSocket connects | Create table → check browser Network tab | WS connection established, no 101 error |
| 5 | Database has teams | Create table → add bot | Bot joins (means DB has team data) |
| 6 | Redis connected | Start game → make a bet | Betting state persists between actions |
| 7 | Full round works | Play complete round: bet → showdown → winner | Winner banner appears, chips updated |
| 8 | No CORS errors | Browser DevTools Console after full round | Zero red errors |

**Bonus (if time allows):**

| # | Check | Steps | Pass condition |
|---|-------|-------|----------------|
| 9 | State survives restart | Mid-round, ask Devsi to restart container | Reconnect → game resumes where it left off |

Run the smoke test manually first, then run the automated flow audit:

```bash
DEV_URL=http://<ec2-ip> pnpm test:e2e --grep "Flow Audit v2"
```

Save screenshots with `dev-` prefix (the spec uses `v2-` by default — update the spec's prefix for dev runs or pass it via env).

---

## DB Cleanup

**WARNING: Only run cleanup on dev. Never on production.**

### After a QA session (full reset)

```bash
# Ask Soni/Devsi to run on the server:
pnpm db:reset
# This drops all tables, re-migrates, re-seeds team data.
# Lobby should show 0 tables after.
```

### During E2E tests (lightweight cleanup)

The test suite uses `DELETE /api/test/cleanup` in `afterAll` hooks to remove
`__test_*` prefixed tables created during the run. This is lighter than a full
reset and runs automatically.

```bash
# Verify cleanup endpoint is registered (dev only — returns 404 on prod)
curl -X DELETE http://<ec2-ip>/api/test/cleanup
# Expected: {"success":true}
```

### Verify cleanup worked

After reset or cleanup, open the lobby — it should show "No tables available".
If stale tables appear, the cleanup did not complete. Run `pnpm db:reset` again.

---

## E2E Test Anatomy

Tests are in `apps/web/e2e/`. Key files:

| File | Coverage |
|------|---------|
| `flow-audit.spec.ts` | Full UX walkthrough A–K, desktop + mobile |
| `showdown.spec.ts` | SD1–SD14 showdown phase (phases 1–5) |
| `betting.spec.ts` | All betting controls, chip denominations, timer |
| `game-round.spec.ts` | Round lifecycle, blind rotation, chip counts |
| `table-setup.spec.ts` | Table creation, bot joining, start game |

Helpers in `e2e/helpers/`:

| Helper | Purpose |
|--------|---------|
| `auth.helper.ts` | `guestLogin(page)` |
| `table.helper.ts` | `setupGame(page, { botCount })` |
| `game.helper.ts` | `playAllBettingPhases`, `waitForWinnerBanner`, `getAllSeatBalances`, `getRoundNumber` |

---

## Known Timing Constraints

- Fixture reveals: ~5s per fixture × 5 = ~25s after round 3 ends
- Player score reveals: ~1-2s per seat × 5 = ~10s
- Winner banner: ~10s minimum (3s post-reveal + 7s before next round:start)
- Full round: ~60-90s from dealing to next round start
- Tests use `domcontentloaded` + explicit waits, never `networkidle`

---

## Screenshots

Flow audit screenshots: `assets/screenshots/`

| Prefix | When |
|--------|------|
| `v2-desktop-*` | Latest localhost desktop pass |
| `v2-mobile-*` | Latest localhost mobile pass |
| `dev-desktop-*` | Post-deploy desktop pass |
| `dev-mobile-*` | Post-deploy mobile pass |
| `sprint4-*` | Visual regression (M9) |

---

## Contacts

| Role | Name | Slack |
|------|------|-------|
| Backend / Server | Soni | #dev |
| Frontend | Joni | #dev |
| DevOps / EC2 | Devsi | #infra |
| PM | Clodi | #product |
