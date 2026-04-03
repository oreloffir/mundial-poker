# Architecture

## Game Flow

```
Player creates table → joins → adds bots → starts game
  │
  ▼
round:start (cards dealt, blinds posted)
  │
  ▼
Betting Round 1 ──→ bet:prompt → bet:action → bet:update
  │                   (30s timeout per player, auto-fold/check)
  ▼
Betting Round 2 ──→ same cycle
  │
  ▼
Betting Round 3 ──→ same cycle
  │
  ▼
round:pause (WAITING_FOR_RESULTS)
  │
  ▼
fixture:result × 5 (progressive reveal, 5s intervals)
  │
  ▼
round:scoring → player:scored × N (2.5s intervals, lowest first)
  │
  ▼
round:winner (3s display) → 7s delay → next round:start
```

If all players fold except one, the round ends immediately with pot awarded to the last player standing.

## Socket Events

### Server → Client

| Event | Payload | When |
|-------|---------|------|
| `lobby:tables` | `{ tables: LobbyTableItem[] }` | Table created/updated/deleted |
| `table:state` | `GameState` | Player joins table (full state sync) |
| `round:start` | `RoundStartPayload` | New round begins (per-player, includes cards) |
| `board:reveal` | `TeamCard[]` | Fixture board shown |
| `blinds:posted` | `{ sbUserId, sbAmount, bbUserId, bbAmount, pot }` | Blinds deducted |
| `bet:prompt` | `BetPromptPayload` | Player's turn to bet |
| `bet:update` | `BetUpdatePayload` | Bet action resolved |
| `round:pause` | `RoundPausePayload` | Betting complete, waiting for fixtures |
| `fixture:result` | `FixtureResultPayload` | Single fixture score revealed |
| `round:scoring` | `{ roundId }` | Scoring phase started |
| `player:scored` | `PlayerScoredPayload` | Single player's score revealed |
| `round:winner` | `RoundWinnerPayload` | Winner announced with pot distribution |
| `players:update` | `{ userId, chips }[]` | Chip balances synced |
| `player:joined` | `TablePlayer` | Player connected to table |
| `player:left` | `{ userId }` | Player left table |
| `player:disconnected` | `{ userId }` | Player disconnected |
| `player:eliminated` | `{ userId, finalChips }` | Player out of chips |
| `game:over` | `{ winnerId, finalStandings }` | Game complete |

### Client → Server

| Event | Payload | Response |
|-------|---------|----------|
| `table:join` | `{ tableId }` | `{ success, error? }` |
| `table:leave` | `{ tableId }` | — |
| `bet:action` | `{ action, amount }` | `{ success, error? }` |
| `round:ready` | `{ roundId }` | — |

## State Management

### Redis Keys (2h TTL)

| Key Pattern | Value | Used By |
|-------------|-------|---------|
| `betting:{roundId}` | `BettingState` JSON | `betting.service.ts` |
| `blinds:{roundId}` | `RoundBlindInfo` JSON | `game.service.ts` |
| `phase:{tableId}` | `RoundPhaseState` JSON | `phase-tracker.ts` |
| `fixture-data:{roundId}` | `SerializableFixtureData` JSON | `game.service.ts` |

All keys auto-expire after 2 hours. If Redis is unavailable, the server falls back to in-memory Maps with a warning.

### In-Memory Only (not persisted)

| Map | Purpose |
|-----|---------|
| `activeTimers` | Demo fixture reveal timer abort controllers |
| `betTimers` | 30-second bet timeout IDs |

These are timer references that can't be serialized. On server restart, active timers are lost — games in the fixture reveal or betting timeout phase will need to be restarted.

## Database Schema

```
users
  id (uuid PK), email, username, password_hash, avatar_url
  total_chips_won, games_played, games_won, created_at, updated_at

teams
  id (varchar PK, e.g. "ARG"), name, confederation, wc_group
  flag_emoji, fifa_ranking, tier (S/A/B/C)

tables
  id (uuid PK), name, host_id → users, status, starting_chips
  small_blind, big_blind, current_round, created_at, updated_at

table_players
  table_id → tables, user_id → users, seat_index, chip_stack
  is_connected

rounds
  id (uuid PK), table_id → tables, round_number, status
  dealer_seat_index, pot, winner_id, resolved_at

fixtures
  id (uuid PK), home_team_id → teams, away_team_id → teams
  home_goals, away_goals, status, match_stage
  home_penalties, away_penalties, scheduled_at, resolved_at

round_fixtures
  round_id → rounds, fixture_id → fixtures (composite PK)

player_hands
  id (uuid PK), round_id → rounds, user_id → users
  card1_team_id → teams, card2_team_id → teams, has_folded

card_scores
  id (uuid PK), round_id → rounds, user_id → users
  team_id → teams, fixture_id → fixtures
  base_score, goal_bonus, clean_sheet_bonus, penalty_modifier, total_score

bets
  id (uuid PK), round_id → rounds, user_id → users
  betting_round, action, amount
```

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `game.service.ts` | ~820 | Round lifecycle, betting flow, fixture timing, scoring |
| `betting.service.ts` | ~340 | Betting state machine (init, validate, apply, complete) |
| `phase-tracker.ts` | ~45 | Redis-backed reconnect state (phase, fixtures, scores) |
| `game.socket.ts` | ~300 | Socket.io event handlers, table state assembly |
| `scoring.service.ts` | ~150 | Card scoring after fixture results |
| `dealing.service.ts` | ~220 | Card dealing, fixture assignment |
| `demo.service.ts` | ~180 | Demo fixture generation with random scores |
| `blinds.service.ts` | ~50 | Blind position calculation |

## REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Get JWT token |
| GET | `/api/tables` | Yes | List tables |
| POST | `/api/tables` | Yes | Create table |
| GET | `/api/tables/:id` | Yes | Get table details |
| POST | `/api/tables/:id/join` | Yes | Join table |
| POST | `/api/tables/:id/leave` | Yes | Leave table |
| POST | `/api/tables/:id/add-bot` | Yes | Add one bot |
| POST | `/api/tables/:id/add-bots` | Yes | Fill with bots |
| POST | `/api/tables/:id/start` | Yes | Start game |
| DELETE | `/api/admin/cleanup` | Admin | Clean up stale tables |
| POST | `/api/test/seed-game` | Dev only | Seed a game to a specific phase |

## Testing

```bash
pnpm test                    # all 43 tests
pnpm --filter server test    # server only
pnpm test:coverage           # with coverage report
```

Tests use Vitest with mocked DB. Redis is not required — the game state store falls back to in-memory Maps automatically.

E2E tests (Playwright) are in `apps/web/e2e/` — run with `pnpm --filter web test:e2e`.

## Deployment

Production runs via Docker Compose with 5 services:

```
nginx:80 ─┬─ /          → web:80 (static React build)
           ├─ /api/*     → server:5174 (Express REST)
           └─ /socket.io → server:5174 (WebSocket)

server:5174 ─→ postgres:5432
             ─→ redis:6379
```

Deploy: push to `main` → GitHub Actions CD → SSH to EC2 → `docker compose up --build`

Key files: `apps/server/Dockerfile`, `apps/web/Dockerfile`, `docker-compose.production.yml`, `nginx.conf`
