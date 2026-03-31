export type TeamTier = 'S' | 'A' | 'B' | 'C'

export type Confederation = 'UEFA' | 'CONMEBOL' | 'CONCACAF' | 'CAF' | 'AFC' | 'OFC'

export type TableStatus = 'WAITING' | 'IN_PROGRESS' | 'PAUSED_FOR_MATCHES' | 'COMPLETED'

export type RoundStatus =
  | 'DEALING'
  | 'BOARD_REVEALED'
  | 'BETTING_ROUND_1'
  | 'BETTING_ROUND_2'
  | 'BETTING_ROUND_3'
  | 'WAITING_FOR_RESULTS'
  | 'SCORING'
  | 'SHOWDOWN'
  | 'COMPLETE'

export type MatchStage =
  | 'GROUP'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'THIRD_PLACE'
  | 'FINAL'

export type FixtureStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'DEMO'

export type BetAction = 'CHECK' | 'CALL' | 'RAISE' | 'FOLD' | 'ALL_IN'

export interface User {
  readonly id: string
  readonly username: string
  readonly avatarUrl: string
  readonly createdAt: string
}

export interface Team {
  readonly id: string
  readonly name: string
  readonly code: string
  readonly flagUrl: string
  readonly tier: TeamTier
  readonly confederation: Confederation
  readonly fifaRanking: number
}

export interface Blinds {
  readonly small: number
  readonly big: number
}

export interface TablePlayer {
  readonly userId: string
  readonly username: string
  readonly avatarUrl: string
  readonly chips: number
  readonly seatIndex: number
  readonly isConnected: boolean
  readonly isEliminated: boolean
}

export interface Table {
  readonly id: string
  readonly name: string
  readonly status: TableStatus
  readonly players: readonly TablePlayer[]
  readonly maxPlayers: number
  readonly blinds: Blinds
  readonly currentRoundId: string | null
  readonly createdAt: string
}

export interface TeamCard {
  readonly teamId: string
  readonly team: Team
  readonly fixtureId: string
}

export interface PlayerHand {
  readonly userId: string
  readonly cards: readonly TeamCard[]
}

export interface MatchResult {
  readonly homeScore: number
  readonly awayScore: number
  readonly homePenalties: number | null
  readonly awayPenalties: number | null
  readonly homeRedCards: number
  readonly awayRedCards: number
}

export interface Fixture {
  readonly id: string
  readonly homeTeamId: string
  readonly awayTeamId: string
  readonly homeTeam: Team
  readonly awayTeam: Team
  readonly stage: MatchStage
  readonly status: FixtureStatus
  readonly kickoffTime: string
  readonly result: MatchResult | null
}

export interface CardScore {
  readonly teamId: string
  readonly fixtureId: string
  readonly baseScore: number
  readonly goalBonus: number
  readonly cleanSheetBonus: number
  readonly penaltyModifier: number
  readonly totalScore: number
}

export interface Bet {
  readonly userId: string
  readonly action: BetAction
  readonly amount: number
  readonly timestamp: string
}

export interface BettingRound {
  readonly roundNumber: number
  readonly bets: readonly Bet[]
  readonly pot: number
  readonly currentBet: number
  readonly activePlayerIds: readonly string[]
}

export interface Round {
  readonly id: string
  readonly tableId: string
  readonly roundNumber: number
  readonly status: RoundStatus
  readonly board: readonly TeamCard[]
  readonly hands: readonly PlayerHand[]
  readonly bettingRounds: readonly BettingRound[]
  readonly pot: number
  readonly dealerSeatIndex: number
  readonly fixtures: readonly Fixture[]
}

export interface ShowdownResult {
  readonly userId: string
  readonly hand: readonly TeamCard[]
  readonly totalScore: number
  readonly cardScores: readonly CardScore[]
}

export interface GameState {
  readonly table: Table
  readonly currentRound: Round | null
  readonly showdownResults: readonly ShowdownResult[] | null
}
