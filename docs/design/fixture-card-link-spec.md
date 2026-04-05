# DN2 — Fixture-to-Card Visual Link Spec

**Author:** Doni (Design)
**For:** Joni (Frontend) · Sprint 7 task J38
**Status:** Approved — implement from this spec
**Date:** April 5, 2026
**Blocks:** J38 (Joni cannot start without this)

SUPERSEDES: nothing — this is a new feature spec extending DN1 (`docs/design/game-ux-complete.md`). DN1 remains canonical for all game layout and phase rules. This spec adds the tether system on top of DN1 without changing any existing layout.

---

## The Problem

Players hold 2 team cards in the bottom dock (e.g., Brazil, Germany). The fixture board shows 5 matchups (e.g., Brazil vs Japan, Germany vs France). Nothing connects them visually. A first-time player sees a poker game and a sports scoreboard — two separate things. The core mechanic (your cards ARE your teams in those fixtures) is invisible.

Mark's Sprint 6 audit confirmed: "YOUR fixtures gold highlight hard to confirm at 375px."

The current gold border on fixture tiles doesn't distinguish between which of the player's 2 cards maps to which fixture. Even if the border were louder, you'd have two gold-bordered fixtures and no way to know which card matches which.

---

## The Solution: Dual-Color Tether System

Each of the player's 2 hand cards is assigned a **tether color**. Its matching fixture tile on the board gets the exact same color treatment. The visual link is chromatic — no lines, no floating elements, no layer model violations.

- **Card 0** → tether color A: `#3d9fff` (sky blue)
- **Card 1** → tether color B: `#ff9500` (sports orange)

Both the DockCard and its matching fixture tile breathe with the same pulse animation, in sync. The visual rhythm creates the mental link without any physical connector crossing the pitch.

**Why these colors:**
- Blue (`#3d9fff`): Premium sports-tech feel. Used in UEFA Champions League broadcast graphics. Not in our existing semantic palette.
- Orange (`#ff9500`): Sports broadcast highlight color. Clearly distinct from gold (`#d4a843`), which is a darker yellow. Not used anywhere in the current palette for semantic meaning.
- Both are legible on `#050a18`/`#0d1424` dark backgrounds.

---

## New CSS Tokens

Add to `apps/web/src/index.css` in the `:root` block, near the existing color tokens:

```css
/* Tether colors — fixture-to-card link system */
--tether-a: #3d9fff;
--tether-a-dim: rgba(61, 159, 255, 0.2);
--tether-a-glow: rgba(61, 159, 255, 0.5);
--tether-b: #ff9500;
--tether-b-dim: rgba(255, 149, 0, 0.2);
--tether-b-glow: rgba(255, 149, 0, 0.5);
```

---

## New Keyframe Animations

Add to `apps/web/src/index.css`:

```css
/* Tether pulse — DockCard and fixture tile breathe together */
@keyframes tether-pulse-a {
  0%, 100% {
    box-shadow: 0 0 6px var(--tether-a-dim), 0 2px 8px rgba(0,0,0,0.5);
  }
  50% {
    box-shadow: 0 0 18px var(--tether-a-glow), 0 2px 8px rgba(0,0,0,0.5);
  }
}

@keyframes tether-pulse-b {
  0%, 100% {
    box-shadow: 0 0 6px var(--tether-b-dim), 0 2px 8px rgba(0,0,0,0.5);
  }
  50% {
    box-shadow: 0 0 18px var(--tether-b-glow), 0 2px 8px rgba(0,0,0,0.5);
  }
}

/* Card sync flash — fires on the DockCard when its fixture reveals a score */
@keyframes card-sync-flash-a {
  0%   { box-shadow: 0 0 6px var(--tether-a-dim); transform: scale(1); }
  20%  { box-shadow: 0 0 28px var(--tether-a-glow), 0 0 50px rgba(61,159,255,0.25); transform: scale(1.08); }
  100% { box-shadow: 0 0 6px var(--tether-a-dim); transform: scale(1); }
}

@keyframes card-sync-flash-b {
  0%   { box-shadow: 0 0 6px var(--tether-b-dim); transform: scale(1); }
  20%  { box-shadow: 0 0 28px var(--tether-b-glow), 0 0 50px rgba(255,149,0,0.25); transform: scale(1.08); }
  100% { box-shadow: 0 0 6px var(--tether-b-dim); transform: scale(1); }
}
```

**Timing notes:**
- Pulse duration: `2.4s ease-in-out infinite` — slightly slower than the fixture board pulse (`2s`) so they breathe at different rates and don't feel mechanical
- Sync flash duration: `0.5s ease-out both` — fast enough to feel reactive, slow enough to register
- The sync flash fires once when `isFixtureRevealed` transitions from `false` to `true`

---

## Changes to `PlayerCardDock.tsx`

### 1. Subscribe to fixture results in `PlayerCardDock`

`PlayerCardDock` needs to know when each of the player's fixtures has been revealed. Add a store subscription:

```tsx
// Add inside PlayerCardDock function body
const fixtureResults = useGameStore((s) => s.fixtureResults)
```

### 2. Pass `cardIndex` and `isFixtureRevealed` to `DockCard`

Replace the current `.map()` call (line 160-163):

```tsx
{cards.map((card, cardIndex) => {
  const scoreCard = scoreResult?.cardScores.find((cs) => cs.teamId === card.teamId)
  const isFixtureRevealed = fixtureResults.some((r) => r.fixtureId === card.fixtureId)
  return (
    <DockCard
      key={card.teamId}
      card={card}
      scoreCard={scoreCard}
      cardIndex={cardIndex}
      isFixtureRevealed={isFixtureRevealed}
    />
  )
})}
```

### 3. Update `DockCard` props interface

```tsx
function DockCard({
  card,
  scoreCard,
  cardIndex,
  isFixtureRevealed,
}: {
  readonly card: TeamCard
  readonly scoreCard?: CardScoreData
  readonly cardIndex: number
  readonly isFixtureRevealed: boolean
}) {
```

### 4. Tether color logic inside `DockCard`

```tsx
const tether = cardIndex === 0
  ? { color: 'var(--tether-a)', dim: 'var(--tether-a-dim)', glow: 'var(--tether-a-glow)', pulseAnim: 'tether-pulse-a', flashAnim: 'card-sync-flash-a' }
  : { color: 'var(--tether-b)', dim: 'var(--tether-b-dim)', glow: 'var(--tether-b-glow)', pulseAnim: 'tether-pulse-b', flashAnim: 'card-sync-flash-b' }
```

### 5. Updated `DockCard` render — pre-scoring state

When `res` (score result) is null, apply tether treatment:

```tsx
// Border
border: res
  ? `1.5px solid ${RESULT_COLOR[res]}`
  : `1.5px solid ${tether.color}`,

// Box shadow + animation
...(res
  ? { boxShadow: `0 0 8px ${RESULT_COLOR[res]}44` }
  : isFixtureRevealed
    ? { animation: `${tether.flashAnim} 0.5s ease-out both` }  // one-shot flash
    : { animation: `${tether.pulseAnim} 2.4s ease-in-out infinite` }  // breathing pulse
),
```

**Important:** Once `res` is set (scoring complete), result color takes over completely. The tether animation stops. This is correct — the tether did its job during betting/waiting; after scoring the result is the signal.

### 6. Team code color

```tsx
color: res ? RESULT_COLOR[res] : tether.color,
```

Team code should match the tether color pre-score, then the result color post-score.

### Full updated `DockCard` component

```tsx
function DockCard({
  card,
  scoreCard,
  cardIndex,
  isFixtureRevealed,
}: {
  readonly card: TeamCard
  readonly scoreCard?: CardScoreData
  readonly cardIndex: number
  readonly isFixtureRevealed: boolean
}) {
  const res = scoreCard ? getResult(scoreCard) : null

  const tether = cardIndex === 0
    ? {
        color: 'var(--tether-a)',
        pulseAnim: 'tether-pulse-a 2.4s ease-in-out infinite',
        flashAnim: 'card-sync-flash-a 0.5s ease-out both',
      }
    : {
        color: 'var(--tether-b)',
        pulseAnim: 'tether-pulse-b 2.4s ease-in-out infinite',
        flashAnim: 'card-sync-flash-b 0.5s ease-out both',
      }

  const borderColor = res ? RESULT_COLOR[res] : tether.color
  const boxShadow = res
    ? `0 0 8px ${RESULT_COLOR[res]}44`
    : undefined  // animation handles shadow when no result

  const animation = res
    ? undefined
    : isFixtureRevealed
      ? tether.flashAnim
      : tether.pulseAnim

  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg overflow-hidden relative"
      style={{
        width: 30,
        height: 42,
        background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
        border: `1.5px solid ${borderColor}`,
        boxShadow,
        flexShrink: 0,
        gap: 2,
        transition: 'border-color 0.3s ease',
        animation,
      }}
    >
      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{card.team.flagUrl}</span>
      <span
        style={{
          fontSize: 7,
          fontWeight: 700,
          color: res ? RESULT_COLOR[res] : tether.color,
          lineHeight: 1,
          letterSpacing: '0.05em',
          transition: 'color 0.3s ease',
        }}
      >
        {card.team.code}
      </span>
      {res && (
        <span
          style={{
            fontSize: 7,
            fontWeight: 800,
            color: RESULT_COLOR[res],
            lineHeight: 1,
          }}
        >
          {res}
        </span>
      )}
    </div>
  )
}
```

---

## Changes to `FixtureBoard.tsx`

### 1. Replace `myFixtureIds` Set with `myFixtureMap` Map

Replace line 36:
```tsx
// BEFORE
const myFixtureIds = new Set(myHand?.map((c) => c.fixtureId) ?? [])

// AFTER
const myFixtureMap = new Map(
  myHand?.map((c, i) => [c.fixtureId, i]) ?? []
)
// myFixtureMap.get(f.id) returns 0 (card 0) or 1 (card 1) or undefined (not mine)
```

### 2. Derive tether index per fixture

Inside the `.map()` for each fixture tile:

```tsx
const myFixtureIndex = myFixtureMap.get(f.id)  // 0, 1, or undefined
const isMyFixture = myFixtureIndex !== undefined

const tether = myFixtureIndex === 0
  ? { color: 'var(--tether-a)', glow: 'rgba(61,159,255,0.4)', pulseAnim: 'tether-pulse-a' }
  : myFixtureIndex === 1
    ? { color: 'var(--tether-b)', glow: 'rgba(255,149,0,0.4)', pulseAnim: 'tether-pulse-b' }
    : null
```

### 3. Updated fixture tile border and shadow

```tsx
border: isMyFixture
  ? `2px solid ${tether!.color}`
  : finished
    ? '1px solid rgba(212, 168, 67, 0.45)'
    : '1px solid rgba(255, 255, 255, 0.07)',

boxShadow: isMyFixture
  ? `0 0 14px ${tether!.glow}, 0 8px 24px rgba(0,0,0,0.5)`
  : '0 8px 24px rgba(0,0,0,0.5)',

// Pulse animation on my fixture tiles (before scoring; stop after finished)
animation: isMyFixture && !finished
  ? `${tether!.pulseAnim} 2.4s ease-in-out infinite`
  : isNewResult
    ? 'tile-reveal 0.4s ease-out both'
    : !inShowdownPhase && !showAll
      ? 'tile-reveal 0.3s ease-out both'
      : undefined,
```

**Why stop pulsing when `finished`:** Once the score is in, the fixture tile should be stable and readable. The tether did its job during waiting. After scoring, result colors (green/gold/red on the score numbers) communicate outcome.

### 4. Updated "YOUR MATCH" label

```tsx
{isMyFixture && (
  <span
    className="font-outfit font-bold uppercase tracking-widest"
    style={{
      fontSize: 7,
      color: tether!.color,
      letterSpacing: '0.05em',
      opacity: 0.9,
    }}
  >
    YOUR MATCH
  </span>
)}
```

Color changes from gold to tether color. This means a first-time player sees:
- A blue-bordered fixture tile labeled "YOUR MATCH" in blue
- A blue-bordered DockCard below, pulsing in the same blue
- The connection is unmistakable

---

## Behavior Summary by Phase

### Betting phase (Frames 4 and 5 in DN1)

The fixture board is NOT visible during betting (DN1, Frame 5). The only tether elements visible are the DockCards in the bottom dock.

- Card 0: blue border, blue team code, breathing blue glow (`tether-pulse-a`)
- Card 1: orange border, orange team code, breathing orange glow (`tether-pulse-b`)

**Why this matters even without the fixture board:** Players now see "I have a blue card and an orange card." When the fixture board appears, they immediately understand which fixture belongs to which card.

### Waiting/fixtures phase (Frames 6 and 7 in DN1)

Fixture board becomes visible. My 2 fixture tiles appear with matching tether colors — one blue-bordered, one orange-bordered. The DockCards in the dock pulse at the same rhythm. The color match is the connection.

- Blue fixture → blue DockCard: same color, same breath
- Orange fixture → orange DockCard: same color, same breath

### Scoring / reveals phase (Frame 9 in DN1)

When a fixture tile reveals its score (`isNewResult = true`, `finished = true`):
1. Fixture tile border stops pulsing — result colors take over on the score numbers
2. The matching DockCard fires `card-sync-flash-a/b` — a single bright burst (0.5s), then resumes the pulse briefly before result arrives

When `scoreResult` arrives for the player:
1. DockCard border transitions to result color (W=green, D=gold, L=red) — existing behavior
2. Tether animation stops completely
3. W/D/L stamp appears — existing behavior

---

## Layer Model Compliance

- Tether colors are applied to: DockCard (Layer 4 — bottom dock) and FixtureBoard tile (Layer 2 — pitch)
- No visual element crosses the pitch between dock and fixture board
- No new components. No overlaid lines. No floating elements.
- This is purely chromatic tethering — color and animation only.

---

## Mobile-Specific Notes (667×375)

- The DockCards at 30×42px: the tether color is visible as a 1.5px border. This is fine — the pulse animation (glow shadow) is the primary signal, not the border width alone.
- Fixture tiles at `var(--fixture-tile-w)` = 60px: 2px border is clearly visible.
- The pulse glow at `0 0 18px var(--tether-a-glow)` is visible on dark backgrounds at 375px width — the blur radius (18px) is large enough to read.
- Color-only signal on small screens: blue vs orange are highly distinguishable even at reduced resolution.

---

## What Joni Does NOT Need To Do

- No new components. Changes are inside existing `DockCard`, `PlayerCardDock`, `FixtureBoard`.
- No backend changes. `myHand[0].fixtureId` and `myHand[1].fixtureId` are already available.
- No changes to socket events. No coordination needed with Soni.
- No changes to `PokerTable.tsx`, `PlayerSeat.tsx`, or `SeatScorePopup.tsx`.
- No changes to `index.css` except adding 6 new tokens and 4 new keyframes (listed above).

---

## Deliverable Checklist

- [x] Exact tether color tokens with hex values
- [x] Exact border and shadow CSS per state
- [x] Animation keyframes with timing and easing
- [x] DockCard changes fully specced (props, logic, render)
- [x] FixtureBoard changes fully specced (Map replace, border/shadow, label color)
- [x] Phase-by-phase behavior documented
- [x] Layer model compliance verified
- [x] Mobile-specific adjustments noted
- [x] What's out of scope listed

— Doni
