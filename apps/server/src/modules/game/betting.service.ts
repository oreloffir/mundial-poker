import { db } from '../../db/index.js'
import { bets } from '../../db/schema.js'
import { GameError } from '../../shared/errors.js'
import type { BetAction } from '@wpc/shared'

interface PlayerState {
  readonly userId: string
  readonly seatIndex: number
  readonly hasFolded: boolean
  readonly totalBet: number
  readonly chipStack: number
  readonly hasActed: boolean
}

export interface BettingState {
  readonly roundId: string
  readonly bettingRound: number
  readonly currentBet: number
  readonly currentPlayerIndex: number
  readonly playerStates: readonly PlayerState[]
  readonly pot: number
}

const activeBettingStates = new Map<string, BettingState>()

export function getBettingState(roundId: string): BettingState | undefined {
  return activeBettingStates.get(roundId)
}

export function clearBettingState(roundId: string): void {
  activeBettingStates.delete(roundId)
}

interface BlindSeedInfo {
  readonly sbSeatIndex: number
  readonly bbSeatIndex: number
  readonly sbAmount: number
  readonly bbAmount: number
  readonly dealerSeatIndex: number
  readonly smallBlind: number
  readonly bigBlind: number
}

export function initBettingRound(
  roundId: string,
  players: readonly {
    readonly userId: string
    readonly seatIndex: number
    readonly chipStack: number
    readonly hasFolded: boolean
  }[],
  bettingRoundNumber: number,
  blindInfo?: BlindSeedInfo,
): BettingState {
  let playerStates: PlayerState[] = players.map((p) => ({
    userId: p.userId,
    seatIndex: p.seatIndex,
    hasFolded: p.hasFolded,
    totalBet: 0,
    chipStack: p.chipStack,
    hasActed: p.hasFolded,
  }))

  let currentBet = 0
  let pot = 0

  if (bettingRoundNumber === 1 && blindInfo) {
    playerStates = playerStates.map((p) => {
      if (p.seatIndex === blindInfo.sbSeatIndex) {
        return { ...p, totalBet: blindInfo.sbAmount, hasActed: false }
      }
      if (p.seatIndex === blindInfo.bbSeatIndex) {
        return { ...p, totalBet: blindInfo.bbAmount, hasActed: false }
      }
      return p
    })
    currentBet = blindInfo.bbAmount
    pot = blindInfo.sbAmount + blindInfo.bbAmount
  }

  const firstActiveIndex = playerStates.findIndex((p) => !p.hasFolded && p.chipStack > 0)

  const state: BettingState = {
    roundId,
    bettingRound: bettingRoundNumber,
    currentBet,
    currentPlayerIndex: firstActiveIndex >= 0 ? firstActiveIndex : 0,
    playerStates,
    pot,
  }

  activeBettingStates.set(roundId, state)
  console.log('BettingService - initBettingRound', {
    roundId,
    bettingRound: bettingRoundNumber,
    playerCount: players.length,
  })
  return state
}

export function getNextActivePlayer(state: BettingState): number {
  const count = state.playerStates.length
  let idx = (state.currentPlayerIndex + 1) % count

  for (let i = 0; i < count; i++) {
    const player = state.playerStates[idx]!
    if (!player.hasFolded && !player.hasActed && player.chipStack > 0) return idx
    idx = (idx + 1) % count
  }

  return -1
}

export function getActivePlayers(state: BettingState): readonly PlayerState[] {
  return state.playerStates.filter((p) => !p.hasFolded)
}

export function isOnlyOnePlayerLeft(state: BettingState): boolean {
  return getActivePlayers(state).length <= 1
}

export function isBettingRoundComplete(state: BettingState): boolean {
  const active = getActivePlayers(state)
  if (active.length <= 1) return true

  const canAct = active.filter((p) => p.chipStack > 0)
  return canAct.every((p) => p.hasActed && p.totalBet >= state.currentBet)
}

function getAllowedActions(state: BettingState, player: PlayerState): readonly BetAction[] {
  const actions: BetAction[] = ['FOLD']

  if (state.currentBet === player.totalBet) {
    actions.push('CHECK')
  }

  if (
    state.currentBet > player.totalBet &&
    player.chipStack >= state.currentBet - player.totalBet
  ) {
    actions.push('CALL')
  }

  if (player.chipStack > state.currentBet - player.totalBet) {
    actions.push('RAISE')
  }

  if (player.chipStack > 0) {
    actions.push('ALL_IN')
  }

  return actions
}

export function validateAction(
  state: BettingState,
  userId: string,
  action: BetAction,
  amount: number,
): void {
  const playerIndex = state.playerStates.findIndex((p) => p.userId === userId)
  if (playerIndex === -1) {
    throw new GameError('Player not found in this round')
  }

  const player = state.playerStates[playerIndex]!

  if (playerIndex !== state.currentPlayerIndex) {
    throw new GameError('Not your turn')
  }

  if (player.hasFolded) {
    throw new GameError('Player has already folded')
  }

  const allowed = getAllowedActions(state, player)
  if (!allowed.includes(action)) {
    throw new GameError(`Action ${action} is not allowed right now`)
  }

  switch (action) {
    case 'CHECK':
      if (state.currentBet !== player.totalBet) {
        throw new GameError('Cannot check when there is a bet to match')
      }
      break
    case 'CALL': {
      const callAmount = state.currentBet - player.totalBet
      if (player.chipStack < callAmount) {
        throw new GameError('Not enough chips to call')
      }
      break
    }
    case 'RAISE':
      if (amount <= state.currentBet) {
        throw new GameError('Raise must be greater than the current bet')
      }
      if (amount - player.totalBet > player.chipStack) {
        throw new GameError('Not enough chips for this raise')
      }
      break
    case 'FOLD':
      break
    case 'ALL_IN':
      break
  }
}

export async function applyAction(
  state: BettingState,
  userId: string,
  action: BetAction,
  amount: number,
): Promise<BettingState> {
  const playerIndex = state.playerStates.findIndex((p) => p.userId === userId)
  const player = state.playerStates[playerIndex]!

  let betAmount = 0
  let newCurrentBet = state.currentBet
  let updatedPlayer: PlayerState

  switch (action) {
    case 'CHECK':
      updatedPlayer = { ...player, hasActed: true }
      break
    case 'CALL': {
      betAmount = Math.min(state.currentBet - player.totalBet, player.chipStack)
      updatedPlayer = {
        ...player,
        totalBet: player.totalBet + betAmount,
        chipStack: player.chipStack - betAmount,
        hasActed: true,
      }
      break
    }
    case 'RAISE': {
      betAmount = amount - player.totalBet
      newCurrentBet = amount
      updatedPlayer = {
        ...player,
        totalBet: amount,
        chipStack: player.chipStack - betAmount,
        hasActed: true,
      }
      break
    }
    case 'ALL_IN': {
      betAmount = player.chipStack
      const newTotal = player.totalBet + betAmount
      if (newTotal > state.currentBet) {
        newCurrentBet = newTotal
      }
      updatedPlayer = {
        ...player,
        totalBet: newTotal,
        chipStack: 0,
        hasActed: true,
      }
      break
    }
    case 'FOLD':
      updatedPlayer = { ...player, hasFolded: true, hasActed: true }
      break
    default:
      throw new GameError(`Unknown action: ${action}`)
  }

  await db.insert(bets).values({
    roundId: state.roundId,
    userId,
    bettingRound: state.bettingRound,
    action,
    amount: betAmount,
  })

  const resetOnRaise =
    action === 'RAISE' || (action === 'ALL_IN' && updatedPlayer.totalBet > state.currentBet)

  const newPlayerStates: PlayerState[] = state.playerStates.map((p, i) => {
    if (i === playerIndex) return updatedPlayer
    if (resetOnRaise && !p.hasFolded && p.chipStack > 0) {
      return { ...p, hasActed: false }
    }
    return p
  })

  if (resetOnRaise) {
    const raiserState = newPlayerStates[playerIndex]!
    newPlayerStates[playerIndex] = { ...raiserState, hasActed: true }
  }

  const nextIndex = findNextActiveIndex(newPlayerStates, playerIndex)

  const newState: BettingState = {
    ...state,
    currentBet: newCurrentBet,
    currentPlayerIndex: nextIndex,
    playerStates: newPlayerStates,
    pot: state.pot + betAmount,
  }

  activeBettingStates.set(state.roundId, newState)
  console.log('BettingService - applyAction', {
    roundId: state.roundId,
    userId,
    action,
    betAmount,
    pot: newState.pot,
  })
  return newState
}

function findNextActiveIndex(players: readonly PlayerState[], currentIndex: number): number {
  const count = players.length
  let idx = (currentIndex + 1) % count

  for (let i = 0; i < count; i++) {
    const p = players[idx]!
    if (!p.hasFolded && !p.hasActed && p.chipStack > 0) return idx
    idx = (idx + 1) % count
  }

  return currentIndex
}

export { getAllowedActions }
