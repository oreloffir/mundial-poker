# Mark — Sprint 2 QA Plan

**Sprint:** April 2–9, 2026
**Role:** QA & Marketing
**Context:** Read the [Sprint Brief](./SPRINT-BRIEF.md) for full sprint scope.

---

Hey Mark, Clodi here. Sprint 2 is about the showdown experience — the most important moment in the game. Your QA this sprint covers three areas:

1. **Sprint 1 carry-over fixes** (S5 timeout, J10 BB field)
2. **E2E suite formalization** (get your Playwright scripts into the repo)
3. **Showdown flow testing** (the big new feature once S6 + J12 land)

---

## M1 — Sprint 1 Carry-Over Testing (ready ~April 3)

### S5 — Timeout Fix

**What changed:** Auto-timeout now fires at ~30s instead of 40-45s.

**How to test:**
1. Create a table, add bots, start game
2. When it's your turn — do nothing for exactly 30 seconds
3. **Check:** Auto-action fires at ~30s (acceptable range: 28-33s)
4. **Check:** Timer UI and server action appear in sync
5. Play 3+ rounds with normal-speed actions — no false triggers

**Pass criteria:**
- [ ] Auto-timeout at 28-33s (not 40-45s)
- [ ] No false timeout during normal play
- [ ] Timer UI and server action in sync

---

### J10 — BB Field Read-Only

**What changed:** Big Blind field is now read-only, always auto-calculated as 2x SB.

**How to test:**
1. Open Create Table modal
2. **Check:** Can you type in the BB field? (Should NOT be possible)
3. Change SB to 25 → **Check:** BB shows 50
4. Change SB to 100 → **Check:** BB shows 200
5. **Check:** Helper text "Always 2× the small blind" visible below BB
6. **Check:** BB field looks visually dimmer than SB (read-only styling)
7. Set SB to 0 → **Check:** Error still shown, Create button disabled

**Pass criteria:**
- [ ] BB not editable
- [ ] BB always equals 2x SB
- [ ] Helper text present
- [ ] Visual distinction between SB and BB fields
- [ ] SB=0 validation still works

---

### J11 — TestIDs + TypeScript

**How to test:**
1. `page.locator('[data-testid="pot-total"]')` → **Check:** resolves with numeric pot value
2. `pnpm typecheck` → **Check:** exits with 0 errors

**Pass criteria:**
- [ ] pot-total testid accessible
- [ ] typecheck clean

---

## M2 — E2E Suite Formalization (ongoing)

Your Sprint 1 Playwright scripts need to move into the repo. Joni built infrastructure in Sprint 1 (M1 task) at `apps/web/e2e/`. Collaborate with Joni to ensure:

1. Your existing 8 test flows are properly represented in the spec files
2. Any timing workarounds or selector tricks from your scripts are documented
3. The helpers (`auth.helper.ts`, `table.helper.ts`, `game.helper.ts`) cover your common setup patterns

**Deliverable:** Confirm all your Sprint 1 test flows are covered by the formal suite. File any gaps as new test requests.

---

## M3 — Showdown Flow Testing (ready ~April 7-8)

This is the big one. The entire post-betting flow has been restructured.

### What changed (S6 + J12)

**Old flow:** Betting ends → 30s blank wait → all scores dump at once → banner → next round

**New flow:**
1. Betting ends → "Matches in Progress" → fixtures reveal ONE AT A TIME every ~5s
2. All matches done → "Calculating scores..." (2s pause)
3. Player cards reveal ONE AT A TIME, lowest score first (2.5s apart)
4. Each reveal shows full score breakdown (team → match result → bonuses → total)
5. Winner announced last with correct pot share
6. Clean transition to next round

### How to test

**Phase 1 — Progressive Fixture Reveals:**
1. Start a game, play through betting
2. When "Matches in Progress" shows, watch the fixture board
3. **Check:** Do fixtures update ONE AT A TIME (not all at once)?
4. **Check:** Roughly ~5s between each fixture reveal?
5. **Check:** Each fixture card shows the match score after it reveals?
6. **Check:** If your team (cards you hold) is in a fixture, is it highlighted differently?
7. **Check:** Progress indicator visible ("2 of 5 matches complete" or similar)?

**Phase 2 — Calculating Scores:**
8. After all 5 fixtures revealed, **Check:** Is there a brief "Calculating scores" state?
9. **Check:** Does it last roughly ~2 seconds before player reveals start?

**Phase 3 — Player Score Reveals:**
10. **Check:** Do players reveal ONE AT A TIME (not all at once)?
11. **Check:** Are they ordered LOWEST score first (winner revealed last)?
12. **Check:** Roughly ~2.5s between each player reveal?
13. **Check:** For each player, can you see their team cards (face up)?
14. **Check:** Is there a score breakdown per card showing:
    - Team name + flag
    - Match result (e.g., "3-0")
    - Base points (Win/Draw/Loss)
    - Bonuses (High Scorer, Clean Sheet, Penalty)
    - Card total
15. **Check:** Does the total score animate (count up from 0)?
16. **Check:** Folded players are skipped (not revealed)?

**Phase 4 — Winner Announcement:**
17. **Check:** Winner is the LAST player revealed?
18. **Check:** Winner banner shows correct chip amount from pot distribution?
19. **Check:** If there's a tie (split pot), are BOTH winners shown with equal shares?
20. **Check:** Winner's seat has special visual treatment (glow, highlight)?

**Phase 5 — Next Round Transition:**
21. **Check:** Showdown state clears cleanly before next round?
22. **Check:** No stale fixture cards or score displays carry over?
23. **Check:** SB/BB badges shift to new positions?
24. **Check:** Round counter increments?

**Edge cases:**
25. **Everyone folds except one player:** No showdown — pot awarded immediately, no fixture reveals needed
26. **Only 2 players in showdown:** Reveal sequence with just 2 players, should still work
27. **Play 5 consecutive rounds:** Full flow stable across multiple rounds, no memory leaks or accumulating stale state

### Pass criteria

- [ ] Fixtures reveal progressively (not batch)
- [ ] Players reveal sequentially, lowest first
- [ ] Score breakdown visible and readable per card
- [ ] Winner announced last with correct pot share
- [ ] Split pot handled correctly
- [ ] Folded players skipped
- [ ] No stale data between rounds
- [ ] Works on desktop
- [ ] Works on mobile landscape (667x375)
- [ ] Stable across 5+ consecutive rounds

### Timing reference

Full showdown timeline should be roughly:
- 0s: Betting ends, "Matches in Progress"
- 0-30s: Fixture reveals (~5s apart, 5 fixtures)
- 30s: "Calculating scores..." (2s)
- 32s: First player reveal
- 32-42s: Player reveals (2.5s apart, ~4 non-folded players)
- 44s: Winner announcement
- 47-50s: Transition to next round

Total: ~50-55 seconds from betting end to next round start.

---

## M4 — Combined Sprint 2 Verification (April 9)

Run after ALL tasks merged:

| # | Check | Result |
|---|-------|--------|
| 1 | Timeout fires at 28-33s | |
| 2 | BB field read-only, always 2x SB | |
| 3 | pot-total testid accessible | |
| 4 | pnpm typecheck exits 0 | |
| 5 | Fixtures reveal one at a time (~5s apart) | |
| 6 | "Calculating scores" transition visible | |
| 7 | Players reveal one at a time, lowest first | |
| 8 | Score breakdown visible per card (base + bonuses) | |
| 9 | Winner announced last with correct pot share | |
| 10 | Clean transition to next round | |
| 11 | Stable across 5+ rounds | |
| 12 | Mobile landscape: full flow works | |

---

## Delivery Log

_Last updated: April 2, 2026 — Mark_

---

### M1 — Sprint 1 Carry-Overs
**Status:** ⚠️ 1 FAIL (S5), 2 PASS (J10, J11) — S5 awaiting Soni resolution

| Item | Result | Notes |
|------|--------|-------|
| S5 — Timeout at 30s | ❌ FAIL | Server fires at 30s (confirmed via bet-timer testid reaching 0). UI controls disappear at ~39.4s due to ~9s bot round-trip (server auto-act → bot processing → socket emit → React re-render). Outside 28-33s window. No false trigger on normal fast play ✅. Game continues after auto-act ✅. |
| J10 — BB field read-only | ✅ PASS (with note) | BB `readonly` attr confirmed. SB=25→BB=50 ✅, SB=100→BB=200 ✅. Manual edit blocked (React reverts immediately) ✅. Helper text "Always 2× the small blind" visible ✅. SB=0 blocks Create ✅. **NOTE:** No visual dimming on BB field — looks same as SB field. Filed as UX note for Joni. |
| J11 — pot-total testid + typecheck | ✅ PASS | `[data-testid="pot-total"]` resolves with numeric value (35, updates to 50 after Call) ✅. `pnpm typecheck` exits 0 ✅. |

**S5 Root Cause Detail:**
The server `BET_TIMEOUT_MS = 30_000` fires correctly. The gap is the sequential bot round-trip after the auto-act event: server auto-folds human → server processes each bot action in sequence → final socket emit → React re-render. With 4 bots, ~9s of processing before UI updates. Three resolution paths pending Soni/Clodi decision:
1. Reduce bot action processing latency
2. Redefine acceptance criterion to "server event fires at 30s" (not UI disappearance)
3. Add `data-testid="auto-acted"` DOM signal at server event time for accurate measurement

---

### M2 — E2E Suite Formalization
**Status:** ✅ Complete (built during Sprint 1 as M1)

All 8 original test flows are in the repo at `apps/web/e2e/`. Coverage confirmed:

| Original flow | Spec file | Status |
|---------------|-----------|--------|
| Landing page loads | `landing.spec.ts` | ✅ 5 tests |
| Guest login → lobby | `auth.spec.ts` | ✅ 3 tests |
| Create table + add bots | `table-setup.spec.ts` | ✅ 9 tests |
| Full game round (deal → bet → showdown) | `game-round.spec.ts` | ✅ 13 tests |
| Raise bet flow | `betting.spec.ts` | ✅ included |
| Fold flow | `betting.spec.ts` | ✅ included |
| Lobby table states | `lobby.spec.ts` | ✅ 4 tests |
| 2-player game (heads-up) | `heads-up.spec.ts` | ✅ 3 tests |
| Mobile landscape layout | `mobile.spec.ts` | ✅ 5 tests (Sprint 1 addition) |

Helpers: `auth.helper.ts`, `table.helper.ts`, `game.helper.ts` — cover all common setup patterns.

8 new testid requests filed in `apps/web/e2e/TESTID-REQUESTS.md` for Joni.

---

### M3 — Showdown Flow Testing
**Status:** ⏳ Blocked on S6 (Soni) + J12 (Joni) — expected ~April 7-8

27 checks across 5 phases planned:

| Phase | Checks | Key assertions |
|-------|--------|----------------|
| 1 — Progressive fixture reveals | 7 | One at a time, ~5s apart, score after each, player's teams highlighted, progress indicator |
| 2 — Calculating scores | 2 | State visible, lasts ~2s |
| 3 — Player score reveals | 7 | One at a time, lowest first, ~2.5s apart, face-up cards, breakdown (base + bonuses), count-up animation, folded players skipped |
| 4 — Winner announcement | 4 | Winner last, correct pot share, split pot handled, gold glow/highlight |
| 5 — Next round transition | 4 | Clean clear, no stale fixtures, SB/BB shift, round counter increments |
| Edge cases | 3 | Everyone folds (no showdown), 2-player showdown, 5 consecutive rounds stable |

Will also test full flow on mobile landscape (667×375).

Timing reference to verify against:
- 0s: "Matches in Progress"
- 0-30s: fixture reveals
- 30-32s: "Calculating scores"
- 32-42s: player reveals
- ~44s: winner
- ~50s: next round

---

### M4 — Combined Sprint 2 Verification
**Status:** ⏳ Blocked on all tasks — April 9

12-point checklist ready (in the M4 table above).

---

— **Clodi**, PM @ Mundial Poker

---

## E2E Full Suite Run — April 2, 2026

**Run:** `pnpm test:e2e` — headless Chromium — sequential (1 worker)
**Duration:** 51.6 minutes
**Result:** 🔴 18 passed / 27 failed / 4 skipped

---

### Results by Spec

| Spec | Pass | Fail | Skip | Notes |
|------|------|------|------|-------|
| `auth.spec.ts` | 3 | 0 | 0 | ✅ All green |
| `landing.spec.ts` | 5 | 0 | 0 | ✅ All green |
| `lobby.spec.ts` | 3 | 1 | 0 | ❌ Table creation redirect broken |
| `table-setup.spec.ts` | 5 | 4 | 0 | ❌ Player count + game start broken; blind config all green |
| `betting.spec.ts` | 3 | 4 | 0 | ❌ Chip buttons blocked by timer overlay; UI presence checks pass |
| `game-round.spec.ts` | 0 | 13 | 0 | ❌ All timeout — cascade from betting bug |
| `heads-up.spec.ts` | 0 | 3 | 0 | ❌ All timeout — cascade from betting bug |
| `mobile.spec.ts` | 0 | 1 | 4 | ❌ iPhone SE overflow; 4 tests pre-skipped |

---

### Bugs Found This Run

#### BUG-S2-01 — `bet-timer` div intercepts pointer events on chip buttons
**Severity:** HIGH
**Spec:** `betting.spec.ts:65` (raise), `betting.spec.ts:98, 113` (fold x2), cascades to all `game-round` + `heads-up`
**Description:** The `bet-timer` `<div data-testid="bet-timer">` sits in the same layout layer as the chip denomination buttons and intercepts all pointer events. Playwright logs this explicitly on every click attempt:
```
<div data-testid="bet-timer" ...> subtree intercepts pointer events
```
Every test that tries to click a chip button (raise flow, fold flow, any game-round action) retries for the full 2-minute timeout then dies.

**Steps to reproduce:**
1. Create table, add 4 bots, start game
2. Wait for player turn
3. Click any chip denomination button (e.g. chip-denomination-100)
4. Observe: click never registers — timer overlay blocks it permanently

**Expected:** Click lands on chip button
**Actual:** `bet-timer` div intercepts, click retried until 120s timeout

**Root cause hypothesis:** Timer SVG/circle element or the timer row `<div>` has a higher z-index or larger bounding box than intended, covering the chip buttons below it in the betting controls layout.

**Assign to:** Joni (betting controls UI layout)
**Status:** 🔴 Open

---

#### BUG-S2-02 — Chip denomination buttons not found by text content
**Severity:** MEDIUM
**Spec:** `betting.spec.ts:28`
**Description:** Test scans all buttons for text matching `['5', '10', '25', '50', '100', '200']` and expects at least 1 match. Gets 0. The `chip-denomination-{v}` testids exist (confirmed in Sprint 1 testid list), but buttons may be rendering icons/images without visible text, or are only rendered conditionally after a raise mode is explicitly opened.

**Steps to reproduce:**
1. Start game, reach player turn (betting controls visible)
2. Scan all `<button>` text content on page
3. Check for denomination values

**Expected:** At least one of 5, 10, 25, 50, 100, 200 found in button text
**Actual:** 0 found

**Note:** May be tied to BUG-S2-01 — if the controls are in a partially-rendered state due to the timer overlay issue, denomination buttons may not fully initialize.

**Assign to:** Joni
**Status:** 🔴 Open

---

#### BUG-S2-03 — Table creation does not navigate to `/table/<UUID>`
**Severity:** HIGH
**Spec:** `table-setup.spec.ts:41` (creates table → game URL), `table-setup.spec.ts:102` (custom blind SB=25 → game URL), `lobby.spec.ts:35` (newly created table appears in lobby)
**Description:** After clicking Create in the table modal, the app stays on `/lobby` instead of redirecting to `/table/<uuid>`. Three tests that depend on a successful table creation + redirect all fail.

**Actual URL after Create:** `http://localhost:5173/lobby`
**Expected URL pattern:** `/table/[a-f0-9-]{36}`

**Steps to reproduce:**
1. Open Create Table modal
2. Fill in table name (or leave default)
3. Click Create
4. Observe: URL stays `/lobby`

**Note:** `adds 4 bots one by one` (table-setup:42) PASSES — which means the modal and bot-add flow work. The failure is specifically the post-creation redirect. This may be a routing change, an API response change (table ID not returned / different field name), or a race condition between table creation response and navigation.

**Assign to:** Joni (routing) or Soni (API response shape) — needs joint investigation
**Status:** 🔴 Open

---

#### BUG-S2-04 — Player count display and Start Game button state incorrect after adding bots
**Severity:** MEDIUM
**Spec:** `table-setup.spec.ts:28` (5/5 player count), `table-setup.spec.ts:34` (Start Game enabled)
**Description:** After adding 4 bots (which itself passes — bots add without error), the test can't confirm player count shows "5/5" and Start Game button is not appearing as enabled. Selector or display format may have changed.

**Assign to:** Joni
**Status:** 🔴 Open

---

#### BUG-S2-05 — Mobile iPhone SE landscape: horizontal overflow detected
**Severity:** LOW
**Spec:** `mobile.spec.ts:17`
**Description:** iPhone SE landscape (667×375) layout check fails. Horizontal overflow present — content spills outside viewport width.

**Assign to:** Joni / Doni (visual)
**Status:** 🔴 Open

---

### Pre-existing: 4 Skipped Mobile Tests
`mobile.spec.ts` tests 37–40 remain skipped (`test.skip`) — iPhone 12, portrait rotate hint, desktop 1440, betting bar reachable on mobile. Pre-existing from M2 — not new failures.

---

### Root Cause Summary

Two bugs are driving the majority of failures:

1. **BUG-S2-03** (table redirect broken) — blocks any test that needs to get inside a game
2. **BUG-S2-01** (bet-timer intercepts chips) — blocks any test that needs to perform a betting action

Fix these two and the cascade of 13 `game-round` + 3 `heads-up` failures likely clears. Estimate: fixing S2-01 + S2-03 recovers ~16 of the 27 failures.

---

### Sprint 2 QA Status Update

| Milestone | Status |
|-----------|--------|
| M1 — S5 timeout | ✅ DECISION MADE — test server-side accuracy only. Assert auto-action fires within 28-33s of server `promptedAt`. Client drift acceptable. UI showing 39s is a separate frontend display bug (filed for Joni by Clodi). |
| M1 — J10 BB read-only | ✅ PASS |
| M1 — J11 pot-total + typecheck | ✅ PASS |
| M2 — E2E suite formalization | ✅ Complete |
| M3 — Showdown flow testing | ⏳ Blocked on S6 + J12 |
| M4 — Combined verification | ⏳ Blocked |
| Suite health (April 2) | 🔴 18/49 passing — BUG-S2-01 and BUG-S2-03 blocking game flow tests |

---

### Clodi Decisions — April 2, 2026

| Topic | Decision |
|-------|----------|
| BUG-S2-01 bet-timer intercept | Joni fixes the layout bug. Mark does NOT work around it in tests. |
| S5 timeout acceptance criterion | Test server-side only: assert auto-action fires within 28-33s of server `promptedAt`. Client drift acceptable. UI 39s display is a separate Joni bug. |
| 4 skipped mobile tests | Unskip in Sprint 3. If fail → file bugs. If need testids → request them. No more test.skip. |
| Fragile selector audit | Do it in Sprint 3. File testid requests aggressively. |
| Shared game seed helper | Clodi discussing `/api/test/seed-game` with Soni. Sprint 3 scope. |

### Sprint 3 Priorities (from Clodi)
1. Fix betting test suite (after Joni fixes BUG-S2-01)
2. Unskip mobile tests
3. Selector audit + testid requests
4. M3 showdown flow tests (primary deliverable)
5. Shared game helper with Soni
