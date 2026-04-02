# Mundial Poker — Sprint 1 Brief

**Sprint:** April 1–8, 2026
**Sprint Goal:** Ship proper blind mechanics and fix the top UX bugs before our next playtest.

---

## Hey team, Clodi here

I'm **Clodi**, the Project Manager for Mundial Poker. I work directly with Orel (CTO) to plan sprints, break down tasks, and make sure we ship on time for the World Cup in June.

This is our first structured sprint. I've written detailed task briefs for each of you — everything you need to work independently is in the files below. If something is unclear, **don't guess — ask me.** I'd rather spend 5 minutes clarifying than lose a day going in the wrong direction.

### Your task files

| Developer             | File                               | Task Count |
| --------------------- | ---------------------------------- | ---------- |
| **Soni** (Senior Dev) | [`soni-tasks.md`](./soni-tasks.md) | 4 tasks    |
| **Joni** (Junior Dev) | [`joni-tasks.md`](./joni-tasks.md) | 6 tasks    |

### How to reach me

If you have **any** lack of certainty — about scope, priority, technical approach, or whether something is in/out of scope — talk to me before spending time on it. You can reach me through:

- **Orel** — he relays to me directly, fastest path
- **PR comments** — tag me in your pull request if you need a decision
- **This folder** — I'll update these docs if scope changes mid-sprint

Golden rule: **if your task brief says "out of scope" — it's out of scope.** Don't expand. Ship what's written, move to the next task.

---

## Why this sprint matters

The #1 gameplay-breaking issue right now is **there are no forced bets**. Without blinds, every round devolves into everyone checking through — no pressure, no bluffing, no real poker. This sprint fixes that.

On the UI side, we have bugs that make the game feel unpolished: winner banners bleeding into the next round, stale cards flashing, chip balances you can't read. These are the things playtesters notice first.

---

## Sprint scope

### Backend (Soni)

- **Blind system** — SB/BB position assignment, forced bet collection, proper betting order
- **Timeout enforcement** — server-side 30s auto-fold so no player can freeze the game
- **Bot awareness** — bots work correctly with the new blind system

### Frontend (Joni)

- **Bug fixes** — winner banner timing, round counter sync, stale cards cleanup
- **UI polish** — chip balance readability (gold on dark pill)
- **New features** — blind position badges (SB/BB), blind config in table creation modal

---

## Dependency chart

```
SONI (Backend)                              JONI (Frontend)
──────────────                              ────────────────

S1: Blind Position & Collection ─────┐      J1: Winner Banner Timing     (day 1)
    (day 1-2)                        │      J2: Round Counter Sync       (day 2)
    │                                │      J3: Balance Readability      (day 2)
    v                                │      J5: Stale Cards Cleanup      (day 3)
S2: Betting Order Fix                │      J6: CreateTableModal Blinds  (day 3)
    (day 3-4)                        │
    │                                └───>  J4: Blind Position Badges    (day 4-5)
    v                                       (BLOCKED by S1 — stub with mock til merged)
S3: Server-Side Bet Timeout
    (day 5-6)
    │
    v
S4: Blind-Aware Bot Logic
    (day 2, small — alongside S1)
```

**Key dependency:** Joni's J4 (Blind Position Badges) is blocked by Soni's S1. Joni should start J4 with hardcoded mock data on day 3-4, then swap to real socket data once S1 is merged. All other Joni tasks are fully independent from day 1.

---

## Suggested daily schedule

| Day       | Soni                                   | Joni                                                  |
| --------- | -------------------------------------- | ----------------------------------------------------- |
| Wed Apr 1 | S1: Blind positions & collection       | J1: Winner banner timing fix                          |
| Thu Apr 2 | S1 continued + S4: bot blind awareness | J2: Round counter sync + J3: Balance readability      |
| Fri Apr 3 | S2: Betting order fix                  | J5: Stale cards cleanup + J6: CreateTableModal blinds |
| Sat Apr 4 | S2 continued + code review             | J4: Blind badges (stub with mock data)                |
| Sun Apr 5 | S3: Server-side bet timeout            | J4: Integrate with real S1 data                       |
| Mon Apr 6 | S3 continued + integration testing     | Bug bash, polish, cross-testing                       |
| Tue Apr 7 | Final fixes, merge conflicts, QA       | Final fixes, merge conflicts, QA                      |
| Wed Apr 8 | Sprint review & demo                   | Sprint review & demo                                  |

---

## Definition of done (per task)

- [ ] Code reviewed by the other developer
- [ ] Unit tests passing (80%+ coverage on new code)
- [ ] No TypeScript errors (`pnpm typecheck` passes)
- [ ] No `console.log` statements in committed code
- [ ] Manual QA: play through at least 3 full rounds with the feature active
- [ ] Branch merged to main via PR
- [ ] CI pipeline green (lint + typecheck + test + build)

---

## End-of-sprint verification

After all tasks are merged, we do a full QA session — 5+ rounds with 2 players + 3 bots:

1. SB/BB badges appear on correct seats and rotate each round
2. Blind deductions show in chip stacks immediately
3. Betting starts at UTG (pre-flop) and SB (post-flop)
4. BB gets "option" when no one raises
5. 30s timeout auto-folds inactive player
6. Winner banner dismisses before next round
7. No stale cards between rounds
8. Round counter updates immediately
9. Chip balance is readable (gold on dark pill)
10. CreateTableModal sends blind values

Let's ship it.

— **Clodi**, PM @ Mundial Poker
