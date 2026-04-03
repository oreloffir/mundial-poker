import { stateGet, stateSet, stateDel } from '../../lib/game-state-store.js'
import type { FixtureResultPayload, PlayerScoredPayload } from '@wpc/shared'

export type RoundPhase =
  | 'dealing'
  | 'betting'
  | 'waiting'
  | 'fixtures'
  | 'scoring'
  | 'reveals'
  | 'winner'

export interface RoundPhaseState {
  readonly roundId: string
  readonly currentPhase: RoundPhase
  readonly resolvedFixtures: readonly FixtureResultPayload[]
  readonly revealedPlayerScores: readonly PlayerScoredPayload[]
  readonly bettingRound: number
  readonly currentBet: number
  readonly pot: number
  readonly activePlayerId: string | null
}

const STORE_PREFIX = 'phase'

export async function getRoundPhaseState(tableId: string): Promise<RoundPhaseState | undefined> {
  return stateGet<RoundPhaseState>(STORE_PREFIX, tableId)
}

export async function updateRoundPhase(
  tableId: string,
  update: Partial<RoundPhaseState> & { roundId: string },
): Promise<void> {
  const existing = await stateGet<RoundPhaseState>(STORE_PREFIX, tableId)
  await stateSet<RoundPhaseState>(STORE_PREFIX, tableId, {
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

export async function clearRoundPhase(tableId: string): Promise<void> {
  await stateDel(STORE_PREFIX, tableId)
}
