import { eq, and, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import {
  rounds,
  roundFixtures,
  playerHands,
  cardScores,
  fixtures,
  teams,
  tablePlayers,
} from '../../db/schema.js'
import { NotFoundError } from '../../shared/errors.js'
import { calculateCardScore } from '@wpc/shared'
import type { CardScore, Fixture as SharedFixture, Team as SharedTeam } from '@wpc/shared'

interface ScoringResult {
  readonly results: readonly {
    readonly userId: string
    readonly cardScores: readonly CardScore[]
    readonly totalScore: number
  }[]
  readonly winnerIds: readonly string[]
  readonly potAmount: number
}

function toSharedTeam(row: typeof teams.$inferSelect): SharedTeam {
  return {
    id: row.id,
    name: row.name,
    code: row.id,
    flagUrl: row.flagEmoji,
    tier: row.tier as SharedTeam['tier'],
    confederation: row.confederation as SharedTeam['confederation'],
    fifaRanking: row.fifaRanking,
  }
}

function toSharedFixture(
  row: typeof fixtures.$inferSelect,
  homeTeam: typeof teams.$inferSelect,
  awayTeam: typeof teams.$inferSelect,
): SharedFixture {
  return {
    id: row.id,
    homeTeamId: row.homeTeamId,
    awayTeamId: row.awayTeamId,
    homeTeam: toSharedTeam(homeTeam),
    awayTeam: toSharedTeam(awayTeam),
    stage: row.stage as SharedFixture['stage'],
    status: row.status as SharedFixture['status'],
    kickoffTime: row.scheduledAt.toISOString(),
    result:
      row.homeGoals !== null && row.awayGoals !== null
        ? {
            homeScore: row.homeGoals,
            awayScore: row.awayGoals,
            homePenalties: row.homePenaltiesScored > 0 ? row.homePenaltiesScored : null,
            awayPenalties: row.awayPenaltiesScored > 0 ? row.awayPenaltiesScored : null,
            homeRedCards: 0,
            awayRedCards: 0,
          }
        : null,
  }
}

export async function scoreRound(roundId: string): Promise<ScoringResult> {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId)).limit(1)
  if (!round) {
    throw new NotFoundError('Round not found')
  }

  const roundFixtureRows = await db
    .select()
    .from(roundFixtures)
    .where(eq(roundFixtures.roundId, roundId))
  const fixtureIds = roundFixtureRows.map((rf) => rf.fixtureId)
  const fixtureRows = await db.select().from(fixtures).where(inArray(fixtures.id, fixtureIds))

  const allTeamIds = new Set<string>()
  for (const f of fixtureRows) {
    allTeamIds.add(f.homeTeamId)
    allTeamIds.add(f.awayTeamId)
  }
  const teamRows = await db
    .select()
    .from(teams)
    .where(inArray(teams.id, [...allTeamIds]))
  const teamMap = new Map(teamRows.map((t) => [t.id, t]))

  const sharedFixtures = fixtureRows.map((f) =>
    toSharedFixture(f, teamMap.get(f.homeTeamId)!, teamMap.get(f.awayTeamId)!),
  )

  const hands = await db
    .select()
    .from(playerHands)
    .where(and(eq(playerHands.roundId, roundId), eq(playerHands.hasFolded, false)))

  const results: Array<{
    readonly userId: string
    readonly cardScores: readonly CardScore[]
    readonly totalScore: number
  }> = []

  for (const hand of hands) {
    const handCardScores: CardScore[] = []

    for (const teamId of [hand.card1TeamId, hand.card2TeamId]) {
      if (!teamId) continue

      const fixture = sharedFixtures.find((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
      if (!fixture) continue

      const score = calculateCardScore(teamId, fixture)
      handCardScores.push(score)

      await db.insert(cardScores).values({
        handId: hand.id,
        teamId,
        fixtureId: fixture.id,
        basePoints: score.baseScore,
        highScorerBonus: score.goalBonus,
        cleanSheetBonus: score.cleanSheetBonus,
        penaltyBonus: score.penaltyModifier,
        totalPoints: score.totalScore,
      })
    }

    const totalScore = handCardScores.reduce((sum, s) => sum + s.totalScore, 0)

    await db.update(playerHands).set({ totalScore }).where(eq(playerHands.id, hand.id))

    results.push({ userId: hand.userId, cardScores: handCardScores, totalScore })
  }

  let maxScore = -1
  for (const r of results) {
    if (r.totalScore > maxScore) maxScore = r.totalScore
  }
  const winnerIds = results.filter((r) => r.totalScore === maxScore).map((r) => r.userId)

  const winnerId = winnerIds.length === 1 ? winnerIds[0]! : null
  await db
    .update(rounds)
    .set({ winnerId, status: 'COMPLETE', resolvedAt: new Date() })
    .where(eq(rounds.id, roundId))

  const potAmount = round.pot
  if (winnerIds.length > 0) {
    const share = Math.floor(potAmount / winnerIds.length)
    const remainder = potAmount - share * winnerIds.length

    for (let i = 0; i < winnerIds.length; i++) {
      const wId = winnerIds[i]!
      const winnerShare = i === 0 ? share + remainder : share

      const [player] = await db
        .select()
        .from(tablePlayers)
        .where(and(eq(tablePlayers.tableId, round.tableId), eq(tablePlayers.userId, wId)))
        .limit(1)

      if (player) {
        await db
          .update(tablePlayers)
          .set({ chipStack: player.chipStack + winnerShare })
          .where(and(eq(tablePlayers.tableId, round.tableId), eq(tablePlayers.userId, wId)))
      }
    }
  }

  console.log('ScoringService - scoreRound', {
    roundId,
    winnerIds,
    potAmount,
    resultCount: results.length,
  })

  return { results, winnerIds, potAmount }
}
