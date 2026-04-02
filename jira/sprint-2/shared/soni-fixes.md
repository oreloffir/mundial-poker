# SONI: Game Robustness Fixes + Lobby Wiring

**Ticket:** SF-01
**Assignee:** Soni
**Priority:** High
**Branch:** `fix/game-robustness-and-lobby`
**Created by:** Clodi (PM), April 2, 2026

---

## Overview

Three areas of work:

1. **Wire lobby:tables on the frontend** — You shipped the server-side `lobby:tables` socket event but Joni hasn't wired the frontend. Since you know the event shape, do it yourself. Replace the `setInterval` polling in `Lobby.tsx` with your socket listener.
2. **Game state recovery on reconnect** — Refreshing mid-round loses context. The `table:state` event on rejoin needs to send the FULL current phase state so the client can reconstruct.
3. **Fix hasFolded test type error** — Your integration tests have a pre-existing type error in mock players.
4. **Investigate Issue #9 from showdown polish** — The "YOU" badge showed on a bot. Verify the `player:scored` event sends the correct `userId` for matching.

**IMPORTANT:** After completing each fix, update the Communication Log in `jira/sprint-2/shared/showdown-polish.md` if the fix relates to the showdown overlay (Issue #9). Also update your delivery log at the bottom of THIS file so Clodi can track progress across sessions.

---

## SF-01a — Wire `lobby:tables` Socket Event on Frontend

**Priority:** High (removes wasteful polling)
**Files to modify:** `apps/web/src/pages/Lobby.tsx`, `apps/web/src/lib/socket.ts`

### Context

You shipped `lobby:tables` on the server (broadcasts full table list after create/join/leave/start/game:over). The frontend `Lobby.tsx` still uses `setInterval(fetchTables, 5000)` — an infinite AJAX loop. Replace it.

### Requirements

1. In `Lobby.tsx`, remove the `setInterval` polling entirely:

   ```typescript
   // REMOVE this:
   const interval = setInterval(fetchTables, 5000)
   ```

2. Replace with a socket listener:

   ```typescript
   useEffect(() => {
     // Fetch once on mount
     fetchTables()

     // Listen for server-pushed updates
     const socket = getSocket()
     socket.on('lobby:tables', (tables: TableListItem[]) => {
       setTables(tables)
       setIsLoading(false)
     })

     return () => {
       socket.off('lobby:tables')
     }
   }, [])
   ```

3. The socket connection in `Lobby.tsx` needs auth. Check `apps/web/src/lib/socket.ts` — `getSocket()` already attaches the token from localStorage. Verify it works for the lobby page (user is already logged in at this point).

4. Keep the initial `fetchTables()` call on mount as a fallback — the socket event only fires on changes, so we need the initial load via REST.

5. **Type safety:** The `lobby:tables` event type should already be in `ServerToClientEvents` (you added it in your hotfix). Verify Joni's `useGameSocket.ts` doesn't conflict — that hook is only used on the game table page, not the lobby.

### Deliverables

- [ ] `setInterval` polling removed from `Lobby.tsx`
- [ ] Socket listener for `lobby:tables` wired
- [ ] Initial REST fetch on mount still works
- [ ] Tables update in real-time when another player creates/joins/leaves a table
- [ ] No TypeScript errors

---

## SF-01b — Game State Recovery on Reconnect

**Priority:** High (broken UX on page refresh)
**Files to modify:** `apps/server/src/modules/game/game.socket.ts`, `apps/server/src/modules/game/game.service.ts`

### Context

During playtesting, refreshing the browser mid-round showed "Connecting to table..." and sometimes got stuck. The `table:join` / `table:state` event on reconnect sends the basic table and round info, but it doesn't include the current showdown phase state. If you reconnect during fixture reveals or player scoring, the client has no idea what phase the game is in.

### Requirements

1. **Enhance the `table:state` event payload** — When a player joins/rejoins a table that's mid-round, include:

   ```typescript
   {
     ...existingTableState,

     // Current round phase (if mid-round)
     roundPhase?: 'dealing' | 'betting' | 'waiting' | 'fixtures' | 'scoring' | 'reveals' | 'winner',

     // Fixture results revealed so far
     resolvedFixtures?: FixtureResultPayload[],

     // Player scores revealed so far (during showdown)
     revealedPlayerScores?: PlayerScoredPayload[],

     // Current betting state (if mid-betting)
     currentBettingRound?: number,
     currentBet?: number,
     pot?: number,

     // Who's turn it is (if mid-betting)
     activePlayerId?: string,
   }
   ```

2. **Track phase on the server** — You may need to add a `currentPhase` field to the game service's in-memory state (alongside `activeBettingStates`). Update it as each phase transitions:
   - `startRound()` → `'dealing'`
   - `startBettingRound()` → `'betting'`
   - `round:pause` emit → `'waiting'`
   - First `fixture:result` emit → `'fixtures'`
   - `round:scoring` emit → `'scoring'`
   - First `player:scored` emit → `'reveals'`
   - `round:winner` emit → `'winner'`

3. **Collect resolved data** — As fixtures resolve and players are scored, accumulate them in arrays that persist for the round duration:
   - `resolvedFixtures: FixtureResultPayload[]` — append each fixture:result as it resolves
   - `revealedPlayerScores: PlayerScoredPayload[]` — append each player:scored as it emits

4. **Clear on round end** — Reset `currentPhase`, `resolvedFixtures`, and `revealedPlayerScores` when the round completes and a new round starts.

5. **Client-side consumption** — The frontend already has `showdownPhase` state machine and `addFixtureResult` / `addPlayerScoreReveal` actions. In `useGameSocket.ts`, when `table:state` arrives with phase data:
   - Set `showdownPhase` to the received phase
   - Populate `resolvedFixtures` and `revealedPlayerScores` with the catch-up data
   - The components will render the correct state immediately

6. **Test:** Start a game, wait until fixtures are revealing (Phase 1), refresh the browser. The game should show the table with fixtures that have already resolved, and continue receiving new `fixture:result` events for the remaining matches.

### Deliverables

- [ ] `table:state` includes current round phase and accumulated data
- [ ] Server tracks `currentPhase` and resolved data per table
- [ ] Client reconstructs correct visual state on reconnect
- [ ] Refresh during fixture reveals shows already-resolved fixtures
- [ ] Refresh during player scoring shows already-revealed players
- [ ] Refresh during betting shows current bet state and whose turn it is
- [ ] State cleared properly between rounds

---

## SF-01c — Fix `hasFolded` Test Type Error

**Priority:** Low (5 minute fix)
**Files to modify:** `apps/server/src/__tests__/game-engine.test.ts`

### Context

You flagged in your persona file that `game-engine.test.ts` mock players are missing the `hasFolded` field, causing a TypeScript error. Quick fix.

### Requirements

1. Add `hasFolded: false` to all mock player objects in `game-engine.test.ts`
2. Run `pnpm typecheck` — must pass with 0 errors
3. Run `pnpm test` in `apps/server/` — all 42 tests still green

### Deliverables

- [ ] `hasFolded` added to mock players
- [ ] `pnpm typecheck` clean
- [ ] 42 tests passing

---

## SF-01d — Investigate Issue #9 (YOU Badge on Wrong Player)

**Priority:** High (UX bug)
**Files to check:** `apps/server/src/modules/game/game.service.ts` (player:scored emission), `apps/web/src/components/game/PlayerScoreCard.tsx`

### Context

In the showdown polish ticket (`jira/sprint-2/shared/showdown-polish.md`), Issue #9 reports the "YOU" badge showed on Rex-Dan22 (a bot) instead of the human player. This could be:

**A) Server-side:** The `player:scored` event sends `userId` but no `isBot` or `isYou` flag, and the client is matching incorrectly.

**B) Frontend-side:** The `PlayerScoreCard` component is comparing the wrong field (e.g., `seatIndex` instead of `userId`, or the local user ID isn't available in the overlay context).

### Requirements

1. **Check the `player:scored` payload** — Does it include `userId`? Is the `userId` correct for each player (bot users have their own UUIDs)?

2. **Check if the frontend has access to the local user ID** inside `PlayerScoreCard` / `RoundResultsOverlay`. The local user comes from `authStore.user.id`. Is that value being passed down to the overlay components?

3. **If server-side fix needed:** Add `isBot: boolean` to the `PlayerScoredPayload` type and populate it based on the user's email containing `@bot` or `.bot`.

4. **If frontend fix needed:** Ensure `PlayerScoreCard` receives `currentUserId` and compares `result.userId === currentUserId` to determine the YOU badge. Post the fix details in the shared ticket's Communication Log.

5. **Post findings** in `jira/sprint-2/shared/showdown-polish.md` Communication Log — Joni is waiting to know if this is a server or frontend issue.

### Deliverables

- [ ] Root cause identified (server or frontend)
- [ ] Fix applied
- [ ] "YOU" badge only shows on the actual human player
- [ ] Finding posted in shared showdown-polish.md Communication Log

---

## Delivery Log

_Update this section after completing each fix. Clodi reads this file across sessions to track your progress._

### SF-01c — hasFolded Test Fix

**Status:** ✅ Done
**Fix:** Added `hasFolded: false` to `makePlayers()` in `game-engine.test.ts`. One-line change. 42 tests green, typecheck clean.
**Files:** `apps/server/src/__tests__/game-engine.test.ts`

### SF-01a — Lobby Socket Wiring

**Status:** ✅ Done
**Root cause:** `setInterval(fetchTables, 5000)` polling forever. Server `lobby:tables` event was already emitting but never consumed on the client.
**Fix:** Replaced polling with `socket.on('lobby:tables', ...)` listener + single initial REST fetch on mount. Updated `LobbyTableItem.status` to `TableStatus` in shared types. Exported `FixtureResultPayload`, `PlayerScoredPayload`, `RoundWinnerPayload`, `LobbyTableItem` from `@wpc/shared` index.
**Files:** `apps/web/src/pages/Lobby.tsx`, `packages/shared/types/socket-events.ts`, `packages/shared/index.ts`

### SF-01d — Issue #9 Investigation + opponentTeam data

**Status:** ✅ Done
**Root cause (Issue #9):** Server was always correct — `userId` and `isBot` in `player:scored` were accurate. Bug was 100% frontend. Joni's fix is correct.
**opponentTeam (Issue #5 unblocked):** `player:scored.cardScores[i].fixture` now includes `opponentTeam: { name, code, flagUrl } | null`. Team loading in `resolveRound` refactored to pull all fixture team IDs in one query.
**Findings posted:** `showdown-polish.md` Communication Log (Soni, Apr 2).
**Files:** `apps/server/src/modules/game/game.service.ts`, `packages/shared/types/socket-events.ts`, `packages/shared/index.ts`

### SF-01b — Reconnect State Recovery

**Status:** ✅ Done
**Design:** `roundPhaseMap: Map<tableId, RoundPhaseState>` tracks current phase + accumulated `resolvedFixtures[]` + `revealedPlayerScores[]` per table. Cleared on `clearRoundPhase(tableId)` at round start and game:over.
**Phases tracked:** `dealing → betting → waiting → fixtures → scoring → reveals → winner`
**Reconnect flow:** `getTableState()` in `game.socket.ts` includes phase data in `roundInfo`. `useGameSocket.ts` replays resolved fixtures and player scores via existing store actions on `table:state`.
**42 tests green. Server + web typecheck clean.**
**Files:** `apps/server/src/modules/game/game.service.ts`, `apps/server/src/modules/game/game.socket.ts`, `apps/web/src/hooks/useGameSocket.ts`
