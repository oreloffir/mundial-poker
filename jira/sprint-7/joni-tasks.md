# Joni — Sprint 7 Tasks

**Sprint:** April 5–12, 2026
**Role:** Junior Developer — Frontend / UI
**Total tasks:** 5

Read the [Sprint Brief](./SPRINT-BRIEF.md) first. Your first task (J37) is a 30-min bugfix — ship it immediately. Then wait for Doni's specs (DN2, DN3) before starting J38 and J40.

**THE RULE:** Nothing overlaps nothing. Layer model enforced. Mobile-first (667x375).

Deploy after EVERY task. Update Clodi after EVERY task.

---

## J37 — Fix BUG-MP-01: Non-Host Sees Host Buttons

**Priority:** Critical
**Branch:** `fix/host-only-buttons`
**Deadline:** April 5 (today — 30 min fix)

Non-host players see "Start Game" and "Add Bot" buttons. Only the table host should see these.

### Context

When a non-host player joins a table, they currently see the same controls as the host. This will confuse beta testers ("I clicked Start Game and nothing happened") and could cause race conditions if two players try to start simultaneously.

### Requirements

1. **Find the buttons** — they're in `GameTable.tsx` or a child component. Look for "Start Game" and "Add Bot" button elements.

2. **Add a host check** — the game store should have a `hostId` or `isHost` flag. Conditionally render these buttons:
   ```tsx
   {isHost && (
     <>
       <button>Start Game</button>
       <button>Add Bot</button>
     </>
   )}
   ```

3. **If `isHost` doesn't exist in the store:** Check if `hostId` is available from the server. The table creator's userId should be the host. If neither exists, check with Soni — he may need to add a `host` field to the `table:joined` socket event payload.

4. **Non-host view:** Non-host players should see a "Waiting for host to start..." message where the buttons would be.

### Files to Check
- `apps/web/src/pages/GameTable.tsx`
- `apps/web/src/components/game/` — whichever component renders Start Game / Add Bot
- `apps/web/src/stores/gameStore.ts` — check for hostId/isHost

### Out of Scope
- Don't redesign the waiting state — just hide buttons and show text
- Don't add "become host" functionality

### Deliverables

- [ ] Host-only buttons hidden for non-host players
- [ ] "Waiting for host..." message shown to non-host
- [ ] Works on mobile 667x375
- [ ] No console.log statements
- [ ] PR opened, deployed, tested

---

## J38 — Fixture-to-Card Visual Link

**Priority:** High
**Branch:** `feat/fixture-card-link`
**Deadline:** April 9
**BLOCKED BY:** Doni DN2 spec — do NOT start until `docs/design/fixture-card-link-spec.md` exists

This is the **#1 UX problem.** Players don't understand that their hand cards correspond to fixtures on the board. Doni will deliver the exact visual spec — your job is to implement it precisely.

### Requirements

1. **Read Doni's spec** at `docs/design/fixture-card-link-spec.md` before writing any code.

2. **Implement the connection visual** — whatever Doni specifies. Likely involves:
   - Color accents on hand cards in the dock (`PlayerCardDock.tsx`)
   - Matching color accents on fixture tiles (`FixtureBoard.tsx`)
   - Animation on fixture resolve → hand card reacts

3. **During betting phase:** The connection must be visible at a glance. Players need to see "my Brazil card = that Brazil fixture" without thinking.

4. **During scoring phase:** When a fixture result appears, the matching hand card should pulse/highlight simultaneously. Timing: sync with the `fixture:result` socket event.

5. **Layer model:** The connection visual stays within the dock (Layer 4) and fixture board (Layer 2). NO floating elements between them in the sacred zone. Use color/glow/opacity — not connecting lines on the pitch.

### Files to Modify
- `apps/web/src/components/game/PlayerCardDock.tsx` — hand card accents
- `apps/web/src/components/game/FixtureBoard.tsx` — fixture tile accents
- `apps/web/src/components/game/PokerTable.tsx` — if coordination logic needed
- `apps/web/src/stores/gameStore.ts` — if you need to track which fixtures are "mine"

### WHY This Matters
The entire game concept is "your cards score based on real matches." If players can't SEE this connection, the game doesn't make sense. This is the difference between "cool concept" and "I don't get it."

### Out of Scope
- Don't redesign the card layout (that's J40)
- Don't modify fixture board container (J24 already done)
- Don't add sound (that's J41)

### Deliverables

- [ ] Hand cards visually linked to matching fixtures
- [ ] Connection visible during betting
- [ ] Hand card reacts during fixture scoring
- [ ] Works at 667x375
- [ ] Layer model respected
- [ ] Matches Doni's spec (DN2)
- [ ] PR opened, deployed, Doni verifies

---

## J40 — Match Ticket Card Design

**Priority:** High
**Branch:** `feat/match-ticket-cards`
**Deadline:** April 10
**BLOCKED BY:** Doni DN3 spec — do NOT start until `docs/design/match-ticket-spec.md` exists

Transform hand cards from generic tiles into "match tickets" that feel like you're holding a ticket to the game.

### Requirements

1. **Read Doni's spec** at `docs/design/match-ticket-spec.md` before writing any code.

2. **Implement the match ticket design** — Doni will specify exact visuals. Likely involves:
   - Flag as the dominant element (not a tiny icon)
   - Ticket-style border/edges
   - Opponent name visible
   - Two states: pre-scoring (clean) and post-scoring (result stamped)

3. **Size constraint:** Must fit in the bottom dock at ~44px height. 2 cards + chip count must fit in ~300px width on mobile.

4. **Flag rendering:** Use SVG flag images if available in `apps/web/public/` or `assets/`. If not, check what the current card component uses and follow the same approach. Do NOT use emoji flags (rendering varies across devices).

5. **Post-scoring state:** After a fixture resolves, the card should show the result. Keep it compact:
   - WIN: green accent + "W +5"
   - DRAW: gold accent + "D +3"
   - LOSS: dim/grey + "L +0"

6. **Compatible with J38:** The match ticket must work with the fixture-card link visual from J38. If J38 adds a color glow to the card, the ticket design must accommodate that glow.

### Files to Modify
- `apps/web/src/components/game/PlayerCardDock.tsx` — main card redesign
- May need a new `MatchTicketCard.tsx` component if the redesign is substantial
- CSS: use existing design tokens from `index.css`

### WHY This Matters
Doni's insight: "Hand cards should feel like match tickets, not hidden card backs." The card is the player's emotional anchor — it's THEIR team, THEIR match. Making it feel like a premium match ticket increases engagement and makes the game concept click faster.

### Out of Scope
- Don't modify opponent cards at seats (just your cards in the dock)
- Don't change card dealing animation
- Don't add sound effects (that's J41)

### Deliverables

- [ ] Match ticket card design implemented (both states)
- [ ] Flag prominent at 44px height
- [ ] Pre-scoring and post-scoring states
- [ ] Compatible with J38 link visual
- [ ] Works at 667x375
- [ ] Matches Doni's spec (DN3)
- [ ] PR opened, deployed, Doni verifies

---

## J41 — Sound Effects (3 Clips)

**Priority:** Medium
**Branch:** `feat/sound-effects`
**Deadline:** April 11
**After:** J38 and J40 done

The game feels silent. 3 sound clips would transform the experience. This is the "premium gap" identified in mid-term reviews.

### Requirements

1. **Find 3 royalty-free sound clips** (or ask Orel to provide):

   | Event | Sound | Duration | Volume |
   |-------|-------|----------|--------|
   | Bet placed | Poker chip clack/slide | <1s | 60% |
   | Fixture score revealed | Short whistle or score ping | <1s | 50% |
   | Winner announced | Crowd cheer or triumphant flourish | 2-3s | 70% |

   **Sources:** freesound.org, mixkit.co, pixabay.com/sound-effects (all royalty-free). Download as `.mp3` (small file size).

2. **Add sounds to** `apps/web/public/sounds/`:
   ```
   sounds/
   ├── chip-bet.mp3
   ├── score-reveal.mp3
   └── winner-cheer.mp3
   ```

3. **Create a sound utility** — a simple `playSound(name)` function:
   ```typescript
   // apps/web/src/utils/sound.ts
   const sounds = {
     bet: new Audio('/sounds/chip-bet.mp3'),
     score: new Audio('/sounds/score-reveal.mp3'),
     winner: new Audio('/sounds/winner-cheer.mp3'),
   }

   export function playSound(name: keyof typeof sounds) {
     const audio = sounds[name]
     audio.currentTime = 0
     audio.play().catch(() => {}) // ignore autoplay blocks
   }
   ```

4. **Hook into game events:**
   - `playSound('bet')` — when ANY player places a bet (listen for `betting:placed` or similar socket event)
   - `playSound('score')` — on each `fixture:result` event
   - `playSound('winner')` — on `round:winner` event

5. **Mute by default on mobile** — browsers block autoplay. The first user interaction (tap "Start Game" or first bet) should unlock audio. Don't show a mute button yet — just make sure sounds play after first interaction.

### Files to Modify
- Create: `apps/web/src/utils/sound.ts`
- Create: `apps/web/public/sounds/` (3 files)
- `apps/web/src/hooks/useGameSocket.ts` or wherever socket events are handled — add `playSound()` calls
- `apps/web/src/components/game/BettingControls.tsx` — `playSound('bet')` on bet action

### Out of Scope
- No mute/volume UI (Sprint 8)
- No background music
- No sound for card dealing or fold (keep it minimal — 3 clips only)

### Deliverables

- [ ] 3 sound files in `public/sounds/`
- [ ] `playSound()` utility
- [ ] Bet, score, winner sounds trigger on correct events
- [ ] Works on mobile (after first interaction)
- [ ] No console.log statements
- [ ] PR opened, deployed, tested

---

## J42 — Backend Task: Table Stats Endpoint (Your First Backend!)

**Priority:** Medium
**Branch:** `feat/table-stats-endpoint`
**Deadline:** April 12
**After:** Soni finishes S21 (he mentors you on this)
**Mentored by:** Soni

This is your first backend task. Soni will be available for questions — relay through Orel. The goal is exposure to the server architecture, not perfection.

### Requirements

1. **Create a new endpoint** `GET /api/tables/:tableId/stats`:
   ```json
   {
     "tableId": "abc-123",
     "roundsPlayed": 7,
     "players": [
       { "name": "Player1", "chips": 1200, "roundsWon": 3 },
       { "name": "Ace-Finn16", "chips": 800, "roundsWon": 2, "isBot": true }
     ],
     "currentRound": 8,
     "totalPot": 0,
     "createdAt": "2026-04-05T10:00:00Z"
   }
   ```

2. **Where to put it:** Follow the existing route pattern in `apps/server/src/`. Look at how other routes are structured (health, auth, tables) and mirror that pattern.

3. **Data sources:**
   - `roundsPlayed` / `currentRound` — from game state (Redis or in-memory)
   - `players` with chips/wins — from game state
   - `createdAt` — from database (tables table)

4. **Tests:** Write at least 2 tests:
   - Returns stats for an active table
   - Returns 404 for non-existent table

5. **Ask Soni:**
   - Where does game state live? (Redis keys? In-memory maps?)
   - How do you access the round count and player chip balances?
   - What's the pattern for adding a new route?

### Files to Create/Modify
- Create: `apps/server/src/modules/table/table-stats.route.ts` (or wherever routes live)
- Modify: `apps/server/src/app.ts` — register the new route
- Create: `apps/server/src/modules/table/__tests__/table-stats.test.ts`

### WHY This Matters
You've built the entire frontend. Understanding the backend architecture makes you a stronger developer and unblocks future tasks where frontend and backend are tightly coupled. This is a growth investment.

### Out of Scope
- Don't add authentication to this endpoint (public for now)
- Don't modify game logic
- Don't build a frontend view for this (just the API)

### Deliverables

- [ ] `GET /api/tables/:tableId/stats` returns correct data
- [ ] 404 for non-existent table
- [ ] 2+ tests passing
- [ ] Follows existing route patterns
- [ ] No console.log statements
- [ ] PR opened, Soni reviews

---

## Delivery Log

Update after EVERY task. Clodi reads this in real-time.

| Task | Status | PR | Deployed |
|------|--------|-----|----------|
| J37  | ⬜     |     |          |
| J38  | ⬜ blocked (DN2) |     |          |
| J40  | ⬜ blocked (DN3) |     |          |
| J41  | ⬜     |     |          |
| J42  | ⬜     |     |          |
