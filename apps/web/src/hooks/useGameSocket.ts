import { useEffect, useCallback, useRef } from 'react'
import { getSocket, disconnectSocket } from '@/lib/socket'
import { useGameStore } from '@/stores/gameStore'
import { useAuthStore } from '@/stores/authStore'
import type { BetAction, TeamCard, TeamTier, Confederation } from '@wpc/shared'
import type { RoundCardPayload } from '@wpc/shared'

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
      confederation: 'UEFA' as Confederation,
      fifaRanking: c.fifaRanking,
    },
  }
}

export function useGameSocket(tableId: string) {
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null)
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

    socket.on('table:state', (rawState) => {
      const state = rawState as unknown as {
        table: typeof rawState.table
        roundInfo: null | {
          roundId: string
          roundNumber: number
          status: string
          pot: number
          dealerSeatIndex: number
          cards: RoundCardPayload[]
          betPrompt: null | {
            userId: string
            minimumBet: number
            currentBet: number
            pot: number
            chips: number
            allowedActions: string[]
            timeoutMs: number
            promptedAt?: number
          }
          waitingForResults: boolean
        }
      }
      store.getState().setTable(state.table)
      if (state.roundInfo) {
        const ri = state.roundInfo
        store.getState().setRound({
          id: ri.roundId,
          tableId: tableId,
          roundNumber: ri.roundNumber,
          status: ri.status as never,
          board: [],
          hands: [],
          bettingRounds: [],
          pot: ri.pot,
          dealerSeatIndex: ri.dealerSeatIndex,
          fixtures: [],
        })
        if (ri.cards.length > 0) {
          store.getState().setMyHand(ri.cards.map(toTeamCard))
        }
        if (ri.betPrompt) {
          store.getState().setActiveTurn({
            userId: ri.betPrompt.userId,
            startedAt: Date.now(),
            timeoutMs: ri.betPrompt.timeoutMs,
          })
          store.getState().setMyTurn(true)
          store.getState().setBetPrompt({
            minimumBet: ri.betPrompt.minimumBet,
            currentBet: ri.betPrompt.currentBet,
            pot: ri.betPrompt.pot,
            chips: ri.betPrompt.chips,
            allowedActions: ri.betPrompt.allowedActions,
            timeoutMs: ri.betPrompt.timeoutMs,
            promptedAt: ri.betPrompt.promptedAt ?? Date.now(),
          })
        }
        if (ri.waitingForResults) {
          store.getState().setWaitingForResults(true)
        }
        store.getState().setRevealedFixtureCount(-1)
      }
    })

    socket.on('round:start', (payload) => {
      // J1 + J2 + J5: single atomic update — clears all stale state and sets new round
      // in one render tick, preventing intermediate renders with stale data
      store.setState({
        // Clear all card/showdown/betting state (J5)
        fixtures: [],
        revealedFixtureCount: 0,
        myHand: payload.cards.map(toTeamCard),
        showdownResults: null,
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
        // New round state set atomically with the reset (J2 — roundNumber updates first)
        currentRound: {
          id: payload.roundId,
          tableId,
          roundNumber: payload.roundNumber,
          status: 'BOARD_REVEALED' as never,
          board: [],
          hands: [],
          bettingRounds: [],
          pot: 0,
          dealerSeatIndex: payload.dealerSeatIndex,
          fixtures: [],
        },
      })
    })

    socket.on('blinds:posted', (payload) => {
      store.getState().setPlayerAction(payload.userId, {
        action: 'CALL',
        amount: payload.amount,
        timestamp: Date.now(),
      })
    })

    socket.on('board:reveal', (fixtureData) => {
      const fixtureArray = fixtureData as never[]
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
    })

    socket.on('round:results', (payload) => {
      store.getState().setWaitingForResults(false)
      const resultsPayload = payload as { fixtures?: unknown[] }
      if (resultsPayload.fixtures) {
        store.getState().setFixtures(resultsPayload.fixtures as never)
        store.getState().setRevealedFixtureCount(-1)
      }
    })

    socket.on('round:showdown', (results) => {
      store.getState().setShowdownResults(results)
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
      socket.emit('table:leave', { tableId })
      socket.off('table:state')
      socket.off('round:start')
      socket.off('blinds:posted')
      socket.off('board:reveal')
      socket.off('bet:prompt')
      socket.off('bet:update')
      socket.off('round:pause')
      socket.off('round:results')
      socket.off('round:showdown')
      socket.off('players:update')
      socket.off('player:joined')
      socket.off('player:left')
      socket.off('game:over')
      socket.off('error')
      disconnectSocket()
    }
  }, [tableId, store])

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
