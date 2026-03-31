# World Poker Cup - Technical Specification

## 1. Product Overview

**World Poker Cup** merges Texas Hold'em poker mechanics with real FIFA World Cup match outcomes. Players sit at a 5-player virtual poker table, receive national team "cards" instead of playing cards, bet using poker chips across 3 betting rounds, then wait for real World Cup results to determine hand strength. The highest-scoring hand wins the pot.

### Core Innovation

Traditional poker hands are replaced by a **points-based scoring system** derived from real-world football results:

| Outcome                             | Points |
| ----------------------------------- | ------ |
| Team Win                            | 5 pts  |
| Draw                                | 3 pts  |
| Team Loss                           | 0 pts  |
| **Bonus:** 3+ Goals Scored          | +4 pts |
| **Bonus:** Clean Sheet (0 conceded) | +2 pts |
| **Bonus:** Penalty Scored           | +1 pt  |
| **Bonus:** Penalty Missed           | -1 pt  |

**Max per card: 12 pts | Max per hand (2 cards): 24 pts**

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTS (Browser)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Player 1 │  │ Player 2 │  │ Player 3 │  │ Player 4 │  ...      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │              │                │
│       └──────────────┴──────┬───────┴──────────────┘                │
│                             │ WebSocket + REST                      │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│                     LOAD BALANCER (nginx)                           │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│                      API GATEWAY                                    │
│              ┌──────────────┼──────────────┐                        │
│              │              │              │                         │
│     ┌────────▼──┐  ┌───────▼───┐  ┌──────▼──────┐                  │
│     │ Auth      │  │ Game      │  │ Match Data  │                   │
│     │ Service   │  │ Engine    │  │ Service     │                   │
│     └────┬──────┘  └─────┬─────┘  └──────┬──────┘                  │
│          │               │               │                          │
│     ┌────▼───────────────▼───────────────▼──────┐                   │
│     │            PostgreSQL Database             │                   │
│     └────────────────────┬──────────────────────┘                   │
│                          │                                          │
│     ┌────────────────────▼──────────────────────┐                   │
│     │         Redis (Cache + Pub/Sub)            │                   │
│     └───────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────────┐
│                   EXTERNAL APIs                                     │
│     ┌────────────┐    ┌─────────────┐                               │
│     │ Football   │    │ ESPN /      │                                │
│     │ Data API   │    │ FIFA API    │                                │
│     └────────────┘    └─────────────┘                               │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Tech Stack

| Layer                | Technology                    | Rationale                           |
| -------------------- | ----------------------------- | ----------------------------------- |
| **Frontend**         | React 18 + TypeScript         | Component-driven UI, strong typing  |
| **State Management** | Zustand                       | Lightweight, immutable-friendly     |
| **Styling**          | TailwindCSS                   | Rapid UI development, responsive    |
| **Real-time Client** | Socket.io-client              | Reliable WebSocket with fallback    |
| **Backend Runtime**  | Node.js 20 + Express.js       | Fast I/O, JS ecosystem              |
| **Real-time Server** | Socket.io                     | Room-based WebSocket management     |
| **Database**         | PostgreSQL 16                 | Relational integrity for game state |
| **Cache / Pub-Sub**  | Redis 7                       | Session cache, cross-instance sync  |
| **ORM**              | Drizzle ORM                   | Type-safe queries, lightweight      |
| **Auth**             | JWT + bcrypt                  | Stateless auth, secure passwords    |
| **Validation**       | Zod                           | Runtime schema validation           |
| **External Data**    | football-data.org API         | Free tier, comprehensive WC data    |
| **Containerization** | Docker + Docker Compose       | Reproducible environments           |
| **CI/CD**            | GitHub Actions                | Automated test + deploy pipeline    |
| **Hosting**          | AWS (EC2 + RDS + ElastiCache) | Scalable cloud infrastructure       |

---

## 3. Domain Model

### 3.1 Bounded Contexts

```
┌──────────────────────────────────────────────────────────────────┐
│                      WORLD POKER CUP                             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │
│  │   IDENTITY  │  │   GAME      │  │   MATCH DATA             │  │
│  │   CONTEXT   │  │   CONTEXT   │  │   CONTEXT                │  │
│  │             │  │             │  │                           │  │
│  │  - User     │  │  - Table    │  │  - Team                  │  │
│  │  - Profile  │  │  - Round    │  │  - Fixture               │  │
│  │  - Session  │  │  - Hand     │  │  - MatchResult           │  │
│  │             │  │  - Bet      │  │  - Tournament             │  │
│  │             │  │  - Pot      │  │  - Group                  │  │
│  │             │  │  - ChipStack│  │                           │  │
│  └─────────────┘  └─────────────┘  └──────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐                                │
│  │  SCORING    │  │  ANALYTICS  │                                │
│  │  CONTEXT    │  │  CONTEXT    │                                │
│  │             │  │             │                                │
│  │  - HandScore│  │  - GameLog  │                                │
│  │  - CardScore│  │  - Stats    │                                │
│  │  - Bonus    │  │  - Leaderbd │                                │
│  └─────────────┘  └─────────────┘                                │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Core Entities

#### User

```typescript
interface User {
  readonly id: string // UUID
  readonly email: string
  readonly username: string // Display name (unique)
  readonly passwordHash: string
  readonly avatarUrl: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}
```

#### Team (National Team Card)

```typescript
interface Team {
  readonly id: string // e.g., "ENG", "ESP", "BRA"
  readonly name: string // e.g., "England"
  readonly confederation: Confederation // UEFA, CONMEBOL, etc.
  readonly group: string // e.g., "Group B"
  readonly flagEmoji: string // e.g., "🏴󠁧󠁢󠁥󠁮󠁧󠁿"
  readonly fifaRanking: number
  readonly tier: TeamTier // S, A, B, C (for balanced dealing)
}

type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'
type TeamTier = 'S' | 'A' | 'B' | 'C'
```

#### Table (Game Room)

```typescript
interface Table {
  readonly id: string // UUID
  readonly name: string
  readonly hostId: string // User ID of creator
  readonly status: TableStatus
  readonly maxPlayers: 5
  readonly startingChips: number // Default: 500
  readonly blinds: Blinds | null // Optional small/big blind
  readonly currentRoundId: string | null
  readonly players: ReadonlyArray<TablePlayer>
  readonly createdAt: Date
}

type TableStatus = 'WAITING' | 'IN_PROGRESS' | 'PAUSED_FOR_MATCHES' | 'COMPLETED'

interface TablePlayer {
  readonly userId: string
  readonly seatIndex: number // 0-4
  readonly chipStack: number
  readonly isConnected: boolean
  readonly joinedAt: Date
}

interface Blinds {
  readonly small: number
  readonly big: number
}
```

#### Round (One Complete Hand)

```typescript
interface Round {
  readonly id: string
  readonly tableId: string
  readonly roundNumber: number
  readonly status: RoundStatus
  readonly dealerSeatIndex: number
  readonly fixtureIds: ReadonlyArray<string> // Board matches
  readonly hands: ReadonlyArray<PlayerHand>
  readonly bettingRounds: ReadonlyArray<BettingRound>
  readonly pot: number
  readonly winnerId: string | null
  readonly createdAt: Date
  readonly resolvedAt: Date | null
}

type RoundStatus =
  | 'DEALING' // Cards being dealt
  | 'BOARD_REVEALED' // Fixtures shown
  | 'BETTING_ROUND_1'
  | 'BETTING_ROUND_2'
  | 'BETTING_ROUND_3'
  | 'WAITING_FOR_RESULTS' // Paused for real WC matches
  | 'SCORING' // Calculating points
  | 'SHOWDOWN' // Revealing winner
  | 'COMPLETE'
```

#### PlayerHand

```typescript
interface PlayerHand {
  readonly id: string
  readonly roundId: string
  readonly userId: string
  readonly cards: readonly [TeamCard, TeamCard] // Always 2 cards
  readonly hasFolded: boolean
  readonly totalScore: number | null // Set after results
  readonly cardScores: ReadonlyArray<CardScore> | null
}

interface TeamCard {
  readonly teamId: string
  readonly team: Team
}
```

#### Fixture (World Cup Match on the Board)

```typescript
interface Fixture {
  readonly id: string
  readonly homeTeamId: string
  readonly awayTeamId: string
  readonly scheduledAt: Date
  readonly stage: MatchStage // GROUP, ROUND_16, QUARTER, etc.
  readonly status: FixtureStatus
  readonly result: MatchResult | null
}

type MatchStage = 'GROUP' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'THIRD_PLACE' | 'FINAL'
type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED'

interface MatchResult {
  readonly homeGoals: number
  readonly awayGoals: number
  readonly homePenaltiesScored: number
  readonly homePenaltiesMissed: number
  readonly awayPenaltiesScored: number
  readonly awayPenaltiesMissed: number
}
```

#### CardScore (Scoring Breakdown)

```typescript
interface CardScore {
  readonly teamId: string
  readonly fixtureId: string
  readonly basePoints: number // 5 (win), 3 (draw), 0 (loss)
  readonly highScorerBonus: number // +4 if 3+ goals
  readonly cleanSheetBonus: number // +2 if 0 conceded
  readonly penaltyBonus: number // +1/-1 per penalty
  readonly totalPoints: number // Sum of all above
  readonly breakdown: string // Human-readable summary
}
```

#### Bet

```typescript
interface Bet {
  readonly id: string
  readonly roundId: string
  readonly bettingRoundNumber: number // 1, 2, or 3
  readonly userId: string
  readonly action: BetAction
  readonly amount: number
  readonly createdAt: Date
}

type BetAction = 'CHECK' | 'CALL' | 'RAISE' | 'FOLD' | 'ALL_IN'
```

### 3.3 Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌───────────┐
│   User   │────<│TablePlayer│>────│   Table   │
└──────────┘     └───────────┘     └─────┬─────┘
     │                                    │
     │                              ┌─────▼─────┐
     │                              │   Round   │
     │                              └──┬──┬──┬──┘
     │                                 │  │  │
     │           ┌─────────────────────┘  │  └────────────────┐
     │           │                        │                   │
     │     ┌─────▼─────┐          ┌──────▼──────┐    ┌───────▼──────┐
     └────>│PlayerHand │          │BettingRound │    │   Fixture    │
           └─────┬─────┘          └──────┬──────┘    └───────┬──────┘
                 │                       │                   │
           ┌─────▼─────┐          ┌──────▼──────┐    ┌──────▼───────┐
           │ TeamCard  │          │    Bet      │    │ MatchResult  │
           └─────┬─────┘          └─────────────┘    └──────────────┘
                 │
           ┌─────▼─────┐
           │   Team    │
           └───────────┘
```

---

## 4. Service Architecture

### 4.1 Auth Service

**Responsibility:** User registration, login, session management.

| Endpoint             | Method | Description              |
| -------------------- | ------ | ------------------------ |
| `/api/auth/register` | POST   | Create new account       |
| `/api/auth/login`    | POST   | Authenticate, return JWT |
| `/api/auth/me`       | GET    | Get current user profile |
| `/api/auth/refresh`  | POST   | Refresh JWT token        |

### 4.2 Game Engine Service

**Responsibility:** Core game logic — table management, dealing, betting, round lifecycle.

| Endpoint                | Method | Description                |
| ----------------------- | ------ | -------------------------- |
| `/api/tables`           | GET    | List open tables           |
| `/api/tables`           | POST   | Create a new table         |
| `/api/tables/:id`       | GET    | Get table state            |
| `/api/tables/:id/join`  | POST   | Join a table               |
| `/api/tables/:id/leave` | POST   | Leave a table              |
| `/api/tables/:id/start` | POST   | Start the game (host only) |

**WebSocket Events (Socket.io):**

| Event               | Direction       | Payload                   |
| ------------------- | --------------- | ------------------------- |
| `table:state`       | Server → Client | Full table state snapshot |
| `round:start`       | Server → Client | New round + dealt cards   |
| `board:reveal`      | Server → Client | Today's fixtures          |
| `bet:prompt`        | Server → Client | Your turn to act          |
| `bet:action`        | Client → Server | `{ action, amount }`      |
| `bet:update`        | Server → Client | Player made a bet         |
| `round:pause`       | Server → Client | Waiting for match results |
| `round:results`     | Server → Client | Match scores revealed     |
| `round:showdown`    | Server → Client | Final scores + winner     |
| `player:eliminated` | Server → Client | Player ran out of chips   |

### 4.3 Match Data Service

**Responsibility:** Fetch, cache, and serve real World Cup fixture data and results.

| Endpoint              | Method | Description             |
| --------------------- | ------ | ----------------------- |
| `/api/fixtures`       | GET    | List all WC fixtures    |
| `/api/fixtures/today` | GET    | Today's matches         |
| `/api/fixtures/:id`   | GET    | Single fixture details  |
| `/api/teams`          | GET    | All participating teams |
| `/api/teams/:id`      | GET    | Single team info        |

**Background Jobs:**

- `SyncFixtures` — Polls football-data.org every 10 minutes for schedule updates
- `SyncResults` — Polls every 1 minute during live matches for score updates
- `NotifyResults` — Pushes finished match results to all affected game tables via Redis Pub/Sub

### 4.4 Scoring Service

**Responsibility:** Calculate hand scores from match results.

```typescript
function calculateCardScore(teamId: string, fixture: Fixture): CardScore {
  const result = fixture.result
  if (!result) return ZERO_SCORE

  const isHome = fixture.homeTeamId === teamId
  const goalsFor = isHome ? result.homeGoals : result.awayGoals
  const goalsAgainst = isHome ? result.awayGoals : result.homeGoals
  const penScored = isHome ? result.homePenaltiesScored : result.awayPenaltiesScored
  const penMissed = isHome ? result.homePenaltiesMissed : result.awayPenaltiesMissed

  const basePoints = goalsFor > goalsAgainst ? 5 : goalsFor === goalsAgainst ? 3 : 0
  const highScorerBonus = goalsFor >= 3 ? 4 : 0
  const cleanSheetBonus = goalsAgainst === 0 ? 2 : 0
  const penaltyBonus = penScored - penMissed

  return {
    teamId,
    fixtureId: fixture.id,
    basePoints,
    highScorerBonus,
    cleanSheetBonus,
    penaltyBonus,
    totalPoints: basePoints + highScorerBonus + cleanSheetBonus + penaltyBonus,
    breakdown: buildBreakdown(basePoints, highScorerBonus, cleanSheetBonus, penaltyBonus),
  }
}
```

---

## 5. Database Schema

### 5.1 Tables

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    total_chips_won BIGINT DEFAULT 0,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- National Teams (seeded data)
CREATE TABLE teams (
    id VARCHAR(3) PRIMARY KEY,           -- ISO 3166-1 alpha-3
    name VARCHAR(100) NOT NULL,
    confederation VARCHAR(10) NOT NULL,
    wc_group VARCHAR(10),
    flag_emoji TEXT NOT NULL,
    fifa_ranking INT,
    tier CHAR(1) NOT NULL                -- S, A, B, C
);

-- Game Tables (Rooms)
CREATE TABLE tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    host_id UUID REFERENCES users(id),
    status VARCHAR(30) NOT NULL DEFAULT 'WAITING',
    starting_chips INT NOT NULL DEFAULT 500,
    small_blind INT,
    big_blind INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Players (join table)
CREATE TABLE table_players (
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    seat_index INT NOT NULL CHECK (seat_index BETWEEN 0 AND 4),
    chip_stack INT NOT NULL,
    is_connected BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (table_id, user_id),
    UNIQUE (table_id, seat_index)
);

-- World Cup Fixtures
CREATE TABLE fixtures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(50) UNIQUE,       -- ID from football API
    home_team_id VARCHAR(3) REFERENCES teams(id),
    away_team_id VARCHAR(3) REFERENCES teams(id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    stage VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    home_goals INT,
    away_goals INT,
    home_penalties_scored INT DEFAULT 0,
    home_penalties_missed INT DEFAULT 0,
    away_penalties_scored INT DEFAULT 0,
    away_penalties_missed INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Rounds
CREATE TABLE rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DEALING',
    dealer_seat_index INT NOT NULL,
    pot INT DEFAULT 0,
    winner_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- Round ↔ Fixture (board matches for this round)
CREATE TABLE round_fixtures (
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    fixture_id UUID REFERENCES fixtures(id),
    PRIMARY KEY (round_id, fixture_id)
);

-- Player Hands
CREATE TABLE player_hands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    card_1_team_id VARCHAR(3) REFERENCES teams(id),
    card_2_team_id VARCHAR(3) REFERENCES teams(id),
    has_folded BOOLEAN DEFAULT FALSE,
    total_score INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Card Scores (detailed scoring breakdown)
CREATE TABLE card_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hand_id UUID REFERENCES player_hands(id) ON DELETE CASCADE,
    team_id VARCHAR(3) REFERENCES teams(id),
    fixture_id UUID REFERENCES fixtures(id),
    base_points INT NOT NULL DEFAULT 0,
    high_scorer_bonus INT NOT NULL DEFAULT 0,
    clean_sheet_bonus INT NOT NULL DEFAULT 0,
    penalty_bonus INT NOT NULL DEFAULT 0,
    total_points INT NOT NULL DEFAULT 0
);

-- Bets
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    betting_round INT NOT NULL CHECK (betting_round BETWEEN 1 AND 3),
    action VARCHAR(10) NOT NULL,
    amount INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_fixtures_scheduled ON fixtures(scheduled_at);
CREATE INDEX idx_fixtures_status ON fixtures(status);
CREATE INDEX idx_rounds_table ON rounds(table_id);
CREATE INDEX idx_bets_round ON bets(round_id);
CREATE INDEX idx_player_hands_round ON player_hands(round_id);
```

---

## 6. Game Flow State Machine

```
                    ┌──────────┐
                    │ WAITING  │  (Players joining table)
                    └────┬─────┘
                         │ Host clicks "Start Game"
                         ▼
                    ┌──────────┐
              ┌────>│ DEALING  │  Shuffle team deck, deal 2 cards per player
              │     └────┬─────┘
              │          │
              │          ▼
              │     ┌──────────────┐
              │     │BOARD_REVEALED│  Show today's WC fixtures on the board
              │     └────┬─────────┘
              │          │
              │          ▼
              │     ┌──────────────┐
              │     │BETTING_RND_1 │  Players bet: check/call/raise/fold
              │     └────┬─────────┘
              │          │
              │          ▼
              │     ┌──────────────┐
              │     │BETTING_RND_2 │
              │     └────┬─────────┘
              │          │
              │          ▼
              │     ┌──────────────┐
              │     │BETTING_RND_3 │  (Final betting round)
              │     └────┬─────────┘
              │          │
              │          ▼
              │     ┌──────────────────────┐
              │     │ WAITING_FOR_RESULTS  │  Game pauses. Real WC matches play.
              │     └────┬─────────────────┘
              │          │  Match Data Service pushes results
              │          ▼
              │     ┌──────────┐
              │     │ SCORING  │  Calculate points per card per player
              │     └────┬─────┘
              │          │
              │          ▼
              │     ┌──────────┐
              │     │SHOWDOWN  │  Reveal all hands, announce winner
              │     └────┬─────┘
              │          │
              │          ▼
              │     ┌──────────┐
              │     │COMPLETE  │  Distribute pot, update chip stacks
              │     └────┬─────┘
              │          │
              │          │ Next round (if players remain)
              └──────────┘
```

### Early Exit Conditions

- If all players fold except one → that player wins immediately (no waiting for results)
- If no player's teams appear on the board → round is skipped, re-deal
- If only one player remains with chips → game over, that player wins

---

## 7. Frontend Architecture

### 7.1 Page / Route Structure

```
/                          → Landing page (marketing)
/login                     → Login form
/register                  → Registration form
/lobby                     → Browse & create tables
/table/:id                 → Main game view (WebSocket connected)
/profile                   → Player stats & history
/leaderboard               → Global rankings (Phase 2)
```

### 7.2 Main Game Screen Layout

```
┌────────────────────────────────────────────────────────────────┐
│  HEADER: Table Name | Round # | Pot: $350 | Your Chips: $400  │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                    ┌─ Player 1 (top) ─┐                        │
│                    │ 🏴 ENG  🇪🇸 ESP   │                        │
│                    │ Chips: $500       │                        │
│                    └──────────────────┘                        │
│                                                                │
│   ┌─ Player 5 ─┐    ┌──────────────┐    ┌─ Player 2 ─┐       │
│   │ 🇯🇵  🇪🇸     │    │              │    │ 🇵🇹  🇩🇪     │       │
│   │ Chips: $300 │    │  LIVE BOARD  │    │ Chips: $500 │       │
│   └─────────────┘    │              │    └─────────────┘       │
│                      │ ENG vs POR   │                          │
│   ┌─ Player 4 ─┐    │ ESP vs GER   │    ┌─ Player 3 ─┐       │
│   │ 🇦🇷  🇮🇹     │    │ BRA vs FRA   │    │ 🇧🇷  🇫🇷     │       │
│   │ Chips: $450 │    │              │    │ Chips: $500 │       │
│   └─────────────┘    │  POT: $350   │    └─────────────┘       │
│                      └──────────────┘                          │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  YOUR HAND: 🏴 England  🇧🇷 Brazil                              │
│                                                                │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐              │
│  │  CHECK  │ │  CALL   │ │  RAISE   │ │  FOLD  │              │
│  │         │ │  $50    │ │  [____]  │ │        │              │
│  └─────────┘ └─────────┘ └──────────┘ └────────┘              │
└────────────────────────────────────────────────────────────────┘
```

### 7.3 Key UI Components

| Component           | Description                                                     |
| ------------------- | --------------------------------------------------------------- |
| `<PokerTable>`      | Central table with oval shape, board fixtures, pot display      |
| `<PlayerSeat>`      | Avatar, cards (face-down for others), chip count, bet indicator |
| `<TeamCard>`        | Flag emoji, team name, group info, glow animation               |
| `<FixtureBoard>`    | Live board showing today's matches, live scores when available  |
| `<BettingControls>` | Check/Call/Raise/Fold buttons, raise slider                     |
| `<ScoreBreakdown>`  | Animated point calculation at showdown                          |
| `<RoundTimer>`      | Countdown for betting turns (30 seconds default)                |
| `<ChipStack>`       | Visual chip pile with denomination colors                       |
| `<WaitingScreen>`   | "Watching the matches..." overlay with live score feed          |
| `<ShowdownOverlay>` | Dramatic reveal of all hands + scoring animation                |

### 7.4 Key Frontend State

```typescript
interface GameState {
  readonly table: Table
  readonly currentRound: Round | null
  readonly myHand: PlayerHand | null
  readonly myTurn: boolean
  readonly bettingRound: number
  readonly fixtures: ReadonlyArray<Fixture>
  readonly liveScores: ReadonlyMap<string, MatchResult>
  readonly showdownResults: ShowdownResult | null
}

interface ShowdownResult {
  readonly hands: ReadonlyArray<{
    readonly userId: string
    readonly username: string
    readonly cards: readonly [TeamCard, TeamCard]
    readonly scores: ReadonlyArray<CardScore>
    readonly totalScore: number
  }>
  readonly winnerId: string
  readonly potAmount: number
}
```

---

## 8. Demo Mode (MVP)

For development and testing without waiting for real World Cup matches:

```typescript
interface DemoConfig {
  readonly enabled: boolean
  readonly fixtures: ReadonlyArray<{
    readonly homeTeam: string
    readonly awayTeam: string
    readonly result: MatchResult // Pre-configured or randomized
    readonly revealDelay: number // Seconds to simulate "waiting"
  }>
  readonly autoReveal: boolean // Auto-resolve after delay
  readonly revealDelaySeconds: number // Default: 30
}
```

**Demo mode features:**

- Hardcoded fixture list (or random from all 32 teams)
- Configurable results (manual or randomized)
- Short delay (30-60 seconds) instead of waiting for real matches
- Same scoring engine and betting mechanics
- Toggle between Demo and Live mode from admin panel

---

## 9. External API Integration

### 9.1 Football Data Source: football-data.org

```typescript
interface FootballApiConfig {
  readonly baseUrl: 'https://api.football-data.org/v4'
  readonly apiKey: string // Environment variable
  readonly competitionId: 'WC' // FIFA World Cup
  readonly pollIntervalMs: 60_000 // 1 minute during live matches
  readonly cacheTtlMs: 600_000 // 10 minutes for schedule
}
```

**Key endpoints:**

- `GET /v4/competitions/WC/matches` — All fixtures
- `GET /v4/competitions/WC/matches?status=LIVE` — Currently playing
- `GET /v4/competitions/WC/teams` — All participating teams

### 9.2 Data Sync Strategy

```
┌───────────────┐     poll every 10min      ┌─────────────────┐
│ football-data  │ ◄─────────────────────── │  FixtureSync    │
│     .org API   │                          │  (Cron Job)     │
└───────────────┘     poll every 1min       └────────┬────────┘
                      (during match days)            │
                                                     ▼
                                              ┌──────────────┐
                                              │  PostgreSQL   │
                                              │  (fixtures)   │
                                              └──────┬───────┘
                                                     │
                                              ┌──────▼───────┐
                                              │    Redis      │
                                              │  Pub/Sub      │
                                              └──────┬───────┘
                                                     │
                                          ┌──────────┼──────────┐
                                          ▼          ▼          ▼
                                     Table 1    Table 2    Table 3
                                   (WebSocket) (WebSocket) (WebSocket)
```

---

## 10. Card Dealing Algorithm

The dealing system ensures fairness and interesting gameplay:

```typescript
function dealCards(
  teams: ReadonlyArray<Team>,
  fixtures: ReadonlyArray<Fixture>,
  playerCount: number,
): ReadonlyArray<readonly [Team, Team]> {
  // 1. Identify teams playing in today's fixtures
  const activeTeamIds = new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]))

  // 2. Build deck: prioritize active teams, add some non-active for bluffing
  const activeTeams = teams.filter((t) => activeTeamIds.has(t.id))
  const inactiveTeams = teams.filter((t) => !activeTeamIds.has(t.id))

  // 3. Shuffle using Fisher-Yates (cryptographically random)
  const deck = [
    ...shuffle(activeTeams),
    ...shuffle(inactiveTeams).slice(0, Math.max(0, playerCount * 2 - activeTeams.length)),
  ]

  // 4. Deal 2 unique cards per player
  const hands: Array<readonly [Team, Team]> = []
  for (let i = 0; i < playerCount; i++) {
    hands.push([deck[i * 2], deck[i * 2 + 1]] as const)
  }

  return hands
}
```

**Dealing rules:**

- Each card is unique per round (no two players hold the same team)
- Mix of active (on the board) and inactive teams creates bluffing dynamics
- Players with no active teams should fold early or bluff

---

## 11. Security Considerations

| Concern          | Mitigation                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------- |
| Card visibility  | Cards stored server-side only; each player receives only their own cards via private WebSocket messages |
| Bet manipulation | All bet validation happens server-side; client sends intent, server validates against game state        |
| Rate limiting    | 100 req/min per user on REST, 30 events/min on WebSocket                                                |
| JWT security     | Short-lived tokens (15min), refresh tokens (7 days), httpOnly cookies                                   |
| SQL injection    | Parameterized queries via Drizzle ORM                                                                   |
| Input validation | Zod schemas on all API inputs                                                                           |
| WebSocket auth   | JWT verified on connection handshake                                                                    |
| Result tampering | Match results fetched server-side only; clients receive read-only state                                 |

---

## 12. Project Structure

```
world-poker-cup/
├── apps/
│   ├── web/                          # React frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── game/
│   │   │   │   │   ├── PokerTable.tsx
│   │   │   │   │   ├── PlayerSeat.tsx
│   │   │   │   │   ├── TeamCard.tsx
│   │   │   │   │   ├── FixtureBoard.tsx
│   │   │   │   │   ├── BettingControls.tsx
│   │   │   │   │   ├── ScoreBreakdown.tsx
│   │   │   │   │   ├── ShowdownOverlay.tsx
│   │   │   │   │   └── WaitingScreen.tsx
│   │   │   │   ├── lobby/
│   │   │   │   │   ├── TableList.tsx
│   │   │   │   │   └── CreateTableModal.tsx
│   │   │   │   ├── auth/
│   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   └── RegisterForm.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── ChipStack.tsx
│   │   │   │       ├── Timer.tsx
│   │   │   │       └── Avatar.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useGameSocket.ts
│   │   │   │   ├── useGameState.ts
│   │   │   │   └── useAuth.ts
│   │   │   ├── stores/
│   │   │   │   ├── gameStore.ts
│   │   │   │   └── authStore.ts
│   │   │   ├── pages/
│   │   │   │   ├── Landing.tsx
│   │   │   │   ├── Lobby.tsx
│   │   │   │   ├── GameTable.tsx
│   │   │   │   └── Profile.tsx
│   │   │   └── lib/
│   │   │       ├── socket.ts
│   │   │       └── api.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   └── server/                       # Node.js backend
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── auth.schema.ts
│       │   │   │   └── auth.middleware.ts
│       │   │   ├── game/
│       │   │   │   ├── game.controller.ts
│       │   │   │   ├── game.service.ts
│       │   │   │   ├── game.socket.ts
│       │   │   │   ├── dealing.service.ts
│       │   │   │   ├── betting.service.ts
│       │   │   │   └── scoring.service.ts
│       │   │   ├── match-data/
│       │   │   │   ├── match-data.controller.ts
│       │   │   │   ├── match-data.service.ts
│       │   │   │   ├── football-api.client.ts
│       │   │   │   └── sync.job.ts
│       │   │   └── tables/
│       │   │       ├── table.controller.ts
│       │   │       ├── table.service.ts
│       │   │       └── table.repository.ts
│       │   ├── db/
│       │   │   ├── schema.ts           # Drizzle schema
│       │   │   ├── migrations/
│       │   │   └── seed/
│       │   │       └── teams.seed.ts   # 32 WC teams
│       │   ├── shared/
│       │   │   ├── types.ts
│       │   │   └── errors.ts
│       │   └── app.ts
│       └── package.json
│
├── packages/
│   └── shared/                        # Shared types & utils
│       ├── types/
│       │   ├── game.types.ts
│       │   ├── team.types.ts
│       │   └── socket-events.ts
│       └── utils/
│           └── scoring.ts             # Scoring logic (shared)
│
├── docker-compose.yml
├── .github/workflows/ci.yml
├── TECHNICAL_SPEC.md
└── package.json                       # Monorepo root (pnpm workspaces)
```

---

## 13. Implementation Phases

### Phase 1 — MVP (4-6 weeks)

| Week | Deliverable                                            |
| ---- | ------------------------------------------------------ |
| 1    | Project setup (monorepo, Docker, DB schema, seed data) |
| 1    | Auth service (register, login, JWT)                    |
| 2    | Table management (create, join, leave)                 |
| 2    | WebSocket infrastructure (Socket.io rooms)             |
| 3    | Card dealing + board reveal                            |
| 3    | Betting engine (3 rounds, check/call/raise/fold)       |
| 4    | Scoring engine + showdown logic                        |
| 4    | Demo mode (fake results with short delay)              |
| 5    | Frontend: game table UI, betting controls, animations  |
| 5    | Frontend: lobby, auth forms                            |
| 6    | Integration testing, bug fixes, polish                 |

**MVP Definition of Done:**

- 5 players can join a table and play a complete round
- Demo mode works with configurable fake results
- Scoring correctly calculates all bonuses
- Betting rounds enforce poker rules
- Showdown reveals all hands with animated scoring

### Phase 2 — Live Mode (3-4 weeks)

- Football API integration (real fixtures + live scores)
- "Waiting for results" pause screen with live score feed
- Auto-resolve rounds when matches finish
- Match day scheduling (only create rounds tied to real fixtures)

### Phase 3 — Polish & Social (3-4 weeks)

- Leaderboards (global + friends)
- Player statistics dashboard
- In-game chat
- Replay system (review past rounds)
- Sound effects + advanced animations
- OAuth2 (Google/Apple login)
- Mobile-responsive optimization

### Phase 4 — Scale (2-3 weeks)

- Horizontal scaling (multiple Node.js instances)
- Redis cluster for cross-instance pub/sub
- CDN for static assets
- Load testing (target: 500 concurrent players)
- Monitoring + alerting (Datadog/Grafana)

---

## 14. Testing Strategy

| Layer             | Tool                         | Coverage Target                               |
| ----------------- | ---------------------------- | --------------------------------------------- |
| Unit tests        | Vitest                       | 80%+ (scoring engine, dealing, betting logic) |
| Integration tests | Vitest + Supertest           | API endpoints, DB operations                  |
| WebSocket tests   | Socket.io-client (test mode) | All game events                               |
| E2E tests         | Playwright                   | Full game flow (deal → bet → showdown)        |

**Critical test scenarios:**

- Scoring engine: all bonus combinations (win + clean sheet + 3+ goals + penalty)
- Dealing: no duplicate cards across players
- Betting: fold removes player, all-in side pots, turn order
- Showdown: tie-breaking, pot splitting
- Demo mode: configurable results resolve correctly

---

## 15. Key Technical Decisions

| Decision         | Choice                | Reasoning                                                          |
| ---------------- | --------------------- | ------------------------------------------------------------------ |
| Monorepo         | pnpm workspaces       | Shared types between frontend/backend                              |
| State management | Zustand over Redux    | Less boilerplate, built-in immutability                            |
| ORM              | Drizzle over Prisma   | Lighter weight, SQL-like syntax, better perf                       |
| WebSocket        | Socket.io over raw WS | Built-in rooms, reconnection, fallback                             |
| Scoring location | Shared package        | Same scoring logic runs on server (authority) and client (preview) |
| Card hiding      | Server-authoritative  | Never send other players' cards to client until showdown           |
| Demo mode        | First-class feature   | Essential for development, testing, and offline play               |

---

## 16. Open Questions for Future Consideration

1. **Spectator mode** — Should non-players be able to watch tables?
2. **Tournament brackets** — Multi-table tournaments with elimination?
3. **Card trading** — Pre-game card swaps between players?
4. **Team tiers** — Should stronger teams (Brazil, France) be weighted differently in dealing?
5. **Knockout stage rules** — Extra time / penalty shootout scoring in WC knockout rounds?
6. **Mobile native app** — React Native or stay web-only?
7. **Monetization** — In-app purchases for cosmetics (avatars, card skins)?
