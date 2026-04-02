import crypto from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { fixtures, teams } from '../../db/schema.js'
import type { MatchResult } from '@wpc/shared'

interface DemoFixtureConfig {
  readonly home: string
  readonly away: string
  readonly stage: string
  readonly label: string
}

const DEMO_FIXTURES: readonly DemoFixtureConfig[] = [
  { home: 'ARG', away: 'FRA', stage: 'FINAL', label: 'Argentina vs France' },
  { home: 'BRA', away: 'GER', stage: 'SEMI_FINAL', label: 'Brazil vs Germany' },
  { home: 'ENG', away: 'POR', stage: 'QUARTER_FINAL', label: 'England vs Portugal' },
  { home: 'ESP', away: 'NED', stage: 'SEMI_FINAL', label: 'Spain vs Netherlands' },
  { home: 'ITA', away: 'CRO', stage: 'QUARTER_FINAL', label: 'Italy vs Croatia' },
  { home: 'URU', away: 'COL', stage: 'ROUND_OF_16', label: 'Uruguay vs Colombia' },
  { home: 'BEL', away: 'DEN', stage: 'GROUP', label: 'Belgium vs Denmark' },
  { home: 'JPN', away: 'MAR', stage: 'ROUND_OF_16', label: 'Japan vs Morocco' },
  { home: 'USA', away: 'MEX', stage: 'GROUP', label: 'USA vs Mexico' },
  { home: 'CAN', away: 'SEN', stage: 'GROUP', label: 'Canada vs Senegal' },
  { home: 'AUS', away: 'KOR', stage: 'GROUP', label: 'Australia vs South Korea' },
  { home: 'KSA', away: 'IRN', stage: 'GROUP', label: 'Saudi Arabia vs Iran' },
  { home: 'ECU', away: 'SRB', stage: 'GROUP', label: 'Ecuador vs Serbia' },
  { home: 'SUI', away: 'POL', stage: 'ROUND_OF_16', label: 'Switzerland vs Poland' },
  { home: 'WAL', away: 'TUN', stage: 'GROUP', label: 'Wales vs Tunisia' },
  { home: 'CMR', away: 'GHA', stage: 'THIRD_PLACE', label: 'Cameroon vs Ghana' },
]

const GOAL_WEIGHTS: readonly { readonly goals: number; readonly weight: number }[] = [
  { goals: 0, weight: 15 },
  { goals: 1, weight: 30 },
  { goals: 2, weight: 25 },
  { goals: 3, weight: 15 },
  { goals: 4, weight: 10 },
  { goals: 5, weight: 5 },
]

const TOTAL_GOAL_WEIGHT = GOAL_WEIGHTS.reduce((sum, w) => sum + w.weight, 0)
const PENALTY_CHANCE_PERCENT = 20

function weightedRandomGoals(): number {
  const rand = crypto.randomInt(0, TOTAL_GOAL_WEIGHT)
  let cumulative = 0
  for (const entry of GOAL_WEIGHTS) {
    cumulative += entry.weight
    if (rand < cumulative) return entry.goals
  }
  return 1
}

export function generateDemoResult(): MatchResult {
  const homeScore = weightedRandomGoals()
  const awayScore = weightedRandomGoals()
  const hasPenalty = homeScore === awayScore && crypto.randomInt(0, 100) < PENALTY_CHANCE_PERCENT

  if (hasPenalty) {
    const homePen = crypto.randomInt(3, 6)
    let awayPen = crypto.randomInt(2, 6)
    if (homePen === awayPen) {
      awayPen = homePen > 3 ? homePen - 1 : homePen + 1
    }
    return {
      homeScore,
      awayScore,
      homePenalties: homePen,
      awayPenalties: awayPen,
      homeRedCards: 0,
      awayRedCards: 0,
    }
  }

  return {
    homeScore,
    awayScore,
    homePenalties: null,
    awayPenalties: null,
    homeRedCards: 0,
    awayRedCards: 0,
  }
}

function shuffleArray<T>(array: readonly T[]): readonly T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1)
    const temp = result[i]
    result[i] = result[j]!
    result[j] = temp!
  }
  return result
}

export async function createDemoFixtures(count: number): Promise<readonly string[]> {
  const selected = shuffleArray(DEMO_FIXTURES).slice(0, count)

  const allTeamIds = selected.flatMap((f) => [f.home, f.away])
  const existingTeams = await db
    .select({ id: teams.id })
    .from(teams)
    .where(inArray(teams.id, allTeamIds))
  const existingTeamIds = new Set(existingTeams.map((t) => t.id))

  const validFixtures = selected.filter(
    (f) => existingTeamIds.has(f.home) && existingTeamIds.has(f.away),
  )

  const toInsert = validFixtures.length > 0 ? validFixtures : selected.slice(0, count)

  const insertedRows = await db
    .insert(fixtures)
    .values(
      toInsert.map((f) => ({
        homeTeamId: f.home,
        awayTeamId: f.away,
        scheduledAt: new Date(),
        stage: f.stage,
        status: 'DEMO' as const,
      })),
    )
    .returning()

  const fixtureIds = insertedRows.map((r) => r.id)
  console.log('DemoService - createDemoFixtures', { count: fixtureIds.length, fixtureIds })

  return fixtureIds
}

export function resolveDemoFixturesProgressive(
  fixtureIds: readonly string[],
  intervalMs: number,
  onEachResolved: (fixtureId: string, result: MatchResult) => void,
  onAllResolved: () => void,
): { readonly cancel: () => void } {
  const timers: NodeJS.Timeout[] = []

  fixtureIds.forEach((fixtureId, i) => {
    const timer = setTimeout(async () => {
      try {
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

        onEachResolved(fixtureId, result)
        console.log('DemoService - fixtureResolved', { fixtureId, index: i, result: `${result.homeScore}-${result.awayScore}` })

        if (i === fixtureIds.length - 1) {
          onAllResolved()
        }
      } catch (error) {
        console.error('DemoService - resolveDemoFixture - error', { fixtureId, error })
      }
    }, (i + 1) * intervalMs)
    timers.push(timer)
  })

  return { cancel: () => timers.forEach(clearTimeout) }
}

export function resolveDemoFixtures(
  fixtureIds: readonly string[],
  delayMs: number,
  onResolved?: () => void,
): { readonly cancel: () => void } {
  const timer = setTimeout(async () => {
    try {
      for (const fixtureId of fixtureIds) {
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
      }
      console.log('DemoService - resolveDemoFixtures', { resolvedCount: fixtureIds.length })
      onResolved?.()
    } catch (error) {
      console.error('DemoService - resolveDemoFixtures - error', { error, fixtureIds })
    }
  }, delayMs)

  return { cancel: () => clearTimeout(timer) }
}

export { DEMO_FIXTURES }
