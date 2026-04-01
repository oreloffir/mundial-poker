import { ne } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { tables } from '../../db/schema.js'
import * as tableRepo from './table.repository.js'
import { NotFoundError, GameError, ForbiddenError } from '../../shared/errors.js'
import { BOT_IDS, isBotUser, createSingleBot } from '../game/bot.service.js'

const MAX_PLAYERS = 5
const DEFAULT_STARTING_CHIPS = 500
const DEFAULT_SMALL_BLIND = 5
const DEFAULT_BIG_BLIND = 10

interface CreateTableOptions {
  readonly startingChips?: number
  readonly smallBlind?: number
  readonly bigBlind?: number
}

export async function listTables(includeCompleted = false) {
  const tables = await tableRepo.findAll(includeCompleted)
  return tables
}

export async function getTable(id: string) {
  const table = await tableRepo.findById(id)
  if (!table) {
    throw new NotFoundError('Table not found')
  }
  return table
}

export async function createTable(name: string, hostId: string, opts: CreateTableOptions = {}) {
  const startingChips = opts.startingChips ?? DEFAULT_STARTING_CHIPS
  const smallBlind = opts.smallBlind ?? DEFAULT_SMALL_BLIND
  const bigBlind = opts.bigBlind ?? DEFAULT_BIG_BLIND

  const table = await tableRepo.create(name, hostId, startingChips, smallBlind, bigBlind)
  await tableRepo.addPlayer(table.id, hostId, 0, startingChips)

  return tableRepo.findById(table.id)
}

export async function joinTable(tableId: string, userId: string) {
  const table = await tableRepo.findById(tableId)
  if (!table) {
    throw new NotFoundError('Table not found')
  }

  if (table.status !== 'WAITING') {
    throw new GameError('Table is not accepting new players')
  }

  const existingPlayer = table.players.find((p) => p.userId === userId)
  if (existingPlayer) {
    throw new GameError('Already seated at this table')
  }

  if (table.players.length >= MAX_PLAYERS) {
    throw new GameError('Table is full')
  }

  const occupiedSeats = new Set(table.players.map((p) => p.seatIndex))
  const nextSeat = Array.from({ length: MAX_PLAYERS }, (_, i) => i).find(
    (i) => !occupiedSeats.has(i),
  )

  if (nextSeat === undefined) {
    throw new GameError('No available seats')
  }

  await tableRepo.addPlayer(tableId, userId, nextSeat, table.startingChips)
  return tableRepo.findById(tableId)
}

export async function leaveTable(tableId: string, userId: string) {
  const table = await tableRepo.findById(tableId)
  if (!table) {
    throw new NotFoundError('Table not found')
  }

  const isPlayer = table.players.some((p) => p.userId === userId)
  if (!isPlayer) {
    throw new GameError('Not seated at this table')
  }

  await tableRepo.removePlayer(tableId, userId)

  if (table.hostId === userId) {
    const remainingPlayers = table.players.filter((p) => p.userId !== userId)
    if (remainingPlayers.length === 0) {
      await tableRepo.deleteTable(tableId)
      return null
    }
    const newHost = remainingPlayers.sort((a, b) => a.seatIndex - b.seatIndex)[0]
    await tableRepo.updateHost(tableId, newHost.userId)
  }

  return tableRepo.findById(tableId)
}

export async function addBotsToTable(tableId: string, requestingUserId: string) {
  const table = await tableRepo.findById(tableId)
  if (!table) throw new NotFoundError('Table not found')

  if (table.hostId !== requestingUserId) throw new ForbiddenError('Only the host can add bots')
  if (table.status !== 'WAITING') throw new GameError('Cannot add bots after game started')

  const currentPlayerIds = new Set(table.players.map((p) => p.userId))
  const existingBotIds = table.players.filter((p) => isBotUser(p.userId)).map((p) => p.userId)
  const botsToAdd = (BOT_IDS as readonly string[]).filter((id) => !currentPlayerIds.has(id))

  const availableSeats = Array.from({ length: MAX_PLAYERS }, (_, i) => i).filter(
    (i) => !table.players.some((p) => p.seatIndex === i),
  )

  const slotsToFill = Math.min(botsToAdd.length, availableSeats.length)
  for (let i = 0; i < slotsToFill; i++) {
    await tableRepo.addPlayer(tableId, botsToAdd[i]!, availableSeats[i]!, table.startingChips)
  }

  console.log('TableService - addBotsToTable', {
    tableId,
    added: slotsToFill,
    existingBots: existingBotIds.length,
  })

  return tableRepo.findById(tableId)
}

export async function addSingleBotToTable(tableId: string, requestingUserId: string) {
  const table = await tableRepo.findById(tableId)
  if (!table) throw new NotFoundError('Table not found')
  if (table.hostId !== requestingUserId) throw new ForbiddenError('Only the host can add bots')
  if (table.status !== 'WAITING') throw new GameError('Cannot add bots after game started')
  if (table.players.length >= MAX_PLAYERS) throw new GameError('Table is full')

  const occupiedSeats = new Set(table.players.map((p) => p.seatIndex))
  const nextSeat = Array.from({ length: MAX_PLAYERS }, (_, i) => i).find(
    (i) => !occupiedSeats.has(i),
  )
  if (nextSeat === undefined) throw new GameError('No available seats')

  const bot = await createSingleBot()
  await tableRepo.addPlayer(tableId, bot.id, nextSeat, table.startingChips)

  console.log('TableService - addSingleBotToTable', {
    tableId,
    botId: bot.id,
    username: bot.username,
  })
  return tableRepo.findById(tableId)
}

export async function startGame(tableId: string, userId: string) {
  const table = await tableRepo.findById(tableId)
  if (!table) {
    throw new NotFoundError('Table not found')
  }

  if (table.hostId !== userId) {
    throw new ForbiddenError('Only the host can start the game')
  }

  if (table.status !== 'WAITING') {
    throw new GameError('Game already started')
  }

  if (table.players.length < 2) {
    throw new GameError('Need at least 2 players to start')
  }

  await tableRepo.updateStatus(tableId, 'IN_PROGRESS')
  return tableRepo.findById(tableId)
}

export async function cleanupStaleTables(): Promise<void> {
  const result = await db
    .update(tables)
    .set({ status: 'COMPLETED', updatedAt: new Date() })
    .where(ne(tables.status, 'COMPLETED'))
    .returning({ id: tables.id })

  if (result.length > 0) {
    console.log('TableService - cleanupStaleTables', { cleaned: result.length, ids: result.map((r) => r.id) })
  }
}
