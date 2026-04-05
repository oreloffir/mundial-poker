import { useEffect, useRef, useState } from 'react'
import type { TablePlayer } from '@wpc/shared'
import { useGameStore } from '@/stores/gameStore'
import type { RoundWinnerData } from '@/stores/gameStore'
import { PlayerSeat } from './PlayerSeat'
import { FixtureBoard } from './FixtureBoard'
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

// Denomination tiers: [minPot, chipColor, rimColor]
// Chips stack bottom-to-top: highest denominations on the bottom row
const DENOM_TIERS: ReadonlyArray<[number, string, string]> = [
  [1, '#e8e8e8', '#bbb'], // White  — small bets
  [50, '#3498db', '#1a6fa0'], // Blue   — medium
  [150, '#e74c3c', '#a93226'], // Red
  [400, '#2ecc71', '#1a8a4a'], // Green
  [800, '#2c2c2c', '#555'], // Black
  [1500, '#9b59b6', '#6c3483'], // Purple
]

function getDenomColor(pot: number): string {
  let color = DENOM_TIERS[0]![1]
  for (const [threshold, c] of DENOM_TIERS) {
    if (pot >= threshold) color = c
  }
  return color
}

function ChipPile({ pot }: { readonly pot: number }) {
  // Build up to 8 chips across two rows based on pot size
  const chipCount = pot > 0 ? Math.min(8, Math.max(1, Math.ceil(pot / 80))) : 0
  if (chipCount === 0) return null

  // Split into two rows: bottom row has larger chips, top row has smaller
  const bottomCount = Math.min(chipCount, 5)
  const topCount = chipCount - bottomCount

  const getChipColor = (index: number, total: number): string => {
    // Higher-index chips (bottom of pile) use higher denominations
    const tierIndex = Math.floor((index / total) * (DENOM_TIERS.length - 1))
    return DENOM_TIERS[tierIndex]?.[1] ?? DENOM_TIERS[0]![1]
  }

  return (
    <div className="flex flex-col items-center" style={{ gap: -2 }}>
      {/* Top row (smaller chips, overflow) */}
      {topCount > 0 && (
        <div className="flex" style={{ marginBottom: -4 }}>
          {Array.from({ length: topCount }).map((_, i) => {
            const color = getChipColor(i, topCount)
            return (
              <div
                key={`top-${i}`}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 30%, ${color}dd, ${color}88)`,
                  border: `1.5px solid ${color}`,
                  boxShadow: `0 1px 3px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)`,
                  marginLeft: i > 0 ? -4 : 0,
                  transform: `rotate(${(i - Math.floor(topCount / 2)) * 8}deg)`,
                  flexShrink: 0,
                }}
              />
            )
          })}
        </div>
      )}
      {/* Bottom row (main chips) */}
      <div className="flex" style={{ zIndex: 1 }}>
        {Array.from({ length: bottomCount }).map((_, i) => {
          const color = getChipColor(i, bottomCount)
          return (
            <div
              key={`bot-${i}`}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: `radial-gradient(circle at 35% 30%, ${color}dd, ${color}88)`,
                border: `2px solid ${color}`,
                boxShadow: `0 2px 6px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.25)`,
                marginLeft: i > 0 ? -5 : 0,
                transform: `rotate(${(i - Math.floor(bottomCount / 2)) * 10}deg)`,
                flexShrink: 0,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

function PotDisplay({
  pot,
  isAnimatingOut,
}: {
  readonly pot: number
  readonly isAnimatingOut: boolean
}) {
  const potFlashKey = useGameStore((s) => s.potFlashKey)
  const displayRef = useRef(pot)
  const [displayPot, setDisplayPot] = useState(pot)

  // Count-up animation when pot changes
  useEffect(() => {
    const from = displayRef.current
    const to = pot
    if (from === to) return
    const diff = to - from
    const duration = Math.min(600, Math.abs(diff) * 2)
    const start = Date.now()

    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(1, elapsed / duration)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayPot(Math.round(from + diff * eased))
      if (progress < 1) requestAnimationFrame(tick)
      else {
        setDisplayPot(to)
        displayRef.current = to
      }
    }
    requestAnimationFrame(tick)
  }, [pot])

  if (pot <= 0 && !isAnimatingOut) return null

  const activeColor = getDenomColor(pot)

  return (
    <div
      className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${isAnimatingOut ? 'opacity-0 scale-75' : 'opacity-100'}`}
    >
      <ChipPile pot={pot} />
      {/* key={potFlashKey} forces React to remount this element each time the pot changes,
          resetting the CSS animation from frame 0 without an animation library. */}
      <span
        key={potFlashKey}
        data-testid="pot-total"
        className="font-outfit font-extrabold text-base"
        style={{
          color: activeColor,
          textShadow: `0 0 20px ${activeColor}88`,
          ...(potFlashKey > 0 ? { animation: 'pot-flash 0.6s ease-in-out' } : {}),
        }}
      >
        {displayPot}
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

          {/* Fixture board container — visible whenever fixtures exist (idle=VS state, showdown=scores) */}
          {fixtures.length > 0 && (
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
            const hasCards = isInRound && !!player && !player.isEliminated
            const blindPosition = index === sbSeatIndex ? 'SB' : index === bbSeatIndex ? 'BB' : null

            // Seat 0 for current user lives in PlayerCardDock (J34) — skip rendering on pitch
            if (index === 0 && isMe) return null

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
