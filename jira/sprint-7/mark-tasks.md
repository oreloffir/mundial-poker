# Mark — Sprint 7 Tasks

**Sprint:** April 5–12, 2026
**Role:** QA Lead
**Total tasks:** 3

Your E2E fixes are the **gate** for the entire sprint. Nothing merges until the suite is green. Then shift to manual device QA and beta coordination.

---

## M14 — Fix E2E Suite (THE #1 PRIORITY)

**Priority:** Critical
**Branch:** `fix/e2e-sprint7-cleanup`
**Deadline:** April 6 (Day 1)

The E2E suite is 75% green. 8 broken tests, 4 flaky, 1 duplicate. All failures are selector/timing — zero game logic regressions. Fix them all.

### Requirements

**1. Delete the duplicate spec (5 min):**

- Delete `apps/web/e2e/j31-corner-controls.spec.ts` — it's a leftover from an earlier iteration
- `j31-controls.spec.ts` is the canonical version

**2. Rewrite 3 broken betting tests for J31 corner circles (2-3 hours):**

J31 replaced the horizontal button bar (Fold/Check/Call/Raise/All-In as separate buttons) with corner circle buttons. Three specs still look for the old layout:

| Spec               | Test                                               | What to Fix                                                                                                                                                                                                    |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `betting.spec.ts`  | shows Fold, Check/Call, Raise, All-In buttons      | Look for corner circle buttons: `[data-testid="btn-fold"]`, `[data-testid="btn-check"]` or `[data-testid="btn-call"]`, `[data-testid="btn-raise"]`. They're positioned absolute in bottom-right, not in a bar. |
| `betting.spec.ts`  | preset buttons visible (Min, 1/2 Pot, Pot, All In) | Raise expansion is now a vertical chip list above the Raise button. Look for the expanded raise panel, not a horizontal preset bar. If the chip list testids don't exist yet, file a TESTID-REQUEST for Joni.  |
| `heads-up.spec.ts` | betting controls appear during turn in heads-up    | Same as above — update selectors to match corner circles                                                                                                                                                       |

**How to find the right selectors:**

- Open `apps/web/src/components/game/BettingControls.tsx` and search for `data-testid`
- The corner buttons are in `apps/web/src/components/game/PokerTable.tsx` or nearby — check where J31 put them
- If a testid is missing, add it to `TESTID-REQUESTS.md` with file path + selector hint

**3. Fix 4 flaky cold-start timeouts (1 hour):**

All 4 fail at ~2.1m (120s timeout) on first attempt, pass on retry in ~40s. The pattern: first test in each spec group pays a "cold start" penalty (WebSocket connection + guest session + table creation).

| Spec                 | Test                                   |
| -------------------- | -------------------------------------- |
| `betting.spec.ts`    | old range slider is removed            |
| `betting.spec.ts`    | fold: controls disappear after folding |
| `game-round.spec.ts` | deals fixture cards in center          |
| `game-round.spec.ts` | fixture board clean after winner       |

**Fix options (pick one or combine):**

- **Option A:** Add a warm-up step in the global `beforeAll` or first `beforeEach` — navigate to `/lobby`, create a table, wait for WebSocket, then run the real test. This "primes" the connection.
- **Option B:** Increase default timeout from 120s to 180s in `playwright.config.ts` for remote runs (when `DEV_URL` is set).
- **Option C:** Both A and B.

**Recommendation:** Option C. Warm-up prevents the flake; higher timeout catches edge cases.

**4. Fix 2 remaining broken tests (1 hour):**

| Spec                 | Test                             | Root Cause                       | Fix                                                                                                                                            |
| -------------------- | -------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `game-round.spec.ts` | round counter testid present     | Setup failure → timeout          | Warm-up fix (step 3) should resolve this. If still broken after warm-up, check that `data-testid="round-counter"` exists in the deployed HTML. |
| `game-round.spec.ts` | chip balances update after round | `seat-balance` testids not found | Check if `data-testid="seat-balance-0"` through `seat-balance-4` exist. If missing, file TESTID-REQUEST.                                       |

**5. Fix flow-audit mobile timeout (30 min):**

| Spec                 | Test           | Root Cause                                            | Fix                                                                         |
| -------------------- | -------------- | ----------------------------------------------------- | --------------------------------------------------------------------------- |
| `flow-audit.spec.ts` | Mobile 667×375 | 10min timeout too short for 3 rounds on remote server | Increase this specific test's timeout to 15min (`test.setTimeout(900_000)`) |

### Out of Scope

- Do NOT write new tests for Sprint 7 features yet
- Do NOT change game code — test fixes only
- Do NOT modify the flow-audit test flow (just the timeout)

### Deliverables

- [ ] Duplicate spec deleted
- [ ] 3 betting tests rewritten for corner circles
- [ ] 4 flaky tests stabilized (warm-up + timeout)
- [ ] 2 broken game-round tests fixed
- [ ] Flow-audit mobile timeout extended
- [ ] Full suite run against EC2 — report results
- [ ] **Target: 28+ of 32 tests passing (87%+)**

---

## M15 — Manual Device QA Pass

**Priority:** High
**Deadline:** April 8

5 items from the Sprint 6 mobile audit need manual verification on a real device (or real browser at 667x375). Screenshots at that resolution can't capture subtle visuals.

### Requirements

Open `https://mundialpoker.duckdns.org` on a real phone (or Chrome DevTools at 667x375). Play 1 full round and manually verify:

| #   | Item                      | What to Check                                                                           | How                                                                             |
| --- | ------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 1   | YOUR fixtures gold border | Are your 2 fixtures highlighted with a gold `"YOUR MATCH"` border?                      | Look during betting phase — your fixture cards should stand out from opponents' |
| 2   | Raise chip expansion      | Tap Raise → does a vertical chip list expand above the button?                          | Wait for your turn, tap the Raise circle                                        |
| 3   | Scoring reference card    | Is the scoring rules text readable in bottom-left? (Win +5, Draw +3, etc.)              | Check during betting idle                                                       |
| 4   | Phase badge colors        | Does the badge change color per phase? BETTING=green, WAITING=gold, SCORING=bright gold | Watch through a full round                                                      |
| 5   | Chip flight animation     | Do chips visually fly from bettor to pot on each bet?                                   | Watch when you or a bot places a bet                                            |

**For each item:**

- Screenshot at 667x375
- Save to `assets/screenshots/sprint7/m15-{N}-{description}.png`
- PASS / FAIL / PARTIAL with one-line note
- If FAIL: file in `jira/sprint-7/shared/bugs.md` with screenshot reference

### Deliverables

- [ ] 5 items manually verified
- [ ] Screenshots saved
- [ ] Bug report for any failures
- [ ] Report saved at `jira/sprint-7/shared/manual-device-qa.md`

---

## M16 — Beta Coordination Prep

**Priority:** Medium
**Deadline:** April 11

You're shifting from pure automation to beta coordination. This task sets up the infrastructure for real player testing.

### Requirements

1. **Beta test plan** — Write a 1-page doc covering:
   - Who are the first 10 testers? (friends, team, invited players)
   - What do we tell them to do? (step-by-step: open URL → join table → play 3 rounds)
   - What do we ask them to report? (bugs, confusion, UX friction)
   - How do they report it? (Google Form? Slack channel? In-game feedback?)
   - What's the minimum viable experience for beta? (game must not crash, must complete 3 rounds, must work on mobile)

2. **Beta checklist** — Based on Sprint 7 deliverables, what must be green before we invite testers:
   - [ ] E2E suite 90%+ green
   - [ ] DB backups active
   - [ ] Monitoring active
   - [ ] BUG-MP-01 fixed
   - [ ] Sound effects working
   - [ ] Manual QA pass complete

3. Save at: `docs/beta-test-plan.md`

### Out of Scope

- Don't recruit testers yet — just the plan
- Don't build a feedback form yet — just decide the channel

### Deliverables

- [ ] Beta test plan (who, what, how)
- [ ] Beta readiness checklist
- [ ] Saved to `docs/beta-test-plan.md`

---

## Delivery Log

| Task | Status | PR  | Deployed |
| ---- | ------ | --- | -------- |
| M14  | ⬜     |     |          |
| M15  | ⬜     |     |          |
| M16  | ⬜     |     |          |
