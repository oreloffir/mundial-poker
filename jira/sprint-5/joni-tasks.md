# Sprint 5 — Joni Tasks (Cleanup Sprint)

Rule: every PR removes more lines than it adds. Make it simpler.

---

## J20 — Delete Dead Components (day 1)

Find every component not imported anywhere and DELETE it.
Known suspects: ShowdownOverlay, WaitingOverlay, BoardCards,
PlayerHand, FoldedPlayerStrip, WinnerAnnouncement, CalculatingOverlay,
FixtureRevealCard.
Also audit: gameStore unused actions, useGameSocket deprecated event
handlers (round:results, round:showdown), index.css orphaned keyframes.
Rule: if typecheck passes after deletion → it was dead.

**Status:** ⬜ TODO

---

## J21 — Extract Duplicated Utilities (day 2)

Consolidate:

- useCountUp (exists in 2 files → one hook in hooks/)
- getAvatarColor (duplicated → one util in utils/)
- formatChips (extract if used in multiple files)
- hexToRgba (move to utils/ if reusable across components)

One copy, one import path, no duplicates.

**Status:** ⬜ TODO

---

## J22 — Fix Frontend Type Casts + Dead Refs (day 3)

WAIT for Soni's S15 to merge first.
Then:

- Remove all `as never` / `as unknown` from frontend
- Delete dead refs: animateRef in TeamScoreSubCard, mountedRef in PokerTable
- Replace rowIdx++ mutation in render with named delay constants
- Remove handlers for deprecated events

**Status:** ⬜ TODO (blocked: Soni S15)

---

## J23 — Frontend Architecture Documentation (day 4)

Create apps/web/README.md with:

- Component tree diagram
- State management overview
- Socket events consumed
- CSS architecture
- Key patterns

Add inline comments to 3 most complex files:

- useGameSocket.ts
- gameStore.ts
- PokerTable.tsx

Don't over-comment simple files.

**Status:** ⬜ TODO

---

## Delivery Log

| Task | Branch                 | PR  | Status            |
| ---- | ---------------------- | --- | ----------------- |
| J20  | feat/dead-code-cleanup | —   | ⬜ TODO           |
| J21  | feat/extract-utils     | —   | ⬜ TODO           |
| J22  | fix/type-casts         | —   | ⬜ TODO (blocked) |
| J23  | docs/frontend-arch     | —   | ⬜ TODO           |
