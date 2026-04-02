import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  smallint,
  char,
  primaryKey,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    username: varchar('username', { length: 50 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    avatarUrl: text('avatar_url'),
    totalChipsWon: bigint('total_chips_won', { mode: 'number' }).default(0).notNull(),
    gamesPlayed: integer('games_played').default(0).notNull(),
    gamesWon: integer('games_won').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    usersEmailIdx: uniqueIndex('users_email_idx').on(table.email),
    usersUsernameIdx: uniqueIndex('users_username_idx').on(table.username),
  }),
)

export const teams = pgTable('teams', {
  id: varchar('id', { length: 3 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  confederation: varchar('confederation', { length: 10 }).notNull(),
  wcGroup: char('wc_group', { length: 1 }).notNull(),
  flagEmoji: varchar('flag_emoji', { length: 10 }).notNull(),
  fifaRanking: integer('fifa_ranking').notNull(),
  tier: char('tier', { length: 1 }).notNull(),
})

export const tables = pgTable(
  'tables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    hostId: uuid('host_id')
      .references(() => users.id)
      .notNull(),
    status: varchar('status', { length: 30 }).default('WAITING').notNull(),
    startingChips: integer('starting_chips').default(500).notNull(),
    smallBlind: integer('small_blind'),
    bigBlind: integer('big_blind'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    tablesStatusIdx: index('tables_status_idx').on(table.status),
    tablesHostIdIdx: index('tables_host_id_idx').on(table.hostId),
  }),
)

export const tablePlayers = pgTable(
  'table_players',
  {
    tableId: uuid('table_id')
      .references(() => tables.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    seatIndex: smallint('seat_index').notNull(),
    chipStack: integer('chip_stack').notNull(),
    isConnected: boolean('is_connected').default(true).notNull(),
    joinedAt: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    tablePlayersPk: primaryKey({ columns: [table.tableId, table.userId] }),
    tablePlayersTableIdIdx: index('table_players_table_id_idx').on(table.tableId),
  }),
)

export const fixtures = pgTable(
  'fixtures',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    externalId: varchar('external_id', { length: 100 }),
    homeTeamId: varchar('home_team_id', { length: 3 })
      .references(() => teams.id)
      .notNull(),
    awayTeamId: varchar('away_team_id', { length: 3 })
      .references(() => teams.id)
      .notNull(),
    scheduledAt: timestamp('scheduled_at').notNull(),
    stage: varchar('stage', { length: 30 }).notNull(),
    status: varchar('status', { length: 20 }).default('SCHEDULED').notNull(),
    homeGoals: integer('home_goals'),
    awayGoals: integer('away_goals'),
    homePenaltiesScored: integer('home_penalties_scored').default(0).notNull(),
    homePenaltiesMissed: integer('home_penalties_missed').default(0).notNull(),
    awayPenaltiesScored: integer('away_penalties_scored').default(0).notNull(),
    awayPenaltiesMissed: integer('away_penalties_missed').default(0).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    fixturesExternalIdIdx: uniqueIndex('fixtures_external_id_idx').on(table.externalId),
    fixturesStatusIdx: index('fixtures_status_idx').on(table.status),
    fixturesScheduledAtIdx: index('fixtures_scheduled_at_idx').on(table.scheduledAt),
  }),
)

export const rounds = pgTable(
  'rounds',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tableId: uuid('table_id')
      .references(() => tables.id, { onDelete: 'cascade' })
      .notNull(),
    roundNumber: integer('round_number').notNull(),
    status: varchar('status', { length: 30 }).default('DEALING').notNull(),
    dealerSeatIndex: smallint('dealer_seat_index').notNull(),
    pot: integer('pot').default(0).notNull(),
    winnerId: uuid('winner_id').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at'),
  },
  (table) => ({
    roundsTableIdIdx: index('rounds_table_id_idx').on(table.tableId),
    roundsStatusIdx: index('rounds_status_idx').on(table.status),
  }),
)

export const roundFixtures = pgTable(
  'round_fixtures',
  {
    roundId: uuid('round_id')
      .references(() => rounds.id, { onDelete: 'cascade' })
      .notNull(),
    fixtureId: uuid('fixture_id')
      .references(() => fixtures.id)
      .notNull(),
  },
  (table) => ({
    roundFixturesPk: primaryKey({ columns: [table.roundId, table.fixtureId] }),
  }),
)

export const playerHands = pgTable(
  'player_hands',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roundId: uuid('round_id')
      .references(() => rounds.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    card1TeamId: varchar('card_1_team_id', { length: 3 }).references(() => teams.id),
    card2TeamId: varchar('card_2_team_id', { length: 3 }).references(() => teams.id),
    hasFolded: boolean('has_folded').default(false).notNull(),
    totalScore: integer('total_score'),
  },
  (table) => ({
    playerHandsRoundIdIdx: index('player_hands_round_id_idx').on(table.roundId),
    playerHandsUserIdIdx: index('player_hands_user_id_idx').on(table.userId),
  }),
)

export const cardScores = pgTable(
  'card_scores',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    handId: uuid('hand_id')
      .references(() => playerHands.id, { onDelete: 'cascade' })
      .notNull(),
    teamId: varchar('team_id', { length: 3 })
      .references(() => teams.id)
      .notNull(),
    fixtureId: uuid('fixture_id')
      .references(() => fixtures.id)
      .notNull(),
    basePoints: integer('base_points').default(0).notNull(),
    highScorerBonus: integer('high_scorer_bonus').default(0).notNull(),
    cleanSheetBonus: integer('clean_sheet_bonus').default(0).notNull(),
    penaltyBonus: integer('penalty_bonus').default(0).notNull(),
    totalPoints: integer('total_points').default(0).notNull(),
  },
  (table) => ({
    cardScoresHandIdIdx: index('card_scores_hand_id_idx').on(table.handId),
  }),
)

export const bets = pgTable(
  'bets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roundId: uuid('round_id')
      .references(() => rounds.id, { onDelete: 'cascade' })
      .notNull(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    bettingRound: smallint('betting_round').notNull(),
    action: varchar('action', { length: 20 }).notNull(),
    amount: integer('amount').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    betsRoundIdIdx: index('bets_round_id_idx').on(table.roundId),
    betsUserIdIdx: index('bets_user_id_idx').on(table.userId),
  }),
)
