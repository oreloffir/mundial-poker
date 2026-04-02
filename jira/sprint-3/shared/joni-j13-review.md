# Code Review — J13 Overlay Polish PR

**Reviewer:** Soni (Senior Dev, Backend)
**PR:** J13 — Full showdown overlay polish
**Files reviewed:** `RoundResultsOverlay.tsx`, `PlayerScoreCard.tsx`, `TeamScoreSubCard.tsx`, `RevealedPlayerMini.tsx`, `PokerTable.tsx`, `gameStore.ts`, `index.css`
**Date:** April 2, 2026

---

## Overall Assessment

**APPROVED — solid execution on a complex UI.** The showdown overlay looks great, the animation sequencing is well-thought-out, and the `useCountUp` hook is a clean pattern. You clearly understand what you built and why.

The three things I'd most want you to take away from this review:

- **Inverted dependency:** The store shouldn't import from a component file. `CardScoreData` needs to move out of `TeamScoreSubCard.tsx` before this pattern spreads.
- **`as never` is a TypeScript red card:** When you write `as never`, TypeScript stops checking. Every one of these is a bug waiting to happen. I'll show you the correct generics.
- **Inline styles are for dynamic values only.** Static layout belongs in CSS. Right now `RoundResultsOverlay` has zero CSS classes on structural elements — that's going to hurt when you need to add a media query.

---

## Comment 1 — Architecture: `CardScoreData` is defined in a component and imported by the store

**File:** `gameStore.ts` line 3, `TeamScoreSubCard.tsx` lines 3–22

```typescript
// gameStore.ts
import type { CardScoreData } from '@/components/game/TeamScoreSubCard'
```

This is an **inverted dependency**. The store is a low-level module (no React, no UI). A component is a high-level module. When the store imports from a component, you've created a dependency cycle risk: the component will eventually need to import something from the store (it already does via `useGameStore`), and now the store imports back from the component.

The correct mental model is a one-way dependency graph:
```
packages/shared  →  stores  →  hooks  →  components
```

`CardScoreData` describes the shape of data from a socket event — it belongs in `packages/shared/types/socket-events.ts` next to `PlayerScoredPayload`. Or at minimum in `src/types/game.ts` in the web app.

**What to do:** Move `CardScoreData` into `packages/shared` (I can add it there since I own that file) and update imports in `TeamScoreSubCard.tsx` and `gameStore.ts`. Tag me on this — I'll add it to the `PlayerScoredPayload` in `socket-events.ts` so the types are co-located with the server contract.

---

## Comment 2 — TypeScript: `useCountUp` is duplicated in two files

**Files:** `PlayerScoreCard.tsx` lines 13–33, `TeamScoreSubCard.tsx` lines 32–59

Two slightly different versions of the same hook. The `TeamScoreSubCard` version is more complete (has the `animate` flag guard). The `PlayerScoreCard` version always runs.

**When to extract a hook:** Any time you've copied logic with a `use*` prefix into a second file. That's the signal. Extract to `src/hooks/useCountUp.ts`:

```typescript
export function useCountUp(target: number, duration: number, enabled = true): number {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!enabled || target === 0) { setCount(target); return }
    setCount(0)
    const steps = Math.min(target, 30)
    const stepMs = duration / steps
    let step = 0
    const id = setInterval(() => {
      step++
      if (step >= steps) { setCount(target); clearInterval(id) }
      else setCount(Math.round((target / steps) * step))
    }, stepMs)
    return () => clearInterval(id)
  }, [target, duration, enabled])
  return count
}
```

Same pattern applies to `getAvatarColor` + `AVATAR_COLORS` — both are duplicated between `PlayerScoreCard.tsx` and `RevealedPlayerMini.tsx`. Extract to `src/utils/avatar.ts`.

---

## Comment 3 — TypeScript: Dead code — `animateRef` is set but never read

**File:** `TeamScoreSubCard.tsx` lines 34–35

```typescript
const animateRef = useRef(animate)
animateRef.current = animate
// ↑ This ref is never used anywhere
```

The `useEffect` below reads `animate` directly from its dependency array closure — which is correct. The `animateRef` was likely added during a refactor where you considered using the ref inside the effect to avoid stale closure issues, but then didn't. It's dead code now.

**When to use `useRef` for a value:** When you need to read the *latest* value of a prop inside an effect or callback without that prop being in the dep array. Example: you have an `onComplete` callback prop and you want the effect to call `onComplete` without restarting the interval every time `onComplete` changes. In this component, `animate` IS in the dep array, so the ref is unnecessary.

Delete lines 34–35.

---

## Comment 4 — TypeScript: `as never` is a type error in disguise

**Files:** `useGameSocket.ts` (reconnect recovery block), `PokerTable.tsx` line 269

```typescript
// useGameSocket.ts — SF-01b reconnect replay
store.getState().addFixtureResult(f as never)
store.getState().addPlayerScoreReveal(s as never)
store.getState().setShowdownPhase(sp as never)

// PokerTable.tsx
<FixtureBoard fixtures={fixtures as never} .../>
```

`as never` tells TypeScript: "trust me, this is the right type, stop checking." It's stronger than `as unknown` and it completely disables type inference. If the server ever changes the shape of `resolvedFixtures`, TypeScript won't catch the mismatch — it'll just crash at runtime.

**Root cause in the reconnect case:** `ri.resolvedFixtures` is typed as `unknown[]` because I didn't give it a proper type in the `table:state` handler. The fix is on my side — I'll update the type annotation in `useGameSocket.ts` to:

```typescript
resolvedFixtures?: FixtureResultEvent[]
revealedPlayerScores?: PlayerScoredData[]
```

Once I do that, the `as never` casts in the replay block can be removed. I'll flag this as a shared task.

For `PokerTable.tsx`, `fixtures as never` is masking a mismatch between `readonly unknown[]` and whatever `FixtureBoard` expects. Check what `FixtureBoard` actually accepts and adjust either the prop type or the store type. Don't cast through `never` to hide a type mismatch.

**Rule of thumb:** `as SomeType` is sometimes OK when crossing a boundary you own (e.g., a JSON parse). `as unknown as SomeType` is a yellow flag — do it only when you have no other option and add a comment explaining why. `as never` is almost always wrong.

---

## Comment 5 — CSS/Animation: Inline styles for static layout in `RoundResultsOverlay`

**File:** `RoundResultsOverlay.tsx`

Every structural style in this component is an inline style object:

```tsx
<div style={{
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  background: 'rgba(5,10,24,0.92)',
  backdropFilter: 'blur(16px)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  height: '100%',   // ← also redundant: inset:0 already fills the viewport
}}>
```

**Rule for inline styles vs CSS:** Inline styles are for *dynamic* values — things that change based on props or state. Static layout (position, display, flex direction, z-index) belongs in CSS classes.

The `background` and `backdropFilter` are static here — they don't change. Move them to a class in `index.css`:

```css
.overlay-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(5, 10, 24, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  flex-direction: column;
  align-items: center;
}
```

This also makes it **responsive** — you can now add `@media` rules to override layout for landscape mobile without touching JSX.

Note: `height: '100%'` on a `position: fixed; inset: 0` element is redundant. `inset: 0` is equivalent to `top: 0; right: 0; bottom: 0; left: 0`, which already stretches the element to the full viewport. Remove `height: '100%'` — it can actually cause issues on iOS Safari where the viewport height changes dynamically.

---

## Comment 6 — CSS/Animation: `card-flip` — why `ease-out` is the right choice

**File:** `PlayerScoreCard.tsx` line 70, `index.css` lines 261–270

```css
@keyframes card-flip {
  0% { transform: perspective(600px) rotateY(90deg); opacity: 0; }
  100% { transform: perspective(600px) rotateY(0deg); opacity: 1; }
}
/* Applied as: animation: 'card-flip 0.5s ease-out both' */
```

Good choice using `ease-out` here. Here's why it matters:

- **`ease-in`:** Starts slow, ends fast. Good for things *leaving* the screen (they accelerate away).
- **`ease-out`:** Starts fast, ends slow. Good for things *arriving* — they decelerate into their resting position. Feels natural, like catching a ball.
- **`ease-in-out`:** Symmetric S-curve. Good for looping animations or things moving across the screen with equal entry and exit weight.
- **`linear`:** Robotic, only use for spinners or progress bars.

For a card flipping into view, `ease-out` is correct — the card rushes in and then settles. `ease-in-out` would make the entry feel too slow to start.

One note: `perspective()` inside a `transform` keyframe applies the perspective per-element, giving each element its own vanishing point. For cards that appear one-at-a-time (which you have), this is fine. If you ever show multiple cards simultaneously, you'd want `perspective` on the parent container instead so they share a single vanishing point. Worth knowing for the future.

---

## Comment 7 — CSS/Animation: `fade-in-up` travel distance is too large for small elements

**File:** `index.css` lines 324–333

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}
```

This is used for the `ScoreRow` items in `TeamScoreSubCard` — each row is 11px font size. The element travels 30px, which is almost 3x its own height. The motion feels disproportionate to the element.

**General guideline:** Animation travel distance should be proportional to the element's visual weight. For small labels, 6–12px is plenty. For large hero cards, 20–30px is appropriate.

Since `fade-in-up` is a shared keyframe (likely used in other places too), consider adding a second version:

```css
@keyframes fade-in-up-sm {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

And use `fade-in-up-sm` in `ScoreRow` and `fade-in-up` for larger elements.

---

## Comment 8 — React: `rowIdx` mutation inside render is a stale pattern

**File:** `TeamScoreSubCard.tsx` lines 107–108

```typescript
let rowIdx = 0
const rowDelay = () => staggerBase + rowIdx++ * 150
```

This is a mutable counter inside a render function. The side effect (`rowIdx++`) happens during render, which is supposed to be pure in React. In StrictMode (development), React intentionally renders components twice — `rowIdx` would be incremented 2× on the first mount, but because it's re-initialized to `0` at each render call, you'd get the same result both times. So this isn't a bug, but it's a code smell that will confuse future readers.

The explicit version is clearer and has no mutation:

```tsx
const delays = {
  base: staggerBase,
  goalBonus: staggerBase + 150,
  cleanSheet: staggerBase + 300,
  penalty: staggerBase + 450,
}
```

Then pass `delays.goalBonus` instead of `rowDelay()`. No mutation, immediately readable.

---

## Comment 9 — React: `mountedRef` in `PokerTable` is unused

**File:** `PokerTable.tsx` lines 194–199

```typescript
const mountedRef = useRef(true)

useEffect(() => {
  mountedRef.current = true
  return () => { mountedRef.current = false }
}, [])
```

`mountedRef` is never read anywhere in the component. This pattern is used when you need to guard async callbacks against running after a component unmounts (e.g., `if (!mountedRef.current) return` inside a setTimeout). But there's no such guard here.

If this was scaffolding for an async operation you were planning, great — but remove it until it's needed. Unused `useRef`s add confusion.

---

## Comment 10 — Contract Review: Server payload ↔ client types ✅

**Files:** `packages/shared/types/socket-events.ts`, `gameStore.ts`, `TeamScoreSubCard.tsx`

Doing the contract check per our process:

| Server payload | Client type | Match? |
|---|---|---|
| `PlayerScoredPayload.userId` | `PlayerScoredData.userId` | ✅ |
| `PlayerScoredPayload.isBot` | `PlayerScoredData.isBot` | ✅ |
| `PlayerScoredPayload.rank` | `PlayerScoredData.rank` | ✅ |
| `PlayerScoredPayload.isWinner` | `PlayerScoredData.isWinner` | ✅ |
| `PlayerScoredPayload.cardScores[i].fixture.opponentTeam` | `CardScoreData.fixture.opponentTeam` | ✅ |
| `FixtureResultPayload` | `FixtureResultEvent` | ✅ |
| `RoundWinnerPayload` | `RoundWinnerData` | ✅ |

**CONTRACT: `player:scored` payload — APPROVED.** No changes needed. The `opponentTeam` field (from my SF-01d work) is correctly typed as optional in both `PlayerScoredPayload` and `CardScoreData`.

**Separate issue to track (pre-existing, not in J13):** The `blinds:posted` server emission shape doesn't match `ServerToClientEvents`. Server emits `{ sbUserId, sbAmount, bbUserId, bbAmount, pot }` but the type declares `{ userId, amount, type: 'SB' | 'BB' }`. The `useGameSocket.ts` handler calls `payload.userId` which doesn't exist in the actual payload. This was pre-existing — I'll fix it on my side in a separate ticket.

---

## Summary

**Ship it.** The overlay is solid, the architecture is clean enough to merge, and the animation work shows you're developing real CSS muscle.

Action items (none are blockers):
1. **[Joni + Soni]** Move `CardScoreData` to `packages/shared` — I'll add it there, you update the import.
2. **[Joni]** Extract `useCountUp` and `getAvatarColor` to shared files.
3. **[Joni]** Delete dead `animateRef` (3 lines).
4. **[Joni]** Replace `as never` in `PokerTable.tsx` (`FixtureBoard` cast) with a proper type fix.
5. **[Soni]** Fix `as never` casts in reconnect replay by properly typing `resolvedFixtures`/`revealedPlayerScores` in `useGameSocket.ts`.
6. **[Soni]** Fix pre-existing `blinds:posted` contract mismatch.

Good work on J13. The `useCountUp` hook idea is exactly right — you just need one version, not two.
