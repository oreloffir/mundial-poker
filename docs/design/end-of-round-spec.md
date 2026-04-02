# End-of-Round Experience — Design Spec v1

**Author:** Doni (Design)
**For:** Joni (Frontend), Soni (Backend — read S6 for event contract)
**Date:** 2026-04-01
**Status:** Rough concept — pending Clodi review before polish

---

## Overview

The end-of-round experience spans 5 phases and replaces the current `WaitingOverlay` + `ShowdownOverlay` with a cohesive, drama-driven sequence. The key design principle: **build suspense, delay gratification**.

Current state: all data dumps at once, no drama.
Target state: progressive reveals, one beat at a time.

---

## Phase Architecture — WHERE do reveals happen?

```
BETTING COMPLETE
│
├── Phase 1: Matches in Progress     → ON TABLE (no overlay)
│   Fixture tiles live on the pitch. Players can see each other's seats.
│
├── Phase 2: Fixture Reveals         → ON TABLE (no overlay)
│   Each fixture:result animates in, one tile at a time. Still on pitch.
│
├── Phase 3: Calculating Scores      → LIGHTWEIGHT FULL-SCREEN OVERLAY (2s only)
│   Semi-transparent. Transition moment. Very brief.
│
├── Phase 4: Player Score Reveals    → FULL-SCREEN OVERLAY (drama mode)
│   Table blurred behind. Each player gets their own full-width card reveal.
│
└── Phase 5: Winner Announcement     → RETURN TO TABLE
    Winner banner replaces pot at center. Seats visible, chips update.
```

**Rationale:**

- Phases 1–2 keep the social layer (seeing other players' seats/reactions) during match wait
- Phase 4 gets full canvas because the score breakdown story needs space to breathe
- Phase 5 returns to table because chip movement and winner reaction should be social

---

## Phase 1 — Matches in Progress

**Trigger:** `round:pause` received. Betting ends.

**Layout (on table, no overlay):**

```
┌─────────────────────────────────────────────────────────────────┐
│  [TOP BAR]                                                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         [seat 2]                    [seat 3]                    │
│                                                                 │
│  [seat 1]    ┌─────────────────────────────────┐   [seat 4]    │
│              │  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐  │               │
│              │  │   │ │   │ │   │ │   │ │   │  │               │
│              │  │ ? │ │ ? │ │ ? │ │ ? │ │ ? │  │               │
│              │  │   │ │   │ │   │ │   │ │   │  │               │
│              │  └───┘ └───┘ └───┘ └───┘ └───┘  │               │
│              │  5 fixture tiles — all showing ❓ VS ❓           │
│              │                                  │               │
│              │  ● Matches in Progress...        │               │
│              │    Fixture 1 reveals in 6s       │               │
│              └─────────────────────────────────┘               │
│                                                                 │
│                         [POT]                                   │
│                                                                 │
│                      [seat 0 — YOU]                             │
└─────────────────────────────────────────────────────────────────┘
```

**Fixture tile state — pending (VS):**

```
┌──────────┐
│    🏳️    │   ← homeFlag (emoji, 1.2rem)
│   BRA    │   ← homeTeamCode (8px, --text-muted)
├──────────┤
│   VS     │   ← --text-muted, 10px Outfit Black
├──────────┤
│    🏳️    │   ← awayFlag
│   SRB    │   ← awayTeamCode
└──────────┘
```

Width: `var(--fixture-tile-w)` = 72px desktop, 56px mobile
Border: `1px solid rgba(255,255,255,0.07)` (dim)
Background: `rgba(13,20,36,0.40)`

**"Matches in Progress" badge (below tiles):**

```
  ● Matches in Progress...
```

- Dot: 6px circle, `--gold`, `animation: blink 1.5s infinite`
- Text: 11px, `--text-dim`, font-semibold
- Pill background: `rgba(5,10,24,0.75)`, `border: 1px solid var(--border)`, `border-radius: 20px`, `padding: 4px 12px`

**No new components needed.** Enhance existing `WaitingBadge` and `FixtureBoard`.

---

## Phase 2 — Progressive Fixture Reveals

**Trigger:** `fixture:result` events (×5), one every ~5s.

**Each reveal animates in place on the pitch tile.**

**Fixture tile state — finished (with score):**

```
┌──────────┐
│    🇧🇷    │   ← homeFlag
│   BRA    │   ← homeCode, color: --green-glow (if win) / --text-muted (if loss)
├──────────┤
│  3 — 0   │   ← score: Outfit Black 14px
│          │     3 = --green-glow (winner), 0 = --text-muted
│  🔥🧤    │   ← event icons: 3+ goals 🔥, clean sheet 🧤, penalties 🥅
├──────────┤
│    🇷🇸    │
│   SRB    │   ← --text-muted (loser)
└──────────┘
```

Border on finish: `1px solid rgba(212,168,67,0.45)` (gold upgrade from dim)
Background on finish: `rgba(13,20,36,0.55)`
Animation on reveal: `tile-reveal 0.4s ease-out` (already defined in CSS)

**Score number color rules:**

- Win side (more goals): `--green-glow` (#2ecc71)
- Draw (equal goals): `--gold` (#d4a843)
- Loss side (fewer goals): `--text-muted` (#556680)

**Team code color rules (same logic):**

- Win: `--green-glow`
- Draw: `--gold`
- Loss: `--text-muted`

**Badge update when all 5 revealed:** Changes to a "Calculating Scores..." state (pulse stops, text changes) for 1s before Phase 3 overlay appears.

---

## Phase 3 — Calculating Scores (Transition)

**Trigger:** `round:scoring` received. Duration: ~2 seconds.

**Full-screen overlay — lightweight:**

```
┌─────────────────────────────────────────────────────────────────┐
│                         (blurred table)                         │
│                                                                 │
│                                                                 │
│               ╔═══════════════════════════════╗                 │
│               ║                               ║                 │
│               ║     ⚽  Calculating Scores    ║                 │
│               ║                               ║                 │
│               ║    ████████████░░░░░░░░░░░    ║                 │
│               ║    animating progress bar      ║                 │
│               ║                               ║                 │
│               ╚═══════════════════════════════╝                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Overlay container:**

- `position: absolute inset-0 z-40`
- `background: rgba(5,10,24,0.78)`
- `backdropFilter: blur(12px)`
- Enter animation: `fade-in-up 0.3s ease-out`
- Exit animation: `opacity 0, scale(0.96)` over 200ms

**Card:**

- `background: var(--bg-card)` = `#0d1424`
- `border: 1px solid var(--border)`
- `border-radius: 20px`
- `padding: 32px 48px`
- `box-shadow: 0 24px 60px rgba(0,0,0,0.6)`

**Content:**

- Football emoji: 32px
- "Calculating Scores": `font-cinzel 20px font-bold --gold gold-glow-subtle`
- Progress bar: fills left-to-right over 1.6s
  - Track: `height: 3px, background: rgba(255,255,255,0.06), border-radius: 4px, width: 200px`
  - Fill: `background: linear-gradient(90deg, var(--gold), var(--gold-bright))`
  - Animation: CSS `width` transition from `0% → 100%` over `1.6s linear`

**This overlay auto-dismisses** — no user interaction needed. Transitions to Phase 4 automatically.

---

## Phase 4 — Player Score Reveals (MAIN EVENT)

**Trigger:** `player:scored` events, lowest score first, 2.5s apart.

**This is the most important phase.** Each event reveals one player's full score story.

### 4A — Overlay container (persists for all players)

```
┌─────────────────────────────────────────────────────────────────┐
│  (blurred table visible behind — social context stays)         │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  SCOREBOARD HEADER                                       │   │
│  │  "Round 3 Results"          Rank 1 of 3 revealed ▓░░    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  PLAYER SCORE CARD (current reveal)                      │   │
│  │                                                          │   │
│  │  [See 4B below]                                          │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  (already shown) │
│  │ PlayerA   │  │ PlayerB   │  │ (next...)  │                  │
│  │ 8 pts #3  │  │ 14 pts #2 │  │           │                  │
│  └───────────┘  └───────────┘  └───────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Overlay background:**

- `rgba(5,10,24,0.88)` + `backdrop-filter: blur(16px)`
- z-index: 40

**Header bar** (top, full-width, 40px tall):

- Left: "Round 3 Results" — `font-cinzel 13px font-bold --gold`
- Right: Progress dots — one dot per player, filled gold for revealed, dim for pending
  - Dot: 6px circle, gap: 4px
  - Filled: `--gold`
  - Pending: `rgba(255,255,255,0.15)`

**Already-revealed mini-cards** (bottom strip, 72px height):
Shows previously revealed players as compact summary cards.

- Appear from left, slide in with `fade-in-up 0.4s ease-out`
- See 4C for spec

### 4B — Player Score Card (main reveal)

**Animation in:** `card-flip 0.5s ease-out` + `gold-burst 1.2s ease-out 0.3s` on border

```
Desktop (max-width: 520px, centered):

┌─────────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                                                          │  │
│  │  🎖 #2          [AVATAR RING]  AlexBot         14 pts   │  │
│  │                 [avatar 48px]                           │  │
│  │                                                          │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │                                                          │  │
│  │  CARD 1                          CARD 2                  │  │
│  │  ┌───────────────────────┐       ┌───────────────────────┐  │
│  │  │ 🇧🇷  BRAZIL           │       │ 🇩🇪  GERMANY          │  │
│  │  │ vs 🇷🇸 Serbia         │       │ vs 🇫🇷 France         │  │
│  │  │ 3 – 0                 │       │ 1 – 1                 │  │
│  │  ├───────────────────────┤       ├───────────────────────┤  │
│  │  │ Win        +5 pts     │       │ Draw       +3 pts     │  │
│  │  │ High Scorer +4 pts    │       │ —                     │  │
│  │  │ Clean Sheet +2 pts    │       │ —                     │  │
│  │  ├───────────────────────┤       ├───────────────────────┤  │
│  │  │ ★  11 pts             │       │ ★  3 pts              │  │
│  │  └───────────────────────┘       └───────────────────────┘  │
│  │                                                          │  │
│  │                ══════════════════                        │  │
│  │                  TOTAL  14 pts  (animates up)            │  │
│  │                ══════════════════                        │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Score card container:**

```
background: linear-gradient(145deg, var(--bg-card), var(--surface))
border: 1px solid rgba(212,168,67,0.25)
border-radius: 20px
padding: 20px 24px
max-width: 520px
width: calc(100vw - 32px)   ← fits mobile
box-shadow: 0 32px 80px rgba(0,0,0,0.7)
```

On winner reveal, upgrade border: `1px solid var(--gold)` + `box-shadow: 0 0 40px rgba(212,168,67,0.35), 0 32px 80px rgba(0,0,0,0.7)`

**Player header row:**

- Rank badge: `#2` in rounded pill — `background: rgba(255,255,255,0.06)`, `font-outfit font-black 12px`, `--text-dim`
  - Winner: `background: rgba(212,168,67,0.15)`, `color: --gold`, trophy icon 🏆
- Avatar: 48px circle — initial letter on `--surface` bg (Joni can add real avatars later)
- Username: `font-outfit font-bold 15px --text`
- Total score: `font-outfit font-black 22px --gold-bright` — animates count-up over 600ms

Divider: `1px solid rgba(255,255,255,0.06)`, margin: 12px 0

**Team Score Sub-card:**
Two cards side by side (gap: 12px). Each:

```
background: rgba(5,10,24,0.5)
border: 1px solid rgba(255,255,255,0.06)
border-radius: 12px
padding: 12px
flex: 1
```

**Sub-card header (match info):**

```
🇧🇷 BRAZIL                    ← flag emoji + team name, 13px font-outfit font-bold
vs 🇷🇸 Serbia                 ← "vs" 10px --text-muted + other team
3 – 0                         ← score, font-outfit font-black 18px, win color --green-glow
```

Score color rules (same as fixture tiles):

- Win side: `--green-glow`
- Draw: `--gold`
- Loss: `--text-muted`

**Score breakdown rows** (appear sequentially — staggered 150ms each):

```
Win         +5 pts    ← label: 11px --text-dim | value: 11px --green-glow font-semibold
High Scorer +4 pts    ← only shown if goalBonus > 0
Clean Sheet +2 pts    ← only shown if cleanSheetBonus > 0
Penalties   +1 pt     ← only shown if penaltyModifier > 0
                      ← negative modifier: color --red
```

If no bonus rows (e.g. draw, no bonuses): Show only the base score row.

Separator: `1px solid rgba(255,255,255,0.04)`, margin: 8px 0

**Sub-total row:**

```
★  11 pts    ← star icon + total, font-outfit font-black 13px --gold
```

**Grand total row** (below both cards, centered):

```
══════════════════
  TOTAL  14 pts     ← font-cinzel 16px font-bold --gold gold-glow-subtle
══════════════════
```

Score animates with `score-tick` keyframe on each count step.

### 4C — Already-Revealed Mini Cards (bottom strip)

Appears after each reveal, showing completed players.
Max 4 visible; if 5 players, last two compress.

```
┌───────────┐
│  A        │   ← avatar initial (24px circle)
│  AlexBot  │   ← 9px font-outfit, --text-dim, truncate 1 line
│  8 pts    │   ← 10px font-outfit font-black --gold
│  #3       │   ← 8px --text-muted
└───────────┘
```

```
width: 72px
background: rgba(5,10,24,0.6)
border: 1px solid rgba(212,168,67,0.15)
border-radius: 12px
padding: 6px 8px
```

Animation in: `fade-in-up 0.4s ease-out`

---

## Phase 5 — Winner Announcement

**Trigger:** `round:winner` received. 2s after last player revealed.

**Return to table — overlay FADES OUT** (opacity 0 over 400ms, then display:none).

**Enhanced WinnerBanner in table center:**

```
╔══════════════════════════════╗
║  🏆                          ║
║  AlexBot wins!               ║
║  +350 chips                  ║
╚══════════════════════════════╝
```

Current `WinnerBanner` is close. Enhancements:

- Add gold shimmer top-border: `3px gradient(90deg, transparent, --gold, transparent)` animated scan
- Add crown/trophy: 🏆 at 24px above name
- In split pots (multiple winners): "3-way split!" sub-line, smaller chip amounts per winner
- `gold-burst` animation on container
- Auto-dismiss: 5s fade out

**Chip update visual (PlayerSeat):**
When `players:update` fires, each seat's chip count should:

- If increased: flash `--green-glow`, `chip-increase` animation (already defined in CSS)
- If decreased: flash `--red`, `chip-decrease` animation (already defined in CSS)

These are already defined as keyframes in `index.css`. Joni just needs to trigger the class.

---

## Animation Timeline

```
t=0s     round:pause received
         │── fixture tiles appear (pending VS state)
         │── WaitingBadge animates in (blink dot)

t=5s     fixture:result #1
         │── Tile 1 flips to score: tile-reveal 0.4s

t=10s    fixture:result #2
         │── Tile 2 flips

t=15s    fixture:result #3
         │── Tile 3 flips

t=20s    fixture:result #4
         │── Tile 4 flips

t=25s    fixture:result #5
         │── Tile 5 flips
         │── WaitingBadge: changes text to "Calculating..."

t=27s    round:scoring received
         │── Phase 3 overlay appears: fade-in-up 0.3s
         │── Progress bar: fills over 1.6s
         │── Phase 3 overlay exits: 0.2s fade out

t=29s    Phase 4 overlay enters: fade-in-up 0.4s
         │── player:scored #1 (lowest score)
         │── Score card slides in: card-flip 0.5s
         │── gold-burst on border: 1.2s at t+0.3s
         │── score breakdown rows stagger in: 150ms each (4 rows max = 600ms)
         │── score count-up: 600ms

t=31.5s  player:scored #2
         │── Card #1 collapses to mini-card: scale 0.4s ease-in
         │── Card #2 flips in

t=34s    player:scored #3
         │── Card #2 collapses, Card #3 flips in

(repeat for N players at 2.5s intervals)

t=31.5s + (N-1)×2.5s + 2s   round:winner received
         │── Phase 4 overlay fades out: 0.4s
         │── Table returns
         │── WinnerBanner appears: fade-in-up 0.6s
         │── players:update → chip flashes on seats

t+5s     WinnerBanner auto-dismisses
t+6s     round:start → next round begins
```

---

## Mobile Landscape Variant

At `@media (max-height: 500px) and (orientation: landscape)`:

**Phases 1–2 (on table):** No change. `--fixture-tile-w: 56px` already handles this.
Event icons: `.mobile-landscape-hide` (already implemented in FixtureBoard).

**Phase 3 (calculating):**

- Card: `padding: 16px 28px`, text: `16px`, progress bar: `width: 160px`
- Same overlay, just tighter

**Phase 4 (player reveals) — key change:**
Switch from stacked layout to horizontal two-column layout:

```
Mobile landscape (h<500px):
┌─────────────────────────────────────────────────────────────────┐
│ [header bar — 28px]                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Player header: avatar+name+total 30px]                        │
│                                                                 │
│  ┌──────────────────────┐   ┌──────────────────────┐           │
│  │ 🇧🇷 BRAZIL vs 🇷🇸    │   │ 🇩🇪 GERMANY vs 🇫🇷   │           │
│  │ 3 – 0                │   │ 1 – 1                │           │
│  │ Win +5               │   │ Draw +3              │           │
│  │ HS +4  CS +2         │   │ —                    │           │
│  │ ★ 11pts              │   │ ★ 3pts               │           │
│  └──────────────────────┘   └──────────────────────┘           │
│                                                                 │
│                  TOTAL 14 pts                                   │
│                                                                 │
│  [mini-cards strip: 48px tall]                                  │
└─────────────────────────────────────────────────────────────────┘
```

Key changes:

- Score card: `max-height: calc(100vh - 28px)`, `padding: 10px 12px`
- Team sub-cards: always side-by-side (same as desktop, good)
- Sub-card text: reduce to 10px for names, 12px for scores
- Rank/avatar header: `height: 28px`, avatar `36px`
- Grand total: `font-size: 14px`
- Mini-cards strip: `height: 48px` (compressed), show max 3

---

## Component Map for Joni

### New components to create:

| Component             | File                                      | Notes                                        |
| --------------------- | ----------------------------------------- | -------------------------------------------- |
| `RoundResultsOverlay` | `components/game/RoundResultsOverlay.tsx` | Phase 3+4 overlay wrapper                    |
| `PlayerScoreCard`     | `components/game/PlayerScoreCard.tsx`     | Phase 4 main card (4B)                       |
| `TeamScoreSubCard`    | `components/game/TeamScoreSubCard.tsx`    | Each team's breakdown (extracted from above) |
| `RevealedPlayerMini`  | `components/game/RevealedPlayerMini.tsx`  | Phase 4 bottom strip items (4C)              |
| `CalculatingOverlay`  | `components/game/CalculatingOverlay.tsx`  | Phase 3 transition                           |
| `WinnerBanner`        | Already exists in `PokerTable.tsx`        | Extract + enhance                            |

### Components to update:

| Component         | File                                  | What changes                                                                                 |
| ----------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| `FixtureBoard`    | `components/game/FixtureBoard.tsx`    | Accept `fixtures` with full team objects (homeTeam/awayTeam), use team names in score reveal |
| `WaitingBadge`    | `PokerTable.tsx` (inline)             | Extract to own file, add phase prop: `'waiting' \| 'calculating'`                            |
| `ShowdownOverlay` | `components/game/ShowdownOverlay.tsx` | **DELETE** — replaced by `RoundResultsOverlay`                                               |
| `WaitingOverlay`  | `components/game/WaitingOverlay.tsx`  | **DELETE** — replaced by Phase 1 inline state                                                |

### Store changes (Joni to discuss with Soni):

New state needed in `gameStore.ts`:

```typescript
// New phase state
readonly roundPhase: 'idle' | 'waiting' | 'fixtures' | 'calculating' | 'reveals' | 'winner'

// New event data
readonly fixtureResults: readonly FixtureResultEvent[]  // from fixture:result events
readonly playerScoreReveals: readonly PlayerScoredEvent[]  // accumulated player:scored
readonly currentRevealIndex: number  // which player:scored we're showing now
readonly winnerData: RoundWinnerEvent | null  // from round:winner

// Actions
readonly setRoundPhase: (phase: RoundPhase) => void
readonly addFixtureResult: (result: FixtureResultEvent) => void
readonly addPlayerScoreReveal: (reveal: PlayerScoredEvent) => void
readonly setCurrentRevealIndex: (index: number) => void
readonly setWinnerData: (data: RoundWinnerEvent | null) => void
```

---

## Color Reference for This Feature

| Element           | Color                | Token                 |
| ----------------- | -------------------- | --------------------- |
| Win result        | `#2ecc71`            | `--green-glow`        |
| Draw result       | `#d4a843`            | `--gold`              |
| Loss result       | `#556680`            | `--text-muted`        |
| Score total       | `#f0cc5b`            | `--gold-bright`       |
| Bonus label       | `#8899b0`            | `--text-dim`          |
| Negative modifier | `#e74c3c`            | `--red`               |
| Card bg           | `#0d1424`            | `--bg-card`           |
| Sub-card bg       | `rgba(5,10,24,0.5)`  | custom (darker inset) |
| Overlay bg        | `rgba(5,10,24,0.88)` | custom                |

---

## Score Breakdown Row Logic (for Joni)

Show/hide rules for each breakdown row:

```
Row: "Win / Draw / Loss"
  Always shown. Label depends on result.
  Win → label: "Win", value: "+5", color: --green-glow
  Draw → label: "Draw", value: "+3", color: --gold
  Loss → label: "Loss", value: "+0", color: --text-muted

Row: "High Scorer"
  Only shown if goalBonus > 0
  value: `+${goalBonus}`, color: --green-glow

Row: "Clean Sheet"
  Only shown if cleanSheetBonus > 0
  value: `+${cleanSheetBonus}`, color: --green-glow

Row: "Penalties"
  Only shown if penaltyModifier !== 0
  Positive → `+${penaltyModifier}`, color: --green-glow
  Negative → `${penaltyModifier}`, color: --red

Row: Sub-total
  Always shown. value: `${totalScore} pts`, color: --gold
```

---

## Open Questions — RESOLVED (Clodi, 2026-04-01)

1. **Folded players** — ✅ SHOW them in the bottom strip, dimmed, with a "Folded" label. Don't omit.

2. **Bot indicator** — ✅ Show 🤖 on bot avatars. Players must know who is human vs bot.

3. **Split pot wording** — ✅ 2-way: `"{Player1} & {Player2} split the pot — 100 chips each"`. 3+: `"3-way split — 67 chips each"`. One line, no trophy icon on multi-winner.

4. **Card flip delay** — ✅ Trust the server's 2.5s gap. Frontend renders immediately when `player:scored` arrives. No client-side delay on top.

5. **Sound** — Out of scope for now, but the score card design has natural hooks for SFX: tile flip, score count-up, gold burst on winner. Flag this for future sprint.

---

_Doni — Design Lead_
_Next: Player Avatar System (due April 10)_
