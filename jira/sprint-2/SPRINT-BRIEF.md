# Mundial Poker — Sprint 2 Brief

**Sprint:** April 2–9, 2026
**Sprint Goal:** Transform the showdown phase from a data dump into a cinematic reveal experience — the defining moment of Mundial Poker.

---

## Hey team, Clodi here

Sprint 1 shipped in one day. Incredible. Now we build on that.

The game works end-to-end: blinds, betting, scoring, winner. But the most important moment — when match results come in and scores are revealed — is flat. Numbers appear, a banner says "X wins", next round starts. No drama, no storytelling, no "holy shit Brazil just scored 3-0 and I have them!"

Sprint 2 fixes that. We're restructuring the entire post-betting flow to create a progressive, dramatic reveal sequence. This is the feature that makes Mundial Poker feel different from every other poker game.

### Your task files

| Developer | File | Focus |
|-----------|------|-------|
| **Soni** | [`soni-tasks.md`](./soni-tasks.md) | S5: timeout fix, S6: showdown event restructure, S7: integration tests |
| **Joni** | [`joni-tasks.md`](./joni-tasks.md) | J10: BB read-only fix, J11: testids + TS, J12: showdown frontend experience |
| **Mark** | [`mark-qa.md`](./mark-qa.md) | E2E suite formalization + Sprint 2 QA |
| **Doni** | Separate prompt | UX design for showdown flow (all 5 phases) |

### How to reach me

Same as Sprint 1 — through Orel, PR comments, or update your task file. If something is unclear, ask before building.

---

## Why this sprint matters

The showdown is where poker meets football. It's the moment where holding Brazil means something because Brazil just won 3-0 with a clean sheet. The player needs to SEE that story unfold:

1. Matches reveal one by one (not all at once)
2. Each player's cards flip and scores break down visually
3. The winner is announced last for maximum suspense

If this phase feels amazing, the whole game feels amazing. If it's flat, the game is just another poker app with a football skin.

---

## Sprint scope

### Backend (Soni)
- **S5** — Fix timeout timing (30s bug from Sprint 1)
- **S6** — Restructure showdown event flow: progressive fixture reveals, per-player scoring events with enriched data, proper winner event
- **S7** — Server integration tests (13 tests for game engine)

### Frontend (Joni)
- **J10** — BB field read-only fix (Sprint 1 carry-over)
- **J11** — TestIDs + TypeScript error fixes
- **J12** — Showdown frontend experience: consume S6's new events, build the visual reveal sequence with score breakdowns

### Design (Doni)
- UX mockups for the 5 showdown phases (matches in progress → fixture reveals → score calculation → player reveals → winner announcement)
- Score breakdown card design (the hero element)

### QA (Mark)
- Formalize Playwright E2E suite into the repo
- QA the new showdown flow once it lands

---

## Dependency chart

```
DONI (Design)                    SONI (Backend)                    JONI (Frontend)
─────────────                    ──────────────                    ────────────────

Showdown UX mockups ─────┐       S5: Fix timeout (day 1)          J10: BB read-only (day 1)
    (day 1-3)            │           │                             J11: testids + TS (day 1)
                         │       S6: Showdown event restructure
                         │           (day 1-4)
                         │           │
                         └───────────┼──────────────────────────> J12: Showdown frontend
                                     │                                (day 4-7)
                                     │                                (needs S6 events + Doni mockups)
                                 S7: Integration tests
                                     (day 5-7)
```

**Key dependency:** Joni's J12 needs BOTH Soni's S6 (new events) AND Doni's UX direction. Joni works on J10 + J11 first, then starts J12 once both are available. If Doni is late, Joni can start J12 with a sensible default layout and refine when mockups arrive.

---

## Suggested daily schedule

| Day | Soni | Joni | Doni | Mark |
|-----|------|------|------|------|
| Apr 2 | S5: timeout fix | J10: BB read-only + J11: testids | Showdown UX research | E2E suite setup |
| Apr 3 | S6: progressive fixtures | J10/J11 wrap up | Showdown phase mockups | E2E test conversion |
| Apr 4 | S6: per-player scoring | Start J12 scaffold | Score breakdown card | E2E test conversion |
| Apr 5 | S6: winner event + cleanup | J12: fixture reveal UI | Mockup review with Clodi | Sprint 2 QA plan |
| Apr 6 | S6 wrap up | J12: player score reveal | Iterate on feedback | — |
| Apr 7 | S7: integration tests | J12: winner + transitions | — | Batch testing |
| Apr 8 | S7 continued | J12: polish + mobile | — | Integration test |
| Apr 9 | Sprint review | Sprint review | Sprint review | Sprint review |

---

## Definition of done (per task)

- [ ] Code reviewed by another developer
- [ ] Unit tests for new logic (80%+ on new code)
- [ ] No TypeScript errors (`pnpm typecheck` passes)
- [ ] No `console.log` statements
- [ ] Manual QA: play 3+ rounds with the feature active
- [ ] Branch merged via PR
- [ ] CI green

---

## End-of-sprint verification

Play a full 5-round game and verify:

1. Timeout fires at ~30s (not 40-45s)
2. BB field is read-only in Create Table modal
3. After betting ends, fixtures reveal one at a time (~5s apart)
4. Each fixture card updates with scores as its match finishes
5. "Calculating scores..." transition visible after all fixtures
6. Player hands reveal one at a time, lowest score first
7. Score breakdown visible per card (base + bonuses = total)
8. Winner announced last with correct pot share
9. Winner banner + chip animation
10. Clean transition to next round (no stale data)

— **Clodi**, PM @ Mundial Poker
