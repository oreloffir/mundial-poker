import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response } from 'express'
import { NotFoundError } from '../../../shared/errors.js'

vi.mock('../../../db/index.js', () => ({ db: { select: vi.fn() } }))
vi.mock('../../game/bot.service.js', () => ({ isBotUser: (id: string) => id === 'bot-user-1' }))

const { db } = await import('../../../db/index.js')
const { getTableStats } = await import('../table-stats.route.js')

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

    await getTableStats(req, res as unknown as Response, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.statusCode).toBe(200)
    const data = (res.body as { success: boolean; data: Record<string, unknown> }).data
    expect(data.tableId).toBe(tableId)
    expect(data.roundsPlayed).toBe(7)
    expect(data.currentRound).toBe(8)
    expect(data.createdAt).toBe('2026-04-05T10:00:00.000Z')
    const players = data.players as { name: string; chips: number; roundsWon: number; isBot?: boolean }[]
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

    await getTableStats(req, res as unknown as Response, next)

    expect(next).toHaveBeenCalledWith(expect.any(NotFoundError))
    const err = next.mock.calls[0][0] as NotFoundError
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Table not found')
  })
})
