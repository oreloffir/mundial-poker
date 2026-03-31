import crypto from 'node:crypto'
import { eq, inArray, asc, desc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  fixtures,
  teams,
  tablePlayers,
  rounds,
  roundFixtures,
  playerHands,
  users,
} from '../../db/schema.js'
import { NotFoundError, GameError } from '../../shared/errors.js'

interface DealtCard {
  readonly teamId: string
  readonly teamName: string
  readonly teamCode: string
  readonly flagEmoji: string
  readonly tier: string
  readonly fifaRanking: number
  readonly fixtureId: string
}

interface PlayerDeal {
  readonly userId: string
  readonly username: string
  readonly seatIndex: number
  readonly cards: readonly [DealtCard, DealtCard]
}

interface DealResult {
  readonly roundId: string
  readonly roundNumber: number
  readonly dealerSeatIndex: number
  readonly fixtureRows: readonly (typeof fixtures.$inferSelect)[]
  readonly playerDeals: readonly PlayerDeal[]
}

function fisherYatesShuffle<T>(items: readonly T[]): readonly T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const randomBytes = crypto.randomBytes(4)
    const j = randomBytes.readUInt32BE(0) % (i + 1)
    const temp = result[i]
    result[i] = result[j]!
    result[j] = temp!
  }
  return result
}

async function getLastRoundNumber(tableId: string): Promise<number> {
  const [lastRound] = await db
    .select({ roundNumber: rounds.roundNumber })
    .from(rounds)
    .where(eq(rounds.tableId, tableId))
    .orderBy(desc(rounds.roundNumber))
    .limit(1)

  return lastRound?.roundNumber ?? 0
}

async function getLastDealerSeat(tableId: string): Promise<number> {
  const [lastRound] = await db
    .select({ dealerSeatIndex: rounds.dealerSeatIndex })
    .from(rounds)
    .where(eq(rounds.tableId, tableId))
    .orderBy(desc(rounds.roundNumber))
    .limit(1)

  return lastRound?.dealerSeatIndex ?? -1
}

export async function dealCards(
  tableId: string,
  fixtureIds: readonly string[],
): Promise<DealResult> {
  if (fixtureIds.length === 0) {
    throw new GameError('No fixtures provided for dealing')
  }

  const fixtureRows = await db
    .select()
    .from(fixtures)
    .where(inArray(fixtures.id, [...fixtureIds]))
  if (fixtureRows.length === 0) {
    throw new NotFoundError('No fixtures found for the provided IDs')
  }

  const activeTeamIds = new Set<string>()
  for (const f of fixtureRows) {
    activeTeamIds.add(f.homeTeamId)
    activeTeamIds.add(f.awayTeamId)
  }

  const players = await db
    .select({
      userId: tablePlayers.userId,
      seatIndex: tablePlayers.seatIndex,
      chipStack: tablePlayers.chipStack,
      username: users.username,
    })
    .from(tablePlayers)
    .innerJoin(users, eq(tablePlayers.userId, users.id))
    .where(eq(tablePlayers.tableId, tableId))
    .orderBy(asc(tablePlayers.seatIndex))

  if (players.length < 2) {
    throw new GameError('Not enough players at the table to deal')
  }

  const requiredCards = players.length * 2
  const teamIdsList = [...activeTeamIds]

  if (teamIdsList.length < requiredCards) {
    throw new GameError(
      `Not enough active teams to deal: need ${requiredCards} cards but only ${teamIdsList.length} teams are playing. Add more fixtures.`,
    )
  }

  const teamRows = await db.select().from(teams).where(inArray(teams.id, teamIdsList))
  const teamMap = new Map(teamRows.map((t) => [t.id, t]))

  const fixtureTeamMap = new Map<string, string>()
  for (const f of fixtureRows) {
    fixtureTeamMap.set(f.homeTeamId, f.id)
    fixtureTeamMap.set(f.awayTeamId, f.id)
  }

  const deck = fisherYatesShuffle(teamIdsList)

  const lastRoundNumber = await getLastRoundNumber(tableId)
  const lastDealerSeat = await getLastDealerSeat(tableId)
  const playerSeats = players.map((p) => p.seatIndex).sort((a, b) => a - b)
  const nextDealerIndex = playerSeats.findIndex((s) => s > lastDealerSeat)
  const dealerSeatIndex = nextDealerIndex >= 0 ? playerSeats[nextDealerIndex]! : playerSeats[0]!

  const [round] = await db
    .insert(rounds)
    .values({
      tableId,
      roundNumber: lastRoundNumber + 1,
      status: 'DEALING',
      dealerSeatIndex,
      pot: 0,
    })
    .returning()

  await db
    .insert(roundFixtures)
    .values(fixtureIds.map((fixtureId) => ({ roundId: round!.id, fixtureId })))

  const playerDeals: PlayerDeal[] = []
  const handInserts: {
    roundId: string
    userId: string
    card1TeamId: string
    card2TeamId: string
    hasFolded: boolean
  }[] = []

  let cardIndex = 0
  for (const player of players) {
    const card1Id = deck[cardIndex]!
    const card2Id = deck[cardIndex + 1]!
    cardIndex += 2

    const card1Team = teamMap.get(card1Id)
    const card2Team = teamMap.get(card2Id)
    const card1FixtureId = fixtureTeamMap.get(card1Id) ?? ''
    const card2FixtureId = fixtureTeamMap.get(card2Id) ?? ''

    handInserts.push({
      roundId: round!.id,
      userId: player.userId,
      card1TeamId: card1Id,
      card2TeamId: card2Id,
      hasFolded: false,
    })

    playerDeals.push({
      userId: player.userId,
      username: player.username,
      seatIndex: player.seatIndex,
      cards: [
        {
          teamId: card1Id,
          teamName: card1Team?.name ?? 'Unknown',
          teamCode: card1Id,
          flagEmoji: card1Team?.flagEmoji ?? '',
          tier: card1Team?.tier ?? 'C',
          fifaRanking: card1Team?.fifaRanking ?? 99,
          fixtureId: card1FixtureId,
        },
        {
          teamId: card2Id,
          teamName: card2Team?.name ?? 'Unknown',
          teamCode: card2Id,
          flagEmoji: card2Team?.flagEmoji ?? '',
          tier: card2Team?.tier ?? 'C',
          fifaRanking: card2Team?.fifaRanking ?? 99,
          fixtureId: card2FixtureId,
        },
      ],
    })
  }

  await db.insert(playerHands).values(handInserts)

  console.log('DealingService - dealCards', {
    roundId: round!.id,
    tableId,
    playerCount: players.length,
    cardCount: cardIndex,
  })

  return {
    roundId: round!.id,
    roundNumber: lastRoundNumber + 1,
    dealerSeatIndex,
    fixtureRows,
    playerDeals,
  }
}
