import { useParams, useNavigate } from 'react-router-dom'
import { useGameSocket } from '@/hooks/useGameSocket'
import { useGameStore } from '@/stores/gameStore'
import { useAuth } from '@/hooks/useAuth'
import { PokerTable } from '@/components/game/PokerTable'
import { BettingControls } from '@/components/game/BettingControls'
import { ScoringReference } from '@/components/game/ScoringReference'
import { PlayerCardDock } from '@/components/game/PlayerCardDock'
import { GameOverOverlay } from '@/components/game/GameOverOverlay'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

function formatChips(chips: number): string {
  if (chips >= 1000) return `${(chips / 1000).toFixed(chips % 1000 === 0 ? 0 : 1)}K`
  return String(chips)
}

type ShowdownPhase = 'idle' | 'waiting' | 'fixtures' | 'calculating' | 'reveals' | 'winner'

const PHASE_CONFIG: Record<
  ShowdownPhase,
  { label: string; color: string; pulse: boolean; glow?: boolean }
> = {
  idle: { label: 'BETTING', color: 'var(--green-glow)', pulse: true },
  waiting: { label: 'WAITING', color: 'var(--gold)', pulse: false },
  fixtures: { label: 'WAITING', color: 'var(--gold)', pulse: false },
  calculating: { label: 'SCORING', color: 'var(--gold-bright)', pulse: false },
  reveals: { label: 'SCORING', color: 'var(--gold-bright)', pulse: false },
  winner: { label: 'WINNER', color: 'var(--gold)', pulse: false, glow: true },
}

function PhaseBadge({
  roundNumber,
  phase,
}: {
  readonly roundNumber: number
  readonly phase: ShowdownPhase
}) {
  const config = PHASE_CONFIG[phase]
  return (
    <div className="flex flex-col items-end leading-none" style={{ gap: 2 }}>
      <span
        className="font-cinzel font-bold"
        style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.05em' }}
      >
        Round{' '}
        <span data-testid="round-counter" style={{ color: 'var(--text)' }}>
          {roundNumber}
        </span>
      </span>
      <span
        className="font-outfit font-black flex items-center gap-1"
        style={{
          fontSize: 10,
          color: config.color,
          letterSpacing: '0.08em',
          textShadow: config.glow ? `0 0 8px ${config.color}` : undefined,
        }}
      >
        {config.label}
        {config.pulse && (
          <span
            style={{
              display: 'inline-block',
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: config.color,
              animation: 'blink 1s ease-in-out infinite',
            }}
          />
        )}
      </span>
    </div>
  )
}

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
  const waitingForResults = useGameStore((s) => s.waitingForResults)
  const fixtures = useGameStore((s) => s.fixtures)
  const activeTurn = useGameStore((s) => s.activeTurn)
  const showdownPhase = useGameStore((s) => s.showdownPhase)
  const playerScoreReveals = useGameStore((s) => s.playerScoreReveals)
  const currentRevealIndex = useGameStore((s) => s.currentRevealIndex)
  const error = useGameStore((s) => s.error)
  const setError = useGameStore((s) => s.setError)
  const reset = useGameStore((s) => s.reset)
  const resetShowdownPhase = useGameStore((s) => s.resetShowdownPhase)

  useEffect(() => {
    resetShowdownPhase()
    // Attempt landscape lock — browser may deny on desktop or non-fullscreen; swallow silently
    // lock() is a non-standard extension not in TypeScript's lib — cast to access it safely
    ;(screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })
      ?.lock?.('landscape')
      ?.catch(() => {})
    return () => {
      reset()
    }
  }, [reset, resetShowdownPhase])

  const [botLoading, setBotLoading] = useState(false)
  const [portraitHintDismissed, setPortraitHintDismissed] = useState(false)
  const [a2hsDismissed, setA2hsDismissed] = useState(
    () => typeof localStorage !== 'undefined' && localStorage.getItem('wpc-a2hs-dismissed') === '1',
  )

  if (!tableId) {
    navigate('/lobby')
    return null
  }

  const handleLeave = () => {
    leaveTable()
    navigate('/lobby')
  }

  const handleA2hsDismiss = () => {
    localStorage.setItem('wpc-a2hs-dismissed', '1')
    setA2hsDismissed(true)
  }

  const handleAddBot = async () => {
    setBotLoading(true)
    try {
      const { data } = await api.post(`/tables/${tableId}/add-bot`)
      if (data?.data?.table) {
        useGameStore.getState().setTable(data.data.table)
      }
    } catch {
      setError('Failed to add bot — try again')
    } finally {
      setBotLoading(false)
    }
  }

  const handleStartGame = async () => {
    try {
      await api.post(`/tables/${tableId}/start`)
      refreshState()
    } catch {
      setError('Failed to start game — try again')
    }
  }

  const myPlayer = table?.players.find((p) => p.userId === user?.id)
  const isSeated = !!myPlayer

  return (
    <div
      className="h-screen w-screen overflow-hidden relative"
      style={{ background: 'var(--bg-deep)' }}
    >
      {/* Portrait rotation hint — CSS-controlled, JS-dismissible */}
      {!portraitHintDismissed && (
        <div
          className="portrait-hint fixed inset-0 z-50 items-center justify-center flex-col gap-4"
          style={{ background: 'rgba(5,10,24,0.92)', backdropFilter: 'blur(8px)' }}
        >
          <span style={{ fontSize: '3rem' }}>&#8635;</span>
          <p className="font-outfit font-bold text-base" style={{ color: 'var(--gold)' }}>
            Rotate your device to landscape
          </p>
          <button
            onClick={() => setPortraitHintDismissed(true)}
            className="wpc-btn-ghost text-xs py-1 px-4 mt-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add to Home Screen banner — shown once, dismissed persistently via localStorage */}
      {!a2hsDismissed && (
        <div
          className="absolute bottom-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-2"
          style={{
            background: 'rgba(5,10,24,0.92)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(212,168,67,0.25)',
          }}
        >
          <span className="text-xs font-outfit" style={{ color: 'var(--text-dim)' }}>
            Add to Home Screen for the full-screen experience
          </span>
          <button
            onClick={handleA2hsDismiss}
            className="wpc-btn-ghost text-xs py-1 px-3 ml-3"
            style={{ flexShrink: 0 }}
          >
            Got it
          </button>
        </div>
      )}

      {/* Top bar - floating over table */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between top-bar-safe"
        style={{
          height: 'var(--top-bar-h)',
          background: 'rgba(5,10,24,0.5)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-4">
          <button onClick={handleLeave} className="wpc-btn-ghost text-xs py-1 px-3 min-h-[36px]">
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
            <PhaseBadge
              roundNumber={currentRound.roundNumber}
              phase={showdownPhase as ShowdownPhase}
            />
          )}
          {myPlayer && (
            <span style={{ color: 'var(--text-dim)' }}>
              Chips{' '}
              <span className="font-bold" style={{ color: 'var(--green-glow)' }}>
                {formatChips(myPlayer.chips ?? 0)}
              </span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div
          className="absolute left-5 right-5 z-30 p-3 rounded-lg text-sm flex items-center justify-between"
          style={{
            top: 'calc(var(--top-bar-h) + 4px)',
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
          fixtures={fixtures}
          pot={currentRound?.pot ?? 0}
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

      {/* Bottom-right corner — action buttons (only on my turn) */}
      {myTurn && betPrompt && (
        <div className="absolute bottom-4 right-4 z-30 bottom-dock-safe">
          <BettingControls prompt={betPrompt} onAction={sendBetAction} />
        </div>
      )}

      {/* Bottom-left corner — scoring reference (visible during betting phase only) */}
      {currentRound && showdownPhase === 'idle' && (
        <div className="absolute bottom-4 left-4 z-30">
          <ScoringReference />
        </div>
      )}

      {/* Bottom-center — player card dock (cards + chips + score during showdown) */}
      {myPlayer && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bottom-dock-safe">
          <PlayerCardDock
            cards={myHand}
            chips={myPlayer.chips ?? 0}
            isInRound={!!currentRound}
            scoreResult={playerScoreReveals.find((r) => r.userId === myPlayer.userId) ?? null}
            isCurrent={playerScoreReveals[currentRevealIndex]?.userId === myPlayer.userId}
          />
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
