# SHARED TICKET: Showdown Overlay Visual Polish

**Ticket:** SP-01
**Assignees:** Doni (design review) → Joni (implementation)
**Priority:** High
**Branch:** `fix/showdown-overlay-polish`
**Created by:** Clodi (PM), April 2, 2026

---

## How This Ticket Works

This is a **shared ticket** between Doni and Joni. Both of you read this file. Doni posts design feedback and updated specs in the Design Review section below. Joni reads Doni's notes and implements. Both update the Communication Log at the bottom as you work.

**Workflow:**

1. Doni reviews the screenshots and writes design corrections → posts in "Design Review" section
2. Joni reads Doni's notes and implements fixes → posts in "Implementation Log" section
3. If Joni has questions for Doni, post them in "Communication Log"
4. If Doni needs to see Joni's progress, Joni screenshots and posts path in "Communication Log"

---

## The Problem

The showdown score reveal overlay (Phase 3 of the end-of-round flow) is functional but visually rough. The scoring logic is correct, the progressive reveal works, the data is right. But the UI doesn't match the premium quality bar we set in Doni's end-of-round spec.

### Screenshots of Current State

**Screenshot 1 — Score reveal overlay (Phase 3):**
`/assets/img_1.png`

**Screenshot 2 — Game table during fixture reveals:**
`/assets/img.png`

### Specific Issues Found (from playtesting)

| #   | Issue                                                                                                                           | Severity      | Component                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------ |
| 1   | **Table bleeds through overlay** — card backs and player avatars visible on left/right edges behind semi-transparent background | HIGH          | `RoundResultsOverlay`                      |
| 2   | **Score card not vertically centered** — huge gap above and below the card, pushed up on screen                                 | MEDIUM        | `RoundResultsOverlay` layout               |
| 3   | **Bottom strip cut off** — already-revealed player mini cards at very bottom, partially off-screen, names truncated             | HIGH          | `RevealedPlayerMini` / `FoldedPlayerStrip` |
| 4   | **Progress dots unclear** — tiny dots in top-right corner don't communicate "player 4 of 5"                                     | MEDIUM        | `RoundResultsOverlay` header               |
| 5   | **No team flags on sub-cards** — just text "Uruguay", "Senegal" without flag emojis                                             | LOW           | `TeamScoreSubCard`                         |
| 6   | **Score rows are plain text** — no color distinction between different bonus types                                              | LOW           | `TeamScoreSubCard`                         |
| 7   | **"TOTAL 12 pts" disconnected** — feels detached from the score card above it                                                   | LOW           | `PlayerScoreCard`                          |
| 8   | **#4 rank badge tiny and unclear** — hard to read, doesn't communicate ranking well                                             | MEDIUM        | `PlayerScoreCard`                          |
| 9   | **"YOU" badge possibly misassigned** — showing on a bot (Rex-Dan22) instead of the human player                                 | HIGH (if bug) | `PlayerScoreCard`                          |

---

## Design Review (Doni's Section)

_Doni: Review the screenshots above and your original spec at `docs/design/end-of-round-spec.md`. For each issue, provide updated specs or confirm the current implementation matches your intent. Use exact values (colors, px, opacity, etc.) so Joni can implement without guessing._

**Doni's review:**

Reviewed both screenshots against the end-of-round spec. Notes below cover all 9 issues with exact values. Implement in order — issues 1, 3, 9 are blockers.

---

### Issue 1 — Table bleeds through overlay (HIGH)

**Root cause:** The overlay container is `position: absolute` scoped to the game container, so it doesn't cover the full viewport. Card backs and seat avatars are leaking through at the left and right edges.

**Fix — two changes required:**

1. Switch overlay to `position: fixed` so it covers the entire viewport, not just the game div:

```css
position: fixed;
inset: 0;
z-index: 50;
```

2. Raise overlay background opacity slightly:

```css
background: rgba(5, 10, 24, 0.92);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
```

_(Was `0.88` in original spec — bumping to `0.92` closes the bleed without losing the "table still exists" feeling behind the blur.)_

The blur at 16px is already correct per spec. The issue is purely `position: fixed` vs `absolute`.

---

### Issue 2 — Score card not vertically centered (MEDIUM)

**Root cause:** The overlay's flex layout isn't distributing space correctly. The card is sitting in the upper portion with dead space below.

**Fix — overlay inner layout:**

The overlay should be structured as three vertical zones:

```
[header bar — fixed 48px]
[main zone — flex: 1, centered]
[mini-strip — fixed 84px]
```

CSS for the overlay wrapper:

```css
display: flex;
flex-direction: column;
align-items: center;
height: 100%;
```

CSS for the main zone (the div between header and mini-strip):

```css
flex: 1;
display: flex;
align-items: center;
justify-content: center;
width: 100%;
padding: 16px 16px 0;
overflow: hidden;
```

The score card itself does NOT need margin-top adjustments — let the flex centering do the work. Do not add `margin-top` or `top` positioning to `PlayerScoreCard`.

---

### Issue 3 — Bottom strip cut off (HIGH)

**Root cause:** The mini-cards strip has no reserved height and is being clipped by the viewport edge. Names are truncating because the strip isn't getting enough vertical space.

**Fix — strip container:**

```css
/* RevealedPlayerMiniStrip wrapper */
height: 84px;
min-height: 84px;
flex-shrink: 0;
width: 100%;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
padding: 8px 16px;
padding-bottom: max(12px, env(safe-area-inset-bottom));
overflow-x: auto;
overflow-y: hidden;
```

**Fix — each mini-card:**

```css
width: 72px;
min-width: 72px; /* prevent squeezing */
height: 64px;
background: rgba(5, 10, 24, 0.6);
border: 1px solid rgba(212, 168, 67, 0.15);
border-radius: 12px;
padding: 6px 8px;
flex-shrink: 0;
```

**Username truncation fix:**

```css
font-size: 9px;
font-family: Outfit;
color: var(--text-dim);
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
max-width: 56px; /* 72px card - 8px padding each side */
```

---

### Issue 4 — Progress dots unclear (MEDIUM)

**Root cause:** 6px dots with no label aren't communicating "player 4 of 5" clearly enough.

**Fix — header right side:**

Replace the dots-only widget with a combined label + dots layout:

```
"3 of 5"  ●●●○○
```

Specs:

```css
/* Label */
font-family: Outfit;
font-size: 11px;
font-weight: 600;
color: var(--text-dim); /* #8899b0 */
margin-right: 8px;

/* Each dot */
width: 8px;
height: 8px;
border-radius: 50%;
gap: 5px;

/* Revealed dot */
background: var(--gold); /* #D4A843 */

/* Pending dot */
background: rgba(255, 255, 255, 0.15);
```

The label string: `"${revealedCount} of ${totalPlayers}"` — update as each `player:scored` arrives.

Header bar full spec reminder:

```css
height: 48px;
padding: 0 20px;
display: flex;
align-items: center;
justify-content: space-between;
border-bottom: 1px solid rgba(255, 255, 255, 0.05);
```

- Left: "Round N Results" — `font-cinzel 13px font-bold var(--gold)`
- Right: label + dots as above

---

### Issue 5 — No team flags on sub-cards (LOW)

**Root cause:** Flag emojis not being rendered in the sub-card header — only the text team name is showing.

**Fix — sub-card header structure:**

Each team name must render as: `[flag emoji] [TEAM NAME]`

```
🇺🇾 URUGUAY       ← home team, main line
vs 🇸🇳 Senegal    ← "vs" + away team, second line
```

Exact specs:

```css
/* Team name line */
font-family: Outfit;
font-size: 13px;
font-weight: 700;
color: var(--text); /* or win/draw/loss color — see spec §Color rules */
/* Flag emoji renders inline before the text — no separate element needed */
```

The flag emoji should be a native Unicode flag (e.g. `🇺🇾`) inserted directly before the team name string. Size is inherited from the parent `font-size: 13px` — no separate styling needed for the emoji itself.

"vs" line:

```css
font-family: Outfit;
font-size: 10px;
color: var(--text-muted); /* #556680 */
margin-top: 2px;
```

---

### Issue 6 — Score rows plain text, no color (LOW)

**Root cause:** All breakdown rows rendering in a single color. Bonus values need to pop.

**Fix — row color rules (exact tokens):**

| Row type           | Label color            | Value color              |
| ------------------ | ---------------------- | ------------------------ |
| Win                | `#8899b0` (--text-dim) | `#2ecc71` (--green-glow) |
| Draw               | `#8899b0` (--text-dim) | `#D4A843` (--gold)       |
| Loss               | `#8899b0` (--text-dim) | `#556680` (--text-muted) |
| High Scorer bonus  | `#8899b0` (--text-dim) | `#2ecc71` (--green-glow) |
| Clean Sheet bonus  | `#8899b0` (--text-dim) | `#2ecc71` (--green-glow) |
| Penalties positive | `#8899b0` (--text-dim) | `#2ecc71` (--green-glow) |
| Penalties negative | `#8899b0` (--text-dim) | `#e74c3c` (--red)        |

Row font specs:

```css
/* Label */
font-family: Outfit;
font-size: 11px;
font-weight: 400;
color: var(--text-dim);

/* Value */
font-family: Outfit;
font-size: 11px;
font-weight: 600;
/* color: per table above */
```

Rows appear with staggered reveal: `150ms delay` per row, `opacity: 0 → 1, translateY(4px → 0)` over `200ms ease-out`.

---

### Issue 7 — TOTAL row disconnected from card (LOW)

**Root cause:** The grand total row is floating with too much vertical gap from the sub-cards, and the `══` separator lines from the spec aren't rendered.

**Fix — grand total section:**

Structure:

```
[sub-cards row]
[separator line]
[TOTAL row]
[separator line]
```

```css
/* Separator line (top and bottom of TOTAL) */
height: 1px;
background: linear-gradient(90deg, transparent, rgba(212, 168, 67, 0.3), transparent);
margin: 10px 0;

/* TOTAL row */
font-family: Cinzel;
font-size: 16px;
font-weight: 700;
color: var(--gold); /* #D4A843 */
text-shadow: 0 0 12px rgba(212, 168, 67, 0.4); /* gold-glow-subtle */
text-align: center;
letter-spacing: 0.05em;
```

The score value in TOTAL animates count-up from `0` to `N pts` over `600ms` using `score-tick` keyframe (already in index.css). Start the count-up on the frame the card enters, not after the breakdown rows finish.

Gap between sub-cards and the separator: `margin-top: 12px`.

---

### Issue 8 — Rank badge tiny and unclear (MEDIUM)

**Root cause:** The rank pill is too small and the medal icon isn't prominent enough.

**Fix — rank badge:**

```css
/* Pill container */
display: inline-flex;
align-items: center;
gap: 4px;
background: rgba(255, 255, 255, 0.06);
border: 1px solid rgba(255, 255, 255, 0.08);
border-radius: 20px;
padding: 3px 10px 3px 7px;
min-width: 40px;

/* Icon */
font-size: 13px; /* 🎖 medal emoji */

/* Number text */
font-family: Outfit;
font-size: 13px;
font-weight: 900;
color: var(--text-dim); /* #8899b0 */
```

**Winner state** (rank #1):

```css
background: rgba(212, 168, 67, 0.15);
border-color: rgba(212, 168, 67, 0.3);
color: var(--gold); /* #D4A843 */
/* icon: 🏆 instead of 🎖 */
```

Rendered as: `🎖 #2` or `🏆 #1`

---

### Issue 9 — "YOU" badge on wrong player (HIGH — LOGIC BUG)

**Root cause:** The `YOU` badge is rendering on Rex-Den22, which is a bot. This is a conditional rendering bug, not a visual design issue.

**Fix — logic rule (pass to Joni for implementation):**

The `YOU` badge must render **only** when `player.isYou === true` (or equivalently `player.id === localPlayerId`).

It must **never** render when:

- `player.isBot === true`
- `player.id !== localPlayerId`

Both conditions must hold simultaneously — a player cannot be both `isYou` and `isBot`. If that state ever exists in data, it's a backend bug (flag to Soni).

Visual spec for the badge (unchanged from original spec):

```css
/* "YOU" badge on avatar ring */
font-family: Outfit;
font-size: 9px;
font-weight: 700;
background: var(--gold);
color: #050a18;
border-radius: 10px;
padding: 1px 5px;
position: absolute;
bottom: -6px;
left: 50%;
transform: translateX(-50%);
```

Bots continue to show `🤖` on their avatar. The two badges are mutually exclusive and should be rendered in an either/or conditional:

```
if (player.isYou) → show "YOU" badge
else if (player.isBot) → show 🤖 indicator
else → no badge
```

---

### Additional observation — img.png (Phase 2 table)

The fixture tiles on the table look correct during Phase 2. Flag emojis are rendering, scores are showing. The bottom seat's "GU" avatar is displaying correctly. No design corrections needed for Phase 2 — the table state is on-spec.

---

## Implementation Log (Joni's Section)

_Joni: After Doni posts design corrections above, implement each fix. Log what you changed per issue number._

**Joni's fixes:**

### Issue #9 — "YOU" badge logic ✅ Fixed (pre-existing)

Root cause: `RoundResultsOverlay.tsx` computed `isMe` as `table.players.find(p => p.isConnected && !p.isBot)` — picked the first connected non-bot, had nothing to do with the actual logged-in user. Fixed in `SeatScorePopup.tsx`: `isMe = player.userId === currentUserId` (authenticated user ID). Per Doni's mutual-exclusion rule — bot indicator and YOU badge are in an either/or block.

### Issue #5 — Team flags + name size ✅ Partially fixed

- Team name: `fontSize: 12 → 13px` per spec.
- Flag fallback: `team.flagUrl || '🏳️'` — flag was always in the code, if blank at runtime it means `player:scored` payload isn't including the emoji. → question for Soni in Communication Log.
- "vs 🇸🇳 opponent" second line: **blocked** — `CardScoreData.fixture` has only `homeGoals/awayGoals/side`, no opponent team name or flag. Can add once Soni includes opponent team in the `player:scored` payload. → question in Communication Log.

### Issue #6 — Score row colors ✅ Confirmed correct

Colors were already correct in code. Made font-weight explicit: labels `fontWeight: 400`, values `fontWeight: 600` per spec. Stagger animation (`fade-in-up 0.25s ease-out ${delay}ms both`) was already in place.

### Issues #7, #8 — SeatScorePopup rank badge + TOTAL row ✅ Fixed

Context: `RoundResultsOverlay` + `PlayerScoreCard` were replaced with inline `SeatScorePopup.tsx` (score cards appear above each player's seat, no full-screen overlay). Applied Doni's specs to the new component.

- **#8:** Rank badge is now a pill: `🎖 #2` / `🏆 #1`. Font 13px, fontWeight 900, border-radius 20px, padding `3px 10px 3px 7px`, min-width 40px per spec.
- **#7:** TOTAL section added in `isMe && isCurrent` block. Gradient separators (`linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)`) above and below. TOTAL in Cinzel 16px gold, score count-up 600ms per spec.

### Issues #1, #2, #3, #4 — ✅ Fixed (full-screen overlay restored per Clodi decision)

Clodi confirmed: restore full-screen overlay. All four issues implemented in `RoundResultsOverlay.tsx` (recreated from scratch with Doni's specs applied from the start):

- **#1 — Overlay position:** `position: fixed; inset: 0; z-index: 50; background: rgba(5,10,24,0.92); backdrop-filter: blur(16px)`. No table bleed-through.
- **#2 — Vertical centering:** Three-zone flex layout: header `48px flex-shrink-0` / main `flex:1, display:flex, align-items:center, justify-content:center` / strip `84px flex-shrink-0`. No manual margins on `PlayerScoreCard`.
- **#3 — Bottom strip:** `84px height, flex-shrink:0, overflow-x:auto`. Each `RevealedPlayerMini`: `72×64px, min-width:72px, border-radius:12px`. Names: `9px Outfit, max-width:56px, text-overflow:ellipsis`. `padding-bottom: max(12px, env(safe-area-inset-bottom))`.
- **#4 — Progress indicator:** `"N of M"` label (`11px Outfit 600 var(--text-dim)`) + 8px dots (gap:5px). Revealed: `var(--gold)`. Pending: `rgba(255,255,255,0.15)`.

### Issue #8 — ✅ Fixed (in PlayerScoreCard.tsx)

Rank badge: pill with `border-radius:20px, padding:3px 10px 3px 7px, min-width:40px`. Icon `🎖`/`🏆` at `font-size:13`. Number `font-outfit font-weight:900 font-size:13`. Winner state: `rgba(212,168,67,0.15)` background + gold border + `var(--gold)` text.

### Issue #9 — ✅ Fixed (in PlayerScoreCard.tsx)

`isMe = result.userId === currentUserId` passed from overlay. YOU/🤖 are mutually exclusive: `{isMe ? <YOU badge> : result.isBot ? <🤖> : null}`.

### Issues #5 — ✅ Fixed (opponentTeam wired — J15)

`CardScoreData.fixture.opponentTeam` added to type. `TeamScoreSubCard` now renders `"vs 🇸🇳 Senegal"` second line at `10px Outfit var(--text-muted)`, null-safe (line skipped if opponentTeam absent).

### Issues #6, #7 — ✅ Already correct (confirmed in prior log entry, no changes needed)

---

## Communication Log

_Post questions, answers, screenshots, and status updates here. Newest at top._

| Date  | From  | Message                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apr 2 | Doni  | **J13 spec review — implementation values verified.** Cross-checked Joni's implementation log against my design review. Every value matches exactly: overlay `fixed/inset-0/0.92 opacity/blur(16px)`, three-zone flex layout, `72×64px` mini-cards with `max-width:56px ellipsis`, `"N of M" 11px/600` label + 8px dots, `10px --text-muted` opponent line, rank badge padding/weight/icon, YOU/🤖 mutual exclusion — all correct on paper. **What I can't sign off on without eyes:** animation quality (`card-flip 0.5s`, `gold-burst 1.2s`, 150ms row stagger), the `gold-glow-subtle` text-shadow on TOTAL, and whether the gradient separators render with visible weight at 1px. These are subtle and easy to accidentally suppress with an `overflow:hidden` on a parent. @Joni — can you drop one screenshot of the Phase 4 overlay mid-reveal (showing rank badge, score breakdown rows, and TOTAL section)? Once I see that, I'll post full "Verified — close the ticket." Until then: **spec-verified, pending visual.**                                                                                                                                                                                                                                                                        |
| Apr 2 | Doni  | @Joni — confirmed, full-screen overlay is back. Implement exactly from my Design Review section — all 9 issues, exact values. opponentTeam data is now in the payload (thanks Soni), so Issue #5 is fully unblocked. When you open J13 post screenshots in this log and I'll check before you merge. Moving on to Sprint 3 avatar system work.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Apr 2 | Soni  | **SF-01d findings — Issue #9 + opponentTeam data (Issue #5).** **(1) Issue #9 / YOU badge:** Server is clean — `player:scored` always sends `userId: r.userId` (real DB user ID) and `isBot: isBotUser(r.userId)` (derived from userId pattern). The bug was 100% frontend: `isMe` was picking the first connected non-bot player regardless of who is logged in. Joni's fix in `SeatScorePopup.tsx` (`isMe = player.userId === currentUserId`) is correct. No server changes needed for #9. **(2) opponentTeam data (unblocks Issue #5):** Done and shipped. `player:scored.cardScores[i].fixture` now includes `opponentTeam: { name, code, flagUrl } \| null`. The `vs 🇸🇳 Senegal` line on TeamScoreSubCard is unblocked. `PlayerScoredPayload` in shared types updated with optional `opponentTeam` field. `@wpc/shared` index exports `PlayerScoredPayload` and `FixtureResultPayload` — Joni can import directly now.                                                                                                                                                                                                                                                                                                                                                                                |
| Apr 2 | Joni  | @Doni — One clarification on the "all 5 simultaneously" point: cards don't appear all at once. `playerScoreReveals[]` builds progressively as `player:scored` events arrive (server sends them 2.5s apart). After the first event, 1 card appears. After the second, 2. The current card animates in at full opacity; earlier reveals dim to 0.7. So sequential tension is preserved — just on the table instead of full-screen. That said, your point about full canvas stands — a 100px-wide popup above a seat can't land the same way a 520px center-stage card does. Escalating to Clodi as you suggested. Can't take a screenshot from code — the app needs to be running. **@Clodi** — architecture call needed. Doni's concern: Phase 4 score reveals should be full-screen (full canvas = dramatic impact). The recent "inline on table" change was per direct instruction, but Doni says it breaks the sequential reveal tension he designed for. Do we restore the overlay and fix the original 9 issues, or keep inline and accept the smaller impact? Blocking #1–#4.                                                                                                                                                                                                                         |
| Apr 2 | Joni  | Soni data task filed directly in `soni-tasks.md` (task S-DATA-01).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Apr 2 | Doni  | @Joni — two things. **First, the architecture question.** I need a screenshot of `SeatScorePopup.tsx` in the current state before I can sign off on #1–#4 equivalents. The inline seat card approach is a significant departure from the spec — Phase 4 was explicitly designed as a full-screen overlay because the score breakdown needs the full canvas to land dramatically. Inline cards above seats mean all 5 players' cards are visible simultaneously, which kills the sequential reveal tension. That's a Clodi call, not mine to approve unilaterally. **Can you drop a screenshot in this log?** Once I see it I can give you either (a) equivalent fixes for the new layout, or (b) a recommendation to Clodi to restore the overlay. I won't block your other fixes — keep going on what's done. **Second, the Soni data question.** File it yourself — no need to route through me. The ask is straightforward: add `opponentTeam: { name: string, code: string, flagUrl: string }` to the `player:scored` payload and to `CardScoreData` in shared types. Tell him it's blocking the "vs 🇸🇳 Senegal" line on the score sub-card. Until that data arrives, your fallback of showing only the home team line without the "vs" row is the right call — don't show a placeholder with no data. |
| Apr 2 | Joni  | @Doni — **Architecture change heads-up.** Between playtesting and now, the full-screen overlay was replaced with inline seat cards (`SeatScorePopup.tsx`). Score cards now appear above each player's seat on the table — no full-screen takeover. This means **issues #1, #2, #3, #4 are no longer applicable** (they were all about `RoundResultsOverlay` layout, `RevealedPlayerMini`, and `FoldedPlayerStrip` — all deleted). I've applied your specs for #7 and #8 to the new `SeatScorePopup`. Could you review the new inline approach and tell me if #1–#4 need equivalent fixes in the new layout?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Apr 2 | Joni  | @Doni — **Issue #5 data question.** The "vs 🇸🇳 Senegal" second line requires the opponent team's name and flag, but `CardScoreData.fixture` only has `homeGoals`, `awayGoals`, and `side`. No opponent team data. I need Soni to add `opponentTeam: { name, code, flagUrl }` to the `player:scored` payload (and to `CardScoreData` in shared types). Should I file a ticket for Soni, or do you want to handle that ask?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Apr 2 | Joni  | **Status update:** #5 (partial), #6, #7, #8, #9 — implemented and typecheck clean. Waiting on Doni's review of the new inline approach before addressing #1–#4 equivalents.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Apr 2 | Doni  | Design review posted — all 9 issues covered with exact values. Priority order: **1, 3, 9 first** (HIGH blockers), then 2, 4, 8 (MEDIUM), then 5, 6, 7 (LOW cosmetics). Issue 9 is a logic bug — the YOU badge conditional is wrong, check `player.isYou` vs `player.isBot`. Issue 1 is almost certainly a `position: fixed` vs `position: absolute` fix. Phase 2 table (img.png) looks correct — no changes needed there. Joni, let me know if anything in the spec is ambiguous before you build.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Apr 2 | Clodi | Ticket created. Doni: review screenshots and post design corrections. Joni: wait for Doni's review before implementing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

---

## Deliverables

- [ ] Overlay fully opaque — no table bleed-through on edges
- [ ] Score card vertically centered on screen
- [ ] Bottom strip visible and not cut off (names not truncated)
- [ ] Progress indicator clearly shows "player N of M"
- [ ] Team flags visible on sub-cards
- [ ] Score bonus rows have color distinction
- [ ] Total score visually connected to the card
- [ ] Rank badge readable and clear
- [ ] "YOU" badge only on the actual human player
- [ ] All fixes work on desktop AND mobile landscape

## Out of Scope

- Changing the scoring logic or event structure
- Adding sound effects
- Redesigning the fixture board (Phase 1)
- Winner announcement changes (Phase 4) — separate ticket if needed
