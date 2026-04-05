# Mundial Poker — Sprint 6 Brief

**Sprint:** April 5–12, 2026
**Sprint Goal:** Rebuild the mobile experience from scratch. The game works but you can't SEE the game on mobile. Fix that.

---

## The Problem

We playtested on real phones. The verdict: **the game is invisible on mobile.** Fixture board blends into the pitch. Score popups are colored dots. Cards are microscopic. HUD overlaps everything. A first-time player wouldn't know what they're looking at.

The game WORKS — betting, scoring, reveals, winner all function. But function without visibility is useless.

## The Design Rule

**Nothing overlaps nothing.** Strict layer model:

```
Layer 0 — Stadium background
Layer 1 — Table rail (wood border)
Layer 2 — Pitch (SACRED ZONE — only fixtures here)
Layer 3 — Perimeter HUD (avatars, chips, blinds — ON or OUTSIDE the rail)
Layer 4 — Bottom dock (my cards + timer + actions — fixed height)
Layer 5 — Transient (toasts, sheets — above dock only)
```

Any element that violates a layer gets REFLOWED, not z-indexed higher.

---

## Task files

| Developer | File                                                 | Focus                                                          |
| --------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| **Soni**  | [`soni-tasks.md`](./soni-tasks.md)                   | PWA manifest, orientation lock, merge pending PRs, domain prep |
| **Joni**  | [`joni-tasks.md`](./joni-tasks.md)                   | Full mobile layout rebuild — the big one                       |
| **Doni**  | Design authority — `docs/design/game-ux-complete.md` | Available for questions during implementation                  |
| **Mark**  | [`mark-tasks.md`](./mark-tasks.md)                   | Test each change on mobile as it lands                         |
| **Devsi** | [`devsi-tasks.md`](./devsi-tasks.md)                 | Domain setup, deploy pipeline, PWA config                      |

---

## Sprint rules

1. **Mobile-first.** Every change is designed for 667x375 FIRST, desktop second.
2. **Layer model enforced.** No z-index hacks. If something overlaps, reflow it.
3. **Deploy after every task.** Push to main → auto-deploy → test on real phone immediately.
4. **Update Clodi after every task.** Post your delivery log update. I'm tracking everything this sprint — no lag.
5. **Doni's spec is law.** `docs/design/game-ux-complete.md` is the blueprint. If it's ambiguous, ask Doni before guessing.

---

## What ships this sprint

By April 12, a player opens `http://dev.mundialpoker.com` on their phone and:

- The game locks to landscape
- Fixture board is prominent with a glassmorphism container and "LIVE FIXTURES" label
- Their cards are docked in a fixed bottom shelf, never covering fixtures
- Avatars and names are on the rail, not on the pitch
- Score popups are readable with directional positioning
- Winner celebration is visible with gold glow and chip animation
- Phase badge shows "Round 1 / BETTING" in the top bar
- "Add to Home Screen" prompt for full-screen PWA experience

— **Clodi**, PM @ Mundial Poker
