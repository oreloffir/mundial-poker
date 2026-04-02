import { useEffect, useState } from 'react'
import type { PlayerScoredData } from '@/stores/gameStore'
import { useCountUp } from '@/hooks/useCountUp'
import { getAvatarColor } from '@/utils/avatarColor'
import { TeamScoreSubCard } from './TeamScoreSubCard'

interface PlayerScoreCardProps {
  readonly result: PlayerScoredData
  readonly isMe: boolean
  readonly revealIndex: number
}

export function PlayerScoreCard({ result, isMe, revealIndex }: PlayerScoreCardProps) {
  const [animate, setAnimate] = useState(false)
  const avatarColor = getAvatarColor(result.username)
  const displayTotal = useCountUp(result.totalScore, 600)
  const rankIcon = result.isWinner ? '🏆' : '🎖'

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      data-testid={`showdown-score-card-${revealIndex}`}
      className="flex flex-col gap-3 rounded-2xl"
      style={{
        background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
        border: result.isWinner
          ? '1px solid var(--gold)'
          : isMe
            ? '1px solid rgba(212,168,67,0.4)'
            : '1px solid rgba(255,255,255,0.1)',
        padding: '20px 24px',
        minWidth: 320,
        maxWidth: 520,
        width: '100%',
        boxShadow: result.isWinner
          ? '0 0 40px rgba(212,168,67,0.3), 0 8px 40px rgba(0,0,0,0.6)'
          : '0 8px 40px rgba(0,0,0,0.6)',
        animation: result.isWinner
          ? 'card-flip 0.5s ease-out both, gold-burst 1.2s ease-out 0.3s both'
          : 'card-flip 0.5s ease-out both',
      }}
    >
      {/* Player header */}
      <div className="flex items-center gap-3">
        {/* Rank badge pill */}
        <div
          className="inline-flex items-center gap-1 flex-shrink-0"
          style={{
            background: result.isWinner ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.06)',
            border: result.isWinner
              ? '1px solid rgba(212,168,67,0.3)'
              : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '3px 10px 3px 7px',
            minWidth: 40,
          }}
        >
          <span style={{ fontSize: 13 }}>{rankIcon}</span>
          <span
            className="font-outfit"
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: result.isWinner ? 'var(--gold)' : 'var(--text-dim)',
            }}
          >
            #{result.rank}
          </span>
        </div>

        {/* Avatar */}
        <div
          className="rounded-full flex items-center justify-center font-outfit font-black flex-shrink-0"
          style={{
            width: 36,
            height: 36,
            fontSize: 12,
            background: `linear-gradient(145deg, ${avatarColor}33, ${avatarColor}11)`,
            border: result.isWinner
              ? '2px solid var(--gold)'
              : isMe
                ? '2px solid var(--gold-dim)'
                : `2px solid ${avatarColor}44`,
            color: avatarColor,
          }}
        >
          {result.username.substring(0, 2).toUpperCase()}
        </div>

        {/* Name + YOU/🤖 badge (mutually exclusive) */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="font-outfit font-bold truncate"
            style={{ fontSize: 15, color: 'var(--text)' }}
          >
            {result.username}
          </span>
          {isMe ? (
            <span
              data-testid="showdown-player-you"
              className="font-outfit font-bold flex-shrink-0"
              style={{
                fontSize: 9,
                background: 'rgba(212,168,67,0.12)',
                color: 'var(--gold-dim)',
                border: '1px solid rgba(212,168,67,0.2)',
                borderRadius: 10,
                padding: '1px 5px',
              }}
            >
              YOU
            </span>
          ) : result.isBot ? (
            <span data-testid="showdown-player-bot" style={{ fontSize: 13, flexShrink: 0 }}>🤖</span>
          ) : null}
        </div>

        {/* Total score count-up */}
        <span
          className="font-outfit font-black flex-shrink-0"
          style={{
            fontSize: 22,
            color: 'var(--gold-bright)',
            textShadow: '0 0 12px rgba(212,168,67,0.4)',
          }}
        >
          {displayTotal}
        </span>
      </div>

      {/* Score breakdown — only for the current user */}
      {isMe && (
        <>
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex gap-3">
            {result.cardScores.map((card, i) => (
              <TeamScoreSubCard
                key={card.teamId}
                card={card}
                staggerBase={i * 75}
                animate={animate}
              />
            ))}
          </div>
          {/* Separator above TOTAL */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)',
              margin: '10px 0 0',
            }}
          />
          {/* TOTAL row */}
          <div className="flex items-center justify-center gap-2">
            <span
              className="font-cinzel font-bold"
              style={{
                fontSize: 16,
                color: 'var(--gold)',
                letterSpacing: '0.05em',
                textShadow: '0 0 12px rgba(212,168,67,0.4)',
              }}
            >
              TOTAL
            </span>
            <span
              data-testid="score-total"
              className="font-outfit font-black"
              style={{
                fontSize: 20,
                color: 'var(--gold-bright)',
                textShadow: '0 0 16px rgba(212,168,67,0.5)',
              }}
            >
              {displayTotal} pts
            </span>
          </div>
          {/* Separator below TOTAL */}
          <div
            style={{
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)',
              margin: '0 0 2px',
            }}
          />
        </>
      )}
    </div>
  )
}
