import { create } from 'zustand'
import type { Table, Round, TeamCard, BettingRound, Fixture, ShowdownResult } from '@wpc/shared'

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
}

interface GameState {
  readonly table: Table | null
  readonly currentRound: Round | null
  readonly myHand: readonly TeamCard[] | null
  readonly myTurn: boolean
  readonly bettingRound: BettingRound | null
  readonly fixtures: readonly Fixture[]
  readonly showdownResults: readonly ShowdownResult[] | null
  readonly waitingForResults: boolean
  readonly demoCountdown: number | null
  readonly betPrompt: BetPromptState | null
  readonly activeTurn: ActiveTurn | null
  readonly playerActions: Readonly<Record<string, PlayerAction>>
  readonly foldedPlayerIds: readonly string[]
  readonly revealedFixtureCount: number
  readonly potFlashKey: number
  readonly error: string | null
  // J4: blind position seat indices (null until round:start provides them)
  readonly sbSeatIndex: number | null
  readonly bbSeatIndex: number | null
  readonly setTable: (table: Table) => void
  readonly setRound: (round: Round) => void
  readonly setMyHand: (hand: readonly TeamCard[]) => void
  readonly setBettingRound: (br: BettingRound | null) => void
  readonly setMyTurn: (turn: boolean) => void
  readonly setFixtures: (fixtures: readonly Fixture[]) => void
  readonly setShowdownResults: (results: readonly ShowdownResult[] | null) => void
  readonly setWaitingForResults: (waiting: boolean) => void
  readonly setDemoCountdown: (countdown: number | null) => void
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
}

const initialState = {
  table: null,
  currentRound: null,
  myHand: null,
  myTurn: false,
  bettingRound: null,
  fixtures: [],
  showdownResults: null,
  waitingForResults: false,
  demoCountdown: null,
  betPrompt: null,
  activeTurn: null,
  playerActions: {} as Readonly<Record<string, PlayerAction>>,
  foldedPlayerIds: [] as readonly string[],
  revealedFixtureCount: -1,
  potFlashKey: 0,
  error: null,
  // J4: stub with hardcoded values — swap to real socket data once Soni's S1 merges
  sbSeatIndex: 1 as number | null,
  bbSeatIndex: 2 as number | null,
}

export const useGameStore = create<GameState>((set) => ({
  ...initialState,
  setTable: (table) => set({ table }),
  setRound: (round) => set({ currentRound: round }),
  setMyHand: (hand) => set({ myHand: hand }),
  setBettingRound: (br) => set({ bettingRound: br }),
  setMyTurn: (turn) => set({ myTurn: turn }),
  setFixtures: (fixtures) => set({ fixtures }),
  setShowdownResults: (results) => set({ showdownResults: results }),
  setWaitingForResults: (waiting) => set({ waitingForResults: waiting }),
  setDemoCountdown: (countdown) => set({ demoCountdown: countdown }),
  setBetPrompt: (prompt) => set({ betPrompt: prompt }),
  setActiveTurn: (turn) => set({ activeTurn: turn }),
  setPlayerAction: (userId, action) =>
    set((s) => ({ playerActions: { ...s.playerActions, [userId]: action } })),
  addFoldedPlayer: (userId) => set((s) => ({ foldedPlayerIds: [...s.foldedPlayerIds, userId] })),
  setRevealedFixtureCount: (count) => set({ revealedFixtureCount: count }),
  triggerPotFlash: () => set((s) => ({ potFlashKey: s.potFlashKey + 1 })),
  resetRoundState: () => set({ playerActions: {}, foldedPlayerIds: [], activeTurn: null, betPrompt: null, myTurn: false, potFlashKey: 0, sbSeatIndex: null, bbSeatIndex: null }),
  setBlindPositions: (sb, bb) => set({ sbSeatIndex: sb, bbSeatIndex: bb }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}))
