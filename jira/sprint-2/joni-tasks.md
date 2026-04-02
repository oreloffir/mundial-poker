# Joni — Sprint 2 Tasks

**Sprint:** April 2–9, 2026
**Role:** Junior Developer — Frontend / UI
**Total tasks:** 3 (J10, J11, J12)

Read the [Sprint Brief](./SPRINT-BRIEF.md) first for full context, dependencies, and schedule.

---

## J10 — BB Field Read-Only Fix + Remaining QA Items

**Priority:** High (Sprint 1 carry-over)
**Branch:** `fix/bb-readonly-and-qa`
**Deadline:** April 3

### Context

Sprint 1 QA found that the BB field accepts invalid values. Orel's decision: make BB read-only, always auto-calculated as 2x SB. Also bundling the remaining testid requests from Mark.

### Requirements

1. **BB field read-only** in `CreateTableModal.tsx`:
   - Remove `onChange` handler from BB input
   - Set BB value as `smallBlind * 2` always
   - Add `readOnly` attribute + visual styling: dimmer background (`rgba(255,255,255,0.03)`), muted border, `cursor: default`, text color `var(--text-dim)`
   - Add helper text below: `"Always 2× the small blind"` in `--text-muted`, `text-xs`
   - Remove any BB validation error logic (can't be wrong if user can't edit it)
   - Keep `data-testid="big-blind-input"` on the element

2. **SB validation** still works: SB=0 shows error, SB < 1 blocks submission

3. **TestIDs from Mark's TESTID-REQUESTS.md** — add any remaining testids Mark requested that aren't already in place. Check `apps/web/e2e/TESTID-REQUESTS.md` for the list.

### Files to modify

- `apps/web/src/components/lobby/CreateTableModal.tsx`
- Any files needing additional testids per Mark's request list

### Deliverables

- [ ] BB field read-only, always 2x SB
- [ ] Helper text visible below BB
- [ ] Visual distinction (dimmer styling)
- [ ] SB=0 validation still works
- [ ] All testids from Mark's request list added

**Estimated effort:** 3 hours

---

## J11 — Fix `useGameSocket.ts` TypeScript Errors + Pot TestID

**Priority:** Medium
**Branch:** `fix/testids-and-typescript`
**Deadline:** April 3

### Context

Two loose ends from Sprint 1: a missing `pot-total` testid and TypeScript errors in useGameSocket.ts where `players:update` isn't in the shared socket event types.

### Requirements

1. **Pot testid** — In `PokerTable.tsx`, add `data-testid="pot-total"` to the element rendering the pot amount inside `PotDisplay`

2. **TypeScript fix** — The `players:update` event isn't declared in `ServerToClientEvents` in `@wpc/shared`:
   - Add `'players:update': (players: readonly TablePlayer[]) => void` to `ServerToClientEvents` in `packages/shared/types/socket-events.ts`
   - OR fix the event name in `useGameSocket.ts` to match what the server actually emits
   - `pnpm typecheck` must pass with 0 errors

### Files to modify

- `apps/web/src/components/game/PokerTable.tsx` — pot-total testid
- `packages/shared/types/socket-events.ts` — add `players:update` type
- `apps/web/src/hooks/useGameSocket.ts` — fix any remaining TS errors

### Deliverables

- [ ] `data-testid="pot-total"` on pot amount element
- [ ] `pnpm typecheck` passes with 0 errors

**Estimated effort:** 1-2 hours

---

## J12 — Showdown Frontend Experience

**Priority:** High (the defining UX of Mundial Poker)
**Branch:** `feat/showdown-frontend-experience`
**Deadline:** April 8

> **DEPENDS ON:** Soni's S6 (new socket events). Start with J10 + J11 first. Begin J12 once S6 events are available.
>
> **DESIGN SPEC:** Doni's full design is at `docs/design/end-of-round-spec.md` — read it before writing any code. It has exact colors, animations, mobile layout, and component breakdown.

### Context

Soni is restructuring the server to emit progressive events instead of dumping all data at once. The old `round:results` and `round:showdown` events are being replaced with:

- `fixture:result` — one per match, arriving every ~5s during the 30s wait
- `round:scoring` — brief signal after all fixtures resolved
- `player:scored` — one per player, lowest score first, every ~2.5s, with FULL team + fixture + score breakdown data
- `round:winner` — final event with winner IDs and pot distribution

Your job: consume these new events and build a visual experience that tells the story of each round's outcome.

### Doni's design decisions (follow these)

| Phase | Location | Why |
|-------|----------|-----|
| Fixture reveals | On the table (no overlay) | Players see each other's reactions. Social moment. |
| Calculating | Lightweight overlay, 2s only | Pure transition beat. Progress bar + text. |
| Player scores | Full-screen overlay | The breakdown story needs the full canvas. |
| Winner | Back to table | Chip movement, seat reactions — social again. |

**Components from Doni's spec:** 6 new components to build, 2 to delete (`ShowdownOverlay.tsx`, `WaitingOverlay.tsx`). The biggest new pieces are `PlayerScoreCard` + `TeamScoreSubCard`. See the spec for full details.

**Score breakdown card:** Two team sub-cards side by side. Each shows: match result → score component rows (only shown when non-zero) → sub-total. Grand total below in Cinzel gold. Rows stagger in at 150ms each, score counts up from 0.

**Design answers from Clodi:**
- **Folded players:** Show dimmed in a bottom strip with "Folded" label. Don't omit them.
- **Bots:** Show 🤖 indicator on avatar. Players should know who's a bot.
- **Split pot:** `"{Player1} & {Player2} split the pot — 100 chips each"`. 3+ way: `"3-way split — 67 chips each"`.
- **Card flip delay:** Trust the server's 2.5s gap between `player:scored` events. Don't add client-side delays on top. Just render when the event arrives.

### The 5 phases to implement

#### Phase 1 — Matches in Progress (during 30s wait)

**Event:** `round:pause` fires first, then `fixture:result` events arrive one at a time.

**Current:** Blank "Matches in Progress" spinner. All fixture scores appear at once.

**New behavior:**
- When `round:pause` fires: show a "Matches in Progress" state. Fixture cards show "VS" between teams.
- When each `fixture:result` arrives: update THAT specific fixture card with the match score. Animate the transition (flash, scale, glow — whatever Doni designs).
- Highlight fixtures that contain YOUR teams differently (the player's own cards). If you're holding Brazil and Brazil just won 3-0, that fixture should feel personal.
- Show a progress indicator: "2 of 5 matches complete" or a progress bar.

**Store updates:**
```typescript
// In useGameSocket.ts
socket.on('fixture:result', (result) => {
  // Update the specific fixture in the fixtures array
  // Trigger animation on that fixture card
})
```

#### Phase 2 — Calculating Scores (~2 seconds)

**Event:** `round:scoring` fires after all fixtures resolved.

**New behavior:**
- Brief transition state: dim the fixture board slightly, show "Calculating scores..." text or animation
- This is a dramatic pause — make it feel intentional, not like lag
- Duration: ~2 seconds before player reveals start

#### Phase 3 — Player Score Reveals (2.5s per player)

**Event:** `player:scored` events arrive one at a time, lowest score first. Winner is last.

**This is the most important phase.** Each `player:scored` event includes:
```typescript
{
  userId: string
  seatIndex: number
  hand: [{ teamId, team: { name, code, flagUrl, ... } }, ...]
  cardScores: [{
    teamId, team, fixtureId, fixture: { homeGoals, awayGoals, ... },
    baseScore, goalBonus, cleanSheetBonus, penaltyModifier, totalScore
  }]
  totalScore: number
  rank: number
  isWinner: boolean
}
```

**New behavior for each player reveal:**
1. Flip their cards face-up (show team flags + codes)
2. Show the score breakdown for each card — this is the hero element:
   ```
   🇧🇷 Brazil vs 🇷🇸 Serbia → 3-0
   Win ............. +5
   High Scorer ...... +4
   Clean Sheet ...... +2
   ─────────────────────
   = 11 pts
   ```
3. Animate the total score (count up from 0 to final)
4. Show bonuses appearing one by one (if Doni designs micro-animations)
5. After all cards scored: show player's total hand score prominently

**Where to render this:** Evaluate these options (defer to Doni's mockup if available):
- **Option A:** Expand from the player's seat position (overlay near their avatar)
- **Option B:** Center-stage spotlight area (one large card in the middle)
- **Option C:** Side panel that slides in
- Needs to work on both desktop AND mobile landscape

**Existing ShowdownOverlay.tsx:**
- This component at `apps/web/src/components/game/ShowdownOverlay.tsx` has score count-up animations and ranked result display
- It's currently unused — evaluate whether to resurrect and adapt it for the new `player:scored` data structure, or build fresh
- If the component's animation approach is good, reuse the animation logic even if you rebuild the layout

#### Phase 4 — Winner Announcement

**Event:** `round:winner` fires after all players revealed.

**New behavior:**
- Winner's seat gets special treatment (glow, highlight, gold border)
- Banner shows: winner name + **correct chip share** from `potDistribution[winnerId]` (not total pot — important for split pots)
- If multiple winners (tie): show all winners with equal share
- Chips animate from pot to winner's seat (or at minimum, pot number transitions down while winner's chips flash up)

**Fix the current bug:** The old winner banner showed the total `pot`, not the winner's actual share. With `round:winner` providing `potDistribution`, display the correct amount per winner.

#### Phase 5 — Transition to Next Round

**New behavior:**
- After winner display (~3-5s), clear all showdown state
- Reset should be atomic (same pattern as your J1/J5 fix from Sprint 1)
- Brief "Round {N}" announcement before new cards deal
- SB/BB badges shift to new positions
- Clean fade — no stale data from previous round

### Store changes needed

In `gameStore.ts`, add state for the new phases:
```typescript
// Phase tracking
showdownPhase: 'idle' | 'matches' | 'scoring' | 'revealing' | 'winner' | null

// Fixture results (progressive)
resolvedFixtureIds: string[]  // tracks which fixtures have scores

// Player reveals (sequential)
revealedPlayers: PlayerScoredResult[]  // builds up as events arrive
currentRevealIndex: number

// Winner
winnerData: { winnerIds: string[], potDistribution: Record<string, number>, totalPot: number } | null
```

### Socket event handlers

In `useGameSocket.ts`, replace the old `round:results` and `round:showdown` handlers with:

```typescript
socket.on('fixture:result', (result) => {
  // Add fixture to resolvedFixtureIds
  // Update the fixture in the fixtures array with scores
})

socket.on('round:scoring', () => {
  // Set showdownPhase to 'scoring'
})

socket.on('player:scored', (result) => {
  // Set showdownPhase to 'revealing'
  // Append to revealedPlayers array
  // Increment currentRevealIndex
})

socket.on('round:winner', (data) => {
  // Set showdownPhase to 'winner'
  // Store winnerData
})
```

Remove: `round:results` and `round:showdown` handlers.

### Files to modify

- `apps/web/src/stores/gameStore.ts` — new showdown phase state
- `apps/web/src/hooks/useGameSocket.ts` — new event handlers, remove old ones
- `apps/web/src/components/game/PokerTable.tsx` — orchestrate the 5-phase visual sequence
- `apps/web/src/components/game/FixtureBoard.tsx` — progressive fixture reveal with per-card animation
- `apps/web/src/components/game/PlayerSeat.tsx` — per-player score reveal rendering
- `apps/web/src/components/game/ShowdownOverlay.tsx` — evaluate: resurrect or rebuild
- `apps/web/src/index.css` — animations for score count-up, card flip, fixture flash, winner glow
- NEW component (if needed): `ScoreBreakdown.tsx` — the score card showing team + match + bonus breakdown

### Deliverables

- [ ] Fixtures reveal one at a time during 30s wait (animated per fixture card)
- [ ] Player's own team fixtures highlighted differently
- [ ] "Calculating scores..." transition visible after all fixtures
- [ ] Player hands reveal one at a time, lowest score first
- [ ] Score breakdown visible per card: team → match result → base + bonuses = total
- [ ] Score count-up animation (0 → final)
- [ ] Winner announced last with correct pot share from `potDistribution`
- [ ] Split pot displayed correctly for ties
- [ ] Clean transition to next round (atomic state reset)
- [ ] Works on desktop and mobile landscape
- [ ] Old `round:results` / `round:showdown` handlers removed

### Out of scope

- Sound effects (planned for later)
- Penalty shootout step-by-step animation
- Changing the scoring algorithm
- Backend event structure (that's Soni's S6)

**Estimated effort:** 3-4 days

---

## Delivery Log

_Update this section as you complete tasks._

### J10 — BB Read-Only + QA Items ✅
- **BB input:** `readOnly`, inline style `rgba(255,255,255,0.03)` bg, `rgba(255,255,255,0.06)` border, `var(--text-dim)` text, `cursor: default`. Helper text updated to "Always 2× the small blind". Added `data-testid="big-blind-input"`. Removed `disabled` attr (readOnly is sufficient; disabled blocks form submission of the value).
- **`fixture-card-{n}`:** Replaced old `fixture-scored/fixture-pending` testids with indexed `fixture-card-0` through `fixture-card-4` on each tile in `FixtureBoard.tsx`.
- **`sb-badge` / `bb-badge`:** Added to the blind position `<span>` in `PlayerSeat.tsx`.
- **`player-seat-{n}`:** Added `data-testid="player-seat-{index}"` to seat wrapper divs in `PokerTable.tsx`.
- **`folded-indicator`:** Added to "Folded" span in `PlayerSeat.tsx`.
- **`bet-timer`:** Added `data-testid="bet-timer"` to the timer row wrapper in `BettingControls.tsx`.
- **`chip-denomination-{value}`:** Added `data-testid="chip-denomination-{denom}"` to each chip button in `BettingControls.tsx`.
- Commit: `fix: BB read-only + all remaining QA testids`

### J11 — TestIDs + TypeScript Fix ✅
- **`pot-total`:** Added `data-testid="pot-total"` to the pot amount `<span>` inside `PotDisplay` in `PokerTable.tsx`.
- **`players:update` TypeScript fix:** Added `'players:update': (players: readonly { readonly userId: string; readonly chips: number }[]) => void` to `ServerToClientEvents` in `packages/shared/types/socket-events.ts`. Removed the `as unknown` cast in `useGameSocket.ts`. `pnpm typecheck` passes with 0 errors.
- **`promptedAt` threading:** The linter had added `promptedAt` as required to `BetPromptState` in `gameStore.ts` and updated `BettingControls`. Wired `promptedAt` through the `table:state` inline betPrompt type and both `setBetPrompt` callsites.
- Commit: bundled with J10 commit

### J12 — Showdown Frontend Experience
**Status:** Fully implemented ✅

#### J12 Full Implementation ✅
- **Phase 1 (waiting):** `FixtureBoard` reads `fixtureResults` from store. Shows all tiles in VS state when `showdownPhase === 'waiting'`. `WaitingBadge` updated to show "N of 5 matches complete" counter.
- **Phase 2 (fixtures):** Each `fixture:result` event → `addFixtureResult` → tile animates to score with `tile-reveal` 0.4s. Uses team data from S6 payload (`homeTeam.code`, `homeTeam.flagUrl`). Score colors follow spec (win=green, draw=gold, loss=muted). Event icons (🔥🧤🥅) from `hasPenalties`.
- **Phase 3 (calculating):** `CalculatingOverlay` — full-screen blur `rgba(5,10,24,0.78)`, ⚽ icon, "Calculating Scores" in Cinzel gold, animated progress bar fills over 1.6s. Fires on `round:scoring`.
- **Phase 4 (reveals):** `RoundResultsOverlay` wraps all Phase 3+4 content. `PlayerScoreCard` — full card flip animation, avatar ring, rank badge, 🤖 for bots, YOU badge for current player, total count-up (0→final over 600ms). `TeamScoreSubCard` — match info + score rows staggered at 150ms each + count-up sub-total. `RevealedPlayerMini` — bottom strip for already-revealed players. `FoldedPlayerStrip` — dimmed folded players alongside revealed strip with "Folded" label. Progress dots in header.
- **Phase 5 (winner):** `WinnerBanner` enhanced — reads from `winnerData.potDistribution[winnerId]` (correct per-winner share, not total pot). Split pot support: "P1 & P2 split — N chips each", "3-way split — N chips each". Gold shimmer top border, `gold-burst` animation, 🏆 trophy.
- **Socket handlers:** Removed old `round:results` + `round:showdown`. Added `fixture:result`, `round:scoring`, `player:scored`, `round:winner`. `round:scoring` is now where `setMyTurn(false)` + `setBetPrompt(null)` fire (definitively safe). `round:start` atomic reset includes showdown phase cleanup.
- **Server fix:** `DEMO_REVEAL_DELAY_MS` → `NEXT_ROUND_DELAY_MS` in `game.service.ts` (Soni's S6 left undefined reference).
- `pnpm typecheck` passes with 0 errors.

#### J12 Prep ✅
- **Read design spec:** `docs/design/end-of-round-spec.md` + `docs/STYLE-GUIDE.md` — understood 5-phase flow, component breakdown, color tokens, animation system.
- **Deleted:** `ShowdownOverlay.tsx`, `WaitingOverlay.tsx` (replaced by new component set per Doni's spec).
- **Scaffolded 6 new components** (props interfaces + TODO stubs, no rendering logic):
  - `FixtureRevealCard.tsx` — single fixture, pending→resolved animation, isMyFixture highlight
  - `ScoringOverlay.tsx` — lightweight "Calculating..." transition (Phase 2)
  - `TeamScoreSubCard.tsx` — single card breakdown: match result + score rows + sub-total (Phase 3)
  - `PlayerScoreCard.tsx` — full-screen hero reveal per player (Phase 3)
  - `WinnerAnnouncement.tsx` — back-on-table winner banner + split pot logic (Phase 4)
  - `FoldedPlayerStrip.tsx` — dimmed bottom strip for folded players (Phase 3)
- **Updated `gameStore.ts`** with showdown phase state machine:
  - `showdownPhase: ShowdownPhase` (`'idle' | 'waiting' | 'fixtures' | 'calculating' | 'reveals' | 'winner'`)
  - `fixtureResults: readonly FixtureResultEvent[]` — builds up as `fixture:result` events arrive
  - `playerScoreReveals: readonly PlayerScoredData[]` — builds up as `player:scored` events arrive
  - `currentRevealIndex: number` — tracks which player is currently being revealed
  - `winnerData: RoundWinnerData | null` — set by `round:winner`
  - Actions: `setShowdownPhase`, `addFixtureResult`, `addPlayerScoreReveal`, `setCurrentRevealIndex`, `setWinnerData`, `resetShowdownPhase`
- `pnpm typecheck` passes with 0 errors after scaffold.
