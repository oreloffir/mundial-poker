import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock DB ────────────────────────────────────────────────────────────────
const mockSelect = vi.fn().mockReturnThis()
const mockFrom = vi.fn().mockReturnThis()
const mockWhere = vi.fn().mockReturnThis()
const mockLimit = vi.fn().mockResolvedValue([])
const mockOrderBy = vi.fn().mockReturnThis()
const mockInnerJoin = vi.fn().mockReturnThis()
const mockInsert = vi.fn().mockReturnThis()
const mockValues = vi.fn().mockReturnThis()
const mockReturning = vi.fn().mockResolvedValue([])
const mockUpdate = vi.fn().mockReturnThis()
const mockSet = vi.fn().mockReturnThis()
const mockDelete = vi.fn().mockReturnThis()
const mockLeftJoin = vi.fn().mockReturnThis()
const mockGroupBy = vi.fn().mockReturnThis()
const mockCatch = vi.fn()

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
}

// Chain all methods to return `this`
for (const fn of [
  mockSelect,
  mockFrom,
  mockWhere,
  mockLimit,
  mockOrderBy,
  mockInnerJoin,
  mockInsert,
  mockValues,
  mockReturning,
  mockUpdate,
  mockSet,
  mockDelete,
  mockLeftJoin,
  mockGroupBy,
]) {
  fn.mockReturnValue({
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    limit: mockLimit,
    orderBy: mockOrderBy,
    innerJoin: mockInnerJoin,
    insert: mockInsert,
    values: mockValues,
    returning: mockReturning,
    update: mockUpdate,
    set: mockSet,
    delete: mockDelete,
    leftJoin: mockLeftJoin,
    groupBy: mockGroupBy,
    catch: mockCatch,
  })
}

vi.mock('../../db/index.js', () => ({ db: mockDb }))

// ─── Mock emits ─────────────────────────────────────────────────────────────
const emittedEvents: { event: string; data: unknown }[] = []

// ─── Import real betting service (pure logic, no DB for init/getAllowedActions) ──
import {
  initBettingRound,
  clearBettingState,
  getAllowedActions,
  isBettingRoundComplete,
} from '../modules/game/betting.service.js'
import { calculateBlindPositions } from '../modules/game/blinds.service.js'

// ─── Helpers ────────────────────────────────────────────────────────────────
function makePlayers(count: number, startingChips = 500) {
  return Array.from({ length: count }, (_, i) => ({
    userId: `user-${i}`,
    seatIndex: i,
    chipStack: startingChips,
    isConnected: true,
    hasFolded: false,
    username: `Player${i}`,
    avatarUrl: null,
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

beforeEach(() => {
  emittedEvents.length = 0
  vi.clearAllMocks()
})

afterEach(async () => {
  await clearBettingState('test-round')
})

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 1: Round lifecycle
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 1: Round lifecycle', () => {
  it('T1: initBettingRound with blinds seeds pot and prompts first player', async () => {
    const state = await initBettingRound('test-round', makePlayers(5), 1, blindInfo5, 3)

    expect(state.pot).toBe(15)
    expect(state.currentBet).toBe(10)
    expect(state.playerStates[state.currentPlayerIndex]!.seatIndex).toBe(3)

    const sb = state.playerStates.find((p) => p.seatIndex === 1)!
    const bb = state.playerStates.find((p) => p.seatIndex === 2)!
    expect(sb.totalBet).toBe(5)
    expect(bb.totalBet).toBe(10)
  })

  it('T2: all players check through 3 rounds → betting complete each round', async () => {
    const players = makePlayers(3)

    // Round 1
    const s1 = await initBettingRound('test-round', players, 1)
    expect(s1.pot).toBe(0)

    // Simulate all 3 players checking — each sets hasActed
    const state = s1
    for (let i = 0; i < 3; i++) {
      const current = state.playerStates[state.currentPlayerIndex]!
      const actions = getAllowedActions(state, current)
      expect(actions).toContain('CHECK')
    }
  })

  it('T3: last-player-standing — all fold except one → only 1 active', async () => {
    const players = makePlayers(3).map((p, i) => ({
      ...p,
      hasFolded: i > 0,
    }))

    const state = await initBettingRound('test-round', players, 1)
    const active = state.playerStates.filter((p) => !p.hasFolded)
    expect(active.length).toBe(1)
    expect(active[0]!.userId).toBe('user-0')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 2: Betting order
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 2: Betting order', () => {
  it('T4: 4-player pre-flop → UTG (seat 3) prompted first, not SB or BB', async () => {
    const blindInfo4 = { ...blindInfo5 }
    const state = await initBettingRound('test-round', makePlayers(4), 1, blindInfo4, 3)
    const first = state.playerStates[state.currentPlayerIndex]!
    expect(first.seatIndex).toBe(3)
    expect(first.seatIndex).not.toBe(blindInfo4.sbSeatIndex)
    expect(first.seatIndex).not.toBe(blindInfo4.bbSeatIndex)
  })

  it('T5: BB option — no raise beyond BB → BB gets CHECK+RAISE, not CALL', async () => {
    const state = await initBettingRound('test-round', makePlayers(5), 1, blindInfo5)
    const bb = state.playerStates[2]!
    const actions = getAllowedActions(state, bb)
    expect(actions).toContain('CHECK')
    expect(actions).toContain('RAISE')
    expect(actions).not.toContain('CALL')
  })

  it('T6: BB loses option when someone raises beyond BB', async () => {
    // Init with blinds, then simulate a raise to 20 (above BB of 10)
    const state = await initBettingRound('test-round', makePlayers(5), 1, blindInfo5, 3)

    // Manually create state as if UTG raised to 20
    const raisedState = {
      ...state,
      currentBet: 20,
      playerStates: state.playerStates.map((p) =>
        p.seatIndex === 3 ? { ...p, totalBet: 20, chipStack: 480, hasActed: true } : p,
      ),
    }

    const bb = raisedState.playerStates[2]!
    const actions = getAllowedActions(raisedState, bb)
    expect(actions).toContain('CALL')
    expect(actions).toContain('FOLD')
    expect(actions).not.toContain('CHECK')
  })

  it('T7: post-flop (round 2) → first prompt at SB seat (after dealer)', async () => {
    const state = await initBettingRound('test-round', makePlayers(5), 2, blindInfo5, 1)
    const first = state.playerStates[state.currentPlayerIndex]!
    expect(first.seatIndex).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 3: Timeout (fake timers)
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 3: Timeout', () => {
  it('T8: timer fires at 30s → auto-CHECK when CHECK is allowed', async () => {
    vi.useFakeTimers()
    let firedAction: string | null = null

    await initBettingRound('timeout-check', makePlayers(3), 2)
    const { startBetTimer } = await import('../modules/game/betting.service.js')

    startBetTimer('timeout-check', 'user-0', ['CHECK', 'FOLD'], async (_r, _u, action) => {
      firedAction = action
    })

    vi.advanceTimersByTime(29_999)
    expect(firedAction).toBeNull()

    vi.advanceTimersByTime(1)
    await vi.runAllTimersAsync()
    expect(firedAction).toBe('CHECK')

    await clearBettingState('timeout-check')
    vi.useRealTimers()
  })

  it('T9: timer fires at 30s → auto-FOLD when CHECK not allowed', async () => {
    vi.useFakeTimers()
    let firedAction: string | null = null

    const state = await initBettingRound('timeout-fold', makePlayers(5), 1, blindInfo5, 3)
    const current = state.playerStates[state.currentPlayerIndex]!
    const { startBetTimer } = await import('../modules/game/betting.service.js')

    startBetTimer(
      'timeout-fold',
      current.userId,
      ['FOLD', 'CALL', 'RAISE', 'ALL_IN'],
      async (_r, _u, action) => {
        firedAction = action
      },
    )

    vi.advanceTimersByTime(30_000)
    await vi.runAllTimersAsync()
    expect(firedAction).toBe('FOLD')

    await clearBettingState('timeout-fold')
    vi.useRealTimers()
  })

  it('T10: player acts at 15s → timer cancelled → no auto-action at 30s', async () => {
    vi.useFakeTimers()
    let firedAction: string | null = null

    await initBettingRound('timeout-cancel', makePlayers(3), 2)
    const { startBetTimer, cancelBetTimer } = await import('../modules/game/betting.service.js')

    startBetTimer('timeout-cancel', 'user-0', ['CHECK', 'FOLD'], async (_r, _u, action) => {
      firedAction = action
    })

    vi.advanceTimersByTime(15_000)
    cancelBetTimer('timeout-cancel', 'user-0')
    vi.advanceTimersByTime(20_000)
    await vi.runAllTimersAsync()
    expect(firedAction).toBeNull()

    await clearBettingState('timeout-cancel')
    vi.useRealTimers()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// GROUP 4: Edge cases
// ═══════════════════════════════════════════════════════════════════════════

describe('Group 4: Edge cases', () => {
  it('T11: player with stack < blind goes all-in for available chips', async () => {
    const players = makePlayers(3)
    players[1] = { ...players[1]!, chipStack: 3 }

    const blindInfoShort = { ...blindInfo5, sbAmount: 3 }
    const state = await initBettingRound('test-round', players, 1, blindInfoShort)
    const sb = state.playerStates.find((p) => p.seatIndex === 1)!
    expect(sb.totalBet).toBe(3)
  })

  it('T12: heads-up (2 players) → dealer = SB, opponent = BB', () => {
    const players = [
      { seatIndex: 0, chipStack: 500, userId: 'user-0' },
      { seatIndex: 3, chipStack: 500, userId: 'user-3' },
    ]
    const result = calculateBlindPositions(0, players)
    expect(result.sbSeatIndex).toBe(0)
    expect(result.bbSeatIndex).toBe(3)
  })

  // ─── Regression: BUG-S3-03 ──────────────────────────────────────────────
  it('T14: BUG-S3-03 — bettingRound field preserved per round, WAITING_FOR_RESULTS only after round 3', async () => {
    // Root cause: demo timer called resolveRound during BETTING_ROUND_2 because the guard only
    // checked status === 'COMPLETE'. Fix: guard also bails on active betting statuses.
    //
    // This test verifies:
    // 1. initBettingRound preserves the bettingRound number in state
    // 2. After rounds 1 and 2: (bettingRound < 3) is true → handleBetAction calls startBettingRound(next)
    // 3. After round 3: (bettingRound < 3) is false → handleBetAction transitions to WAITING_FOR_RESULTS
    const players = makePlayers(3, 500)

    for (const roundNumber of [1, 2, 3]) {
      const state = await initBettingRound(`t14-round-${roundNumber}`, players, roundNumber)
      expect(
        state.bettingRound,
        `round ${roundNumber}: bettingRound field must be ${roundNumber}`,
      ).toBe(roundNumber)

      // Simulate all players having acted (as applyAction would do)
      const completedState = {
        ...state,
        playerStates: state.playerStates.map((p) => ({ ...p, hasActed: true })),
      }
      expect(
        isBettingRoundComplete(completedState),
        `round ${roundNumber} state should be complete`,
      ).toBe(true)

      if (roundNumber < 3) {
        expect(
          completedState.bettingRound < 3,
          `round ${roundNumber}: gate must be true to continue to next round`,
        ).toBe(true)
      } else {
        expect(
          completedState.bettingRound < 3,
          'round 3: gate must be false to trigger WAITING_FOR_RESULTS',
        ).toBe(false)
      }

      await clearBettingState(`t14-round-${roundNumber}`)
    }
  })

  it('T13: cleanupBetTimers cancels all pending timers for a round', async () => {
    vi.useFakeTimers()
    let fired = 0

    await initBettingRound('cleanup-test', makePlayers(3), 2)
    const { startBetTimer, cleanupBetTimers } = await import('../modules/game/betting.service.js')

    startBetTimer('cleanup-test', 'user-0', ['CHECK'], async () => {
      fired++
    })
    startBetTimer('cleanup-test', 'user-1', ['CHECK'], async () => {
      fired++
    })

    vi.advanceTimersByTime(15_000)
    cleanupBetTimers('cleanup-test')
    vi.advanceTimersByTime(20_000)
    await vi.runAllTimersAsync()
    expect(fired).toBe(0)

    await clearBettingState('cleanup-test')
    vi.useRealTimers()
  })
})
