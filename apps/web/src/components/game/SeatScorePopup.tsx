import type { PlayerScoredData, CardScoreData } from '@/stores/gameStore'

function getResult(card: CardScoreData): 'W' | 'D' | 'L' {
  const myGoals = card.fixture.side === 'home' ? card.fixture.homeGoals : card.fixture.awayGoals
  const oppGoals = card.fixture.side === 'home' ? card.fixture.awayGoals : card.fixture.homeGoals
  if (myGoals > oppGoals) return 'W'
  if (myGoals === oppGoals) return 'D'
  return 'L'
}

const RESULT_COLOR: Record<string, string> = {
  W: 'var(--green-glow)',
  D: 'var(--gold)',
  L: 'var(--red)',
}

interface SeatScorePopupProps {
  readonly result: PlayerScoredData
  readonly isCurrent: boolean
}

export function SeatScorePopup({ result, isCurrent }: SeatScorePopupProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        bottom: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginBottom: 4,
        zIndex: 30,
        animation: isCurrent ? 'score-pop 0.35s ease-out both' : undefined,
        opacity: isCurrent ? 1 : 0.7,
      }}
    >
      <div
        className="flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl whitespace-nowrap"
        style={{
          background: 'rgba(5,10,24,0.92)',
          border: isCurrent ? '1px solid var(--gold)' : '1px solid rgba(212,168,67,0.2)',
          boxShadow: isCurrent
            ? '0 0 18px rgba(212,168,67,0.4), 0 4px 16px rgba(0,0,0,0.6)'
            : '0 4px 12px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Total score */}
        <div className="flex items-baseline gap-1">
          {result.isWinner && <span style={{ fontSize: 11 }}>🏆</span>}
          <span
            className="font-outfit font-black leading-none"
            style={{
              fontSize: 17,
              color: result.isWinner ? 'var(--gold-bright)' : 'var(--text)',
              textShadow: result.isWinner ? '0 0 10px rgba(212,168,67,0.5)' : undefined,
            }}
          >
            {result.totalScore}
          </span>
          <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>pts</span>
        </div>

        {/* Per-card compact breakdown */}
        <div className="flex items-center gap-1.5">
          {result.cardScores.map((card, i) => {
            const res = getResult(card)
            return (
              <span key={card.teamId} className="flex items-center" style={{ fontSize: 9 }}>
                {i > 0 && (
                  <span style={{ color: 'rgba(255,255,255,0.15)', marginRight: 4 }}>|</span>
                )}
                <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 700 }}>
                  {card.team.code}
                </span>
                <span style={{ color: RESULT_COLOR[res], fontWeight: 700, marginLeft: 2 }}>
                  {res}
                </span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 1 }}>
                  +{card.totalScore}
                </span>
              </span>
            )
          })}
        </div>
      </div>

      {/* Caret pointing down to seat */}
      <div
        className="mx-auto"
        style={{
          width: 0,
          height: 0,
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: '4px solid rgba(5,10,24,0.92)',
        }}
      />
    </div>
  )
}
