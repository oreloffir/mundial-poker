# Code Review: Joni's PR #1 — Inline Score Reveals + Flow Bug Fixes

**Reviewer:** Soni (S11 Teaching Review)
**PR:** feat: inline score reveals + flow bug fixes
**Date:** 2026-04-02
**Verdict:** ✅ APPROVED WITH FOLLOW-UPS — merge after fixing C1. Open tickets for M1–M4.

---

## Overall Assessment

Really strong PR, Joni. The showdown sequencing (`fixture:result` → `player:scored` → `round:winner`) is wired up cleanly, the atomic state reset in `round:start` is exactly the right pattern (J5 comment confirms you understood why), and the reconnect replay logic is a thoughtful addition. The CSS architecture in `PlayerSeat` is also well-considered — the SVG ring timer avoids layout thrash.

Three things to internalize from this review:

1. **Type contracts belong in `packages/shared/`**. When you work around a missing type with `as unknown as { ... }`, that's the code telling you a contract needs updating — don't patch around it, fix the source.
2. **`as never` is a red flag, not a solution**. It tells TypeScript "I know better than you." Sometimes that's true, but here it's masking a real gap between the server's actual payload and our shared types.
3. **Silent catch blocks are silent bugs**. `catch { /* */ }` means the user stares at a spinner forever if the API call fails. Always surface errors, even if just to the store.

---

## Comments

### C1 — HIGH — `toTeamCard()` hardcodes `confederation: 'UEFA'` (NEEDS FIX BEFORE MERGE)

**File:** `apps/web/src/hooks/useGameSocket.ts`, line 18

```typescript
function toTeamCard(c: RoundCardPayload): TeamCard {
  return {
    teamId: c.teamId,
    fixtureId: c.fixtureId,
    team: {
      id: c.teamId,
      name: c.teamName,
      code: c.teamCode,
      flagUrl: c.flagEmoji,
      tier: c.tier as TeamTier,
      confederation: 'UEFA' as Confederation, // ← BUG: every team tagged as UEFA
      fifaRanking: c.fifaRanking,
    },
  }
}
```

`RoundCardPayload` in `packages/shared/types/socket-events.ts` doesn't have a `confederation` field. So right now every team — Brazil, Argentina, Japan, Australia — is stored as `confederation: 'UEFA'` in the client state.

This doesn't break the current UI because `confederation` isn't rendered anywhere yet. But it will silently corrupt data when we add confederation-based filtering, bracket logic, or display in S4–S6. Finding this bug then will be much harder.

**Fix (two parts):**

Part 1 — Soni will add `confederation` to `RoundCardPayload` in `packages/shared/types/socket-events.ts`:

```typescript
export interface RoundCardPayload {
  readonly teamId: string
  readonly teamName: string
  readonly teamCode: string
  readonly flagEmoji: string
  readonly tier: string
  readonly confederation: string // ADD THIS
  readonly fifaRanking: number
  readonly fixtureId: string
}
```

Part 2 — Once the field exists, update the cast:

```typescript
confederation: c.confederation as Confederation,
```

I'm tracking Part 1 as a Soni side fix in my task list. For now, change the hardcoded `'UEFA'` to `(c as unknown as { confederation: string }).confederation as Confederation ?? 'UEFA'` so at least the intent is explicit and the fallback is documented. Don't leave `'UEFA'` with no comment — the next dev won't know it's wrong.

---

### C2 — MEDIUM — Root cause of all `as never` casts: `GameState` doesn't match the actual `table:state` payload

**File:** `packages/shared/types/game.types.ts`, line 169; `apps/web/src/hooks/useGameSocket.ts`, lines 43–134

This is the most important architectural finding in this PR. Look at what `GameState` currently says:

```typescript
export interface GameState {
  readonly table: Table
  readonly currentRound: Round | null
  readonly showdownResults: readonly ShowdownResult[] | null
}
```

Now look at what the server actually emits for `table:state` and what you had to do to consume it:

```typescript
socket.on('table:state', (rawState) => {
  const state = rawState as unknown as {  // ← forced to cast because GameState doesn't match
    table: typeof rawState.table
    roundInfo: null | {
      roundId: string
      roundNumber: number
      // ... 15 more fields ...
      resolvedFixtures?: unknown[]         // ← typed as unknown because GameState has no roundInfo
      revealedPlayerScores?: unknown[]     // ← same
    }
  }
```

You didn't create this problem — the server returns `{ table, roundInfo }` but `GameState` says `{ table, currentRound, showdownResults }`. Those are different shapes. But the workaround of `as unknown as { ... }` then forces `resolvedFixtures` to be `unknown[]` which then requires `as never` at lines 115 and 120.

The right fix is for Soni to update `GameState` (or create a `TableStatePayload` type) to match what the server actually sends, including the reconnect fields. Once that type exists, your handler becomes:

```typescript
socket.on('table:state', (state) => {
  // state is already typed — no cast needed
  store.getState().setTable(state.table)
  if (state.roundInfo) {
    // state.roundInfo.resolvedFixtures is FixtureResultPayload[] — no as never
  }
})
```

I'm filing this as a Soni task (schema alignment). For now your workaround is acceptable — it's better than guessing the wrong type. Add a `// TODO(S11): remove cast once GameState is updated — ticket #XXX` comment so it doesn't live forever.

---

### C3 — MEDIUM — `as never` casts in reconnect replay block

**File:** `apps/web/src/hooks/useGameSocket.ts`, lines 113–122

```typescript
if (ri.resolvedFixtures?.length) {
  for (const f of ri.resolvedFixtures) {
    store.getState().addFixtureResult(f as never) // ← as never
  }
}
if (ri.revealedPlayerScores?.length) {
  for (const s of ri.revealedPlayerScores) {
    store.getState().addPlayerScoreReveal(s as never) // ← as never
  }
}
```

This is a direct consequence of C2 — `resolvedFixtures` is `unknown[]` so you have to cast to call the store method. Fixing C2 (proper payload type) makes these `as never` casts go away automatically.

**Why `as never` is especially bad here:** `as never` tells TypeScript "this type satisfies every possible type constraint." If the server sends the wrong shape — say `resolvedFixtures` contains error objects instead of `FixtureResultPayload` — TypeScript won't catch it, and `addFixtureResult` will silently operate on garbage data.

Until C2 is fixed, prefer `as FixtureResultPayload` with an explicit import. At least that documents intent and gives you some autocomplete:

```typescript
import type { FixtureResultPayload, PlayerScoredPayload } from '@wpc/shared'
// ...
store.getState().addFixtureResult(f as FixtureResultPayload)
store.getState().addPlayerScoreReveal(s as PlayerScoredPayload)
```

---

### C4 — MEDIUM — Silent catch blocks swallow user-facing errors

**File:** `apps/web/src/pages/GameTable.tsx`, lines 52–64 and 66–73

```typescript
const handleAddBot = async () => {
  setBotLoading(true)
  try {
    const { data } = await api.post(`/tables/${tableId}/add-bot`)
    if (data?.data?.table) {
      useGameStore.getState().setTable(data.data.table)
    }
  } catch {
    /* */
    // ← user sees nothing, loading spinner stops, that's it
  } finally {
    setBotLoading(false)
  }
}

const handleStartGame = async () => {
  try {
    await api.post(`/tables/${tableId}/start`)
    refreshState()
  } catch {
    /* */
    // ← game start fails silently
  }
}
```

If `add-bot` or `start` returns a 4xx/5xx, the button just re-enables and nothing happens. The host has no idea why the bot didn't appear or why the game didn't start. The error store is already there — use it:

```typescript
} catch (err) {
  const message = err instanceof Error ? err.message : 'Failed to add bot'
  useGameStore.getState().setError(message)
}
```

This pattern (swallowing API errors) is the most common source of "it just didn't work" bug reports. Treat every API call like it will fail — because in production, it will.

---

### C5 — MEDIUM — `store` in `useEffect` deps is misleading

**File:** `apps/web/src/hooks/useGameSocket.ts`, line 365

```typescript
  }, [tableId, store])
```

`store` here is the Zustand store module itself (i.e., `useGameStore` — not a selector result). It's a stable reference — it will never change across renders. So this won't cause infinite re-renders. But it looks like a mistake to anyone reading the code: deps are supposed to be reactive values that, when they change, trigger cleanup and re-setup.

Two options:

Option A — Remove `store` from deps and add a comment:

```typescript
  }, [tableId]) // store is stable (Zustand module ref) — not a reactive dep
```

Option B — Declare store ref outside useEffect:

```typescript
const storeRef = useRef(useGameStore)
// use storeRef.current inside effect
}, [tableId])
```

Either is fine. Just don't leave it ambiguous.

---

### C6 — MEDIUM — `blinds:posted` handler shows "CALL" badge instead of "SB"/"BB"

**File:** `apps/web/src/hooks/useGameSocket.ts`, lines 192–199

```typescript
socket.on('blinds:posted', (payload) => {
  store.getState().setPlayerAction(payload.userId, {
    action: 'CALL', // ← wrong — this is a blind, not a call
    amount: payload.amount,
    timestamp: Date.now(),
  })
})
```

The `blinds:posted` type has `type: 'SB' | 'BB'`, but the handler maps it to `action: 'CALL'`. So the SB and BB players get a blue "Call 5" / "Call 10" badge at the start of every round instead of "SB" / "BB".

The `BADGE_STYLES` in `PlayerSeat.tsx` doesn't have entries for `'SB'` or `'BB'`, so you'd need to add those. But the fix here is to use `payload.type`:

```typescript
store.getState().setPlayerAction(payload.userId, {
  action: payload.type, // 'SB' or 'BB'
  amount: payload.amount,
  timestamp: Date.now(),
})
```

Then add `SB` and `BB` entries to `BADGE_STYLES` in `PlayerSeat.tsx`.

---

### C7 — LOW — `board:reveal` handler uses `as never[]`

**File:** `apps/web/src/hooks/useGameSocket.ts`, lines 201–207

```typescript
socket.on('board:reveal', (fixtureData) => {
  const fixtureArray = fixtureData as never[]   // ← unnecessary cast
  store.getState().setFixtures(fixtureArray)
```

`board:reveal` is typed in `ServerToClientEvents` as `(cards: readonly TeamCard[]) => void`. Since `socket.ts` binds the socket with `ServerToClientEvents`, `fixtureData` IS already `readonly TeamCard[]`. The cast to `never[]` is unnecessary and hides the type.

```typescript
socket.on('board:reveal', (fixtureData) => {
  store.getState().setFixtures([...fixtureData])  // spread to mutable if needed
```

Check what `setFixtures` expects — if it accepts `readonly TeamCard[]` you don't even need the spread.

---

### C8 — LOW — `key={player.chips}` causes full DOM re-mount on every chip change

**File:** `apps/web/src/components/game/PlayerSeat.tsx`, line 311

```typescript
<div
  key={player.chips}   // ← re-mounts entire chip badge div on every chip change
  data-testid={`seat-balance-${player.seatIndex}`}
  ...
>
```

Using a value as a React `key` is a signal to React: "if this key changes, destroy this element and create a new one from scratch." Here you're using `player.chips` as the key, so every time chips change, the entire chip badge div unmounts and remounts. This means:

- The `transition` styles you have on border-color and color don't animate — the element doesn't exist yet during the transition
- It creates unnecessary DOM churn for what should be a simple style change

The chip animation is already handled by `chipAnim` state + CSS transitions. Just remove the `key` prop from this div. The `chipAnim` effect (lines 121–129) is correct — it detects the change, sets the animation state, and clears it after 800ms.

---

### C9 — LOW — Action badge IIFE in JSX is unusual

**File:** `apps/web/src/components/game/PlayerSeat.tsx`, lines 178–200

```typescript
{lastAction &&
  !inShowdown &&
  (() => {
    const badge = BADGE_STYLES[lastAction.action]
    return badge ? (
      <div key={lastAction.timestamp} ...>
```

The IIFE (`(() => { ... })()`) inside JSX is valid but uncommon. Most React devs would expect either a ternary or a helper component. It makes the render tree harder to scan. A tiny helper avoids the pattern entirely:

```typescript
function ActionBadge({ action, timestamp }: { action: string; timestamp: number }) {
  const badge = BADGE_STYLES[action]
  if (!badge) return null
  return <div key={timestamp} ...>...</div>
}
```

Then in render: `{lastAction && !inShowdown && <ActionBadge action={lastAction.action} timestamp={lastAction.timestamp} />}`

Not blocking — but if you find yourself using an IIFE in JSX, that's usually a sign a helper component wants to exist.

---

### C10 — ARCHITECTURE NOTE — `useGameSocket` is doing a lot

**File:** `apps/web/src/hooks/useGameSocket.ts`

This hook is 393 lines handling: socket setup, 14 event listeners, reconnect replay, winner banner delay, 3 callbacks. That's a lot of surface area for one hook.

Worth knowing for S4: when we add live match API events, this file grows again. Consider splitting:

- `useSocketSetup(tableId)` — socket init, cleanup, join/leave
- `useRoundEvents(socket, store)` — `round:start`, `round:pause`, `round:winner`
- `useBettingEvents(socket, store, userId)` — `bet:prompt`, `bet:update`, `blinds:posted`
- `useShowdownEvents(socket, store)` — `fixture:result`, `player:scored`

Not a blocking concern for this PR. I'm flagging it so you have an architectural option when the file gets harder to navigate.

---

## Contract Check

| Event            | Socket-Events Type         | Handler                                            | Status                   |
| ---------------- | -------------------------- | -------------------------------------------------- | ------------------------ |
| `round:start`    | `RoundStartPayload`        | Uses typed fields (`sbSeatIndex`, `bbSeatIndex` ✓) | ✅ Aligned               |
| `round:winner`   | `RoundWinnerPayload`       | `data.winnerIds`, `data.totalPot` ✓                | ✅ Aligned               |
| `bet:prompt`     | `BetPromptPayload`         | All fields used correctly ✓                        | ✅ Aligned               |
| `bet:update`     | `BetUpdatePayload`         | `payload.pot`, `payload.chips` ✓                   | ✅ Aligned               |
| `fixture:result` | `FixtureResultPayload`     | Passed directly to store — correct ✓               | ✅ Aligned               |
| `player:scored`  | `PlayerScoredPayload`      | Passed directly to store — correct ✓               | ✅ Aligned               |
| `table:state`    | `GameState` (wrong shape)  | `as unknown as {...}` workaround                   | ⚠️ C2 — Soni fix pending |
| `blinds:posted`  | `{ userId, amount, type }` | Sets `action: 'CALL'` — wrong                      | ⚠️ C6 — fix in follow-up |
| `board:reveal`   | `readonly TeamCard[]`      | `as never[]` unnecessary                           | ⚠️ C7 — easy fix         |

---

## What to Track

| ID  | Severity | Owner       | Action                                                                                   |
| --- | -------- | ----------- | ---------------------------------------------------------------------------------------- |
| C1  | HIGH     | Joni + Soni | Fix hardcoded `'UEFA'` (temp fallback) + Soni adds `confederation` to `RoundCardPayload` |
| C2  | MEDIUM   | Soni        | Update `GameState` / add `TableStatePayload` in `packages/shared/`                       |
| C3  | MEDIUM   | Joni        | Update casts once C2 is done                                                             |
| C4  | MEDIUM   | Joni        | Add error handling to `handleAddBot` + `handleStartGame`                                 |
| C5  | MEDIUM   | Joni        | Remove `store` from deps array                                                           |
| C6  | MEDIUM   | Joni        | Use `payload.type` for blind badge + add SB/BB badge styles                              |
| C7  | LOW      | Joni        | Remove unnecessary `as never[]` in `board:reveal`                                        |
| C8  | LOW      | Joni        | Remove `key={player.chips}` from chip badge div                                          |
| C9  | LOW      | Joni        | Optional: extract `ActionBadge` component                                                |

---

## Good Work

- The atomic `store.setState({...})` in `round:start` (J5) — exactly right, eliminates intermediate renders.
- `MIN_WINNER_BANNER_MS` guard with `winnerShownAtRef` — thoughtful UX, handles the race between server speed and minimum display time.
- `pendingRoundStartRef` cleanup in the effect teardown — no timer leak.
- `setRevealedFixtureCount(-1)` reset on reconnect — the detail of resetting to -1 (not 0) to signal "not yet revealed" shows you understood the initial-state contract.
- `PlayerSeat.tsx` SVG timer ring uses `strokeDashoffset` not `width` — correct, avoids layout reflow.
- All cleanup in the effect return: every `socket.off()` and `clearTimeout` accounted for.

Solid work overall. Get C1 done today, file tickets for C2–C8, and this merges.
