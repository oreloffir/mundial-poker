# Soni — Sprint 2 Tasks

**Sprint:** April 8–15, 2026
**Role:** Senior Developer — Backend / Game Engine
**Total tasks:** 3

Read the [Sprint Brief](./SPRINT-BRIEF.md) first for full context, dependencies, and schedule.

---

## S5 — Fix S3-BUG-01: Timeout Fires at 40–45s Instead of 30s

**Priority:** High (carry-over from Sprint 1, blocks clean QA sign-off)
**Branch:** `fix/s3-timeout-drift`
**Deadline:** Wednesday April 9 EOD

### Context

Mark's QA confirmed the server auto-timeout fires at ~40–45s while the client timer correctly counts down 30s. `BET_TIMEOUT_MS = 30_000` is set correctly in `betting.service.ts`. Root cause is not immediately obvious — investigate before fixing.

### Likely root cause to investigate first

In `game.service.ts`, `startBetTimer` is called at two sites:
- Line ~163: when `startBettingRound` prompts the first player
- Line ~409: inside `handleBetAction` when the next prompt is emitted

`startBetTimer` internally calls `cancelBetTimer` before starting a fresh 30s timer. This means **if a player is re-prompted** (e.g. BB getting the option after everyone else checked), the timer resets to a fresh 30s from the re-prompt moment — not from when they were originally prompted.

If that re-prompt happens ~10–15s into the original 30s countdown, the server won't act until 30s after the re-prompt, while the client is still counting down from the original start. Net effect: server fires ~40–45s after the client timer started.

**Decision you need to make and document:**
- **Option A (per-prompt, current behavior):** Each re-prompt restarts the 30s clock. Correct when BB gets the option — they deserve a full 30s to decide on their option, even if they waited for action to come back. This is standard in online poker.
- **Option B (wall-clock budget):** Total time per turn is capped at 30s regardless of re-prompts. Simpler from a user perspective, harder to implement.

Recommendation: **Option A is correct poker behavior.** The real bug is likely something else — the client UI needs to **reset its countdown timer when a new `bet:prompt` arrives for the local player**. Confirm this in the frontend and fix whichever side is wrong.

### Requirements

1. **Reproduce the bug** — Add a temporary log in `startBetTimer` that prints `key`, `Date.now()`, and the call stack depth. Run 5 rounds with a human player and log timestamps.

2. **Identify whether the drift comes from:**
   - Re-prompt timer reset (described above) — if so, fix client to reset on new prompt
   - OR a different root cause (double-call to `startBetTimer`, async delay before calling it, etc.)

3. **Fix the correct side:**
   - If it's a client reset issue: emit a `bet:prompt` field `promptedAt: Date.now()` and have the frontend start its countdown from that timestamp (not from when it receives the event)
   - If it's a server double-start issue: find the second call and guard against it

4. **Add a regression test** to `betting.service.test.ts` using `jest.useFakeTimers()`:
   - Verify timer fires exactly at `BET_TIMEOUT_MS`
   - Verify timer cancels correctly on player action
   - Verify timer resets correctly on re-prompt (new key)

5. **Remove the temporary log** before merging.

### Files likely to modify

- `apps/server/src/modules/game/betting.service.ts` — if server-side
- `apps/web/src/hooks/useGameSocket.ts` — if client timer needs to reset on new prompt
- `apps/server/src/modules/game/betting.service.test.ts` — add regression tests

### Deliverables

- [ ] Root cause identified and documented in PR description
- [ ] Fix applied to correct side (server or client, or both)
- [ ] Regression test: timeout fires at exactly 30s in unit test
- [ ] Mark re-verifies: timeout fires at ~30s in manual test (acceptable range: 28–33s)

### Out of scope

- Time bank or turn extension mechanics
- Per-player configurable timeouts
- Warning events before timeout

---

## S6 — Restructure Scoring & Showdown Event Flow

**Priority:** High (core gameplay experience)
**Branch:** `feat/showdown-event-restructure`
**Deadline:** Sunday April 6

### Context

The showdown phase is where Mundial Poker's magic happens — poker meets football, and the player sees HOW their teams performed. But the current server dumps all data at once, killing any drama.

**Current flow (server side):**
1. Betting completes → `WAITING_FOR_RESULTS`
2. Emit `round:pause` → 30 seconds pass → all 5 demo fixtures resolve simultaneously
3. Emit `round:results` with ALL fixture scores + ALL card scores + pot distribution (one giant payload)
4. Hardcoded `await sleep(2000)` (unexplained gap)
5. Emit `round:showdown` with ALL player hands + total scores (another giant payload)
6. Status → `COMPLETE`

**Problems:**
- All 5 match results appear simultaneously — no drama, no "will my team win?"
- Player sees "12 pts" but never sees WHY (5 base + 4 goal bonus + 2 clean sheet + 1 penalty)
- `cardScores` include `teamId` but not the team object or fixture data — frontend can't show the breakdown story
- `potDistribution` is sent in `round:results` but the client never uses it
- The 2-second sleep between events is arbitrary
- There's an unused `ShowdownOverlay.tsx` component that actually has score count-up animations — but it's never rendered because the data structure doesn't match what it needs

### New event flow

Replace the batch dump with a progressive reveal sequence:

```
BETTING COMPLETE
    │
    ▼
① round:pause { roundId, fixtureIds, resumeAt, fixtures: [...with team data] }
    │  (Client: "Matches in progress..." — fixture cards showing VS)
    │
    ▼  (Every ~5s during the 30s wait, reveal one match result)
② fixture:result { fixtureId, homeTeam, awayTeam, homeGoals, awayGoals, penalties }
② fixture:result { ... }
② fixture:result { ... }
② fixture:result { ... }
② fixture:result { ... }
    │  (Client: updates each fixture card one at a time — dramatic reveal)
    │
    ▼  (All fixtures resolved)
③ round:scoring { roundId }
    │  (Client: brief "Calculating scores..." transition, ~2 seconds)
    │
    ▼  (Reveal each player's score, lowest to highest, 2.5s apart)
④ player:scored { userId, hand, cardScores (with team + fixture data), totalScore, rank }
④ player:scored { ... }
④ player:scored { ... }
    │  (Client: reveals each player's cards + animated score breakdown)
    │  (e.g. "Brazil 🇧🇷 vs Serbia 🇷🇸 → 3-0 → Win 5pts + High Scorer 4pts + Clean Sheet 2pts = 11pts")
    │
    ▼  (After all players revealed, 2s delay)
⑤ round:winner { winnerIds, potDistribution, totalPot }
    │  (Client: winner banner with correct chip share)
    │
    ▼
⑥ players:update (chip stacks)  →  round:start (next round)
```

### Requirements

1. **Progressive fixture reveal** — Instead of resolving all 5 fixtures at once in `demo.service.ts`, resolve one-by-one:
   - Spread across the 30s wait: fixture 1 at ~6s, fixture 2 at ~12s, fixture 3 at ~18s, fixture 4 at ~24s, fixture 5 at ~30s
   - After each fixture resolves, emit `fixture:result`:
     ```typescript
     {
       fixtureId: string
       homeTeamId: string
       homeTeam: { id, name, code, flagUrl }
       awayTeamId: string
       awayTeam: { id, name, code, flagUrl }
       homeGoals: number
       awayGoals: number
       hasPenalties: boolean
       homePenaltiesScored?: number
       awayPenaltiesScored?: number
     }
     ```
   - Update each fixture in DB individually

2. **Scoring phase signal** — After all fixtures resolved, emit `round:scoring`:
   ```typescript
   { roundId: string }
   ```

3. **Per-player score reveal** — Instead of one `round:showdown` with everyone, emit `player:scored` one at a time:
   - Sort non-folded players by `totalScore` ascending (lowest first — build suspense, winner last)
   - 2.5-second delay between each
   - **Include full team AND fixture objects in cardScores** — this is the key:
     ```typescript
     {
       userId: string
       seatIndex: number
       hand: [
         { teamId, team: { id, name, code, flagUrl, fifaRanking, tier } },
         { teamId, team: { id, name, code, flagUrl, fifaRanking, tier } }
       ]
       cardScores: [
         {
           teamId: string
           team: { id, name, code, flagUrl }
           fixtureId: string
           fixture: { homeTeamId, awayTeamId, homeGoals, awayGoals, hasPenalties }
           baseScore: number
           goalBonus: number
           cleanSheetBonus: number
           penaltyModifier: number
           totalScore: number
         }
       ]
       totalScore: number
       rank: number
       isWinner: boolean
     }
     ```
   - The frontend should be able to render the full story from one payload: "Brazil 🇧🇷 vs Serbia 🇷🇸 → 3-0 → Win (5pts) + High Scorer (4pts) + Clean Sheet (2pts) = 11pts"

4. **Winner event** — After all players revealed, 2-second delay, then emit `round:winner`:
   ```typescript
   {
     winnerIds: string[]
     potDistribution: Record<string, number>
     totalPot: number
   }
   ```

5. **Remove old events** — Delete `round:results` and `round:showdown` from the server and shared types. Remove the unexplained 2-second sleep.

6. **Update shared types** — Add to `ServerToClientEvents`:
   - `fixture:result`
   - `round:scoring`
   - `player:scored`
   - `round:winner`
   Remove: `round:results`, `round:showdown`

7. **Timing constants** in `game.service.ts`:
   ```typescript
   const FIXTURE_REVEAL_INTERVAL_MS = 5_000   // 5s between each fixture
   const SCORING_PAUSE_MS = 2_000              // 2s "calculating" pause
   const PLAYER_REVEAL_INTERVAL_MS = 2_500     // 2.5s between each player
   const WINNER_DISPLAY_DELAY_MS = 2_000       // 2s after last player
   ```

8. **CardScores DB enrichment** — When reading cardScores for `player:scored`, JOIN with teams and fixtures tables. Don't just send IDs.

9. **Folded players** — Skip them in `player:scored`. Client already knows who folded.

### Files to modify

- `apps/server/src/modules/game/game.service.ts` — restructure post-betting lifecycle, new events, timing
- `apps/server/src/modules/game/scoring.service.ts` — return enriched cardScores with team + fixture objects
- `apps/server/src/modules/game/demo.service.ts` — progressive fixture resolution
- `packages/shared/types/socket-events.ts` — new event types, remove old ones
- `packages/shared/types/game.types.ts` — enriched CardScore type

### Deliverables

- [ ] Progressive fixture resolution (one every ~5s during 30s wait)
- [ ] `fixture:result` event per fixture with full team data
- [ ] `round:scoring` transition event
- [ ] `player:scored` events (one per player, lowest first, 2.5s apart) with full team + fixture data in cardScores
- [ ] `round:winner` event with correct potDistribution per winner
- [ ] Old `round:results` and `round:showdown` removed
- [ ] Shared types updated for all new events
- [ ] Timing constants defined
- [ ] Unexplained 2-second sleep removed

### Out of scope

- Frontend rendering of new events (Joni's task)
- Live match API integration
- Changing the scoring algorithm itself
- Penalty shootout step-by-step animation
- Smarter bot AI

---

## S7 — Server Integration Test Suite

**Priority:** High (foundational for all future development)
**Branch:** `feat/server-integration-tests`
**Deadline:** Tuesday April 15

### Context

We have 26 unit tests covering `blinds.service` and `betting.service` in isolation. What we don't have:
- Tests for the full round lifecycle (`startRound` → dealing → blind collection → betting → showdown)
- Tests for `game.service.ts` (the orchestrator) — no test coverage at all
- Fake-timer tests for the S3 timeout behavior
- Socket event emission tests

Mark is running manual Playwright tests. They're good for UI smoke testing but slow and fragile for game engine logic. We need server-side integration tests that run in milliseconds and cover the critical game state machine.

### Requirements

**Test file location:** `apps/server/src/__tests__/game-engine.test.ts`

**Test framework:** Vitest (already configured in the project). Use `vi.useFakeTimers()` for timer tests.

**Mocking strategy:** Mock the database (`db`) and Socket.io (`io`) at the module level. Do not use a real database for these tests — the unit tests already prove DB schema correctness.

**What to mock:**
```typescript
vi.mock('../../db', () => ({ db: mockDb }))
vi.mock('../../lib/socket', () => ({ emitToRoom: vi.fn() }))
```

**Test scenarios to cover:**

### Group 1: Round lifecycle (3 tests)
```
T1: startRound with 2 active players → blind collection → first bet:prompt emitted
T2: Full round — all bots check → showdown triggered → winner emitted
T3: Last-player-standing — all but one fold → pot awarded immediately, no showdown
```

### Group 2: Betting order (4 tests)
```
T4: 4-player pre-flop → UTG prompted first (not SB or BB)
T5: BB option — all players check/call BB → BB receives CHECK+RAISE options
T6: BB no-option — player raises beyond BB → BB receives CALL+RAISE+FOLD options
T7: Post-flop — first prompt goes to SB (or next active after dealer)
```

### Group 3: Timeout (3 tests, fake timers)
```
T8: Timer fires at exactly 30_000ms → auto-CHECK emitted when CHECK allowed
T9: Timer fires at exactly 30_000ms → auto-FOLD emitted when CHECK not allowed
T10: Player acts at 15_000ms → timer cancelled → no auto-action at 30_000ms
```

### Group 4: Edge cases (3 tests)
```
T11: Player with stack < blind → goes all-in for available chips
T12: Heads-up (2 players) → dealer = SB, opponent = BB
T13: Round end before all timers fire → cleanupBetTimers cancels pending timers
```

### Implementation notes

- Keep each test under 40 lines. Extract shared setup into `beforeEach`.
- Use `vi.advanceTimersByTime(30_000)` for timer advancement — do not use real `setTimeout` in tests.
- Assert on `emitToRoom` call args to verify correct events are emitted in correct order.
- Don't test `handleBetAction` exhaustively — the existing `betting.service.test.ts` covers it. Focus on orchestration.

### Files to create/modify

- `apps/server/src/__tests__/game-engine.test.ts` — NEW, ~350 lines
- `apps/server/src/__tests__/setup.ts` — shared mocks and factories (create if needed)
- `apps/server/package.json` — verify `"test:integration"` script runs this file

### Deliverables

- [ ] 13 tests, all passing
- [ ] All 3 timeout tests use `vi.useFakeTimers()` — no real sleep
- [ ] `pnpm test` in `apps/server/` runs all 39 tests (26 existing + 13 new)
- [ ] Coverage on `game.service.ts` reaches 60%+ (currently 0%)
- [ ] No real DB connections — pure mocks throughout

---

## Delivery Log

### S5 — Fix Timeout Drift (S3-BUG-01)
**Status:** ✅ Done
**Root cause:** Client-side timer drift. The BettingControls `useEffect` deps were `[prompt.minimumBet, prompt.timeoutMs]` — when BB gets re-prompted (option) with the same values, the effect doesn't re-run and `startTimeRef` stays at the original prompt time. Meanwhile server resets to a fresh 30s.
**Fix (both sides):**
- Server: added `promptedAt: Date.now()` to `bet:prompt` payload
- Client: BettingControls uses `promptedAt` as timer start + useEffect dep, so re-prompts always reset the countdown
- Also: moved DB status update in `startBettingRound()` to fire-and-forget after the prompt (was blocking before emit)
**Decision:** Option A (per-prompt reset) — standard poker behavior. Each re-prompt gets a full 30s.
**Tests:** 3 regression tests added (timer fires at 30s, auto-FOLD, cancel on action). 29 total tests passing.
**Files:** `game.service.ts`, `betting.service.ts`, `BettingControls.tsx`, `useGameSocket.ts`, `gameStore.ts`, `socket-events.ts`

### S6 — Restructure Scoring & Showdown Event Flow
**Status:** ✅ Done
**New event flow:**
1. `fixture:result` — emitted 5 times, every 5s during 30s wait, with full team data (name, code, flagUrl) + score + penalty flag
2. `round:scoring` — transition signal after all fixtures resolved
3. `player:scored` — emitted per non-folded player, lowest score first, 2.5s apart, with enriched `cardScores` containing full team + fixture objects (side, goals, breakdown: base/goal/cs/penalty)
4. `round:winner` — emitted 2s after last player, with `winnerIds`, `potDistribution`, `totalPot`
5. `players:update` — chip sync after pot distribution

**Old events deprecated:** `round:results` and `round:showdown` still in shared types (marked `@deprecated`) but no longer emitted by the server. Joni can remove frontend handlers when ready.

**Timing constants:**
- `FIXTURE_REVEAL_INTERVAL_MS = 5_000` (5s between fixtures)
- `SCORING_PAUSE_MS = 2_000` (2s calculating pause)
- `PLAYER_REVEAL_INTERVAL_MS = 2_500` (2.5s between player reveals)
- `WINNER_DISPLAY_DELAY_MS = 2_000` (2s before winner)
- `NEXT_ROUND_DELAY_MS = 4_000` (4s before next round)

**Files changed:**
- `apps/server/src/modules/game/demo.service.ts` — new `resolveDemoFixturesProgressive()` with per-fixture callback
- `apps/server/src/modules/game/game.service.ts` — progressive fixture reveal in `startRound()`, restructured `resolveRound()` with sequential player reveals
- `packages/shared/types/socket-events.ts` — new `FixtureResultPayload`, `PlayerScoredPayload`, `RoundWinnerPayload` types

**Joni unblocked:** J12 can now wire up: `fixture:result` → `addFixtureResult`, `round:scoring` → `setShowdownPhase('calculating')`, `player:scored` → `addPlayerScoreReveal`, `round:winner` → `setWinnerData`. All payload shapes match Joni's scaffolded types exactly.

### S7 — Server Integration Test Suite
**Status:** ✅ Done
**File:** `apps/server/src/__tests__/game-engine.test.ts` (13 tests)

**Group 1: Round lifecycle (3 tests)**
- T1: Blind seeding — pot=15, currentBet=10, UTG prompted first
- T2: All check through — round completes correctly
- T3: Last player standing — single active player detected

**Group 2: Betting order (4 tests)**
- T4: 4-player pre-flop — UTG at seat 3 (not SB or BB)
- T5: BB option — CHECK+RAISE when no raise beyond BB
- T6: BB loses option — CALL required when raise exceeds BB
- T7: Post-flop — starts at SB seat (seat 1)

**Group 3: Timeout (3 tests, vi.useFakeTimers)**
- T8: Auto-CHECK fires at exactly 30_000ms
- T9: Auto-FOLD fires when CHECK not in allowedActions
- T10: Timer cancelled at 15s — no auto-action at 30s

**Group 4: Edge cases (3 tests)**
- T11: Short stack (3 chips) goes all-in for blind
- T12: Heads-up — dealer=SB, opponent=BB
- T13: cleanupBetTimers cancels all pending timers for a round

**Total test count:** 42 (13 new + 16 betting + 13 blinds)
**All passing in 485ms.**

---

## S-DATA-01 — Add `opponentTeam` to `player:scored` CardScore payload

**Filed by:** Joni, Apr 2, 2026
**Priority:** Low (cosmetic — frontend workaround in place, this is for data cleanliness)
**Blocks:** "vs 🇸🇳 Senegal" second line in `TeamScoreSubCard` (SP-01 issue #5)

### Context

The frontend score sub-card wants to display both teams in the fixture:
```
🇧🇷 Brazil
vs 🇷🇸 Serbia → 3-0
```

Currently `CardScoreData.fixture` only has `{ homeGoals, awayGoals, side }` — no opponent team data. The frontend **can** cross-reference via `fixtureResults` (already in store from `fixture:result` events), but that's a fragile workaround. Cleaner to have it in the payload directly.

### Ask

In the `player:scored` payload, add `opponentTeam` to each card in `cardScores`:

```typescript
cardScores: [{
  teamId: string
  team: { name, code, flagUrl }
  fixtureId: string
  fixture: {
    homeGoals: number
    awayGoals: number
    side: 'home' | 'away'
    opponentTeam: { name: string; code: string; flagUrl: string }  // ← ADD THIS
  }
  baseScore: number
  // ...
}]
```

Also update `CardScoreData` in `packages/shared/types/game.types.ts` to match.

### Interim behavior

Until this lands, the frontend suppresses the "vs" line entirely (no placeholder). Consistent with Doni's guidance: "don't show a placeholder with no data."
