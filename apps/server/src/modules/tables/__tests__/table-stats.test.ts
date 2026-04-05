import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { NotFoundError } from '../../../shared/errors.js'

// Mock DB and bot service before importing the route handler
vi.mock('../../../db/index.js', () => ({ db: { select: vi.fn() } }))
vi.mock('../../game/bot.service.js', () => ({ isBotUser: (id: string) => id === 'bot-user-1' }))

const { db } = await import('../../../db/index.js')

// Import the route to extract the handler — we test it directly (no HTTP layer needed)
// The handler is the async fn passed to router.get; we call it directly with mock req/res/next
import { tableStatsRouter } from '../table-stats.route.js'

function getHandler() {
  // Express Router stores routes in router.stack; pull the GET /:tableId/stats handler
  const layer = (
    tableStatsRouter as unknown as { stack: { route: { stack: { handle: unknown }[] } }[] }
  ).stack.find((l) => l.route?.stack?.[0])
  return layer!.route.stack[0].handle as (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => Promise<void>
}

function makeRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    json(data: unknown) {
      this.body = data
      return this
    },
    status(code: number) {
      this.statusCode = code
      return this
    },
  }
  return res
}

function makeSelectChain(returnValue: unknown) {
  const resolved = Promise.resolve(returnValue)
  const chain: Record<string, unknown> = {
    // Make the chain itself awaitable (Drizzle queries implement .then())
    then: resolved.then.bind(resolved),
    catch: resolved.catch.bind(resolved),
    finally: resolved.finally.bind(resolved),
    limit: vi.fn().mockResolvedValue(returnValue),
  }
  for (const method of ['select', 'from', 'where', 'innerJoin', 'groupBy']) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }
  return chain
}

describe('GET /api/tables/:tableId/stats', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns stats for an active table', async () => {
    const tableId = 'table-abc-123'
    const createdAt = new Date('2026-04-05T10:00:00Z')

    let callCount = 0
    ;(db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++
      const data =
        callCount === 1
          ? [{ createdAt }]
          : callCount === 2
            ? [{ roundsPlayed: 7, currentRound: 8 }]
            : callCount === 3
              ? [{ winnerId: 'user-1', wins: 3 }]
              : [
                  { userId: 'user-1', chips: 1200, username: 'Player1' },
                  { userId: 'bot-user-1', chips: 800, username: 'Bot-Alpha' },
                ]
      return makeSelectChain(data)
    })

    const req = { params: { tableId } } as unknown as Request
    const res = makeRes()
    const next = vi.fn()

    await getHandler()(req, res as unknown as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    const data = (res.body as { success: boolean; data: Record<string, unknown> }).data
    expect(data.tableId).toBe(tableId)
    expect(data.roundsPlayed).toBe(7)
    expect(data.currentRound).toBe(8)
    expect(data.createdAt).toBe('2026-04-05T10:00:00.000Z')
    const players = data.players as {
      name: string
      chips: number
      roundsWon: number
      isBot?: boolean
    }[]
    expect(players).toHaveLength(2)
    expect(players[0]).toMatchObject({ name: 'Player1', chips: 1200, roundsWon: 3 })
    expect(players[0].isBot).toBeUndefined()
    expect(players[1]).toMatchObject({ name: 'Bot-Alpha', chips: 800, roundsWon: 0, isBot: true })
  })

  it('returns 404 for a non-existent table', async () => {
    ;(db.select as ReturnType<typeof vi.fn>).mockImplementation(() => makeSelectChain([]))

    const req = { params: { tableId: 'does-not-exist' } } as unknown as Request
    const res = makeRes()
    const next = vi.fn()

    await getHandler()(req, res as unknown as Response, next)

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError))
    const err = next.mock.calls[0][0] as NotFoundError
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Table not found')
  })
})
