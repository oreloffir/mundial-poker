import { useEffect, useState, useRef } from 'react'
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
  readonly blindPosition?: 'SB' | 'BB' | null
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
      className="rounded-[10px] overflow-hidden"
      style={{
        width: '60px',
        height: '84px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,168,67,0.2)',
        flexShrink: 0,
      }}
    >
      <img
        src="/images/card-back-sm.png"
        alt=""
        className="w-full h-full object-cover"
        draggable={false}
      />
    </div>
  )
}

function FaceUpMiniCard({ card }: { readonly card: TeamCard }) {
  return (
    <div
      className="rounded-[10px] flex flex-col items-center justify-center gap-1 overflow-hidden"
      style={{
        width: '60px',
        height: '84px',
        background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
        border: '1.5px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}
    >
      <span className="text-2xl leading-none">{card.team.flagUrl}</span>
      <span className="text-[9px] font-bold text-white leading-none tracking-wide">{card.team.code}</span>
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
  blindPosition,
}: PlayerSeatProps) {
  const [timePercent, setTimePercent] = useState(100)
  const prevChipsRef = useRef(player?.chips ?? 0)
  const [chipAnim, setChipAnim] = useState<'up' | 'down' | null>(null)

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

  useEffect(() => {
    if (!player) return
    if (player.chips !== prevChipsRef.current) {
      setChipAnim(player.chips > prevChipsRef.current ? 'up' : 'down')
      prevChipsRef.current = player.chips
      const timer = setTimeout(() => setChipAnim(null), 800)
      return () => clearTimeout(timer)
    }
  }, [player?.chips])

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
  const timeLeftMs = turnTimeoutMs ? (timePercent / 100) * turnTimeoutMs : 0
  const ringColor = timeLeftMs > 10000 ? 'var(--green-glow)' : timeLeftMs > 5000 ? 'var(--gold)' : 'var(--red)'
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
          <div className="flex gap-0.5" style={{ animation: 'card-deal 0.3s ease-out both' }}>
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

      {/* Blind position badge (SB / BB) */}
      {blindPosition && (
        <div className="flex justify-center mt-1">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={
              blindPosition === 'SB'
                ? { background: 'rgba(52,152,219,0.25)', color: '#5dade2', border: '1px solid rgba(52,152,219,0.4)' }
                : { background: 'rgba(212,168,67,0.2)', color: 'var(--gold-bright)', border: '1px solid rgba(212,168,67,0.4)' }
            }
          >
            {blindPosition}
          </span>
        </div>
      )}

      {/* Name + chip badge */}
      <div className={`flex flex-col items-center gap-1 mt-1.5 ${dimmed ? 'opacity-25' : ''}`}>
        <span
          className="text-[10px] font-semibold truncate max-w-20"
          style={{
            color: isWinner ? 'var(--gold)' : isCurrentUser ? 'var(--gold-dim)' : 'var(--text-dim)',
          }}
        >
          {player.username}
        </span>
        <div
          key={player.chips}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(5,10,24,0.85)',
            border: `1px solid ${chipAnim === 'up' ? 'rgba(46,204,113,0.5)' : chipAnim === 'down' ? 'rgba(231,76,60,0.4)' : 'rgba(212,168,67,0.25)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            transition: 'border-color 0.3s ease',
          }}
        >
          {/* Chip icon */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, var(--gold-bright), var(--gold-dim))',
              border: '1.5px solid var(--gold-bright)',
              boxShadow: '0 0 6px rgba(212,168,67,0.4)',
            }}
          />
          <span
            className="font-outfit font-black text-xs leading-none"
            style={{
              color:
                chipAnim === 'up'
                  ? 'var(--green-glow)'
                  : chipAnim === 'down'
                    ? 'var(--red)'
                    : 'var(--gold-bright)',
              textShadow: '0 0 8px rgba(212,168,67,0.4)',
              transition: 'color 0.3s ease',
            }}
          >
            {player.chips}
          </span>
        </div>
      </div>

      {/* Showdown score */}
      {inShowdown && (
        <div
          data-testid="showdown-score"
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
