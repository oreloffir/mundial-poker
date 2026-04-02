import type { PlayerScoredData } from '@/stores/gameStore'
import type { TeamCard } from '@wpc/shared'
import { PlayerScoreCard } from './PlayerScoreCard'
import { RevealedPlayerMini } from './RevealedPlayerMini'
import { PokerChip } from '@/components/shared/PokerChip'

interface RoundResultsOverlayProps {
  readonly playerScoreReveals: readonly PlayerScoredData[]
  readonly currentRevealIndex: number
  readonly currentUserId: string
  readonly roundNumber: number
  readonly totalPlayers: number
  readonly myHand?: readonly TeamCard[] | null
  readonly myChips?: number
}

export function RoundResultsOverlay({
  playerScoreReveals,
  currentRevealIndex,
  currentUserId,
  roundNumber,
  totalPlayers,
  myHand,
  myChips,
}: RoundResultsOverlayProps) {
  const currentReveal = playerScoreReveals[currentRevealIndex]
  if (!currentReveal) return null

  const isMe = currentReveal.userId === currentUserId
  const revealedCount = playerScoreReveals.length

  const handPreview = myHand && myHand.length > 0 && (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {myHand.map((card) => (
        <div
          key={card.teamId}
          className="rounded flex flex-col items-center justify-center gap-0.5 overflow-hidden flex-shrink-0"
          style={{
            width: 22,
            height: 30,
            background: 'linear-gradient(145deg, var(--bg-card), var(--surface))',
            border: '1px solid rgba(212,168,67,0.3)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
          }}
        >
          <span style={{ fontSize: '0.65rem', lineHeight: 1 }}>{card.team.flagUrl}</span>
          <span style={{ fontSize: '4px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', lineHeight: 1, letterSpacing: '0.02em' }}>
            {card.team.code}
          </span>
        </div>
      ))}
      {myChips !== undefined && (
        <>
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
          <div className="flex items-center gap-1">
            <PokerChip size={10} style={{ flexShrink: 0 }} />
            <span className="font-outfit font-black" style={{ fontSize: 10, color: 'var(--gold-bright)' }}>
              {myChips}
            </span>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div
      data-testid="showdown-overlay"
      className="showdown-overlay-root"
      style={{
        background: 'rgba(5,10,24,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* ── Header — 48px ── */}
      <div
        style={{
          height: 48,
          minHeight: 48,
          flexShrink: 0,
          width: '100%',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span
          data-testid="showdown-round-header"
          className="font-cinzel font-bold flex-shrink-0"
          style={{ fontSize: 13, color: 'var(--gold)' }}
        >
          Round {roundNumber} Results
        </span>

        {/* Hand preview — center */}
        {handPreview}

        {/* Progress: "N of M" + colored dots */}
        <div data-testid="showdown-progress" className="flex items-center flex-shrink-0" style={{ gap: 8 }}>
          <span
            className="font-outfit"
            style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-dim)' }}
          >
            {revealedCount} of {totalPlayers}
          </span>
          <div className="flex items-center" style={{ gap: 5 }}>
            {Array.from({ length: totalPlayers }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: i < revealedCount ? 'var(--gold)' : 'rgba(255,255,255,0.15)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Main zone — flex: 1, centered ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '16px 16px 0',
          overflow: 'hidden',
        }}
      >
        <PlayerScoreCard
          key={currentReveal.userId}
          result={currentReveal}
          isMe={isMe}
          revealIndex={currentRevealIndex}
        />
      </div>

      {/* ── Mini-strip — 84px ── */}
      <div
        style={{
          height: 84,
          minHeight: 84,
          flexShrink: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '8px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {playerScoreReveals.map((r) => (
          <RevealedPlayerMini
            key={r.userId}
            result={r}
            isMe={r.userId === currentUserId}
          />
        ))}
      </div>
    </div>
  )
}
