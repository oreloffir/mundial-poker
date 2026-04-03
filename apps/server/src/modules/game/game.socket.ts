import type { Server } from 'socket.io'
import { eq, and, desc, ne, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  tablePlayers,
  tables,
  rounds,
  users,
  playerHands,
  roundFixtures,
  fixtures,
  teams,
} from '../../db/schema.js'
import { verifyToken } from '../auth/auth.service.js'
import * as gameService from './game.service.js'
import { getRoundPhaseState } from './phase-tracker.js'
import { getBettingState, getAllowedActions } from './betting.service.js'
import type { BetAction, ClientToServerEvents, GameState, ServerToClientEvents } from '@wpc/shared'

interface SocketData {
  readonly userId: string
  readonly email: string
}


async function getTableState(tableId: string, userId: string): Promise<GameState | null> {
  const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1)
  if (!table) return null

  const players = await db
    .select({
      userId: tablePlayers.userId,
      seatIndex: tablePlayers.seatIndex,
      chipStack: tablePlayers.chipStack,
      isConnected: tablePlayers.isConnected,
      username: users.username,
      avatarUrl: users.avatarUrl,
    })
    .from(tablePlayers)
    .innerJoin(users, eq(tablePlayers.userId, users.id))
    .where(eq(tablePlayers.tableId, tableId))

  const [activeRound] = await db
    .select()
    .from(rounds)
    .where(and(eq(rounds.tableId, tableId), ne(rounds.status, 'COMPLETE')))
    .orderBy(desc(rounds.roundNumber))
    .limit(1)

  let roundInfo: GameState['roundInfo'] = null

  if (activeRound) {
    const [myHand] = await db
      .select()
      .from(playerHands)
      .where(and(eq(playerHands.roundId, activeRound.id), eq(playerHands.userId, userId)))
      .limit(1)

    const rfRows = await db
      .select()
      .from(roundFixtures)
      .where(eq(roundFixtures.roundId, activeRound.id))
    const fixtureIds = rfRows.map((r) => r.fixtureId)
    const fixtureRows =
      fixtureIds.length > 0
        ? await db.select().from(fixtures).where(inArray(fixtures.id, fixtureIds))
        : []

    let cards: unknown[] = []
    if (myHand) {
      const cardTeamIds = [myHand.card1TeamId, myHand.card2TeamId].filter(Boolean) as string[]
      const cardTeamRows =
        cardTeamIds.length > 0
          ? await db.select().from(teams).where(inArray(teams.id, cardTeamIds))
          : []
      const teamMap = new Map(cardTeamRows.map((t) => [t.id, t]))
      const fixtureTeamMap = new Map<string, string>()
      for (const f of fixtureRows) {
        fixtureTeamMap.set(f.homeTeamId, f.id)
        fixtureTeamMap.set(f.awayTeamId, f.id)
      }
      cards = cardTeamIds.map((tid) => {
        const t = teamMap.get(tid)
        return {
          teamId: tid,
          teamName: t?.name ?? 'Unknown',
          teamCode: tid,
          flagEmoji: t?.flagEmoji ?? '',
          tier: t?.tier ?? 'C',
          fifaRanking: t?.fifaRanking ?? 99,
          fixtureId: fixtureTeamMap.get(tid) ?? '',
        }
      })
    }

    const bettingState = await getBettingState(activeRound.id)
    let betPrompt: unknown | null = null
    if (bettingState) {
      const currentPlayer = bettingState.playerStates[bettingState.currentPlayerIndex]
      if (currentPlayer?.userId === userId) {
        const allowed = getAllowedActions(bettingState, currentPlayer)
        betPrompt = {
          userId: currentPlayer.userId,
          minimumBet: bettingState.currentBet,
          currentBet: bettingState.currentBet,
          pot: bettingState.pot,
          chips: currentPlayer.chipStack,
          allowedActions: allowed,
          timeoutMs: 30_000,
        }
      }
    }

    roundInfo = {
      roundId: activeRound.id,
      roundNumber: activeRound.roundNumber,
      status: activeRound.status,
      pot: activeRound.pot,
      dealerSeatIndex: activeRound.dealerSeatIndex,
      cards,
      betPrompt,
      waitingForResults: activeRound.status === 'WAITING_FOR_RESULTS',
    }
  }

  const phaseState = await getRoundPhaseState(tableId)
  if (roundInfo && phaseState) {
    roundInfo = {
      ...roundInfo,
      currentPhase: phaseState.currentPhase,
      resolvedFixtures: phaseState.resolvedFixtures,
      revealedPlayerScores: phaseState.revealedPlayerScores,
      activePlayerId: phaseState.activePlayerId,
      currentBet: phaseState.currentBet,
    }
  }

  return {
    table: {
      id: table.id,
      name: table.name,
      status: table.status as GameState['table']['status'],
      players: players.map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl ?? '',
        chips: p.chipStack,
        seatIndex: p.seatIndex,
        isConnected: p.isConnected,
        isEliminated: p.chipStack <= 0,
      })),
      maxPlayers: 5,
      blinds: { small: table.smallBlind ?? 5, big: table.bigBlind ?? 10 },
      currentRoundId: activeRound?.id ?? null,
      createdAt: table.createdAt.toISOString(),
    },
    roundInfo,
  }
}

export function setupGameSocket(io: Server): void {
  const typedIo = io as unknown as Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>

  typedIo.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined
      if (!token) {
        next(new Error('Authentication required'))
        return
      }
      const payload = verifyToken(token)
      socket.data = { userId: payload.userId, email: payload.email }
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  typedIo.on('connection', (socket) => {
    const userId = socket.data.userId
    socket.join(`user:${userId}`)

    socket.on('table:join', async (payload, callback) => {
      try {
        const { tableId } = payload
        socket.join(`table:${tableId}`)

        const state = await getTableState(tableId, userId)
        if (!state) {
          callback({ success: false, error: 'Table not found' })
          return
        }

        socket.emit('table:state', state)

        const [player] = await db
          .select()
          .from(tablePlayers)
          .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, userId)))
          .limit(1)

        if (player) {
          await db
            .update(tablePlayers)
            .set({ isConnected: true })
            .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, userId)))

          const [user] = await db
            .select({ username: users.username, avatarUrl: users.avatarUrl })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1)

          socket.to(`table:${tableId}`).emit('player:joined', {
            userId,
            username: user?.username ?? '',
            avatarUrl: user?.avatarUrl ?? '',
            chips: player.chipStack,
            seatIndex: player.seatIndex,
            isConnected: true,
            isEliminated: player.chipStack <= 0,
          })
        }

        callback({ success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to join table'
        console.error('GameSocket - table:join - failed', { userId, error })
        callback({ success: false, error: message })
      }
    })

    socket.on('table:leave', async (payload) => {
      try {
        const { tableId } = payload
        socket.leave(`table:${tableId}`)
        socket.to(`table:${tableId}`).emit('player:left', { userId })
      } catch (error) {
        console.error('GameSocket - table:leave - failed', { userId, error })
      }
    })

    socket.on('bet:action', async (payload, callback) => {
      try {
        const { action, amount } = payload

        const activeRounds = await db
          .select({ roundId: rounds.id })
          .from(rounds)
          .innerJoin(tablePlayers, eq(rounds.tableId, tablePlayers.tableId))
          .where(and(eq(tablePlayers.userId, userId)))
          .orderBy(desc(rounds.roundNumber))
          .limit(1)

        if (activeRounds.length === 0) {
          callback({ success: false, error: 'No active round found' })
          return
        }

        const { roundId } = activeRounds[0]!
        await gameService.handleBetAction(roundId, userId, action as BetAction, amount, io)
        callback({ success: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to process bet'
        console.error('GameSocket - bet:action - failed', { userId, error })
        callback({ success: false, error: message })
      }
    })

    socket.on('round:ready', (_payload) => {})

    socket.on('disconnect', async () => {
      try {
        const playerSeats = await db
          .select()
          .from(tablePlayers)
          .where(eq(tablePlayers.userId, userId))

        for (const seat of playerSeats) {
          await db
            .update(tablePlayers)
            .set({ isConnected: false })
            .where(and(eq(tablePlayers.tableId, seat.tableId), eq(tablePlayers.userId, userId)))

          socket.to(`table:${seat.tableId}`).emit('player:disconnected', { userId })
        }
      } catch (error) {
        console.error('GameSocket - disconnect - failed', { userId, error })
      }
    })
  })
}
