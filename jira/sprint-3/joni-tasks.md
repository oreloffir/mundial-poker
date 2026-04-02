# Joni — Sprint 3 Tasks

**Sprint:** April 3–10, 2026
**Role:** Junior Developer — Frontend / UI
**Total tasks:** 3

Read the [Sprint Brief](./SPRINT-BRIEF.md) first.

---

## J14 — Fix Bet-Timer Intercepting Chip Button Clicks

**Priority:** High (blocks Mark's entire betting test suite)
**Branch:** `fix/bet-timer-click-intercept`
**Deadline:** April 3 (day 1 — Mark is waiting)

### Context

Mark reported that the `bet-timer` div in `BettingControls.tsx` is sitting on top of the chip denomination buttons, intercepting all click events. Every Playwright test that tries to click a chip button to raise hits the timer instead and times out. This broke the entire betting test suite.

### Root cause to investigate

The timer row (with the progress bar and countdown text) is likely positioned with `absolute` or `fixed` and overlapping the chip row below it. Or the timer's `z-index` is higher than the chips. Check:

1. The timer row in `BettingControls.tsx` — what's its position and z-index?
2. The chip denomination row — is it below the timer in the DOM but visually overlapped?
3. Does the info row (hand preview + chips) have a higher stacking context?

### Fix

Add `pointer-events: none` to the timer bar container (it doesn't need click events), OR fix the z-index/positioning so the timer doesn't overlap interactive elements. The timer should be purely visual — no click target needed.

### Verification

1. Open Chrome DevTools, hover over a chip button — the tooltip should show the chip button element, NOT the timer
2. Run Mark's betting E2E tests: `pnpm test:e2e --grep "chip denomination"` — buttons should be clickable
3. Manual: play a round, tap chip buttons to build a raise — all 6 denominations clickable

### Files to modify

- `apps/web/src/components/game/BettingControls.tsx` — timer row positioning/pointer-events

### Deliverables

- [ ] Chip buttons clickable (no timer intercept)
- [ ] Timer still visually visible and counting down
- [ ] Mark confirms betting E2E tests pass

**Estimated effort:** 30 minutes

---

## J13 — Restore Full-Screen Overlay + Apply 9 Polish Fixes

**Priority:** High (the defining visual of the game)
**Branch:** `fix/showdown-overlay-polish`
**Deadline:** April 7

### Context

Clodi's decision: **restore the full-screen overlay** for Phase 3 player score reveals. The inline seat popup approach doesn't give enough visual canvas for the score breakdown story. Doni's original spec was right.

Doni has posted exact specs for all 9 issues in `jira/sprint-2/shared/showdown-polish.md` (Design Review section). Read that file before starting — it has every color, pixel value, and animation spec you need.

### Requirements

Implement all 9 fixes from Doni's review. In priority order:

**Blockers (do first):**

1. **Issue #1 — Overlay position** — Switch `RoundResultsOverlay` from `position: absolute` to `position: fixed; inset: 0; z-index: 50`. Background: `rgba(5, 10, 24, 0.92)` with `backdrop-filter: blur(16px)`.

2. **Issue #3 — Bottom strip** — Reserve `84px` with `flex-shrink: 0` for the mini-card strip. Each mini-card: `72px × 64px`, `min-width: 72px`, `flex-shrink: 0`. Names: `9px Outfit, max-width: 56px, text-overflow: ellipsis`. Add `padding-bottom: max(12px, env(safe-area-inset-bottom))` for mobile.

3. **Issue #9 — YOU badge** — Verify your `isMe` fix is in place: `player.userId === currentUserId`. Show "YOU" badge only on the human player. Bots show 🤖. Mutually exclusive.

**Medium (do second):**

4. **Issue #2 — Vertical centering** — Overlay layout: three zones (`header 48px` → `main flex:1 centered` → `strip 84px`). Let flexbox center the score card, no manual margins.

5. **Issue #4 — Progress indicator** — Replace dots-only with `"3 of 5" ●●●○○`. Label: `11px Outfit 600 var(--text-dim)`. Dots: `8px, gap: 5px`. Revealed: `var(--gold)`. Pending: `rgba(255,255,255,0.15)`.

6. **Issue #8 — Rank badge** — Pill with medal emoji: `🎖 #2` (normal) or `🏆 #1` (winner, gold bg). Specs: `13px Outfit 900`, `padding: 3px 10px`, `border-radius: 20px`.

**Low (do last):**

7. **Issue #5 — Team flags** — Render `[flagUrl] TEAM NAME` on each sub-card. Use Soni's new `opponentTeam` field to show `"vs 🇸🇳 Senegal"` second line. `13px Outfit 700` for team name, `10px var(--text-muted)` for vs line.

8. **Issue #6 — Score row colors** — Win/bonuses: `var(--green-glow)`. Draw: `var(--gold)`. Loss: `var(--text-muted)`. Penalties negative: `var(--red)`. Labels: `var(--text-dim)`. Row stagger: `150ms delay, opacity 0→1, translateY(4px→0), 200ms ease-out`.

9. **Issue #7 — TOTAL row** — Add gradient separator line above/below: `linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)`. Total text: `16px Cinzel 700 var(--gold)` with `text-shadow: 0 0 12px rgba(212,168,67,0.4)`. Count-up starts on card enter.

### Files to modify

- `apps/web/src/components/game/RoundResultsOverlay.tsx` — #1, #2, #3, #4
- `apps/web/src/components/game/PlayerScoreCard.tsx` — #8, #9
- `apps/web/src/components/game/TeamScoreSubCard.tsx` — #5, #6, #7
- `apps/web/src/index.css` — any new animation keyframes

### Deliverables

- [ ] Full-screen overlay (position: fixed, full opacity, no table bleed)
- [ ] Score card vertically centered (flex layout, 3 zones)
- [ ] Bottom strip visible with 84px reserved height, no truncation
- [ ] Progress shows "N of M" + colored dots
- [ ] Team flags + "vs opponent" on sub-cards
- [ ] Color-coded score rows (green/gold/red/muted)
- [ ] TOTAL with gradient separators and gold glow
- [ ] Rank badge with medal/trophy emoji
- [ ] YOU badge only on human player, 🤖 on bots
- [ ] Works on desktop AND mobile landscape
- [ ] Update Implementation Log in `jira/sprint-2/shared/showdown-polish.md`

**Estimated effort:** 2-3 days

---

## J15 — Wire `opponentTeam` Data on Score Sub-Cards

**Priority:** Medium (enhances score breakdown readability)
**Branch:** Include in J13 branch
**Deadline:** April 7 (bundle with J13)

### Context

Soni added `opponentTeam: { name, code, flagUrl }` to the `CardScoreData.fixture` payload in SF-01d. The sub-cards can now show "🇺🇾 Uruguay vs 🇸🇳 Senegal → 2-1" instead of just "Uruguay → 2-1".

### Requirements

1. In `TeamScoreSubCard.tsx`, read `cardScore.fixture.opponentTeam`
2. Render the second line: `"vs [flagUrl] [name]"` in `10px Outfit var(--text-muted)`
3. If `opponentTeam` is null (shouldn't happen, but defensive), skip the line

### Deliverables

- [ ] "vs 🇸🇳 Senegal" line visible under each team name
- [ ] Null-safe (doesn't crash if opponentTeam missing)

**Estimated effort:** 30 minutes (bundle with J13)

---

## Note: Soni Will Deep-Review Your Next PR

Heads up — Soni has been asked to do a **teaching code review** on your next PR (likely J13 or J14). This isn't a gatekeeping exercise. It's a learning investment.

He'll leave detailed comments on:

- TypeScript patterns (generics, type assertions, when to use `as never` vs proper typing)
- React patterns (useEffect deps, conditional rendering, hook ordering)
- CSS/animation (keyframe timing, GPU acceleration, what causes reflow)
- Architecture (component structure, socket event wiring, store state resets)

**What to do with his comments:**

- Read every comment carefully — he's explaining WHY, not just WHAT
- Ask follow-up questions directly on the PR if something isn't clear
- Apply the patterns he teaches to future code — not just the file he reviewed
- Don't take corrections personally — he's investing in your growth because your mid-term review asked for exactly this

This is the code review session on store types and CSS animations you asked for, delivered in the most practical format: on your real code, with real context.

---

## Delivery Log

_Update after each task._

### J14 — Bet-Timer Click Intercept Fix

**Status:** Done — added `pointerEvents: 'none'` to `data-testid="bet-timer"` container in `BettingControls.tsx`. The flex-1 timer div was sitting on top of the chip denomination buttons; pointer-events passthrough fixes click interception without affecting visual rendering.

### J13 — Full-Screen Overlay + 9 Polish Fixes

**Status:** Done — all 9 Doni fixes implemented. Recreated `RoundResultsOverlay.tsx` (position:fixed, 3-zone layout), `PlayerScoreCard.tsx` (rank badge, YOU/🤖 mutual exclusion, score breakdown for isMe only), `RevealedPlayerMini.tsx` (72×64px strip cards). Deleted `SeatScorePopup.tsx`. Updated `PokerTable.tsx` to render overlay at showdownPhase=reveals. Typecheck: 0 errors.

### J15 — opponentTeam Wiring

**Status:** Done (bundled with J13) — added `opponentTeam` to `CardScoreData.fixture` type in `TeamScoreSubCard.tsx`. "vs 🇸🇳 Senegal" line renders at 10px Outfit var(--text-muted), null-safe.
