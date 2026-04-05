# Mark — Sprint 6 Tasks

**Sprint:** April 5–12, 2026
**Role:** QA
**Total tasks:** 2

Test EVERY change on a REAL mobile phone (or 667x375 viewport) as it deploys. Update Clodi after EVERY test.

---

## M12 — Continuous Mobile QA (Ongoing)

**Priority:** Critical
**Ongoing throughout sprint**

### Requirements

Joni has 7 frontend tasks deploying throughout the sprint. Test EACH ONE on mobile (667x375) as it lands on EC2.

**For each Joni task that deploys, verify:**

| Joni Task                | What to Check                                                                           |
| ------------------------ | --------------------------------------------------------------------------------------- |
| J24 (fixture container)  | Glassmorphism visible? "LIVE FIXTURES" label? Fixtures readable? No overlap with seats? |
| J25 (dock player cards)  | Your cards in bottom shelf? Never on pitch? Chip count visible?                         |
| J26 (HUD on rail)        | Avatars on rail, not pitch? Pitch is clear? Badge priority working?                     |
| J27 (phase badge)        | "R1 · BETTING" visible? Color changes per phase?                                        |
| J28 (directional popups) | Top seats popup DOWN? Side seats popup INWARD? Readable at 100px?                       |
| J29 (PWA)                | Add to Home Screen works? Full-screen landscape? No address bar?                        |
| J30 (YOU label + timer)  | YOU label on seat 0? Single timer (no bar + ring)?                                      |

**For EVERY check:**

- Screenshot at 667x375
- Save to `assets/screenshots/sprint6/m-J{N}-{description}.png`
- PASS or FAIL with one-line note
- If FAIL: file bug immediately, tag Joni

**The layer model check (apply to every screenshot):**

- Is the pitch clear? (only fixtures + pot)
- Are avatars/names on the rail?
- Do cards dock in the bottom shelf?
- Does anything overlap anything else?

### Deliverables

- [ ] Every Joni task tested on mobile within hours of deploy
- [ ] Screenshots for each
- [ ] Layer model verified in every screenshot
- [ ] Bugs filed immediately if FAIL

---

## M13 — End-of-Sprint Mobile Flow Audit

**Priority:** High
**Deadline:** April 11

### Requirements

After ALL Joni tasks are deployed, run the full flow audit on mobile:

1. Open `http://52.49.249.190` (or domain if D6 done) on 667x375
2. Play 3 full rounds
3. Screenshot every phase (same naming as flow-audit-v2 but `sprint6-` prefix)
4. Compare against the playtest screenshots from this session — what improved?

**Specific things to verify in the final audit:**

- [ ] Fixture board prominent with container + label
- [ ] Player cards in bottom dock, never on pitch
- [ ] HUD on rail, pitch is sacred
- [ ] Phase badge visible and color-coded
- [ ] Score popups readable and directional
- [ ] Winner celebration visible on mobile
- [ ] PWA full-screen works (if available)
- [ ] YOU label visible on your seat
- [ ] Single timer (no duplication)
- [ ] No element overlaps another element
- [ ] A first-time player would understand what they're looking at

Save report at: `jira/sprint-6/shared/mobile-audit-final.md`

### Deliverables

- [ ] Full flow audit on mobile with screenshots
- [ ] Comparison with pre-sprint playtest
- [ ] Layer model compliance check
- [ ] VERDICT: Ready for beta testers? YES/NO

---

## Delivery Log

| Task | Status  |
| ---- | ------- |
| M12  | ongoing |
| M13  | ⬜      |
