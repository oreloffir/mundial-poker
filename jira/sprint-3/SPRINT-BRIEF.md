# Mundial Poker — Sprint 3 Brief

**Sprint:** April 3–10, 2026
**Sprint Goal:** Close the polish cycle, fix the test suite, and lay the groundwork for live match integration. The game should feel "demo-ready" by the end of this sprint — something we'd be proud to put in front of beta testers.

---

## Hey team, Clodi here

Two sprints shipped. The game works end-to-end: blinds, betting, progressive showdown reveals with score breakdowns, reconnect recovery, real-time lobby. That's a solid foundation.

Sprint 3 is about **hardening and polish**. No big new features this sprint. Instead:

1. **Close the showdown polish** — restore full-screen overlay per Doni's spec, apply all 9 fixes
2. **Fix the test suite** — Mark's betting tests are broken by the timer intercept bug
3. **Unblock mobile E2E** — 4 skipped tests need to run
4. **Live API research** — Soni investigates match data providers, builds a prototype integration
5. **Bet-timer layout bug** — timer div intercepts chip button clicks

### Your task files

| Developer | File                                                                    |
| --------- | ----------------------------------------------------------------------- |
| **Soni**  | [`soni-tasks.md`](./soni-tasks.md)                                      |
| **Joni**  | [`joni-tasks.md`](./joni-tasks.md)                                      |
| **Mark**  | [`mark-tasks.md`](./mark-tasks.md)                                      |
| **Doni**  | Design review in `jira/sprint-2/shared/showdown-polish.md` (carry-over) |
| **Devsi** | [`devsi-tasks.md`](./devsi-tasks.md)                                    |

### Shared tickets (cross-team)

- `jira/sprint-2/shared/showdown-polish.md` — Doni + Joni showdown overlay fixes
- `jira/sprint-2/shared/soni-fixes.md` — completed, reference only

---

## Process Changes This Sprint (from mid-term reviews)

1. **Socket Event Contract Step** — Before Soni merges any socket payload change: he writes the shape in his delivery log tagged `CONTRACT:`, Joni confirms her types match, then he merges. No more type mismatches.

2. **Authority Chain** — Doni's design specs are authoritative for visual/UX. Orel's direct instructions can override but must explicitly say "override Doni." If Joni gets conflicting instructions, she flags it in the shared ticket before executing.

3. **Proactive Test Planning** — Mark writes test scenarios BEFORE dev work starts. Soni writes server-side coverage against Mark's scenarios. Testing in sequence, not just parallel.

4. **Testid Requests** — Mark includes file path + selector hint (not just element description). Joni picks them up faster.

---

## Sprint scope

### Soni (Backend)

- **S8** — Live match API research + prototype (football-data.org or API-Football)
- **S9** — Test seed endpoint for Mark (`/api/test/seed-game` creates a table mid-round)
- **S10** — (Optional) Extract phaseTracker from game.service.ts

### Joni (Frontend)

- **J13** — Restore full-screen overlay + apply Doni's 9 polish fixes
- **J14** — Fix bet-timer intercepting chip button clicks (Mark's blocker)
- **J15** — Wire `opponentTeam` data on score sub-cards

### Mark (QA)

- **M5** — Fix betting test suite (after J14 lands)
- **M6** — Unskip mobile tests, selector audit + testid requests
- **M7** — Showdown flow E2E tests (after J13 lands)

### Devsi (DevOps)

- **D1** — Infrastructure plan for June launch (answers Soni's questions about Redis, scaling, deployment)

---

## Dependency chart

```
SONI                           JONI                          MARK
────                           ────                          ────

S9: Test seed endpoint         J14: Fix bet-timer z-index    (blocked on J14)
    (day 1-2)                      (day 1)                       │
    │                              │                             ▼
    │                          J13: Restore full-screen       M5: Fix betting tests
    │                              overlay + 9 fixes              (day 2-3)
    │                              (day 1-4)                     │
S8: Live API research              │                          M6: Mobile tests +
    (day 2-6)                  J15: Wire opponentTeam             selector audit
                                   (day 2, small)                (day 3-4)
    │                              │                             │
    └──────────────────────────────┼─────────────────────────>M7: Showdown E2E
                                   │                              (day 5-6)
                               S9 ready ──────────────────────> Mark uses seed endpoint
```

---

## Definition of done

Same as Sprint 2:

- [ ] Code reviewed
- [ ] Tests for new logic (80%+)
- [ ] `pnpm typecheck` clean
- [ ] No console.log
- [ ] Manual QA: 3+ rounds
- [ ] PR merged, CI green

---

## End-of-sprint target

Play a full 5-round game and verify:

1. Full-screen showdown overlay renders correctly (no table bleed, centered cards, visible bottom strip)
2. Score breakdowns show team flags + "vs opponent" + color-coded bonuses
3. Betting chip buttons are clickable (no timer intercept)
4. All Playwright tests pass (0 skipped, 0 flaky)
5. Page refresh mid-round reconstructs correct state
6. Lobby updates in real-time (no polling)

**Demo-ready by April 10.**

— **Clodi**, PM @ Mundial Poker
