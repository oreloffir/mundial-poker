import { randomUUID, randomInt } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { users } from '../../db/schema.js'
import type { Server } from 'socket.io'
import type { BetAction } from '@wpc/shared'
import { getBettingState, getAllowedActions } from './betting.service.js'
import { handleBetAction } from './game.service.js'

const BOT_BCRYPT_ROUNDS = 4

export const BOT_IDS = [
  'b0000000-b000-b000-b000-b00000000001',
  'b0000000-b000-b000-b000-b00000000002',
  'b0000000-b000-b000-b000-b00000000003',
  'b0000000-b000-b000-b000-b00000000004',
] as const

const BOT_PROFILES = [
  { id: BOT_IDS[0], username: 'Bot-Alpha', email: 'bot-alpha@wpc.bot' },
  { id: BOT_IDS[1], username: 'Bot-Beta', email: 'bot-beta@wpc.bot' },
  { id: BOT_IDS[2], username: 'Bot-Gamma', email: 'bot-gamma@wpc.bot' },
  { id: BOT_IDS[3], username: 'Bot-Delta', email: 'bot-delta@wpc.bot' },
] as const

const BOT_NAME_PREFIXES = [
  'Lucky',
  'Wild',
  'Sharp',
  'Cool',
  'Ace',
  'Big',
  'Slim',
  'Iron',
  'Flash',
  'Blaze',
  'Storm',
  'Hawk',
  'Wolf',
  'Duke',
  'Rex',
] as const
const BOT_NAME_SUFFIXES = [
  'Pete',
  'Jack',
  'Mike',
  'Sam',
  'Tony',
  'Leo',
  'Max',
  'Joe',
  'Nick',
  'Dan',
  'Ray',
  'Finn',
  'Gus',
  'Hank',
  'Kai',
] as const

const dynamicBotIds = new Set<string>()

export function isBotUser(userId: string): boolean {
  return (BOT_IDS as readonly string[]).includes(userId) || dynamicBotIds.has(userId)
}

export async function createSingleBot(): Promise<{
  readonly id: string
  readonly username: string
}> {
  const prefix = BOT_NAME_PREFIXES[randomInt(BOT_NAME_PREFIXES.length)]
  const suffix = BOT_NAME_SUFFIXES[randomInt(BOT_NAME_SUFFIXES.length)]
  const tag = randomInt(10, 100)
  const username = `${prefix}-${suffix}${tag}`
  const id = randomUUID()
  const email = `bot-${id}@wpc.bot`
  const passwordHash = await bcrypt.hash(randomUUID(), BOT_BCRYPT_ROUNDS)

  await db.insert(users).values({ id, email, username, passwordHash })
  dynamicBotIds.add(id)
  console.log('BotService - createSingleBot', { botId: id, username })
  return { id, username }
}

export async function ensureBotsExist(): Promise<void> {
  for (const bot of BOT_PROFILES) {
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, bot.email))
      .limit(1)
    if (!existing) {
      const passwordHash = await bcrypt.hash(randomUUID(), BOT_BCRYPT_ROUNDS)
      await db
        .insert(users)
        .values({ id: bot.id, email: bot.email, username: bot.username, passwordHash })
      console.log('BotService - ensureBotsExist - created', {
        botId: bot.id,
        username: bot.username,
      })
    }
  }
}

const BOT_ACTION_DELAY_MS = 1500

export function scheduleBotAction(roundId: string, botUserId: string, io: Server): void {
  setTimeout(() => {
    const state = getBettingState(roundId)
    if (!state) return

    const currentPlayer = state.playerStates[state.currentPlayerIndex]
    if (!currentPlayer || currentPlayer.userId !== botUserId) return

    const allowed = getAllowedActions(state, currentPlayer)
    const action: BetAction = allowed.includes('CHECK') ? 'CHECK' : 'CALL'
    const amount = action === 'CALL' ? state.currentBet - currentPlayer.totalBet : 0

    handleBetAction(roundId, botUserId, action, amount, io).catch((err) =>
      console.error('BotService - scheduleBotAction - failed', { roundId, botUserId, error: err }),
    )
  }, BOT_ACTION_DELAY_MS)
}
