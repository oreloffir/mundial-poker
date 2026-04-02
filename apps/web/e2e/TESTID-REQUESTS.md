# TESTID-REQUESTS.md

Requested `data-testid` attributes for Joni to add.
These are needed for reliable test automation — currently tests fall back to screenshots or class-based selectors.

---

## Requested testids

| testid | Element | Why needed | Spec file |
|--------|---------|------------|-----------|
| `pot-total` | Pot chip display in center of table | Read pot value programmatically. Currently `[class*="pot"]` doesn't resolve text. | `game-round.spec.ts` |
| `fixture-card-{n}` (0–4) | Each of the 5 fixture cards in center | Count cards present, verify board is empty between rounds (stale card check). | `game-round.spec.ts` |
| `sb-badge` | The "SB" small blind badge on a player seat | Locate badge element reliably; current `text=/^SB$/` works but is fragile. | `game-round.spec.ts` |
| `bb-badge` | The "BB" big blind badge on a player seat | Same as above for BB. | `game-round.spec.ts` |
| `player-seat-{n}` (0–4) | The container for each player seat | Scope fold state and badge checks to a specific seat. | `betting.spec.ts` |
| `folded-indicator` | The "FOLDED" label shown on a folded seat | Assert fold state programmatically after a Fold action. | `betting.spec.ts` |
| `bet-timer` | The turn countdown timer UI element | Assert timer is visible during player's turn. | `game-round.spec.ts` |
| `chip-denomination-{value}` | Each chip button (5, 10, 25, 50, 100, 200) | Click specific denomination reliably in raise flow. | `betting.spec.ts` |

| `showdown-overlay` | Full-screen showdown overlay container | Gate all SD tests on overlay presence. Currently no stable selector. | `showdown.spec.ts` |
| `showdown-round-header` | "Round N Results" heading inside overlay | Assert header text present and correct. | `showdown.spec.ts` |
| `showdown-calculating` | "Calculating scores…" state between fixture reveals and player reveals | Assert this intermediate state appears (~2s). | `showdown.spec.ts` |
| `showdown-progress` | Sequential reveal progress indicator ("2 of 4 players revealed" or similar) | Sample at intervals to prove sequential reveal, not batch. | `showdown.spec.ts` |
| `showdown-score-card-{n}` (0–4) | Per-player score reveal card inside the overlay | Assert each player's breakdown is visible; count reveals. | `showdown.spec.ts` |
| `score-base-points` | Base points line within a score card (Win/Draw/Loss value) | Assert breakdown detail visible per SD6. Scoped inside `showdown-score-card-{n}`. | `showdown.spec.ts` |
| `score-total` | Total score line within a score card | Assert total is shown per SD6. Scoped inside `showdown-score-card-{n}`. | `showdown.spec.ts` |
| `showdown-player-you` | Human player badge inside overlay ("YOU" label) | Assert exactly one "YOU" badge per SD8. | `showdown.spec.ts` |
| `showdown-player-bot` | Bot player indicator inside overlay (robot icon/label) | Assert bot count per SD8. | `showdown.spec.ts` |
| `betting-controls` | Wrapper `<div>` around the entire betting controls bar | Scope chip denomination + action button selectors to this container (fixes the `div[class*="absolute bottom"]` fragile selector). | `betting.spec.ts`, `showdown.spec.ts` |

---

## Already in place (no action needed)

| testid | Added by | Used in |
|--------|----------|---------|
| `winner-banner` | Joni (J9) | `game-round.spec.ts`, `betting.spec.ts` |
| `round-counter` | Joni (J9) | `game-round.spec.ts` |
| `seat-balance-{n}` (0–4) | Joni (J9) | `game-round.spec.ts`, `table-setup.spec.ts` |
| `showdown-score` | Joni (Sprint 1) | Used in ad-hoc tests; add to spec when showdown timing is stable |
| `pot-total` | Joni (pre-existing) | `game-round.spec.ts` |
| `fixture-card-{n}` (0–4) | Joni (pre-existing) | `game-round.spec.ts` |
| `sb-badge` | Joni (pre-existing) | `game-round.spec.ts` |
| `bb-badge` | Joni (pre-existing) | `game-round.spec.ts` |
| `player-seat-{n}` (0–4) | Joni (pre-existing) | `betting.spec.ts` |
| `folded-indicator` | Joni (pre-existing) | `betting.spec.ts` |
| `bet-timer` | Joni (J14) | `game-round.spec.ts` |
| `chip-denomination-{value}` | Joni (pre-existing) | `betting.spec.ts` |
| `showdown-overlay` | Joni (J13) | `showdown.spec.ts` |
| `showdown-round-header` | Joni (J13) | `showdown.spec.ts` |
| `showdown-calculating` | Joni (J13) | `showdown.spec.ts` |
| `showdown-progress` | Joni (J13) | `showdown.spec.ts` |
| `showdown-score-card-{n}` (0–4) | Joni (J13) | `showdown.spec.ts` |
| `score-base-points` | Joni (J13) | `showdown.spec.ts` |
| `score-total` | Joni (J13) | `showdown.spec.ts` |
| `showdown-player-you` | Joni (J13) | `showdown.spec.ts` |
| `showdown-player-bot` | Joni (J13) | `showdown.spec.ts` |
| `betting-controls` | Joni (J13) | `betting.spec.ts`, `showdown.spec.ts` |
