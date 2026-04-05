import { useEffect } from 'react'
import type { TablePlayer, TeamCard } from '@wpc/shared'
import { useGameStore } from '@/stores/gameStore'
import type { RoundWinnerData } from '@/stores/gameStore'
import { PlayerSeat } from './PlayerSeat'
import { FixtureBoard } from './FixtureBoard'
import { PokerChip } from '@/components/shared/PokerChip'
import type { RawFixture } from './FixtureBoard'

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
  readonly myHand: readonly TeamCard[] | null
  readonly waitingForResults: boolean
  readonly isInRound: boolean
}

// Seat positions — avatars sit ON the rail border, not on the green pitch.
// Top seats (2, 3) pushed to 1% so they straddle the top rail edge.
// Side seats (1, 4) at 4% from edge — translate(-50%) pulls avatar center to the rail.
const seatStyles: readonly React.CSSProperties[] = [
  { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
  { top: '38%', left: '4%', transform: 'translate(-50%, -50%)' },
  { top: '1%', left: '24%', transform: 'translate(-50%, 0)' },
  { top: '1%', right: '24%', transform: 'translate(50%, 0)' },
  { top: '38%', right: '4%', transform: 'translate(50%, -50%)' },
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
          <PokerChip
            key={i}
            size={20}
            style={{
              transform: `rotate(${(i - 2) * 12}deg)`,
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
            }}
          />
        ))}
      </div>
      {/* key={potFlashKey} forces React to remount this element each time the pot changes,
          resetting the CSS animation from frame 0 without an animation library. */}
      <span
        key={potFlashKey}
        data-testid="pot-total"
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

function WinnerBanner({
  winnerData,
  players,
}: {
  readonly winnerData: RoundWinnerData
  readonly players: readonly TablePlayer[]
}) {
  const { winnerIds, potDistribution } = winnerData
  const isSplit = winnerIds.length > 1

  const winnerNames = winnerIds.map(
    (id: string) => players.find((p) => p.userId === id)?.username ?? id,
  )

  const shareAmount = winnerIds.length > 0 ? (potDistribution[winnerIds[0]!] ?? 0) : 0

  let subtitleText: string
  if (winnerIds.length === 2) {
    subtitleText = `${winnerNames[0]} & ${winnerNames[1]} split the pot — ${shareAmount} chips each`
  } else if (winnerIds.length > 2) {
    subtitleText = `${winnerIds.length}-way split — ${shareAmount} chips each`
  } else {
    subtitleText = `+${shareAmount} chips`
  }

  return (
    <div
      data-testid="winner-banner"
      className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl"
      style={{
        background: 'rgba(5,10,24,0.9)',
        border: '1px solid var(--gold)',
        borderTop: '3px solid var(--gold)',
        boxShadow: '0 0 40px rgba(212,168,67,0.35), 0 0 80px rgba(212,168,67,0.1)',
        animation: 'fade-in-up 0.6s ease-out both, gold-burst 1.2s ease-out 0.2s both',
        maxWidth: 320,
      }}
    >
      <span style={{ fontSize: 24 }}>🏆</span>
      {isSplit ? (
        <span
          className="font-outfit font-bold text-sm text-center"
          style={{ color: 'var(--gold-bright)' }}
        >
          {subtitleText}
        </span>
      ) : (
        <>
          <span className="font-outfit font-black text-base text-white">
            {winnerNames[0]} wins!
          </span>
          <span className="font-outfit font-bold text-sm" style={{ color: 'var(--gold-bright)' }}>
            {subtitleText}
          </span>
        </>
      )}
    </div>
  )
}

function WaitingBadge({
  fixtureCount,
  resolvedCount,
}: {
  readonly fixtureCount: number
  readonly resolvedCount: number
}) {
  const allResolved = resolvedCount >= fixtureCount && fixtureCount > 0
  return (
    <div
      data-testid={allResolved ? 'showdown-calculating' : 'waiting-badge'}
      className="flex items-center gap-2 px-4 py-2 rounded-full"
      style={{ background: 'rgba(5,10,24,0.8)', border: '1px solid var(--border)' }}
    >
      {!allResolved && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: 'var(--gold)', animation: 'blink 1.5s ease-in-out infinite' }}
        />
      )}
      <span className="text-xs font-semibold" style={{ color: 'var(--gold)' }}>
        {allResolved
          ? 'Calculating Scores...'
          : fixtureCount > 0
            ? `${resolvedCount} of ${fixtureCount} matches complete`
            : 'Matches in Progress...'}
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
  myHand,
  waitingForResults,
  isInRound,
}: PokerTableProps) {
  const playerActions = useGameStore((s) => s.playerActions)
  const foldedPlayerIds = useGameStore((s) => s.foldedPlayerIds)
  const revealedFixtureCount = useGameStore((s) => s.revealedFixtureCount)
  const sbSeatIndex = useGameStore((s) => s.sbSeatIndex)
  const bbSeatIndex = useGameStore((s) => s.bbSeatIndex)
  const showdownPhase = useGameStore((s) => s.showdownPhase)
  const fixtureResults = useGameStore((s) => s.fixtureResults)
  const winnerData = useGameStore((s) => s.winnerData)
  const playerScoreReveals = useGameStore((s) => s.playerScoreReveals)
  const currentRevealIndex = useGameStore((s) => s.currentRevealIndex)
  // Preload card back images to prevent flash on first render
  useEffect(() => {
    const srcs = ['/images/card-back-sm.png', '/images/card-back-md.png']
    srcs.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  const isWinnerPhase = showdownPhase === 'winner'
  const isWaiting = showdownPhase === 'waiting' || showdownPhase === 'fixtures'

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
          className="relative poker-table-pitch"
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
              {isWinnerPhase && winnerData ? (
                <WinnerBanner winnerData={winnerData} players={players} />
              ) : (
                <PotDisplay pot={pot} isAnimatingOut={false} />
              )}
            </div>
          </div>

          {/* Fixture board container — glassmorphism backing, visible from 'waiting' phase onward */}
          {showdownPhase !== 'idle' && (
            <div
              className="absolute pointer-events-auto"
              style={{
                top: '18%',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(5,10,24,0.55)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: `1px solid ${isWaiting ? 'rgba(212,168,67,0.45)' : 'rgba(255,255,255,0.07)'}`,
                padding: '6px 8px 4px',
                animation: isWaiting ? 'fixture-board-pulse 2s ease-in-out infinite' : 'none',
              }}
            >
              <p
                className="text-center font-outfit font-bold uppercase mb-1"
                style={{
                  fontSize: '8px',
                  letterSpacing: '3px',
                  color: 'var(--gold)',
                  opacity: 0.7,
                }}
              >
                Live Fixtures
              </p>
              <FixtureBoard
                fixtures={fixtures as unknown as readonly RawFixture[]}
                revealedCount={revealedFixtureCount}
              />
              {waitingForResults && (
                <div className="flex justify-center mt-2">
                  <WaitingBadge
                    fixtureCount={fixtures.length}
                    resolvedCount={fixtureResults.length}
                  />
                </div>
              )}
            </div>
          )}

          {/* Player seats */}
          {seatStyles.map((style, index) => {
            const player = players.find((p) => p.seatIndex === index)
            const isActive = !!player && !!activeTurn && activeTurn.userId === player.userId
            const lastAction = player ? (playerActions[player.userId] ?? null) : null
            const isFolded = !!player && foldedPlayerIds.includes(player.userId)
            const isWinner =
              isWinnerPhase && !!player && (winnerData?.winnerIds ?? []).includes(player.userId)
            const isMe = player?.userId === currentUserId
            const playerCards = isMe ? myHand : null
            const hasCards = isInRound && !!player && !player.isEliminated
            const blindPosition = index === sbSeatIndex ? 'SB' : index === bbSeatIndex ? 'BB' : null

            return (
              <div
                key={index}
                data-testid={`player-seat-${index}`}
                className="absolute z-10"
                style={{
                  ...style,
                  ...(player ? { filter: 'drop-shadow(0 0 14px rgba(212,168,67,0.2))' } : {}),
                }}
              >
                <PlayerSeat
                  player={player ?? null}
                  isCurrentUser={isMe}
                  isActive={isActive}
                  turnStartedAt={isActive ? activeTurn!.startedAt : null}
                  turnTimeoutMs={isActive ? activeTurn!.timeoutMs : null}
                  lastAction={lastAction}
                  isFolded={isFolded}
                  scoreResult={
                    player
                      ? (playerScoreReveals.find((r) => r.userId === player.userId) ?? null)
                      : null
                  }
                  isCurrent={
                    !!player && playerScoreReveals[currentRevealIndex]?.userId === player.userId
                  }
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
