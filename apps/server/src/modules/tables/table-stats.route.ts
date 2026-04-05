import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { eq, count, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { tables, tablePlayers, rounds, users } from '../../db/schema.js'
import { NotFoundError } from '../../shared/errors.js'
import { isBotUser } from '../game/bot.service.js'

export const tableStatsRouter = Router()

tableStatsRouter.get('/:tableId/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.params

    // Table existence + createdAt
    const [table] = await db
      .select({ createdAt: tables.createdAt })
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1)
    if (!table) throw new NotFoundError('Table not found')

    // Rounds aggregates: total rounds played + current round number
    const [roundAgg] = await db
      .select({
        roundsPlayed: count(rounds.id),
        currentRound: sql<number>`coalesce(max(${rounds.roundNumber}), 0)`,
      })
      .from(rounds)
      .where(eq(rounds.tableId, tableId))

    // Rounds won per player for this table
    const winsRows = await db
      .select({ winnerId: rounds.winnerId, wins: count(rounds.id) })
      .from(rounds)
      .where(eq(rounds.tableId, tableId))
      .groupBy(rounds.winnerId)

    const winsMap = new Map<string, number>()
    for (const row of winsRows) {
      if (row.winnerId) winsMap.set(row.winnerId, row.wins)
    }

    // Players: current chip stacks + username
    const playerRows = await db
      .select({
        userId: tablePlayers.userId,
        chips: tablePlayers.chipStack,
        username: users.username,
      })
      .from(tablePlayers)
      .innerJoin(users, eq(tablePlayers.userId, users.id))
      .where(eq(tablePlayers.tableId, tableId))

    const players = playerRows.map((p) => ({
      name: p.username,
      chips: p.chips,
      roundsWon: winsMap.get(p.userId) ?? 0,
      ...(isBotUser(p.userId) ? { isBot: true } : {}),
    }))

    res.json({
      success: true,
      data: {
        tableId,
        roundsPlayed: roundAgg?.roundsPlayed ?? 0,
        currentRound: roundAgg?.currentRound ?? 0,
        players,
        totalPot: 0,
        createdAt: table.createdAt.toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
})
