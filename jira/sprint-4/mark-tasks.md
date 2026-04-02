# Mark — Sprint 4 Tasks

**Sprint:** April 4–11, 2026
**Role:** QA & Marketing
**Total tasks:** 2

Read the [Sprint Brief](./SPRINT-BRIEF.md) first.

---

## M8 — Dev Environment QA Plan + DB Cleanup Strategy

**Priority:** High (blocked on Devsi's D4 first deploy)
**Deadline:** April 9

### Context

The game is moving from localhost to a real EC2 server. QA needs to work against the deployed URL, not just local dev servers. Also need a strategy for cleaning test data so QA sessions don't pollute the database.

### Requirements

**QA against deployed URL:**

1. **Configure Playwright for remote URL:**
   - Add `DEV_URL` environment variable support to `playwright.config.ts`
   - When `DEV_URL` is set, tests run against that URL instead of localhost
   - Example: `DEV_URL=http://54.123.45.67 pnpm test:e2e`

2. **First deploy smoke test** — when Devsi/Soni confirm the first deploy, run this checklist:

   | # | Check | How |
   |---|-------|-----|
   | 1 | Site loads at EC2 IP | `curl http://<ip>` returns HTML |
   | 2 | Guest login works | Create guest session via UI |
   | 3 | WebSocket connects | Create table → should see real-time updates |
   | 4 | Database has teams | Lobby shows tables can be created |
   | 5 | Redis connected | Play a round → server doesn't crash on betting state |
   | 6 | Full round works | Create table → add bots → start → bet → showdown → winner |
   | 7 | State survives restart | Mid-round, ask Devsi to restart server container → reconnect → game resumes |
   | 8 | No CORS errors | Browser console clean of CORS/mixed-content errors |

3. **Run the flow audit against deployed URL:**
   - Same checklist as flow-audit-v2 but against `http://<ec2-ip>`
   - Save screenshots to `assets/screenshots/dev-*` prefix
   - Report any differences from localhost behavior

**DB Cleanup Strategy:**

4. **After each QA session**, clean test data:
   - Soni is building `pnpm db:reset` (S14) — drops tables, re-migrates, re-seeds
   - Mark runs this after completing a QA pass
   - IMPORTANT: only run on dev, NEVER on production

5. **Test seed cleanup:**
   - Soni's `DELETE /api/test/cleanup` removes `__test_*` tables
   - Use this for E2E test cleanup in `afterAll` hooks
   - Verify it works against the deployed URL

6. **Document the QA workflow** at `docs/qa-workflow.md`:
   ```
   Before QA:
   1. Verify dev URL is accessible
   2. Check server health: GET /api/health

   During QA:
   1. Run smoke test checklist
   2. Run E2E suite: DEV_URL=http://<ip> pnpm test:e2e
   3. Manual flow testing with screenshots

   After QA:
   1. Run cleanup: DEV_URL=http://<ip> pnpm test:e2e:cleanup
      OR ask Soni/Devsi to run: pnpm db:reset on server
   2. Verify cleanup: lobby should show 0 tables
   ```

### Deliverables

- [ ] Playwright config supports `DEV_URL` env var
- [ ] First deploy smoke test checklist complete (8 checks)
- [ ] Flow audit run against deployed URL
- [ ] DB cleanup workflow documented
- [ ] `docs/qa-workflow.md` created

**Estimated effort:** 1-2 days

---

## M9 — Visual Regression Check (Chip Colors + Pot Pill + Winner Animation)

**Priority:** Medium (after Joni ships J16-J18)
**Deadline:** April 10

### Requirements

After Joni ships the frontend polish (J16 custom chips, J17 pot pill, J18 winner animation):

1. **Chip denomination test:**
   - Screenshot the betting controls with all 6 chips visible
   - Verify each denomination has a distinct color
   - Verify colors are visible at mobile size (28px)
   - Verify MP monogram has correct contrast per color

2. **Pot pill test:**
   - Screenshot the pot at 0, at 15 (blinds), at 150+ (after raises)
   - Verify chip stack icons visible in the pill
   - Verify pulse animation on pot change
   - Verify count-up animation works

3. **Winner animation test:**
   - Record or screenshot-sequence the winner moment
   - Verify chips fly from pot center to winner seat
   - Verify pot fades out during flight
   - Verify winner seat flashes on arrival
   - Verify "+{amount}" text appears and fades

4. Save screenshots to `assets/screenshots/sprint4-*`:
   - `sprint4-chips-desktop.png`
   - `sprint4-chips-mobile.png`
   - `sprint4-pot-empty.png`
   - `sprint4-pot-full.png`
   - `sprint4-winner-animation-1.png` (chips flying)
   - `sprint4-winner-animation-2.png` (arrival)

### Deliverables

- [ ] Chip colors verified (6 distinct, readable at mobile size)
- [ ] Pot pill verified (3 states: empty, blinds, full)
- [ ] Winner animation verified (flight + arrival)
- [ ] Screenshots saved to assets/screenshots/

**Estimated effort:** Half day

---

## Delivery Log

### M8 — Dev Environment QA
**Status:** Not started (blocked on first deploy)

### M9 — Visual Regression
**Status:** Not started (blocked on J16-J18)
