import type { Server } from 'socket.io'
import { stateGet, stateKeys, stateDel } from '../../lib/game-state-store.js'
import {
  getBettingState,
  startBetTimerWithDuration,
  TIMER_PREFIX,
  type TimerState,
} from './betting.service.js'
import { handleBetAction } from './game.service.js'
import { getRoundPhaseState } from './phase-tracker.js'

export async function recoverTimers(io: Server): Promise<number> {
  const timerKeys = await stateKeys(TIMER_PREFIX)

  if (timerKeys.length === 0) {
    return 0
  }

  let recovered = 0

  for (const tableId of timerKeys) {
    const timerState = await stateGet<TimerState>(TIMER_PREFIX, tableId)
    if (!timerState) {
      await stateDel(TIMER_PREFIX, tableId)
      continue
    }

    const bettingState = await getBettingState(timerState.roundId)
    const phaseState = await getRoundPhaseState(tableId)

    if (!bettingState || !phaseState || phaseState.currentPhase !== 'betting') {
      console.error('TimerRecovery - staleTimer - cleaned up', {
        tableId,
        roundId: timerState.roundId,
      })
      await stateDel(TIMER_PREFIX, tableId)
      continue
    }

    const currentPlayer = bettingState.playerStates[bettingState.currentPlayerIndex]
    if (!currentPlayer || currentPlayer.userId !== timerState.playerId) {
      console.error('TimerRecovery - playerMismatch - cleaned up', {
        tableId,
        roundId: timerState.roundId,
        expected: timerState.playerId,
      })
      await stateDel(TIMER_PREFIX, tableId)
      continue
    }

    const elapsed = Date.now() - timerState.startedAt
    const remaining = timerState.durationMs - elapsed

    if (remaining <= 0) {
      console.error('TimerRecovery - expired - auto-folding', {
        tableId,
        roundId: timerState.roundId,
        playerId: timerState.playerId,
        elapsedMs: elapsed,
      })
      await stateDel(TIMER_PREFIX, tableId)
      const action = timerState.allowedActions.includes('CHECK') ? 'CHECK' : 'FOLD'
      try {
        await handleBetAction(timerState.roundId, timerState.playerId, action, 0, io, true)
      } catch (err) {
        console.error('TimerRecovery - autoFoldFailed', {
          tableId,
          roundId: timerState.roundId,
          error: err,
        })
      }
      recovered++
      continue
    }

    console.error('TimerRecovery - recovered', {
      tableId,
      roundId: timerState.roundId,
      playerId: timerState.playerId,
      remainingMs: remaining,
    })
    startBetTimerWithDuration(
      timerState.roundId,
      timerState.playerId,
      timerState.allowedActions,
      remaining,
      (rid, uid, act, amt, auto) => handleBetAction(rid, uid, act, amt, io, auto),
    )
    recovered++
  }

  return recovered
}
