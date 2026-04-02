import type { PlayerScoredData } from '@/stores/gameStore'
import { getAvatarColor } from '@/utils/avatarColor'

interface RevealedPlayerMiniProps {
  readonly result: PlayerScoredData
  readonly isMe: boolean
}

export function RevealedPlayerMini({ result, isMe }: RevealedPlayerMiniProps) {
  const avatarColor = getAvatarColor(result.username)

  return (
    <div
      className="flex flex-col items-center justify-between flex-shrink-0"
      style={{
        width: 72,
        minWidth: 72,
        height: 64,
        background: isMe ? 'rgba(212,168,67,0.08)' : 'rgba(5,10,24,0.6)',
        border: isMe ? '1px solid rgba(212,168,67,0.4)' : '1px solid rgba(212,168,67,0.15)',
        borderRadius: 12,
        padding: '6px 8px',
      }}
    >
      {/* Rank + Avatar row */}
      <div className="flex items-center gap-1 w-full">
        <span style={{ fontSize: 9, color: result.isWinner ? 'var(--gold)' : 'var(--text-dim)' }}>
          {result.isWinner ? '🏆' : `#${result.rank}`}
        </span>
        <div
          className="rounded-full flex items-center justify-center font-outfit font-black flex-shrink-0"
          style={{
            width: 18,
            height: 18,
            fontSize: 7,
            background: `linear-gradient(145deg, ${avatarColor}33, ${avatarColor}11)`,
            border: `1px solid ${avatarColor}55`,
            color: avatarColor,
          }}
        >
          {result.username.substring(0, 2).toUpperCase()}
        </div>
      </div>

      {/* Name */}
      <span
        className="font-outfit"
        style={{
          fontSize: 9,
          color: 'var(--text-dim)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 56,
        }}
      >
        {result.username}
      </span>

      {/* Score */}
      <span
        className="font-outfit font-black"
        style={{ fontSize: 11, color: 'var(--gold-bright)' }}
      >
        {result.totalScore}
      </span>
    </div>
  )
}
