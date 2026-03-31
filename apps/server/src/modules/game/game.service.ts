import { eq, asc, and, inArray } from 'drizzle-orm'
import type { Server } from 'socket.io'
import { db } from '../../db/index.js'
import {
  rounds,
  tablePlayers,
  tables,
  playerHands,
  roundFixtures,
  users,
  teams,
  fixtures,
} from '../../db/schema.js'
import { NotFoundError, GameError } from '../../shared/errors.js'
import { dealCards } from './dealing.service.js'
import {
  initBettingRound,
  validateAction,
  applyAction,
  isBettingRoundComplete,
  isOnlyOnePlayerLeft,
  getActivePlayers,
  getBettingState,
  clearBettingState,
  getAllowedActions,
  type BettingState,
} from './betting.service.js'
import { scoreRound } from './scoring.service.js'
import { createDemoFixtures, resolveDemoFixtures } from './demo.service.js'
import { isBotUser, scheduleBotAction } from './bot.service.js'
import type { BetAction, BetPromptPayload } from '@wpc/shared'

const DEMO_REVEAL_DELAY_MS = 30_000
const NEXT_ROUND_DELAY_MS = 14_000
const DEMO_FIXTURE_COUNT = 5

const activeTimers = new Map<string, { readonly cancel: () => void }>()

function emitToRoom(io: Server, tableId: string, event: string, data: unknown): void {
  io.to(`table:${tableId}`).emit(event, data)
}

function emitToPlayer(io: Server, userId: string, event: string, data: unknown): void {
  io.to(`user:${userId}`).emit(event, data)
}

function buildBetPrompt(state: BettingState): BetPromptPayload {
  const player = state.playerStates[state.currentPlayerIndex]!
  const allowed = getAllowedActions(state, player)
  return {
    userId: player.userId,
    minimumBet: state.currentBet,
    currentBet: state.currentBet,
    pot: state.pot,
    chips: player.chipStack,
    allowedActions: allowed,
    timeoutMs: 30_000,
  }
}

async function getTableIdForRound(roundId: string): Promise<string> {
  const [round] = await db
    .select({ tableId: rounds.tableId })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1)
  if (!round) throw new NotFoundError('Round not found')
  return round.tableId
}

async function getPlayersWithUsernames(tableId: string) {
  return db
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
    .orderBy(asc(tablePlayers.seatIndex))
}

async function startBettingRound(
  roundId: string,
  tableId: string,
  bettingRoundNumber: number,
  io: Server,
): Promise<void> {
  const players = await db
    .select()
    .from(tablePlayers)
    .where(eq(tablePlayers.tableId, tableId))
    .orderBy(asc(tablePlayers.seatIndex))

  const hands = await db.select().from(playerHands).where(eq(playerHands.roundId, roundId))

  const handMap = new Map(hands.map((h) => [h.userId, h]))

  const playerData = players.map((p) => ({
    userId: p.userId,
    seatIndex: p.seatIndex,
    chipStack: p.chipStack,
    hasFolded: handMap.get(p.userId)?.hasFolded ?? false,
  }))

  const statusMap: Record<number, string> = {
    1: 'BETTING_ROUND_1',
    2: 'BETTING_ROUND_2',
    3: 'BETTING_ROUND_3',
  }
  await db
    .update(rounds)
    .set({ status: statusMap[bettingRoundNumber] ?? 'BETTING_ROUND_1' })
    .where(eq(rounds.id, roundId))

  const state = initBettingRound(roundId, playerData, bettingRoundNumber)

  if (getActivePlayers(state).length <= 1) {
    await resolveRound(roundId, io)
    return
  }

  const prompt = buildBetPrompt(state)
  emitToRoom(io, tableId, 'bet:prompt', prompt)

  if (isBotUser(prompt.userId)) {
    scheduleBotAction(roundId, prompt.userId, io)
  }

  console.log('GameService - startBettingRound', { roundId, bettingRound: bettingRoundNumber })
}

export async function startRound(tableId: string, io: Server): Promise<void> {
  const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1)
  if (!table) throw new NotFoundError('Table not found')

  const players = await getPlayersWithUsernames(tableId)
  const activePlayers = players.filter((p) => p.chipStack > 0)

  if (activePlayers.length < 2) {
    const winner = activePlayers[0] ?? players[0]
    const finalStandings = players
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl ?? '',
        chips: p.chipStack,
        seatIndex: p.seatIndex,
        isConnected: p.isConnected,
        isEliminated: p.chipStack <= 0,
      }))
      .sort((a, b) => b.chips - a.chips)

    emitToRoom(io, tableId, 'game:over', { winnerId: winner?.userId ?? '', finalStandings })
    await db
      .update(tables)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(eq(tables.id, tableId))
    console.log('GameService - startRound - gameOver', { tableId, winnerId: winner?.userId })
    return
  }

  const fixtureIds = await createDemoFixtures(DEMO_FIXTURE_COUNT)
  const dealResult = await dealCards(tableId, fixtureIds)

  await db.update(rounds).set({ status: 'BOARD_REVEALED' }).where(eq(rounds.id, dealResult.roundId))

  for (const playerDeal of dealResult.playerDeals) {
    emitToPlayer(io, playerDeal.userId, 'round:start', {
      roundId: dealResult.roundId,
      roundNumber: dealResult.roundNumber,
      dealerSeatIndex: dealResult.dealerSeatIndex,
      cards: playerDeal.cards.map((c) => ({
        teamId: c.teamId,
        teamName: c.teamName,
        teamCode: c.teamCode,
        flagEmoji: c.flagEmoji,
        tier: c.tier,
        fifaRanking: c.fifaRanking,
        fixtureId: c.fixtureId,
      })),
    })
  }

  const fixtureTeamIds = [
    ...new Set(dealResult.fixtureRows.flatMap((f) => [f.homeTeamId, f.awayTeamId])),
  ]
  const fixtureTeamRows =
    fixtureTeamIds.length > 0
      ? await db.select().from(teams).where(inArray(teams.id, fixtureTeamIds))
      : []
  const fixtureTeamMap = new Map(fixtureTeamRows.map((t) => [t.id, t]))

  const fixtureData = dealResult.fixtureRows.map((f) => {
    const homeTeam = fixtureTeamMap.get(f.homeTeamId)
    const awayTeam = fixtureTeamMap.get(f.awayTeamId)
    return {
      id: f.id,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      homeTeamName: homeTeam?.name ?? f.homeTeamId,
      awayTeamName: awayTeam?.name ?? f.awayTeamId,
      homeFlag: homeTeam?.flagEmoji ?? '',
      awayFlag: awayTeam?.flagEmoji ?? '',
      status: f.status,
    }
  })
  emitToRoom(io, tableId, 'board:reveal', fixtureData)

  await startBettingRound(dealResult.roundId, tableId, 1, io)

  const demoTimer = resolveDemoFixtures(fixtureIds, DEMO_REVEAL_DELAY_MS, () => {
    resolveRound(dealResult.roundId, io).catch((err) =>
      console.error('GameService - demoResolveCallback - failed', {
        roundId: dealResult.roundId,
        error: err,
      }),
    )
  })
  activeTimers.set(dealResult.roundId, demoTimer)

  console.log('GameService - startRound', {
    tableId,
    roundId: dealResult.roundId,
    roundNumber: dealResult.roundNumber,
  })
}

export async function handleBetAction(
  roundId: string,
  userId: string,
  action: BetAction,
  amount: number,
  io: Server,
): Promise<void> {
  const state = getBettingState(roundId)
  if (!state) throw new GameError('No active betting round for this round')

  const tableId = await getTableIdForRound(roundId)

  validateAction(state, userId, action, amount)
  const newState = await applyAction(state, userId, action, amount)

  if (action === 'FOLD') {
    await db
      .update(playerHands)
      .set({ hasFolded: true })
      .where(and(eq(playerHands.roundId, roundId), eq(playerHands.userId, userId)))
  }

  await db
    .update(rounds)
    .set({ pot: (await getRoundPot(roundId)) + newState.pot })
    .where(eq(rounds.id, roundId))

  const updatedPlayer = newState.playerStates.find((p) => p.userId === userId)
  if (updatedPlayer) {
    await db
      .update(tablePlayers)
      .set({ chipStack: updatedPlayer.chipStack })
      .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, userId)))
  }

  emitToRoom(io, tableId, 'bet:update', {
    userId,
    action,
    amount,
    pot: newState.pot,
    currentBet: newState.currentBet,
    chips: updatedPlayer?.chipStack ?? 0,
  })

  if (isOnlyOnePlayerLeft(newState)) {
    const winner = getActivePlayers(newState)[0]
    if (winner) {
      await distributeWinnings(roundId, tableId, [winner.userId], newState.pot)
      await db
        .update(rounds)
        .set({ winnerId: winner.userId, status: 'COMPLETE', resolvedAt: new Date() })
        .where(eq(rounds.id, roundId))
      clearBettingState(roundId)
      activeTimers.get(roundId)?.cancel()
      activeTimers.delete(roundId)
      emitToRoom(io, tableId, 'round:showdown', [
        { userId: winner.userId, totalScore: 0, cardScores: [], hand: [] },
      ])
      await scheduleNextRound(tableId, io)
      console.log('GameService - handleBetAction - lastPlayerStanding', {
        roundId,
        winnerId: winner.userId,
      })
    }
    return
  }

  if (isBettingRoundComplete(newState)) {
    clearBettingState(roundId)

    if (newState.bettingRound < 3) {
      await startBettingRound(roundId, tableId, newState.bettingRound + 1, io)
    } else {
      await db.update(rounds).set({ status: 'WAITING_FOR_RESULTS' }).where(eq(rounds.id, roundId))

      const rfRows = await db.select().from(roundFixtures).where(eq(roundFixtures.roundId, roundId))
      emitToRoom(io, tableId, 'round:pause', {
        roundId,
        fixtureIds: rfRows.map((rf) => rf.fixtureId),
        resumeAt: new Date(Date.now() + DEMO_REVEAL_DELAY_MS).toISOString(),
      })
    }
    return
  }

  const prompt = buildBetPrompt(newState)
  emitToRoom(io, tableId, 'bet:prompt', prompt)

  if (isBotUser(prompt.userId)) {
    scheduleBotAction(roundId, prompt.userId, io)
  }
}

async function getRoundPot(roundId: string): Promise<number> {
  const [round] = await db
    .select({ pot: rounds.pot })
    .from(rounds)
    .where(eq(rounds.id, roundId))
    .limit(1)
  return round?.pot ?? 0
}

async function distributeWinnings(
  _roundId: string,
  tableId: string,
  winnerIds: readonly string[],
  pot: number,
): Promise<void> {
  if (winnerIds.length === 0 || pot <= 0) return
  const share = Math.floor(pot / winnerIds.length)
  const remainder = pot - share * winnerIds.length

  for (let i = 0; i < winnerIds.length; i++) {
    const userId = winnerIds[i]!
    const winnerShare = i === 0 ? share + remainder : share

    const [player] = await db
      .select()
      .from(tablePlayers)
      .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, userId)))
      .limit(1)

    if (player) {
      await db
        .update(tablePlayers)
        .set({ chipStack: player.chipStack + winnerShare })
        .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, userId)))
    }
  }
}

export async function resolveRound(roundId: string, io: Server): Promise<void> {
  const tableId = await getTableIdForRound(roundId)

  try {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1)
    if (!round || round.status === 'COMPLETE') return

    await db.update(rounds).set({ status: 'SCORING' }).where(eq(rounds.id, roundId))

    const scoringResult = await scoreRound(roundId)

    clearBettingState(roundId)
    activeTimers.get(roundId)?.cancel()
    activeTimers.delete(roundId)

    const rfRows = await db.select().from(roundFixtures).where(eq(roundFixtures.roundId, roundId))
    const resolvedFixtureIds = rfRows.map((rf) => rf.fixtureId)
    const resolvedFixtures =
      resolvedFixtureIds.length > 0
        ? await db.select().from(fixtures).where(inArray(fixtures.id, resolvedFixtureIds))
        : []
    const resolvedTeamIds = [
      ...new Set(resolvedFixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId])),
    ]
    const resolvedTeamRows =
      resolvedTeamIds.length > 0
        ? await db.select().from(teams).where(inArray(teams.id, resolvedTeamIds))
        : []
    const resolvedTeamMap = new Map(resolvedTeamRows.map((t) => [t.id, t]))

    const resolvedFixtureData = resolvedFixtures.map((f) => {
      const ht = resolvedTeamMap.get(f.homeTeamId)
      const at = resolvedTeamMap.get(f.awayTeamId)
      return {
        id: f.id,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        homeTeamName: ht?.name ?? f.homeTeamId,
        awayTeamName: at?.name ?? f.awayTeamId,
        homeFlag: ht?.flagEmoji ?? '',
        awayFlag: at?.flagEmoji ?? '',
        status: f.status,
        homeGoals: f.homeGoals,
        awayGoals: f.awayGoals,
        homePenaltiesScored: f.homePenaltiesScored,
        awayPenaltiesScored: f.awayPenaltiesScored,
      }
    })

    emitToRoom(io, tableId, 'round:results', {
      roundId,
      cardScores: scoringResult.results.flatMap((r) => r.cardScores),
      fixtures: resolvedFixtureData,
      potDistribution: Object.fromEntries(
        scoringResult.winnerIds.map((id, i) => {
          const share = Math.floor(scoringResult.potAmount / scoringResult.winnerIds.length)
          const bonus =
            i === 0 ? scoringResult.potAmount - share * scoringResult.winnerIds.length : 0
          return [id, share + bonus]
        }),
      ),
    })

    const hands = await db.select().from(playerHands).where(eq(playerHands.roundId, roundId))
    const allTeamIds = hands.flatMap((h) =>
      [h.card1TeamId, h.card2TeamId].filter(Boolean),
    ) as string[]
    const teamRows =
      allTeamIds.length > 0
        ? await db.select().from(teams).where(inArray(teams.id, allTeamIds))
        : []
    const teamMap = new Map(teamRows.map((t) => [t.id, t]))

    const showdownResults = scoringResult.results.map((r) => {
      const hand = hands.find((h) => h.userId === r.userId)
      const handTeamIds = hand
        ? ([hand.card1TeamId, hand.card2TeamId].filter(Boolean) as string[])
        : []
      return {
        userId: r.userId,
        hand: handTeamIds.map((tid) => {
          const t = teamMap.get(tid)
          return {
            teamId: tid,
            team: {
              id: tid,
              name: t?.name ?? tid,
              code: tid,
              flagUrl: t?.flagEmoji ?? '',
              tier: t?.tier ?? 'C',
              confederation: t?.confederation ?? 'UEFA',
              fifaRanking: t?.fifaRanking ?? 99,
            },
          }
        }),
        totalScore: r.totalScore,
        cardScores: r.cardScores,
      }
    })

    emitToRoom(io, tableId, 'round:showdown', showdownResults)

    await scheduleNextRound(tableId, io)
    console.log('GameService - resolveRound', {
      roundId,
      winnerIds: scoringResult.winnerIds,
      pot: scoringResult.potAmount,
    })
  } catch (error) {
    console.error('GameService - resolveRound - failed', { roundId, error })
    throw error
  }
}

async function scheduleNextRound(tableId: string, io: Server): Promise<void> {
  const players = await getPlayersWithUsernames(tableId)
  const playersWithChips = players.filter((p) => p.chipStack > 0)

  for (const player of players) {
    if (player.chipStack <= 0) {
      emitToRoom(io, tableId, 'player:eliminated', { userId: player.userId, finalChips: 0 })
    }
  }

  if (playersWithChips.length < 2) {
    const winner = playersWithChips[0]
    const finalStandings = players
      .map((p) => ({
        userId: p.userId,
        username: p.username,
        avatarUrl: p.avatarUrl ?? '',
        chips: p.chipStack,
        seatIndex: p.seatIndex,
        isConnected: p.isConnected,
        isEliminated: p.chipStack <= 0,
      }))
      .sort((a, b) => b.chips - a.chips)

    emitToRoom(io, tableId, 'game:over', { winnerId: winner?.userId ?? '', finalStandings })
    await db
      .update(tables)
      .set({ status: 'COMPLETED', updatedAt: new Date() })
      .where(eq(tables.id, tableId))
    console.log('GameService - scheduleNextRound - gameOver', { tableId, winnerId: winner?.userId })
    return
  }

  setTimeout(() => {
    startRound(tableId, io).catch((err) =>
      console.error('GameService - scheduleNextRound - failed', { tableId, error: err }),
    )
  }, NEXT_ROUND_DELAY_MS)
}
