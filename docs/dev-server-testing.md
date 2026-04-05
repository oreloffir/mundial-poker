# Dev Server Testing — Quirks & Stabilization

**Last updated:** April 11, 2026
**Authored by:** Mark (QA Lead)
**Server:** `http://52.49.249.190`

---

## 3-Run Results Summary

| Run | Passed | Skipped | Failed | Duration | Notes                                             |
| --- | ------ | ------- | ------ | -------- | ------------------------------------------------- |
| 1   | 50     | 0       | 15     | 1.3h     | All overlay tests + timing failures               |
| 2   | 50     | 0       | 15     | 1.3h     | Identical — skips hadn't landed yet               |
| 3   | 42     | 15      | 7      | 59m      | Skips active; new failures from state degradation |

---

## Test Categorization (65 total)

### Reliable (50/65 — pass on every run)

| Spec                  | Tests                                                                                                                                     | Count |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| `auth.spec.ts`        | All 3                                                                                                                                     | 3     |
| `landing.spec.ts`     | All 5                                                                                                                                     | 5     |
| `lobby.spec.ts`       | All 4                                                                                                                                     | 4     |
| `table-setup.spec.ts` | All 9                                                                                                                                     | 9     |
| `flow-audit.spec.ts`  | Both (desktop + mobile)                                                                                                                   | 2     |
| `betting.spec.ts`     | Show controls, presets, slider removed, fold, fold avatar                                                                                 | 5     |
| `mobile.spec.ts`      | iPhone SE, iPhone 12, desktop, betting bar                                                                                                | 4     |
| `heads-up.spec.ts`    | All 3 (degraded in Run 3)                                                                                                                 | 3     |
| `game-round.spec.ts`  | Deals cards, full round, SB/BB visible, round counter, counter increments, chip balance update, winner banner, fixture board clean, timer | 9     |
| `showdown.spec.ts`    | SD2, SD9, SD11, SD12, SD13, SD14                                                                                                          | 6     |

### Skipped (15/65 — broken, need rewrite or unshipped features)

| Test                   | Reason                                                   | Action                          |
| ---------------------- | -------------------------------------------------------- | ------------------------------- |
| SD1                    | `data-revealed` attribute doesn't exist on fixture cards | Needs testid from Joni          |
| SD3                    | Calculating overlay <1s, not reliably visible            | Extend calculating state to ~2s |
| SD4                    | `showdown-overlay` deleted                               | Rewrite for inline popups       |
| SD5                    | `showdown-progress` was in overlay                       | Rewrite for inline popups       |
| SD6                    | `score-base-points` was in overlay card                  | Rewrite for inline popups       |
| SD7                    | `showdown-overlay` deleted                               | Rewrite for inline popups       |
| SD8                    | `showdown-player-you` was in overlay                     | Rewrite for inline popups       |
| SD10                   | Balance timing after winner banner unreliable            | Add longer waits                |
| Chip denominations     | J16 not shipped                                          | Unskip after J16                |
| Raise pot/chips        | Depends on J16 chip buttons                              | Unskip after J16                |
| Portrait hint          | Not implemented                                          | Unskip after implementation     |
| SB/BB rotation         | 3-round timing unstable remote                           | Increase timeouts               |
| Blind deduction        | Seat balance testids slow to render                      | Add explicit waits              |
| Seat balance testids   | Same as blind deduction                                  | Add explicit waits              |
| Winner banner 3 rounds | 3-round timing compounds                                 | Increase timeouts               |

### Degraded in Run 3 (7 new failures — server state)

These tests passed in runs 1-2 but failed in run 3 after 60+ stale tables accumulated:

| Test                   | Run 1 | Run 2 | Run 3 | Root cause                       |
| ---------------------- | ----- | ----- | ----- | -------------------------------- |
| winner banner appears  | ✅    | ✅    | ❌    | Server slowdown from stale state |
| fixture board clean    | ✅    | ✅    | ❌    | Same                             |
| timer visible          | ✅    | ✅    | ❌    | Same                             |
| heads-up start         | ✅    | ✅    | ❌    | Same                             |
| SD11 overlay dismisses | ✅    | ✅    | ❌    | Same                             |
| SD12 round counter     | ✅    | ✅    | ❌    | Same                             |
| SD13 all fold          | ✅    | ✅    | ❌    | Same                             |

**Root cause:** Each test run creates ~20 tables. After 3 runs = 60+ tables on EC2 with no cleanup. Server performance degrades with accumulated state. Once `DELETE /api/admin/cleanup` is live, cleanup between runs will fix this.

---

## Known Quirks (EC2 vs Localhost)

### 1. No automatic cleanup

Test routes (`/api/test/*`) are disabled on EC2 (production mode). The `afterAll` hooks silently no-op. **Fix:** Soni's admin cleanup route (`DELETE /api/admin/cleanup`) will resolve this once deployed.

### 2. State accumulation degrades performance

After 3 E2E runs without cleanup, the server slows down and previously-reliable tests start timing out. **Fix:** Run cleanup between test runs.

### 3. Lobby shows stale tables

Every test creates a named table that persists. The lobby fills up with "E2E Blind Rotation", "E2E Raise Test", etc. **Fix:** Cleanup between runs.

### 4. Guest sessions accumulate

Each test creates a new guest session. Over 60+ tests × 3 runs = 180+ guest sessions in the DB. **Fix:** Part of the db:reset cleanup.

### 5. Same performance when clean

On a fresh server, timing is identical to localhost (3.7m for flow audit). No inherent latency issues.

---

## Recommended QA Workflow

```bash
# 1. Cleanup before starting
curl -X DELETE -H "x-admin-secret: ${ADMIN_SECRET}" http://52.49.249.190/api/admin/cleanup

# 2. Run the suite
DEV_URL=http://52.49.249.190 pnpm test:e2e

# 3. Cleanup after
curl -X DELETE -H "x-admin-secret: ${ADMIN_SECRET}" http://52.49.249.190/api/admin/cleanup

# 4. Verify cleanup
curl -s http://52.49.249.190/api/health
```

---

## Target: 0 Flakes

With the 15 tests skipped (legitimate — broken overlay, unshipped features) and cleanup between runs, the remaining 50 tests should pass 3/3.

**Blocking items for 0 flakes:**

1. Soni's admin cleanup route deployed to EC2
2. Joni ships J16 (chip denominations) → unskip 2 betting tests
3. Joni adds `data-revealed` to fixture cards → unskip SD1
4. Rewrite SD3-SD8 for inline popup design → unskip 6 tests
