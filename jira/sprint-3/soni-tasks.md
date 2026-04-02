# Soni — Sprint 3 Tasks

**Sprint:** April 3–10, 2026
**Role:** Senior Developer — Backend / Game Engine
**Total tasks:** 2

Read the [Sprint Brief](./SPRINT-BRIEF.md) first.

---

## S8 — Live Match API Research + Prototype

**Priority:** High (critical gap for June launch)
**Branch:** `feat/live-match-api-prototype`
**Deadline:** April 8

### Context

The entire live tournament mode depends on real World Cup fixture data. We need to pick a provider, understand their API, and build a prototype integration that can replace demo fixtures with real match data.

Currently `demo.service.ts` generates random fixtures with hardcoded teams and simulated scores. The live system needs: real fixture schedules, real-time score updates, and final results.

### Requirements

1. **Evaluate providers** — Research and compare:
   - **football-data.org** (free tier, 10 req/min)
   - **API-Football (rapidapi.com)** (free tier, 100 req/day)
   - **SportMonks** (paid, comprehensive)

   For each: pricing, rate limits, data freshness (how fast do live scores update?), World Cup 2026 coverage, API documentation quality.

2. **Pick one** — Recommend the best option for our needs. We need:
   - Pre-tournament: fixture schedule with teams, dates, stages
   - During matches: live score updates (goals, penalties) with <60s delay
   - Post-match: final results with full stats
   - World Cup 2026 specifically (not just leagues)

3. **Build a prototype service** — Create `apps/server/src/modules/match-data/live-match.service.ts`:

   ```typescript
   interface LiveMatchService {
     // Fetch today's World Cup fixtures
     getTodaysFixtures(): Promise<LiveFixture[]>

     // Get live score for a specific match
     getMatchScore(externalId: string): Promise<MatchScore>

     // Poll for score updates (called every 30-60s during active matches)
     pollActiveMatches(fixtureIds: string[]): Promise<MatchScore[]>
   }
   ```

4. **Map to our schema** — The external API's data format won't match our `fixtures` table. Build a mapper:
   - External team names → our `teams` table IDs (fuzzy match or mapping table)
   - External match status → our fixture statuses
   - External goals/penalties → our `homeGoals`, `awayGoals`, penalty fields

5. **Environment config** — API key in `.env`, not hardcoded:

   ```
   MATCH_API_PROVIDER=football-data  # or api-football
   MATCH_API_KEY=your-key-here
   ```

6. **Don't replace demo mode** — The prototype runs alongside `demo.service.ts`. A config flag or table setting determines which source to use. Demo mode must continue working for development and testing.

7. **Write a comparison doc** — Save your findings at `docs/live-match-api-research.md` with:
   - Provider comparison table
   - Recommendation with reasoning
   - API response examples
   - Rate limit strategy
   - Cost estimate for World Cup scale

### Files to create/modify

- `docs/live-match-api-research.md` — NEW: research findings
- `apps/server/src/modules/match-data/live-match.service.ts` — NEW: prototype service
- `apps/server/src/modules/match-data/api-mapper.ts` — NEW: external → internal data mapper
- `apps/server/.env` — API key config

### Deliverables

- [ ] Provider comparison doc with recommendation
- [ ] Prototype service that can fetch real fixtures from chosen API
- [ ] Data mapper from external format to our schema
- [ ] API key in .env (not hardcoded)
- [ ] Demo mode still works unchanged
- [ ] Rate limit strategy documented

### Out of scope

- Replacing demo mode in the game flow (Sprint 4)
- Building the full polling system for live matches
- Payment for API plans (use free tier for prototype)
- WebSocket push of live scores to clients (Sprint 4)

**Estimated effort:** 3-4 days

---

## S9 — Test Seed Endpoint for QA

**Priority:** Medium (unblocks Mark's test speed)
**Branch:** `feat/test-seed-endpoint`
**Deadline:** April 4

### Context

Mark's E2E tests spend 15-20s per test on setup: create table → add 4 bots → start game → wait for turn. A server-side seed endpoint would let tests start from a specific game phase, cutting suite runtime by 30-40%.

### Requirements

1. **Create endpoint** — `POST /api/test/seed-game` (only available in development/test env):

   ```typescript
   // Request
   {
     playerCount: number,        // 2-5 (human + bots)
     startingChips: number,
     smallBlind: number,
     bigBlind: number,
     phase: 'betting' | 'waiting' | 'showdown',  // what phase to start at
   }

   // Response
   {
     tableId: string,
     userId: string,              // the human player
     token: string,               // JWT for the human player
     players: Array<{ userId, username, seatIndex, isBot }>,
   }
   ```

2. **Phase setup:**
   - `'betting'` — creates table, adds bots, starts game, deals cards, reveals board. Returns with bet:prompt ready for the human.
   - `'waiting'` — same as betting, plus auto-completes all betting rounds. Returns during fixture resolution.
   - `'showdown'` — same as waiting, plus resolves all fixtures and starts scoring. Returns during player reveals.

3. **Security** — Only available when `NODE_ENV !== 'production'`. Return 404 in production.

4. **Cleanup** — Add `DELETE /api/test/cleanup` that drops all test-created tables (tables where name starts with `__test_`). Mark can call this in `afterAll`.

### Files to create/modify

- `apps/server/src/modules/test/test.controller.ts` — NEW: seed + cleanup endpoints
- `apps/server/src/modules/test/test.service.ts` — NEW: game seeding logic
- `apps/server/src/app.ts` — register test routes (dev/test only)

### Deliverables

- [ ] `POST /api/test/seed-game` creates a game at specified phase
- [ ] Returns token + tableId + player info for Playwright to use
- [ ] `DELETE /api/test/cleanup` removes test tables
- [ ] Only available in development/test environment
- [ ] Mark confirms it cuts setup time in E2E tests

### Out of scope

- Using this in production
- Seeding specific team cards (random is fine)
- Seeding specific fixture scores

**Estimated effort:** 1 day

---

## S10 — Extract phaseTracker from game.service.ts (Optional, if time allows)

**Priority:** Low (tech debt reduction, no feature impact)
**Branch:** `refactor/extract-phase-tracker`
**Deadline:** April 10 (only if S8 + S9 done early)

### Context

You flagged in your mid-term review that `game.service.ts` has 6 responsibilities and is approaching its limit. The `roundPhaseMap` tracking (added in SF-01b) is the cleanest candidate for extraction.

### Requirements

1. Extract `roundPhaseMap`, `setRoundPhase()`, `getRoundPhase()`, `clearRoundPhase()`, and the phase accumulation logic (resolvedFixtures, revealedPlayerScores) into `apps/server/src/modules/game/phase-tracker.ts`
2. `game.service.ts` calls `phaseTracker.setPhase()` at each transition point
3. `game.socket.ts` calls `phaseTracker.getState()` for reconnect payloads
4. All 42 existing tests still pass
5. No behavior changes — pure refactor

### Deliverables

- [ ] `phase-tracker.ts` extracted
- [ ] `game.service.ts` reduced by ~50-80 lines
- [ ] All tests pass, typecheck clean

**Estimated effort:** Half day
**Note:** Only do this if S8 and S9 are complete. Do NOT prioritize over the live API research.

---

## S11 — Deep Code Review of Joni's Next MR

**Priority:** High (team investment — Clodi's direct request)
**Deadline:** Within 24 hours of Joni's J13 or J14 PR

### Context

Joni is growing fast — she identified root causes across multiple bugs, built the entire showdown frontend, and ships at senior speed. But she flagged gaps in her mid-term review: TypeScript generics in the store, CSS animation authoring, and `as never` casts she copies without fully understanding.

This isn't a "find bugs" review. This is a **teaching review**. Your goal is to leave comments that make Joni a better engineer.

### Requirements

When Joni opens her next PR (likely J13 — the overlay polish, or J14 — the timer fix):

1. **Review every file she changed.** Not a skim — read it like you'd read your own code before shipping.

2. **Leave comments in these categories:**

   **TypeScript patterns:**
   - If she uses `as never`, `as unknown`, or type assertions — explain what the correct generic type would be and why
   - If store types use `Record<string, ...>` — explain when `Map` is better and vice versa
   - If she has `readonly` arrays/objects — confirm good practice and explain why (immutability, React rendering)

   **React patterns:**
   - If she has `useEffect` with dependencies — check if the deps are correct, explain common pitfalls
   - If she has inline styles vs CSS vars — explain when to use which and why
   - If she has conditional rendering — check for hook ordering issues (she already fixed one in J7, reinforce the pattern)

   **CSS/Animation:**
   - If she writes new keyframes — explain the timing function choices (`ease-out` vs `ease-in-out`, when to use `cubic-bezier`)
   - If she uses `transform` vs `top/left` — explain GPU acceleration and when it matters
   - If she has `transition` — explain what's animatable efficiently vs what causes reflow

   **Architecture:**
   - If she makes component structure decisions — comment on whether you'd split or combine, and why
   - If she wires socket events — confirm the event shape matches your server payload (this IS the contract review step)
   - If she resets store state — confirm the reset is atomic and complete

3. **Tone:** Respectful, educational, specific. Not "this is wrong" but "this works, and here's how to make it bulletproof" or "I'd do this differently because..." with the reasoning.

4. **At least 8-10 substantive comments.** Not nitpicks — real teaching moments.

5. **Post a summary** at the top of the PR: "Overall: [assessment]. Key things I'd highlight: [3 bullet points of the most important lessons]."

### Deliverables

- [ ] Full code review with 8-10+ teaching comments
- [ ] Summary at top of PR with 3 key learning points
- [ ] TypeScript type corrections where applicable
- [ ] At least one CSS/animation explanation
- [ ] At least one architecture comment

### Out of scope

- Blocking the PR on style preferences — approve unless there's an actual bug
- Rewriting her code — comment with suggestions, don't push your own commits

**Estimated effort:** 1-2 hours

---

## Delivery Log

_Update after completing each task._

### S8 — Live Match API Research

**Status:** Not started

### S9 — Test Seed Endpoint

**Status:** ✅ Done
**Design:** `POST /api/test/seed-game` creates a guest user, a `__test_<ts>` table, adds BOT*IDS bots, starts the game, and drives it to the requested phase. `DELETE /api/test/cleanup` deletes all `\_\_test*\*` tables (cascade removes players). Both routes return 404 in production (`NODE_ENV !== 'production'`guard in`app.ts`).
**Phase logic:**

- `betting` — `startRound()` returns; first bet:prompt is live
- `waiting` — drives all 3 betting rounds via `driveAllBetting()` loop; returns with fixture timers running
- `showdown` — same as waiting, then cancels fixture timers, resolves all fixtures immediately via `resolveFixturesImmediately()`, fires `resolveRound()` async, returns after 50ms (during player:scored reveals)
  **New export:** `cancelRoundTimers(roundId)` added to `game.service.ts` (needed for showdown phase).
  **42 tests green. Server typecheck clean.**
  **Files:** `apps/server/src/modules/test/test.service.ts` (NEW), `apps/server/src/modules/test/test.controller.ts` (NEW), `apps/server/src/app.ts`, `apps/server/src/modules/game/game.service.ts`

### BUG-S3-03 / BUG-S3-04 — Fixture Results During Betting (Full Fix)

**Status:** ✅ Fixed (second pass — root cause fully resolved)
**Root cause (first pass, incomplete):** My first fix guarded `resolveRound` against being called while betting statuses were active. This prevented the showdown overlay from firing mid-betting, but `fixture:result` socket events were STILL emitting during betting because `resolveDemoFixturesProgressive` was started immediately in `startRound` (before any betting round).
**Root cause (actual):** The demo fixture timer started on round:start, so `fixture:result` events fired at 5s/10s/15s/20s/25s during betting. The fix is not a guard — it's moving the timer start to AFTER betting completes.

**Fix — complete rewrite of the timing architecture (`game.service.ts`):**

1. **`roundFixtureDataCache`** (new Map) — stores `{ fixtureIds, fixtureRowMap, fixtureTeamMap }` keyed by roundId
2. **`startDemoFixtureTimer(roundId, tableId, io)`** (new function) — retrieves cached fixture data, starts `resolveDemoFixturesProgressive`, stores result in `activeTimers`
3. **`startRound`** — removed the direct `resolveDemoFixturesProgressive` call. Now caches fixture display data and starts betting round 1. Timer starts only later.
4. **`handleBetAction`** (round-3-complete branch) — calls `startDemoFixtureTimer` AFTER emitting `round:pause`. Fixture timer starts here, never before.
5. **`startBettingRound`** (1-player-left early-exit) — emits `round:pause` then calls `startDemoFixtureTimer` (same consistent path)
6. **`cancelRoundTimers`** — also clears `roundFixtureDataCache`
7. **`resolveRound`** cleanup — also clears `roundFixtureDataCache`

**Phase transition logs added** at every transition (per Clodi's request):

```
PHASE: betting-round-1-started | roundId | timestamp
PHASE: betting | bettingRound | promptedPlayer | timestamp
PHASE: betting-round-complete | bettingRound | roundId | timestamp
PHASE: waiting → round:pause emitted | bettingRound | roundId | timestamp
PHASE: fixture-timer-started | roundId | timestamp
PHASE: fixture:result | fixtureId | timestamp
PHASE: all-fixtures-resolved → resolveRound | roundId | timestamp
PHASE: resolve-round-start | roundId | status | timestamp
PHASE: scoring-complete | roundId | winners | timestamp
PHASE: winner | roundId | winnerIds | timestamp
```

**Correct sequence after fix:**
`round:start` → betting R1 → betting R2 → betting R3 → `round:pause` → fixture timer starts → `fixture:result` × 5 (at 5s intervals) → `resolveRound` → `player:scored` × N → `round:winner` → 7s → `round:start`

**43 tests green. Server typecheck clean.**

### Flow Audit Follow-Ups (from Mark's sprint-3/shared/flow-audit.md)

#### Item 2 — Desktop vs Mobile Create Table (BUG-S2-03)

**Status:** → Joni
**Findings:** Server response is viewport-agnostic. `POST /tables` returns `{ success: true, data: { table } }` with status 201 in both cases — no User-Agent checks, no conditional CORS headers (all CORS config is global in `app.ts`). No `table:state` or `table:join` socket event is emitted at creation — only a `lobby:tables` broadcast fires after the 201. The server is not the source of this bug. The client on desktop is not navigating to `data.table.id` after the 201 response. This is purely a frontend issue.

**CONTRACT: no server changes needed.** Tagging → Joni to investigate why `router.push('/table/:id')` (or equivalent) doesn't fire on desktop viewports after receiving the 201.

#### Item 3 — Server restart for Mark

**Note:** Mark's process on port 5174 predates the S9 merge — the test route `/api/test/seed-game` will 404. `tsx watch` does NOT hot-reload newly registered Express routes (routes are bound at startup). Mark must: `kill` old process → `pnpm dev:server` to pick up the S9 test routes.

#### Item 4 — Winner announcement timing

**Status:** ✅ Fixed
**Problem:** `round:winner` → `round:start` gap was 4s (NEXT_ROUND_DELAY_MS). Mark's audit noted the winner moment was invisible or too brief between Round 1 and Round 2.
**Fix:** Increased timing constants in `game.service.ts`:

- `WINNER_DISPLAY_DELAY_MS`: 2000 → 3000ms (more build-up before winner event fires)
- `NEXT_ROUND_DELAY_MS`: 4000 → 7000ms (winner banner stays visible for 7s before next round:start)
  **New sequence:** last `player:scored` → 3s → `round:winner` + `players:update` → 7s → `round:start`
  **Total celebration window:** ~10s from last reveal to new round. Was ~6s.
  **43 tests green. Server typecheck clean.**

### S10 — Phase Tracker Extraction

**Status:** Not started (optional)

### S11 — Code Review of Joni's MR (J13 Overlay Polish)

**Status:** ✅ Done
**Review filed:** `jira/sprint-3/shared/joni-j13-review.md`
**Verdict:** APPROVED
**10 substantive comments:**

1. `CardScoreData` inverted dependency (store importing from component) → move to `@wpc/shared`
2. `useCountUp` duplicated in 2 files → extract to `src/hooks/useCountUp.ts`; same for `getAvatarColor`
3. Dead `animateRef` in `TeamScoreSubCard` — set but never read → delete
4. `as never` casts in `useGameSocket.ts` + `PokerTable.tsx` — explained what they suppress and how to fix properly
5. `RoundResultsOverlay` inline styles for static layout → move to CSS class; `height: '100%'` redundant on `inset:0`
6. `card-flip ease-out` — explained why ease-out is correct for arriving elements
7. `fade-in-up` 30px travel distance too large for 11px rows → added `fade-in-up-sm` recommendation
8. `rowIdx++` mutation inside render → replaced with explicit named delay constants
9. Dead `mountedRef` in `PokerTable` — set but never read → remove until needed
10. **CONTRACT REVIEW:** All `player:scored`, `fixture:result`, `round:winner` payloads verified ✅. Pre-existing `blinds:posted` contract mismatch flagged for separate fix (my side).
    **Shared action items:** Soni to fix `as never` casts in reconnect replay + `blinds:posted` contract mismatch.
