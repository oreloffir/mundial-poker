# Mark — Sprint 1 QA Plan

**Sprint:** April 1–8, 2026
**Role:** QA & Marketing
**Context:** Read the [Sprint Brief](./SPRINT-BRIEF.md) for full sprint scope.

---

Hey Mark, Clodi here. This sprint has two batches of changes landing at different times. Start testing as soon as Joni's batch merges — don't wait for Soni's backend work. I've split everything below so you know exactly what to test and when.

If something feels off but you're not sure if it's a bug or intended behavior, ping me through Orel. Better to flag it early.

---

## Batch 1 — Joni's Frontend Changes (ready ~April 3-4)

These are all UI bug fixes and polish. You can test them independently — no backend changes needed.

### J1 — Winner Banner Timing Fix

**What changed:** The winner banner after showdown now auto-dismisses before the next round starts. Previously it would persist and overlap with the new round's fixture reveal.

**How to test:**

1. Create a table, add bots, start a game
2. Play through a full round until showdown — verify the winner banner appears with pot amount
3. Wait for the next round to start automatically
4. **Check:** Does the winner banner disappear BEFORE the new fixture cards appear?
5. **Check:** Do the old fixture cards (from the previous round) fully disappear before new ones reveal?
6. **Check:** Is there any moment where you see BOTH the old round's info AND the new round's info at the same time?
7. Repeat for 3+ consecutive rounds to confirm consistency

**Pass criteria:**
- [ ] Winner banner gone before next round's fixtures appear
- [ ] No overlap of old and new round visual elements
- [ ] Pot animation completes before banner dismisses (not cut short)

---

### J2 — Round Counter Sync Fix

**What changed:** The round number in the top bar now updates immediately when a new round starts. Previously it sometimes showed the old round number for a moment.

**How to test:**

1. During gameplay, watch the round counter in the top-left area of the game view
2. When a round ends and the next round starts, watch closely
3. **Check:** Does the round number update instantly? Or does it flicker/lag showing the old number first?
4. Test across at least 4-5 round transitions

**Pass criteria:**
- [ ] Round number updates immediately on every transition
- [ ] No flicker of the old round number

---

### J3 — Balance Readability Fix

**What changed:** Player chip balances now display as gold text on a dark semi-transparent pill instead of small green text. Much easier to read against the stadium background.

**How to test:**

1. Join a game with bots — look at ALL 5 player seats
2. **Check:** Is every player's chip balance clearly readable? Gold text on dark background?
3. **Check:** Does the pill overlap with the player's name, avatar, or cards at any seat position?
4. **Check:** When chips change (win a pot or lose a bet), does the flash animation still work? (Green flash for increase, red flash for decrease)
5. Test at different browser window sizes if possible

**Pass criteria:**
- [ ] All 5 seats show readable chip balances
- [ ] No overlap with other UI elements at any seat
- [ ] Green/red flash animations still work on chip changes
- [ ] Looks good on the stadium background (no seat position where it's hard to read)

---

### J5 — Stale Cards Cleanup

**What changed:** Between rounds, old fixture cards and showdown results are now fully cleared before new round data appears. Previously they would flash briefly.

**How to test:**

1. Play through multiple rounds, paying close attention to the transition moment
2. **Check:** When a new round starts, do you ever see a brief flash of the PREVIOUS round's fixture cards?
3. **Check:** Do you ever see previous round's showdown scores/results flickering?
4. **Check:** Is the fixture board area clean/empty before the new fixtures start revealing?
5. Test across 4-5 round transitions minimum

**Pass criteria:**
- [ ] Zero flash of stale cards between rounds
- [ ] Fixture board is clean before new reveals begin
- [ ] No ghost showdown results from previous round

**Note:** J1 and J5 overlap — test them together. The round transition should be clean from every angle: no old banner, no old cards, no old scores.

---

### J6 — Blind Config in Create Table Modal

**What changed:** The "Create Table" modal in the lobby now has Small Blind and Big Blind input fields. Previously only Starting Chips was configurable.

**How to test:**

1. Go to the lobby, click "Create Table"
2. **Check:** Do you see Small Blind and Big Blind inputs below Starting Chips?
3. **Check:** Default values should be SB=5, BB=10
4. Change Small Blind to 25 — **Check:** Does Big Blind auto-update to 50?
5. Change Big Blind to 100 — **Check:** Does Small Blind auto-update to 50?
6. Try entering 0 or negative numbers — **Check:** Validation error shown?
7. Try setting BB to an odd number that isn't 2x SB — **Check:** Validation error shown?
8. Create a table with custom blinds — **Check:** Table creates successfully?
9. **Check:** Is there help text explaining the 2x relationship?

**Pass criteria:**
- [ ] SB/BB inputs visible and styled consistently with Starting Chips
- [ ] Auto-sync works both ways (SB→BB and BB→SB)
- [ ] Validation prevents invalid values (0, negative, BB ≠ 2*SB)
- [ ] Table creation works with custom blind values
- [ ] Help text present

### J7 — Fix React Hooks Crash on Bot Add (BUG-05)

**What changed:** Fixed the `Rendered more hooks than during the previous render` crash in `PlayerSeat.tsx` that you reported as BUG-05. The early return for empty seats was placed before the hooks — now all hooks run unconditionally.

**How to test:**

1. Create a table (don't add any bots yet)
2. Click "Add Bot" — watch the UI
3. **Check:** Does the UI stay intact? No blank screen, no crash?
4. Add all 4 bots one by one
5. **Check:** Each bot appears in a seat without any crash or flicker?
6. Start the game and play through 1 round
7. **Check:** No hooks errors in the browser console? (`F12` → Console tab)
8. If a player gets eliminated mid-game, **Check:** No crash when their seat empties?

**Pass criteria:**
- [ ] Adding 4 bots one-by-one — zero crashes
- [ ] No React hooks errors in browser console
- [ ] Game plays normally after bots are added
- [ ] Eliminated player seat renders correctly (no crash)

---

### J8 — Mobile Responsive Game View (Landscape)

**What changed:** The game view now scales down for landscape mobile screens. All elements (table, seats, cards, betting controls, fixture board, top bar) are responsive. A portrait orientation hint shows on mobile.

**How to test:**

Use Chrome DevTools responsive mode (`F12` → toggle device toolbar → select device → rotate to landscape).

**Test on iPhone SE landscape (667x375):**
1. Open a game with bots
2. **Check:** Does the entire game fit on screen without scrolling?
3. **Check:** Are all 5 player seats visible with readable names and chip amounts?
4. **Check:** Are the cards visible (not overlapping or cut off)?
5. **Check:** Can you tap/click all betting buttons (Fold, Check, Call, Raise, All-In)?
6. **Check:** Is the raise slider draggable?
7. **Check:** Are fixture tiles readable?
8. **Check:** Is the pot amount visible in the center?

**Test on iPhone 12 landscape (844x390):**
9. Repeat checks 1-8 on this larger screen

**Test portrait orientation hint:**
10. Switch to portrait mode on a mobile viewport
11. **Check:** Do you see a "rotate your device" hint?
12. **Check:** Can you dismiss it?

**Test desktop unchanged:**
13. Switch back to a desktop viewport (1920x1080 or similar)
14. **Check:** Does everything look exactly the same as before? No visual changes?

**Pass criteria:**
- [ ] iPhone SE landscape: game fully playable, no overflow, no scroll
- [ ] iPhone 12 landscape: game fully playable
- [ ] All 5 seats readable on both mobile sizes
- [ ] Betting controls usable on mobile (tappable buttons, draggable slider)
- [ ] Fixture board readable on mobile
- [ ] Portrait hint shown on mobile portrait
- [ ] Desktop layout completely unchanged

---

## Batch 2 — Soni's Backend Changes (ready ~April 6-7)

These are core gameplay changes. Test them after Soni's branches are merged. You'll need to play full games to verify.

### S1 — Blind Position Assignment & Collection

**What changed:** The game now assigns Small Blind and Big Blind positions each round and auto-deducts forced bets before betting begins. The pot starts with the collected blinds.

**How to test:**

1. Create a table (use the new blind config from J6 — set SB=10, BB=20 for easy math)
2. Add bots, start the game
3. **Check:** At round start, do two players have "SB" (blue) and "BB" (gold) badges? (Requires J4 to be merged)
4. **Check:** Do the SB and BB players' chip stacks decrease by the correct blind amounts at round start?
5. **Check:** Does the pot show the sum of both blinds (e.g., 30 = 10 + 20) before any voluntary betting?
6. Play 3+ rounds — **Check:** Do the SB/BB positions rotate clockwise each round?
7. **Check:** Does the rotation skip empty seats (if a player was eliminated)?
8. **Edge case:** Play until only 2 players remain (heads-up). **Check:** Is the dealer also the SB? Is the other player the BB?
9. **Edge case:** Play until a player's chip stack is less than the blind amount. **Check:** Do they go all-in for what they have instead of being skipped?

**Pass criteria:**
- [ ] Correct blind amounts deducted at round start
- [ ] Pot seeded with both blinds before voluntary betting
- [ ] SB/BB positions rotate clockwise each round
- [ ] Rotation skips eliminated players
- [ ] Heads-up: dealer = SB, opponent = BB
- [ ] Player with fewer chips than blind goes all-in

---

### S2 — Betting Order Fix

**What changed:** Betting now follows proper Texas Hold'em order. Pre-flop: starts at the player after BB (UTG position). Post-flop: starts at SB or first active player. BB gets the "option" to check or raise if nobody raised pre-flop.

**How to test:**

1. Start a game with 4-5 players (you + bots)
2. **Pre-flop (betting round 1):**
   - **Check:** Who gets prompted to bet first? It should be the player sitting AFTER the BB position (UTG), not the SB or dealer
   - **Check:** Does betting wrap around through all players and reach BB last?
3. **BB Option test:** If all players just check/call the big blind amount (no raise):
   - **Check:** Does the BB player get the option to CHECK or RAISE (not forced to call their own blind)?
4. **BB No-Option test:** If any player RAISES beyond the big blind:
   - **Check:** When action reaches BB, do they have to CALL, RAISE, or FOLD (no free check)?
5. **Post-flop (betting rounds 2 & 3):**
   - **Check:** Does action start at the SB position (or first active player if SB folded)?
6. **Folded player test:** If a player folds, **Check:** Are they correctly skipped in the rotation?

**Pass criteria:**
- [ ] Pre-flop starts at UTG (after BB)
- [ ] BB gets option (check/raise) when nobody raised
- [ ] BB loses option when someone raised
- [ ] Post-flop starts at SB (or next active)
- [ ] Folded players skipped in rotation

---

### S3 — Server-Side Bet Timeout

**What changed:** If a player doesn't act within 30 seconds, the server automatically checks (if allowed) or folds for them. This prevents the game from freezing.

**How to test:**

1. Start a game — when it's YOUR turn, **do nothing for 30 seconds**
2. **Check:** After ~30 seconds, does the game automatically act for you?
3. **Check:** If CHECK was available, did it auto-CHECK? If not, did it auto-FOLD?
4. **Check:** Does the bet update show in the UI for all players? (Optionally with a "timed out" indicator)
5. **Check:** Does the game continue normally to the next player after the auto-action?
6. **Check:** Do bots still act quickly (~1.5 seconds) and NOT wait 30 seconds?
7. **Disconnect test:** If possible, open the game, then close the browser tab mid-turn. Open a new tab and check the game — **Check:** Did the server auto-act for the disconnected player after 30s?
8. Play several rounds with normal timing — **Check:** Does the timeout never fire incorrectly during normal play?

**Pass criteria:**
- [ ] Auto-CHECK or auto-FOLD fires at ~30 seconds
- [ ] Game continues normally after auto-action
- [ ] Bots unaffected (still act at ~1.5s)
- [ ] No false timeout during normal-speed play
- [ ] Disconnected player gets auto-acted after 30s

---

### S4 — Blind-Aware Bot Logic

**What changed:** Bots now correctly interact with the blind system — their blinds are auto-posted, and they call the right amounts after posting blinds.

**How to test:**

1. Play a game with 4 bots — observe rounds where bots are in SB/BB positions
2. **Check:** Do bot blinds get posted automatically at round start? (No awkward pause or bot "deciding" to post)
3. **Check:** When a bot in BB position faces a raise, does it call the CORRECT amount? (Raise minus BB already posted, not the full raise amount)
4. **Check:** Watch bot chip stacks — do the numbers make sense after blind posting and calling?
5. Play 5+ rounds — **Check:** No crashes, no stuck games, no weird bot behavior

**Pass criteria:**
- [ ] Bot blinds posted automatically (no decision delay)
- [ ] Bot call amounts are correct after posting blinds
- [ ] No stuck games or crashes with bots in blind positions

---

## Combined Integration Test (after ALL tasks merged)

Once everything is in, do one thorough end-to-end playthrough:

1. **Create table** with custom blinds (SB=25, BB=50, Starting Chips=500)
2. **Add 4 bots**, start the game
3. Play **5+ full rounds** and verify ALL of the following in a single session:

| # | Check | Status |
|---|-------|--------|
| 1 | SB/BB badges visible and rotating correctly | |
| 2 | Blind amounts deducted at round start, pot seeded | |
| 3 | Betting starts at UTG pre-flop, SB post-flop | |
| 4 | BB gets option when no raise | |
| 5 | Winner banner dismisses cleanly before next round | |
| 6 | No stale cards flash between rounds | |
| 7 | Round counter updates immediately | |
| 8 | Chip balances readable (gold on dark pill) | |
| 9 | Bots post blinds and call correct amounts | |
| 10 | Timeout auto-folds after 30s of inaction | |
| 11 | Game plays to completion (one player wins all chips) without crashes | |

**File any bugs as GitHub issues with:**
- Screenshot or screen recording
- Steps to reproduce
- Expected vs actual behavior
- Browser and screen size

Thanks Mark. Let's catch everything before the next playtest.

— **Clodi**, PM @ Mundial Poker

---

## Mark's QA Progress Summary

_Last updated: April 1, 2026 — Marker (QA)_

---

### Pre-Sprint Smoke Testing (April 1) — DONE

Before the sprint kicked off, I ran a full automated Playwright test suite (8 flows, 17 screenshots) against the current build. Here's what the baseline looks like:

**Flows tested:** Landing page, Guest login + lobby, Create table + add bots, Full game round, Raise bet, Fold, Lobby table states, 2-player game.

**Bugs found and reported to Soni:**

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| BUG-01 | MEDIUM | Showdown card-flip reveal not captured — timing too brief | Fixed by Soni, verified |
| BUG-02 | MEDIUM | Winner banner ("X wins!" + trophy + "+N chips") not appearing | Fixed by Soni, verified |
| BUG-03 | LOW | Folded player avatar not showing dimmed state / "FOLDED" label across rounds | Fixed by Soni, verified |
| BUG-04 | LOW | 29 stale "In Progress" tables polluting lobby after test sessions | Fixed by Soni, verified |
| BUG-05 | HIGH | React hooks crash (`Rendered more hooks than during the previous render`) in `PlayerSeat` on every bot add — UI goes blank, recovers on reload | Open — needs Joni/Soni |

All BUG-01 through BUG-04 were fixed and re-verified on a clean DB restart. BUG-05 is newly discovered and open.

**Note on testids:** `data-testid="winner-banner"` works. The showdown phase uses `data-testid="showdown-score"` (not `"showdown"` as originally expected) — tests have been updated accordingly.

---

### Sprint 1 Task Status

| Task | Description | Blocked Until | Status |
|------|-------------|---------------|--------|
| BUG-05 | Report React hooks crash on Add Bot | — | Pending |
| J1 | Winner banner timing — no overlap with next round | Joni merges (~Apr 3-4) | Waiting |
| J2 | Round counter sync — no flicker on transition | Joni merges (~Apr 3-4) | Waiting |
| J3 | Balance readability — gold pill on all 5 seats, flash animations | Joni merges (~Apr 3-4) | Waiting |
| J5 | Stale cards cleanup — zero flash between rounds (test with J1) | Joni merges (~Apr 3-4) | Waiting |
| J6 | Blind config in Create Table modal — SB/BB inputs, auto-sync, validation | Joni merges (~Apr 3-4) | Waiting |
| S1 | Blind position assignment — deduction, pot seeding, rotation, edge cases | Soni merges (~Apr 6-7) | Waiting |
| S2 | Betting order — UTG pre-flop, BB option, SB post-flop, skip folded | Soni merges (~Apr 6-7) | Waiting |
| S3 | Server-side 30s timeout — auto-fold, bots unaffected, disconnect case | Soni merges (~Apr 6-7) | Waiting |
| S4 | Bot blind awareness — no delay, correct call amounts, no crashes | Soni merges (~Apr 6-7) | Waiting |
| Integration | Full 5+ round end-to-end with all 11 checks | All tasks merged (~Apr 7-8) | Waiting |

---

### How I Test

All automated tests run via Playwright (headless Chromium) from:
```
cd /Users/oreloffir/Desktop/Projects/Unipaas/Services/_scripts
node -e "const { chromium } = require('./node_modules/playwright'); ..."
```

Screenshots saved to `/tmp/qa-XX-*.png` and visually inspected after each flow. Every test uses `waitUntil: 'domcontentloaded'` and a 5s render wait — `networkidle` times out on this app.

For betting controls I always scope to the footer bar to avoid hitting action badge text:
```js
const bottom = page.locator('div[class*="absolute bottom"]');
```

**Checklist applied to every screenshot:** MUNDIAL POKER branding, stadium table, colored avatars, gold "MP" card backs, 5 fixture cards with flags, gold pot display, turn timer, action badges, fold state, showdown reveal, winner banner, betting controls bar.

---

_I'll update this table as each batch lands and I complete testing. Ping me through Orel if a branch is ready early._
