import { useEffect, useState } from 'react'
import type { TablePlayer, ShowdownResult, TeamCard } from '@wpc/shared'

interface PlayerAction {
  readonly action: string
  readonly amount: number
  readonly timestamp: number
}

interface PlayerSeatProps {
  readonly player: TablePlayer | null
  readonly isCurrentUser: boolean
  readonly isActive: boolean
  readonly turnStartedAt: number | null
  readonly turnTimeoutMs: number | null
  readonly lastAction: PlayerAction | null
  readonly isFolded: boolean
  readonly showdownResult: ShowdownResult | null
  readonly isWinner: boolean
  readonly cards: readonly TeamCard[] | null
  readonly hasCards: boolean
}

const RING_SIZE = 68
const RING_RADIUS = 28
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CHECK: { bg: 'rgba(255,255,255,0.08)', text: 'var(--text)', border: 'rgba(255,255,255,0.15)' },
  CALL: { bg: 'rgba(52,152,219,0.15)', text: 'var(--blue)', border: 'rgba(52,152,219,0.3)' },
  RAISE: { bg: 'rgba(212,168,67,0.15)', text: 'var(--gold)', border: 'rgba(212,168,67,0.3)' },
  FOLD: { bg: 'rgba(231,76,60,0.15)', text: 'var(--red)', border: 'rgba(231,76,60,0.3)' },
  ALL_IN: { bg: 'rgba(212,168,67,0.2)', text: 'var(--gold-bright)', border: 'var(--gold-dim)' },
}

const AVATAR_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12']

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!
}

function formatAction(action: string, amount: number): string {
  if (action === 'RAISE') return `Raise ${amount}`
  if (action === 'CALL') return `Call ${amount}`
  if (action === 'ALL_IN') return 'All In!'
  return action.charAt(0) + action.slice(1).toLowerCase()
}

function FaceDownCard() {
  return (
    <div
      className="w-9 h-12 rounded-lg flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #0f1a2e, #1a2744)',
        border: '1.5px solid var(--gold-dim)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 6px), repeating-linear-gradient(-45deg, var(--gold) 0, var(--gold) 1px, transparent 0, transparent 6px)',
        }}
      />
      <span
        className="relative text-[8px] font-outfit font-black tracking-wider"
        style={{ color: 'var(--gold-dim)' }}
      >
        MP
      </span>
    </div>
  )
}

function FaceUpMiniCard({ card }: { readonly card: TeamCard }) {
  return (
    <div
      className="w-9 h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
        border: '1.5px solid var(--border)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      <span className="text-base leading-none">{card.team.flagUrl}</span>
      <span className="text-[7px] font-bold text-white leading-none">{card.team.code}</span>
    </div>
  )
}

export function PlayerSeat({
  player,
  isCurrentUser,
  isActive,
  turnStartedAt,
  turnTimeoutMs,
  lastAction,
  isFolded,
  showdownResult,
  isWinner,
  cards,
  hasCards,
}: PlayerSeatProps) {
  const [timePercent, setTimePercent] = useState(100)

  useEffect(() => {
    if (!isActive || !turnStartedAt || !turnTimeoutMs) {
      setTimePercent(100)
      return
    }
    const interval = setInterval(() => {
      const elapsed = Date.now() - turnStartedAt
      const remaining = Math.max(0, turnTimeoutMs - elapsed)
      setTimePercent((remaining / turnTimeoutMs) * 100)
    }, 50)
    return () => clearInterval(interval)
  }, [isActive, turnStartedAt, turnTimeoutMs])

  if (!player) {
    return (
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ border: '2px dashed rgba(212,168,67,0.12)' }}
      >
        <span className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
          Empty
        </span>
      </div>
    )
  }

  const inShowdown = !!showdownResult
  const ringColor =
    timePercent > 50 ? 'var(--green-glow)' : timePercent > 25 ? 'var(--gold)' : 'var(--red)'
  const dashOffset = RING_CIRCUMFERENCE * (1 - timePercent / 100)
  const dimmed = (isFolded || player.isEliminated) && !inShowdown
  const avatarColor = getAvatarColor(player.username)

  const showFaceUp = isCurrentUser && cards && cards.length > 0
  const showFaceDown = !isCurrentUser && hasCards && !inShowdown && !isFolded
  const showShowdownCards = inShowdown && showdownResult.hand.length > 0

  return (
    <div
      className="flex flex-col items-center relative"
      style={{
        padding: '6px 8px 4px',
        borderRadius: '14px',
        background: isWinner
          ? 'rgba(212,168,67,0.08)'
          : isActive
            ? 'rgba(46,204,113,0.05)'
            : 'transparent',
        border: isWinner ? '1px solid var(--gold-dim)' : '1px solid transparent',
        transition: 'all 0.4s ease',
      }}
    >
      {/* Action badge */}
      {lastAction &&
        !inShowdown &&
        (() => {
          const badge = BADGE_STYLES[lastAction.action]
          return badge ? (
            <div
              key={lastAction.timestamp}
              className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{ animation: 'badge-pop 2s ease-out forwards' }}
            >
              <span
                className="text-[9px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap"
                style={{
                  background: badge.bg,
                  color: badge.text,
                  border: `1px solid ${badge.border}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                {formatAction(lastAction.action, lastAction.amount)}
              </span>
            </div>
          ) : null
        })()}

      {/* Avatar + cards row */}
      <div className="flex items-center gap-1.5">
        {/* Cards on the left for seats 1,2 (left side) or showdown cards */}
        {showShowdownCards && (
          <div className="flex gap-0.5" style={{ animation: 'card-flip 0.4s ease-out both' }}>
            {showdownResult.hand.map((card) => (
              <FaceUpMiniCard key={card.teamId} card={card} />
            ))}
          </div>
        )}
        {!showShowdownCards && showFaceUp && (
          <div className="flex gap-0.5" style={{ animation: 'card-deal 0.3s ease-out both' }}>
            {cards!.map((card) => (
              <FaceUpMiniCard key={card.teamId} card={card} />
            ))}
          </div>
        )}
        {!showShowdownCards && !showFaceUp && showFaceDown && (
          <div className="flex gap-0.5">
            <FaceDownCard />
            <FaceDownCard />
          </div>
        )}

        {/* Avatar */}
        <div className="relative">
          {isActive && !inShowdown && (
            <svg
              width={RING_SIZE}
              height={RING_SIZE}
              className="absolute -inset-1"
              style={{ transform: 'rotate(-90deg)' }}
            >
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={3}
              />
              <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={ringColor}
                strokeWidth={3}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                className="transition-[stroke] duration-300"
              />
            </svg>
          )}
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center text-sm font-black font-outfit transition-all duration-300 ${dimmed ? 'opacity-25 grayscale' : ''}`}
            style={{
              background: `linear-gradient(145deg, ${avatarColor}33, ${avatarColor}11)`,
              border: isWinner
                ? '2.5px solid var(--gold)'
                : isCurrentUser
                  ? '2.5px solid var(--gold-dim)'
                  : `2.5px solid ${avatarColor}44`,
              boxShadow: isWinner ? '0 0 24px rgba(212,168,67,0.4)' : '0 4px 12px rgba(0,0,0,0.5)',
              color: dimmed ? 'var(--text-muted)' : avatarColor,
              ...(isWinner ? { animation: 'gold-burst 1.2s ease-out infinite' } : {}),
            }}
          >
            {player.username.substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Name + chips */}
      <div className={`flex items-center gap-1.5 mt-1 ${dimmed ? 'opacity-25' : ''}`}>
        <span
          className="text-[10px] font-semibold truncate max-w-16"
          style={{
            color: isWinner ? 'var(--gold)' : isCurrentUser ? 'var(--gold-dim)' : 'var(--text)',
          }}
        >
          {player.username}
        </span>
        <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--green-glow)' }}>
          {player.chips}
        </span>
      </div>

      {/* Showdown score */}
      {inShowdown && (
        <div
          className="mt-0.5 text-[10px] font-outfit font-black px-2.5 py-0.5 rounded-lg"
          style={{
            background: isWinner ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.04)',
            color: isWinner ? 'var(--gold-bright)' : 'var(--text)',
            border: isWinner ? '1px solid var(--gold-dim)' : '1px solid rgba(255,255,255,0.06)',
            animation: 'score-pop 0.4s ease-out 0.2s both',
          }}
        >
          {showdownResult.totalScore} PTS
        </div>
      )}

      {isFolded && !player.isEliminated && !inShowdown && (
        <span
          className="text-[8px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--red)', opacity: 0.6 }}
        >
          Folded
        </span>
      )}
    </div>
  )
}
