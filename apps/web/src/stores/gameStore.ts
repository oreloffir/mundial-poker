// gameStore — single source of truth for all in-game state.
// Written exclusively by useGameSocket (server events) and BettingControls (local UI).
// Reset on round:start (via store.setState — atomic, one render) and on table leave (via reset()).
import { create } from 'zustand'
import type { Table, Round, TeamCard, Fixture, CardScoreData } from '@wpc/shared'

// ─── J12 Showdown Phase Types ────────────────────────────────────────────────

export interface PlayerScoredData {
  readonly userId: string
  readonly seatIndex: number
  readonly username: string
  readonly isBot: boolean
  readonly hand: readonly {
    readonly teamId: string
    readonly team: { readonly name: string; readonly code: string; readonly flagUrl: string }
  }[]
  readonly cardScores: readonly CardScoreData[]
  readonly totalScore: number
  readonly rank: number
  readonly isWinner: boolean
}

export type ShowdownPhase = 'idle' | 'waiting' | 'fixtures' | 'calculating' | 'reveals' | 'winner'

export interface FixtureResultEvent {
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

export interface RoundWinnerData {
  readonly winnerIds: readonly string[]
  readonly potDistribution: Readonly<Record<string, number>>
  readonly totalPot: number
}

export type { CardScoreData }

interface ActiveTurn {
  readonly userId: string
  readonly startedAt: number
  readonly timeoutMs: number
}

interface PlayerAction {
  readonly action: string
  readonly amount: number
  readonly timestamp: number
}

interface BetPromptState {
  readonly minimumBet: number
  readonly currentBet: number
  readonly pot: number
  readonly chips: number
  readonly allowedActions: readonly string[]
  readonly timeoutMs: number
  readonly promptedAt: number
}

interface GameState {
  readonly table: Table | null
  readonly currentRound: Round | null
  readonly myHand: readonly TeamCard[] | null
  readonly myTurn: boolean
  readonly fixtures: readonly Fixture[]
  readonly waitingForResults: boolean
  readonly betPrompt: BetPromptState | null
  readonly activeTurn: ActiveTurn | null
  readonly playerActions: Readonly<Record<string, PlayerAction>>
  readonly foldedPlayerIds: readonly string[]
  readonly revealedFixtureCount: number
  readonly potFlashKey: number
  readonly error: string | null
  readonly sbSeatIndex: number | null
  readonly bbSeatIndex: number | null

  // ─── Showdown phase state machine ──────────────────────────────────────────
  readonly showdownPhase: ShowdownPhase
  /** Fixture results arriving one at a time during the 30s wait (fixture:result events) */
  readonly fixtureResults: readonly FixtureResultEvent[]
  /** Player score reveals building up as player:scored events arrive (lowest score first) */
  readonly playerScoreReveals: readonly PlayerScoredData[]
  /** Index of the player currently being revealed (-1 = none) */
  readonly currentRevealIndex: number
  /** Set when round:winner fires */
  readonly winnerData: RoundWinnerData | null

  readonly setTable: (table: Table) => void
  readonly setRound: (round: Round) => void
  readonly setMyHand: (hand: readonly TeamCard[]) => void
  readonly setMyTurn: (turn: boolean) => void
  readonly setFixtures: (fixtures: readonly Fixture[]) => void
  readonly setWaitingForResults: (waiting: boolean) => void
  readonly setBetPrompt: (prompt: BetPromptState | null) => void
  readonly setActiveTurn: (turn: ActiveTurn | null) => void
  readonly setPlayerAction: (userId: string, action: PlayerAction) => void
  readonly addFoldedPlayer: (userId: string) => void
  readonly setRevealedFixtureCount: (count: number) => void
  readonly triggerPotFlash: () => void
  readonly resetRoundState: () => void
  readonly setBlindPositions: (sb: number | null, bb: number | null) => void
  readonly setError: (error: string | null) => void
  readonly reset: () => void

  // ─── Showdown phase actions ─────────────────────────────────────────────────
  readonly setShowdownPhase: (phase: ShowdownPhase) => void
  readonly addFixtureResult: (result: FixtureResultEvent) => void
  readonly addPlayerScoreReveal: (result: PlayerScoredData) => void
  readonly setWinnerData: (data: RoundWinnerData | null) => void
  readonly resetShowdownPhase: () => void
}

const initialState = {
  table: null,
  currentRound: null,
  myHand: null,
  myTurn: false,
  fixtures: [],
  waitingForResults: false,
  betPrompt: null,
  activeTurn: null,
  playerActions: {} as Readonly<Record<string, PlayerAction>>,
  foldedPlayerIds: [] as readonly string[],
  revealedFixtureCount: -1,
  potFlashKey: 0,
  error: null,
  sbSeatIndex: null as number | null,
  bbSeatIndex: null as number | null,
  showdownPhase: 'idle' as ShowdownPhase,
  fixtureResults: [] as readonly FixtureResultEvent[],
  playerScoreReveals: [] as readonly PlayerScoredData[],
  currentRevealIndex: -1,
  winnerData: null as RoundWinnerData | null,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setTable: (table) => set({ table }),
  setRound: (round) => set({ currentRound: round }),
  setMyHand: (hand) => set({ myHand: hand }),
  setMyTurn: (turn) => set({ myTurn: turn }),
  setFixtures: (fixtures) => set({ fixtures }),
  setWaitingForResults: (waiting) => set({ waitingForResults: waiting }),
  setBetPrompt: (prompt) => set({ betPrompt: prompt }),
  setActiveTurn: (turn) => set({ activeTurn: turn }),
  setPlayerAction: (userId, action) =>
    set((s) => ({ playerActions: { ...s.playerActions, [userId]: action } })),
  addFoldedPlayer: (userId) => set((s) => ({ foldedPlayerIds: [...s.foldedPlayerIds, userId] })),
  setRevealedFixtureCount: (count) => set({ revealedFixtureCount: count }),
  triggerPotFlash: () => set((s) => ({ potFlashKey: s.potFlashKey + 1 })),
  resetRoundState: () =>
    set({
      playerActions: {},
      foldedPlayerIds: [],
      activeTurn: null,
      betPrompt: null,
      myTurn: false,
      potFlashKey: 0,
      sbSeatIndex: null,
      bbSeatIndex: null,
    }),
  setBlindPositions: (sb, bb) => set({ sbSeatIndex: sb, bbSeatIndex: bb }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
  setShowdownPhase: (phase) => set({ showdownPhase: phase }),
  addFixtureResult: (result) => set((s) => ({ fixtureResults: [...s.fixtureResults, result] })),
  addPlayerScoreReveal: (result) =>
    set((s) => ({
      playerScoreReveals: [...s.playerScoreReveals, result],
      currentRevealIndex: s.playerScoreReveals.length,
    })),
  setWinnerData: (data) => set({ winnerData: data }),
  resetShowdownPhase: () =>
    set({
      showdownPhase: 'idle',
      fixtureResults: [],
      playerScoreReveals: [],
      currentRevealIndex: -1,
      winnerData: null,
    }),
}))
