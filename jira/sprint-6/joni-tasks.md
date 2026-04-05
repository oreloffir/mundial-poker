# Joni — Sprint 6 Tasks

**Sprint:** April 5–12, 2026
**Role:** Junior Developer — Frontend / UI
**Focus:** Complete mobile layout rebuild
**Total tasks:** 7

Read the [Sprint Brief](./SPRINT-BRIEF.md) first. Read `docs/design/game-ux-complete.md` before starting ANY task.

**THE RULE:** Nothing overlaps nothing. Layer model enforced. Mobile-first (667x375).

Deploy after EVERY task. Update Clodi after EVERY task.

---

## J24 — Fixture Board Container (THE #1 PRIORITY)

**Priority:** Critical
**Branch:** `feat/fixture-board-container`
**Deadline:** April 6

The fixture board is invisible on mobile. It blends into the pitch. This is the core game mechanic and players don't even see it.

### Requirements

1. Wrap `FixtureBoard` in a new `FixtureBoardContainer` div in `PokerTable.tsx`:
   - Background: `rgba(5,10,24,0.65)` glassmorphism
   - `backdrop-filter: blur(10px)`
   - Border: `1px solid rgba(212,168,67,0.2)` — pulses gold when results coming in
   - Border radius: `16px`
   - Padding: `8px 12px`
   - Label: "LIVE FIXTURES" in `Cinzel 9px var(--gold) letter-spacing: 0.1em` above the tiles

2. Position: upper half of pitch, above center circle. This is the SACRED ZONE — only fixtures live here.

3. Mobile: container scales to fit 667px width with horizontal scroll if needed.

4. The container is a NEW wrapper div — don't modify `FixtureBoard.tsx` internals.

### Deliverables

- [x] Glassmorphism container with "LIVE FIXTURES" label
- [x] Positioned in upper pitch, not overlapping any seat
- [x] Border pulses gold during fixture:result phase
- [x] Readable on mobile 667x375

---

## J25 — Dock Player Cards in Bottom Shelf

**Priority:** Critical
**Branch:** `feat/dock-player-cards`
**Deadline:** April 7

Player cards currently sit on the pitch overlapping fixtures. Move them to a fixed shelf.

### Requirements

1. Create a fixed-height bottom dock (above betting controls):

   ```
   ┌─────────────────────────────────────┐
   │   [🇰🇷 KOR]  [🇦🇺 AUS]  │ 💰 490  │
   ├─────────────────────────────────────┤
   │   [Fold]  [Call 10]  [Raise ▲]     │
   └─────────────────────────────────────┘
   ```

2. Your 2 team cards: compact tiles (flag + code), always visible, never on the pitch.

3. Chip count next to your cards in the dock.

4. During scoring: your score popup appears IN the dock area, not on the pitch.

5. Opponent cards stay at their seats (on the rail/perimeter, not on the pitch).

6. Mobile: dock is ~44px for cards + ~44px for controls = ~88px total bottom area.

### Deliverables

- [x] Player cards in fixed bottom shelf
- [x] Cards never overlap pitch/fixtures
- [x] Chip count visible next to cards
- [x] Opponent cards at seat positions on rail

---

## J26 — Move HUD to Rail (Avatars, Names, Chips Outside Pitch)

**Priority:** High
**Branch:** `feat/hud-on-rail`
**Deadline:** April 7

Avatars, names, chip counts, and badges currently draw on the pitch. Move them to the rail (wood border) or outside it.

### Requirements

1. Player seats render ON the rail edge, not on the green pitch:
   - Avatar circle sits on the rail border
   - Name below avatar, outside the pitch area
   - Chip badge below name

2. Badge priority system (max 1 secondary badge visible per seat):
   - Priority 1: Turn timer ring (active player)
   - Priority 2: Blind badge (SB/BB)
   - Priority 3: Dealer indicator
   - Others hidden — accessible via tap if needed later

3. The pitch area between the rails contains ONLY the fixture board container and the pot.

4. Mobile: reduce avatar size if needed (40px → 32px) to fit on rail.

### Deliverables

- [x] All player info on rail/outside pitch
- [x] Pitch is sacred — only fixtures + pot
- [x] Badge priority system (1 secondary max)
- [x] Works on 667x375

---

## J27 — Phase Badge in Top Bar

**Priority:** High
**Branch:** `feat/phase-badge`
**Deadline:** April 8

Replace the static "Round N" text with a phase-aware badge.

### Requirements

1. Replace `Round {N}` in `GameTable.tsx` top bar with:

   ```
   ┌──────────────────┐
   │ Round 1           │
   │ BETTING ●         │
   └──────────────────┘
   ```

2. Phase text + color:
   - DEALING: `var(--text-dim)` (grey)
   - BETTING: `var(--green-glow)` (green) + dot pulses
   - WAITING: `var(--gold)` (gold)
   - SCORING: `var(--gold-bright)` (bright gold)
   - WINNER: `var(--gold)` with glow

3. Read from `showdownPhase` in gameStore — it already tracks the phase.

4. Compact on mobile: single line `"R1 · BETTING"` if space is tight.

### Deliverables

- [x] Phase badge with color-coded state
- [x] Updates in real-time as phase transitions
- [x] Readable on mobile

---

## J28 — Directional Score Popups

**Priority:** High
**Branch:** `feat/directional-popups`
**Deadline:** April 9

Score popups clip above viewport for top seats. Fix with directional positioning.

### Requirements

1. Popup direction per seat index:
   - Seat 0 (bottom): popup extends UP
   - Seat 1 (left): popup extends RIGHT/INWARD
   - Seat 2 (top-left): popup extends DOWN
   - Seat 3 (top-right): popup extends DOWN
   - Seat 4 (right): popup extends LEFT/INWARD

2. Fixed widths: 100px mobile, 124px desktop.

3. Winner popup: full gold treatment (gold bg, gold border, gold text).

4. Score breakdown must be readable at 100px width. Compact format:
   `"W+5 HS+4 CS+2 = 11"`

### Deliverables

- [x] No viewport clipping on any seat
- [x] Correct direction per seat position
- [x] Readable at 100px on mobile
- [x] Winner popup gold treatment

---

## J29 — PWA Manifest + Orientation Lock

**Priority:** High
**Branch:** `feat/pwa-orientation`
**Deadline:** April 8

Chrome address bar eats precious vertical space. PWA mode fixes this.

### Requirements

1. Create `apps/web/public/manifest.json`:

   ```json
   {
     "name": "Mundial Poker",
     "short_name": "WPC",
     "start_url": "/lobby",
     "display": "fullscreen",
     "orientation": "landscape",
     "background_color": "#050a18",
     "theme_color": "#D4A843",
     "icons": [{ "src": "/images/icon-192.png", "sizes": "192x192" }]
   }
   ```

2. Add to `index.html`:

   ```html
   <link rel="manifest" href="/manifest.json" />
   <meta name="apple-mobile-web-app-capable" content="yes" />
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
   ```

3. Screen orientation lock on game pages:

   ```typescript
   screen.orientation?.lock('landscape').catch(() => {})
   ```

   Call this in `GameTable.tsx` on mount.

4. "Add to Home Screen" banner: show a dismissible prompt on first visit suggesting users add to home screen for full-screen experience.

### Deliverables

- [x] PWA manifest with landscape orientation
- [x] Full-screen mode when launched from home screen
- [x] Orientation lock attempt on game pages
- [x] "Add to Home Screen" prompt on first visit

---

## J30 — Permanent YOU Label + Single Timer

**Priority:** Medium
**Branch:** `feat/you-label-timer-cleanup`
**Deadline:** April 10

### Requirements

1. **YOU label** on seat 0: subtle `"YOU"` text (8px, gold at 60% opacity) below chip count. Always visible. Not a badge — permanent anchor.

2. **Single timer only**: remove duplicate timer displays. Keep EITHER the ring on the active seat OR the bar in betting controls — not both. Pick the ring (it's per-seat, shows whose turn it is to everyone).

3. Remove the timer bar from `BettingControls.tsx` on mobile. Keep just the countdown text "12s" in the controls.

### Deliverables

- [x] YOU label on seat 0, always visible
- [x] One timer display only (ring on seat)
- [x] Timer text in controls (no bar on mobile)

---

## Delivery Log

Update after EVERY task. Clodi reads this in real-time.

| Task | Status | PR | Deployed |
|------|--------|-----|----------|\
| J24 | ✅ PR open | #11 | pending merge |
| J25 | ✅ PR open | #15 | pending merge |
| J26 | ✅ PR open | #17 | pending merge |
| J27 | ✅ PR open | #18 | pending merge |
| J28 | ✅ PR open | #19 | pending merge |
| J29 | ✅ PR open | #20 | pending merge |
| J30 | ✅ PR open | #21 | pending merge |
| J31 | ✅ PR open | #14 | pending merge |
