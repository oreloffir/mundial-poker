import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Hoisted mock state ─────────────────────────────────────────────────────

const { mockStore, mockHandleBetAction, mockDbChain } = vi.hoisted(() => {
  const mockStore = new Map<string, string>()
  const mockHandleBetAction = vi.fn().mockResolvedValue(undefined)

  const mockDbChain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = ['select', 'from', 'where', 'limit', 'orderBy', 'innerJoin', 'insert', 'values', 'update', 'set', 'delete', 'catch']
  for (const m of methods) {
    mockDbChain[m] = vi.fn()
  }
  for (const m of methods) {
    mockDbChain[m]!.mockReturnValue(mockDbChain)
  }
  mockDbChain['limit']!.mockResolvedValue([])

  return { mockStore, mockHandleBetAction, mockDbChain }
})

// ─── Mock modules ───────────────────────────────────────────────────────────

vi.mock('../lib/game-state-store.js', () => ({
  stateGet: vi.fn(async (prefix: string, key: string) => {
    const raw = mockStore.get(`${prefix}:${key}`)
    return raw ? JSON.parse(raw) : undefined
  }),
  stateSet: vi.fn(async (prefix: string, key: string, value: unknown) => {
    mockStore.set(`${prefix}:${key}`, JSON.stringify(value))
  }),
  stateDel: vi.fn(async (prefix: string, key: string) => {
    mockStore.delete(`${prefix}:${key}`)
  }),
  stateKeys: vi.fn(async (prefix: string) => {
    const keys: string[] = []
    for (const k of mockStore.keys()) {
      if (k.startsWith(`${prefix}:`)) {
        keys.push(k.slice(prefix.length + 1))
      }
    }
    return keys
  }),
}))

vi.mock('../db/index.js', () => ({
  db: {
    select: mockDbChain['select'],
    insert: mockDbChain['insert'],
    update: mockDbChain['update'],
    delete: mockDbChain['delete'],
  },
}))

vi.mock('../modules/game/game.service.js', () => ({
  handleBetAction: (...args: unknown[]) => mockHandleBetAction(...args),
}))

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { recoverTimers } from '../modules/game/timer-recovery.js'
import type { TimerState, BettingState } from '../modules/game/betting.service.js'
import { stateSet } from '../lib/game-state-store.js'

// ─── Mock io ────────────────────────────────────────────────────────────────

const mockIo = {
  to: vi.fn().mockReturnValue({ emit: vi.fn() }),
  emit: vi.fn(),
} as any

// ─── Helpers ────────────────────────────────────────────────────────────────

function createTimerState(overrides: Partial<TimerState> = {}): TimerState {
  return {
    tableId: 'table-1',
    roundId: 'round-1',
    playerId: 'user-0',
    startedAt: Date.now() - 10_000,
    durationMs: 30_000,
    allowedActions: ['FOLD', 'CHECK'],
    ...overrides,
  }
}

function createBettingState(overrides: Partial<BettingState> = {}): BettingState {
  return {
    roundId: 'round-1',
    bettingRound: 1,
    currentBet: 10,
    currentPlayerIndex: 0,
    playerStates: [
      { userId: 'user-0', seatIndex: 0, hasFolded: false, totalBet: 10, chipStack: 490, hasActed: false },
      { userId: 'user-1', seatIndex: 1, hasFolded: false, totalBet: 0, chipStack: 500, hasActed: false },
    ],
    pot: 15,
    bbPlayerIndex: null,
    bigBlindAmount: null,
    ...overrides,
  }
}

function createPhaseState(overrides: Record<string, unknown> = {}) {
  return {
    roundId: 'round-1',
    currentPhase: 'betting',
    resolvedFixtures: [],
    revealedPlayerScores: [],
    bettingRound: 1,
    currentBet: 10,
    pot: 15,
    activePlayerId: 'user-0',
    ...overrides,
  }
}

async function setupTimerScenario(
  timerOverrides: Partial<TimerState> = {},
  bettingOverrides: Partial<BettingState> = {},
  phaseOverrides: Record<string, unknown> = {},
  options: { skipBetting?: boolean; skipPhase?: boolean } = {},
) {
  const timer = createTimerState(timerOverrides)
  const tableId = timer.tableId
  await stateSet('timer', tableId, timer)
  if (!options.skipBetting) {
    await stateSet('betting', timer.roundId, createBettingState({ roundId: timer.roundId, ...bettingOverrides }))
  }
  if (!options.skipPhase) {
    await stateSet('phase', tableId, createPhaseState({ roundId: timer.roundId, ...phaseOverrides }))
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Timer Recovery', () => {
  beforeEach(() => {
    mockStore.clear()
    mockHandleBetAction.mockClear()
  })

  it('returns 0 when no timer keys exist', async () => {
    const count = await recoverTimers(mockIo)
    expect(count).toBe(0)
  })

  it('recovers timer with remaining time and restarts it', async () => {
    await setupTimerScenario({ startedAt: Date.now() - 10_000 })

    const count = await recoverTimers(mockIo)
    expect(count).toBe(1)
    expect(mockHandleBetAction).not.toHaveBeenCalled()
  })

  it('auto-folds when timer has expired and FOLD is allowed', async () => {
    await setupTimerScenario({ startedAt: Date.now() - 35_000, allowedActions: ['FOLD'] })

    const count = await recoverTimers(mockIo)
    expect(count).toBe(1)
    expect(mockHandleBetAction).toHaveBeenCalledWith('round-1', 'user-0', 'FOLD', 0, mockIo, true)
  })

  it('auto-checks when timer expired and CHECK is allowed', async () => {
    await setupTimerScenario({ startedAt: Date.now() - 35_000, allowedActions: ['FOLD', 'CHECK'] })

    const count = await recoverTimers(mockIo)
    expect(count).toBe(1)
    expect(mockHandleBetAction).toHaveBeenCalledWith('round-1', 'user-0', 'CHECK', 0, mockIo, true)
  })

  it('cleans up stale timer when no betting state exists', async () => {
    await setupTimerScenario({}, {}, {}, { skipBetting: true })

    const count = await recoverTimers(mockIo)
    expect(count).toBe(0)
    expect(mockHandleBetAction).not.toHaveBeenCalled()
    expect(mockStore.has('timer:table-1')).toBe(false)
  })

  it('cleans up stale timer when phase is not betting', async () => {
    await setupTimerScenario({}, {}, { currentPhase: 'scoring' })

    const count = await recoverTimers(mockIo)
    expect(count).toBe(0)
    expect(mockStore.has('timer:table-1')).toBe(false)
  })

  it('cleans up timer when current player does not match', async () => {
    await setupTimerScenario({ playerId: 'user-99' })

    const count = await recoverTimers(mockIo)
    expect(count).toBe(0)
    expect(mockStore.has('timer:table-1')).toBe(false)
  })

  it('recovers multiple tables independently', async () => {
    await setupTimerScenario({ tableId: 'table-1', startedAt: Date.now() - 35_000, allowedActions: ['FOLD'] })
    await setupTimerScenario({ tableId: 'table-2', roundId: 'round-2', startedAt: Date.now() - 5_000 })

    const count = await recoverTimers(mockIo)
    expect(count).toBe(2)
    expect(mockHandleBetAction).toHaveBeenCalledWith('round-1', 'user-0', 'FOLD', 0, mockIo, true)
    expect(mockHandleBetAction).toHaveBeenCalledTimes(1)
  })
})
