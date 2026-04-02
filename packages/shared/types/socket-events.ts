import type {
  BetAction,
  CardScore,
  Confederation,
  GameState,
  ShowdownResult,
  TablePlayer,
  TableStatus,
  TeamCard,
} from './game.types.js'

export interface BetPromptPayload {
  readonly userId: string
  readonly minimumBet: number
  readonly currentBet: number
  readonly pot: number
  readonly chips: number
  readonly allowedActions: readonly BetAction[]
  readonly timeoutMs: number
  readonly promptedAt: number
}

export interface BetUpdatePayload {
  readonly userId: string
  readonly action: BetAction
  readonly amount: number
  readonly pot: number
  readonly currentBet: number
  readonly chips: number
  readonly autoAction?: boolean
}

export interface RoundResultsPayload {
  readonly roundId: string
  readonly cardScores: readonly CardScore[]
  readonly potDistribution: ReadonlyMap<string, number>
}

export interface RoundPausePayload {
  readonly roundId: string
  readonly fixtureIds: readonly string[]
  readonly resumeAt: string
}

export interface FixtureResultPayload {
  readonly fixtureId: string
  readonly homeTeamId: string
  readonly homeTeam: {
    readonly id: string
    readonly name: string
    readonly code: string
    readonly flagUrl: string
  }
  readonly awayTeamId: string
  readonly awayTeam: {
    readonly id: string
    readonly name: string
    readonly code: string
    readonly flagUrl: string
  }
  readonly homeGoals: number
  readonly awayGoals: number
  readonly hasPenalties: boolean
  readonly homePenaltiesScored?: number
  readonly awayPenaltiesScored?: number
}

export interface PlayerScoredPayload {
  readonly userId: string
  readonly seatIndex: number
  readonly username: string
  readonly isBot: boolean
  readonly hand: readonly {
    readonly teamId: string
    readonly team: { readonly name: string; readonly code: string; readonly flagUrl: string }
  }[]
  readonly cardScores: readonly {
    readonly teamId: string
    readonly team: { readonly name: string; readonly code: string; readonly flagUrl: string }
    readonly fixtureId: string
    readonly fixture: {
      readonly homeGoals: number
      readonly awayGoals: number
      readonly side: 'home' | 'away'
      readonly opponentTeam?: {
        readonly name: string
        readonly code: string
        readonly flagUrl: string
      } | null
    }
    readonly baseScore: number
    readonly goalBonus: number
    readonly cleanSheetBonus: number
    readonly penaltyModifier: number
    readonly totalScore: number
  }[]
  readonly totalScore: number
  readonly rank: number
  readonly isWinner: boolean
}

export interface RoundWinnerPayload {
  readonly winnerIds: readonly string[]
  readonly potDistribution: Readonly<Record<string, number>>
  readonly totalPot: number
}

export interface PlayerActionPayload {
  readonly action: BetAction
  readonly amount: number
}

export interface RoundCardPayload {
  readonly teamId: string
  readonly teamName: string
  readonly teamCode: string
  readonly flagEmoji: string
  readonly tier: string
  readonly fifaRanking: number
  readonly fixtureId: string
  // TODO(Soni S4): server must emit confederation — currently omitted, client falls back to 'UEFA'
  readonly confederation?: Confederation
}

export interface RoundStartPayload {
  readonly roundId: string
  readonly roundNumber: number
  readonly dealerSeatIndex: number
  readonly cards: readonly RoundCardPayload[]
  readonly sbSeatIndex: number
  readonly bbSeatIndex: number
  readonly smallBlind: number
  readonly bigBlind: number
}

export interface LobbyTableItem {
  readonly id: string
  readonly name: string
  readonly hostId: string
  readonly status: TableStatus
  readonly startingChips: number
  readonly smallBlind: number
  readonly bigBlind: number
  readonly playerCount: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface ServerToClientEvents {
  'lobby:tables': (payload: { readonly tables: readonly LobbyTableItem[] }) => void
  'table:state': (state: GameState) => void
  'round:start': (payload: RoundStartPayload) => void
  'board:reveal': (cards: readonly TeamCard[]) => void
  'bet:prompt': (payload: BetPromptPayload) => void
  'bet:update': (payload: BetUpdatePayload) => void
  'round:pause': (payload: RoundPausePayload) => void
  'fixture:result': (payload: FixtureResultPayload) => void
  'round:scoring': (payload: { readonly roundId: string }) => void
  'player:scored': (payload: PlayerScoredPayload) => void
  'round:winner': (payload: RoundWinnerPayload) => void
  /** @deprecated Use fixture:result + player:scored + round:winner instead */
  'round:results': (payload: RoundResultsPayload) => void
  /** @deprecated Use player:scored instead */
  'round:showdown': (results: readonly ShowdownResult[]) => void
  'player:joined': (player: TablePlayer) => void
  'player:left': (payload: { readonly userId: string }) => void
  'player:disconnected': (payload: { readonly userId: string }) => void
  'player:eliminated': (payload: { readonly userId: string; readonly finalChips: number }) => void
  'game:over': (payload: {
    readonly winnerId: string
    readonly finalStandings: readonly TablePlayer[]
  }) => void
  'blinds:posted': (payload: {
    readonly sbUserId: string
    readonly sbAmount: number
    readonly bbUserId: string
    readonly bbAmount: number
    readonly pot: number
  }) => void
  'players:update': (
    players: readonly { readonly userId: string; readonly chips: number }[],
  ) => void
  error: (payload: { readonly code: string; readonly message: string }) => void
}

export interface ClientToServerEvents {
  'table:join': (
    payload: { readonly tableId: string },
    callback: (response: { readonly success: boolean; readonly error?: string }) => void,
  ) => void
  'table:leave': (payload: { readonly tableId: string }) => void
  'bet:action': (
    payload: PlayerActionPayload,
    callback: (response: { readonly success: boolean; readonly error?: string }) => void,
  ) => void
  'round:ready': (payload: { readonly roundId: string }) => void
}
