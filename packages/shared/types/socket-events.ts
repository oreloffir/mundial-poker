import type {
  BetAction,
  CardScore,
  GameState,
  ShowdownResult,
  TablePlayer,
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
}

export interface BetUpdatePayload {
  readonly userId: string
  readonly action: BetAction
  readonly amount: number
  readonly pot: number
  readonly currentBet: number
  readonly chips: number
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

export interface ServerToClientEvents {
  'table:state': (state: GameState) => void
  'round:start': (payload: RoundStartPayload) => void
  'board:reveal': (cards: readonly TeamCard[]) => void
  'bet:prompt': (payload: BetPromptPayload) => void
  'bet:update': (payload: BetUpdatePayload) => void
  'round:pause': (payload: RoundPausePayload) => void
  'round:results': (payload: RoundResultsPayload) => void
  'round:showdown': (results: readonly ShowdownResult[]) => void
  'player:joined': (player: TablePlayer) => void
  'player:left': (payload: { readonly userId: string }) => void
  'player:disconnected': (payload: { readonly userId: string }) => void
  'player:eliminated': (payload: { readonly userId: string; readonly finalChips: number }) => void
  'game:over': (payload: {
    readonly winnerId: string
    readonly finalStandings: readonly TablePlayer[]
  }) => void
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
