# Mundial Poker — Complete Game UX Spec (DN1)

**Author:** Doni (Design)
**For:** Joni (Frontend) · Sprint 6 implementation blueprint
**Authorized by:** Clodi / Orel
**Date:** April 3, 2026
**Status:** Approved — implement from this spec

---

## Design Principles

1. **The fixture board is the product.** Every layout decision prioritizes fixture visibility. It is never obscured, never secondary, never optional.
2. **Table is always visible.** No phase of the game covers the table with a full-screen overlay. Scores, results, and winner announcements happen on the table surface.
3. **Mobile landscape is the primary canvas.** 667×375px (iPhone SE landscape). Every frame is designed here first. Desktop is an enhancement layer.
4. **Inline popups, not overlays.** Score reveals happen as per-seat popup badges on the table. `RoundResultsOverlay`, `CalculatingOverlay`, and `RevealedPlayerMini` are retired.
5. **Phase signaling through ambient change.** The game phase communicates through color, border, and subtle animation — not modal interruptions. Players stay in context.
6. **Immutable state, predictable transitions.** UI reflects game state exactly. No speculative rendering, no optimistic updates that don't match server state.

---

## Layout System

### Mobile canvas (primary)

- Viewport: `667 × 375px`
- Top bar: `36px` (`var(--top-bar-h)`)
- Available pitch area: `667 × 339px`
- Table pitch (poker-table-pitch): `min(85vw, calc((100vh - 36px) * 1.6))` ≈ `542 × 339px`, centered
- Betting bar: `absolute bottom-0`, height ~`72px` when open

### Desktop canvas

- Top bar: `48px`
- Table pitch: fills viewport proportionally, wider
- All token values at their default (non-overridden) sizes

### Seat coordinate system

Seats are absolute-positioned inside the pitch div. Index → position:

| Seat | Position anchor | Notes |
|---|---|---|
| 0 | `bottom: 4%`, `left: 50%`, `translateX(-50%)` | Current user default seat, bottom center |
| 1 | `top: 38%`, `left: 5%`, `translate(-50%, -50%)` | Left mid — partially off viewport edge at mobile |
| 2 | `top: 6%`, `left: 24%` | Top left |
| 3 | `top: 6%`, `right: 24%` | Top right |
| 4 | `top: 38%`, `right: 5%` | Right mid — partially off viewport edge at mobile |

### Score popup direction rules

`SeatScorePopup` currently positions with `bottom: 100%` for all seats, which clips the top seats above the viewport. Direction by seat:

| Seats | Direction | CSS |
|---|---|---|
| 0 (bottom center) | Extend UP | `bottom: 100%; top: auto` (current default — keep) |
| 1 (left mid) | Extend RIGHT-UP | `bottom: 80%; left: 100%; transform: none` |
| 2 (top left) | Extend DOWN | `top: 100%; bottom: auto; left: 50%; transform: translateX(-50%)` |
| 3 (top right) | Extend DOWN | `top: 100%; bottom: auto; left: 50%; transform: translateX(-50%)` |
| 4 (right mid) | Extend LEFT-UP | `bottom: 80%; right: 100%; left: auto; transform: none` |

Pass `seatIndex` to `SeatScorePopup` and derive the position style from it. This is the single most implementation-sensitive detail in this spec — top-seat popups clip the viewport if left at `bottom: 100%`.

### Fixture board container

The `FixtureBoard` component is wrapped in a new `FixtureBoardContainer` div in `PokerTable.tsx`. This is **not** a new component file — it's a wrapper div added at the call site.

```tsx
{/* In PokerTable.tsx, around the <FixtureBoard> render */}
<div
  className="fixture-board-container absolute"
  style={{
    top: '18%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(5,10,24,0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: `1px solid ${isWaiting ? 'rgba(212,168,67,0.45)' : 'rgba(255,255,255,0.07)'}`,
    padding: '6px 8px 4px',
    animation: isWaiting ? 'fixture-board-pulse 2s ease-in-out infinite' : 'none',
  }}
>
  <p
    className="text-center font-outfit font-bold uppercase mb-1"
    style={{
      fontSize: '8px',
      letterSpacing: '3px',
      color: 'var(--gold)',
      opacity: 0.7,
    }}
  >
    Live Fixtures
  </p>
  <FixtureBoard ... />
</div>
```

`isWaiting` = `showdownPhase === 'waiting' || showdownPhase === 'fixtures'`

New keyframe in `index.css`:
```css
@keyframes fixture-board-pulse {
  0%, 100% { border-color: rgba(212,168,67,0.25); }
  50%       { border-color: rgba(212,168,67,0.65); }
}
```

---

## Phase Color Reference

| Phase | `showdownPhase` value | Ambient signal | Phase badge color |
|---|---|---|---|
| Idle / dealing | `'idle'` | None | — |
| Waiting for results | `'waiting'` | Fixture board border pulses gold | `var(--gold)` |
| Fixtures revealing | `'fixtures'` | Tile reveals, board pulse continues | `var(--gold)` |
| Calculating | `'calculating'` | Subtle spinner on pot display | `var(--blue)` |
| Score reveals | `'reveals'` | Seat popups appear inline | `var(--green-glow)` |
| Winner | `'winner'` | Winner seat glows, banner on table | `var(--gold-bright)` |

---

## 12 Frames

Each frame is defined mobile-first (667×375). Desktop delta lists only what changes.

---

### Frame 1 — Table Loading

**Phase:** Before `table` data arrives from socket
**State:** `table === null` in gameStore

**Mobile layout:**
- Top bar: `← Leave` button + "Loading..." in Cinzel gold
- Center: spinner `w-8 h-8 border-2 rounded-full animate-spin` in gold, `borderTopColor: transparent`
- Below spinner: "Connecting to table..." in `var(--text-dim)`
- No pitch, no seats, no betting bar

**Key detail:** This is the only frame without the pitch. Keep it centered and minimal — players just need to know the connection is in progress.

**Desktop delta:** None — identical.

---

### Frame 2 — Waiting for Players (Lobby)

**Phase:** `table.status === 'WAITING'`
**State:** Players are seated but game hasn't started

**Mobile layout:**
- Top bar: table name + player count (e.g., "2/5") + `+ Add Bot` button + `Start Game` button (disabled until ≥2 players)
- Pitch: rendered, `PokerTable` visible
- Seats: filled seats show avatar + name + chip count; empty seats show dashed circle with "Empty" label
- No cards in seats (none dealt)
- No fixture board (no round in progress)
- No betting bar
- Pot display: hidden or `0`

**YOU badge:** Visible on current user's seat. No blind badges (no round).

**Start Game button:** `disabled` when `table.players.length < 2` — `opacity-40 cursor-not-allowed`.

**Desktop delta:** Top bar has more horizontal padding; seat labels larger.

---

### Frame 3 — Dealing

**Phase:** Round started, cards being distributed
**State:** `currentRound` exists, `myHand` is empty or populating, `showdownPhase === 'idle'`

**Mobile layout:**
- Top bar: table name + round number + chip count
- Pitch: full poker table
- Seats: avatars + chip balances + blind position badges (SB/BB) appear on newly assigned seats
- Current user's seat: cards animate in via `card-deal 0.3s ease-out both`
- Opponent seats: face-down cards appear (2x `FaceDownCard` per seated player) via same animation
- Fixture board: **not yet visible** (no fixtures loaded for this round)
- Betting bar: not active (not player's turn)
- Pot: `0` or small amount from blinds

**Card deal stagger:** Cards animate in with a small delay per seat so they appear to be dealt sequentially. Implement via `animationDelay` on the card container, `0.1s × seatIndex`.

**Desktop delta:** Cards slightly larger, more visible deal animation path.

---

### Frame 4 — Betting (Not My Turn)

**Phase:** Betting in progress, another player's turn
**State:** `myTurn === false`, `activeTurn` points to another player

**Mobile layout:**
- Active player: timer ring visible (green → gold → red), seat container has `rgba(46,204,113,0.05)` tint
- Action badge: most recent action floats above active player's avatar (`badge-pop 2s ease-out forwards`)
- My seat (current user): cards face-up, YOU badge, no timer ring
- Opponents: face-down cards, dim avatars for folded players
- Fixture board: **not yet visible during betting phase** (fixtures reveal after all bets are placed)
- Betting bar: **not visible** (not my turn)
- Pot: updates as bets come in — `pot-flash 0.6s` animation on change

**Desktop delta:** Timer ring larger, action badges slightly larger font.

---

### Frame 5 — Betting (My Turn)

**Phase:** Betting in progress, current user's turn
**State:** `myTurn === true`, `betPrompt` populated

**Mobile layout:**
- My seat: timer ring active (green → gold → red), seat tinted
- Betting bar: slides in from bottom — `absolute bottom-0 left-0 right-0 z-30`
  - Glassmorphism: `rgba(5,10,24,0.82)` + `blur(20px)`
  - Gold top border: `1px solid rgba(212,168,67,0.12)`
  - Content: `BettingControls` component, `max-w-xl mx-auto`
- `BettingControls` shows: Fold / Check (or Call) / Raise buttons + hand preview mini-cards
- Raise drawer: hidden by default, expands via `max-height` transition when Raise is selected
- Fixture board: not visible during betting (keeps layout clean under time pressure)

**Critical:** The betting bar must not obscure the timer ring on the current user's seat. Seat 0 is at `bottom: 4%` — the betting bar sits below it. On mobile, test that the seat is fully visible above the bar.

**Desktop delta:** Betting bar slightly taller, chip denomination buttons at `36px` (full size), preset button text at `0.625rem`.

---

### Frame 6 — Waiting for Results

**Phase:** All bets placed, waiting for match results
**State:** `showdownPhase === 'waiting'`

**Mobile layout:**
- Betting bar: gone (betting closed)
- All player seats: visible, no timers
- Fixture board container: **appears**, "LIVE FIXTURES" label, pulsing gold border
- Fixture tiles: show pending fixtures with `rgba(13,20,36,0.4)` background and `rgba(255,255,255,0.07)` border
- Below fixture board: "Waiting for match results..." text with animated ellipsis (blink animation), centered, `var(--text-dim)`
- Pot: shows current pot total, no animation
- Cards: remain in seats (face-up for current user, face-down for opponents)

**The fixture board label ("LIVE FIXTURES") is doing critical UX work here.** Without it, players don't know what they're looking at. It must be present.

**Desktop delta:** Fixture board larger, pulsing border more visible at distance.

---

### Frame 7 — Fixtures Revealing

**Phase:** Match results coming in one by one
**State:** `showdownPhase === 'fixtures'`, tiles updating with scores

**Mobile layout:**
- Same as Frame 6 base layout
- Fixture tiles: as each result arrives, tile transitions from pending style to finished style:
  - Background: `rgba(13,20,36,0.55)` (slightly darker/more opaque)
  - Border: `rgba(212,168,67,0.45)` (gold — result is in)
  - Score numbers appear with `tile-reveal 0.3s ease-out both`
- `isMyFixture` tiles (player's team in this fixture): stronger gold border, `filter: drop-shadow(0 0 8px rgba(212,168,67,0.3))`
- Waiting text: still present until all fixtures have results
- Board pulse: continues

**Desktop delta:** Tile reveal animation more dramatic (slightly larger scale).

---

### Frame 8 — Calculating Scores

**Phase:** All fixtures in, scoring in progress
**State:** `showdownPhase === 'calculating'`

**Mobile layout:**
- Fixture board: all tiles showing results, board pulse stops (border returns to static gold)
- "Calculating scores..." text replaces the waiting text — same position, `var(--text-dim)` + spinner dot
- Seats: all visible, no change to cards or avatars
- Betting bar: still absent
- Pot: static

**Duration:** This phase is typically short (server-side). The UI just needs to not flash — if it resolves in < 300ms, the "Calculating" text may never be seen by users on fast connections. Don't over-engineer this frame; it just needs to exist gracefully.

**Desktop delta:** None meaningful.

---

### Frame 9 — Score Reveals

**Phase:** Scores arriving per player
**State:** `showdownPhase === 'reveals'`, `scoreResult` populating per seat

**Mobile layout:**
- Seats: as each player's score arrives, `SeatScorePopup` appears on their seat
  - Direction determined by `seatIndex` — see positioning rules in Layout System section
  - Animation: `score-pop 0.4s ease-out both`
- Cards: opponent cards flip face-up via `card-flip 0.4s ease-out both` as their score populates (`showScoredCards` condition in `PlayerSeat`)
- Current user's cards: already face-up, no flip needed
- `SeatScorePopup` content: total score prominent (`fontSize: 17, font-outfit font-black`), per-card breakdown below (`fontSize: 10px` after J19 fix), colored by winner/loser state
- Fixture board: remains visible, all results showing
- Pot: still showing total
- Betting bar: absent

**The score reveal is the emotional peak of the round.** Popups should appear with a slight stagger by seat (200ms between each). Use `animationDelay` on the popup itself. Scores don't have to arrive in seat order — stagger is applied to the reveal animation, not data arrival.

**Desktop delta:** Popups larger, more readable at distance. Flip animation more dramatic.

---

### Frame 10 — Winner Announcement

**Phase:** All scores in, winner determined
**State:** `showdownPhase === 'winner'`, `isWinner` flag set on winning player

**Mobile layout:**
- Winner seat container: `background: rgba(212,168,67,0.08)`, `border: 1px solid var(--gold-dim)`
- Winner avatar: `border: 2.5px solid var(--gold)`, `gold-burst 1.2s ease-out infinite` pulse animation
- Winner chip count: already reflects the pot being awarded (real-time from socket)
- **Winner banner:** A small inline text strip, NOT an overlay. Renders inside the pitch area, above the winner's seat:
  ```tsx
  <div
    className="absolute font-cinzel font-bold text-center"
    style={{
      bottom: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '1.1rem',
      color: 'var(--gold)',
      textShadow: '0 0 20px rgba(212,168,67,0.6)',
      animation: 'fade-in-up 0.6s ease-out both',
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}
  >
    {winnerName} wins!
  </div>
  ```
- All seat score popups remain visible
- Fixture board: visible
- `GameOverOverlay` (table status COMPLETED): still triggers for the final game, this frame is for round winners

**New keyframe needed:**
```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateX(-50%) translateY(12px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}
```

**What does NOT render:** `RoundResultsOverlay`. No full-screen overlay. The table is the stage.

**Desktop delta:** Banner text slightly larger, winner glow more visible.

---

### Frame 11 — Between Rounds

**Phase:** Round over, next round not yet started
**State:** `showdownPhase === 'idle'` (after reset), `currentRound` null

**Mobile layout:**
- Score popups: fade out via `fade-out-down 0.4s ease-in both` when `resetShowdownPhase()` is called
- Winner banner: fades out at same time
- Cards: removed from seats as round data clears
- Fixture board: disappears (no `fixtures` in store)
- Seats: show updated chip counts (chip balance animation — green flash on winner, red flash on losers)
- Status shows waiting for next deal

**New keyframe:**
```css
@keyframes fade-out-down {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(6px); }
}
```

**Desktop delta:** None.

---

### Frame 12 — Game Over

**Phase:** Table status `COMPLETED`
**State:** `table.status === 'COMPLETED'`

**Mobile layout:**
- `GameOverOverlay` renders: `absolute inset-0 z-40`
- This is the existing component — **not modified**. It covers the table for the final end state (someone ran out of chips). This is the one case where a full overlay is acceptable: the game is over, there is no table to see.
- Players table: sorted by chips descending, winner at top with gold badge
- Leave button prominent

**Desktop delta:** Overlay has more horizontal padding, player rows more spaced.

---

## Animation Timeline

A single round from deal to reset:

| t | Event | Animation |
|---|---|---|
| 0ms | Cards dealt | `card-deal 0.3s` per seat, staggered by `0.1s × seatIndex` |
| ~0ms | SB/BB blinds posted | Action badge (`badge-pop 2s`) on SB/BB seats |
| Variable | Player action (fold/call/raise/etc.) | `badge-pop 2s` on acting player's seat |
| Variable | Pot updates | `pot-flash 0.6s` on pot display |
| After last bet | Fixture board appears | Container fades in `0.3s`, label appears |
| Per result | Fixture tile reveals | `tile-reveal 0.3s` per tile as data arrives |
| After all fixtures | Score reveal begins | Stagger 200ms per seat: `score-pop 0.4s` on popup, `card-flip 0.4s` on opponent cards |
| After last score | Winner banner | `fade-in-up 0.6s` |
| Winner avatar | Gold burst | `gold-burst 1.2s infinite` |
| Reset | Clear popups + banner | `fade-out-down 0.4s` |
| Reset | Chip balance flash | Green (winner) / Red (losers) border flash, 0.8s |

---

## Component Inventory

### New elements (to create)

| Element | Where | What |
|---|---|---|
| `FixtureBoardContainer` | `PokerTable.tsx` | Wrapper div around `<FixtureBoard>` — glassmorphism backing card with "LIVE FIXTURES" label and phase-dependent border. Not a separate file — inline in `PokerTable.tsx`. |
| Winner banner | `PokerTable.tsx` | Inline absolute-positioned text strip. Not a separate component. Renders when `showdownPhase === 'winner'`. |
| `fade-in-up` keyframe | `index.css` | For winner banner entrance |
| `fade-out-down` keyframe | `index.css` | For popup/banner exit on reset |
| `fixture-board-pulse` keyframe | `index.css` | For fixture board border pulse during waiting phase |

### Modified components

| Component | Change |
|---|---|
| `PlayerSeat.tsx` | Bot indicator (🤖), YOU badge, `--ring-scale` on timer SVG — see `avatar-system-spec.md` |
| `SeatScorePopup.tsx` | Add `seatIndex` prop, derive directional positioning CSS from it (Section: Score popup direction rules) |
| `PokerTable.tsx` | Add `FixtureBoardContainer` wrapper, winner banner, pass `seatIndex` to `SeatScorePopup`, pass `showdownPhase` for fixture board visibility logic |
| `index.css` | New keyframes, `--ring-scale` token, bot color tokens — see avatar spec and Section 9 of avatar spec |

### Unchanged components

`BettingControls`, `FixtureBoard`, `GameOverOverlay`, `ActionBadge`, `FaceDownCard`, `FaceUpMiniCard`, `PokerChip`, `GameTable` (page).

### Explicitly retired — do not implement, do not wire

| Component | Why |
|---|---|
| `RoundResultsOverlay` | Full-screen overlay over the table. Violates DN1 constraint: table must stay visible during reveals. Component exists as dead code from J13. Leave the file — don't delete it yet — but do not import or render it anywhere. |
| `CalculatingOverlay` | Same reason. Was planned but not yet built. Do not create. |
| `RevealedPlayerMini` | Was a sub-component planned for `RoundResultsOverlay`. Do not create. |

---

## Orel's Hard Constraints (Non-Negotiable)

1. **No full-screen overlays during any game phase except `COMPLETED`.** Inline popups and ambient table state only.
2. **The fixture board must be visible and labeled during the waiting and reveals phases.** It is the product. Players must immediately understand what it is.
3. **Winner is announced on the table surface.** Inline banner, not an overlay.
4. **The `GameOverOverlay` (final game end) is the only full-screen cover allowed.** And it already exists — don't change it.

---

## Questions for Joni Before Starting

Before touching `PokerTable.tsx`:

1. Confirm `showdownPhase` is available in the component's prop chain or directly from `useGameStore`. It needs to drive the `FixtureBoardContainer` visibility and border state.
2. The `seatIndex` passed to `SeatScorePopup` — confirm `PlayerSeat` receives `seatIndex` already, or that `PokerTable` can pass it down.
3. The winner name for the banner — confirm which field carries the winning player's display name (likely `player.username` on the player with `isWinner: true`).

Ping Doni directly on any of these — don't guess and implement.

— Doni
