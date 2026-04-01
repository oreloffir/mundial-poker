import { useEffect, useState, useRef } from 'react'
import type { TablePlayer, ShowdownResult, TeamCard } from '@wpc/shared'
import { useGameStore } from '@/stores/gameStore'
import { PlayerSeat } from './PlayerSeat'
import { FixtureBoard } from './FixtureBoard'

interface ActiveTurn {
  readonly userId: string
  readonly startedAt: number
  readonly timeoutMs: number
}

interface PokerTableProps {
  readonly players: readonly TablePlayer[]
  readonly currentUserId: string
  readonly activeTurn: ActiveTurn | null
  readonly fixtures: readonly unknown[]
  readonly pot: number
  readonly showdownResults: readonly ShowdownResult[] | null
  readonly myHand: readonly TeamCard[] | null
  readonly waitingForResults: boolean
  readonly isInRound: boolean
}

const seatStyles: readonly React.CSSProperties[] = [
  { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
  { top: '38%', left: '5%', transform: 'translate(-50%, -50%)' },
  { top: '6%', left: '24%', transform: 'translate(-50%, 0)' },
  { top: '6%', right: '24%', transform: 'translate(50%, 0)' },
  { top: '38%', right: '5%', transform: 'translate(50%, -50%)' },
]

// Direction the rail glow should radiate from (toward the table center)
const seatGlowOrigin: readonly string[] = [
  'top',          // seat 0: bottom-center — glow from top (table side)
  'right',        // seat 1: left side — glow from right
  'bottom right', // seat 2: top-left — glow from bottom-right
  'bottom left',  // seat 3: top-right — glow from bottom-left
  'left',         // seat 4: right side — glow from left
]

function PotDisplay({
  pot,
  isAnimatingOut,
}: {
  readonly pot: number
  readonly isAnimatingOut: boolean
}) {
  const potFlashKey = useGameStore((s) => s.potFlashKey)
  const chipCount = pot > 0 ? Math.min(5, Math.ceil(pot / 100)) : 0

  if (pot <= 0 && !isAnimatingOut) return null

  return (
    <div
      className={`flex flex-col items-center gap-1 transition-all duration-500 ${isAnimatingOut ? 'opacity-0 scale-75' : 'opacity-100'}`}
    >
      <div className="flex -space-x-1.5">
        {Array.from({ length: chipCount }).map((_, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full shadow-lg"
            style={{
              background: 'linear-gradient(to bottom, var(--gold-bright), var(--gold-dim))',
              border: '2px solid var(--gold-bright)',
              transform: `rotate(${(i - 2) * 12}deg)`,
            }}
          />
        ))}
      </div>
      <span
        key={potFlashKey}
        className="font-outfit font-extrabold text-base"
        style={{
          color: 'var(--gold-bright)',
          textShadow: '0 0 20px rgba(212,168,67,0.5)',
          ...(potFlashKey > 0 ? { animation: 'pot-flash 0.6s ease-in-out' } : {}),
        }}
      >
        {pot}
      </span>
    </div>
  )
}

function WinnerBanner({ name, pot }: { readonly name: string; readonly pot: number }) {
  return (
    <div
      data-testid="winner-banner"
      className="flex flex-col items-center gap-1 px-6 py-3 rounded-xl"
      style={{
        background: 'rgba(5,10,24,0.85)',
        border: '1px solid var(--gold)',
        boxShadow: '0 0 40px rgba(212,168,67,0.3), 0 0 80px rgba(212,168,67,0.1)',
        animation: 'fade-in-up 0.6s ease-out both',
      }}
    >
      <span className="text-lg">&#127942;</span>
      <span className="font-outfit font-black text-base text-white">{name} wins!</span>
      {pot > 0 && (
        <span className="font-outfit font-bold text-sm" style={{ color: 'var(--gold-bright)' }}>
          +{pot} chips
        </span>
      )}
    </div>
  )
}

function WaitingBadge() {
  return (
    <div
      data-testid="waiting-badge"
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border)' }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ background: 'var(--gold)', animation: 'blink 1.5s ease-in-out infinite' }}
      />
      <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
        Matches in Progress...
      </span>
    </div>
  )
}

export function PokerTable({
  players,
  currentUserId,
  activeTurn,
  fixtures,
  pot,
  showdownResults,
  myHand,
  waitingForResults,
  isInRound,
}: PokerTableProps) {
  const playerActions = useGameStore((s) => s.playerActions)
  const foldedPlayerIds = useGameStore((s) => s.foldedPlayerIds)
  const revealedFixtureCount = useGameStore((s) => s.revealedFixtureCount)
  const sbSeatIndex = useGameStore((s) => s.sbSeatIndex)
  const bbSeatIndex = useGameStore((s) => s.bbSeatIndex)

  // Preload card back images to prevent flash on first render
  useEffect(() => {
    const srcs = ['/images/card-back-sm.png', '/images/card-back-md.png']
    srcs.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  const [revealedUserIds, setRevealedUserIds] = useState<readonly string[]>([])
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [winnerName, setWinnerName] = useState<string | null>(null)
  const [potAnimatingOut, setPotAnimatingOut] = useState(false)
  const [showWinnerBanner, setShowWinnerBanner] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!showdownResults || showdownResults.length === 0) {
      setRevealedUserIds([])
      setWinnerId(null)
      setWinnerName(null)
      setPotAnimatingOut(false)
      setShowWinnerBanner(false)
      return
    }

    const sorted = [...showdownResults].sort((a, b) => b.totalScore - a.totalScore)
    const timers: ReturnType<typeof setTimeout>[] = []
    const REVEAL_INTERVAL = 1500
    const WINNER_DELAY = 2000
    const POT_DELAY = 3500

    sorted.forEach((result, i) => {
      timers.push(
        setTimeout(() => {
          if (!mountedRef.current) return
          setRevealedUserIds((prev) => [...prev, result.userId])
        }, i * REVEAL_INTERVAL),
      )
    })

    const allRevealedAt = sorted.length * REVEAL_INTERVAL
    const winnerUserId = sorted[0]?.userId ?? null
    const winner = winnerUserId ? players.find((p) => p.userId === winnerUserId) : null

    timers.push(
      setTimeout(() => {
        if (!mountedRef.current) return
        setWinnerId(winnerUserId)
        setWinnerName(winner?.username ?? null)
        setShowWinnerBanner(true)
      }, allRevealedAt + WINNER_DELAY),
    )

    timers.push(
      setTimeout(() => {
        if (!mountedRef.current) return
        setPotAnimatingOut(true)
      }, allRevealedAt + POT_DELAY),
    )

    return () => timers.forEach(clearTimeout)
  }, [showdownResults, players])

  // J1: auto-dismiss safety — banner clears itself after max display time
  // so it can never bleed into the next round if round:start resets are slow
  useEffect(() => {
    if (!showWinnerBanner) return
    const maxDisplayMs = 5000 + players.length * 1500
    const timer = setTimeout(() => {
      if (!mountedRef.current) return
      setShowWinnerBanner(false)
      setWinnerId(null)
      setWinnerName(null)
    }, maxDisplayMs)
    return () => clearTimeout(timer)
  }, [showWinnerBanner, players.length])

  const revealedResultMap = new Map<string, ShowdownResult>()
  if (showdownResults) {
    for (const r of showdownResults) {
      if (revealedUserIds.includes(r.userId)) {
        revealedResultMap.set(r.userId, r)
      }
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Vignette background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 80% at center, transparent 30%, rgba(5,10,24,0.95) 100%)',
        }}
      />

      {/* Table image */}
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="relative"
          style={{ width: '85vw', maxWidth: '1100px', aspectRatio: '16 / 10' }}
        >
          <img
            src="/table.png"
            alt=""
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          {/* Pot — lives on the center circle */}
          <div
            className="absolute pointer-events-none"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {/* Subtle green glow echoing the center circle */}
            <div
              className="absolute"
              style={{
                width: 130,
                height: 130,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(26,110,58,0.2) 0%, transparent 70%)',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            />
            <div className="pointer-events-auto relative flex flex-col items-center">
              {showWinnerBanner && winnerName ? (
                <WinnerBanner name={winnerName} pot={pot} />
              ) : (
                <PotDisplay pot={pot} isAnimatingOut={potAnimatingOut} />
              )}
            </div>
          </div>

          {/* Fixtures — upper half of pitch, above center circle */}
          <div
            className="absolute pointer-events-none flex flex-col items-center gap-2"
            style={{ top: '22%', left: '50%', transform: 'translateX(-50%)' }}
          >
            <div className="pointer-events-auto">
              <FixtureBoard fixtures={fixtures as never} revealedCount={revealedFixtureCount} />
              {waitingForResults && <WaitingBadge />}
            </div>
          </div>

          {/* Player seats */}
          {seatStyles.map((style, index) => {
            const player = players.find((p) => p.seatIndex === index)
            const isActive = !!player && !!activeTurn && activeTurn.userId === player.userId
            const lastAction = player ? (playerActions[player.userId] ?? null) : null
            const isFolded = !!player && foldedPlayerIds.includes(player.userId)
            const showdownResult = player ? (revealedResultMap.get(player.userId) ?? null) : null
            const isWinner = !!player && player.userId === winnerId
            const isMe = player?.userId === currentUserId
            const playerCards = isMe ? myHand : null
            const hasCards = isInRound && !!player && !player.isEliminated
            const blindPosition =
              index === sbSeatIndex ? 'SB' : index === bbSeatIndex ? 'BB' : null

            return (
              <div
                key={index}
                className="absolute z-10"
                style={{
                  ...style,
                  ...(player
                    ? { filter: 'drop-shadow(0 0 14px rgba(212,168,67,0.2))' }
                    : {}),
                }}
              >
                {/* Rail glow connector — directional ambient halo for occupied seats */}
                {player && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse at ${seatGlowOrigin[index]}, rgba(212,168,67,0.12) 0%, transparent 70%)`,
                      borderRadius: '50%',
                      transform: 'scale(1.6)',
                    }}
                  />
                )}
                <PlayerSeat
                  player={player ?? null}
                  isCurrentUser={isMe}
                  isActive={isActive}
                  turnStartedAt={isActive ? activeTurn!.startedAt : null}
                  turnTimeoutMs={isActive ? activeTurn!.timeoutMs : null}
                  lastAction={lastAction}
                  isFolded={isFolded}
                  showdownResult={showdownResult}
                  isWinner={isWinner}
                  cards={playerCards}
                  hasCards={hasCards}
                  blindPosition={blindPosition}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
