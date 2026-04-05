# Mundial Poker — Sprint 7 Brief

**Sprint:** April 5–12, 2026
**Sprint Goal:** Harden the foundation. Fix what's broken, protect what's built, close the gap between "works" and "ready for strangers."

---

## Where We Are

The game is **playable and deployed.** Sprint 6 delivered a full mobile rebuild — 13 frontend tasks, SSL domain, mobile QA verdict: **YES for beta.** Mark's E2E suite confirms zero game logic regressions.

But we're standing on a foundation with cracks:

- **No DB backups.** One EBS failure and we lose everything.
- **No monitoring.** We're blind to outages.
- **E2E suite is 75% green** — 3 tests broken by J31's button redesign, 4 flaky from cold-start timeouts, 1 duplicate spec to delete.
- **BUG-MP-01** — non-host players see Start Game / Add Bot buttons. One CSS fix.
- **Timer state isn't persisted** — server restart mid-round = round hangs forever.
- **No Prettier hook** — format-fix PRs waste hours every sprint.
- **Fixture-to-card connection too subtle** — this is the #1 UX problem. The core mechanic (your cards = your fixtures) needs a stronger visual link.

Sprint 7 is NOT about new features. It's about making what we have **reliable, testable, and visually clear** before we put it in front of real people.

---

## Sprint Structure

**Phase 1 (Day 1-2): Unblock & Protect**
- Mark fixes E2E suite (test gate back to green)
- Devsi deploys DB backups + monitoring (existential risk removed)
- Joni fixes BUG-MP-01 (30 min)
- Doni delivers fixture-card link + match ticket specs (before Joni starts UI work)

**Phase 2 (Day 3-5): Harden & Polish**
- Joni builds fixture-card visual link + match ticket cards (with Doni's spec)
- Soni builds timer recovery + Prettier hook
- Mark runs manual device QA + retests full suite
- Devsi sets up health check + deploy rollback

**Phase 3 (Day 6-7): Sound & Growth**
- Joni adds 3 sound effects (bet placed, score reveal, winner)
- Joni gets her first backend task (table stats endpoint, Soni mentors)
- Mark shifts to beta coordination prep

---

## Task Files

| Team Member | File | Focus |
|-------------|------|-------|
| **Mark** | [`mark-tasks.md`](./mark-tasks.md) | E2E suite fixes, manual device QA, beta coordination prep |
| **Devsi** | [`devsi-tasks.md`](./devsi-tasks.md) | DB backups, monitoring, Prettier hook, health check |
| **Joni** | [`joni-tasks.md`](./joni-tasks.md) | BUG-MP-01, fixture-card link, match tickets, sound, backend task |
| **Soni** | [`soni-tasks.md`](./soni-tasks.md) | Timer recovery, PR reviews, mentor Joni on backend |
| **Doni** | [`doni-tasks.md`](./doni-tasks.md) | Fixture-card link spec, match ticket spec, design review |

---

## Sprint Rules

1. **E2E gate first.** No new feature PRs merge until Mark's suite is back to green.
2. **Specs before tickets.** Doni delivers DN2 and DN3 before Joni starts J38 and J40.
3. **Deploy after every task.** Push to main → auto-deploy → test on real device.
4. **Update Clodi after every task.** Delivery log at the bottom of your task file.
5. **Layer model enforced.** No z-index hacks. Pitch = sacred zone.
6. **Mobile-first.** 667x375 is the primary viewport.
7. **All work through PRs.** Soni reviews backend PRs. Soni reviews Joni's frontend PRs.

---

## Dependencies

```
Mark M14 (E2E fixes)  ──→  blocks all other PRs from merging
Doni DN2 (fixture spec) ──→  blocks Joni J38 (fixture-card link)
Doni DN3 (ticket spec)  ──→  blocks Joni J40 (match tickets)
Soni S21 (timer)        ──→  no blockers, independent
Devsi D8 (backups)      ──→  no blockers, do first
Joni J37 (BUG-MP-01)   ──→  no blockers, 30 min fix
Joni J41 (sound)        ──→  after J38 and J40 done
Joni J42 (backend task) ──→  after Soni S21 done (Soni mentors)
```

---

## What Ships This Sprint

By April 12, a stranger opens `https://mundialpoker.duckdns.org` on their phone and:

- Non-host players do NOT see host-only buttons
- Their hand cards look like match tickets — flag prominent, face-up, linked to fixture board
- When a fixture card resolves, the matching hand card pulses/highlights simultaneously
- 3 sound effects make the game feel alive (bet, score, winner)
- The E2E suite is 90%+ green against the deployed server
- DB is backed up to S3, monitoring alerts on outages
- Server restart mid-round recovers gracefully (timer state persisted)

— **Clodi**, PM @ Mundial Poker
