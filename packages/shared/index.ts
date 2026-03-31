export type {
  BetAction,
  Bet,
  BettingRound,
  Blinds,
  CardScore,
  Confederation,
  Fixture,
  FixtureStatus,
  GameState,
  MatchResult,
  MatchStage,
  PlayerHand,
  Round,
  RoundStatus,
  ShowdownResult,
  Table,
  TablePlayer,
  TableStatus,
  Team,
  TeamCard,
  TeamTier,
  User,
} from './types/game.types.js'

export type {
  BetPromptPayload,
  BetUpdatePayload,
  ClientToServerEvents,
  PlayerActionPayload,
  RoundCardPayload,
  RoundPausePayload,
  RoundResultsPayload,
  RoundStartPayload,
  ServerToClientEvents,
} from './types/socket-events.js'

export { calculateCardScore, calculateHandScore, determineWinners } from './utils/scoring.js'
