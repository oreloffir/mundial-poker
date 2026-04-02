# Mobile Polish — Joni's Fix List

**From:** Doni
**For:** Joni
**Date:** April 2, 2026
**Source:** Mark's 667×375 mobile landscape audit (v2-mobile-\* screenshots)
**Branch:** `fix/mobile-polish`

Implement these in order. Items 1–5 are blocking for demo quality. Items 6–8 are polish.

---

## ⚠️ Critical Finding Before You Start

**`RoundResultsOverlay` is built but never wired up.**

I checked `GameTable.tsx` — it never imports or renders `RoundResultsOverlay`. This is why the score reveal screenshots (I1, I2, I3) still show inline `SeatScorePopup` bubbles above player seats instead of the full-screen overlay Clodi authorized.

`RoundResultsOverlay.tsx` exists and is correct (Joni's J13 work), but nothing calls it.

**Fix required (not in this CSS list — open as a separate bug):**
In `GameTable.tsx`, import `RoundResultsOverlay` and render it when `showdownPhase === 'reveals'`. Suppress the `SeatScorePopup` in `PlayerSeat.tsx` during the reveals phase (add a prop or check `showdownPhase`). The overlay already handles the display — the inline popups just need to be hidden while the overlay is active.

Flag this to Clodi as a wiring gap from J13.

---

## Fix 1 — Create Table modal: Cancel/Create buttons hidden below fold

**Screenshots:** v2-mobile-C-modal
**Component:** `CreateTableModal.tsx` + `index.css`
**Severity:** HIGH — user cannot submit the form on mobile landscape

**Problem:** The modal's internal spacing (`p-7` = 28px, `mb-6` after heading = 24px, `space-y-5` = 20px gaps) totals ~396px of content. On 375px viewport with `maxHeight: calc(100dvh - 2rem)` = 343px available, the Cancel/Create buttons are ~53px below the viewport edge. `overflowY: auto` is set but users won't know to scroll a modal.

**Fix — two changes:**

**Step 1:** In `CreateTableModal.tsx`, add a class to the inner modal div (line 81):

```tsx
// Before:
className = 'relative w-full max-w-md shadow-2xl rounded-2xl p-7'

// After:
className = 'relative w-full max-w-md shadow-2xl rounded-2xl p-7 create-table-modal-content'
```

**Step 2:** In `index.css`, inside the `@media (max-height: 500px) and (orientation: landscape)` block (after line 440), add:

```css
/* Create Table modal — compress spacing to fit 375px landscape height */
.create-table-modal-content {
  padding: 16px !important;
}
.create-table-modal-content h2 {
  font-size: 1.125rem !important;
  margin-bottom: 10px !important;
}
.create-table-modal-content .space-y-5 > * + * {
  margin-top: 10px !important;
}
.create-table-modal-content .pt-2 {
  padding-top: 4px !important;
}
.create-table-modal-content .py-3 {
  padding-top: 6px !important;
  padding-bottom: 6px !important;
}
```

**Why:** Reduces total modal height from ~396px to ~300px, fitting cleanly within 343px. The Cancel/Create buttons become visible without any scrolling.

---

## Fix 2 — Chip denomination buttons: touch target too small

**Screenshots:** v2-mobile-F1, v2-mobile-F2, v2-mobile-F3
**Component:** `index.css`
**Severity:** HIGH — players tap these repeatedly under time pressure

**Problem:** `--chip-btn-size: 28px` on mobile landscape. Players need to quickly add 5, 10, 25, 50, 100, 200 chips with a finger, often with <10 seconds on the timer. At 28px, adjacent chips are ~2px apart and finger accuracy at that size produces frequent mis-taps.

**Fix — `index.css`, inside the mobile landscape block:**

```css
/* Before: */
--chip-btn-size: 28px;

/* After: */
--chip-btn-size: 32px;
```

**Why:** 32px is still 4px below the iOS 44px minimum, but for a row of 6 tightly-packed chip buttons this is the right compromise — going to 36px would overflow the raise drawer on small screens. 32px reduces mis-tap rate meaningfully while staying within the horizontal budget.

---

## Fix 3 — Fixture tile team codes: no mobile scaling, unreadable

**Screenshots:** v2-mobile-G2, v2-mobile-G3
**Component:** `FixtureBoard.tsx` + `index.css`
**Severity:** MEDIUM — players need to identify which teams their cards are matched to

**Problem:** Team codes in fixture tiles are hardcoded as `text-[8px]` (8px) in both the home and away team spans. Unlike other text, this doesn't scale with CSS tokens. At 56px tile width on mobile, 8px text with a 3-letter team code like "BRA" or "SRB" is approximately 4–5mm wide on screen — below comfortable readability at arm's length.

**Fix — two parts:**

**Step 1:** In `FixtureBoard.tsx`, add class `fixture-team-code` to both team code spans (lines ~114 and ~177):

```tsx
// Home team code span — Before:
className = 'text-[8px] font-bold mt-0.5'

// After:
className = 'text-[8px] font-bold mt-0.5 fixture-team-code'
```

```tsx
// Away team code span — Before:
className = 'text-[8px] font-bold mt-0.5'

// After:
className = 'text-[8px] font-bold mt-0.5 fixture-team-code'
```

**Step 2:** No change needed for desktop (8px is correct at 72px tile width). On mobile, the tile narrows to 56px so the text actually needs to stay at 8px — the fix here is to widen the tile slightly:

In `index.css`, inside the mobile landscape block:

```css
/* Before: */
--fixture-tile-w: 56px;

/* After: */
--fixture-tile-w: 60px;
```

**Why:** 60px gives the team codes and flag emojis 4px more horizontal breathing room per tile. 5 tiles × 60px + 4 gaps × 8px = 332px, well within the 667px landscape width. The team codes remain 8px (legible at 60px tile width) and the score numbers get slightly more room too.

---

## Fix 4 — "End session" button: below minimum touch target

**Screenshots:** v2-mobile-B-lobby
**Component:** `Lobby.tsx`
**Severity:** MEDIUM — secondary action but players use it to exit the lobby

**Problem:** The "End session" button renders as `wpc-btn-ghost text-xs py-2 px-4`. `text-xs` = 12px, `py-2` = 8px vertical padding = ~28px total height. iOS minimum touch target is 44px. On mobile the nav height is `h-16` (64px), so there's room to grow without layout changes.

**Fix — `Lobby.tsx` line 71:**

```tsx
// Before:
className = 'wpc-btn-ghost text-xs py-2 px-4'

// After:
className = 'wpc-btn-ghost text-xs py-2 px-4 min-h-[36px]'
```

**Why:** `min-h-[36px]` brings the touch target to 36px. This doesn't reach 44px but it's a meaningful improvement for a ghost button in a nav bar where horizontal centering is already provided by the nav's `flex items-center`. Getting to 44px would require `py-3.5` which would make the ghost button look oversized relative to the brand text next to it.

---

## Fix 5 — SeatScorePopup: breakdown text 9px — unreadable at arm's length

**Screenshots:** v2-mobile-I1, v2-mobile-I2, v2-mobile-I3
**Component:** `SeatScorePopup.tsx` + `index.css`
**Severity:** MEDIUM — this is the moment players find out their score

**Problem:** The per-card breakdown row in `SeatScorePopup` uses `fontSize: 9` (9px) for content like `BRA W +7 | GER D +3`. On a 40px avatar at mobile landscape scale, this text is approximately 3mm tall on screen. The total score at `fontSize: 17` is readable, but the breakdown that explains _why_ is not.

**Fix — two parts:**

**Step 1:** In `SeatScorePopup.tsx`, add a class to the breakdown row container (line 64):

```tsx
// Before:
<div className="flex items-center gap-1.5">

// After:
<div className="flex items-center gap-1.5 seat-score-breakdown">
```

**Step 2:** In `index.css`, inside the mobile landscape block:

```css
/* SeatScorePopup — bump breakdown text for readability */
.seat-score-breakdown,
.seat-score-breakdown span {
  font-size: 10px !important;
}
```

**Why:** 9px → 10px is a 11% increase. At mobile resolution it's the difference between squinting and reading. The popup is `whitespace-nowrap` so it will grow horizontally — but the popup is positioned above the seat and the content is short (max 2 cards = ~`BRA W +7 | GER D +3`), so it will still fit within the table area for most seat positions.

---

## Fix 6 — Preset raise buttons: padding too tight for confident taps

**Screenshots:** v2-mobile-F1, v2-mobile-F2
**Component:** `index.css`
**Severity:** LOW-MEDIUM

**Problem:** `--preset-padding: 2px 8px` on mobile landscape. The Min / ½ Pot / Pot / All In preset buttons have only 2px of vertical padding, making them approximately 18–20px tall. These are secondary to the chip buttons but still need to be tappable.

**Fix — `index.css`, inside the mobile landscape block:**

```css
/* Before: */
--preset-padding: 2px 8px;

/* After: */
--preset-padding: 4px 8px;
```

**Why:** Doubles the vertical tap area (from ~18px to ~22px) with no layout impact. The preset row is full-width with `flex-wrap justify-center`, so extra height is absorbed vertically without pushing anything off-screen.

---

## Fix 7 — Fixture board position: sits too high, partially behind top bar on short screens

**Screenshots:** v2-mobile-G1, v2-mobile-G2, v2-mobile-G3
**Component:** `PokerTable.tsx`
**Severity:** LOW

**Problem:** The fixture board is positioned at `top: '22%'` of the table pitch. On mobile landscape, the table pitch height is `calc(100vh - 36px)` = 339px. 22% = ~75px from the top of the pitch. With the top bar at 36px, the fixture tiles sit at roughly 36 + 75 = 111px from the top of the viewport — this is fine, but the "Matches in Progress" waiting badge that appears below the tiles gets very close to the center pot display, compressing both.

**Fix — `PokerTable.tsx` line 253:**

```tsx
// Before:
style={{ top: '22%', left: '50%', transform: 'translateX(-50%)' }}

// After:
style={{ top: '18%', left: '50%', transform: 'translateX(-50%)' }}
```

**Why:** Moving from 22% to 18% shifts the fixture board ~14px higher (339px × 4% ≈ 14px), creating more vertical separation between the board + waiting badge and the central pot display. The 18% still clears the inner oval line of the stadium table image.

---

## Fix 8 — Preset font size: at 0.5625rem (9px) team labels unreadable

**Screenshots:** v2-mobile-F1, v2-mobile-F2, v2-mobile-F3
**Component:** `index.css`
**Severity:** LOW

**Problem:** `--preset-font-size: 0.5625rem` = ~9px on mobile landscape. "Min", "½ Pot", "Pot", "All In" labels are barely readable at this size.

**Fix — `index.css`, inside the mobile landscape block:**

```css
/* Before: */
--preset-font-size: 0.5625rem;

/* After: */
--preset-font-size: 0.625rem;
```

**Why:** `0.625rem` = 10px. One step up from 9px, matches the desktop preset font size. Still small enough for the compact button row.

---

## Summary Table

| #   | Component                            | Change                                               | Severity |
| --- | ------------------------------------ | ---------------------------------------------------- | -------- |
| 1   | `CreateTableModal.tsx` + `index.css` | Reduce internal spacing in mobile landscape          | HIGH     |
| 2   | `index.css`                          | `--chip-btn-size: 28px → 32px` on mobile             | HIGH     |
| 3   | `FixtureBoard.tsx` + `index.css`     | `--fixture-tile-w: 56px → 60px` on mobile            | MEDIUM   |
| 4   | `Lobby.tsx`                          | Add `min-h-[36px]` to End session button             | MEDIUM   |
| 5   | `SeatScorePopup.tsx` + `index.css`   | Breakdown text `9px → 10px` on mobile                | MEDIUM   |
| 6   | `index.css`                          | `--preset-padding: 2px 8px → 4px 8px` on mobile      | LOW      |
| 7   | `PokerTable.tsx`                     | Fixture board `top: 22% → 18%`                       | LOW      |
| 8   | `index.css`                          | `--preset-font-size: 0.5625rem → 0.625rem` on mobile | LOW      |

---

## Separate Bug — RoundResultsOverlay not wired (file in PokerTable)

This is outside the scope of CSS tweaks but needs to land before demo:

**File a task for yourself:** In `GameTable.tsx`, import and render `RoundResultsOverlay` when `showdownPhase === 'reveals'`. In `PlayerSeat.tsx`, suppress `SeatScorePopup` when the overlay is active (pass `showdownPhase` as a prop or read from the store directly). Without this, the full-screen score reveal (all of J13's overlay work) never shows.

— Doni
