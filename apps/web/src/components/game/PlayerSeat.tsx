import { useEffect, useState, useRef } from 'react'
import type { TablePlayer } from '@wpc/shared'
import { PokerChip } from '@/components/shared/PokerChip'
import { getAvatarColor } from '@/utils/avatarColor'
import type { PlayerScoredData } from '@/stores/gameStore'
import { SeatScorePopup } from './SeatScorePopup'

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
  readonly scoreResult: PlayerScoredData | null
  readonly isCurrent: boolean
  readonly isWinner: boolean
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
  // C6: blind posts use payload.type ('SB'|'BB') as the action key
  SB: { bg: 'rgba(52,152,219,0.15)', text: '#5dade2', border: 'rgba(52,152,219,0.3)' },
  BB: { bg: 'rgba(212,168,67,0.15)', text: 'var(--gold-bright)', border: 'rgba(212,168,67,0.4)' },
}

function formatAction(action: string, amount: number): string {
  if (action === 'RAISE') return `Raise ${amount}`
  if (action === 'CALL') return `Call ${amount}`
  if (action === 'ALL_IN') return 'All In!'
  return action.charAt(0) + action.slice(1).toLowerCase()
}

// C9: extracted from inline IIFE in render to a named component
function ActionBadge({ action, amount, timestamp }: PlayerAction) {
  const badge = BADGE_STYLES[action]
  if (!badge) return null
  return (
    <div
      key={timestamp}
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
        {formatAction(action, amount)}
      </span>
    </div>
  )
}

function FaceDownCard() {
  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{
        width: 'var(--card-w)',
        height: 'var(--card-h)',
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

function FaceUpMiniCard({ card }: { readonly card: { team: { flagUrl: string; code: string } } }) {
  return (
    <div
      className="rounded-[10px] flex flex-col items-center justify-center gap-1 overflow-hidden"
      style={{
        width: 'var(--card-w)',
        height: 'var(--card-h)',
        background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
        border: '1.5px solid var(--border)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 'var(--card-flag-size)', lineHeight: 1 }}>{card.team.flagUrl}</span>
      <span
        style={{
          fontSize: 'var(--card-code-size)',
          fontWeight: 'bold',
          color: 'white',
          lineHeight: 1,
          letterSpacing: '0.05em',
        }}
      >
        {card.team.code}
      </span>
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
  scoreResult,
  isCurrent,
  isWinner,
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
        className="rounded-full flex items-center justify-center"
        style={{
          width: 'var(--avatar-size)',
          height: 'var(--avatar-size)',
          border: '2px dashed rgba(212,168,67,0.12)',
        }}
      >
        <span className="text-[10px]" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
          Empty
        </span>
      </div>
    )
  }

  const inShowdown = !!scoreResult
  const timeLeftMs = turnTimeoutMs ? (timePercent / 100) * turnTimeoutMs : 0
  const ringColor =
    timeLeftMs > 10000 ? 'var(--green-glow)' : timeLeftMs > 5000 ? 'var(--gold)' : 'var(--red)'
  const dashOffset = RING_CIRCUMFERENCE * (1 - timePercent / 100)
  const dimmed = (isFolded || player.isEliminated) && !inShowdown
  const avatarColor = getAvatarColor(player.username)

  // Current user's face-up cards live in PlayerCardDock (J25) — never render them on the pitch seat
  // When scored, show opponent cards face-up (flip) — otherwise face-down while in round
  const showScoredCards = !isCurrentUser && inShowdown && scoreResult.hand.length > 0
  const showFaceDown = !isCurrentUser && hasCards && !inShowdown && !isFolded

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
      {/* Score popup — shown above seat for opponents only; current user's shows in PlayerCardDock (J25) */}
      {inShowdown && !isCurrentUser && (
        <SeatScorePopup result={scoreResult} isCurrent={isCurrent} />
      )}

      {/* Action badge */}
      {lastAction && !inShowdown && <ActionBadge {...lastAction} />}

      {/* Avatar + cards row */}
      <div className="flex items-center gap-1.5">
        {/* Opponent scored cards flip face-up */}
        {showScoredCards && (
          <div className="flex gap-0.5" style={{ animation: 'card-flip 0.4s ease-out both' }}>
            {scoreResult.hand.map((card) => (
              <FaceUpMiniCard key={card.teamId} card={card} />
            ))}
          </div>
        )}
        {!showScoredCards && showFaceDown && (
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
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) scale(var(--ring-scale)) rotate(-90deg)',
                transformOrigin: '50% 50%',
              }}
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
            className={`rounded-full flex items-center justify-center text-sm font-black font-outfit transition-all duration-300 ${dimmed ? 'opacity-25 grayscale' : ''}`}
            style={{
              width: 'var(--avatar-size)',
              height: 'var(--avatar-size)',
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
            data-testid={blindPosition === 'SB' ? 'sb-badge' : 'bb-badge'}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={
              blindPosition === 'SB'
                ? {
                    background: 'rgba(52,152,219,0.25)',
                    color: '#5dade2',
                    border: '1px solid rgba(52,152,219,0.4)',
                  }
                : {
                    background: 'rgba(212,168,67,0.2)',
                    color: 'var(--gold-bright)',
                    border: '1px solid rgba(212,168,67,0.4)',
                  }
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
          data-testid={`seat-balance-${player.seatIndex}`}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(5,10,24,0.85)',
            border: `1px solid ${chipAnim === 'up' ? 'rgba(46,204,113,0.5)' : chipAnim === 'down' ? 'rgba(231,76,60,0.4)' : 'rgba(212,168,67,0.25)'}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            transition: 'border-color 0.3s ease',
          }}
        >
          <PokerChip
            size={14}
            style={{ flexShrink: 0, filter: 'drop-shadow(0 0 4px rgba(212,168,67,0.4))' }}
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

      {/* Score total — shown below chips once scored (opponents only; current user's shows in dock) */}
      {inShowdown && !isCurrentUser && (
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
          {scoreResult.totalScore} PTS
        </div>
      )}

      {isFolded && !player.isEliminated && !inShowdown && (
        <span
          data-testid="folded-indicator"
          className="text-[8px] font-bold uppercase tracking-wider"
          style={{ color: 'var(--red)', opacity: 0.6 }}
        >
          Folded
        </span>
      )}
    </div>
  )
}
