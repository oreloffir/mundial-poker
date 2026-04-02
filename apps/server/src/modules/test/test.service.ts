import { eq, desc, like, inArray } from 'drizzle-orm'
import type { Server } from 'socket.io'
import { db } from '../../db/index.js'
import { rounds, roundFixtures, fixtures, tables, tablePlayers, users } from '../../db/schema.js'
import { createGuest } from '../auth/auth.service.js'
import * as tableService from '../tables/table.service.js'
import * as tableRepo from '../tables/table.repository.js'
import { BOT_IDS, isBotUser } from '../game/bot.service.js'
import {
  startRound,
  handleBetAction,
  cancelRoundTimers,
  resolveRound,
} from '../game/game.service.js'
import { getBettingState, cancelBetTimer, getAllowedActions } from '../game/betting.service.js'
import { generateDemoResult } from '../game/demo.service.js'
import type { BetAction } from '@wpc/shared'

const TEST_TABLE_PREFIX = '__test_'
const MAX_DRIVE_ITERATIONS = 60

type SeedPhase = 'betting' | 'waiting' | 'showdown'

interface SeedRequest {
  readonly playerCount: number
  readonly startingChips: number
  readonly smallBlind: number
  readonly bigBlind: number
  readonly phase: SeedPhase
}

interface SeedResponse {
  readonly tableId: string
  readonly userId: string
  readonly token: string
  readonly players: ReadonlyArray<{
    readonly userId: string
    readonly username: string
    readonly seatIndex: number
    readonly isBot: boolean
  }>
}

async function getLatestRoundId(tableId: string): Promise<string | null> {
  const [round] = await db
    .select({ id: rounds.id })
    .from(rounds)
    .where(eq(rounds.tableId, tableId))
    .orderBy(desc(rounds.createdAt))
    .limit(1)
  return round?.id ?? null
}

async function driveAllBetting(roundId: string, io: Server): Promise<void> {
  let iterations = 0
  while (iterations < MAX_DRIVE_ITERATIONS) {
    const state = getBettingState(roundId)
    if (!state) break

    const currentPlayer = state.playerStates[state.currentPlayerIndex]
    if (!currentPlayer) break

    cancelBetTimer(roundId, currentPlayer.userId)

    const allowed = getAllowedActions(state, currentPlayer)
    const action: BetAction = allowed.includes('CHECK') ? 'CHECK' : 'CALL'
    const amount = action === 'CALL' ? state.currentBet - currentPlayer.totalBet : 0

    await handleBetAction(roundId, currentPlayer.userId, action, amount, io)
    iterations++
  }
}

async function resolveFixturesImmediately(roundId: string): Promise<void> {
  const rfRows = await db
    .select({ fixtureId: roundFixtures.fixtureId })
    .from(roundFixtures)
    .where(eq(roundFixtures.roundId, roundId))

  if (rfRows.length === 0) return

  const fixtureIds = rfRows.map((r) => r.fixtureId)
  const updates = fixtureIds.map(async (fixtureId) => {
    const result = generateDemoResult()
    await db
      .update(fixtures)
      .set({
        homeGoals: result.homeScore,
        awayGoals: result.awayScore,
        homePenaltiesScored: result.homePenalties ?? 0,
        homePenaltiesMissed: result.homePenalties === 0 ? 1 : 0,
        awayPenaltiesScored: result.awayPenalties ?? 0,
        awayPenaltiesMissed: result.awayPenalties === 0 ? 1 : 0,
        status: 'FINISHED',
        updatedAt: new Date(),
      })
      .where(eq(fixtures.id, fixtureId))
  })
  await Promise.all(updates)
}

export async function seedGame(req: SeedRequest, io: Server): Promise<SeedResponse> {
  const botCount = Math.min(req.playerCount - 1, BOT_IDS.length)

  const { user, tokens } = await createGuest()

  const tableName = `${TEST_TABLE_PREFIX}${Date.now()}`
  const table = await tableService.createTable(tableName, user.id, {
    startingChips: req.startingChips,
    smallBlind: req.smallBlind,
    bigBlind: req.bigBlind,
  })
  if (!table) throw new Error('Failed to create test table')

  // Add bots to seats 1..botCount (host is already at seat 0)
  const botsToAdd = (BOT_IDS as readonly string[]).slice(0, botCount)
  for (let i = 0; i < botsToAdd.length; i++) {
    await tableRepo.addPlayer(table.id, botsToAdd[i]!, i + 1, req.startingChips)
  }

  await tableService.startGame(table.id, user.id)

  // startRound deals cards, sets blinds, starts betting round 1, and starts fixture timers
  await startRound(table.id, io)

  const roundId = await getLatestRoundId(table.id)
  if (!roundId) throw new Error('Round not created after startRound')

  if (req.phase === 'waiting' || req.phase === 'showdown') {
    await driveAllBetting(roundId, io)
  }

  if (req.phase === 'showdown') {
    // Cancel fixture timers and resolve immediately, then kick off resolveRound async
    cancelRoundTimers(roundId)
    await resolveFixturesImmediately(roundId)
    // Fire-and-forget: resolveRound emits player:scored events progressively
    resolveRound(roundId, io).catch((err) =>
      console.error('TestService - seedGame - resolveRound failed', { roundId, error: err }),
    )
    // Small pause so resolveRound has started emitting before we return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  const finalPlayers = await db
    .select({
      userId: tablePlayers.userId,
      seatIndex: tablePlayers.seatIndex,
      username: users.username,
    })
    .from(tablePlayers)
    .innerJoin(users, eq(tablePlayers.userId, users.id))
    .where(eq(tablePlayers.tableId, table.id))

  console.log('TestService - seedGame', {
    tableId: table.id,
    phase: req.phase,
    playerCount: finalPlayers.length,
    roundId,
  })

  return {
    tableId: table.id,
    userId: user.id,
    token: tokens.accessToken,
    players: finalPlayers.map((p) => ({
      userId: p.userId,
      username: p.username,
      seatIndex: p.seatIndex,
      isBot: isBotUser(p.userId),
    })),
  }
}

export async function cleanupTestTables(): Promise<number> {
  const testTables = await db
    .select({ id: tables.id })
    .from(tables)
    .where(like(tables.name, `${TEST_TABLE_PREFIX}%`))

  if (testTables.length === 0) return 0

  const ids = testTables.map((t) => t.id)
  // tablePlayers has ON DELETE CASCADE, so deleting tables removes players too
  await db.delete(tables).where(inArray(tables.id, ids))

  console.log('TestService - cleanupTestTables', { count: testTables.length, ids })
  return testTables.length
}
