# Mundial Poker — Web App

React 18 + Vite 6 + Tailwind CSS v4. Mobile-first at 667×375 (iPhone SE landscape).

---

## Component Tree

```
App (router)
├── Landing             — hero page, play/view tables CTAs
├── Lobby               — table list, create table
│   ├── TableCard       — single table row (status, join button)
│   └── CreateTableModal — new table form
└── GameTable           — full game page, owns the socket connection
    └── PokerTable      — pitch canvas + all in-game layers
        ├── PlayerSeat × 5   — avatar, chip count, action badge, cards
        │   └── SeatScorePopup   — score reveal popup per player
        │       └── TeamScoreSubCard — per-fixture score breakdown row
        ├── FixtureBoard     — 5 fixture tiles across the upper pitch
        ├── BettingControls  — raise drawer + Fold/Call/Raise/All In
        ├── PotDisplay       — chip icons + animated pot total
        ├── WinnerBanner     — winner announcement (replaces pot)
        ├── WaitingBadge     — match progress during LIVE phase
        └── GameOverOverlay  — end-of-game modal
```

Shared: `PokerChip` SVG with 6 denomination color variants (5/10/25/50/100/200).

---

## State Management

Two Zustand stores — both write-only via actions, never mutate directly.

### `authStore`

Persisted to localStorage. Holds `{ user, token }`. Written by `useAuth`.

### `gameStore`

Ephemeral. Reset on `round:start` (via `resetRoundState`) and on table leave (via `reset`).

| Group    | Fields                                                                                      | Written by                                            |
| -------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Table    | `table`                                                                                     | `table:state`, `player:joined/left`, `players:update` |
| Round    | `currentRound`, `myHand`, `fixtures`                                                        | `round:start`, `board:reveal`                         |
| Betting  | `betPrompt`, `activeTurn`, `playerActions`, `foldedPlayerIds`, `sbSeatIndex`, `bbSeatIndex` | `bet:prompt`, `bet:update`, `blinds:posted`           |
| Showdown | `showdownPhase`, `fixtureResults`, `playerScoreReveals`, `currentRevealIndex`, `winnerData` | `fixture:result`, `player:scored`, `round:winner`     |
| UI       | `potFlashKey`, `revealedFixtureCount`, `waitingForResults`, `error`                         | various                                               |

**Showdown phase machine** — transitions driven by socket events:

```
idle → waiting → fixtures → calculating → reveals → winner → idle
```

---

## Socket Events

All socket logic lives in `hooks/useGameSocket.ts`. Initialized once in `GameTable`, torn down on unmount.

### Consumed (server → client)

| Event                           | Action                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| `table:state`                   | Hydrates full table + round on connect/reconnect              |
| `players:update`                | Bulk chip sync after round ends                               |
| `player:joined` / `player:left` | Update player list                                            |
| `round:start`                   | Atomic state reset + new round (single `store.setState` call) |
| `blinds:posted`                 | SB/BB action badges                                           |
| `bet:prompt`                    | Show betting controls for active player                       |
| `bet:update`                    | Update pot, last action badge, player chips                   |
| `round:pause`                   | Betting over — start waiting for fixture results              |
| `board:reveal`                  | Set fixtures, start staggered tile reveal                     |
| `fixture:result`                | Append to `fixtureResults`, advance reveal count              |
| `round:scoring`                 | Transition phase: calculating → reveals                       |
| `player:scored`                 | Append score popup, auto-advance `currentRevealIndex`         |
| `round:winner`                  | Set winner data, transition to winner phase                   |
| `game:over`                     | Mark table COMPLETED, show GameOverOverlay                    |
| `error`                         | Set error string                                              |

### Emitted (client → server)

| Event         | When                       |
| ------------- | -------------------------- |
| `table:join`  | On hook mount              |
| `table:leave` | On unmount or Leave button |
| `bet:action`  | On any betting action      |

---

## CSS Architecture

Single file: `apps/web/src/index.css`. No CSS modules.

1. `@import 'tailwindcss'` — Tailwind v4 JIT
2. `:root` — design tokens (`--gold`, `--bg-deep`, `--green-glow`, etc.)
3. `.wpc-*` utility classes (card, btn-primary, btn-ghost, nav, label)
4. `@keyframes` — all animation definitions
5. `@media (max-height: 500px) and (orientation: landscape)` — overrides CSS custom properties for landscape mobile

Components read variables (`--btn-padding`, `--chip-btn-size`, etc.) — no inline breakpoint logic in TSX.

**Active keyframes:** `badge-pop`, `pot-flash`, `card-deal`, `tile-reveal`, `card-flip`, `score-tick`, `gold-burst`, `score-pop`, `fade-in-up`, `fade-in-up-sm`, `hero-breathe`, `blink`, `slide-up-panel`

---

## Key Patterns

**Atomic round reset**
`useGameSocket` uses `store.setState({...})` directly on `round:start` to batch the entire state reset into one render, preventing stale cross-field intermediate states.

**CSS animation replay via key remount**
To replay a CSS animation without an animation library, increment `potFlashKey` in the store and use it as the React `key` prop — React remounts the element, resetting the animation from frame 0.

**Showdown as a state machine**
The scoring sequence (reveal fixtures → score popups → winner banner) is driven by `showdownPhase` in the store. Each socket event transitions the phase forward; components read phase and render accordingly.

**SVG pointer-events**
SVG elements do not inherit `pointer-events` from parent divs — must be set explicitly on both wrapper and SVG.
