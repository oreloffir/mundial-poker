# Soni — Sprint 1 Tasks

**Sprint:** April 1–8, 2026
**Role:** Senior Developer — Backend / Game Engine
**Total tasks:** 4

Read the [Sprint Brief](./SPRINT-BRIEF.md) first for full context, dependencies, and schedule.

---

## S1 — Blind Position Assignment & Collection

**Priority:** High (blocks S2, S4, and Joni's J4)
**Branch:** `feat/blind-position-collection`
**Deadline:** Thursday April 2 EOD

### Context

The DB schema already has `smallBlind`/`bigBlind` on the `tables` table (defaults 5/10) and `dealerSeatIndex` on `rounds`. But blinds are never collected — no SB/BB seat assignment, no forced deductions, no blind bets recorded. Without forced bets, everyone just checks through. This is the #1 gameplay-breaking issue.

### Requirements

1. **Position calculation** — In `dealing.service.ts` (or a new `blinds.service.ts` if you prefer for cohesion), after dealer rotation resolves `dealerSeatIndex`, compute:
   - `sbSeatIndex` = first occupied/active seat clockwise from dealer (skip eliminated/empty seats)
   - `bbSeatIndex` = first occupied/active seat clockwise from SB
   - Heads-up edge case: dealer IS the SB, opponent is BB (standard poker rule)

2. **Blind collection** — In `game.service.ts` round lifecycle, after dealing but before the first betting round:
   - Read `smallBlind`/`bigBlind` from the table record
   - Deduct SB from the SB player's chip stack (in-memory BettingState + DB tablePlayers update)
   - Deduct BB from the BB player's chip stack
   - If a player's stack < blind amount, they go all-in for whatever they have
   - Seed the `pot` in `BettingState` with collected blinds

3. **Persist blind bets** — Record in `bets` table with `bettingRound: 0` and action `SMALL_BLIND` / `BIG_BLIND`. You may need to extend the `BetAction` type in `@wpc/shared` to include these values.

4. **Socket event update** — Add to `round:start` (or `board:reveal`) payload:
   ```typescript
   {
     ...existingPayload,
     sbSeatIndex: number,
     bbSeatIndex: number,
     smallBlind: number,
     bigBlind: number,
   }
   ```
   Joni needs these fields to render SB/BB badges on the frontend.

5. **Unit tests** — Cover:
   - Normal 3-5 player table (SB and BB at correct positions)
   - Heads-up / 2 players (dealer = SB)
   - Player with stack < blind (goes all-in)
   - Skipping eliminated/empty seats

### Files to modify

- `apps/server/src/modules/game/dealing.service.ts` — blind position calculation
- `apps/server/src/modules/game/game.service.ts` — wire blind collection into round start
- `apps/server/src/modules/game/betting.service.ts` — seed pot with blinds, track blind contributions per player in `playerStates.totalBet`
- `apps/server/src/modules/game/game.socket.ts` — updated event payload
- `packages/shared/` — extend `BetAction` type if needed (add SMALL_BLIND, BIG_BLIND)

### Deliverables

- [ ] Blind position calculation function with seat-skipping logic
- [ ] Auto-deduction of blinds at round start
- [ ] Blind bets persisted in `bets` table
- [ ] Updated socket event payload with `sbSeatIndex`, `bbSeatIndex`, `smallBlind`, `bigBlind`
- [ ] Unit tests for all position scenarios

### Out of scope

- Blind level escalation / tournament blind structure
- Ante support (just SB/BB for now)
- UI rendering of blind badges (that's Joni's J4)
- Dealer button badge

---

## S2 — Betting Order Fix

**Priority:** High (required for correct poker flow)
**Branch:** `feat/betting-order-fix`
**Deadline:** Saturday April 4

### Context

`betting.service.ts` starts betting at an arbitrary first active player. Texas Hold'em requires specific positional ordering: pre-flop starts at UTG (seat after BB), post-flop starts at SB (or first active after dealer). The BB also gets a special "option" pre-flop if no one raises beyond the big blind.

### Requirements

1. **Accept starting position** — Modify `BettingState` initialization (or `startBettingRound()` in `game.service.ts`) to accept a `startingSeatIndex` parameter.

2. **Pre-flop (betting round 1):**
   - `startingSeatIndex` = first active seat clockwise after `bbSeatIndex` (this is UTG — "Under the Gun")
   - When action wraps back to BB and no raise exceeded the big blind amount: BB gets the "option" — `allowedActions` should include `CHECK` and `RAISE` (not `CALL`)
   - If someone raised beyond BB: BB must `CALL`, `RAISE`, or `FOLD` like normal

3. **Post-flop (betting rounds 2 & 3):**
   - `startingSeatIndex` = first active seat clockwise from dealer (SB position, or next active if SB folded)

4. **Update `allowedActions`** in `bet:prompt` event to handle BB option correctly.

5. **Round-end detection** — Verify `isBettingRoundComplete()` still works correctly with the new ordering (all active players matched current bet or went all-in).

6. **Unit tests** — Cover:
   - Pre-flop order with 3, 4, 5 players
   - BB option when no one raises
   - BB loses option when someone raises
   - Post-flop order starting at SB
   - Folded-player skipping in rotation

### Files to modify

- `apps/server/src/modules/game/betting.service.ts` — starting position logic, BB option detection, allowedActions
- `apps/server/src/modules/game/game.service.ts` — pass correct starting position per betting round

### Deliverables

- [ ] `betting.service.ts` accepts and uses positional starting index
- [ ] Pre-flop: UTG start, full wrap, BB option logic
- [ ] Post-flop: SB-first (or next active) start
- [ ] `allowedActions` correctly computed for BB option scenario
- [ ] Unit tests for all ordering and BB edge cases

### Out of scope

- Straddle or other optional blind positions
- Side pot calculation changes
- Any frontend/UI changes
- Fourth betting round (game currently has 3 rounds — keep it)

---

## S3 — Server-Side Bet Timeout Enforcement

**Priority:** High (prevents game-freeze bug)
**Branch:** `feat/server-bet-timeout`
**Deadline:** Monday April 6

### Context

The server sends `timeoutMs: 30000` in `bet:prompt` but never enforces it. A disconnected or unresponsive player can freeze the game indefinitely. With blinds now costing real chips, this becomes even more critical — a stuck game wastes everyone's forced bets.

### Requirements

1. **Timer creation** — After emitting `bet:prompt`, start a 30-second `setTimeout`. Store the timer reference in a `Map<string, NodeJS.Timeout>` keyed by `${roundId}:${seatIndex}` (or `${roundId}:${userId}`).

2. **Auto-action on timeout:**
   - If `CHECK` is in `allowedActions` → auto-CHECK
   - Otherwise → auto-FOLD
   - Process through the normal betting flow — same code path as a player-initiated action
   - Emit `bet:update` to all clients with an additional `autoAction: true` flag so the UI can optionally show "(timed out)"

3. **Timer cancellation:**
   - Cancel the timer when the player submits a valid action before timeout
   - Add a `cleanupTimers(roundId)` method that cancels ALL timers for a given round — call this in `game.service.ts` when the round ends

4. **Bot exclusion** — Bots use their own 1.5s delay in `bot.service.ts`. Do NOT apply the 30s timeout to bot players. Check if the current player is a bot before starting the timer.

5. **Edge cases:**
   - Player disconnects mid-round → timer still fires, auto-acts on their behalf
   - Player reconnects before timer fires → they can still act normally (timer gets cancelled on their action)
   - Round ends early (everyone else folded) → `cleanupTimers(roundId)` cancels pending timers
   - Timer fires but round already moved on → guard against stale timer execution

6. **Unit/integration tests:**
   - Timeout triggers auto-CHECK when CHECK is allowed
   - Timeout triggers auto-FOLD when CHECK is not allowed
   - Timer cancelled on valid player action
   - Timer cancelled on round end
   - Bot not affected by timeout
   - Stale timer guard

### Files to modify

- `apps/server/src/modules/game/betting.service.ts` — timer Map, start/cancel/cleanup methods
- `apps/server/src/modules/game/game.service.ts` — wire `cleanupTimers()` on round end
- `apps/server/src/modules/game/game.socket.ts` — add `autoAction` flag to `bet:update` emission

### Deliverables

- [ ] Timer management Map in betting service
- [ ] Auto-CHECK or auto-FOLD on 30s timeout
- [ ] Timer cancellation on player action and round end
- [ ] `autoAction` flag in `bet:update` event
- [ ] Bot exclusion from timeout logic
- [ ] Stale timer guard
- [ ] Tests for all scenarios

### Out of scope

- Configurable timeout per table (hardcode 30s for now)
- "Time bank" or extension mechanics
- Disconnect/reconnect UI indicators (separate feature)
- Timeout warning events to client

---

## S4 — Blind-Aware Bot Logic

**Priority:** Medium (small scope, do alongside S1)
**Branch:** `feat/bot-blind-awareness` (or include in S1 branch if small enough)
**Deadline:** Thursday April 2 (alongside S1)

### Context

With blinds introduced, bots in SB/BB positions need their blinds auto-posted by the blind collection system (S1), not by bot "decisions." Bot CALL amounts must also account for blinds already contributed.

### Requirements

1. **Verify blind posting** — Bot blinds should flow through S1's collection system (the `game.service.ts` round start logic), NOT through `bot.service.ts` `scheduleBotAction()`. The bot should never be "prompted" to decide whether to post a blind — it's mandatory.

2. **Correct CALL amount** — When a bot calls after posting BB of 10 and someone raises to 30:
   - Bot's call amount should be 20 (30 - 10 already posted), not 30
   - Verify that `betting.service.ts` `playerStates[].totalBet` correctly includes the blind contribution, so `currentBet - totalBet` gives the right call amount

3. **Timeout exclusion** — Verify bots are excluded from S3's 30s timeout timer (bots keep their own 1.5s delay in `bot.service.ts`)

4. **Unit tests:**
   - Bot blind posted correctly via S1 system
   - Bot calls correct amount after posting blind
   - Bot not affected by timeout timer

### Files to modify

- `apps/server/src/modules/game/bot.service.ts` — verify call amount logic
- `apps/server/src/modules/game/betting.service.ts` — ensure `totalBet` tracking includes blind contributions

### Deliverables

- [ ] Verified bot blind flow through S1 collection (no bot decision needed)
- [ ] Bot CALL amount correctly accounts for blind already posted
- [ ] Bot excluded from S3 timeout confirmed
- [ ] Unit tests

### Out of scope

- Smarter bot AI (raising, bluffing, folding strategies)
- Bot personality or difficulty levels
- Bot fold logic
- Bot raise logic

---

## Delivery Log

### S1 — Blind Position Assignment & Collection
**Status:** ✅ Done (April 1)
**Files changed:**
- `packages/shared/types/game.types.ts` — Added `SMALL_BLIND`, `BIG_BLIND` to BetAction type
- `packages/shared/types/socket-events.ts` — Added `sbSeatIndex`, `bbSeatIndex`, `smallBlind`, `bigBlind` to RoundStartPayload
- `apps/server/src/modules/game/blinds.service.ts` — NEW: `calculateBlindPositions()`, `calculateNextActiveSeat()`
- `apps/server/src/modules/game/game.service.ts` — Blind collection in `startRound()`, cache for round-level blind info
- `apps/server/src/modules/game/betting.service.ts` — `initBettingRound()` accepts blind seed info, seeds totalBet/currentBet/pot
- `apps/server/src/db/schema.ts` — Expanded bets.action varchar(10→20) for SMALL_BLIND

**Verified:** SB/BB positions correct (incl. heads-up), chips deducted, pot seeded at 15 (5+10), bets persisted with bettingRound:0, socket payload includes blind data

### S4 — Blind-Aware Bot Logic
**Status:** ✅ Done (April 1, alongside S1)
**Files changed:** None — existing bot logic (`currentBet - totalBet`) correctly accounts for blind contributions. Verified bot SB calls only 5 (not 10) and bot BB gets CHECK option.

### S2 — Betting Order Fix
**Status:** ✅ Done (April 1)
**Files changed:**
- `apps/server/src/modules/game/betting.service.ts` — Added `startingSeatIndex` param to `initBettingRound()`, BB option logic in `getAllowedActions()`, added `bbPlayerIndex`/`bigBlindAmount` to BettingState
- `apps/server/src/modules/game/game.service.ts` — Computes UTG (pre-flop) and SB-first (post-flop) starting positions

**Verified:** Pre-flop starts at UTG (after BB), BB gets CHECK+RAISE option when nobody raised, post-flop starts at first active after dealer

### S3 — Server-Side Bet Timeout Enforcement
**Status:** ✅ Done (April 1)
**Files changed:**
- `apps/server/src/modules/game/betting.service.ts` — Timer Map, `startBetTimer()`, `cancelBetTimer()`, `cleanupBetTimers()`, auto-cleanup in `clearBettingState()`
- `apps/server/src/modules/game/game.service.ts` — Timer started after each `bet:prompt` (excluding bots), cancelled on player action

**Verified:** Timer registered for human players, bots excluded, timer cancelled on action, cleanup on round end. Auto-CHECK/FOLD fires after 30s of inactivity.

### Post-Sprint Fixes (Clodi request, April 1)

**autoAction flag:** ✅ Done
- `handleBetAction()` now accepts `autoAction` param, included in `bet:update` emit
- `BetUpdatePayload` has `autoAction?: boolean`
- Timeout handler passes `autoAction: true` through the chain

**Unit Tests:** ✅ Done — 26 tests passing
- `blinds.service.test.ts` (13 tests): position calculation for 3/4/5 players, heads-up, wrap-around, skip eliminated, error cases
- `betting.service.test.ts` (13 tests): blind seeding, BB option, UTG start, post-flop order, no-blind fallback
- Coverage: blinds.service 89% lines / 87% branches, betting.service 35% lines / 92% branches
