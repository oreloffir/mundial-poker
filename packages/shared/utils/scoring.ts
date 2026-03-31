import type { CardScore, Fixture, PlayerHand } from '../types/game.types.js'

const MAX_CARD_SCORE = 12
const WIN_POINTS = 5
const DRAW_POINTS = 3
const LOSS_POINTS = 0
const GOAL_BONUS_THRESHOLD = 3
const GOAL_BONUS = 4
const CLEAN_SHEET_BONUS = 2
const PENALTY_SCORED_BONUS = 1
const PENALTY_MISSED_PENALTY = -1

function getTeamSide(teamId: string, fixture: Fixture): 'home' | 'away' | null {
  if (fixture.homeTeamId === teamId) return 'home'
  if (fixture.awayTeamId === teamId) return 'away'
  return null
}

function calculateBaseScore(goalsFor: number, goalsAgainst: number): number {
  if (goalsFor > goalsAgainst) return WIN_POINTS
  if (goalsFor === goalsAgainst) return DRAW_POINTS
  return LOSS_POINTS
}

function calculateGoalBonus(goalsFor: number): number {
  return goalsFor >= GOAL_BONUS_THRESHOLD ? GOAL_BONUS : 0
}

function calculateCleanSheetBonus(goalsAgainst: number): number {
  return goalsAgainst === 0 ? CLEAN_SHEET_BONUS : 0
}

function calculatePenaltyModifier(
  penaltiesScored: number | null,
  penaltiesMissed: number | null,
): number {
  const scored = (penaltiesScored ?? 0) * PENALTY_SCORED_BONUS
  const missed = (penaltiesMissed ?? 0) * PENALTY_MISSED_PENALTY
  return scored + missed
}

export function calculateCardScore(teamId: string, fixture: Fixture): CardScore {
  const side = getTeamSide(teamId, fixture)

  if (!side || !fixture.result) {
    return {
      teamId,
      fixtureId: fixture.id,
      baseScore: 0,
      goalBonus: 0,
      cleanSheetBonus: 0,
      penaltyModifier: 0,
      totalScore: 0,
    }
  }

  const isHome = side === 'home'
  const goalsFor = isHome ? fixture.result.homeScore : fixture.result.awayScore
  const goalsAgainst = isHome ? fixture.result.awayScore : fixture.result.homeScore
  const penaltiesScored = isHome ? fixture.result.homePenalties : fixture.result.awayPenalties
  const penaltiesMissed = isHome ? fixture.result.awayPenalties : fixture.result.homePenalties

  const baseScore = calculateBaseScore(goalsFor, goalsAgainst)
  const goalBonus = calculateGoalBonus(goalsFor)
  const cleanSheetBonus = calculateCleanSheetBonus(goalsAgainst)
  const penaltyModifier = calculatePenaltyModifier(penaltiesScored, penaltiesMissed)

  const rawTotal = baseScore + goalBonus + cleanSheetBonus + penaltyModifier
  const totalScore = Math.min(Math.max(rawTotal, 0), MAX_CARD_SCORE)

  return {
    teamId,
    fixtureId: fixture.id,
    baseScore,
    goalBonus,
    cleanSheetBonus,
    penaltyModifier,
    totalScore,
  }
}

export function calculateHandScore(
  hand: PlayerHand,
  fixtures: Fixture[],
): { readonly totalScore: number; readonly cardScores: readonly CardScore[] } {
  const fixtureMap = new Map(fixtures.map((f) => [f.id, f]))

  const cardScores = hand.cards.map((card) => {
    const fixture = fixtureMap.get(card.fixtureId)
    if (!fixture) {
      return {
        teamId: card.teamId,
        fixtureId: card.fixtureId,
        baseScore: 0,
        goalBonus: 0,
        cleanSheetBonus: 0,
        penaltyModifier: 0,
        totalScore: 0,
      }
    }
    return calculateCardScore(card.teamId, fixture)
  })

  const totalScore = cardScores.reduce((sum, score) => sum + score.totalScore, 0)

  return { totalScore, cardScores }
}

export function determineWinners(
  hands: PlayerHand[],
  fixtures: Fixture[],
): { readonly winnerIds: readonly string[]; readonly scores: ReadonlyMap<string, number> } {
  const scores = new Map<string, number>()
  let maxScore = -1

  for (const hand of hands) {
    const { totalScore } = calculateHandScore(hand, fixtures)
    scores.set(hand.userId, totalScore)
    if (totalScore > maxScore) {
      maxScore = totalScore
    }
  }

  const winnerIds = hands
    .filter((hand) => scores.get(hand.userId) === maxScore)
    .map((hand) => hand.userId)

  return { winnerIds, scores }
}
