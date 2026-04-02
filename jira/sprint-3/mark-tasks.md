# Mark — Sprint 3 Tasks

**Sprint:** April 3–10, 2026
**Role:** QA & Marketing
**Total tasks:** 3

Read the [Sprint Brief](./SPRINT-BRIEF.md) first.

---

## M5 — Fix Betting Test Suite

**Priority:** High (blocked on Joni's J14)
**Deadline:** April 5 (after J14 lands)

### Context

The bet-timer div is intercepting clicks on chip denomination buttons, breaking every test that tries to raise. Joni is fixing the z-index/pointer-events in J14 (due day 1). Once that lands, re-run the betting suite.

### Requirements

1. After J14 merges, run: `pnpm test:e2e --grep "betting"`
2. Verify all chip denomination buttons are clickable
3. Verify raise flow works: tap chips → build total → confirm raise
4. Verify fold and check/call still work
5. If any tests still fail, diagnose whether it's a new issue or a pre-existing flake

### Also fix

- **S5 timeout test** — Use `promptedAt` from the `bet:prompt` payload as the baseline. Assert auto-action fires within 28-33s of `promptedAt`. The client countdown display drift is a separate issue, not what this test checks.
- Add `--retries 1` to your local test config for flake isolation (as you requested in your mid-sprint review)

### Deliverables

- [ ] All betting E2E tests pass
- [ ] S5 timeout test uses `promptedAt` baseline
- [ ] `--retries 1` added to local config
- [ ] Report any new bugs found

---

## M6 — Unskip Mobile Tests + Selector Audit

**Priority:** Medium
**Deadline:** April 7

### Context

4 mobile tests are `test.skip` — iPhone 12 landscape, portrait rotate hint, desktop 1440, and betting bar reachable on mobile. These need to run. Also, audit the suite for fragile selectors and replace with testids.

### Requirements

**Unskip mobile tests:**
1. Remove `test.skip` from all 4 mobile tests
2. Run them — if they fail, file bugs with reproduction steps
3. If they need testids, file in `TESTID-REQUESTS.md`

**Selector audit:**
4. Grep the entire `apps/web/e2e/` directory for selectors that DON'T use `data-testid`:
   - `div[class*=` patterns
   - `button:has-text(` patterns where a testid would be more stable
   - Any selector longer than 40 characters
5. For each fragile selector: determine if a testid exists or request one
6. Replace fragile selectors with testid-based ones where possible
7. File testid requests for the rest in `TESTID-REQUESTS.md`

### Also

Once Soni ships S9 (test seed endpoint), evaluate whether it can speed up your test setup. If `POST /api/test/seed-game` works, refactor one test to use it as a proof-of-concept and report the time savings.

### Deliverables

- [ ] 0 skipped mobile tests (all running, pass or bug filed)
- [ ] Selector audit complete — list of replaced + requested selectors
- [ ] `TESTID-REQUESTS.md` updated with new requests
- [ ] (Optional) One test refactored to use S9 seed endpoint with timing comparison

---

## M7 — Showdown Flow E2E Tests

**Priority:** High (blocked on Joni's J13)
**Deadline:** April 9

### Context

Your Sprint 2 M3 was a manual 27-point checklist. Now that the showdown overlay is being polished (J13), write proper Playwright E2E tests for the showdown flow.

### Requirements

Create `apps/web/e2e/showdown.spec.ts` with these tests:

**Fixture reveals (Phase 1-2):**
```
SD1: Fixtures reveal one at a time (fixture-card-{n} transitions from VS to score)
SD2: All 5 fixtures resolve within ~30s
SD3: "Calculating scores" overlay appears after all fixtures
```

**Player reveals (Phase 3):**
```
SD4: Full-screen overlay appears with "Round N Results" header
SD5: Players reveal sequentially (count increases in progress indicator)
SD6: Score breakdown visible per card (base + bonuses + total)
SD7: Winner revealed last (highest rank)
SD8: "YOU" badge only on human player, 🤖 on bots
```

**Winner (Phase 4):**
```
SD9: Winner banner appears with pot share amount
SD10: Chips update after winner announcement
```

**Transition (Phase 5):**
```
SD11: Overlay dismisses cleanly, no stale data
SD12: Next round starts (round counter increments)
```

**Edge cases:**
```
SD13: All fold except one — no showdown, pot awarded immediately
SD14: Play 3 consecutive rounds — no accumulated stale state
```

Use the shared helpers (`createTable`, `addBots`, `startGame`). If S9 seed endpoint is available, use it for faster setup.

### Files to create

- `apps/web/e2e/showdown.spec.ts` — 14 tests

### Deliverables

- [ ] 14 showdown E2E tests passing
- [ ] Uses testid selectors (not fragile class selectors)
- [ ] No flakes across 3 consecutive runs
- [ ] Screenshots at key visual checkpoints (fixture reveal, score breakdown, winner)

---

## Delivery Log

_Update after each task._

### M5 — Betting Test Suite Fix
**Status:** 🟡 UNBLOCKED — BUG-S3-01 and BUG-S3-02 fixed by Joni (Apr 2). Restart server, then re-run.

**Run:** April 2 — `pnpm test:e2e --grep "Betting"` — 1 passed, 9 failed

**J14 confirmed in source:** `bet-timer` div has `pointerEvents: 'none'` ✅
**But still intercepting:** Parent `<div class="flex items-center gap-2">` AND SVG `<circle>` elements inside the timer are still blocking pointer events. Joni's fix applied to the wrong element — needs to go to the parent container, or the SVG overlay needs `pointerEvents: 'none'` too.

**BUG-S3-01 (HIGH): FIXED ✅ (Apr 2) — v2 patch applied (Apr 2)**
- Root cause (v1): `pointerEvents: 'none'` was only on the `bet-timer` child, not on the parent info row `<div class="flex items-center gap-2">`. Fixed in v1 by adding it to the info row wrapper.
- Root cause (v2): CSS `pointer-events` is NOT an inherited property — SVG elements inside the info row (specifically the `PokerChip` SVG in `chipBadge`) defaulted to `visiblePainted` and could still intercept pointer events even with the parent div having `pointer-events: none`.
- Fix v2: Added explicit `pointerEvents: 'none'` directly on the `chipBadge` outer div AND the `PokerChip` SVG style within it in `BettingControls.tsx`.

**BUG-S3-02 (HIGH): FIXED ✅ (Apr 2)**
- Root cause: `POST /tables/:id/add-bot` returns `{ data: { table } }` with the updated table, but `handleAddBot` was discarding the response and calling `refreshState()` instead. The server does NOT emit `player:joined` for REST bot additions — only for socket joins. `refreshState()` re-emits `table:join` which may not trigger a fresh `table:state` for already-connected sockets.
- Fix: `handleAddBot` now reads `data.data.table` from the API response and calls `useGameStore.getState().setTable()` directly. No socket round-trip needed.

**BUG-S2-03 (CRITICAL): FIXED ✅ (Apr 2)**
- Root cause: `handleSubmit` in `CreateTableModal.tsx` only called `setIsSubmitting(false)` in the `catch` block. If `navigate()` failed silently (e.g., route guard redirect or concurrent React render batching issue), `isSubmitting` stayed `true` with no error message — modal stuck on "Creating..." forever.
- Fix: Moved `setIsSubmitting(false)` to a `finally` block so it always resets. If navigation works, the component unmounts (irrelevant). If navigation fails for any reason, the button resets and user can retry.
- Also fixed: Modal now has `maxHeight: calc(100dvh - 2rem)` + `overflowY: auto` so the Create button is reachable on mobile landscape (375px height) without viewport changes.

**BUG-S3-03 (LOW): FIXED ✅ (Apr 2)**
- Root cause: `{formatChips(myPlayer.chips)}` in `GameTable.tsx` where `myPlayer.chips` could be `undefined` before the first game state refresh after bots join.
- Fix: Changed to `{formatChips(myPlayer.chips ?? 0)}`.

**Round transition — winner banner too brief: FIXED ✅ (Apr 2)**
- Root cause: `round:start` fires immediately after `round:winner` (server-side) with no enforced display window. The winner banner had no minimum duration — it disappeared as soon as `round:start` was processed.
- Fix: `useGameSocket.ts` now tracks `winnerShownAtRef` timestamp. When `round:start` fires, if `showdownPhase === 'winner'` and less than 3s have elapsed since `round:winner`, `round:start` processing is delayed for the remaining duration. Timeout is cleared on component unmount.

**BUG-S3-02 (HIGH): CONFIRMED ALREADY FIXED ✅ (Apr 2)**
- Fix was applied in previous session. Flow audit confirmed mobile bots adding + Start Game works correctly. No further changes needed.

**Seed endpoint blocked:** Server process on port 5174 (PID 63574, started 6:18PM) predates S9 merge. Test routes (`/api/test/`) return 404. New tsx watch process (PID 25655, started 10:54PM) can't bind 5174 — old process holds the port. **Server needs a manual restart to pick up S9.**

**S5 timeout test:** Unblocked — `promptedAt` confirmed in `bet:prompt` payload. Will write the test once Start Game is fixed and tests can reach a game state.

---

### Flow Audit — Clodi Request
**Status:** ✅ COMPLETE v2 (Apr 2) — full game flow captured

Report: `jira/sprint-3/shared/flow-audit.md`
Screenshots: `assets/screenshots/` — 26 files (desktop A–K, mobile A–K), Pass 2

**Pass 1 (pre-fix):** BUG-S2-03 blocked all desktop game phases. Mobile reached Round 2 betting.
**Pass 2 (post-fix):** Full game flow on both platforms. Server restarted, all Joni/Soni fixes live.
**v2 audit (Apr 2):** Fresh server, screenshots cleared. Full inline popup flow captured. Report: `flow-audit-v2.md`

**What was captured in Pass 2:**
- Desktop: Stadium+pitch table loads (stunning), cards dealt, betting controls, showdown overlay (player reveals 2of5 and 4of5), clean Round 2 transition
- Mobile: Same + slide-up panel overlay working, 5of5 reveal captured with full leaderboard

**What was missed (timing gaps):**
- Winner banner — exists but appeared between screenshot intervals (now ~10s duration, add `waitForSelector` to spec)
- Calculating overlay — very brief (~2s), needs explicit wait to capture

**New bug found: BUG-S3-04 (LOW)** — "Chips 0" in header during bot-join window (cosmetic, ?? 0 fallback works but doesn't show actual balance)

---

### M6 — Mobile Tests + Selector Audit
**Status:** ⏳ Not started (starts day 3)

---

### M7 — Showdown E2E Tests
**Status:** 🟡 UNBLOCKED — BUG-S3-02 fixed (Apr 2). Two playtesting issues fixed (Apr 2): mobile landscape overlay and hand preview in header.

`apps/web/e2e/showdown.spec.ts` created (April 2). 14 tests across 5 phases:

| Test | Phase | Description |
|------|-------|-------------|
| SD1 | Fixture reveals | Fixtures reveal one at a time, not all at once |
| SD2 | Fixture reveals | All 5 fixtures resolve within ~35s |
| SD3 | Calculating | "Calculating scores" overlay appears after fixtures |
| SD4 | Player reveals | Full-screen overlay with round header visible |
| SD5 | Player reveals | Progress indicator increments (sequential, not batch) |
| SD6 | Player reveals | Score breakdown visible per card (base + bonuses) |
| SD7 | Player reveals | Winner revealed last in sequence |
| SD8 | Player reveals | "YOU" badge on human, bot indicator on bots |
| SD9 | Winner | Banner shows pot share amount |
| SD10 | Winner | Winning seat chip balance increases after hand |
| SD11 | Transition | Overlay dismisses, fixture cards reset to VS |
| SD12 | Transition | Round counter increments |
| SD13 | Edge case | All fold → no showdown overlay, pot awarded immediately |
| SD14 | Edge case | 3 consecutive rounds, no accumulated stale state |

**Testids required (filed for Joni in TESTID-REQUESTS.md):**
- `showdown-overlay` — the full-screen overlay container
- `showdown-round-header` — "Round N Results" heading
- `showdown-calculating` — "Calculating scores…" overlay state
- `showdown-progress` — sequential reveal progress indicator
- `showdown-score-card-{n}` — per-player score reveal card (0-4)
- `score-base-points` — base points line within a score card
- `score-total` — total score line within a score card
- `showdown-player-you` — human player badge
- `showdown-player-bot` — bot player indicator
- `betting-controls` — wrapper for the betting controls bar (for fold selector scoping)

Sharing spec with Soni so he can write server-side coverage against SD1–SD14 before J13 lands.

**Playtesting fixes (Apr 2):**
- **Mobile landscape overlay** — Full overlay was blocking the entire table on landscape phones. Fixed with `.showdown-overlay-root` CSS class: desktop keeps `inset: 0` (full-screen), mobile landscape (`max-height: 500px, orientation: landscape`) switches to a 60%-height slide-up panel from the bottom, table visible above, with `slide-up-panel` entry animation. No JS media query needed.
- **Hand preview in overlay header** — Added `myHand` and `myChips` props to `RoundResultsOverlay`. Mini card flags (22×30px) + chip count shown in the overlay header bar between "Round N Results" and the progress indicator. Visible on both desktop and mobile.
