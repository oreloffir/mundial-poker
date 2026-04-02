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
  startBetTimer,
  cancelBetTimer,
  cleanupBetTimers,
  type BettingState,
} from './betting.service.js'
import { scoreRound } from './scoring.service.js'
import { createDemoFixtures, resolveDemoFixturesProgressive } from './demo.service.js'
import { isBotUser, scheduleBotAction } from './bot.service.js'
import { listTables } from '../tables/table.service.js'
import { calculateBlindPositions, calculateNextActiveSeat } from './blinds.service.js'
import { bets } from '../../db/schema.js'
import type {
  BetAction,
  BetPromptPayload,
  FixtureResultPayload,
  PlayerScoredPayload,
} from '@wpc/shared'

const DEMO_FIXTURE_COUNT = 5
const FIXTURE_REVEAL_INTERVAL_MS = 5_000
const SCORING_PAUSE_MS = 2_000
const PLAYER_REVEAL_INTERVAL_MS = 2_500
const WINNER_DISPLAY_DELAY_MS = 3_000
const NEXT_ROUND_DELAY_MS = 7_000

const activeTimers = new Map<string, { readonly cancel: () => void }>()

// ─── Round phase tracking (for reconnect state recovery) ─────────────────────

type RoundPhase = 'dealing' | 'betting' | 'waiting' | 'fixtures' | 'scoring' | 'reveals' | 'winner'

interface RoundPhaseState {
  readonly roundId: string
  readonly currentPhase: RoundPhase
  readonly resolvedFixtures: readonly FixtureResultPayload[]
  readonly revealedPlayerScores: readonly PlayerScoredPayload[]
  readonly bettingRound: number
  readonly currentBet: number
  readonly pot: number
  readonly activePlayerId: string | null
}

const roundPhaseMap = new Map<string, RoundPhaseState>()

export function getRoundPhaseState(tableId: string): RoundPhaseState | undefined {
  return roundPhaseMap.get(tableId)
}

function updateRoundPhase(
  tableId: string,
  update: Partial<RoundPhaseState> & { roundId: string },
): void {
  const existing = roundPhaseMap.get(tableId)
  roundPhaseMap.set(tableId, {
    roundId: update.roundId,
    currentPhase: update.currentPhase ?? existing?.currentPhase ?? 'dealing',
    resolvedFixtures: update.resolvedFixtures ?? existing?.resolvedFixtures ?? [],
    revealedPlayerScores: update.revealedPlayerScores ?? existing?.revealedPlayerScores ?? [],
    bettingRound: update.bettingRound ?? existing?.bettingRound ?? 0,
    currentBet: update.currentBet ?? existing?.currentBet ?? 0,
    pot: update.pot ?? existing?.pot ?? 0,
    activePlayerId:
      update.activePlayerId !== undefined
        ? update.activePlayerId
        : (existing?.activePlayerId ?? null),
  })
}

function clearRoundPhase(tableId: string): void {
  roundPhaseMap.delete(tableId)
}

interface RoundBlindInfo {
  readonly dealerSeatIndex: number
  readonly sbSeatIndex: number
  readonly bbSeatIndex: number
  readonly smallBlind: number
  readonly bigBlind: number
  readonly sbAmount: number
  readonly bbAmount: number
}

const roundBlindCache = new Map<string, RoundBlindInfo>()

interface RoundFixtureData {
  readonly fixtureIds: readonly string[]
  readonly fixtureRowMap: ReadonlyMap<
    string,
    { readonly homeTeamId: string; readonly awayTeamId: string }
  >
  readonly fixtureTeamMap: ReadonlyMap<
    string,
    { readonly name: string; readonly flagEmoji: string | null }
  >
}

const roundFixtureDataCache = new Map<string, RoundFixtureData>()

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
    promptedAt: Date.now(),
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

function startDemoFixtureTimer(roundId: string, tableId: string, io: Server): void {
  const data = roundFixtureDataCache.get(roundId)
  if (!data) {
    console.error('GameService - startDemoFixtureTimer - no fixture data cached', { roundId })
    resolveRound(roundId, io).catch((err) =>
      console.error('GameService - startDemoFixtureTimer - fallback resolveRound failed', {
        roundId,
        error: err,
      }),
    )
    return
  }

  const { fixtureIds, fixtureRowMap, fixtureTeamMap } = data
  roundFixtureDataCache.delete(roundId)

  const timer = resolveDemoFixturesProgressive(
    fixtureIds,
    FIXTURE_REVEAL_INTERVAL_MS,
    (fixtureId, result) => {
      const row = fixtureRowMap.get(fixtureId)
      if (!row) return
      const ht = fixtureTeamMap.get(row.homeTeamId)
      const at = fixtureTeamMap.get(row.awayTeamId)
      const fixturePayload: FixtureResultPayload = {
        fixtureId,
        homeTeamId: row.homeTeamId,
        homeTeam: {
          id: row.homeTeamId,
          name: ht?.name ?? row.homeTeamId,
          code: row.homeTeamId,
          flagUrl: ht?.flagEmoji ?? '',
        },
        awayTeamId: row.awayTeamId,
        awayTeam: {
          id: row.awayTeamId,
          name: at?.name ?? row.awayTeamId,
          code: row.awayTeamId,
          flagUrl: at?.flagEmoji ?? '',
        },
        homeGoals: result.homeScore,
        awayGoals: result.awayScore,
        hasPenalties: (result.homePenalties ?? 0) > 0 || (result.awayPenalties ?? 0) > 0,
        homePenaltiesScored: result.homePenalties ?? undefined,
        awayPenaltiesScored: result.awayPenalties ?? undefined,
      }
      const phaseState = roundPhaseMap.get(tableId)
      updateRoundPhase(tableId, {
        roundId,
        currentPhase: 'fixtures',
        resolvedFixtures: [...(phaseState?.resolvedFixtures ?? []), fixturePayload],
      })
      emitToRoom(io, tableId, 'fixture:result', fixturePayload)
      console.log('PHASE: fixture:result', 'fixtureId:', fixtureId, Date.now())
    },
    () => {
      console.log('PHASE: all-fixtures-resolved → resolveRound', 'roundId:', roundId, Date.now())
      resolveRound(roundId, io).catch((err) =>
        console.error('GameService - demoResolveCallback - failed', { roundId, error: err }),
      )
    },
  )
  activeTimers.set(roundId, timer)
  console.log('PHASE: fixture-timer-started', 'roundId:', roundId, Date.now())
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

  const blindInfo = roundBlindCache.get(roundId)

  let startingSeatIndex: number | undefined
  if (blindInfo) {
    if (bettingRoundNumber === 1) {
      const activeSeats = playerData
        .filter((p) => !p.hasFolded && p.chipStack > 0)
        .map((p) => p.seatIndex)
        .sort((a, b) => a - b)
      startingSeatIndex = calculateNextActiveSeat(
        blindInfo.bbSeatIndex,
        activeSeats.map((s) => ({ seatIndex: s, chipStack: 1, userId: '' })),
      )
    } else {
      const activeSeats = playerData
        .filter((p) => !p.hasFolded && p.chipStack > 0)
        .map((p) => p.seatIndex)
        .sort((a, b) => a - b)
      startingSeatIndex = calculateNextActiveSeat(
        blindInfo.dealerSeatIndex,
        activeSeats.map((s) => ({ seatIndex: s, chipStack: 1, userId: '' })),
      )
    }
  }

  const state = initBettingRound(
    roundId,
    playerData,
    bettingRoundNumber,
    blindInfo ?? undefined,
    startingSeatIndex,
  )

  if (getActivePlayers(state).length <= 1) {
    await db.update(rounds).set({ status: 'WAITING_FOR_RESULTS' }).where(eq(rounds.id, roundId))
    const rfRows = await db.select().from(roundFixtures).where(eq(roundFixtures.roundId, roundId))
    updateRoundPhase(tableId, { roundId, currentPhase: 'waiting', activePlayerId: null })
    emitToRoom(io, tableId, 'round:pause', {
      roundId,
      fixtureIds: rfRows.map((rf) => rf.fixtureId),
      resumeAt: new Date(Date.now() + NEXT_ROUND_DELAY_MS).toISOString(),
    })
    console.log(
      'PHASE: waiting (early-exit, ≤1 active player)',
      'bettingRound:',
      bettingRoundNumber,
      Date.now(),
    )
    startDemoFixtureTimer(roundId, tableId, io)
    return
  }

  const prompt = buildBetPrompt(state)
  updateRoundPhase(tableId, {
    roundId,
    currentPhase: 'betting',
    bettingRound: bettingRoundNumber,
    currentBet: state.currentBet,
    pot: state.pot,
    activePlayerId: prompt.userId,
  })
  emitToRoom(io, tableId, 'bet:prompt', prompt)
  console.log(
    'PHASE: betting',
    'bettingRound:',
    bettingRoundNumber,
    'promptedPlayer:',
    prompt.userId,
    Date.now(),
  )

  if (isBotUser(prompt.userId)) {
    scheduleBotAction(roundId, prompt.userId, io)
  } else {
    startBetTimer(roundId, prompt.userId, prompt.allowedActions, (rid, uid, action, amount, auto) =>
      handleBetAction(rid, uid, action, amount, io, auto),
    )
  }

  const statusMap: Record<number, string> = {
    1: 'BETTING_ROUND_1',
    2: 'BETTING_ROUND_2',
    3: 'BETTING_ROUND_3',
  }
  db.update(rounds)
    .set({ status: statusMap[bettingRoundNumber] ?? 'BETTING_ROUND_1' })
    .where(eq(rounds.id, roundId))
    .catch(() => {})

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
    clearRoundPhase(tableId)
    listTables()
      .then((updatedTables) => io.emit('lobby:tables', { tables: updatedTables }))
      .catch(() => {})
    console.log('GameService - startRound - gameOver', { tableId, winnerId: winner?.userId })
    return
  }

  clearRoundPhase(tableId)

  const fixtureIds = await createDemoFixtures(DEMO_FIXTURE_COUNT)
  const dealResult = await dealCards(tableId, fixtureIds)

  await db.update(rounds).set({ status: 'BOARD_REVEALED' }).where(eq(rounds.id, dealResult.roundId))

  const blindPositions = calculateBlindPositions(
    dealResult.dealerSeatIndex,
    activePlayers.map((p) => ({
      seatIndex: p.seatIndex,
      chipStack: p.chipStack,
      userId: p.userId,
    })),
  )
  const sbPlayer = activePlayers.find((p) => p.seatIndex === blindPositions.sbSeatIndex)!
  const bbPlayer = activePlayers.find((p) => p.seatIndex === blindPositions.bbSeatIndex)!
  const sbAmount = Math.min(table.smallBlind ?? 5, sbPlayer.chipStack)
  const bbAmount = Math.min(table.bigBlind ?? 10, bbPlayer.chipStack)

  await db
    .update(tablePlayers)
    .set({ chipStack: sbPlayer.chipStack - sbAmount })
    .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, sbPlayer.userId)))
  await db
    .update(tablePlayers)
    .set({ chipStack: bbPlayer.chipStack - bbAmount })
    .where(and(eq(tablePlayers.tableId, tableId), eq(tablePlayers.userId, bbPlayer.userId)))
  await db.insert(bets).values([
    {
      roundId: dealResult.roundId,
      userId: sbPlayer.userId,
      bettingRound: 0,
      action: 'SMALL_BLIND',
      amount: sbAmount,
    },
    {
      roundId: dealResult.roundId,
      userId: bbPlayer.userId,
      bettingRound: 0,
      action: 'BIG_BLIND',
      amount: bbAmount,
    },
  ])
  await db
    .update(rounds)
    .set({ pot: sbAmount + bbAmount })
    .where(eq(rounds.id, dealResult.roundId))

  const blindInfo: RoundBlindInfo = {
    dealerSeatIndex: dealResult.dealerSeatIndex,
    sbSeatIndex: blindPositions.sbSeatIndex,
    bbSeatIndex: blindPositions.bbSeatIndex,
    smallBlind: table.smallBlind ?? 5,
    bigBlind: table.bigBlind ?? 10,
    sbAmount,
    bbAmount,
  }
  roundBlindCache.set(dealResult.roundId, blindInfo)
  updateRoundPhase(tableId, {
    roundId: dealResult.roundId,
    currentPhase: 'dealing',
    resolvedFixtures: [],
    revealedPlayerScores: [],
  })

  console.log('GameService - blindsPosted', {
    roundId: dealResult.roundId,
    sbSeat: blindPositions.sbSeatIndex,
    bbSeat: blindPositions.bbSeatIndex,
    sbAmount,
    bbAmount,
  })

  for (const playerDeal of dealResult.playerDeals) {
    emitToPlayer(io, playerDeal.userId, 'round:start', {
      roundId: dealResult.roundId,
      roundNumber: dealResult.roundNumber,
      dealerSeatIndex: dealResult.dealerSeatIndex,
      sbSeatIndex: blindPositions.sbSeatIndex,
      bbSeatIndex: blindPositions.bbSeatIndex,
      smallBlind: table.smallBlind ?? 5,
      bigBlind: table.bigBlind ?? 10,
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

  emitToRoom(io, tableId, 'blinds:posted', {
    sbUserId: sbPlayer.userId,
    sbAmount,
    bbUserId: bbPlayer.userId,
    bbAmount,
    pot: sbAmount + bbAmount,
  })

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

  // Cache fixture display data — timer starts only after betting completes (round:pause)
  const fixtureRowMap = new Map(dealResult.fixtureRows.map((f) => [f.id, f]))
  roundFixtureDataCache.set(dealResult.roundId, { fixtureIds, fixtureRowMap, fixtureTeamMap })
  console.log('PHASE: betting-round-1-started', 'roundId:', dealResult.roundId, Date.now())

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
  autoAction = false,
): Promise<void> {
  cancelBetTimer(roundId, userId)

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
    autoAction,
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
      roundBlindCache.delete(roundId)
      activeTimers.get(roundId)?.cancel()
      activeTimers.delete(roundId)
      emitToRoom(io, tableId, 'round:showdown', [
        { userId: winner.userId, totalScore: 0, cardScores: [], hand: [] },
      ])
      const foldWinPlayers = await getPlayersWithUsernames(tableId)
      emitToRoom(
        io,
        tableId,
        'players:update',
        foldWinPlayers.map((p) => ({
          userId: p.userId,
          chips: p.chipStack,
        })),
      )
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
    roundBlindCache.delete(roundId)
    console.log(
      'PHASE: betting-round-complete',
      'bettingRound:',
      newState.bettingRound,
      'roundId:',
      roundId,
      Date.now(),
    )

    if (newState.bettingRound < 3) {
      await startBettingRound(roundId, tableId, newState.bettingRound + 1, io)
    } else {
      await db.update(rounds).set({ status: 'WAITING_FOR_RESULTS' }).where(eq(rounds.id, roundId))

      const rfRows = await db.select().from(roundFixtures).where(eq(roundFixtures.roundId, roundId))
      updateRoundPhase(tableId, { roundId, currentPhase: 'waiting', activePlayerId: null })
      emitToRoom(io, tableId, 'round:pause', {
        roundId,
        fixtureIds: rfRows.map((rf) => rf.fixtureId),
        resumeAt: new Date(Date.now() + NEXT_ROUND_DELAY_MS).toISOString(),
      })
      console.log(
        'PHASE: waiting → round:pause emitted',
        'bettingRound:',
        newState.bettingRound,
        'roundId:',
        roundId,
        Date.now(),
      )

      // Fixture timer starts HERE — only after all betting is done
      startDemoFixtureTimer(roundId, tableId, io)
    }
    return
  }

  const prompt = buildBetPrompt(newState)
  updateRoundPhase(tableId, {
    roundId,
    activePlayerId: prompt.userId,
    currentBet: newState.currentBet,
    pot: newState.pot,
  })
  emitToRoom(io, tableId, 'bet:prompt', prompt)
  if (isBotUser(prompt.userId)) {
    scheduleBotAction(roundId, prompt.userId, io)
  } else {
    startBetTimer(roundId, prompt.userId, prompt.allowedActions, (rid, uid, act, amt, auto) =>
      handleBetAction(rid, uid, act, amt, io, auto),
    )
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

export function cancelRoundTimers(roundId: string): void {
  activeTimers.get(roundId)?.cancel()
  activeTimers.delete(roundId)
  roundFixtureDataCache.delete(roundId)
  cleanupBetTimers(roundId)
}

export async function resolveRound(roundId: string, io: Server): Promise<void> {
  const tableId = await getTableIdForRound(roundId)

  try {
    const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1)
    if (!round || round.status === 'COMPLETE' || round.status === 'SCORING') return
    // Guard: don't resolve if still in a betting phase (safety net — timer should only start after WAITING_FOR_RESULTS now)
    const activeBettingStatuses = [
      'BOARD_REVEALED',
      'BETTING_ROUND_1',
      'BETTING_ROUND_2',
      'BETTING_ROUND_3',
    ]
    if (activeBettingStatuses.includes(round.status)) {
      console.log(
        'PHASE: resolveRound-blocked (still betting)',
        'status:',
        round.status,
        Date.now(),
      )
      return
    }

    console.log(
      'PHASE: resolve-round-start',
      'roundId:',
      roundId,
      'status:',
      round.status,
      Date.now(),
    )
    await db.update(rounds).set({ status: 'SCORING' }).where(eq(rounds.id, roundId))

    const scoringResult = await scoreRound(roundId)
    console.log(
      'PHASE: scoring-complete',
      'roundId:',
      roundId,
      'winners:',
      scoringResult.winnerIds,
      Date.now(),
    )

    clearBettingState(roundId)
    roundBlindCache.delete(roundId)
    roundFixtureDataCache.delete(roundId)
    activeTimers.get(roundId)?.cancel()
    activeTimers.delete(roundId)

    // ① round:scoring signal
    updateRoundPhase(tableId, { roundId, currentPhase: 'scoring', activePlayerId: null })
    emitToRoom(io, tableId, 'round:scoring', { roundId })
    await new Promise((resolve) => setTimeout(resolve, SCORING_PAUSE_MS))

    // ② Build enriched player score data
    const hands = await db.select().from(playerHands).where(eq(playerHands.roundId, roundId))
    const handTeamIds = hands.flatMap((h) =>
      [h.card1TeamId, h.card2TeamId].filter(Boolean),
    ) as string[]

    const rfRows = await db.select().from(roundFixtures).where(eq(roundFixtures.roundId, roundId))
    const resolvedFixtureIds = rfRows.map((rf) => rf.fixtureId)
    const resolvedFixtures =
      resolvedFixtureIds.length > 0
        ? await db.select().from(fixtures).where(inArray(fixtures.id, resolvedFixtureIds))
        : []
    const fixtureMap = new Map(resolvedFixtures.map((f) => [f.id, f]))

    // Load ALL team IDs: player hands + both sides of every fixture (needed for opponentTeam)
    const fixtureTeamIds = resolvedFixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId])
    const allTeamIds = [...new Set([...handTeamIds, ...fixtureTeamIds])]
    const teamRows =
      allTeamIds.length > 0
        ? await db.select().from(teams).where(inArray(teams.id, allTeamIds))
        : []
    const teamMap = new Map(teamRows.map((t) => [t.id, t]))

    const playersWithNames = await getPlayersWithUsernames(tableId)
    const playerNameMap = new Map(playersWithNames.map((p) => [p.userId, p]))

    const sortedResults = [...scoringResult.results].sort((a, b) => a.totalScore - b.totalScore)

    // ③ Emit player:scored one at a time, lowest first
    for (let i = 0; i < sortedResults.length; i++) {
      const r = sortedResults[i]!
      const hand = hands.find((h) => h.userId === r.userId)
      const handTeamIds = hand
        ? ([hand.card1TeamId, hand.card2TeamId].filter(Boolean) as string[])
        : []
      const playerInfo = playerNameMap.get(r.userId)

      const enrichedCardScores = r.cardScores.map((cs) => {
        const t = teamMap.get(cs.teamId)
        const fix = fixtureMap.get(cs.fixtureId)
        const side = fix?.homeTeamId === cs.teamId ? 'home' : 'away'
        const opponentTeamId = fix ? (side === 'home' ? fix.awayTeamId : fix.homeTeamId) : null
        const opp = opponentTeamId ? teamMap.get(opponentTeamId) : null
        return {
          teamId: cs.teamId,
          team: { name: t?.name ?? cs.teamId, code: cs.teamId, flagUrl: t?.flagEmoji ?? '' },
          fixtureId: cs.fixtureId,
          fixture: {
            homeGoals: fix?.homeGoals ?? 0,
            awayGoals: fix?.awayGoals ?? 0,
            side: side as 'home' | 'away',
            opponentTeam: opp
              ? { name: opp.name, code: opp.id, flagUrl: opp.flagEmoji ?? '' }
              : null,
          },
          baseScore: cs.baseScore,
          goalBonus: cs.goalBonus,
          cleanSheetBonus: cs.cleanSheetBonus,
          penaltyModifier: cs.penaltyModifier,
          totalScore: cs.totalScore,
        }
      })

      const playerScoredPayload: PlayerScoredPayload = {
        userId: r.userId,
        seatIndex: playerInfo?.seatIndex ?? 0,
        username: playerInfo?.username ?? 'Unknown',
        isBot: isBotUser(r.userId),
        hand: handTeamIds.map((tid) => {
          const t = teamMap.get(tid)
          return {
            teamId: tid,
            team: { name: t?.name ?? tid, code: tid, flagUrl: t?.flagEmoji ?? '' },
          }
        }),
        cardScores: enrichedCardScores,
        totalScore: r.totalScore,
        rank: i + 1,
        isWinner: scoringResult.winnerIds.includes(r.userId),
      }
      const revealPhaseState = roundPhaseMap.get(tableId)
      updateRoundPhase(tableId, {
        roundId,
        currentPhase: 'reveals',
        revealedPlayerScores: [
          ...(revealPhaseState?.revealedPlayerScores ?? []),
          playerScoredPayload,
        ],
      })
      emitToRoom(io, tableId, 'player:scored', playerScoredPayload)

      if (i < sortedResults.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, PLAYER_REVEAL_INTERVAL_MS))
      }
    }

    // ④ Winner event
    await new Promise((resolve) => setTimeout(resolve, WINNER_DISPLAY_DELAY_MS))
    const potDist: Record<string, number> = {}
    scoringResult.winnerIds.forEach((id, i) => {
      const share = Math.floor(scoringResult.potAmount / scoringResult.winnerIds.length)
      const bonus = i === 0 ? scoringResult.potAmount - share * scoringResult.winnerIds.length : 0
      potDist[id] = share + bonus
    })
    console.log(
      'PHASE: winner',
      'roundId:',
      roundId,
      'winnerIds:',
      scoringResult.winnerIds,
      Date.now(),
    )
    updateRoundPhase(tableId, { roundId, currentPhase: 'winner' })
    emitToRoom(io, tableId, 'round:winner', {
      winnerIds: scoringResult.winnerIds,
      potDistribution: potDist,
      totalPot: scoringResult.potAmount,
    })

    // ⑤ Chip sync
    const updatedPlayers = await getPlayersWithUsernames(tableId)
    emitToRoom(
      io,
      tableId,
      'players:update',
      updatedPlayers.map((p) => ({
        userId: p.userId,
        chips: p.chipStack,
      })),
    )

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
    clearRoundPhase(tableId)
    listTables()
      .then((updatedTables) => io.emit('lobby:tables', { tables: updatedTables }))
      .catch(() => {})
    console.log('GameService - scheduleNextRound - gameOver', { tableId, winnerId: winner?.userId })
    return
  }

  setTimeout(() => {
    startRound(tableId, io).catch((err) =>
      console.error('GameService - scheduleNextRound - failed', { tableId, error: err }),
    )
  }, NEXT_ROUND_DELAY_MS)
}
