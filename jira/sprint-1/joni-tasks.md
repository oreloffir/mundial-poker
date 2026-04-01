# Joni — Sprint 1 Tasks

**Sprint:** April 1–8, 2026
**Role:** Junior Developer — Frontend / UI
**Total tasks:** 6

Read the [Sprint Brief](./SPRINT-BRIEF.md) first for full context, dependencies, and schedule.

---

## J1 — Fix Winner Banner Timing

**Priority:** High (most visible bug)
**Branch:** `fix/winner-banner-timing`
**Deadline:** Wednesday April 1

### Context

The showdown animation in `PokerTable.tsx` uses hardcoded delays: winner banner appears at `2s + (numPlayers * 1.5s)` and pot animation at `3.5s + (numPlayers * 1.5s)`. The banner persists into the next round's fixture reveal because nothing explicitly dismisses it. Old revealed fixture cards also remain visible while new ones appear.

### Current behavior

Winner banner appears after showdown and stays indefinitely until component state happens to change. When the next round starts, the banner overlaps with the new fixture reveal for several seconds.

### Expected behavior

Winner banner is explicitly dismissed when the next round starts. Old fixture cards are fully cleared before new ones render. No visual overlap between rounds.

### Requirements

1. In `useGameSocket.ts`, in the `round:start` event handler, add state resets **before** setting new round data:
   - Clear `showdownResults` → `null`
   - Clear any winner banner state → `null`
   - Reset `revealedFixtureCount`
   - These resets must happen BEFORE any new round state is set

2. In `PokerTable.tsx`, add a safety auto-dismiss: if the banner has been visible for more than `5s + (numPlayers * 1.5s)`, hide it automatically via a cleanup `setTimeout` + `clearTimeout` on unmount.

3. Ensure the pot animation completes before the banner is dismissed — don't cut it short.

### Files to modify

- `apps/web/src/hooks/useGameSocket.ts` — `round:start` handler state reset
- `apps/web/src/components/game/PokerTable.tsx` — auto-dismiss timeout
- `apps/web/src/stores/gameStore.ts` — verify reset methods exist for all relevant state

### Deliverables

- [ ] `round:start` handler clears all showdown/winner state
- [ ] Auto-dismiss safety timeout in PokerTable
- [ ] Old fixture cards cleared before new round renders
- [ ] Manual QA: play 2+ rounds, confirm banner doesn't bleed into next round

### Out of scope

- Redesigning the showdown animation sequence
- Adding new animations or transitions between rounds
- Changing the timing of the showdown itself

**Estimated effort:** Half day

---

## J2 — Fix Round Counter Sync

**Priority:** Medium
**Branch:** `fix/round-counter-sync`
**Deadline:** Thursday April 2

### Context

`GameTable.tsx` top bar displays `currentRound?.roundNumber`. The value sometimes lags on round transitions because the gameStore update happens after other state changes process.

### Current behavior

Round number in the top bar occasionally shows the previous round number for a moment after the new round starts.

### Expected behavior

Round number updates immediately and atomically with the round transition. No flicker of the old number.

### Requirements

1. In `useGameSocket.ts`, in the `round:start` event handler, ensure `currentRound` is updated in gameStore as the **first** state mutation — before fixture reveals, player states, or any other updates.

2. Use a single Zustand `set()` call to batch the round update with any related state changes. Separate `set()` calls cause intermediate renders that show stale data.

3. Verify in `gameStore.ts` that the `currentRound` state shape matches what the `round:start` socket event sends.

### Files to modify

- `apps/web/src/hooks/useGameSocket.ts` — reorder state updates in `round:start`
- `apps/web/src/stores/gameStore.ts` — verify state shape

### Deliverables

- [ ] `round:start` handler updates `currentRound` first in a single atomic store update
- [ ] Round counter in `GameTable.tsx` reflects new number immediately
- [ ] Manual QA: play through multiple round transitions, no flicker

### Out of scope

- Redesigning the top bar layout
- Adding round transition animations

**Estimated effort:** 2 hours

---

## J3 — Improve Balance Readability

**Priority:** Medium
**Branch:** `fix/balance-readability`
**Deadline:** Thursday April 2

### Context

`PlayerSeat.tsx` displays the chip count as small green text that is nearly invisible against the stadium background image. This was flagged in playtesting.

### Current behavior

Small green text, low contrast, hard to read — especially at seats positioned over the green pitch area.

### Expected behavior

Chip amount displayed on a dark semi-transparent pill with gold text, clearly readable at a glance against any part of the stadium background.

### Requirements

1. In `PlayerSeat.tsx`, locate the chip display element (the element showing the player's balance/chip count).

2. Apply the following style changes:
   - Background: semi-transparent dark pill — `bg-black/60 rounded-full px-2 py-0.5`
   - Text color: gold `#D4A843` instead of green
   - Font size: increase by one step (e.g., `text-xs` → `text-sm`)
   - Optional: `border border-yellow-700/40` for subtle definition

3. **KEEP** the existing green flash (chip increase) and red flash (chip decrease) CSS animations — only change the **resting/default** state colors and background.

4. Test visually across all 5 seat positions to make sure the pill doesn't overlap other elements (avatar, name, cards).

### Files to modify

- `apps/web/src/components/game/PlayerSeat.tsx` — chip display styling

### Deliverables

- [ ] Dark pill background behind chip amount
- [ ] Gold (#D4A843) text color for resting state
- [ ] Increased font size
- [ ] Green/red flash animations preserved unchanged
- [ ] Visual QA across all 5 seat positions — no overlaps

### Out of scope

- Redesigning the full PlayerSeat layout
- Changing player name or avatar styling
- Adding chip stack visualizations (chip icons, stacked coins, etc.)

**Estimated effort:** 2 hours

---

## J4 — Display Blind Position Badges

**Priority:** Medium
**Branch:** `feat/blind-position-badges`
**Deadline:** Monday April 6

> **BLOCKED by Soni's S1** — Start with hardcoded mock data on day 3-4. Swap to real socket data once S1 is merged.

### Context

Once Soni's S1 delivers `sbSeatIndex` and `bbSeatIndex` in the `round:start` socket event, the frontend should display "SB" and "BB" badges on the corresponding `PlayerSeat` components so players can see who posted blinds.

### Requirements

1. In `gameStore.ts`, add new state fields:
   ```typescript
   sbSeatIndex: number | null
   bbSeatIndex: number | null
   ```
   Include setters and clear them to `null` in `resetRoundState()` and `reset()`.

2. In `useGameSocket.ts`, in the `round:start` event handler, extract `sbSeatIndex` and `bbSeatIndex` from the payload and store them in gameStore.

3. In `PlayerSeat.tsx`, accept a new prop:
   ```typescript
   blindPosition?: 'SB' | 'BB' | null
   ```
   Render a small badge when this prop is set:
   - **"SB" badge:** `bg-blue-600 text-white text-[10px] font-bold rounded px-1`
   - **"BB" badge:** `bg-yellow-600 text-white text-[10px] font-bold rounded px-1`
   - Position: below or beside the player avatar
   - Badge visible during all betting rounds, cleared on next `round:start`

4. In `PokerTable.tsx` (where `PlayerSeat` is rendered for each seat), pass the `blindPosition` prop by comparing the player's `seatIndex` against `sbSeatIndex` / `bbSeatIndex` from the store.

5. **Development approach:**
   - Days 3-4: Hardcode `sbSeatIndex: 1, bbSeatIndex: 2` in gameStore to build and style the badges
   - Day 5: Once S1 is merged, remove hardcoded values and wire up real socket data
   - Test with actual blind rotation across multiple rounds

### Files to modify

- `apps/web/src/stores/gameStore.ts` — new `sbSeatIndex` / `bbSeatIndex` state
- `apps/web/src/hooks/useGameSocket.ts` — extract blind positions from `round:start`
- `apps/web/src/components/game/PlayerSeat.tsx` — badge rendering
- `apps/web/src/components/game/PokerTable.tsx` — pass `blindPosition` prop to each seat

### Deliverables

- [ ] `sbSeatIndex` and `bbSeatIndex` stored in gameStore from socket event
- [ ] SB badge (blue) and BB badge (gold) rendered on correct PlayerSeat
- [ ] Badges cleared and reassigned each round
- [ ] Visual QA across all 5 seat positions — no overlaps

### Out of scope

- Dealer button ("D" badge) — separate task
- Showing blind amount on the badge (just "SB"/"BB" text)
- Animation on badge appearance/disappearance

**Estimated effort:** Half day

---

## J5 — Stale Cards Cleanup Between Rounds

**Priority:** High (directly impacts gameplay clarity)
**Branch:** `fix/stale-cards-cleanup`
**Deadline:** Friday April 3

### Context

Between rounds, old fixture cards (community cards) and showdown card reveals briefly flash on screen before the new round's cards appear. This happens because state isn't fully reset before new round data arrives.

### Current behavior

On `round:start`, new data arrives but old fixture tiles and revealed card state linger for a frame or two, causing a visual flash of stale information.

### Expected behavior

All visual card state is atomically cleared before any new round rendering begins. No flash of old data.

### Requirements

1. In `useGameSocket.ts`, in the `round:start` handler, perform a **single atomic** Zustand `set()` call that resets ALL card-related and round-related state:
   - `fixtures` → `[]`
   - `revealedFixtureCount` → `0` (or `-1` per current convention — check `gameStore.ts` initial state)
   - `myHand` → `null`
   - `showdownResults` → `null`
   - `playerActions` → `{}`
   - `foldedPlayerIds` → `[]`
   - `betPrompt` → `null`
   - `myTurn` → `false`
   - `activeTurn` → `null`
   Then in the same or immediately following `set()`, apply the new round's initial state.

2. In `FixtureBoard.tsx`, add a guard: if `fixtures` array is empty or `revealedFixtureCount <= 0`, render nothing (return `null`) — not even placeholder slots that might cause a brief flash.

3. **Coordinate with J1** — Both J1 and J5 touch the `round:start` handler in `useGameSocket.ts`. Do J1 first, then extend the same reset block for J5. Or combine them into a single clean commit. The key is: one comprehensive reset block at the top of `round:start`, not scattered resets.

### Files to modify

- `apps/web/src/hooks/useGameSocket.ts` — atomic state reset in `round:start`
- `apps/web/src/components/game/FixtureBoard.tsx` — empty-state guard
- `apps/web/src/stores/gameStore.ts` — verify `resetRoundState()` covers all fields

### Deliverables

- [ ] Atomic state reset of all card/showdown/betting state on `round:start`
- [ ] `FixtureBoard.tsx` guard against rendering when empty
- [ ] No visual flash of old cards between rounds
- [ ] Manual QA: play through 3+ round transitions, zero stale card flashes

### Out of scope

- Adding transition animations between rounds (fade out / fade in)
- Changing the card reveal animation sequence
- Modifying card component styling

**Estimated effort:** 3 hours

---

## J6 — Add Blind Configuration to CreateTableModal

**Priority:** Low (additive UX — backend already supports it)
**Branch:** `feat/create-table-blinds-ui`
**Deadline:** Friday April 3

### Context

`CreateTableModal.tsx` lets users set starting chips when creating a table, but doesn't expose the `smallBlind` / `bigBlind` fields. The backend schema and POST `/tables` endpoint already accept these values. We just need the UI.

### Requirements

1. In `CreateTableModal.tsx`, add two new number inputs below the existing "Starting Chips" field:
   - **"Small Blind"** — default value: `5`, min: `1`
   - **"Big Blind"** — default value: `10`, min: `2`

2. **Auto-sync logic:**
   - When user changes Small Blind → auto-update Big Blind to `SB * 2`
   - When user changes Big Blind → auto-update Small Blind to `BB / 2` (only if cleanly divisible; otherwise show a validation error)

3. **Validation:**
   - Both values must be positive integers
   - Big Blind must be exactly `2 * Small Blind`
   - Both must be less than Starting Chips

4. Include `smallBlind` and `bigBlind` in the payload sent to `POST /tables`. Check the current form submission code — the backend already accepts these fields.

5. Add a subtle help text below the inputs: `"Big blind is automatically set to 2x small blind."`

6. Style the new inputs to match existing form fields in the modal (same Tailwind classes, same spacing, same label style).

### Files to modify

- `apps/web/src/components/lobby/CreateTableModal.tsx` — new inputs, validation, auto-sync, payload

### Deliverables

- [ ] Small Blind and Big Blind number inputs in modal
- [ ] Auto-sync logic (SB * 2 = BB)
- [ ] Validation: positive integers, BB = 2 * SB, less than starting chips
- [ ] Values included in table creation API call
- [ ] Help text below inputs
- [ ] Styling matches existing form fields

### Out of scope

- Blind presets or templates (e.g., "Low / Medium / High")
- Blind schedule / escalation configuration
- Changing the backend API (it already works)
- Displaying blinds on TableCard in the lobby (separate task)

**Estimated effort:** 3 hours

---

## J7 — Fix React Hooks Crash on Bot Add (BUG-05)

**Priority:** High (crashes UI, blocks QA)
**Branch:** `fix/player-seat-hooks-crash`
**Deadline:** April 2

### Context

Mark's QA smoke test found a React hooks violation: `Rendered more hooks than during the previous render` in `PlayerSeat.tsx`. It triggers every time a bot is added to the table. The UI goes blank and only recovers on reload. This blocks all automated and manual QA.

### Root cause

In `PlayerSeat.tsx`, the component has two `useEffect` hooks (lines 110 and 123) that run **before** the early return for `if (!player)` at line 133. When a seat goes from empty (`player: null`) to occupied (bot added), or vice versa, the early return changes which hooks execute — violating React's rules of hooks.

### Current behavior

1. Table loads with empty seats (`player: null` for some seats)
2. User clicks "Add Bot"
3. Bot fills an empty seat — `player` goes from `null` to an object
4. React detects a different number of hooks and throws: `Rendered more hooks than during the previous render`
5. UI goes blank. Recovers only on page reload.

### Expected behavior

Adding/removing bots or players never crashes. The hooks always run in the same order regardless of `player` being null or not.

### Fix

Move the `if (!player)` early return to **after** all hooks, or guard the hook bodies internally:

**Option A (recommended):** Move the early return below all hooks. The hooks already handle `!player` gracefully (the timer effect checks `isActive`, the chip effect checks `if (!player) return`).

**Option B:** Keep early return but wrap the component so it never renders hooks conditionally — e.g., split into `EmptySeat` and `OccupiedSeat` components.

Option A is a 2-line move. Option B is cleaner but more churn. Your call — just make sure **all hooks are called unconditionally before any return**.

### Files to modify

- `apps/web/src/components/game/PlayerSeat.tsx` — move early return below hooks (lines 106-144)

### Deliverables

- [ ] No React hooks crash when adding/removing bots
- [ ] No React hooks crash when players join/leave mid-game
- [ ] Manual QA: add 4 bots to a table, start game, no blank screen
- [ ] Mark's Playwright smoke tests pass on the Add Bot flow

### Out of scope

- Refactoring PlayerSeat into smaller components
- Any styling or layout changes

**Estimated effort:** 30 minutes

---

## J8 — Mobile Responsive Game View (Landscape)

**Priority:** Medium
**Branch:** `feat/mobile-responsive-game`
**Deadline:** Monday April 7

### Context

The game view is desktop-only. All dimensions are hardcoded pixels with zero media queries anywhere in the codebase. On a landscape mobile screen (iPhone SE: 667x375, iPhone 12: 844x390), the table overflows, cards are proportionally huge, text is unreadable, and betting controls are cramped. We need the game playable on horizontal/landscape mobile screens as the primary mobile experience.

### Target screens

| Device | Landscape Resolution | Priority |
|--------|---------------------|----------|
| iPhone SE | 667 x 375 | Must work |
| iPhone 12/13/14 | 844 x 390 | Must work |
| iPhone 14 Pro Max | 932 x 430 | Must work |
| Android mid-range | ~800 x 360 | Should work |
| iPad landscape | 1024 x 768 | Should work (already close) |

### Current issues (by component)

**PokerTable.tsx** — Container is `85vw` with `aspectRatio: 16/10` and `maxWidth: 1100px`. On 667px landscape this gives a ~567x354px table. After top bar (48px) and betting controls, only ~279px remains for the table. The table background image gets squished.

**PlayerSeat.tsx** — Avatar is fixed `56px`, cards are `60x84px` hardcoded, ring timer is `68px`. These are proportionally massive on a 354px tall container. Font sizes are fixed `8-10px` pixels.

**BettingControls.tsx** — Buttons are `px-5 py-2.5` with fixed `96px` slider. Works but cramped on small screens.

**FixtureBoard.tsx** — Tiles are `72px` wide fixed. 5 tiles + gaps = ~380px minimum width. Text at `8px` is unreadable on mobile.

**GameTable.tsx** — Top bar is `48px` fixed with `20px` padding. No responsive reduction.

### Requirements

1. **Add a landscape mobile breakpoint** — Use `@media (max-height: 500px) and (orientation: landscape)` or equivalent Tailwind screen config. This catches all landscape phones without affecting desktop or tablet.

2. **Scale the table container** — On mobile landscape, the table should fill available height after accounting for top bar and betting controls. Consider:
   - Reduce top bar to `36px` height, tighter padding
   - Use `calc(100vh - topBar - bettingBar)` for table area height
   - Let width follow from the aspect ratio, not the other way around

3. **Scale PlayerSeat elements** — On mobile landscape:
   - Avatar: `56px` → `40px`
   - Cards: `60x84px` → `44x62px`
   - Ring timer: `68px` → `52px` (recalculate `RING_RADIUS` and `RING_CIRCUMFERENCE`)
   - Font sizes: scale proportionally
   - Use CSS `clamp()` or Tailwind responsive classes

4. **Scale FixtureBoard** — On mobile landscape:
   - Tile width: `72px` → `56px`
   - Hide event icons (fire, glove, goal) to save space
   - Reduce font sizes proportionally

5. **Compact BettingControls** — On mobile landscape:
   - Reduce button padding: `px-5 py-2.5` → `px-3 py-1.5`
   - Reduce font size one step
   - Slider width: `96px` → `72px`
   - Consider single-row tight layout

6. **Compact top bar** — On mobile landscape:
   - Height: `48px` → `36px`
   - Padding: `px-5` → `px-2`
   - Font size: one step smaller
   - Chip count can use abbreviated format (e.g., "1.2K" instead of "1,200")

7. **Force landscape orientation hint** — If the user is in portrait mode on mobile, show a simple "Rotate your device" message with a rotate icon. Don't block the UI — just a dismissible overlay. Use `@media (orientation: portrait) and (max-width: 768px)`.

8. **No scroll** — The entire game must fit in the viewport without scrolling. `overflow: hidden` on the game container. Everything scales down to fit.

### Approach guidance

- **Prefer CSS-only scaling** where possible (media queries, `clamp()`, Tailwind responsive prefixes) over JavaScript-based resize logic
- **Don't break desktop** — all changes should be scoped to the mobile breakpoint. Desktop should look identical to current.
- **Test in Chrome DevTools** — Use responsive mode with iPhone SE (landscape) and iPhone 12 (landscape) as primary test devices
- **Work component by component** — Start with the table container and seats (biggest impact), then fixtures, then betting controls, then top bar. Commit after each component so progress is visible.

### Files to modify

- `apps/web/src/components/game/PokerTable.tsx` — container sizing, seat scaling
- `apps/web/src/components/game/PlayerSeat.tsx` — avatar, card, ring, font scaling
- `apps/web/src/components/game/BettingControls.tsx` — button/slider compacting
- `apps/web/src/components/game/FixtureBoard.tsx` — tile sizing, icon hiding
- `apps/web/src/pages/GameTable.tsx` — top bar compacting, layout height calc
- `apps/web/src/index.css` — media query definitions, portrait rotation hint

### Deliverables

- [ ] Game fully playable on iPhone SE landscape (667x375) — no overflow, no scroll
- [ ] Game fully playable on iPhone 12 landscape (844x390)
- [ ] All 5 seats visible with readable names, chips, and cards
- [ ] Betting controls usable (buttons tappable, slider draggable)
- [ ] Fixture board readable
- [ ] Desktop layout unchanged
- [ ] Portrait orientation hint on mobile
- [ ] Screenshots of all target devices in Chrome DevTools (attach to PR)

### Out of scope

- Portrait mode gameplay (landscape only for now)
- Touch gestures (swipe to fold, tap to check, etc.)
- Mobile-specific animations or transitions
- Lobby page responsive (separate task)
- Landing page responsive (separate task)
- Native app wrapper (Capacitor, React Native, etc.)

**Estimated effort:** 2 days

---

---

## J9 — Redesign Betting Controls (Chip Stack + Presets)

**Priority:** High (gameplay feel)
**Branch:** `feat/betting-controls-redesign`
**Deadline:** April 3

### Context

The current raise UI is a slider + button. It works but feels flat — no casino vibe, no satisfaction in building a bet. We're replacing it with a hybrid chip-stacking + preset system. The action buttons (Fold, Check, Call) stay as-is. Only the RAISE flow changes.

### Current behavior

When RAISE is allowed, the player sees a range slider (`min = currentBet + 1`, `max = chips`) and a "Raise {amount}" button. The slider is hard to use precisely, especially on mobile (J8 already shrunk it to 72px). No visual feedback of "how much am I betting."

### Expected behavior

When RAISE is allowed, the player sees two rows replacing the slider:

**Row 1 — Chip denominations:** Circular chip icons that the player taps to build a raise amount. Each tap adds that denomination to a running total.

```
[ 5 ] [ 10 ] [ 25 ] [ 50 ] [ 100 ] [ 200 ]
```

- Each chip is a circular button (~36px on desktop, scale down via CSS vars on mobile) styled like a poker chip — dark background, gold border, denomination text in center
- Tapping a chip adds its value to the running raise total
- Running total shown between the rows: "Raise to: **150**" in gold text
- A small "Clear" link/button resets the total back to the minimum raise
- If the running total exceeds the player's chip stack, cap at chip stack (effectively all-in)
- If the running total is below minimum raise, the Raise button is disabled
- Grey out / disable chip denominations that would push the total above the player's stack

**Row 2 — Smart presets:** One-tap shortcuts for common bet sizes.

```
[ Min ] [ ½ Pot ] [ Pot ] [ All In ]
```

- **Min:** Sets raise to `minimumBet` (currentBet + BB or minimum raise increment)
- **½ Pot:** Sets raise to `Math.floor(pot / 2)` (or minimum raise if half pot is below it)
- **Pot:** Sets raise to `pot` (or all chips if pot exceeds stack)
- **All In:** Sets raise to player's entire chip stack
- These are styled as pill buttons (not chips) — `bg-white/5 border border-white/10 text-xs` — subtler than the chip row
- Tapping a preset **replaces** the running total (doesn't add to it)

**Confirm button:** The existing "Raise {amount}" button stays below, now showing the built-up total. Gold styling, same as current.

### Full layout when it's your turn and RAISE is allowed

```
┌─────────────────────────────────────────────────────┐
│  [timer bar ████████████░░░░░░░░░░░░░░░░░░░]  12s  │
│                                                     │
│  [ Fold ]   [ Check/Call ]              [ All In ]  │
│                                                     │
│  ⑤  ⑩  ㉕  ㊿  ⓵⓪⓪  ⓶⓪⓪     ↩ Clear │
│                                                     │
│  [ Min ] [ ½ Pot ] [ Pot ]                          │
│                                                     │
│        ▶ Raise to: 150  [ RAISE ]                   │
└─────────────────────────────────────────────────────┘
```

When RAISE is **not** allowed (e.g., only CHECK/FOLD/CALL), the chip row and preset row are hidden — just the action buttons show like today.

### Requirements

1. **Replace the slider** — Remove the `<input type="range">` entirely. Replace with chip denomination row + preset row + running total display.

2. **Chip denomination row:**
   - Denominations: `[5, 10, 25, 50, 100, 200]`
   - Style each as a circular button: `w-9 h-9` (36px), `rounded-full`, dark bg (`rgba(5,10,24,0.85)`), gold border (`border border-yellow-700/40`), gold text center, `text-xs font-bold`
   - On hover: slight scale up (`scale-110`) and brighter border
   - On tap: brief press animation (`scale-95` for 100ms), add denomination to `raiseAmount` state
   - Disabled state: `opacity-30 pointer-events-none` when chip would exceed player's stack
   - Use CSS vars for sizing so mobile responsive (J8) scales them down

3. **Running total display:**
   - Show between chip row and confirm button: `"Raise to: {amount}"` in gold
   - "Clear" link next to chip row — resets to `minimumBet`
   - If total < minimumBet: show warning text, disable Raise button
   - If total >= chips: show "All In" instead of amount

4. **Preset row:**
   - Buttons: `Min`, `½ Pot`, `Pot`, `All In`
   - Each sets `raiseAmount` directly (replaces, doesn't add)
   - Pill style: `rounded-full px-3 py-1 text-[10px] bg-white/5 border border-white/10`
   - Active/selected state: gold border when the current total matches that preset
   - Calculate: Min = `minimumBet`, Half Pot = `max(minimumBet, floor(pot / 2))`, Pot = `min(pot, chips)`, All In = `chips`

5. **Keep existing action buttons** — Fold, Check, Call stay exactly as they are. They are NOT part of this redesign.

6. **Keep the timer bar** — No changes to the timer. It stays at the top of the controls.

7. **Mobile responsive** — Use CSS vars from J8. Chips scale to `w-7 h-7` (28px) on mobile landscape. Preset pills scale font down. The layout should wrap gracefully on narrow screens.

8. **State management** — All state stays local to `BettingControls.tsx` (the `raiseAmount` useState is already there). No gameStore changes needed.

9. **Fix Mark's QA bugs while you're here:**
   - **J6-BUG-01:** Add validation that BB must equal 2x SB in CreateTableModal — reject mismatch on submit
   - **J6-BUG-02:** Add validation that SB must be >= 1 (not 0) in CreateTableModal
   - **J2-TESTID:** Add `data-testid="round-counter"` to the round number element in GameTable.tsx
   - **J3-TESTID:** Add `data-testid="seat-balance-{seatIndex}"` to the chip balance element in PlayerSeat.tsx

### Files to modify

- `apps/web/src/components/game/BettingControls.tsx` — full redesign of RAISE section
- `apps/web/src/index.css` — CSS vars for chip sizing on mobile (e.g., `--chip-btn-size`)
- `apps/web/src/components/lobby/CreateTableModal.tsx` — fix J6-BUG-01 and J6-BUG-02
- `apps/web/src/pages/GameTable.tsx` — add `data-testid="round-counter"`
- `apps/web/src/components/game/PlayerSeat.tsx` — add `data-testid="seat-balance-{n}"`

### Deliverables

- [ ] Slider removed, chip denomination buttons render correctly
- [ ] Tapping chips builds raise total, Clear resets it
- [ ] Disabled chips when would exceed stack
- [ ] Preset buttons (Min, ½ Pot, Pot, All In) set raise total on tap
- [ ] Running total display with gold text
- [ ] Raise button disabled when total < minimum
- [ ] Mobile responsive (chips and presets scale down on landscape phones)
- [ ] Fold / Check / Call / All In buttons unchanged
- [ ] Timer bar unchanged
- [ ] J6-BUG-01 and J6-BUG-02 fixed
- [ ] J2-TESTID and J3-TESTID added

### Out of scope

- Custom chip artwork (use CSS-styled circles for now — Doni will design chip assets later)
- Drag-and-drop chip stacking animation
- Sound effects on chip tap
- Changing the backend bet validation (server doesn't care how the amount was built)
- Haptic feedback on mobile

**Estimated effort:** 1 day

---

## J10 — Mobile Betting Controls: Collapsible Drawer

**Priority:** High (mobile UX is broken — controls cover player's hand)
**Branch:** `feat/mobile-betting-drawer`
**Deadline:** April 4

### Context

On mobile landscape (375px height), the betting controls bar sits `absolute bottom-0` and stacks up to 5 rows of content (timer + action buttons + chip denominations + presets + raise total). This eats ~150-180px — nearly **half the viewport** — and sits directly on top of seat 0 (the player's own seat). The player literally cannot see their own cards while deciding what to bet. The chip denomination buttons from J9 also look cramped at 28px on mobile. This is a critical mobile UX issue.

### Current behavior (mobile landscape)

```
┌─ top bar (36px) ─────────────────────────────┐
│                                               │
│          [ table with 5 seats ]               │
│     seat 0 (YOU) is at bottom center          │
│                                               │
├─ betting controls (~150-180px) ───────────────┤
│  [timer bar]                                  │
│  [Fold] [Check] [Call]        [All In]        │  ← covers seat 0
│  [5] [10] [25] [50] [100] [200] ↩ Clear      │  ← covers your cards
│  [Min] [½ Pot] [Pot] [All In]                 │  ← covers your chips
│  Raise to: 150  [RAISE]                       │
└───────────────────────────────────────────────┘
```

Player can't see their hand, chip count, or blind badge while betting.

### Expected behavior (mobile landscape)

**When it's NOT your turn:** Nothing at the bottom. Full table visible.

**When it IS your turn — default state (compact bar, ~44px):**

```
┌─ top bar (36px) ─────────────────────────────┐
│                                               │
│          [ table with 5 seats ]               │
│     seat 0 fully visible with cards           │
│                                               │
├─ compact bar (~44px) ─────────────────────────┤
│  [Fold] [Check/Call 10]   [Raise ▲]  12s     │
└───────────────────────────────────────────────┘
```

- Single row: Fold, Check or Call (with amount), and a "Raise ▲" toggle button
- Timer countdown integrated as text (not a full bar — save vertical space)
- Tapping Fold or Check/Call submits immediately (same as now)
- Tapping "Raise ▲" expands the drawer

**When "Raise ▲" is tapped — expanded drawer:**

```
┌─ top bar (36px) ─────────────────────────────┐
│                                               │
│          [ table — upper portion visible ]    │
│                                               │
├─ expanded drawer ─────────────────────────────┤
│  Your hand: [🇧🇷 BRA] [🇫🇷 FRA]   Chips: 490 │
│                                               │
│  [5] [10] [25] [50] [100] [200]   ↩ Clear    │
│  [Min] [½ Pot] [Pot] [All In]                 │
│                                               │
│  Raise to: 150  [RAISE]  [✕ Cancel]    12s   │
└───────────────────────────────────────────────┘
```

- Drawer slides up with a smooth 200ms transition
- **Row 1: Your hand + chips** — show the player's 2 team cards (mini format: flag + code) and current chip count. This is the key UX win: you can see your cards WHILE building your raise.
- **Row 2: Chip denominations** — same as J9 but now has room to breathe
- **Row 3: Presets** — same as J9
- **Row 4: Raise total + confirm + cancel** — "Cancel" collapses back to compact bar
- Timer shows as text countdown in the confirm row

### Requirements

1. **This is mobile-only.** On desktop, keep the current layout exactly as-is. Use `@media (max-height: 500px) and (orientation: landscape)` to scope all changes. Desktop BettingControls.tsx should render identically to current.

2. **Compact bar (default when it's your turn):**
   - Single `flex` row, `~44px` height
   - Contains: Fold button, Check OR Call button (with amount), "Raise ▲" button, timer text
   - All In button shows here too if allowed (replaces Raise)
   - Tapping Fold/Check/Call fires `onAction()` immediately — same behavior as now
   - "Raise ▲" is a toggle that sets local state `raiseExpanded: true`
   - Timer as text only: `"12s"` with color coding (green >10s, gold 5-10s, red <5s)

3. **Expanded drawer (when Raise ▲ is tapped):**
   - Slides up via `max-height` transition (200ms ease-out) or `transform: translateY`
   - **Hand preview row:** Show the player's 2 cards in compact format (flag emoji + team code, same as `FaceUpMiniCard` but smaller ~36x50px) + chip count. This requires passing `myHand` and `myChips` as new props to `BettingControls`.
   - **Chip denomination row:** Same J9 chips, unchanged
   - **Preset row:** Same J9 presets, unchanged
   - **Confirm row:** "Raise to: {amount}" + Raise button + "Cancel" text button + timer text
   - "Cancel" sets `raiseExpanded: false`, resets `raiseAmount` to `minimumBet`
   - Submitting the raise also collapses the drawer

4. **New props on BettingControls** (mobile drawer needs them):
   ```typescript
   interface BettingControlsProps {
     readonly prompt: BetPrompt
     readonly onAction: (action: BetAction, amount: number) => void
     readonly myHand?: readonly TeamCard[] | null    // NEW — for hand preview in drawer
     readonly myChips?: number                        // NEW — for chip display in drawer
   }
   ```
   Pass these from `GameTable.tsx` where `myHand` and `myPlayer.chips` are already available.

5. **Drawer background:** Same glassmorphism as current — `rgba(5,10,24,0.85)` with `backdrop-filter: blur(16px)`. Slightly more opaque than current (0.85 vs 0.7) since the drawer is taller and needs to be readable.

6. **Smooth transition:** The expand/collapse should animate. Use:
   ```css
   .betting-drawer {
     transition: max-height 200ms ease-out, opacity 150ms ease-out;
   }
   ```
   Or `transform: translateY(100%)` → `translateY(0)` for GPU-accelerated animation.

7. **Z-index:** The drawer must stay above the table but below any overlays (game over, portrait hint). Current `z-30` is fine.

8. **Timer bar on desktop stays unchanged.** The full-width timer bar with progress fill only hides on mobile. On mobile, timer is text-only in both compact and expanded states.

### Files to modify

- `apps/web/src/components/game/BettingControls.tsx` — add mobile drawer layout with `raiseExpanded` state, compact bar, expanded view with hand preview
- `apps/web/src/pages/GameTable.tsx` — pass `myHand` and `myPlayer?.chips` as new props to BettingControls
- `apps/web/src/index.css` — CSS vars for drawer heights, transition classes, mobile-only overrides

### Deliverables

- [ ] Mobile: compact bar (~44px) shows by default when it's your turn — Fold/Check/Call + Raise toggle + timer text
- [ ] Mobile: tapping "Raise ▲" expands drawer with hand preview + chips + presets + confirm
- [ ] Mobile: player can see their hand cards inside the drawer while building a raise
- [ ] Mobile: "Cancel" collapses drawer back to compact bar
- [ ] Mobile: submitting any action (Fold/Check/Call/Raise) collapses everything
- [ ] Mobile: smooth 200ms slide transition on expand/collapse
- [ ] Desktop: zero changes — current layout renders identically
- [ ] Timer countdown visible in both compact and expanded states
- [ ] No overlap with seat 0 cards in compact bar mode

### Out of scope

- Redesigning the chip denomination buttons themselves (J9 styling stays)
- Sound effects or haptic feedback
- Swipe gestures to expand/collapse
- Desktop layout changes of any kind
- Changing how actions are sent to the server

**Estimated effort:** 1 day

---

## Sprint Progress — Joni's Delivery Log

**Last updated:** April 1, 2026
**Status:** Sprint complete — J1–J10 delivered

---

### Completed

#### J10 — Mobile Betting Controls: Collapsible Drawer ✅
- **Strategy:** Two CSS-controlled render sections (`.betting-desktop-only` / `.betting-mobile-only`) sharing all state and chip/preset JSX variables. `@media (max-height: 500px) and (orientation: landscape)` swaps which section is visible. Desktop code path is completely unchanged.
- **Compact bar (~44px):** Single row — Fold / Check / Call / Raise▲ toggle / timer text. All In shown here when allowed without RAISE. Fold/Check/Call fire `onAction` immediately. `.betting-bar-wrapper` class removes `py-3` padding from the GameTable wrapper on mobile so the bar is exactly 44px.
- **Expanded drawer:** `max-height: 0→320px` + `opacity: 0→1` transition (200ms ease-out). Opens on "Raise ▲" tap.
  - Row 1: hand preview — player's 2 team cards at 36×50px (flag + code) + chip count pill. Player sees their hand while building the raise.
  - Row 2: chip denomination row (reused from J9 via shared JSX variable)
  - Row 3: preset row (reused from J9 via shared JSX variable)
  - Row 4: "Raise to: {amount}" + Raise confirm button + ✕ Cancel + timer text
  - Cancel resets `raiseAmount` to `minimumBet` and collapses; submitting raise collapses before firing `onAction`
- **New props:** `myHand?: readonly TeamCard[] | null` and `myChips?: number` — passed from `GameTable.tsx` where both are already available
- `raiseExpanded` resets to `false` in the `useEffect` that watches `prompt.minimumBet / prompt.timeoutMs` (new turn starts → drawer closes)
- Commit: `feat: mobile betting drawer with collapsible raise panel`

#### J9 — Redesign Betting Controls (Chip Stack + Presets) ✅
- Removed slider from RAISE section entirely
- Chip denomination row: `[5, 10, 25, 50, 100, 200]` circular buttons (`var(--chip-btn-size)` = 36px desktop / 28px mobile); each tap adds to running total; chips that would exceed stack are `opacity-25 cursor-not-allowed`; 100ms `scale(0.88)` press animation via `pressedChip` state
- Preset row: Min / ½ Pot / Pot / All In pill buttons — tap to replace (not add) running total; active state (gold border + gold text) when `raiseAmount === preset.value`; preset calculations: `Min = minimumBet`, `½ Pot = max(minimumBet, floor(pot/2))`, `Pot = min(pot, chips)`, `All In = chips`
- Running total: `"Raise to: {amount}"` with gold `font-outfit font-black` amount; shows "All In" text when `raiseAmount >= chips`; Clear link resets to `minimumBet`
- Raise button disabled (`opacity-30`) when `raiseAmount < minimumBet`; shows "Raise (All In)" when at chip cap
- Fold / Check / Call / All In action buttons and timer bar completely unchanged
- CSS vars added: `--chip-btn-size`, `--chip-btn-font-size`, `--preset-padding`, `--preset-font-size` — all override in `@media (max-height: 500px) and (orientation: landscape)`
- **J6-BUG-01 fixed:** `handleBigBlindChange` now immediately shows "Big blind must be at least 2" when `bb < 2` (previously cleared the error silently)
- **J6-BUG-02 fixed:** `handleSmallBlindChange` now immediately shows "Small blind must be at least 1" when `sb < 1` (previously cleared the error without setting a new one)
- **J2-TESTID:** `data-testid="round-counter"` added to round number `<span>` in `GameTable.tsx`
- **J3-TESTID:** `data-testid="seat-balance-{player.seatIndex}"` added to chip badge div in `PlayerSeat.tsx`
- Commit: `feat: redesign betting controls with chip stack and presets`

#### J8 — Mobile Responsive Game View (Landscape) ✅
- Approach: CSS custom property overrides inside `@media (max-height: 500px) and (orientation: landscape)` — no JS resize logic, zero impact on desktop
- `index.css`: Added `--avatar-size`, `--card-w/h`, `--card-flag-size`, `--ring-scale`, `--fixture-tile-w`, `--top-bar-h/px`, `--btn-padding`, `--btn-font-size`, `--slider-w` vars; `.mobile-landscape-hide` utility; `.poker-table-pitch` max-height constraint; `.portrait-hint` CSS for portrait overlay
- `PlayerSeat.tsx`: avatar `56→40px` via `var(--avatar-size)`; cards `60×84→44×62px` via `var(--card-w/h)`; ring SVG repositioned to `top: 50%, left: 50%, translate(-50%,-50%)` for correct centering at any avatar size, then `scale(var(--ring-scale))` for visual size `68→52px`
- `FixtureBoard.tsx`: tile width `72→56px` via `var(--fixture-tile-w)`; event icon row gets `mobile-landscape-hide` class
- `BettingControls.tsx`: all button `px-5 py-2.5` converted to inline `padding: var(--btn-padding)` and `font-size: var(--btn-font-size)`; slider `w-24` → `width: var(--slider-w)` (`96→72px`)
- `GameTable.tsx`: top bar height/padding use CSS vars; error toast `top` tracks top bar height; chips abbreviate to `1.2K` format; portrait rotation overlay (CSS-shown on portrait mobile, JS-dismissible)
- Commit: `feat: mobile responsive game view (landscape)`

#### J7 — Fix React Hooks Crash on Bot Add ✅
- Root cause confirmed: `prevChipsRef` (useRef) and `chipAnim` (useState) were declared after the `if (!player)` early return — React threw `Rendered more hooks than during the previous render` when a seat transitioned between empty and occupied
- Fix: moved all hooks (2× useState, 1× useRef, 2× useEffect) to lines 106–123, before the early return at line 133 — hooks now execute unconditionally on every render, and the early-return null-check path is purely a render bail-out with no hook involvement
- Both useEffect bodies already have internal `if (!player) return` guards so the logic is safe when `player` is null
- Commit: `fix: resolve React hooks crash in PlayerSeat on bot add`

#### J1 — Fix Winner Banner Timing ✅
- Rewrote the `round:start` handler in `useGameSocket.ts` as a single atomic `store.setState()` call — `showdownResults` is now cleared in the same render tick as the new round data, so the winner banner is guaranteed gone before anything new renders
- Added an auto-dismiss safety `useEffect` in `PokerTable.tsx`: if the banner is still visible after `5000 + (players.length × 1500)` ms it clears itself — guards against edge cases where the socket event is slow
- Old fixture cards are wiped atomically as part of the same reset (see J5)

#### J2 — Fix Round Counter Sync ✅
- Root cause was 6 separate `store.getState().setX()` calls in `round:start` firing 6 intermediate renders — the top bar would briefly show a stale `roundNumber` during one of those frames
- Fixed by consolidating into a single `store.setState({...})` call that sets `currentRound` (with the new `roundNumber`) and all resets together — the round counter now updates atomically with no flicker

#### J3 — Improve Balance Readability ✅
- Completed prior to sprint start during a design polish pass
- Replaced the small green chip number with a dark pill badge: `rgba(5,10,24,0.85)` background, gold `var(--gold-bright)` text, `font-outfit font-black text-xs`, small circular chip icon alongside the amount
- Badge border flashes green on chip increase, red on chip decrease — existing animation behavior preserved
- Changes in: `apps/web/src/components/game/PlayerSeat.tsx`

#### J4 — Display Blind Position Badges ✅ (fully wired — Soni S1 merged)
- `gameStore.ts`: `sbSeatIndex`/`bbSeatIndex` in state; `setBlindPositions(sb, bb)` setter; both cleared in `resetRoundState()` and `reset()`; removed hardcoded stub values
- `PlayerSeat.tsx`: `blindPosition?: 'SB' | 'BB' | null` prop renders blue pill (SB) or gold pill (BB) below the avatar
- `PokerTable.tsx`: derives `blindPosition` per seat from store indices, passes prop to `PlayerSeat`
- `useGameSocket.ts` `round:start` handler: reads `payload.sbSeatIndex` and `payload.bbSeatIndex` directly in the atomic `store.setState()` call — badges update in the same render tick as the new round
- `blinds:posted` listener: wired to `setPlayerAction(userId, { action: 'CALL', amount })` so the chip-change badge animation plays on the SB and BB poster's seat when blinds are deducted
- `socket-events.ts`: added `blinds:posted` event type to `ServerToClientEvents`

#### J5 — Stale Cards Cleanup Between Rounds ✅
- Root cause: `resetRoundState()` only cleared betting state — `fixtures`, `myHand`, `showdownResults`, `foldedPlayerIds`, `playerActions` were never wiped on `round:start`, causing stale data to linger for one or more render frames
- Fixed by the same atomic `store.setState()` rewrite in J1/J2 — the single call resets `fixtures: []`, `myHand`, `showdownResults`, `playerActions: {}`, `foldedPlayerIds: []`, `betPrompt: null`, `activeTurn: null`, `myTurn: false`, `revealedFixtureCount: 0`, `waitingForResults: false` all at once
- `FixtureBoard.tsx` already had an `if (fixtures.length === 0) return null` guard — confirmed still in place

#### J6 — Add Blind Configuration to CreateTableModal ✅
- Added Small Blind (default 5, min 1) and Big Blind (default 10, min 2) inputs to `CreateTableModal.tsx`, displayed side-by-side below Starting Chips
- Auto-sync: changing SB updates BB to `SB × 2`; changing BB updates SB to `BB ÷ 2` (shows inline error if not cleanly divisible)
- Validation on submit: positive integers, `BB === SB × 2`, `BB < startingChips` — blocks form submission with a clear error message
- Both `smallBlind` and `bigBlind` included in the `POST /tables` payload
- Help text: _"Big blind is automatically set to 2× small blind."_
- Styling matches existing form fields exactly (same Tailwind classes, label style, input border)

---

### Blocked

_Nothing blocked. All sprint tasks complete._

---

### Notes for the team

- J1 + J2 + J5 were all symptoms of the same root cause — scattered `set()` calls in `round:start`. The atomic rewrite fixes all three and makes future `round:start` changes easier to reason about.
- The `players:update` socket event in `useGameSocket.ts` has a pre-existing TypeScript error (event name not in `ServerToClientEvents` type). Not introduced by this sprint — flagging for awareness.
- J4 is now fully wired to Soni's S1 data — `sbSeatIndex`/`bbSeatIndex` read from `round:start` payload atomically, `blinds:posted` triggers chip-change animation on blind posters.
