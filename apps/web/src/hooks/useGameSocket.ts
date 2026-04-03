import { useEffect, useCallback, useRef } from 'react'
import { getSocket, disconnectSocket } from '@/lib/socket'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import type {
  BetAction,
  TeamCard,
  TeamTier,
  Confederation,
  Fixture,
  RoundStatus,
} from '@wpc/shared'
import type { RoundCardPayload, FixtureResultPayload, PlayerScoredPayload } from '@wpc/shared'
import type { ShowdownPhase } from '@/stores/gameStore'

// C1 fix: use confederation from payload; falls back to 'UEFA' until Soni adds the field (TODO S4)
function toTeamCard(c: RoundCardPayload): TeamCard {
  return {
    teamId: c.teamId,
    fixtureId: c.fixtureId,
    team: {
      id: c.teamId,
      name: c.teamName,
      code: c.teamCode,
      flagUrl: c.flagEmoji,
      tier: c.tier as TeamTier,
      confederation: (c.confederation ?? 'UEFA') as Confederation,
      fifaRanking: c.fifaRanking,
    },
  }
}

const MIN_WINNER_BANNER_MS = 3000

export function useGameSocket(tableId: string) {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)
  const winnerShownAtRef = useRef(0)
  const pendingRoundStartRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const store = useGameStore

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket
    const userId = useAuthStore.getState().user?.id

    socket.emit('table:join', { tableId }, (response) => {
      if (!response.success) {
        store.getState().setError(response.error ?? 'Failed to join table')
      }
    })

    // S15: GameState now properly typed (GameStateTable + GameStateRoundInfo).
    // Inner fields (cards, betPrompt, resolvedFixtures, revealedPlayerScores) remain `unknown`
    // in GameStateRoundInfo — cast at point of use rather than wrapping the whole payload.
    socket.on('table:state', (rawState) => {
      store.getState().setTable(rawState.table)
      if (rawState.roundInfo) {
        const ri = rawState.roundInfo
        const cards = ri.cards as readonly RoundCardPayload[]
        const betPrompt = ri.betPrompt as {
          userId: string
          minimumBet: number
          currentBet: number
          pot: number
          chips: number
          allowedActions: string[]
          timeoutMs: number
          promptedAt?: number
        } | null
        store.getState().setRound({
          id: ri.roundId,
          tableId: tableId,
          roundNumber: ri.roundNumber,
          status: ri.status as RoundStatus,
          board: [],
          hands: [],
          bettingRounds: [],
          pot: ri.pot,
          dealerSeatIndex: ri.dealerSeatIndex,
          fixtures: [],
        })
        if (cards.length > 0) {
          store.getState().setMyHand(cards.map(toTeamCard))
        }
        if (betPrompt) {
          store.getState().setActiveTurn({
            userId: betPrompt.userId,
            startedAt: Date.now(),
            timeoutMs: betPrompt.timeoutMs,
          })
          store.getState().setMyTurn(true)
          store.getState().setBetPrompt({
            minimumBet: betPrompt.minimumBet,
            currentBet: betPrompt.currentBet,
            pot: betPrompt.pot,
            chips: betPrompt.chips,
            allowedActions: betPrompt.allowedActions,
            timeoutMs: betPrompt.timeoutMs,
            promptedAt: betPrompt.promptedAt ?? Date.now(),
          })
        }
        if (ri.waitingForResults) {
          store.getState().setWaitingForResults(true)
        }
        store.getState().setRevealedFixtureCount(-1)

        // SF-01b: Reconnect state recovery — replay accumulated phase data
        if (ri.currentPhase) {
          const resolvedFixtures = ri.resolvedFixtures as
            | readonly FixtureResultPayload[]
            | undefined
          const revealedScores = ri.revealedPlayerScores as
            | readonly PlayerScoredPayload[]
            | undefined
          if (resolvedFixtures?.length) {
            for (const f of resolvedFixtures) store.getState().addFixtureResult(f)
          }
          if (revealedScores?.length) {
            for (const s of revealedScores) store.getState().addPlayerScoreReveal(s)
          }
          const phaseToShowdown: Record<string, ShowdownPhase> = {
            waiting: 'waiting',
            fixtures: 'fixtures',
            scoring: 'calculating',
            reveals: 'reveals',
            winner: 'winner',
          }
          const sp = phaseToShowdown[ri.currentPhase]
          if (sp) store.getState().setShowdownPhase(sp)
        }
      }
    })

    socket.on('round:start', (payload) => {
      const applyRoundStart = () => {
        pendingRoundStartRef.current = null
        // J1 + J2 + J5: single atomic update — clears all stale state and sets new round
        // in one render tick, preventing intermediate renders with stale data
        store.setState({
          // Clear all card/showdown/betting state (J5)
          fixtures: [],
          revealedFixtureCount: 0,
          myHand: payload.cards.map(toTeamCard),
          playerActions: {},
          foldedPlayerIds: [],
          activeTurn: null,
          betPrompt: null,
          myTurn: false,
          potFlashKey: 0,
          waitingForResults: false,
          // J4: wire real blind seat indices from Soni's S1 payload
          sbSeatIndex: payload.sbSeatIndex ?? null,
          bbSeatIndex: payload.bbSeatIndex ?? null,
          // J12: reset showdown phase state machine
          showdownPhase: 'idle',
          fixtureResults: [],
          playerScoreReveals: [],
          currentRevealIndex: -1,
          winnerData: null,
          // New round state set atomically with the reset (J2 — roundNumber updates first)
          currentRound: {
            id: payload.roundId,
            tableId,
            roundNumber: payload.roundNumber,
            status: 'BOARD_REVEALED' as RoundStatus,
            board: [],
            hands: [],
            bettingRounds: [],
            pot: 0,
            dealerSeatIndex: payload.dealerSeatIndex,
            fixtures: [],
          },
        })
      }

      // The server can send round:start immediately after round:winner.
      // pendingRoundStartRef defers applyRoundStart until the winner banner
      // has been visible for at least MIN_WINNER_BANNER_MS, preventing it
      // from being replaced before the player can read it.
      if (store.getState().showdownPhase === 'winner') {
        const elapsed = Date.now() - winnerShownAtRef.current
        const remaining = MIN_WINNER_BANNER_MS - elapsed
        if (remaining > 0) {
          if (pendingRoundStartRef.current) clearTimeout(pendingRoundStartRef.current)
          pendingRoundStartRef.current = setTimeout(applyRoundStart, remaining)
          return
        }
      }
      applyRoundStart()
    })

    socket.on('blinds:posted', (payload) => {
      const now = Date.now()
      store.getState().setPlayerAction(payload.sbUserId, {
        action: 'SB',
        amount: payload.sbAmount,
        timestamp: now,
      })
      store.getState().setPlayerAction(payload.bbUserId, {
        action: 'BB',
        amount: payload.bbAmount,
        timestamp: now,
      })
    })

    // board:reveal socket type is TeamCard[] (stale shared type) but runtime sends Fixture[].
    // Cast is still needed until ServerToClientEvents is updated to use Fixture[].
    socket.on('board:reveal', (fixtureData) => {
      const fixtureArray = fixtureData as unknown as readonly Fixture[]
      store.getState().setFixtures(fixtureArray)
      store.getState().setRevealedFixtureCount(0)
      fixtureArray.forEach((_, i) => {
        setTimeout(() => store.getState().setRevealedFixtureCount(i + 1), (i + 1) * 400)
      })
    })

    socket.on('bet:prompt', (payload) => {
      const promptTime = payload.promptedAt ?? Date.now()
      store.getState().setActiveTurn({
        userId: payload.userId,
        startedAt: promptTime,
        timeoutMs: payload.timeoutMs,
      })
      if (payload.userId === userId) {
        store.getState().setMyTurn(true)
        store.getState().setBetPrompt({
          minimumBet: payload.minimumBet,
          currentBet: payload.currentBet,
          pot: payload.pot,
          chips: payload.chips,
          allowedActions: payload.allowedActions,
          timeoutMs: payload.timeoutMs,
          promptedAt: promptTime,
        })
      }
    })

    socket.on('bet:update', (payload) => {
      store.getState().setPlayerAction(payload.userId, {
        action: payload.action,
        amount: payload.amount,
        timestamp: Date.now(),
      })

      if (payload.action === 'FOLD') {
        store.getState().addFoldedPlayer(payload.userId)
      }

      const currentRound = store.getState().currentRound
      if (currentRound && payload.pot !== currentRound.pot) {
        store.getState().triggerPotFlash()
      }
      if (currentRound) {
        store.getState().setRound({
          ...currentRound,
          pot: payload.pot,
        })
      }

      const table = store.getState().table
      if (table && payload.chips !== undefined) {
        store.getState().setTable({
          ...table,
          players: table.players.map((p) =>
            p.userId === payload.userId ? { ...p, chips: payload.chips } : p,
          ),
        })
      }
      if (payload.userId === userId) {
        store.getState().setMyTurn(false)
        store.getState().setBetPrompt(null)
      }
    })

    socket.on('round:pause', () => {
      store.getState().setActiveTurn(null)
      store.getState().setWaitingForResults(true)
      store.getState().setShowdownPhase('waiting')
    })

    // J12: S6 progressive showdown events
    socket.on('fixture:result', (result) => {
      store.getState().addFixtureResult(result)
      store.getState().setShowdownPhase('fixtures')
    })

    socket.on('round:scoring', () => {
      // Definitively end the betting phase — by the time scoring arrives,
      // all bets are settled and no new bet:prompt can be in flight
      store.getState().setMyTurn(false)
      store.getState().setBetPrompt(null)
      store.getState().setWaitingForResults(false)
      store.getState().setShowdownPhase('calculating')
    })

    socket.on('player:scored', (result) => {
      store.getState().addPlayerScoreReveal(result)
      store.getState().setShowdownPhase('reveals')
    })

    socket.on('round:winner', (data) => {
      store.getState().setWinnerData(data)
      store.getState().setShowdownPhase('winner')
      winnerShownAtRef.current = Date.now()
    })

    socket.on('players:update', (playerChips) => {
      const table = store.getState().table
      if (table) {
        const chipMap = new Map(playerChips.map((u) => [u.userId, u.chips]))
        store.getState().setTable({
          ...table,
          players: table.players.map((p) => {
            const newChips = chipMap.get(p.userId)
            return newChips !== undefined ? { ...p, chips: newChips } : p
          }),
        })
      }
    })

    socket.on('player:joined', (player) => {
      const table = store.getState().table
      if (table) {
        store.getState().setTable({
          ...table,
          players: [...table.players, player],
        })
      }
    })

    socket.on('player:left', (payload) => {
      const table = store.getState().table
      if (table) {
        store.getState().setTable({
          ...table,
          players: table.players.filter((p) => p.userId !== payload.userId),
        })
      }
    })

    socket.on('game:over', () => {
      const table = store.getState().table
      if (table) {
        store.getState().setTable({ ...table, status: 'COMPLETED' })
      }
    })

    socket.on('error', (payload) => {
      store.getState().setError(payload.message)
    })

    return () => {
      if (pendingRoundStartRef.current) clearTimeout(pendingRoundStartRef.current)
      socket.emit('table:leave', { tableId })
      socket.off('table:state')
      socket.off('round:start')
      socket.off('blinds:posted')
      socket.off('board:reveal')
      socket.off('bet:prompt')
      socket.off('bet:update')
      socket.off('round:pause')
      socket.off('fixture:result')
      socket.off('round:scoring')
      socket.off('player:scored')
      socket.off('round:winner')
      socket.off('players:update')
      socket.off('player:joined')
      socket.off('player:left')
      socket.off('game:over')
      socket.off('error')
      disconnectSocket()
    }
    // C5: store is the Zustand store constructor — stable reference, never changes, not a reactive dep
  }, [tableId]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendBetAction = useCallback(
    (action: BetAction, amount: number) => {
      const socket = socketRef.current
      if (!socket) return
      socket.emit('bet:action', { action, amount }, (response) => {
        if (!response.success) {
          store.getState().setError(response.error ?? 'Bet failed')
        }
      })
    },
    [store],
  )

  const leaveTable = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('table:leave', { tableId })
  }, [tableId])

  const refreshState = useCallback(() => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('table:join', { tableId }, () => {})
  }, [tableId])

  return { sendBetAction, leaveTable, refreshState }
}
