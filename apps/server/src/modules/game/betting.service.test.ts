import { describe, it, expect, afterEach, vi } from 'vitest'
import { initBettingRound, clearBettingState, getAllowedActions } from './betting.service.js'

function makePlayers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${i}`,
    seatIndex: i,
    chipStack: 500,
    hasFolded: false,
  }))
}

const blindInfo5 = {
  sbSeatIndex: 1,
  bbSeatIndex: 2,
  sbAmount: 5,
  bbAmount: 10,
  dealerSeatIndex: 0,
  smallBlind: 5,
  bigBlind: 10,
}

afterEach(() => {
  clearBettingState('test-round')
})

describe('initBettingRound — blind seeding', () => {
  it('seeds pot with blind amounts on round 1', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1, blindInfo5)
    expect(state.pot).toBe(15)
    expect(state.currentBet).toBe(10)
  })

  it('sets totalBet for SB and BB players', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1, blindInfo5)
    const sb = state.playerStates.find((p) => p.seatIndex === 1)!
    const bb = state.playerStates.find((p) => p.seatIndex === 2)!
    expect(sb.totalBet).toBe(5)
    expect(bb.totalBet).toBe(10)
  })

  it('does not seed blinds on round 2+', () => {
    const state = initBettingRound('test-round', makePlayers(5), 2, blindInfo5)
    expect(state.pot).toBe(0)
    expect(state.currentBet).toBe(0)
  })

  it('does not seed blinds when no blindInfo provided', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1)
    expect(state.pot).toBe(0)
    expect(state.currentBet).toBe(0)
  })

  it('stores bbPlayerIndex and bigBlindAmount for BB option detection', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1, blindInfo5)
    expect(state.bbPlayerIndex).toBe(2)
    expect(state.bigBlindAmount).toBe(10)
  })
})

describe('initBettingRound — starting position', () => {
  it('starts at UTG (seat 3) when startingSeatIndex provided', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1, blindInfo5, 3)
    expect(state.playerStates[state.currentPlayerIndex]!.seatIndex).toBe(3)
  })

  it('finds next active seat when target seat is folded', () => {
    const players = makePlayers(5)
    players[3] = { ...players[3]!, hasFolded: true }
    const state = initBettingRound('test-round', players, 1, blindInfo5, 3)
    expect(state.playerStates[state.currentPlayerIndex]!.seatIndex).toBe(4)
  })

  it('starts at first active for post-flop when dealer seat given', () => {
    const state = initBettingRound('test-round', makePlayers(5), 2, blindInfo5, 1)
    expect(state.playerStates[state.currentPlayerIndex]!.seatIndex).toBe(1)
  })

  it('uses first active player when no startingSeatIndex', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1)
    expect(state.currentPlayerIndex).toBe(0)
  })
})

describe('getAllowedActions — BB option', () => {
  it('gives BB CHECK+RAISE when no raise beyond BB', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1, blindInfo5)
    const bbPlayer = state.playerStates[2]!
    const actions = getAllowedActions(state, bbPlayer)
    expect(actions).toContain('CHECK')
    expect(actions).toContain('RAISE')
    expect(actions).not.toContain('CALL')
  })

  it('gives non-BB player CALL when currentBet > totalBet', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1, blindInfo5)
    const utg = state.playerStates[3]!
    const actions = getAllowedActions(state, utg)
    expect(actions).toContain('CALL')
    expect(actions).toContain('FOLD')
    expect(actions).not.toContain('CHECK')
  })

  it('gives SB player CALL (needs to match BB)', () => {
    const state = initBettingRound('test-round', makePlayers(5), 1, blindInfo5)
    const sb = state.playerStates[1]!
    const actions = getAllowedActions(state, sb)
    expect(actions).toContain('CALL')
    expect(actions).not.toContain('CHECK')
  })

  it('gives CHECK to all on round 2 with no bets', () => {
    const state = initBettingRound('test-round', makePlayers(5), 2)
    const player = state.playerStates[0]!
    const actions = getAllowedActions(state, player)
    expect(actions).toContain('CHECK')
    expect(actions).not.toContain('CALL')
  })
})

describe('bet timer', () => {
  it('fires at exactly BET_TIMEOUT_MS (30s) with auto-CHECK', async () => {
    vi.useFakeTimers()
    let firedAction: string | null = null

    // Set up state so the timer guard passes
    initBettingRound('timer-1', makePlayers(3), 1)
    const { startBetTimer } = await import('./betting.service.js')

    startBetTimer('timer-1', 'user-0', ['CHECK', 'FOLD'], async (_rid, _uid, action) => {
      firedAction = action
    })

    vi.advanceTimersByTime(29_999)
    expect(firedAction).toBeNull()

    vi.advanceTimersByTime(1)
    await vi.runAllTimersAsync()
    expect(firedAction).toBe('CHECK')

    clearBettingState('timer-1')
    vi.useRealTimers()
  })

  it('auto-FOLDs when CHECK not in allowedActions', async () => {
    vi.useFakeTimers()
    let firedAction: string | null = null

    // UTG at seat 3 with blinds — CHECK not available
    const state = initBettingRound('timer-2', makePlayers(5), 1, blindInfo5, 3)
    const currentUser = state.playerStates[state.currentPlayerIndex]!
    const { startBetTimer } = await import('./betting.service.js')

    startBetTimer(
      'timer-2',
      currentUser.userId,
      ['FOLD', 'CALL', 'RAISE', 'ALL_IN'],
      async (_rid, _uid, action) => {
        firedAction = action
      },
    )

    vi.advanceTimersByTime(30_000)
    await vi.runAllTimersAsync()
    expect(firedAction).toBe('FOLD')

    clearBettingState('timer-2')
    vi.useRealTimers()
  })

  it('cancels timer when player acts before timeout', async () => {
    vi.useFakeTimers()
    let firedAction: string | null = null

    initBettingRound('timer-3', makePlayers(3), 1)
    const { startBetTimer, cancelBetTimer } = await import('./betting.service.js')

    startBetTimer('timer-3', 'user-0', ['CHECK', 'FOLD'], async (_rid, _uid, action) => {
      firedAction = action
    })

    vi.advanceTimersByTime(15_000)
    cancelBetTimer('timer-3', 'user-0')
    vi.advanceTimersByTime(20_000)
    await vi.runAllTimersAsync()
    expect(firedAction).toBeNull()

    clearBettingState('timer-3')
    vi.useRealTimers()
  })
})
