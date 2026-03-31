import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '@/hooks/useGameSocket'
import { useGameStore } from '@/stores/gameStore'
import { useAuth } from '@/hooks/useAuth'
import { PokerTable } from '@/components/game/PokerTable'
import { BettingControls } from '@/components/game/BettingControls'
import { GameOverOverlay } from '@/components/game/GameOverOverlay'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export function GameTable() {
  const { id: tableId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sendBetAction, leaveTable, refreshState } = useGameSocket(tableId ?? '')
  const table = useGameStore((s) => s.table)
  const currentRound = useGameStore((s) => s.currentRound)
  const myHand = useGameStore((s) => s.myHand)
  const myTurn = useGameStore((s) => s.myTurn)
  const betPrompt = useGameStore((s) => s.betPrompt)
  const showdownResults = useGameStore((s) => s.showdownResults)
  const waitingForResults = useGameStore((s) => s.waitingForResults)
  const fixtures = useGameStore((s) => s.fixtures)
  const activeTurn = useGameStore((s) => s.activeTurn)
  const error = useGameStore((s) => s.error)
  const setError = useGameStore((s) => s.setError)
  const reset = useGameStore((s) => s.reset)

  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  const [botLoading, setBotLoading] = useState(false)

  if (!tableId) {
    navigate('/lobby')
    return null
  }

  const handleLeave = () => {
    leaveTable()
    navigate('/lobby')
  }

  const handleAddBot = async () => {
    setBotLoading(true)
    try {
      await api.post(`/tables/${tableId}/add-bot`)
      refreshState()
    } catch {
      /* */
    } finally {
      setBotLoading(false)
    }
  }

  const handleStartGame = async () => {
    try {
      await api.post(`/tables/${tableId}/start`)
      refreshState()
    } catch {
      /* */
    }
  }

  const myPlayer = table?.players.find((p) => p.userId === user?.id)
  const isSeated = !!myPlayer

  return (
    <div
      className="h-screen w-screen overflow-hidden relative"
      style={{ background: 'var(--bg-deep)' }}
    >
      {/* Top bar - floating over table */}
      <div
        className="absolute top-0 left-0 right-0 z-30 px-5 h-12 flex items-center justify-between"
        style={{
          background: 'rgba(5,10,24,0.5)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-4">
          <button onClick={handleLeave} className="wpc-btn-ghost text-xs py-1 px-3">
            &#8592; Leave
          </button>
          <h1
            className="font-cinzel text-sm font-bold tracking-wider gold-glow-subtle"
            style={{ color: 'var(--gold)' }}
          >
            {table?.name ?? 'Loading...'}
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {table?.status === 'WAITING' && isSeated && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>{table.players.length}/5</span>
              <button
                onClick={handleAddBot}
                disabled={botLoading || (table?.players.length ?? 0) >= 5}
                className="wpc-btn-ghost text-xs py-1 px-3 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {botLoading ? 'Adding...' : '+ Add Bot'}
              </button>
              <button
                onClick={handleStartGame}
                disabled={(table?.players.length ?? 0) < 2}
                className="wpc-btn-primary text-xs py-1.5 px-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start Game
              </button>
            </>
          )}
          {currentRound && (
            <span style={{ color: 'var(--text-dim)' }}>
              Round <span className="font-bold text-white">{currentRound.roundNumber}</span>
            </span>
          )}
          {myPlayer && (
            <span style={{ color: 'var(--text-dim)' }}>
              Chips{' '}
              <span className="font-bold" style={{ color: 'var(--green-glow)' }}>
                {myPlayer.chips}
              </span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          className="absolute top-14 left-5 right-5 z-30 p-3 rounded-lg text-sm flex items-center justify-between"
          style={{
            background: 'rgba(231,76,60,0.15)',
            border: '1px solid rgba(231,76,60,0.3)',
            color: 'var(--red)',
          }}
        >
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4">
            &times;
          </button>
        </div>
      )}

      {/* Full-screen table */}
      {table ? (
        <PokerTable
          players={table.players}
          currentUserId={user?.id ?? ''}
          activeTurn={activeTurn}
          fixtures={fixtures as never}
          pot={currentRound?.pot ?? 0}
          showdownResults={showdownResults}
          myHand={myHand}
          waitingForResults={waitingForResults}
          isInRound={!!currentRound}
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div
              className="inline-block w-8 h-8 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--gold)', borderTopColor: 'transparent' }}
            />
            <p className="mt-4" style={{ color: 'var(--text-dim)' }}>
              Connecting to table...
            </p>
          </div>
        </div>
      )}

      {/* Bottom betting controls - floating */}
      {myTurn && betPrompt && (
        <div
          className="absolute bottom-0 left-0 right-0 z-30 px-4 py-3"
          style={{
            background: 'rgba(5,10,24,0.7)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <div className="max-w-2xl mx-auto">
            <BettingControls prompt={betPrompt} onAction={sendBetAction} />
          </div>
        </div>
      )}

      {table?.status === 'COMPLETED' && (
        <div className="absolute inset-0 z-40">
          <GameOverOverlay players={table.players} />
        </div>
      )}
    </div>
  )
}
