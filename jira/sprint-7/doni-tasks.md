# Doni — Sprint 7 Tasks

**Sprint:** April 5–12, 2026
**Role:** Designer (UI/UX)
**Total tasks:** 3

Your specs gate Joni's work this sprint. She cannot start J38 or J40 without your deliverables. Ship DN2 and DN3 on Day 1-2.

---

## DN2 — Fixture-to-Card Visual Link Spec

**Priority:** Critical
**Deadline:** April 6 (Day 1 — blocks Joni J38)

This is the **#1 UX problem** identified by every team member in the mid-term review: players don't understand that their hand cards CORRESPOND to fixtures on the board. The core game mechanic is invisible.

### Context

Right now:
- Player holds 2 team cards (e.g., Brazil, Germany) in the bottom dock
- Fixture board shows 5 matchups (e.g., Brazil vs Japan, Germany vs France)
- **Nothing connects the two visually.** A first-time player doesn't realize "my Brazil card scores points based on the Brazil vs Japan fixture."

This is the single most important UX fix before beta.

### Requirements

Deliver an annotated HTML mockup (or detailed spec with exact CSS values) showing:

1. **The connection pattern** — how does a player's hand card visually link to its fixture on the board?

   Ideas to consider (pick what works, combine, or propose your own):
   - **Color coding:** Each of the player's 2 cards gets a subtle color accent (e.g., blue glow, green glow). The matching fixture on the board gets the same color accent.
   - **Highlight on hover/tap:** Tapping a hand card highlights its matching fixture. Tapping a fixture highlights the matching hand card.
   - **Connecting line:** A subtle curved line from hand card to fixture (might be too noisy on mobile — your call).
   - **Matching border pulse:** When a fixture resolves, the hand card pulses the same gold border simultaneously.
   - **"YOUR MATCH" label enhancement:** The gold border from Sprint 6 exists but is "hard to confirm at 375px" (Mark's audit). Make it louder.

2. **During betting** — the connection is most important here. Players are deciding whether to bet based on their matchups. The link between hand → fixture must be obvious at a glance.

3. **During scoring** — when a fixture reveals its score, the matching hand card should react (pulse, update, show score).

4. **Mobile-first** at 667x375. The hand cards are in the bottom dock (~44px tall). The fixture board is in the upper pitch. The connection must work across that distance.

5. **Layer model compliance:** The connection visual must not put anything on the pitch between dock and fixture board. Use color/glow/pulse — not overlaid lines or floating elements in the sacred zone.

### Deliverables

- [ ] Annotated mockup or spec with exact CSS values
- [ ] Shows connection during betting phase
- [ ] Shows connection during scoring phase
- [ ] Works at 667x375
- [ ] Respects layer model
- [ ] Saved to `docs/design/fixture-card-link-spec.md`

### What Joni Needs From You
- Exact colors/opacities for the link visual
- Animation timing (duration, easing)
- Which elements get which treatment (hand card, fixture tile, both)
- Mobile-specific adjustments if desktop differs

---

## DN3 — Match Ticket Card Spec

**Priority:** High
**Deadline:** April 7 (Day 2 — blocks Joni J40)

Your insight from the mid-term review: "Hand cards should feel like match tickets, not hidden card backs." This is a visual identity shift for how player cards look.

### Context

Current state: Player cards in the dock show a flag + 3-letter country code (e.g., 🇧🇷 BRA) as small compact tiles. They look like generic poker card backs with a flag sticker. They don't feel like "I'm holding a ticket to the Brazil match."

### Requirements

Deliver a spec for the "match ticket" card design:

1. **Face-up, not card-back.** The card is always visible — no mystery, no hidden state. The player knows what they have from the moment cards are dealt.

2. **Flag is prominent.** The national flag should be the dominant visual element, not a tiny icon. At 667x375, the flag needs to be recognizable at a glance.

3. **Ticket metaphor.** Consider:
   - Perforated edge on one side (like a real ticket stub)
   - "ADMIT ONE" or "MATCH DAY" subtle watermark
   - Match info: opponent name, group stage indicator
   - Ticket number (seat number or table ID — adds authenticity)

4. **Two states:**
   - **Pre-scoring:** Clean ticket, flag prominent, opponent listed
   - **Post-scoring:** Score result stamped on the ticket (WIN/DRAW/LOSS with points)

5. **Size:** Must fit in the bottom dock at ~44px height. Width flexible but compact — 2 cards + chip count must fit in ~300px.

6. **Works with DN2:** The match ticket must support the fixture-card link visual from DN2 (color accent, pulse, glow — whatever you specified there).

### Deliverables

- [ ] Match ticket card design (both states)
- [ ] Exact dimensions, colors, typography
- [ ] Flag rendering approach (SVG flag? image? emoji fallback?)
- [ ] Compatible with DN2 link visual
- [ ] Saved to `docs/design/match-ticket-spec.md`

---

## DN4 — Sprint 7 Design Review

**Priority:** Medium
**Deadline:** April 11 (before sprint close)

After Joni implements J38 (fixture-card link) and J40 (match tickets), review the deployed result against your specs.

### Requirements

1. Open `https://mundialpoker.duckdns.org` on 667x375
2. Play 1 full round
3. Compare implementation to your DN2 and DN3 specs
4. Score fidelity: what % of the spec is correctly implemented?
5. File specific feedback (with screenshots) for anything that needs adjustment

### Deliverables

- [ ] Design review of J38 and J40 implementations
- [ ] Fidelity score (target: 85%+)
- [ ] Specific feedback with screenshots if needed
- [ ] Report in `jira/sprint-7/shared/design-review.md`

---

## Delivery Log

| Task | Status | Delivered |
|------|--------|-----------|
| DN2  | ⬜     |           |
| DN3  | ⬜     |           |
| DN4  | ⬜     |           |
